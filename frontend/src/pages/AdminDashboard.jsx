import { useState } from 'react';
import { Users, Image, Gavel, Trophy } from 'lucide-react';
import Navbar from '../components/Navbar';
import AdminBidders from '../components/admin/AdminBidders';
import AdminPaintings from '../components/admin/AdminPaintings';
import AdminAuctions from '../components/admin/AdminAuctions';
import AdminResults from '../components/admin/AdminResults';

const TABS = [
  { id: 'auctions', label: 'Auctions', icon: Gavel },
  { id: 'paintings', label: 'Paintings', icon: Image },
  { id: 'bidders', label: 'Bidders', icon: Users },
  { id: 'results', label: 'Results', icon: Trophy },
];

export default function AdminDashboard() {
  const [tab, setTab] = useState('auctions');

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-6">
        <h1 className="font-display text-2xl mb-6">Admin Dashboard</h1>

        {/* Tab navigation */}
        <div className="flex gap-1 border-b border-auction-border mb-6">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors -mb-px ${
                tab === id
                  ? 'border-auction-gold text-auction-gold'
                  : 'border-transparent text-auction-muted hover:text-auction-text'
              }`}
            >
              <Icon className="w-4 h-4" />{label}
            </button>
          ))}
        </div>

        {tab === 'auctions' && <AdminAuctions />}
        {tab === 'paintings' && <AdminPaintings />}
        {tab === 'bidders' && <AdminBidders />}
        {tab === 'results' && <AdminResults />}
      </div>
    </div>
  );
}
