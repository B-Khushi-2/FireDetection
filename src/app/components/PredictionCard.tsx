import { Card } from './ui/card';
import { StatusBadge } from './StatusBadge';
import { DetectionResult } from '../types';
import { motion } from 'motion/react';
import { Gauge, Target, AlertTriangle, Info } from 'lucide-react';

interface PredictionCardProps {
  result: DetectionResult | null;
}

export function PredictionCard({ result }: PredictionCardProps) {
  if (!result) {
    return (
      <Card className="border-2 bg-card shadow-sm">
        <div className="flex h-full min-h-[300px] items-center justify-center p-6">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <Target className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">
              Upload an image to see detection results
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="border-2 bg-card shadow-sm">
        <div className="p-6">
          <h3 className="mb-4 flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Detection Result
          </h3>

          {/* Demo-mode banner */}
          {result.isDemo && (
            <div className="mb-4 flex items-center gap-2 rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-sm text-orange-700 dark:border-orange-900 dark:bg-orange-950/40 dark:text-orange-400">
              <Info className="h-4 w-4 shrink-0" />
              Demo mode — start the Flask backend for real CNN predictions.
            </div>
          )}

          <div className="space-y-6">
            {/* Prediction */}
            <div>
              <label className="mb-2 block text-sm text-muted-foreground">Prediction</label>
              <StatusBadge type="prediction" value={result.prediction} />
            </div>

            {/* Confidence Score */}
            <div>
              <label className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
                <Gauge className="h-4 w-4" />
                Confidence Score
              </label>
              <div className="relative">
                <div className="h-12 w-full overflow-hidden rounded-lg bg-muted">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${result.confidence}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    className={`h-full flex items-center justify-end pr-3 ${
                      result.prediction === 'fire'
                        ? 'bg-destructive'
                        : result.prediction === 'smoke'
                        ? 'bg-warning'
                        : 'bg-success'
                    }`}
                  >
                    <span className="font-semibold text-white">{result.confidence}%</span>
                  </motion.div>
                </div>
              </div>
            </div>

            {/* Risk Level */}
            <div>
              <label className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
                <AlertTriangle className="h-4 w-4" />
                Risk Level
              </label>
              <StatusBadge type="risk" value={result.riskLevel} />
            </div>

            {/* Class Probabilities (real backend only) */}
            {result.scores && (
              <div>
                <label className="mb-3 block text-sm text-muted-foreground">Class Probabilities</label>
                <div className="space-y-2">
                  {Object.entries(result.scores)
                    .sort(([, a], [, b]) => b - a)
                    .map(([cls, score]) => {
                      const label = cls === 'non_fire' ? 'Non-Fire' : cls.charAt(0).toUpperCase() + cls.slice(1);
                      const colour =
                        cls === 'fire'     ? 'bg-destructive' :
                        cls === 'smoke'    ? 'bg-warning'     :
                                             'bg-success';
                      return (
                        <div key={cls}>
                          <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                            <span>{label}</span>
                            <span>{Math.max(0, score).toFixed(1)}%</span>
                          </div>
                          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${Math.max(0, score)}%` }}
                              transition={{ duration: 0.8, ease: 'easeOut' }}
                              className={`h-full rounded-full ${colour}`}
                            />
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {/* Analysis Time */}
            <div className="pt-4 border-t">
              <p className="text-xs text-muted-foreground">
                Analyzed on {result.timestamp.toLocaleDateString()} at{' '}
                {result.timestamp.toLocaleTimeString()}
              </p>
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
