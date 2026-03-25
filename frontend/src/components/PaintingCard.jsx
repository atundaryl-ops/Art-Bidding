
import { TrendingUp, Clock, Trophy, Paintbrush } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const PLACEHOLDER = 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=400&q=80';

export default function PaintingCard({ painting, onBid, auctionActive }) {
  const { user } = useAuth();
  

  const currentBid = painting.current_bid || painting.starting_bid;
  const minBid = painting.current_bid
    ? painting.current_bid + painting.bid_increment
    : painting.starting_bid;
  const isWinning = painting.current_winner_id === user?.id;
  const isSold = painting.status === 'sold';

  const handleBid = () => {
    const amount = parseFloat(bidAmount);
    if (isNaN(amount) || amount < minBid) return;
    onBid(painting.id, amount);
    setBidAmount('');
    setShowBid(false);
  };

  return (
    <div className={`card overflow-hidden transition-all duration-300 ${isWinning ? 'border-auction-gold/50 shadow-lg shadow-auction-gold/10' : ''
      } animate-slide-up`}>
      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden bg-auction-surface">
        <img
          src={painting.image_url || PLACEHOLDER}
          alt={painting.title}
          className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
          onError={e => { e.target.src = PLACEHOLDER; }}
        />
        {isWinning && (
          <div className="absolute top-3 left-3 flex items-center gap-1 bg-auction-gold text-auction-dark text-xs font-bold px-2.5 py-1 rounded-full">
            <Trophy className="w-3 h-3" /> Winning
          </div>
        )}
        {isSold && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <span className="font-display text-2xl text-auction-gold font-bold tracking-wider">SOLD</span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-4 space-y-3">
        <div>
          <h3 className="font-display text-lg leading-tight">{painting.title}</h3>
          <p className="text-auction-muted text-sm flex items-center gap-1 mt-0.5">
            <Paintbrush className="w-3 h-3" /> {painting.artist}
          </p>
        </div>

        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs text-auction-muted uppercase tracking-wider">
              {painting.current_bid ? 'Current Bid' : 'Starting Bid'}
            </p>
            <p className="font-mono text-xl font-semibold text-auction-gold">
              ₱{currentBid.toLocaleString()}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-auction-muted">Increment</p>
            <p className="font-mono text-sm text-auction-text">+₱{painting.bid_increment.toLocaleString()}</p>
          </div>
        </div>

        {/* Bid input */}
        {auctionActive && !isSold && (
          <div className="pt-1">
            <button
              onClick={() => onBid(painting.id, minBid)}
              disabled={isWinning}
              className="btn-gold w-full flex items-center justify-center gap-2 text-sm"
            >
              <TrendingUp className="w-4 h-4" />
              {isWinning ? 'You\'re Winning!' : `Bid ₱${minBid.toLocaleString()}`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
