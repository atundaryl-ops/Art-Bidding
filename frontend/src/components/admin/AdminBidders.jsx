import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Trash2, Mail, Phone } from 'lucide-react';
import api from '../../api/client';

export default function AdminBidders() {
  const qc = useQueryClient();

  const { data: bidders = [] } = useQuery({
    queryKey: ['bidders'],
    queryFn: () => api.get('/bidders').then(r => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: id => api.delete(`/bidders/${id}`),
    onSuccess: () => { qc.invalidateQueries(['bidders']); toast.success('Bidder removed'); },
    onError: () => toast.error('Cannot remove bidder with active bids'),
  });

  return (
    <div className="space-y-4">
      <h2 className="font-display text-xl">Registered Bidders ({bidders.length})</h2>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-auction-border">
            <tr className="text-left">
              <th className="px-4 py-3 label">#</th>
              <th className="px-4 py-3 label">Name</th>
              <th className="px-4 py-3 label hidden sm:table-cell">Contact</th>
              <th className="px-4 py-3 label hidden md:table-cell">Registered</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-auction-border">
            {bidders.map(b => (
              <tr key={b.id} className="hover:bg-auction-surface/50 transition-colors">
                <td className="px-4 py-3 font-mono text-auction-gold font-bold">#{b.bidder_number}</td>
                <td className="px-4 py-3 font-semibold">{b.name}</td>
                <td className="px-4 py-3 hidden sm:table-cell">
                  <div className="space-y-0.5">
                    <p className="flex items-center gap-1 text-auction-muted text-xs">
                      <Mail className="w-3 h-3" /> {b.email}
                    </p>
                    {b.phone && <p className="flex items-center gap-1 text-auction-muted text-xs">
                      <Phone className="w-3 h-3" /> {b.phone}
                    </p>}
                  </div>
                </td>
                <td className="px-4 py-3 hidden md:table-cell text-auction-muted text-xs">
                  {new Date(b.created_at).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => { if (confirm(`Remove ${b.name}?`)) deleteMutation.mutate(b.id); }}
                    className="text-auction-muted hover:text-red-400 transition-colors p-1">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {bidders.length === 0 && <p className="text-center text-auction-muted py-8">No bidders registered yet.</p>}
      </div>
    </div>
  );
}
