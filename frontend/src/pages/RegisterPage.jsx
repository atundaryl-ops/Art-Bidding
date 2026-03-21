import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { Gavel } from 'lucide-react';

export default function RegisterPage() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirm: '' });
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirm) return toast.error('Passwords do not match');
    if (form.password.length < 6) return toast.error('Password must be at least 6 characters');
    setLoading(true);
    try {
      const data = await register({ name: form.name, email: form.email, phone: form.phone, password: form.password });
      toast.success(`Welcome, ${data.name}! Your bidder number is #${data.bidderNumber}`);
      navigate('/auction');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const f = (key) => ({ value: form[key], onChange: e => setForm({ ...form, [key]: e.target.value }) });

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm animate-slide-up">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-auction-gold/10 border border-auction-gold/30 mb-4">
            <Gavel className="w-6 h-6 text-auction-gold" />
          </div>
          <h1 className="text-3xl font-display">Register as Bidder</h1>
          <p className="text-auction-muted text-sm mt-1">Create your account to start bidding</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Full Name</label>
            <input className="input" placeholder="Juan dela Cruz" required {...f('name')} />
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input" type="email" placeholder="you@example.com" required {...f('email')} />
          </div>
          <div>
            <label className="label">Phone (optional)</label>
            <input className="input" type="tel" placeholder="+63 912 345 6789" {...f('phone')} />
          </div>
          <div>
            <label className="label">Password</label>
            <input className="input" type="password" placeholder="Min. 6 characters" required {...f('password')} />
          </div>
          <div>
            <label className="label">Confirm Password</label>
            <input className="input" type="password" placeholder="Repeat password" required {...f('confirm')} />
          </div>

          <button type="submit" disabled={loading} className="btn-gold w-full mt-2">
            {loading ? 'Creating account…' : 'Create Account'}
          </button>
        </form>

        <p className="text-center text-sm text-auction-muted mt-6">
          Already registered?{' '}
          <Link to="/login" className="text-auction-gold hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
