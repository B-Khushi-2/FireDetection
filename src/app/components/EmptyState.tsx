import { FileQuestion } from 'lucide-react';
import { motion } from 'motion/react';

interface EmptyStateProps {
  message?: string;
}

export function EmptyState({ message = 'No detection history available.' }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-16 text-center"
    >
      <motion.div
        animate={{
          y: [0, -10, 0],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-muted"
      >
        <FileQuestion className="h-12 w-12 text-muted-foreground" />
      </motion.div>
      
      <h3 className="mb-2">No History Yet</h3>
      <p className="max-w-md text-muted-foreground">{message}</p>
      <p className="mt-2 text-sm text-muted-foreground">
        Upload and analyze an image to see results here.
      </p>
    </motion.div>
  );
}
