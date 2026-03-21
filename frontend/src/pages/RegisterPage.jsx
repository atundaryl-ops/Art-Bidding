import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { Eye, EyeOff } from 'lucide-react';
import logo from '../assets/creative-block-logo.png';

export default function RegisterPage() {
  const [form, setForm] = useState({
    firstName: '', middleName: '', lastName: '',
    email: '', phone: '', alias: '',
    password: '', confirm: ''
  });
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  // Format display name as "Last, First M."
  const formatName = () => {
    const mi = form.middleName ? ` ${form.middleName.charAt(0).toUpperCase()}.` : '';
    return `${form.lastName}, ${form.firstName}${mi}`.trim();
  };

  // Phone: only allow digits, max 9
  const handlePhone = (e) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 9);
    setForm({ ...form, phone: digits });
  };

  // Format phone for display: XX XXX XXXX
  const formatPhone = (digits) => {
    if (!digits) return '';
    const d = digits.replace(/\D/g, '');
    if (d.length <= 2) return d;
    if (d.length <= 5) return `${d.slice(0,2)} ${d.slice(2)}`;
    return `${d.slice(0,2)} ${d.slice(2,5)} ${d.slice(5)}`;
  };

  // Alias: no spaces allowed
  const handleAlias = (e) => {
    const val = e.target.value.replace(/\s/g, '');
    setForm({ ...form, alias: val });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.firstName || !form.lastName) return toast.error('First and last name are required');
    if (!form.alias) return toast.error('Alias is required');
    if (form.alias.includes(' ')) return toast.error('Alias cannot contain spaces');
    if (form.phone.length !== 9) return toast.error('Please enter a valid 9-digit phone number');
    if (form.password !== form.confirm) return toast.error('Passwords do not match');
    if (form.password.length < 6) return toast.error('Password must be at least 6 characters');

    setLoading(true);
    try {
      const fullPhone = `+63 9${formatPhone(form.phone)}`;
      const displayName = formatName();
      const data = await register({
        name: displayName,
        email: form.email,
        phone: fullPhone,
        alias: form.alias,
        password: form.password
      });
      toast.success(`Welcome! Your bidder number is #${data.bidderNumber}`);
      navigate('/auction');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const f = (key) => ({ value: form[key], onChange: e => setForm({ ...form, [key]: e.target.value }) });

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex flex-col items-center justify-center flex-1 bg-auction-gold/10 border-r border-auction-border px-12">
        <img src={logo} alt="Creative Block" className="w-48 mb-8" />
        <h1 className="font-display text-4xl text-auction-text text-center leading-tight mb-3">
          ArtBid
        </h1>
        <p className="text-auction-muted text-center text-sm max-w-xs leading-relaxed">
          A live silent auction platform by Creative Block. Bid on curated artworks in real time.
        </p>
      </div>

      {/* Right panel */}
      <div className="flex flex-col items-center justify-center flex-1 px-6 py-12 overflow-y-auto">
        {/* Mobile logo */}
        <div className="lg:hidden text-center mb-8">
          <img src={logo} alt="Creative Block" className="h-16 w-auto mx-auto mb-3" />
          <h1 className="font-display text-2xl text-auction-text">ArtBid</h1>
          <p className="text-auction-muted text-xs mt-1">by Creative Block</p>
        </div>

        <div className="w-full max-w-sm animate-slide-up">
          <div className="mb-8">
            <h2 className="font-display text-2xl text-auction-text mb-1">Create an account</h2>
            <p className="text-auction-muted text-sm">Register as a bidder to join live auctions</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Name fields */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">First Name</label>
                <input className="input" placeholder="Juan" required {...f('firstName')} />
              </div>
              <div>
                <label className="label">Last Name</label>
                <input className="input" placeholder="dela Cruz" required {...f('lastName')} />
              </div>
            </div>
            <div>
              <label className="label">Middle Name <span className="text-auction-muted normal-case font-normal">(optional)</span></label>
              <input className="input" placeholder="Santos" {...f('middleName')} />
            </div>

            {/* Email */}
            <div>
              <label className="label">Email</label>
              <input className="input" type="email" placeholder="you@example.com" required {...f('email')} />
            </div>

            {/* Phone */}
            <div>
              <label className="label">Phone Number</label>
              <div className="flex items-center input p-0 overflow-hidden">
                {/* PH Flag + prefix */}
                <div className="flex items-center gap-2 px-3 border-r border-auction-border bg-auction-surface h-full py-2.5 flex-shrink-0">
                  <span className="text-base leading-none">🇵🇭</span>
                  <span className="text-sm font-mono text-auction-text">+63 9</span>
                </div>
                <input
                  className="flex-1 bg-transparent outline-none px-3 py-2.5 text-sm font-mono placeholder-auction-muted"
                  type="text"
                  inputMode="numeric"
                  placeholder="XX XXX XXXX"
                  value={formatPhone(form.phone)}
                  onChange={handlePhone}
                  required
                />
              </div>
              <p className="text-xs text-auction-muted mt-1">Format: +63 9XX XXX XXXX</p>
            </div>

            {/* Alias */}
            <div>
              <label className="label">Alias <span className="text-auction-muted normal-case font-normal">(no spaces)</span></label>
              <input
                className="input"
                placeholder="e.g. SilentCollector"
                value={form.alias}
                onChange={handleAlias}
                required
              />
              <p className="text-xs text-auction-muted mt-1">This is the name shown during the auction — no spaces allowed</p>
            </div>

            {/* Password */}
            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input
                  className="input pr-10"
                  type={showPass ? 'text' : 'password'}
                  placeholder="Min. 6 characters"
                  required
                  {...f('password')}
                />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-auction-muted hover:text-auction-text transition-colors">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="label">Confirm Password</label>
              <div className="relative">
                <input
                  className="input pr-10"
                  type={showConfirm ? 'text' : 'password'}
                  placeholder="Repeat password"
                  required
                  {...f('confirm')}
                />
                <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-auction-muted hover:text-auction-text transition-colors">
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-gold w-full py-3 text-base mt-2">
              {loading ? 'Creating account…' : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-sm text-auction-muted mt-8">
            Already registered?{' '}
            <Link to="/login" className="text-auction-gold font-semibold hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}