import { useState } from 'react';
import { UploadCard } from '../components/UploadCard';
import { LiveCameraCard } from '../components/LiveCameraCard';
import { PredictionCard } from '../components/PredictionCard';
import { RecommendationCard } from '../components/RecommendationCard';
import { LoadingState } from '../components/LoadingState';
import { Button } from '../components/ui/button';
import { DetectionResult } from '../types';
import { analyzeImage, getRecommendations } from '../lib/detectionService';
import { saveToHistory } from '../lib/historyStorage';
import { toast } from 'sonner';

export function DetectionPage() {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<DetectionResult | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);

  const handleImageSelect = (file: File) => {
    setSelectedImage(file);
    setResult(null);
  };

  const handleClearImage = () => {
    setSelectedImage(null);
    setResult(null);
  };

  const handleAnalyze = async () => {
    if (!selectedImage) return;

    setIsAnalyzing(true);
    setResult(null);

    try {
      const detectionResult = await analyzeImage(selectedImage);
      setResult(detectionResult);
      saveToHistory(detectionResult);
      
      toast.success('Analysis complete!', {
        description: `Detected: ${detectionResult.prediction} (${detectionResult.confidence}% confidence)`,
      });
    } catch (error) {
      console.error('Analysis failed:', error);
      toast.error('Analysis failed', {
        description: 'Please try again with a different image.',
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  // ── Live Camera handlers ────────────────────────────────────────────────────
  const handleCameraResult = (cameraResult: DetectionResult) => {
    setResult(cameraResult);
  };

  const handleCameraStart = () => {
    setIsCameraActive(true);
    setResult(null);           // clear any previous upload result
    setSelectedImage(null);    // clear selected image
  };

  const handleCameraStop = () => {
    setIsCameraActive(false);
    // Keep the last result visible
  };

  const handleCameraHistorySave = (cameraResult: DetectionResult) => {
    saveToHistory(cameraResult);
  };

  const recommendations = result ? getRecommendations(result.prediction) : [];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-3 py-4">
        <h1 className="mb-3 text-3xl sm:text-4xl font-bold text-foreground px-4">
          Fire Detection System
        </h1>
        <p className="mx-auto max-w-2xl text-sm sm:text-base text-muted-foreground px-4">
          Upload an image or use your camera for live detection of fire, smoke, or non-fire conditions.
        </p>
      </div>

      {/* Main Workspace */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left Column - Upload + Camera */}
        <div className="space-y-6">
          <UploadCard
            onImageSelect={handleImageSelect}
            selectedImage={selectedImage}
            onClearImage={handleClearImage}
            disabled={isAnalyzing || isCameraActive}
          />

          {selectedImage && !result && (
            <Button
              onClick={handleAnalyze}
              disabled={isAnalyzing || isCameraActive}
              className="w-full bg-primary hover:bg-primary/90 h-12"
              size="lg"
            >
              {isAnalyzing ? 'Analyzing...' : 'Analyze Image'}
            </Button>
          )}

          {result && !isCameraActive && selectedImage && (
            <Button
              onClick={handleAnalyze}
              disabled={isAnalyzing}
              variant="outline"
              className="w-full h-12"
              size="lg"
            >
              Analyze Again
            </Button>
          )}

          {/* ── OR Separator ── */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-4 text-muted-foreground font-medium tracking-widest">
                OR
              </span>
            </div>
          </div>

          {/* ── Live Camera Section ── */}
          <LiveCameraCard
            onResult={handleCameraResult}
            onHistorySave={handleCameraHistorySave}
            onCameraStart={handleCameraStart}
            onCameraStop={handleCameraStop}
            disabled={isAnalyzing || !!selectedImage}
          />
        </div>

        {/* Right Column - Results */}
        <div className="space-y-6">
          {isAnalyzing ? (
            <LoadingState />
          ) : (
            <PredictionCard result={result} />
          )}
        </div>
      </div>

      {/* Recommendations */}
      {result && !isAnalyzing && (
        <RecommendationCard recommendations={recommendations} />
      )}
    </div>
  );
}