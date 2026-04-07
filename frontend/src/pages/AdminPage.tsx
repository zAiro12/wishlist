import { useState, useEffect } from 'react';
import { NavBar } from './DashboardPage';
import { admin as adminApi } from '../api/client';
import { ApiError } from '../api/client';
import type { User, Group, WishlistItem, AdminAction } from '../types';

type Tab = 'users' | 'groups' | 'wishlists' | 'audit';

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>('users');

  const tabStyle = (t: Tab): React.CSSProperties => ({
    padding: '0.5rem 1.25rem',
    border: 'none',
    borderBottom: `2px solid ${tab === t ? 'var(--color-primary)' : 'transparent'}`,
    background: 'none',
    color: tab === t ? 'var(--color-primary)' : 'var(--color-text)',
    fontWeight: tab === t ? 600 : 400,
    cursor: 'pointer',
    borderRadius: 0,
  });

  return (
    <>
      <NavBar />
      <div className="page-container">
        <h1>Admin Dashboard</h1>

        <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)', marginBottom: '1.5rem' }}>
          {(['users', 'groups', 'wishlists', 'audit'] as Tab[]).map((t) => (
            <button key={t} style={tabStyle(t)} onClick={() => setTab(t)}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {tab === 'users' && <UsersTab />}
        {tab === 'groups' && <GroupsTab />}
        {tab === 'wishlists' && <WishlistsTab />}
        {tab === 'audit' && <AuditTab />}
      </div>
    </>
  );
}

function UsersTab() {
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  useEffect(() => { load(); }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await adminApi.users.list({ page, limit: 20, search: search || undefined });
      setUsers(res.users);
      setTotal(res.total);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleAction(userId: string, action: 'ban' | 'unban' | 'disable' | 'enable') {
    const reason = action === 'ban' ? prompt('Reason for ban (optional):') ?? undefined : undefined;
    try {
      await adminApi.users.update(userId, { action, reason });
      setActionMsg(`User ${action}ned successfully.`);
      await load();
    } catch (err) {
      setActionMsg(err instanceof ApiError ? err.message : 'Failed');
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <input
          type="text"
          placeholder="Search by email or name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ maxWidth: '320px' }}
          onKeyDown={(e) => { if (e.key === 'Enter') { setPage(1); load(); } }}
        />
        <button className="btn-primary" onClick={() => { setPage(1); load(); }}>Search</button>
      </div>

      {actionMsg && <p style={{ color: 'var(--color-primary)', marginBottom: '0.5rem' }}>{actionMsg}</p>}
      {error && <p className="error-message">{error}</p>}

      {loading ? (
        <div className="spinner" />
      ) : (
        <>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
            {total} user{total !== 1 ? 's' : ''} total
          </p>
          <table>
            <thead>
              <tr>
                <th>Email</th><th>Name</th><th>Role</th><th>Status</th><th>Birthdate</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.email}</td>
                  <td>{u.givenName} {u.familyName}</td>
                  <td>{u.role}</td>
                  <td>
                    <span className={`badge ${u.status === 'ACTIVE' ? 'badge-disponibile' : 'badge-comprato'}`}>
                      {u.status}
                    </span>
                  </td>
                  <td>{u.birthdate ?? '—'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.3rem' }}>
                      {u.status === 'ACTIVE' && (
                        <>
                          <button style={{ fontSize: '0.7rem', padding: '0.2rem 0.4rem', background: 'var(--color-danger)', color: 'white', borderRadius: '4px' }} onClick={() => handleAction(u.id, 'ban')}>Ban</button>
                          <button style={{ fontSize: '0.7rem', padding: '0.2rem 0.4rem', background: '#6b7280', color: 'white', borderRadius: '4px' }} onClick={() => handleAction(u.id, 'disable')}>Disable</button>
                        </>
                      )}
                      {u.status === 'BANNED' && (
                        <button style={{ fontSize: '0.7rem', padding: '0.2rem 0.4rem', background: 'var(--color-success)', color: 'white', borderRadius: '4px' }} onClick={() => handleAction(u.id, 'unban')}>Unban</button>
                      )}
                      {u.status === 'DISABLED' && (
                        <button style={{ fontSize: '0.7rem', padding: '0.2rem 0.4rem', background: 'var(--color-success)', color: 'white', borderRadius: '4px' }} onClick={() => handleAction(u.id, 'enable')}>Enable</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', alignItems: 'center' }}>
            <button className="btn-secondary" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>← Prev</button>
            <span style={{ fontSize: '0.875rem' }}>Page {page}</span>
            <button className="btn-secondary" onClick={() => setPage((p) => p + 1)} disabled={page * 20 >= total}>Next →</button>
          </div>
        </>
      )}
    </div>
  );
}

function GroupsTab() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  useEffect(() => { load(); }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  async function load() {
    setLoading(true);
    try {
      const res = await adminApi.groups.list({ page, limit: 20 });
      setGroups(res.groups);
      setTotal(res.total);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>{total} groups total</p>
      {loading ? <div className="spinner" /> : (
        <table>
          <thead><tr><th>Name</th><th>Owner</th><th>Members</th><th>Status</th><th>Created</th></tr></thead>
          <tbody>
            {groups.map((g) => (
              <tr key={g.id}>
                <td>{g.name}</td>
                <td>{g.owner?.email ?? g.ownerId}</td>
                <td>{(g as Group & { _count?: { members: number } })._count?.members ?? '?'}</td>
                <td>{g.deletedAt ? <span className="badge badge-comprato">Deleted</span> : <span className="badge badge-disponibile">Active</span>}</td>
                <td>{new Date(g.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
        <button className="btn-secondary" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>← Prev</button>
        <span style={{ fontSize: '0.875rem' }}>Page {page}</span>
        <button className="btn-secondary" onClick={() => setPage((p) => p + 1)} disabled={page * 20 >= total}>Next →</button>
      </div>
    </div>
  );
}

function WishlistsTab() {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  useEffect(() => { load(); }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  async function load() {
    setLoading(true);
    try {
      const res = await adminApi.wishlists.list({ page, limit: 20 });
      setItems(res.items);
      setTotal(res.total);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>{total} items total</p>
      {loading ? <div className="spinner" /> : (
        <table>
          <thead><tr><th>Title</th><th>Owner</th><th>Status</th><th>Created</th></tr></thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>{item.title}</td>
                <td>{item.owner?.email ?? item.ownerId}</td>
                <td>{item.status?.status ?? 'DISPONIBILE'}</td>
                <td>{new Date(item.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
        <button className="btn-secondary" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>← Prev</button>
        <span style={{ fontSize: '0.875rem' }}>Page {page}</span>
        <button className="btn-secondary" onClick={() => setPage((p) => p + 1)} disabled={page * 20 >= total}>Next →</button>
      </div>
    </div>
  );
}

function AuditTab() {
  const [actions, setActions] = useState<AdminAction[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  useEffect(() => { load(); }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  async function load() {
    setLoading(true);
    try {
      const res = await adminApi.audit.list({ page, limit: 20 });
      setActions(res.actions);
      setTotal(res.total);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>{total} audit entries</p>
      {loading ? <div className="spinner" /> : (
        <table>
          <thead><tr><th>Action</th><th>Actor</th><th>Target</th><th>Date</th></tr></thead>
          <tbody>
            {actions.map((a) => (
              <tr key={a.id}>
                <td><code style={{ fontSize: '0.8rem' }}>{a.action}</code></td>
                <td>{a.actor?.email ?? a.actorId}</td>
                <td>{a.targetUser?.email ?? a.targetUserId ?? '—'}</td>
                <td>{new Date(a.createdAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
        <button className="btn-secondary" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>← Prev</button>
        <span style={{ fontSize: '0.875rem' }}>Page {page}</span>
        <button className="btn-secondary" onClick={() => setPage((p) => p + 1)} disabled={page * 20 >= total}>Next →</button>
      </div>
    </div>
  );
}
