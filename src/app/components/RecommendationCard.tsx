import { Card } from './ui/card';
import { Lightbulb } from 'lucide-react';
import { motion } from 'motion/react';
import { Recommendation } from '../types';

interface RecommendationCardProps {
  recommendations: Recommendation[];
}

export function RecommendationCard({ recommendations }: RecommendationCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
    >
      <Card className="border-2 bg-card shadow-sm">
        <div className="p-6">
          <h3 className="mb-4 flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-primary" />
            Safety Recommendations
          </h3>

          <div className="space-y-3">
            {recommendations.map((rec, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.3 + index * 0.1 }}
                className="flex items-start gap-3 rounded-lg bg-muted/50 p-3 transition-colors hover:bg-muted"
              >
                <span className="text-2xl" role="img" aria-label="icon">
                  {rec.icon}
                </span>
                <p className="flex-1 text-sm leading-relaxed">{rec.text}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
