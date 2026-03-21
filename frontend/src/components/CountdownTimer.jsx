import { useCountdown } from '../hooks/useCountdown';
import { Clock } from 'lucide-react';

export default function CountdownTimer({ endsAt }) {
  const time = useCountdown(endsAt);

  if (!time) return null;

  const isUrgent = time.ms && time.ms < 5 * 60 * 1000; // < 5 mins

  return (
    <div className={`flex items-center gap-3 px-4 py-2 rounded-lg border ${
      time.expired
        ? 'bg-red-900/20 border-red-800/50 text-red-400'
        : isUrgent
        ? 'bg-red-900/20 border-red-800/50 text-red-400 animate-pulse-gold'
        : 'bg-auction-surface border-auction-border text-auction-text'
    }`}>
      <Clock className={`w-4 h-4 ${isUrgent || time.expired ? 'text-red-400' : 'text-auction-gold'}`} />
      <div>
        <p className="text-xs text-auction-muted uppercase tracking-wider leading-none mb-0.5">
          {time.expired ? 'Ended' : 'Time Left'}
        </p>
        <p className="font-mono text-lg font-semibold leading-none tracking-wider">
          {time.expired ? '00:00:00' : time.display}
        </p>
      </div>
    </div>
  );
}
