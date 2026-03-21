import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { Gavel, Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const [tab, setTab] = useState('bidder'); // 'bidder' | 'admin'
  const [form, setForm] = useState({ email: '', username: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login, adminLogin } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (tab === 'admin') {
        await adminLogin(form.username, form.password);
        navigate('/admin');
      } else {
        await login(form.email, form.password);
        navigate('/auction');
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm animate-slide-up">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-auction-gold/10 border border-auction-gold/30 mb-4">
            <Gavel className="w-6 h-6 text-auction-gold" />
          </div>
          <h1 className="text-3xl font-display text-auction-text">ArtBid</h1>
          <p className="text-auction-muted text-sm mt-1">Live Auction Platform</p>
        </div>

        {/* Tabs */}
        <div className="flex border border-auction-border rounded-lg p-1 mb-6">
          {['bidder', 'admin'].map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 text-sm font-semibold rounded transition-all capitalize ${
                tab === t
                  ? 'bg-auction-gold text-auction-dark'
                  : 'text-auction-muted hover:text-auction-text'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {tab === 'bidder' ? (
            <div>
              <label className="label">Email</label>
              <input
                className="input"
                type="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>
          ) : (
            <div>
              <label className="label">Username</label>
              <input
                className="input"
                type="text"
                placeholder="admin"
                value={form.username}
                onChange={e => setForm({ ...form, username: e.target.value })}
                required
              />
            </div>
          )}

          <div>
            <label className="label">Password</label>
            <div className="relative">
              <input
                className="input pr-10"
                type={showPass ? 'text' : 'password'}
                placeholder="••••••••"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                required
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-auction-muted hover:text-auction-text"
              >
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn-gold w-full mt-2">
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        {tab === 'bidder' && (
          <p className="text-center text-sm text-auction-muted mt-6">
            No account?{' '}
            <Link to="/register" className="text-auction-gold hover:underline">Register here</Link>
          </p>
        )}
      </div>
    </div>
  );
}
