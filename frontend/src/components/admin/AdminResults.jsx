import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Trophy, TrendingUp, ChevronDown } from 'lucide-react';
import api from '../../api/client';

export default function AdminResults() {
  const [selectedAuction, setSelectedAuction] = useState('');

  const { data: auctions = [] } = useQuery({
    queryKey: ['auctions'],
    queryFn: () => api.get('/auctions').then(r => r.data),
  });

  const endedAuctions = auctions.filter(a => a.status === 'ended');

  const { data: results } = useQuery({
    queryKey: ['results', selectedAuction],
    queryFn: () => api.get(`/auctions/${selectedAuction}/results`).then(r => r.data),
    enabled: !!selectedAuction,
  });

  const totalRevenue = results?.results.reduce((sum, r) => sum + (r.current_bid || 0), 0) || 0;
  const soldCount = results?.results.filter(r => r.status === 'sold').length || 0;
  const total = results?.results.length || 0;

  return (
    <div className="space-y-6">
      <h2 className="font-display text-xl">Auction Results</h2>

      {/* Auction selector */}
      <div className="max-w-sm">
        <label className="label mb-1.5">Select Auction</label>
        <div className="relative">
          <select
            className="input appearance-none pr-8 cursor-pointer"
            value={selectedAuction}
            onChange={e => setSelectedAuction(e.target.value)}
          >
            <option value="">— Choose an ended auction —</option>
            {endedAuctions.map(a => (
              <option key={a.id} value={a.id}>{a.title}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-auction-muted pointer-events-none" />
        </div>
      </div>

      {!results && endedAuctions.length === 0 && (
        <div className="text-center py-16 text-auction-muted">
          <Trophy className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-body">No ended auctions yet.</p>
        </div>
      )}

      {results && (
        <div className="space-y-5 animate-slide-up">

          {/* Summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="card p-5">
              <p className="font-body text-xs text-auction-muted uppercase tracking-widest mb-2">Total Revenue</p>
              <p className="font-mono text-2xl font-bold text-auction-gold">₱{totalRevenue.toLocaleString()}</p>
            </div>
            <div className="card p-5">
              <p className="font-body text-xs text-auction-muted uppercase tracking-widest mb-2">Paintings Sold</p>
              <p className="font-body text-2xl font-bold text-auction-text">{soldCount} <span className="text-auction-muted font-normal text-lg">/ {total}</span></p>
            </div>
            <div className="card p-5">
              <p className="font-body text-xs text-auction-muted uppercase tracking-widest mb-2">Success Rate</p>
              <p className="font-body text-2xl font-bold text-auction-text">
                {total ? Math.round((soldCount / total) * 100) : 0}%
              </p>
            </div>
          </div>

          {/* Results list — card per painting instead of table */}
          {/* Results list */}
          <div className="card overflow-hidden divide-y divide-auction-border">
            {results.results.map((r, i) => (
              <div key={r.id} className="p-4 hover:bg-auction-surface transition-colors">
                {/* Top row: number + title + status */}
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs text-auction-muted bg-auction-surface px-2 py-1 rounded">
                      #{String(i + 1).padStart(2, '0')}
                    </span>
                    <div>
                      <p className="font-body font-semibold text-auction-text">{r.title}</p>
                      <p className="font-body text-xs text-auction-muted">{r.artist}</p>
                    </div>
                  </div>
                  <span className={r.status === 'sold' ? 'badge-active' : 'badge-ended'}>
                    {r.status}
                  </span>
                </div>

                {/* Bottom row: bids + winner */}
                <div className="flex flex-wrap items-center gap-6 pl-10">
                  <div>
                    <p className="font-body text-xs text-auction-muted mb-0.5">Starting Bid</p>
                    <p className="font-mono text-sm text-auction-muted">₱{r.starting_bid.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="font-body text-xs text-auction-muted mb-0.5">Final Bid</p>
                    <p className="font-mono text-sm font-bold text-auction-gold">
                      {r.current_bid ? `₱${r.current_bid.toLocaleString()}` : '—'}
                    </p>
                  </div>
                  {r.current_bid && r.starting_bid && (
                    <div>
                      <p className="font-body text-xs text-auction-muted mb-0.5">Increase</p>
                      <p className="font-mono text-sm text-green-500">
                        +₱{(r.current_bid - r.starting_bid).toLocaleString()}
                      </p>
                    </div>
                  )}
                  {r.winner_name && (
                    <div className="ml-auto flex items-center gap-2">
                      <Trophy className="w-4 h-4 text-auction-gold flex-shrink-0" />
                      <div>
                        <p className="font-body text-xs text-auction-muted">Winner</p>
                        <p className="font-body text-sm font-semibold text-auction-text">
                          #{r.winner_number} — {r.winner_name}
                        </p>
                      </div>
                    </div>
                  )}
                  {!r.winner_name && (
                    <p className="font-body text-xs text-auction-muted italic ml-auto">No bids placed</p>
                  )}
                </div>
              </div>
            ))}
          </div>

        </div>
      )}
    </div>
  );
}