import { useState, useRef, useCallback, useEffect } from 'react';
import { Video, VideoOff, Camera, AlertCircle, Loader2, Activity } from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { motion, AnimatePresence } from 'motion/react';
import { DetectionResult, PredictionType, RiskLevel } from '../types';
import { analyzeFrame } from '../lib/detectionService';

interface LiveCameraCardProps {
  onResult: (result: DetectionResult) => void;
  onHistorySave?: (result: DetectionResult) => void;
  onCameraStart?: () => void;
  onCameraStop?: () => void;
  disabled?: boolean;
}

type CameraError =
  | 'permission-denied'
  | 'unavailable'
  | 'unsupported'
  | 'backend-error'
  | null;

const ERROR_MESSAGES: Record<string, { title: string; description: string }> = {
  'permission-denied': {
    title: 'Camera Access Denied',
    description: 'Please allow camera access in your browser settings and try again.',
  },
  unavailable: {
    title: 'Camera Not Found',
    description: 'No camera device was detected. Please connect a camera and try again.',
  },
  unsupported: {
    title: 'Browser Not Supported',
    description: 'Your browser does not support camera access. Please use Chrome, Firefox, or Edge.',
  },
  'backend-error': {
    title: 'Backend Disconnected',
    description: 'Cannot reach the prediction server. Falling back to demo mode.',
  },
};

// ── Prediction Smoothing ─────────────────────────────────────────────────────
// Keeps a sliding window of the last WINDOW_SIZE predictions and emits
// the majority-voted class with averaged confidence.  This prevents the
// displayed result from flickering every frame when the model is uncertain.

const WINDOW_SIZE = 5;              // number of frames in the sliding window
const STABILITY_THRESHOLD = 3;      // at least 3/5 must agree to change displayed prediction
const CONFIDENCE_THRESHOLD = 60;    // minimum % to trust fire/smoke — below this, treat as non-fire
const HISTORY_SAVE_INTERVAL = 10;   // save to history every N frames to avoid flooding

interface FrameSnapshot {
  prediction: PredictionType;
  confidence: number;
  riskLevel: RiskLevel;
  scores?: Record<string, number>;
  isDemo?: boolean;
  /** True when the prediction was overridden by the confidence threshold */
  wasOverridden?: boolean;
}

function computeSmoothedResult(
  window: FrameSnapshot[],
  currentDisplayed: PredictionType | null,
): FrameSnapshot | null {
  if (window.length === 0) return null;

  // Count votes per class
  const votes: Record<PredictionType, number> = { fire: 0, smoke: 0, 'non-fire': 0 };
  const confidences: Record<PredictionType, number[]> = { fire: [], smoke: [], 'non-fire': [] };
  const allScores: Record<string, number[]> = {};

  for (const snap of window) {
    votes[snap.prediction]++;
    confidences[snap.prediction].push(snap.confidence);

    if (snap.scores) {
      for (const [cls, score] of Object.entries(snap.scores)) {
        if (!allScores[cls]) allScores[cls] = [];
        allScores[cls].push(score);
      }
    }
  }

  // Find the class with the most votes
  let majority: PredictionType = 'non-fire';
  let maxVotes = 0;
  for (const [cls, count] of Object.entries(votes) as [PredictionType, number][]) {
    if (count > maxVotes) {
      maxVotes = count;
      majority = cls;
    }
  }

  // Stability check: only switch away from the current displayed prediction
  // if the new majority has enough votes.  This prevents premature switches
  // when only 1-2 outlier frames disagree.
  if (currentDisplayed && majority !== currentDisplayed && maxVotes < STABILITY_THRESHOLD) {
    majority = currentDisplayed;
  }

  // ── Confidence threshold ────────────────────────────────────────────────
  // If the majority-voted class (fire or smoke) has an average confidence
  // below the threshold, the model is too uncertain — default to "non-fire".
  // This prevents faces, random objects, warm-coloured items, etc. from
  // being falsely flagged as fire/smoke at ~40-50% confidence.
  let wasOverridden = false;
  const majorityAvgConf =
    confidences[majority].length > 0
      ? confidences[majority].reduce((a, b) => a + b, 0) / confidences[majority].length
      : 0;
  if ((majority === 'fire' || majority === 'smoke') && majorityAvgConf < CONFIDENCE_THRESHOLD) {
    majority = 'non-fire';
    wasOverridden = true;
  }

  // Average confidence for the majority class
  const majorityConfidences = confidences[majority];
  const avgConfidence =
    majorityConfidences.length > 0
      ? Math.round(
          (majorityConfidences.reduce((a, b) => a + b, 0) / majorityConfidences.length) * 100,
        ) / 100
      : window[window.length - 1].confidence;

  // Average scores — omit when overridden to avoid contradicting the label
  let finalScores: Record<string, number> | undefined = undefined;
  if (!wasOverridden) {
    const avgScores: Record<string, number> = {};
    for (const [cls, arr] of Object.entries(allScores)) {
      avgScores[cls] = Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 100) / 100;
    }
    finalScores = Object.keys(avgScores).length > 0 ? avgScores : undefined;
  }

  const riskLevel: RiskLevel =
    majority === 'fire' ? 'high' : majority === 'smoke' ? 'medium' : 'low';

  return {
    prediction: majority,
    confidence: wasOverridden ? Math.max(avgConfidence, 50) : avgConfidence,
    riskLevel,
    scores: finalScores,
    isDemo: window[window.length - 1].isDemo,
    wasOverridden,
  };
}

