import { Card } from './ui/card';
import { motion } from 'motion/react';
import { Scan, Loader2 } from 'lucide-react';

export function LoadingState() {
  return (
    <Card className="border-2 bg-card shadow-sm">
      <div className="flex min-h-[300px] items-center justify-center p-6">
        <div className="text-center">
          <motion.div
            animate={{
              scale: [1, 1.1, 1],
              rotate: [0, 180, 360],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10"
          >
            <Scan className="h-8 w-8 text-primary" />
          </motion.div>

          <h3 className="mb-2 flex items-center justify-center gap-2 font-semibold">
            Analyzing Image
            <Loader2 className="h-4 w-4 animate-spin" />
          </h3>
          
          <p className="text-sm text-muted-foreground">
            Processing your image with AI detection model...
          </p>

          <div className="mt-4 flex justify-center gap-1">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                animate={{
                  y: [0, -10, 0],
                }}
                transition={{
                  duration: 0.6,
                  repeat: Infinity,
                  delay: i * 0.2,
                }}
                className="h-2 w-2 rounded-full bg-primary"
              />
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}
