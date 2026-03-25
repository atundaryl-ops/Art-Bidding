import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Play, Square, Plus, Clock } from 'lucide-react';
import api from '../../api/client';
import { useSocket } from '../../context/SocketContext';
import BidFeed from '../BidFeed';

export default function AdminAuctions() {
  const { socketRef } = useSocket();
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: '', duration_minutes: 60, painting_ids: [] });
  const [liveBids, setLiveBids] = useState([]);
  const [selectedId, setSelectedId] = useState(null);

  const { data: existingBids = [] } = useQuery({
    queryKey: ['auction-bids', selectedId],
    queryFn: async () => {
      if (!selectedId) return [];
      const auction = auctions.find(a => a.id === selectedId);
      if (!auction) return [];
      const paintingsRes = await api.get(`/auctions/${selectedId}`);
      const paintings = paintingsRes.data.paintings || [];
      const allBids = [];
      for (const p of paintings) {
        const res = await api.get(`/paintings/${p.id}/bids`);
        const bids = res.data.map(b => ({
          id: b.id,
          amount: b.amount,
          bidderName: b.bidder_name,
          bidderNumber: b.bidder_number,
          paintingTitle: p.title,
          placedAt: b.placed_at
        }));
        allBids.push(...bids);
      }
      return allBids.sort((a, b) => new Date(b.placedAt) - new Date(a.placedAt)).slice(0, 50);
    },
    enabled: !!selectedId,
  });
  
  useEffect(() => {
    if (existingBids.length > 0) {
      setLiveBids(existingBids);
    }
  }, [existingBids]);

  const { data: auctions = [] } = useQuery({
    queryKey: ['auctions'],
    queryFn: () => api.get('/auctions').then(r => r.data),
  });
  const { data: paintings = [] } = useQuery({
    queryKey: ['paintings'],
    queryFn: () => api.get('/paintings').then(r => r.data),
  });

  const createMutation = useMutation({
    mutationFn: data => api.post('/auctions', data),
    onSuccess: () => { qc.invalidateQueries(['auctions']); setShowCreate(false); setForm({ title: '', duration_minutes: 60, painting_ids: [] }); toast.success('Auction created'); },
    onError: err => toast.error(err.response?.data?.error || 'Failed'),
  });

  const startMutation = useMutation({
    mutationFn: id => api.post(`/auctions/${id}/start`),
    onSuccess: (res) => {
      qc.invalidateQueries(['auctions']);
      toast.success('Auction started!');
      socketRef?.emit('auction_started', res.data.id);
    },
    onError: err => toast.error(err.response?.data?.error || 'Failed'),
  });

  const endMutation = useMutation({
    mutationFn: id => api.post(`/auctions/${id}/end`),
    onSuccess: (_, id) => {
      qc.invalidateQueries(['auctions']);
      toast.success('Auction ended');
      socketRef?.emit('auction_ended', id);
    },
    onError: err => toast.error(err.response?.data?.error || 'Failed'),
  });

  useEffect(() => {
    if (!selectedId) return;
    const s = socketRef?.current;
    if (!s) return;
    s.emit('join_auction', selectedId);
    const onBid = ({ painting, bid }) => {
      setLiveBids(prev => [{
        ...bid,
        paintingTitle: painting.title
      }, ...prev].slice(0, 50));
    };
    s.on('bid_accepted', onBid);
    return () => s.off('bid_accepted', onBid);
  }, [socketRef, selectedId]);

  const togglePainting = (id) => {
    setForm(f => ({
      ...f,
      painting_ids: f.painting_ids.includes(id)
        ? f.painting_ids.filter(p => p !== id)
        : [...f.painting_ids, id]
    }));
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="font-display text-xl">Auctions</h2>
        <button onClick={() => setShowCreate(!showCreate)} className="btn-gold flex items-center gap-2">
          <Plus className="w-4 h-4" /> New Auction
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="card p-5 space-y-4 animate-slide-up">
          <h3 className="font-semibold text-auction-gold">Create Auction</h3>
          <div>
            <label className="label">Auction Title</label>
            <input className="input" placeholder="Spring Collection 2025" value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })} />
          </div>
          <div>
            <label className="label">Duration (minutes)</label>
            <input className="input" type="number" min="1" value={form.duration_minutes}
              onChange={e => setForm({ ...form, duration_minutes: parseInt(e.target.value) })} />
          </div>
          <div>
            <label className="label">Select Paintings ({form.painting_ids.length} selected)</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto">
              {paintings.filter(p => p.status === 'pending').map(p => (
                <label key={p.id} className={`flex items-center gap-2 p-2 rounded border cursor-pointer text-sm transition-colors ${form.painting_ids.includes(p.id) ? 'border-auction-gold bg-auction-gold/10 text-auction-gold' : 'border-auction-border hover:border-auction-muted'
                  }`}>
                  <input type="checkbox" className="sr-only" checked={form.painting_ids.includes(p.id)}
                    onChange={() => togglePainting(p.id)} />
                  <div>
                    <p className="font-semibold truncate">{p.title}</p>
                    <p className="text-xs text-auction-muted">₱{p.starting_bid.toLocaleString()}</p>
                  </div>
                </label>
              ))}
            </div>
            {paintings.filter(p => p.status === 'pending').length === 0 && (
              <p className="text-auction-muted text-sm">No pending paintings available. Add paintings first.</p>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={() => createMutation.mutate(form)} disabled={!form.title || form.painting_ids.length === 0} className="btn-gold">
              Create
            </button>
            <button onClick={() => setShowCreate(false)} className="btn-outline">Cancel</button>
          </div>
        </div>
      )}

      {/* Auctions list */}
      <div className="space-y-3">
        {auctions.map(a => (
          <div key={a.id}>
            <div className="card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={a.status === 'active' ? 'badge-active' : a.status === 'ended' ? 'badge-ended' : 'badge-pending'}>
                    {a.status}
                  </span>
                </div>
                <h3 className="font-body font-semibold">{a.title}</h3>
                <p className="text-xs font-body text-auction-muted flex items-center gap-1 mt-0.5">
                  <Clock className="w-3 h-3" /> {a.duration_minutes} min
                  {a.ends_at && ` · Ends ${new Date(a.ends_at).toLocaleString()}`}
                </p>
              </div>
              <div className="flex gap-2">
                {a.status === 'pending' && (
                  <button onClick={() => startMutation.mutate(a.id)} disabled={startMutation.isPending}
                    className="btn-gold flex items-center gap-1.5 text-sm">
                    <Play className="w-3.5 h-3.5" /> Start
                  </button>
                )}
                {a.status === 'active' && (
                  <>
                    <button
                      onClick={() => { setSelectedId(selectedId === a.id ? null : a.id); }}
                      className="btn-outline text-sm px-3 py-1.5">
                      {selectedId === a.id ? 'Hide Bids' : 'Live Bids'}
                    </button>
                    <button onClick={() => { if (confirm('End this auction?')) endMutation.mutate(a.id); }}
                      disabled={endMutation.isPending}
                      className="btn-outline flex items-center gap-1.5 text-sm border-red-800 text-red-400 hover:border-red-600">
                      <Square className="w-3.5 h-3.5" /> End Auction
                    </button>
                  </>
                )}
              </div>
            </div>

            {selectedId === a.id && (
              <div className="card mt-1 p-4 border-auction-gold/30">
                <p className="text-xs text-auction-muted uppercase tracking-wider mb-2">Live Bid Feed</p>
                <BidFeed bids={liveBids} />
              </div>
            )}
          </div>
        ))}
        {auctions.length === 0 && <p className="text-center text-auction-muted py-8">No auctions yet.</p>}
      </div>

    </div>
  );
}
