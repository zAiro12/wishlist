import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { NavBar } from './DashboardPage';
import { groups as groupsApi } from '../api/client';
import { ApiError } from '../api/client';
import { useAuth } from '../hooks/useAuth';
import type { Group, GroupMember } from '../types';

export default function GroupDetailPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [group, setGroup] = useState<Group | null>(null);
  const [nextCelebrated, setNextCelebrated] = useState<{ users: import('../types').User[]; daysUntil: number | null }>({ users: [], daysUntil: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [transferUserId, setTransferUserId] = useState('');
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  useEffect(() => {
    if (groupId) loadData(groupId);
  }, [groupId]);

  async function loadData(id: string) {
    setLoading(true);
    try {
      const [g, nc] = await Promise.all([
        groupsApi.get(id),
        groupsApi.nextCelebrated(id),
      ]);
      setGroup(g);
      setNextCelebrated({ users: nc.nextCelebrated, daysUntil: nc.daysUntil });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load group');
    } finally {
      setLoading(false);
    }
  }

  async function handleLeave() {
    if (!groupId || !confirm('Are you sure you want to leave this group?')) return;
    try {
      await groupsApi.members.leave(groupId);
      navigate('/groups', { replace: true });
    } catch (err) {
      setActionMsg(err instanceof ApiError ? err.message : 'Failed to leave group');
    }
  }

  async function handleRemove(member: GroupMember) {
    if (!groupId || !confirm(`Remove ${member.user?.email ?? member.userId} from group?`)) return;
    try {
      await groupsApi.members.remove(groupId, member.userId);
      setGroup((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          members: prev.members?.filter((m) => m.userId !== member.userId),
        };
      });
    } catch (err) {
      setActionMsg(err instanceof ApiError ? err.message : 'Failed to remove member');
    }
  }

  async function handleTransfer() {
    if (!groupId || !transferUserId.trim()) return;
    try {
      const updated = await groupsApi.transfer(groupId, transferUserId.trim());
      setGroup((prev) => (prev ? { ...prev, ownerId: updated.ownerId } : prev));
      setTransferUserId('');
      setActionMsg('Ownership transferred successfully.');
    } catch (err) {
      setActionMsg(err instanceof ApiError ? err.message : 'Failed to transfer ownership');
    }
  }

  async function handleDeleteGroup() {
    if (!groupId || !confirm('Delete this group? This action cannot be undone.')) return;
    try {
      await groupsApi.delete(groupId);
      navigate('/groups', { replace: true });
    } catch (err) {
      setActionMsg(err instanceof ApiError ? err.message : 'Failed to delete group');
    }
  }

  if (loading) return <><NavBar /><div style={{ textAlign: 'center', padding: '3rem' }}><div className="spinner" /></div></>;
  if (error) return <><NavBar /><div className="page-container"><p className="error-message">{error}</p></div></>;
  if (!group) return null;

  const isOwner = group.ownerId === user?.id;
  const activeMembers = group.members?.filter((m) => m.removedAt === null) ?? [];

  return (
    <>
      <NavBar />
      <div className="page-container">
        <div style={{ marginBottom: '1rem' }}>
          <Link to="/groups">← Back to Groups</Link>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
          <div>
            <h1 style={{ margin: 0 }}>{group.name}</h1>
            {group.description && <p style={{ color: 'var(--color-text-muted)' }}>{group.description}</p>}
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
              ID: <code>{group.id}</code>
            </p>
          </div>
          <Link to={`/groups/${groupId}/wishlists`}>
            <button className="btn-primary">View Wishlists</button>
          </Link>
        </div>

        {nextCelebrated.daysUntil !== null && nextCelebrated.users.length > 0 && (
          <div className="card" style={{ marginBottom: '1.5rem', borderLeft: '4px solid var(--color-warning)' }}>
            <p style={{ fontWeight: 600 }}>
              🎂 Next Birthday: in {nextCelebrated.daysUntil === 0 ? 'today!' : `${nextCelebrated.daysUntil} day${nextCelebrated.daysUntil !== 1 ? 's' : ''}`}
            </p>
            {nextCelebrated.users.map((u) => (
              <p key={u.id} style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
                {u.givenName} {u.familyName} ({u.email})
              </p>
            ))}
          </div>
        )}

        {actionMsg && (
          <div className="card" style={{ marginBottom: '1rem', borderLeft: '4px solid var(--color-primary)' }}>
            <p>{actionMsg}</p>
          </div>
        )}

        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <h3>Members ({activeMembers.length})</h3>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                {isOwner && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {activeMembers.map((m) => (
                <tr key={m.id}>
                  <td>{m.user?.givenName} {m.user?.familyName}</td>
                  <td>{m.user?.email}</td>
                  <td>{m.userId === group.ownerId ? '👑 Owner' : 'Member'}</td>
                  {isOwner && m.userId !== user?.id && (
                    <td>
                      <button
                        style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', background: 'var(--color-danger)', color: 'white', borderRadius: 'var(--radius)' }}
                        onClick={() => handleRemove(m)}
                      >
                        Remove
                      </button>
                    </td>
                  )}
                  {isOwner && m.userId === user?.id && <td />}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {isOwner && (
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <h3>Transfer Ownership</h3>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <select
                value={transferUserId}
                onChange={(e) => setTransferUserId(e.target.value)}
                style={{ flex: 1 }}
              >
                <option value="">Select new owner…</option>
                {activeMembers
                  .filter((m) => m.userId !== user?.id)
                  .map((m) => (
                    <option key={m.userId} value={m.userId}>
                      {m.user?.givenName} {m.user?.familyName} ({m.user?.email})
                    </option>
                  ))}
              </select>
              <button className="btn-primary" onClick={handleTransfer} disabled={!transferUserId}>
                Transfer
              </button>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn-secondary" onClick={handleLeave}>
            Leave Group
          </button>
          {isOwner && (
            <button className="btn-danger" onClick={handleDeleteGroup} style={{ padding: '0.5rem 1rem' }}>
              Delete Group
            </button>
          )}
        </div>
      </div>
    </>
  );
}
