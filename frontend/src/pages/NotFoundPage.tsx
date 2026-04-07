import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="page-container" style={{ textAlign: 'center', paddingTop: '5rem' }}>
      <div className="card">
        <h1>404 – Not Found</h1>
        <p style={{ color: 'var(--color-text-muted)' }}>The page you are looking for does not exist.</p>
        <Link to="/"><button className="btn-primary" style={{ marginTop: '1rem' }}>Go Home</button></Link>
      </div>
    </div>
  );
}
