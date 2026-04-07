import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { NavBar } from './DashboardPage';
import { groups as groupsApi, wishlistStatus } from '../api/client';
import { ApiError } from '../api/client';
import { useAuth } from '../hooks/useAuth';
import type { WishlistItem } from '../types';

function StatusBadge({ status }: { status: string }) {
  if (status === 'PRENOTATO') return <span className="badge badge-prenotato">Reserved</span>;
  if (status === 'COMPRATO') return <span className="badge badge-comprato">Purchased</span>;
  return <span className="badge badge-disponibile">Available</span>;
}

export default function FriendsWishlistsPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const { user } = useAuth();

  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (groupId) loadItems(groupId);
  }, [groupId]);

  async function loadItems(id: string) {
    setLoading(true);
    try {
      const data = await groupsApi.wishlists(id);
      setItems(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load wishlists');
    } finally {
      setLoading(false);
    }
  }

  async function handleSetStatus(item: WishlistItem, status: 'PRENOTATO' | 'COMPRATO') {
    if (!groupId) return;
    setActionError(null);
    const version = item.status?.version ?? 0;
    try {
      const updated = await wishlistStatus.set(item.id, { status, groupId, version });
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, status: updated } : i))
      );
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Failed to update status');
    }
  }

  async function handleClearStatus(item: WishlistItem) {
    if (!groupId || !item.status) return;
    setActionError(null);
    try {
      const updated = await wishlistStatus.clear(item.id, {
        groupId: item.status.statusGroupId!,
        version: item.status.version,
      });
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, status: updated } : i))
      );
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Failed to clear status');
    }
  }

  // Group items by owner
  const byOwner = items.reduce<Record<string, WishlistItem[]>>((acc, item) => {
    const key = item.ownerId;
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  return (
    <>
      <NavBar />
      <div className="page-container">
        <div style={{ marginBottom: '1rem' }}>
          <Link to={`/groups/${groupId}`}>← Back to Group</Link>
        </div>
        <h1>Group Wishlists</h1>

        {actionError && (
          <div className="card" style={{ marginBottom: '1rem', borderLeft: '4px solid var(--color-danger)' }}>
            <p className="error-message" style={{ margin: 0 }}>{actionError}</p>
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem' }}><div className="spinner" /></div>
        ) : error ? (
          <p className="error-message">{error}</p>
        ) : Object.keys(byOwner).length === 0 ? (
          <div className="card" style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>
            <p>No wishlist items found in this group.</p>
          </div>
        ) : (
          Object.entries(byOwner).map(([ownerId, ownerItems]) => {
            const owner = ownerItems[0]?.owner;
            const isOwnList = ownerId === user?.id;
            return (
              <div key={ownerId} className="card" style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ marginBottom: '1rem' }}>
                  {isOwnList
                    ? '🎁 My Wishlist'
                    : `${owner?.givenName ?? ''} ${owner?.familyName ?? ''}`.trim() || owner?.email}
                  {isOwnList && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginLeft: '0.5rem' }}>
                      (your items — status hidden)
                    </span>
                  )}
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {ownerItems.map((item) => {
                    const currentStatus = item.status?.status ?? 'DISPONIBILE';
                    const statusGroupId = item.status?.statusGroupId;
                    const isReservedByOtherGroup = currentStatus !== 'DISPONIBILE' && statusGroupId !== groupId;

                    return (
                      <div
                        key={item.id}
                        style={{
                          padding: '0.75rem',
                          border: '1px solid var(--color-border)',
                          borderRadius: 'var(--radius)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: '1rem',
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ fontWeight: 500 }}>{item.title}</span>
                            <StatusBadge status={currentStatus} />
                          </div>
                          {item.description && (
                            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>
                              {item.description}
                            </p>
                          )}
                          {item.url && (
                            <a href={item.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.8rem' }}>
                              View Link
                            </a>
                          )}
                        </div>

                        {!isOwnList && (
                          <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
                            {currentStatus === 'DISPONIBILE' && (
                              <>
                                <button
                                  style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem', background: '#fef9c3', color: '#854d0e', border: '1px solid #fde047', borderRadius: 'var(--radius)' }}
                                  onClick={() => handleSetStatus(item, 'PRENOTATO')}
                                >
                                  Reserve
                                </button>
                                <button
                                  style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem', background: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5', borderRadius: 'var(--radius)' }}
                                  onClick={() => handleSetStatus(item, 'COMPRATO')}
                                >
                                  Mark Bought
                                </button>
                              </>
                            )}
                            {currentStatus !== 'DISPONIBILE' && !isReservedByOtherGroup && (
                              <>
                                {currentStatus === 'PRENOTATO' && (
                                  <button
                                    style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem', background: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5', borderRadius: 'var(--radius)' }}
                                    onClick={() => handleSetStatus(item, 'COMPRATO')}
                                  >
                                    Mark Bought
                                  </button>
                                )}
                                <button
                                  style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem', background: 'var(--color-border)', color: 'var(--color-text)', borderRadius: 'var(--radius)' }}
                                  onClick={() => handleClearStatus(item)}
                                >
                                  Clear
                                </button>
                              </>
                            )}
                            {isReservedByOtherGroup && (
                              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                                Reserved by another group
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>
    </>
  );
}
