export type PredictionType = 'fire' | 'smoke' | 'non-fire';

export type RiskLevel = 'high' | 'medium' | 'low';

export interface DetectionResult {
  id: string;
  prediction: PredictionType;
  confidence: number;
  riskLevel: RiskLevel;
  imageUrl: string;
  timestamp: Date;
  /** Per-class probability scores returned by the model */
  scores?: Record<string, number>;
  /** True when result came from mock fallback (backend offline) */
  isDemo?: boolean;
  /** Source of the detection: 'upload' (image file) or 'camera' (live webcam) */
  source?: 'upload' | 'camera';
}

export interface Recommendation {
  icon: string;
  text: string;
}
