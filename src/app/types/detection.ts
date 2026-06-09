export type PredictionType = "fire" | "smoke" | "non-fire";

export interface DetectionResult {
  id: string;
  prediction: PredictionType;
  confidence: number;
  riskLevel: "high" | "medium" | "low";
  imageData: string;
  timestamp: Date;
}

export interface Recommendation {
  icon: string;
  text: string;
}
