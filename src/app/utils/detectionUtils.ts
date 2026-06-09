import { PredictionType, DetectionResult, Recommendation } from "../types/detection";

export function simulateDetection(imageData: string): Promise<DetectionResult> {
  return new Promise((resolve) => {
    setTimeout(() => {
      // Simulate random detection
      const predictions: PredictionType[] = ["fire", "smoke", "non-fire"];
      const prediction = predictions[Math.floor(Math.random() * predictions.length)];
      
      const confidence = prediction === "fire" 
        ? 85 + Math.random() * 10
        : prediction === "smoke"
        ? 75 + Math.random() * 15
        : 90 + Math.random() * 8;

      const riskLevel = 
        prediction === "fire" ? "high" :
        prediction === "smoke" ? "medium" :
        "low";

      resolve({
        id: Date.now().toString(),
        prediction,
        confidence: Number(confidence.toFixed(1)),
        riskLevel,
        imageData,
        timestamp: new Date(),
      });
    }, 2000);
  });
}

export function getRecommendations(prediction: PredictionType): Recommendation[] {
  switch (prediction) {
    case "fire":
      return [
        { icon: "🚨", text: "Contact emergency services immediately" },
        { icon: "🏃", text: "Evacuate nearby area" },
        { icon: "⚠️", text: "Avoid approaching the fire source" },
        { icon: "🧯", text: "Use fire extinguisher only if safe to do so" },
      ];
    case "smoke":
      return [
        { icon: "🔍", text: "Investigate the source of smoke" },
        { icon: "👁️", text: "Monitor surroundings closely" },
        { icon: "🚪", text: "Ensure clear evacuation routes" },
        { icon: "📞", text: "Be ready to contact emergency services" },
      ];
    case "non-fire":
      return [
        { icon: "✅", text: "No immediate fire risk detected" },
        { icon: "🔄", text: "Continue regular monitoring" },
        { icon: "🛡️", text: "Maintain safety protocols" },
      ];
  }
}

export function getPredictionLabel(prediction: PredictionType): string {
  switch (prediction) {
    case "fire":
      return "🔥 Fire Detected";
    case "smoke":
      return "🌫️ Smoke Detected";
    case "non-fire":
      return "✅ No Fire Detected";
  }
}

export function getPredictionColor(prediction: PredictionType): string {
  switch (prediction) {
    case "fire":
      return "text-[--color-danger-red]";
    case "smoke":
      return "text-[--color-warning-amber]";
    case "non-fire":
      return "text-[--color-success-green]";
  }
}

export function getRiskBadgeColor(riskLevel: "high" | "medium" | "low"): string {
  switch (riskLevel) {
    case "high":
      return "bg-red-100 text-red-700 border-red-200";
    case "medium":
      return "bg-amber-100 text-amber-700 border-amber-200";
    case "low":
      return "bg-green-100 text-green-700 border-green-200";
  }
}

export function saveToHistory(result: DetectionResult): void {
  const history = getHistory();
  history.unshift(result);
  localStorage.setItem("fire-detection-history", JSON.stringify(history));
}

export function getHistory(): DetectionResult[] {
  const data = localStorage.getItem("fire-detection-history");
  if (!data) return [];
  
  return JSON.parse(data).map((item: any) => ({
    ...item,
    timestamp: new Date(item.timestamp),
  }));
}

export function clearHistory(): void {
  localStorage.removeItem("fire-detection-history");
}
