import { useState, useEffect, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { NavBar } from './DashboardPage';
import { groups as groupsApi } from '../api/client';
import { ApiError } from '../api/client';
import type { Group } from '../types';

export default function GroupsPage() {
  const [myGroups, setMyGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const [joinId, setJoinId] = useState('');
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  useEffect(() => {
    loadGroups();
  }, []);

  async function loadGroups() {
    setLoading(true);
    try {
      const data = await groupsApi.list();
      setMyGroups(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load groups');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setCreating(true);
    setFormError(null);
    try {
      const group = await groupsApi.create({ name, description: description || undefined });
      setMyGroups((prev) => [group, ...prev]);
      setShowCreate(false);
      setName('');
      setDescription('');
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Failed to create group');
    } finally {
      setCreating(false);
    }
  }

  async function handleJoin(e: FormEvent) {
    e.preventDefault();
    setJoining(true);
    setJoinError(null);
    try {
      await groupsApi.members.join(joinId.trim());
      await loadGroups();
      setJoinId('');
    } catch (err) {
      setJoinError(err instanceof ApiError ? err.message : 'Failed to join group');
    } finally {
      setJoining(false);
    }
  }

  return (
    <>
      <NavBar />
      <div className="page-container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h1 style={{ margin: 0 }}>My Groups</h1>
          <button className="btn-primary" onClick={() => setShowCreate((v) => !v)}>
            + Create Group
          </button>
        </div>

        {showCreate && (
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <h3>Create New Group</h3>
            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label htmlFor="gname">Group Name *</label>
                <input id="gname" type="text" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} maxLength={100} />
              </div>
              <div className="form-group">
                <label htmlFor="gdesc">Description</label>
                <textarea id="gdesc" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} maxLength={500} />
              </div>
              {formError && <p className="error-message">{formError}</p>}
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button type="submit" className="btn-primary" disabled={creating}>
                  {creating ? 'Creating…' : 'Create'}
                </button>
                <button type="button" className="btn-secondary" onClick={() => setShowCreate(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <h3>Join a Group</h3>
          <form onSubmit={handleJoin} style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              type="text"
              value={joinId}
              onChange={(e) => setJoinId(e.target.value)}
              placeholder="Enter Group ID"
              style={{ flex: 1 }}
            />
            <button type="submit" className="btn-primary" disabled={joining || !joinId.trim()}>
              {joining ? 'Joining…' : 'Join'}
            </button>
          </form>
          {joinError && <p className="error-message" style={{ marginTop: '0.5rem' }}>{joinError}</p>}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem' }}><div className="spinner" /></div>
        ) : error ? (
          <p className="error-message">{error}</p>
        ) : myGroups.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>
            <p>You have not joined any groups yet.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
            {myGroups.map((group) => (
              <Link key={group.id} to={`/groups/${group.id}`} style={{ textDecoration: 'none' }}>
                <div className="card" style={{ cursor: 'pointer', height: '100%' }}>
                  <h3 style={{ marginBottom: '0.25rem' }}>{group.name}</h3>
                  {group.description && (
                    <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                      {group.description}
                    </p>
                  )}
                  <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                    {group.memberCount ?? 0} member{(group.memberCount ?? 0) !== 1 ? 's' : ''}
                  </p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
                    ID: <code style={{ fontSize: '0.7rem' }}>{group.id}</code>
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