// ── Component ────────────────────────────────────────────────────────────────

export function LiveCameraCard({ onResult, onHistorySave, onCameraStart, onCameraStop, disabled }: LiveCameraCardProps) {
  const [isStreaming, setIsStreaming] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<CameraError>(null);
  const [frameCount, setFrameCount] = useState(0);
  const [stability, setStability] = useState(0); // 0-100% stability indicator

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<number | null>(null);
  const isPredicting = useRef(false);
  const frameCountRef = useRef(0);

  // Sliding window state
  const windowRef = useRef<FrameSnapshot[]>([]);
  const currentDisplayedRef = useRef<PredictionType | null>(null);

  // ── Cleanup on unmount ──────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Capture frame as base64 JPEG ────────────────────────────────────────────
  const captureFrame = useCallback((): string | null => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) return null;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.drawImage(video, 0, 0);
    return canvas.toDataURL('image/jpeg', 0.8);
  }, []);

  // ── Predict one frame with smoothing ────────────────────────────────────────
  const predictFrame = useCallback(async () => {
    if (isPredicting.current) return; // skip if previous prediction is still running
    isPredicting.current = true;

    try {
      const frame = captureFrame();
      if (!frame) return;

      const currentFrameNum = frameCountRef.current + 1;
      frameCountRef.current = currentFrameNum;
      setFrameCount(currentFrameNum);

      const rawResult = await analyzeFrame(frame, false);

      // Push raw result into the sliding window
      const snap: FrameSnapshot = {
        prediction: rawResult.prediction,
        confidence: rawResult.confidence,
        riskLevel: rawResult.riskLevel,
        scores: rawResult.scores,
        isDemo: rawResult.isDemo,
      };
      const win = [...windowRef.current, snap].slice(-WINDOW_SIZE);
      windowRef.current = win;

      // Compute smoothed majority vote
      const smoothed = computeSmoothedResult(win, currentDisplayedRef.current);
      if (smoothed) {
        currentDisplayedRef.current = smoothed.prediction;

        // Calculate stability percentage (what fraction of the window agrees)
        const agreeing = win.filter((s) => s.prediction === smoothed.prediction).length;
        setStability(Math.round((agreeing / win.length) * 100));

        const smoothedResult: DetectionResult = {
          id: rawResult.id,
          prediction: smoothed.prediction,
          confidence: smoothed.confidence,
          riskLevel: smoothed.riskLevel,
          scores: smoothed.scores,
          imageUrl: '',
          timestamp: new Date(),
          isDemo: smoothed.isDemo,
          source: 'camera',
        };

        // Emit smoothed result to parent (updates the prediction card)
        onResult(smoothedResult);

        // Throttled history save: save every HISTORY_SAVE_INTERVAL frames
        // Capture the current video frame as a snapshot for the history entry
        if (currentFrameNum % HISTORY_SAVE_INTERVAL === 0) {
          const historyResult = { ...smoothedResult, imageUrl: frame };
          onHistorySave?.(historyResult);
        }
      }
    } catch (err) {
      console.error('Frame prediction error:', err);
    } finally {
      isPredicting.current = false;
    }
  }, [captureFrame, onResult, onHistorySave]);

  // ── Start camera ───────────────────────────────────────────────────────────
  const startCamera = useCallback(async () => {
    setError(null);
    setIsStarting(true);

    // Check browser support
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError('unsupported');
      setIsStarting(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setIsStreaming(true);
      setIsStarting(false);
      setFrameCount(0);
      setStability(0);
      windowRef.current = [];
      currentDisplayedRef.current = null;

      // Start interval predictions (1 frame every 1000ms)
      intervalRef.current = window.setInterval(() => {
        predictFrame();
      }, 1000);

      // Notify parent that camera is active
      onCameraStart?.();
    } catch (err: any) {
      setIsStarting(false);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError('permission-denied');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setError('unavailable');
      } else {
        setError('unavailable');
      }
    }
  }, [predictFrame]);

  // ── Stop camera ────────────────────────────────────────────────────────────
  const stopCamera = useCallback(() => {
    // Clear interval
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Stop all tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    // Reset video element
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    isPredicting.current = false;
    windowRef.current = [];
    currentDisplayedRef.current = null;
    frameCountRef.current = 0;
    setIsStreaming(false);
    setFrameCount(0);
    setStability(0);

    // Notify parent that camera is inactive
    onCameraStop?.();
  }, [onCameraStop]);

  // Stability badge colour
  const stabilityColor =
    stability >= 80
      ? 'bg-success/10 text-success border-success/20'
      : stability >= 50
      ? 'bg-warning/10 text-warning border-warning/20'
      : 'bg-destructive/10 text-destructive border-destructive/20';

  return (
    <Card className="overflow-hidden border-2 bg-card shadow-sm">
      <div className="p-6">
        <h3 className="mb-4 flex items-center gap-2">
          <Video className="h-5 w-5 text-primary" />
          Live Camera Detection
          {isStreaming && (
            <Badge variant="outline" className="ml-auto bg-destructive/10 text-destructive border-destructive/20 text-xs">
              <span className="mr-1.5 inline-block h-2 w-2 animate-pulse rounded-full bg-destructive" />
              LIVE
            </Badge>
          )}
        </h3>

        {/* Hidden canvas for frame capture */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Error display */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4 overflow-hidden"
            >
              <div className="flex items-start gap-3 rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                <div>
                  <p className="font-medium text-destructive">{ERROR_MESSAGES[error]?.title}</p>
                  <p className="mt-1 text-muted-foreground">{ERROR_MESSAGES[error]?.description}</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Camera viewport */}
        {!isStreaming && !isStarting ? (
          <motion.div
            className={`relative cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-all
              border-border hover:border-primary/50 hover:bg-muted/50
              ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            onClick={!disabled ? startCamera : undefined}
            whileHover={!disabled ? { scale: 1.01 } : {}}
            transition={{ duration: 0.2 }}
          >
            <div className="flex flex-col items-center gap-3">
              <div className="rounded-full bg-primary/10 p-4">
                <Camera className="h-8 w-8 text-primary" />
              </div>
              <div>
                <p className="font-medium">Click to start camera</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Live detection will begin automatically
                </p>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative rounded-xl overflow-hidden border-2 border-border"
          >
            {/* Loading overlay while starting */}
            {isStarting && (
              <div className="flex items-center justify-center h-64 bg-muted/50">
                <div className="text-center">
                  <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary mb-2" />
                  <p className="text-sm text-muted-foreground">Starting camera...</p>
                </div>
              </div>
            )}

            {/* Video element */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`h-64 w-full object-cover ${isStarting ? 'hidden' : ''}`}
            />

            {/* Overlay with live info */}
            {isStreaming && (
              <>
                <div className="absolute inset-0 pointer-events-none border-2 border-primary/30 rounded-xl" />
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 via-transparent to-transparent p-4">
                  <div className="flex items-center justify-between">
                    <div className="text-white">
                      <p className="text-xs text-white/80">
                        Frames analyzed: {frameCount}
                      </p>
                    </div>
                    {/* Stability indicator */}
                    {frameCount > 0 && (
                      <Badge variant="outline" className={`text-xs ${stabilityColor}`}>
                        <Activity className="mr-1 h-3 w-3" />
                        {stability}% stable
                      </Badge>
                    )}
                  </div>
                </div>
              </>
            )}
          </motion.div>
        )}

        {/* Action buttons */}
        <div className="mt-4">
          {!isStreaming ? (
            <Button
              className="w-full bg-primary hover:bg-primary/90"
              onClick={startCamera}
              disabled={disabled || isStarting}
            >
              {isStarting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Starting Camera...
                </>
              ) : (
                <>
                  <Video className="mr-2 h-4 w-4" />
                  Start Camera
                </>
              )}
            </Button>
          ) : (
            <Button
              variant="destructive"
              className="w-full"
              onClick={stopCamera}
            >
              <VideoOff className="mr-2 h-4 w-4" />
              Stop Camera
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
