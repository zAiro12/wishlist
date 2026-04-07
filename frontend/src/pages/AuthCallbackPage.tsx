import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function AuthCallbackPage() {
  const [searchParams] = useSearchParams();
  const { setTokenAndFetch } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = searchParams.get('token');
    const err = searchParams.get('error');
    const needsBirthdate = searchParams.get('needsBirthdate') === 'true';

    if (err) {
      setError(getErrorMessage(err));
      return;
    }

    if (!token) {
      setError('No authentication token received.');
      return;
    }

    setTokenAndFetch(token).then(() => {
      if (needsBirthdate) {
        navigate('/complete-profile', { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (error) {
    return (
      <div className="page-container" style={{ textAlign: 'center', paddingTop: '5rem' }}>
        <div className="card">
          <h2 style={{ color: 'var(--color-danger)' }}>Authentication Failed</h2>
          <p style={{ marginTop: '0.5rem', color: 'var(--color-text-muted)' }}>{error}</p>
          <button
            className="btn-primary"
            style={{ marginTop: '1.5rem' }}
            onClick={() => navigate('/login', { replace: true })}
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container" style={{ textAlign: 'center', paddingTop: '5rem' }}>
      <div className="spinner" />
      <p style={{ marginTop: '1rem', color: 'var(--color-text-muted)' }}>Signing you in…</p>
    </div>
  );
}

function getErrorMessage(code: string): string {
  const messages: Record<string, string> = {
    account_banned: 'Your account has been banned. Please contact support.',
    account_disabled: 'Your account has been disabled.',
    no_email: 'Could not retrieve your email address from the provider.',
    invalid_provider: 'Invalid authentication provider.',
    state_mismatch: 'Authentication session mismatch. Please try again.',
    state_expired: 'Authentication session expired. Please try again.',
    server_error: 'A server error occurred. Please try again.',
  };
  return messages[code] ?? `Authentication error: ${code}`;
}
