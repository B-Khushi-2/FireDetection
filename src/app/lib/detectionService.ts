import { DetectionResult, PredictionType, RiskLevel } from '../types';

/**
 * Fire Detection Service
 *
 * Primary path  → POST /api/predict  (Flask + fire_detection_v1.keras)
 * Fallback path → mock prediction   (when backend is not running)
 */

const API_BASE = '/api';

// ── Type helpers ──────────────────────────────────────────────────────────────
function toFrontendPrediction(raw: string): PredictionType {
  // Backend returns 'fire' | 'non_fire' | 'smoke'
  // Frontend type uses  'fire' | 'non-fire' | 'smoke'
  if (raw === 'non_fire' || raw === 'non-fire') return 'non-fire';
  if (raw === 'fire')  return 'fire';
  if (raw === 'smoke') return 'smoke';
  return 'non-fire'; // safe fallback
}

function toRiskLevel(prediction: PredictionType): RiskLevel {
  if (prediction === 'fire')  return 'high';
  if (prediction === 'smoke') return 'medium';
  return 'low';
}

// ── Mock (fallback when Flask is offline) ─────────────────────────────────────
async function mockPredict(imageFile: File): Promise<DetectionResult> {
  await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 1000));

  const rand = Math.random();
  let prediction: PredictionType;
  if (rand < 0.1)       prediction = 'fire';
  else if (rand < 0.3)  prediction = 'smoke';
  else                  prediction = 'non-fire';

  const confidence =
    prediction === 'fire'     ? 88  + Math.random() * 10  :
    prediction === 'smoke'    ? 75  + Math.random() * 15  :
                                85  + Math.random() * 13;

  return {
    id:         `det-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    prediction,
    confidence: Math.round(confidence * 10) / 10,
    riskLevel:  toRiskLevel(prediction),
    imageUrl:   URL.createObjectURL(imageFile),
    timestamp:  new Date(),
    isDemo:     true,
    source:     'upload',
  };
}

// ── Real inference via Flask ──────────────────────────────────────────────────
async function realPredict(imageFile: File): Promise<DetectionResult> {
  const form = new FormData();
  form.append('image', imageFile);

  const res = await fetch(`${API_BASE}/predict`, {
    method: 'POST',
    body: form,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }

  const data = await res.json();

  const prediction = toFrontendPrediction(data.prediction ?? '');

  return {
    id:         data.id ?? `det-${Date.now()}`,
    prediction,
    confidence: typeof data.confidence === 'number' ? data.confidence : parseFloat(data.confidence),
    riskLevel:  (data.riskLevel as RiskLevel) ?? toRiskLevel(prediction),
    scores:     data.scores,
    imageUrl:   URL.createObjectURL(imageFile),
    timestamp:  data.timestamp ? new Date(data.timestamp) : new Date(),
    isDemo:     false,
    source:     'upload',
  };
}

// ── Public API ────────────────────────────────────────────────────────────────
/**
 * Analyse an image file.
 * Tries the Flask backend first; falls back to mock if unavailable.
 */
export const analyzeImage = async (imageFile: File): Promise<DetectionResult> => {
  try {
    return await realPredict(imageFile);
  } catch (err) {
    console.warn('Backend unavailable — using demo mode:', err);
    return await mockPredict(imageFile);
  }
};

/**
 * Analyse a single camera frame (base64-encoded JPEG).
 * Sends to POST /api/predict-frame.
 * Falls back to a simulated result if the backend is unavailable.
 */
export const analyzeFrame = async (
  base64Frame: string,
  saveToHistory: boolean = false,
): Promise<DetectionResult> => {
  try {
    const res = await fetch(`${API_BASE}/predict-frame`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ frame: base64Frame, saveToHistory }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(err.error ?? `HTTP ${res.status}`);
    }

    const data = await res.json();
    const prediction = toFrontendPrediction(data.prediction ?? '');

    return {
      id:         data.id ?? `det-${Date.now()}`,
      prediction,
      confidence: typeof data.confidence === 'number' ? data.confidence : parseFloat(data.confidence),
      riskLevel:  (data.riskLevel as RiskLevel) ?? toRiskLevel(prediction),
      scores:     data.scores,
      imageUrl:   '',   // No image URL for live frames
      timestamp:  data.timestamp ? new Date(data.timestamp) : new Date(),
      isDemo:     false,
      source:     'camera',
    };
  } catch (err) {
    console.warn('Backend unavailable for frame prediction — using demo mode:', err);

    // Demo fallback
    await new Promise(resolve => setTimeout(resolve, 300));
    const rand = Math.random();
    let prediction: PredictionType;
    if (rand < 0.1)       prediction = 'fire';
    else if (rand < 0.3)  prediction = 'smoke';
    else                  prediction = 'non-fire';

    const confidence =
      prediction === 'fire'     ? 88  + Math.random() * 10  :
      prediction === 'smoke'    ? 75  + Math.random() * 15  :
                                  85  + Math.random() * 13;

    return {
      id:         `det-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
      prediction,
      confidence: Math.round(confidence * 10) / 10,
      riskLevel:  toRiskLevel(prediction),
      imageUrl:   '',
      timestamp:  new Date(),
      isDemo:     true,
      source:     'camera',
    };
  }
};

export const getRecommendations = (prediction: PredictionType) => {
  switch (prediction) {
    case 'fire':
      return [
        { icon: '🚨', text: 'Call emergency services immediately (112 / 911). Report the location, fire size, and any trapped persons.' },
        { icon: '🏃', text: 'Evacuate all occupants using the nearest safe exit. Do not use elevators. Move to the designated assembly point.' },
        { icon: '🚪', text: 'Close doors behind you as you evacuate to limit oxygen supply and slow fire spread.' },
        { icon: '💨', text: 'If there is smoke, stay low and cover your nose and mouth with a damp cloth to avoid inhalation.' },
        { icon: '🧯', text: 'Only attempt to use a fire extinguisher if the fire is small, contained, and you have a clear escape route behind you.' },
        { icon: '⛔', text: 'Do not re-enter the building until fire authorities declare it safe.' },
      ];
    case 'smoke':
      return [
        { icon: '🔍', text: 'Identify the source of smoke. Check electrical panels, kitchens, HVAC systems, and nearby outdoor areas.' },
        { icon: '📞', text: 'If the source is unclear or smoke is increasing, call emergency services as a precaution.' },
        { icon: '🚪', text: 'Open windows and doors to ventilate the area, but only if it is safe and smoke is not from an active fire.' },
        { icon: '⚡', text: 'If you suspect an electrical fault, switch off the main power supply before investigating further.' },
        { icon: '🧯', text: 'Keep a fire extinguisher within reach and be ready to evacuate if conditions worsen.' },
        { icon: '👥', text: 'Alert nearby occupants and ensure everyone is aware of the situation.' },
      ];
    case 'non-fire':
      return [
        { icon: '✅', text: 'No fire or smoke hazard detected in the current frame. The environment appears safe.' },
        { icon: '🔋', text: 'Ensure smoke detectors and fire alarms are functional and batteries are replaced regularly.' },
        { icon: '🗺️', text: 'Verify that evacuation routes are clearly marked and unobstructed at all times.' },
        { icon: '🧯', text: 'Check that fire extinguishers are accessible, inspected, and within their service date.' },
      ];
  }
};