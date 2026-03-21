import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Plus, Trash2, Paintbrush } from 'lucide-react';
import api from '../../api/client';

const PLACEHOLDER = 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=80&q=70';

export default function AdminPaintings() {
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ title: '', artist: '', description: '', image_url: '', starting_bid: '', bid_increment: 50 });

  const { data: paintings = [] } = useQuery({
    queryKey: ['paintings'],
    queryFn: () => api.get('/paintings').then(r => r.data),
  });

  const addMutation = useMutation({
    mutationFn: data => api.post('/paintings', { ...data, starting_bid: parseFloat(data.starting_bid), bid_increment: parseFloat(data.bid_increment) }),
    onSuccess: () => { qc.invalidateQueries(['paintings']); setShowAdd(false); setForm({ title: '', artist: '', description: '', image_url: '', starting_bid: '', bid_increment: 50 }); toast.success('Painting added'); },
    onError: err => toast.error(err.response?.data?.errors?.[0]?.msg || 'Failed'),
  });

  const deleteMutation = useMutation({
    mutationFn: id => api.delete(`/paintings/${id}`),
    onSuccess: () => { qc.invalidateQueries(['paintings']); toast.success('Painting removed'); },
    onError: err => toast.error(err.response?.data?.error || 'Cannot delete painting in use'),
  });

  const f = key => ({ value: form[key], onChange: e => setForm({ ...form, [key]: e.target.value }) });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="font-display text-xl">Paintings ({paintings.length})</h2>
        <button onClick={() => setShowAdd(!showAdd)} className="btn-gold flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Painting
        </button>
      </div>

      {showAdd && (
        <div className="card p-5 animate-slide-up">
          <h3 className="font-semibold text-auction-gold mb-4">New Painting</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Title *</label>
              <input className="input" placeholder="Starry Night" {...f('title')} />
            </div>
            <div>
              <label className="label">Artist *</label>
              <input className="input" placeholder="Van Gogh" {...f('artist')} />
            </div>
            <div>
              <label className="label">Starting Bid (₱) *</label>
              <input className="input" type="number" min="0" placeholder="5000" {...f('starting_bid')} />
            </div>
            <div>
              <label className="label">Bid Increment (₱)</label>
              <input className="input" type="number" min="1" {...f('bid_increment')} />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Description</label>
              <textarea className="input" rows="2" placeholder="Optional description…" {...f('description')} />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Image URL</label>
              <input className="input" placeholder="https://…" {...f('image_url')} />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={() => addMutation.mutate(form)} disabled={!form.title || !form.artist || !form.starting_bid} className="btn-gold">
              Add Painting
            </button>
            <button onClick={() => setShowAdd(false)} className="btn-outline">Cancel</button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {paintings.map(p => (
          <div key={p.id} className="card p-3 flex items-center gap-3">
            <img src={p.image_url || PLACEHOLDER} alt={p.title} className="w-14 h-14 rounded object-cover flex-shrink-0"
              onError={e => { e.target.src = PLACEHOLDER; }} />
            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate">{p.title}</p>
              <p className="text-xs text-auction-muted flex items-center gap-1">
                <Paintbrush className="w-3 h-3" /> {p.artist}
              </p>
              <p className="text-xs font-mono text-auction-gold">₱{p.starting_bid.toLocaleString()} · +₱{p.bid_increment.toLocaleString()}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className={p.status === 'active' ? 'badge-active' : p.status === 'sold' ? 'text-xs text-auction-gold' : 'badge-pending'}>
                {p.status}
              </span>
              {p.status === 'pending' && (
                <button onClick={() => { if (confirm('Delete this painting?')) deleteMutation.mutate(p.id); }}
                  className="text-auction-muted hover:text-red-400 transition-colors p-1">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        ))}
        {paintings.length === 0 && <p className="text-center text-auction-muted py-8">No paintings yet.</p>}
      </div>
    </div>
  );
}
