import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { Eye, EyeOff } from 'lucide-react';
import logo from '../assets/creative-block-logo.png';

export default function LoginPage() {
  const [form, setForm] = useState({ email: '', username: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login, adminLogin } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const value = form.email || form.username;
      if (value === 'admin' || !value.includes('@')) {
        try {
          await adminLogin(value, form.password);
          navigate('/admin');
          return;
        } catch {
          // not admin, try bidder
        }
      }
      await login(form.email || form.username, form.password);
      navigate('/auction');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex flex-col items-center justify-center flex-1 bg-white border-r border-auction-border px-12">
        <img src={logo} alt="Creative Block" className="w-48 mb-8" />
        <h1 className="font-display text-4xl text-auction-text text-center leading-tight mb-3">
          ArtBid
        </h1>
        <p className="text-auction-muted text-center text-sm max-w-xs leading-relaxed">
          A live silent auction platform by Creative Block. Bid on curated artworks in real time.
        </p>
      </div>

      {/* Right panel — form */}
      <div className="flex flex-col items-center justify-center flex-1 px-6 py-12 bg-[#2E6BC4]">
        {/* Mobile logo — only shows on small screens */}
        <div className="lg:hidden text-center mb-10">
          <img src={logo} alt="Creative Block" className="h-16 w-auto mx-auto mb-3" />
          <h1 className="font-display text-2xl text-auction-text">ArtBid</h1>
          <p className="text-auction-muted text-xs mt-1 text-white">by Creative Block</p>
        </div>

        <div className="w-full max-w-sm animate-slide-up">
          <div className="mb-8">
            <h2 className="font-display text-2xl text-auction-text mb-1">Welcome back</h2>
            <p className="text-auction-muted text-sm text-white">Sign in to your account to continue</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="label text-white">Email or Username</label>
              <input
                className="input"
                type="text"
                placeholder="Email or admin username"
                value={form.email || form.username}
                onChange={e => setForm({ ...form, email: e.target.value, username: e.target.value })}
                required
                autoFocus
              />
            </div>

            <div>
              <label className="label text-white">Password</label>
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
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-auction-muted hover:text-auction-text transition-colors"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-gold w-full py-3 text-base">
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          <p className="text-center text-sm text-auction-muted mt-8 text-white">
            No account?{' '}
            <Link to="/register" className="text-auction-gold font-semibold hover:underline">
              Register here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}