import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { LogOut, Wifi, WifiOff } from 'lucide-react';
import logo from '../assets/creative-block-logo.png';

export default function Navbar() {
  const { user, logout, isAdmin } = useAuth();
  const { connected } = useSocket();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <header className="border-b border-auction-border bg-auction-surface/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link to={isAdmin ? '/admin' : '/auction'} className="flex items-center gap-2.5">
          <img src={logo} alt="ArtBid" className="h-8 w-auto" />
          {isAdmin && <span className="text-xs bg-auction-gold/20 text-auction-gold px-2 py-0.5 rounded-full font-semibold">Admin</span>}
        </Link>

        <div className="flex items-center gap-4">
          {/* Connection status */}
          <div className="flex items-center gap-1.5 text-xs text-auction-muted">
            {connected
              ? <><Wifi className="w-3.5 h-3.5 text-green-400" /><span className="hidden sm:inline text-green-400">Live</span></>
              : <><WifiOff className="w-3.5 h-3.5 text-red-400" /><span className="hidden sm:inline text-red-400">Offline</span></>
            }
          </div>

          {/* User info */}
          {user && (
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold leading-none">{user.name || user.username}</p>
              {user.bidderNumber && (
                <p className="text-xs text-auction-gold font-mono">#{user.bidderNumber}</p>
              )}
            </div>
          )}

          <button onClick={handleLogout} className="btn-outline text-sm px-3 py-1.5 flex items-center gap-1.5">
            <LogOut className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </div>
    </header>
  );
}
