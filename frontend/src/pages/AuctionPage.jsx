import { useState, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Gavel } from 'lucide-react';
import api from '../api/client';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import PaintingCard from '../components/PaintingCard';
import CountdownTimer from '../components/CountdownTimer';


export default function AuctionPage() {
  const { socket } = useSocket();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [recentBids, setRecentBids] = useState([]);
  const [auctionStatus, setAuctionStatus] = useState(null);

  const { data: auction, isLoading } = useQuery({
    queryKey: ['active-auction'],
    queryFn: () => api.get('/auctions/active').then(r => r.data),
    refetchInterval: 30000,
  });

  // Join auction room & listen for events
  useEffect(() => {
    if (!socket || !auction?.id) return;
console.log('Joining auction room:', auction.id);
    socket.emit('join_auction', auction.id);

    const onBidAccepted = ({ paintingId, painting, bid }) => {
      // Update paintings in query cache
      queryClient.setQueryData(['active-auction'], old => {
        if (!old) return old;
        return {
          ...old,
          paintings: old.paintings.map(p =>
            p.id === paintingId ? { ...p, ...painting } : p
          )
        };
      });

      setRecentBids(prev => [{
        ...bid,
        paintingTitle: painting.title
      }, ...prev].slice(0, 30));

      if (bid.bidderNumber === user?.bidderNumber) {
        toast.success(`Bid placed! ₱${bid.amount.toLocaleString()} on "${painting.title}"`);
      } else {
        toast(`#${bid.bidderNumber} bid ₱${bid.amount.toLocaleString()} on "${painting.title}"`, {
          icon: '🎨',
          style: { background: '#221F18', color: '#F0EAD6', border: '1px solid #2E2A21' }
        });
      }
    };

    const onAuctionStatus = ({ status }) => {
      setAuctionStatus(status);
      if (status === 'ended') {
        toast('Auction has ended!', { icon: '🔨', duration: 5000 });
        queryClient.invalidateQueries(['active-auction']);
      }
    };

    const onBidError = ({ message }) => toast.error(message);

    socket.on('bid_accepted', onBidAccepted);
    socket.on('auction_status', onAuctionStatus);
    socket.on('bid_error', onBidError);

    return () => {
      socket.off('bid_accepted', onBidAccepted);
      socket.off('auction_status', onAuctionStatus);
      socket.off('bid_error', onBidError);
    };
  }, [socket, auction?.id, queryClient, user]);

  const placeBid = useCallback((paintingId, amount) => {
  if (!socket || !auction?.id) {
    toast.error('Not connected — please wait');
    return;
  }
  socket.emit('place_bid', { auctionId: auction.id, paintingId, amount });
}, [socket, auction?.id]);

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-auction-muted animate-pulse">Loading auction…</div>
    </div>
  );

  const isActive = auction?.status === 'active' && auctionStatus !== 'ended';

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-6">

        {!auction ? (
          <div className="text-center py-24">
            <Gavel className="w-12 h-12 text-auction-muted mx-auto mb-4" />
            <h2 className="font-display text-2xl text-auction-muted">No Active Auction</h2>
            <p className="text-auction-muted text-sm mt-2">Check back soon for the next live auction.</p>
          </div>
        ) : (
          <>
            {/* Auction header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  {isActive
                    ? <span className="badge-active"><span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />Live</span>
                    : <span className="badge-ended">Ended</span>
                  }
                </div>
                <h1 className="font-display text-2xl sm:text-3xl">{auction.title}</h1>
              </div>
              {isActive && <CountdownTimer endsAt={auction.ends_at} />}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
              {/* Paintings grid */}
              <div className="xl:col-span-3">
                {auction.paintings?.length === 0 ? (
                  <div className="text-center py-12 text-auction-muted">No paintings in this auction.</div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {auction.paintings?.map(p => (
                      <PaintingCard
                        key={p.id}
                        painting={p}
                        onBid={placeBid}
                        auctionActive={isActive}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
