import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { db, useLiveCollection } from './db';
import { Bell, CheckCircle, Trash2, Filter, Search, Check, Sparkles, ArrowRight, Shield, Award, Calendar, MessageSquare, AlertCircle } from 'lucide-react';

export default function FTNotificationsPage({ user: userProp, setActiveTab }) {
  const { user: authUser } = useAuth() || {};
  const user = userProp || authUser;
  const navigate = useNavigate();

  const [filterCategory, setFilterCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const rawNotifications = useLiveCollection('ft_notifications');
  const allNotifications = rawNotifications || [];

  if (!user) {
    return (
      <div style={{ padding: '3rem 1.5rem', textAlign: 'center', color: '#64748b', fontFamily: "'Outfit', sans-serif" }}>
        Loading user account...
      </div>
    );
  }

  // Filter for user notifications (broadcasts or user-specific)
  const myNotifications = [...allNotifications]
    .filter(n => {
      const isForMe = !n.targetUserId || n.targetUserId === user.id || n.targetUserId === 'all' || (Array.isArray(n.targetRoles) && n.targetRoles.includes(user.role));
      return isForMe;
    })
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

  const unreadNotifications = myNotifications.filter(n => n.status === 'unread');
  const unreadCount = unreadNotifications.length;

  // Category Filtering
  const filteredNotifications = myNotifications.filter(n => {
    // 1. Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = (n.title || '').toLowerCase().includes(q);
      const matchMsg = (n.message || '').toLowerCase().includes(q);
      if (!matchTitle && !matchMsg) return false;
    }

    // 2. Category Tab
    if (filterCategory === 'unread') return n.status === 'unread';
    if (filterCategory === 'evaluation') return n.type === 'evaluation' || n.type === 'assignment';
    if (filterCategory === 'submission') return n.type === 'submission';
    if (filterCategory === 'workshop') return n.type === 'workshop' || n.type === 'stage_deadline_reminder';
    if (filterCategory === 'chat') return n.type === 'chat' || n.type === 'message';
    return true;
  });

  // Batch Action: Mark All Read
  const handleMarkAllRead = async () => {
    try {
      const unreadList = myNotifications.filter(n => n.status === 'unread');
      for (const notif of unreadList) {
        await db.ft_notifications.update(notif.id, { status: 'read' });
      }
    } catch (err) {
      console.error('Failed to mark notifications read', err);
    }
  };

  // Batch Action: Clear Read Notifications
  const handleClearRead = async () => {
    try {
      const readList = myNotifications.filter(n => n.status === 'read');
      for (const notif of readList) {
        await db.ft_notifications.delete(notif.id);
      }
    } catch (err) {
      console.error('Failed to clear read notifications', err);
    }
  };

  // Single Notification Click Handler
  const handleNotificationClick = async (notif) => {
    if (notif.status === 'unread') {
      await db.ft_notifications.update(notif.id, { status: 'read' }).catch(() => {});
    }

    if (notif.targetTab && setActiveTab) {
      setActiveTab(notif.targetTab);
    } else if (notif.targetTab) {
      navigate(`/dashboard/${notif.targetTab.replace('_', '-')}`);
    } else if (notif.type === 'chat' || notif.type === 'message') {
      navigate('/dashboard/chat');
    } else if (notif.type === 'evaluation' || notif.type === 'submission') {
      navigate('/dashboard/my-competition');
    }
  };

  // Helper function for relative timestamp
  const formatTimeAgo = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffSec = Math.floor((now - date) / 1000);

    if (diffSec < 60) return 'Just now';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d ago`;
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  // Helper for notification type styling
  const getTypeMeta = (type) => {
    switch (type) {
      case 'evaluation':
      case 'assignment':
        return { icon: '🏅', bg: '#ecfdf5', color: '#059669', border: '#a7f3d0', label: 'Evaluation' };
      case 'submission':
        return { icon: '📤', bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe', label: 'Submission' };
      case 'workshop':
        return { icon: '🎓', bg: '#faf5ff', color: '#7e22ce', border: '#e9d5ff', label: 'Workshop' };
      case 'stage_deadline_reminder':
        return { icon: '⏳', bg: '#fffbeb', color: '#d97706', border: '#fde68a', label: 'Deadline' };
      case 'chat':
      case 'message':
        return { icon: '💬', bg: '#fff1f2', color: '#be123c', border: '#fecdd3', label: 'Message' };
      default:
        return { icon: '📢', bg: '#f1f5f9', color: '#475569', border: '#cbd5e1', label: 'Update' };
    }
  };

  return (
    <div className="ft-notifications-page" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      
      {/* ── Top Header Banner Card ────────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(135deg, #ffffff 0%, #fff1f2 100%)',
        padding: '1.25rem 1.6rem', borderRadius: '24px', border: '1.5px solid #fecdd3',
        boxShadow: '0 4px 20px rgba(190, 18, 60, 0.05)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div style={{
            width: '46px', height: '46px', borderRadius: '16px',
            background: 'linear-gradient(135deg, #be123c 0%, #9f1239 100%)',
            color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 6px 16px rgba(190, 18, 60, 0.25)', flexShrink: 0
          }}>
            <Bell size={22} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <h1 style={{ fontFamily: "'Outfit', sans-serif", fontSize: '1.3rem', fontWeight: 900, color: '#0f172a', margin: 0 }}>
                Notifications Dashboard
              </h1>
              {unreadCount > 0 && (
                <span style={{
                  background: '#be123c', color: '#ffffff', fontSize: '0.72rem', fontWeight: 900,
                  padding: '0.15rem 0.55rem', borderRadius: '9999px', boxShadow: '0 2px 8px rgba(190,18,60,0.3)'
                }}>
                  {unreadCount} New
                </span>
              )}
            </div>
            <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '0.15rem 0 0 0', fontWeight: 600 }}>
              Stay up-to-date with your stage evaluations, feedback, deadlines, and announcement updates
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              style={{
                background: '#ffffff', border: '1.5px solid #cbd5e1', color: '#334155',
                padding: '0.5rem 0.9rem', borderRadius: '12px', fontSize: '0.82rem', fontWeight: 800,
                cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                transition: 'all 0.2s ease', boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
              }}
            >
              <CheckCircle size={15} style={{ color: '#059669' }} /> Mark All Read
            </button>
          )}

          {myNotifications.some(n => n.status === 'read') && (
            <button
              onClick={handleClearRead}
              style={{
                background: '#ffffff', border: '1.5px solid #fecdd3', color: '#be123c',
                padding: '0.5rem 0.9rem', borderRadius: '12px', fontSize: '0.82rem', fontWeight: 800,
                cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                transition: 'all 0.2s ease', boxShadow: '0 2px 6px rgba(190,18,60,0.02)'
              }}
            >
              <Trash2 size={15} /> Clear Read
            </button>
          )}
        </div>
      </div>

      {/* ── Main Notifications Card Wrapper ──────────────────────── */}
      <div style={{
        background: '#ffffff', borderRadius: '24px', border: '1.5px solid #e2e8f0',
        padding: '1.25rem', boxShadow: '0 8px 30px rgba(15,23,42,0.03)',
        display: 'flex', flexDirection: 'column', gap: '1rem'
      }}>
        
        {/* Search & Filter Bar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          
          {/* Search Box */}
          <div style={{ position: 'relative', width: '100%' }}>
            <Search size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Search notifications by title, keyword, or evaluator..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%', padding: '0.65rem 0.85rem 0.65rem 2.4rem', borderRadius: '14px',
                border: '1.5px solid #cbd5e1', fontSize: '0.86rem', outline: 'none',
                color: '#0f172a', fontWeight: 600, boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Filter Category Chips */}
          <div style={{ display: 'flex', gap: '0.45rem', overflowX: 'auto', paddingBottom: '0.2rem' }}>
            {[
              { id: 'all', label: `All (${myNotifications.length})` },
              { id: 'unread', label: `Unread (${unreadCount})` },
              { id: 'evaluation', label: '🏅 Evaluations' },
              { id: 'submission', label: '📤 Submissions' },
              { id: 'workshop', label: '🎓 Workshops & Dates' },
              { id: 'chat', label: '💬 Messages' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setFilterCategory(tab.id)}
                style={{
                  padding: '0.4rem 0.85rem', borderRadius: '10px', fontSize: '0.8rem', fontWeight: 800,
                  border: `1.5px solid ${filterCategory === tab.id ? '#be123c' : '#cbd5e1'}`,
                  background: filterCategory === tab.id ? '#be123c' : '#ffffff',
                  color: filterCategory === tab.id ? '#ffffff' : '#475569',
                  cursor: 'pointer', transition: 'all 0.2s ease', whiteSpace: 'nowrap', flexShrink: 0
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Notifications Graphical List ────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', marginTop: '0.25rem' }}>
          {filteredNotifications.length === 0 ? (
            <div style={{ padding: '3.5rem 1rem', textAlign: 'center', color: '#64748b' }}>
              <div style={{
                width: '56px', height: '56px', borderRadius: '18px', background: '#f1f5f9',
                color: '#94a3b8', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: '0.85rem'
              }}>
                <Bell size={26} />
              </div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 900, color: '#0f172a', margin: '0 0 0.3rem 0' }}>
                No Notifications Found
              </h3>
              <p style={{ fontSize: '0.82rem', color: '#64748b', margin: 0 }}>
                {searchQuery ? 'Try clearing your search terms or changing filter category.' : 'You are all caught up! New notifications will appear here.'}
              </p>
            </div>
          ) : (
            filteredNotifications.map(notif => {
              const meta = getTypeMeta(notif.type);
              const isUnread = notif.status === 'unread';

              return (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  style={{
                    padding: '1rem 1.15rem', borderRadius: '18px',
                    background: isUnread ? '#fff1f2' : '#f8fafc',
                    border: `1.5px solid ${isUnread ? '#fecdd3' : '#e2e8f0'}`,
                    display: 'flex', alignItems: 'flex-start', gap: '0.85rem',
                    cursor: 'pointer', transition: 'all 0.2s ease', position: 'relative',
                    boxShadow: isUnread ? '0 4px 14px rgba(190,18,60,0.06)' : 'none'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#be123c';
                    if (!isUnread) e.currentTarget.style.background = '#ffffff';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = isUnread ? '#fecdd3' : '#e2e8f0';
                    if (!isUnread) e.currentTarget.style.background = '#f8fafc';
                  }}
                >
                  {/* Category Icon Badge */}
                  <div style={{
                    width: '42px', height: '42px', borderRadius: '14px',
                    background: meta.bg, color: meta.color, border: `1.5px solid ${meta.border}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1.25rem', flexShrink: 0
                  }}>
                    {meta.icon}
                  </div>

                  {/* Notification Details */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', minWidth: 0 }}>
                        <span style={{
                          fontSize: '0.68rem', fontWeight: 800, padding: '0.1rem 0.45rem', borderRadius: '6px',
                          background: meta.bg, color: meta.color, border: `1px solid ${meta.border}`, flexShrink: 0
                        }}>
                          {meta.label}
                        </span>
                        <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 900, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {notif.title}
                        </h4>
                      </div>

                      <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 700, flexShrink: 0 }}>
                        {formatTimeAgo(notif.createdAt)}
                      </span>
                    </div>

                    <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.84rem', color: '#475569', fontWeight: 500, lineHeight: 1.5, wordBreak: 'break-word' }}>
                      {notif.message}
                    </p>

                    {/* Action link indicator */}
                    <div style={{ marginTop: '0.45rem', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.74rem', fontWeight: 800, color: '#be123c' }}>
                      <span>View Details</span> <ArrowRight size={13} />
                    </div>
                  </div>

                  {/* Green pulse unread indicator dot */}
                  {isUnread && (
                    <span style={{
                      position: 'absolute', top: '1rem', right: '1rem',
                      width: '9px', height: '9px', borderRadius: '50%', background: '#be123c',
                      boxShadow: '0 0 0 3px rgba(190,18,60,0.2)'
                    }} />
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

    </div>
  );
}
