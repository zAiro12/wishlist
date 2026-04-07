import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

function NavBar() {
  const { user, logout } = useAuth();
  return (
    <nav>
      <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>
        <Link to="/" style={{ color: 'var(--color-text)', textDecoration: 'none' }}>🎁 Wishlist</Link>
      </div>
      <div className="nav-links">
        <Link to="/wishlist">My Wishlist</Link>
        <Link to="/groups">Groups</Link>
        {user?.role === 'ADMIN' && <Link to="/admin">Admin</Link>}
        <span style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
          {user?.givenName ?? user?.email}
        </span>
        <button className="btn-secondary" onClick={logout} style={{ fontSize: '0.8rem', padding: '0.3rem 0.75rem' }}>
          Logout
        </button>
      </div>
    </nav>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <>
      <NavBar />
      <div className="page-container">
        <h1>Welcome, {user?.givenName ?? user?.email}!</h1>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem' }}>
          <Link to="/wishlist" style={{ textDecoration: 'none' }}>
            <div className="card" style={{ textAlign: 'center', cursor: 'pointer' }}>
              <div style={{ fontSize: '2.5rem' }}>🎁</div>
              <h3 style={{ marginTop: '0.5rem' }}>My Wishlist</h3>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
                Manage your wishlist items
              </p>
            </div>
          </Link>

          <Link to="/groups" style={{ textDecoration: 'none' }}>
            <div className="card" style={{ textAlign: 'center', cursor: 'pointer' }}>
              <div style={{ fontSize: '2.5rem' }}>👥</div>
              <h3 style={{ marginTop: '0.5rem' }}>Groups</h3>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
                Join or manage friend groups
              </p>
            </div>
          </Link>

          {user?.role === 'ADMIN' && (
            <Link to="/admin" style={{ textDecoration: 'none' }}>
              <div className="card" style={{ textAlign: 'center', cursor: 'pointer' }}>
                <div style={{ fontSize: '2.5rem' }}>🛠</div>
                <h3 style={{ marginTop: '0.5rem' }}>Admin</h3>
                <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
                  Manage users and data
                </p>
              </div>
            </Link>
          )}
        </div>
      </div>
    </>
  );
}

export { NavBar };
