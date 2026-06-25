// Top navigation. Auth-aware: signed-out shows Sign in / Sign up; signed-in
// shows the username + Sign out. The Browse/Requests links sit inline on
// desktop and collapse into a hamburger menu on mobile (< sm) so those
// destinations stay reachable on small screens.
import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth.jsx';

// Active-vs-idle styling shared by the desktop links and the mobile panel.
const linkClass = ({ isActive }) => (isActive ? 'text-grape' : 'hover:text-grape');
// Same, plus block padding for the stacked mobile rows.
const mobileLinkClass = ({ isActive }) => `block py-2.5 ${isActive ? 'text-grape' : 'hover:text-grape'}`;

export function Nav() {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = () => setMenuOpen(false);

  const handleLogout = async () => {
    closeMenu();
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
          <NavLink to="/" end className={linkClass}>
            Browse
          </NavLink>
          <NavLink to="/requests" className={linkClass}>
            Requests
          </NavLink>
          <NavLink to="/feedback" className={linkClass}>
            Feedback
          </NavLink>
        </div>

        <div className="flex items-center gap-3">
          {loading ? null : user ? (
            <>
              <Link to="/profile" className="eyebrow hidden sm:inline hover:text-grape">Hi, {user.username}</Link>
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

          {/* Mobile-only menu toggle for the Browse/Requests links. */}
          <button
            type="button"
            className="sm:hidden -mr-1 p-1.5 text-ink hover:text-grape"
            aria-label="Menu"
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
            onClick={() => setMenuOpen((v) => !v)}
          >
            {menuOpen ? (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <line x1="6" y1="6" x2="18" y2="18" />
                <line x1="18" y1="6" x2="6" y2="18" />
              </svg>
            ) : (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            )}
          </button>
        </div>
      </nav>

      {/* Mobile dropdown panel — only rendered when open, hidden at >= sm. */}
      {menuOpen && (
        <div id="mobile-nav" className="sm:hidden border-t border-line bg-paper">
          <div className="max-w-6xl mx-auto flex flex-col px-5 py-1 eyebrow">
            <NavLink to="/" end onClick={closeMenu} className={mobileLinkClass}>
              Browse
            </NavLink>
            <NavLink to="/requests" onClick={closeMenu} className={mobileLinkClass}>
              Requests
            </NavLink>
            <NavLink to="/feedback" onClick={closeMenu} className={mobileLinkClass}>
              Feedback
            </NavLink>
            {user && (
              <NavLink to="/profile" onClick={closeMenu} className={mobileLinkClass}>
                Profile
              </NavLink>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
