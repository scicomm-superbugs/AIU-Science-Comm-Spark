import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { db, useLiveCollection } from './db';
import { Bell, CheckCircle, Trash2, Filter, Search, Check, Sparkles, ArrowRight, Shield, Award, Calendar, MessageSquare, AlertCircle, Briefcase, UserCheck } from 'lucide-react';

export default function FTNotificationsPage({ user: userProp, setActiveTab }) {
  const { user: authUser } = useAuth() || {};
  const user = userProp || authUser;
  const navigate = useNavigate();

  const [filterCategory, setFilterCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const rawNotifications = useLiveCollection('ft_notifications');
  const allAccounts = useLiveCollection('scientists') || [];
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
    .sort((a, b) => new Date(b.createdAt || b.timestamp || 0).getTime() - new Date(a.createdAt || a.timestamp || 0).getTime());

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
    if (filterCategory === 'evaluations') return n.type === 'evaluation' || n.type === 'assignment';
    if (filterCategory === 'submissions') return n.type === 'submission';
    if (filterCategory === 'chat') return n.type === 'chat' || n.type === 'message' || n.type === 'social';
    if (filterCategory === 'workshops') return n.type === 'workshop' || n.type === 'stage_deadline_reminder' || n.type === 'schedule';
    if (filterCategory === 'announcements') return n.type === 'admin' || n.type === 'announcement' || n.type === 'system';
    return true;
  });

  // Split into TODAY and EARLIER sections
  const now = new Date();
  const todayStr = now.toDateString();

  const todayNotifications = filteredNotifications.filter(n => {
    if (!n.createdAt && !n.timestamp) return false;
    return new Date(n.createdAt || n.timestamp).toDateString() === todayStr;
  });

  const earlierNotifications = filteredNotifications.filter(n => {
    if (!n.createdAt && !n.timestamp) return true;
    return new Date(n.createdAt || n.timestamp).toDateString() !== todayStr;
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

  // Helper function for formatted date (e.g. 6/17/2026 or 10:31 AM)
  const formatNotificationDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return String(dateStr);
    
    if (date.toDateString() === todayStr) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
  };

  // Helper for category badge icons
  const getCategoryBadge = (notif) => {
    if (notif.type === 'chat' || notif.type === 'message') return { emoji: '💬', color: '#be123c', bg: '#ffe4e6' };
    if (notif.type === 'evaluation') return { emoji: '🏅', color: '#059669', bg: '#d1fae5' };
    if (notif.type === 'submission') return { emoji: '📤', color: '#2563eb', bg: '#dbeafe' };
    if (notif.type === 'stage_deadline_reminder') return { emoji: '⏳', color: '#d97706', bg: '#fef3c7' };
    return { emoji: '💼', color: '#3b82f6', bg: '#eff6ff' };
  };

  // Render a single notification item row
  const renderNotificationRow = (notif) => {
    const isUnread = notif.status === 'unread';
    const badge = getCategoryBadge(notif);
    
    // Find sender avatar image if senderId exists or parse from notification title/sender
    const senderId = notif.senderId || notif.senderUsername || (notif.title?.includes('from ') ? notif.title.split('from ')[1]?.trim() : null);
    const senderAcc = senderId ? allAccounts.find(a => String(a.id) === String(senderId) || a.username === senderId || a.name === senderId) : null;
    const avatarUrl = notif.avatarUrl || senderAcc?.avatarUrl || senderAcc?.avatar || (
      senderId ? `https://api.dicebear.com/7.x/avataaars/svg?seed=${senderId}` : null
    );

    return (
      <div
        key={notif.id}
        onClick={() => handleNotificationClick(notif)}
        style={{
          padding: '1rem 1.15rem',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '0.85rem',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          background: isUnread ? '#ffffff' : '#f8fafc',
          opacity: isUnread ? 1 : 0.65,
          borderBottom: '1px solid #f1f5f9',
          position: 'relative'
        }}
        onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.background = '#f1f5f9'; }}
        onMouseLeave={(e) => { e.currentTarget.style.opacity = isUnread ? '1' : '0.65'; e.currentTarget.style.background = isUnread ? '#ffffff' : '#f8fafc'; }}
      >
        {/* Avatar / Profile Picture Image with Icon Overlay */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt="Profile"
              style={{
                width: '46px', height: '46px', borderRadius: '50%',
                objectFit: 'cover', border: '1.5px solid #e2e8f0',
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                filter: isUnread ? 'none' : 'grayscale(15%)'
              }}
            />
          ) : (
            <div style={{
              width: '46px', height: '46px', borderRadius: '50%',
              background: isUnread ? '#eff6ff' : '#f1f5f9',
              color: isUnread ? '#3b82f6' : '#94a3b8',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.25rem', border: '1.5px solid #e2e8f0'
            }}>
              {badge.emoji}
            </div>
          )}

          {/* Small reaction/category badge on bottom right */}
          <div style={{
            position: 'absolute', bottom: '-2px', right: '-2px',
            width: '19px', height: '19px', borderRadius: '50%',
            background: isUnread ? badge.bg : '#f1f5f9', border: '2px solid #ffffff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.65rem', boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            {badge.emoji}
          </div>
        </div>

        {/* Content Details */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: '0.9rem', fontWeight: isUnread ? 800 : 600,
            color: isUnread ? '#0f172a' : '#64748b',
            lineHeight: 1.35, marginBottom: '0.2rem', wordBreak: 'break-word'
          }}>
            {notif.title}
          </div>

          <div style={{
            fontSize: '0.82rem', color: isUnread ? '#475569' : '#94a3b8',
            fontWeight: 500, lineHeight: 1.4, marginBottom: '0.3rem', wordBreak: 'break-word'
          }}>
            {notif.message}
          </div>

          <div style={{ fontSize: '0.72rem', color: isUnread ? '#64748b' : '#cbd5e1', fontWeight: 600 }}>
            {formatNotificationDate(notif.createdAt || notif.timestamp)}
          </div>
        </div>

        {/* Unread indicator dot */}
        {isUnread && (
          <div style={{
            width: '8px', height: '8px', borderRadius: '50%',
            background: '#3b82f6', marginTop: '0.4rem', flexShrink: 0,
            boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.2)'
          }} />
        )}
      </div>
    );
  };

  return (
    <div style={{
      maxWidth: '680px', margin: '0 auto', padding: '0.5rem 0.25rem 2.5rem',
      display: 'flex', flexDirection: 'column', gap: '1rem', fontFamily: "'Outfit', sans-serif"
    }}>

      {/* ── 1. Top Header Card ────────────────────────────────────── */}
      <div style={{
        background: '#ffffff', borderRadius: '24px', padding: '1rem 1.25rem',
        boxShadow: '0 8px 30px rgba(0,0,0,0.03)', border: '1.5px solid #e2e8f0',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.65rem'
      }}>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0f172a', margin: 0 }}>
          Notifications
        </h1>

        <button
          onClick={handleMarkAllRead}
          style={{
            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
            color: '#ffffff', border: 'none', padding: '0.45rem 0.9rem', borderRadius: '30px',
            fontSize: '0.78rem', fontWeight: 800, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '0.35rem',
            boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)', flexShrink: 0, marginLeft: 'auto'
          }}
        >
          <Bell size={14} /> Mark all as read
        </button>
      </div>



      {/* ── 3. Main Notifications Card Container ──────────────────── */}
      <div style={{
        background: '#ffffff', borderRadius: '24px', border: '1.5px solid #e2e8f0',
        boxShadow: '0 8px 30px rgba(0,0,0,0.03)', overflow: 'hidden'
      }}>
        {filteredNotifications.length === 0 ? (
          <div style={{ padding: '4rem 1.5rem', textAlign: 'center', color: '#64748b' }}>
            <div style={{
              width: '60px', height: '60px', borderRadius: '50%', background: '#eff6ff',
              color: '#3b82f6', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: '1rem', fontSize: '1.6rem'
            }}>
              🔔
            </div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 900, color: '#0f172a', margin: '0 0 0.35rem 0' }}>
              No Notifications
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0 }}>
              You are all caught up! New notifications will appear here.
            </p>
          </div>
        ) : (
          <>
            {/* TODAY SECTION */}
            {todayNotifications.length > 0 && (
              <div>
                <div style={{
                  fontSize: '0.78rem', fontWeight: 900, color: '#64748b', letterSpacing: '0.08em',
                  textTransform: 'uppercase', padding: '1rem 1.25rem 0.5rem', background: '#f8fafc',
                  borderBottom: '1px solid #f1f5f9'
                }}>
                  TODAY
                </div>
                {todayNotifications.map(renderNotificationRow)}
              </div>
            )}

            {/* EARLIER SECTION */}
            {earlierNotifications.length > 0 && (
              <div>
                <div style={{
                  fontSize: '0.78rem', fontWeight: 900, color: '#64748b', letterSpacing: '0.08em',
                  textTransform: 'uppercase', padding: '1rem 1.25rem 0.5rem', background: '#f8fafc',
                  borderBottom: '1px solid #f1f5f9'
                }}>
                  EARLIER
                </div>
                {earlierNotifications.map(renderNotificationRow)}
              </div>
            )}
          </>
        )}
      </div>

    </div>
  );
}
