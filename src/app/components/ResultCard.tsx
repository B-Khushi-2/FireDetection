import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";
import { AlertTriangle, TrendingUp } from "lucide-react";
import { motion } from "motion/react";
import { DetectionResult } from "../types/detection";
import {
  getPredictionLabel,
  getPredictionColor,
  getRiskBadgeColor,
} from "../utils/detectionUtils";

interface ResultCardProps {
  result: DetectionResult | null;
  isAnalyzing: boolean;
}

export function ResultCard({ result, isAnalyzing }: ResultCardProps) {
  if (isAnalyzing) {
    return (
      <Card className="overflow-hidden border-2 shadow-sm">
        <div className="bg-gradient-to-br from-gray-50 to-white p-6">
          <h3 className="mb-6 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-[--color-blue-accent]" />
            Analysis Results
          </h3>

          <div className="flex flex-col items-center justify-center py-12">
            <motion.div
              className="mb-6 h-16 w-16 rounded-full border-4 border-[--color-fire-orange] border-t-transparent"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />
            <p className="text-muted-foreground">Analyzing image...</p>
            <p className="mt-2 text-sm text-muted-foreground">Please wait</p>
          </div>
        </div>
      </Card>
    );
  }

  if (!result) {
    return (
      <Card className="overflow-hidden border-2 shadow-sm">
        <div className="bg-gradient-to-br from-gray-50 to-white p-6">
          <h3 className="mb-6 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-[--color-blue-accent]" />
            Analysis Results
          </h3>

          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-4 rounded-full bg-muted p-4">
              <AlertTriangle className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">No analysis yet</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Upload an image to detect fire or smoke
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="overflow-hidden border-2 shadow-sm">
        <div className="bg-gradient-to-br from-gray-50 to-white p-6">
          <h3 className="mb-6 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-[--color-blue-accent]" />
            Analysis Results
          </h3>

          <div className="space-y-6">
            {/* Prediction */}
            <div>
              <label className="mb-2 block text-sm text-muted-foreground">
                Prediction
              </label>
              <motion.div
                className="rounded-lg bg-white p-4 shadow-sm"
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1 }}
              >
                <p className={`text-2xl ${getPredictionColor(result.prediction)}`}>
                  {getPredictionLabel(result.prediction)}
                </p>
              </motion.div>
            </div>

            {/* Confidence Score */}
            <div>
              <label className="mb-2 block text-sm text-muted-foreground">
                Confidence Score
              </label>
              <motion.div
                className="rounded-lg bg-white p-4 shadow-sm"
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2 }}
              >
                <div className="mb-2 flex items-baseline gap-2">
                  <span className="text-3xl font-semibold">{result.confidence}%</span>
                  <span className="text-sm text-muted-foreground">confidence</span>
                </div>
                <Progress value={result.confidence} className="h-2" />
              </motion.div>
            </div>

            {/* Risk Level */}
            <div>
              <label className="mb-2 block text-sm text-muted-foreground">
                Risk Level
              </label>
              <motion.div
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3 }}
              >
                <Badge
                  className={`border px-4 py-2 text-sm uppercase ${getRiskBadgeColor(
                    result.riskLevel
                  )}`}
                >
                  {result.riskLevel}
                </Badge>
              </motion.div>
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
