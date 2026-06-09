import { Badge } from './ui/badge';
import { PredictionType, RiskLevel } from '../types';

interface StatusBadgeProps {
  type: 'prediction' | 'risk';
  value: PredictionType | RiskLevel;
}

export function StatusBadge({ type, value }: StatusBadgeProps) {
  if (type === 'prediction') {
    const prediction = value as PredictionType;
    const config = {
      fire: {
        label: '🔥 Fire',
        className: 'bg-destructive/10 text-destructive border-destructive/20',
      },
      smoke: {
        label: '🌫 Smoke',
        className: 'bg-warning/10 text-warning border-warning/20',
      },
      'non-fire': {
        label: '✅ Non-Fire',
        className: 'bg-success/10 text-success border-success/20',
      },
    };

    const { label, className } = config[prediction];

    return (
      <Badge variant="outline" className={`${className} text-sm px-3 py-1 font-medium`}>
        {label}
      </Badge>
    );
  }

  const risk = value as RiskLevel;
  const config = {
    high: {
      label: 'High Risk',
      className: 'bg-destructive/10 text-destructive border-destructive/20',
    },
    medium: {
      label: 'Medium Risk',
      className: 'bg-warning/10 text-warning border-warning/20',
    },
    low: {
      label: 'Low Risk',
      className: 'bg-success/10 text-success border-success/20',
    },
  };

  const { label, className } = config[risk];

  return (
    <Badge variant="outline" className={`${className} text-sm px-3 py-1 font-medium`}>
      {label}
    </Badge>
  );
}
