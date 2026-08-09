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
    if (filterCategory === 'social') return n.type === 'chat' || n.type === 'message' || n.type === 'social';
    if (filterCategory === 'work') return n.type === 'evaluation' || n.type === 'assignment' || n.type === 'submission';
    if (filterCategory === 'alert') return n.type === 'stage_deadline_reminder' || n.type === 'alert' || n.type === 'workshop';
    if (filterCategory === 'admin') return n.type === 'admin' || n.type === 'announcement' || n.type === 'system';
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
    
    // Find sender avatar image if senderId exists
    const senderAcc = notif.senderId ? allAccounts.find(a => String(a.id) === String(notif.senderId) || a.username === notif.senderId) : null;
    const avatarUrl = notif.avatarUrl || senderAcc?.avatarUrl || senderAcc?.avatar;

    return (
      <div
        key={notif.id}
        onClick={() => handleNotificationClick(notif)}
        style={{
          padding: '1.1rem 1.25rem',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '1rem',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          background: isUnread ? '#f8fafc' : '#ffffff',
          borderBottom: '1px solid #f1f5f9',
          position: 'relative'
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = '#f8fafc'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = isUnread ? '#f8fafc' : '#ffffff'; }}
      >
        {/* Avatar / Profile Picture Image with Icon Overlay */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt="Profile"
              style={{
                width: '50px', height: '50px', borderRadius: '50%',
                objectFit: 'cover', border: '1.5px solid #e2e8f0',
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
              }}
            />
          ) : (
            <div style={{
              width: '50px', height: '50px', borderRadius: '50%',
              background: '#f1f5f9', color: '#3b82f6',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.35rem', border: '1.5px solid #e2e8f0'
            }}>
              {badge.emoji}
            </div>
          )}

          {/* Small reaction/category badge on bottom right */}
          <div style={{
            position: 'absolute', bottom: '-2px', right: '-2px',
            width: '20px', height: '20px', borderRadius: '50%',
            background: badge.bg, border: '2px solid #ffffff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.68rem', boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            {badge.emoji}
          </div>
        </div>

        {/* Content Details */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: '0.92rem', fontWeight: 800, color: '#1e293b',
            lineHeight: 1.35, marginBottom: '0.2rem', wordBreak: 'break-word'
          }}>
            {notif.title}
          </div>

          <div style={{
            fontSize: '0.85rem', color: '#64748b', fontWeight: 500,
            lineHeight: 1.45, marginBottom: '0.35rem', wordBreak: 'break-word'
          }}>
            {notif.message}
          </div>

          <div style={{ fontSize: '0.74rem', color: '#94a3b8', fontWeight: 600 }}>
            {formatNotificationDate(notif.createdAt || notif.timestamp)}
          </div>
        </div>

        {/* Unread indicator dot */}
        {isUnread && (
          <div style={{
            width: '9px', height: '9px', borderRadius: '50%',
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
        background: '#ffffff', borderRadius: '24px', padding: '1.1rem 1.4rem',
        boxShadow: '0 8px 30px rgba(0,0,0,0.03)', border: '1.5px solid #e2e8f0',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
      }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 900, color: '#0f172a', margin: 0 }}>
          Notifications
        </h1>

        <button
          onClick={handleMarkAllRead}
          style={{
            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
            color: '#ffffff', border: 'none', padding: '0.6rem 1.2rem', borderRadius: '30px',
            fontSize: '0.85rem', fontWeight: 800, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '0.45rem',
            boxShadow: '0 4px 14px rgba(37, 99, 235, 0.3)', transition: 'all 0.2s ease'
          }}
        >
          <Bell size={16} /> Mark all as read
        </button>
      </div>

      {/* ── 2. Category Filter Chips ──────────────────────────────── */}
      <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.2rem' }}>
        {[
          { id: 'all', label: 'All' },
          { id: 'social', label: 'Social' },
          { id: 'work', label: 'Work' },
          { id: 'alert', label: 'Alert' },
          { id: 'admin', label: 'Admin' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setFilterCategory(tab.id)}
            style={{
              padding: '0.5rem 1.2rem', borderRadius: '25px', fontSize: '0.86rem', fontWeight: 800,
              border: 'none', cursor: 'pointer', transition: 'all 0.2s ease', whiteSpace: 'nowrap', flexShrink: 0,
              background: filterCategory === tab.id ? '#3b82f6' : '#ffffff',
              color: filterCategory === tab.id ? '#ffffff' : '#64748b',
              boxShadow: filterCategory === tab.id ? '0 4px 12px rgba(59,130,246,0.3)' : '0 2px 8px rgba(0,0,0,0.02)'
            }}
          >
            {tab.label}
          </button>
        ))}
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
