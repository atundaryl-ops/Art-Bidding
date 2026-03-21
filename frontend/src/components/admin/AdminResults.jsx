import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Trophy, TrendingUp } from 'lucide-react';
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

  return (
    <div className="space-y-4">
      <h2 className="font-display text-xl">Auction Results</h2>

      <div>
        <label className="label">Select Auction</label>
        <select className="input max-w-sm" value={selectedAuction} onChange={e => setSelectedAuction(e.target.value)}>
          <option value="">— Choose an ended auction —</option>
          {endedAuctions.map(a => (
            <option key={a.id} value={a.id}>{a.title}</option>
          ))}
        </select>
      </div>

      {results && (
        <div className="space-y-4 animate-slide-up">
          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="card p-4 text-center">
              <p className="label">Total Revenue</p>
              <p className="font-mono text-xl text-auction-gold font-bold">₱{totalRevenue.toLocaleString()}</p>
            </div>
            <div className="card p-4 text-center">
              <p className="label">Paintings Sold</p>
              <p className="font-display text-xl font-bold">{soldCount} / {results.results.length}</p>
            </div>
            <div className="card p-4 text-center">
              <p className="label">Success Rate</p>
              <p className="font-display text-xl font-bold">
                {results.results.length ? Math.round((soldCount / results.results.length) * 100) : 0}%
              </p>
            </div>
          </div>

          {/* Results table */}
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="border-b border-auction-border">
                <tr>
                  <th className="px-4 py-3 label text-left">Painting</th>
                  <th className="px-4 py-3 label text-right">Start</th>
                  <th className="px-4 py-3 label text-right">Final Bid</th>
                  <th className="px-4 py-3 label text-left hidden sm:table-cell">Winner</th>
                  <th className="px-4 py-3 label text-left">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-auction-border">
                {results.results.map(r => (
                  <tr key={r.id} className="hover:bg-auction-surface/50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-semibold">{r.title}</p>
                      <p className="text-xs text-auction-muted">{r.artist}</p>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-auction-muted text-xs">₱{r.starting_bid.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-auction-gold">
                      {r.current_bid ? `₱${r.current_bid.toLocaleString()}` : '—'}
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      {r.winner_name ? (
                        <p className="flex items-center gap-1 text-xs">
                          <Trophy className="w-3 h-3 text-auction-gold" />
                          #{r.winner_number} {r.winner_name}
                        </p>
                      ) : <span className="text-auction-muted text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={r.status === 'sold' ? 'badge-active' : 'badge-ended'}>{r.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {endedAuctions.length === 0 && (
        <p className="text-center text-auction-muted py-8">No ended auctions yet.</p>
      )}
    </div>
  );
}
