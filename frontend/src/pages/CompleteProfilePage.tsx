import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { users as usersApi } from '../api/client';
import { ApiError } from '../api/client';

export default function CompleteProfilePage() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();

  const [givenName, setGivenName] = useState(user?.givenName ?? '');
  const [familyName, setFamilyName] = useState(user?.familyName ?? '');
  const [birthdate, setBirthdate] = useState(user?.birthdate ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!birthdate) {
      setError('Birthdate is required before you can use the app.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await usersApi.updateProfile({ givenName, familyName, birthdate });
      await refreshUser();
      navigate('/', { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.data.error);
      } else {
        setError('An unexpected error occurred.');
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
    >
      <div className="card" style={{ width: '100%', maxWidth: '480px' }}>
        <h2>Complete Your Profile</h2>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem' }}>
          We need a few details before you can join groups.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="givenName">First Name</label>
            <input
              id="givenName"
              type="text"
              value={givenName}
              onChange={(e) => setGivenName(e.target.value)}
              placeholder="First name"
            />
          </div>

          <div className="form-group">
            <label htmlFor="familyName">Last Name</label>
            <input
              id="familyName"
              type="text"
              value={familyName}
              onChange={(e) => setFamilyName(e.target.value)}
              placeholder="Last name"
            />
          </div>

          <div className="form-group">
            <label htmlFor="birthdate">
              Birthdate <span style={{ color: 'var(--color-danger)' }}>*</span>
            </label>
            <input
              id="birthdate"
              type="date"
              value={birthdate}
              max={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setBirthdate(e.target.value)}
              required
            />
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
              Your birthdate is used to calculate who to celebrate in groups.
            </p>
          </div>

          {error && <p className="error-message">{error}</p>}

          <button
            type="submit"
            className="btn-primary"
            disabled={saving}
            style={{ width: '100%', padding: '0.75rem', marginTop: '0.5rem' }}
          >
            {saving ? 'Saving…' : 'Save and Continue'}
          </button>
        </form>
      </div>
    </div>
  );
}
