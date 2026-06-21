// Top navigation. Auth-aware: signed-out shows Sign in / Sign up; signed-in
// shows the username + Sign out. (Full nav with "List an item" + Requests
// links is fleshed out in Step 3.)
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth.jsx';

export function Nav() {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-10 bg-paper/90 backdrop-blur border-b border-line">
      <nav className="max-w-6xl mx-auto flex items-center justify-between px-5 py-4">
        <Link to="/" className="font-display font-900 text-2xl tracking-tight">
          Swap<span className="text-grape">.</span>
        </Link>

        <div className="hidden sm:flex items-center gap-7 eyebrow">
          <NavLink to="/" className={({ isActive }) => isActive ? 'text-grape' : 'hover:text-grape'}>
            Browse
          </NavLink>
        </div>

        <div className="flex items-center gap-3">
          {loading ? null : user ? (
            <>
              <span className="eyebrow hidden sm:inline">Hi, {user.username}</span>
              <button type="button" className="btn btn-ghost text-sm" onClick={handleLogout}>
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn btn-ghost text-sm">Sign in</Link>
              <Link to="/signup" className="btn btn-primary text-sm">Sign up</Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
