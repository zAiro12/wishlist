import { Link } from 'react-router-dom';

export default function ForbiddenPage() {
  return (
    <div className="page-container" style={{ textAlign: 'center', paddingTop: '5rem' }}>
      <div className="card">
        <h1>403 – Forbidden</h1>
        <p style={{ color: 'var(--color-text-muted)' }}>You do not have permission to access this page.</p>
        <Link to="/"><button className="btn-primary" style={{ marginTop: '1rem' }}>Go Home</button></Link>
      </div>
    </div>
  );
}
