import { useEffect, useRef } from 'react';
import { TrendingUp } from 'lucide-react';

export default function BidFeed({ bids }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [bids]);

  if (!bids.length) return (
    <div className="text-center text-auction-muted py-8 text-sm">
      No bids yet. Be the first!
    </div>
  );

  return (
    <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
      {bids.map((bid, i) => (
        <div
          key={bid.id || i}
          className="flex items-center justify-between px-3 py-2 rounded bg-auction-surface border border-auction-border animate-slide-up"
        >
          <div className="flex items-center gap-2">
            <TrendingUp className="w-3.5 h-3.5 text-auction-gold flex-shrink-0" />
            <div>
              <span className="text-sm font-semibold text-auction-text">
                #{bid.bidderNumber} {bid.bidderName}
              </span>
              <p className="text-xs text-auction-muted">
                {bid.paintingTitle && `on "${bid.paintingTitle}" · `}
                {new Date(bid.placedAt).toLocaleTimeString()}
              </p>
            </div>
          </div>
          <span className="font-mono font-bold text-auction-gold text-sm ml-2">
            ₱{bid.amount.toLocaleString()}
          </span>
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
