import { useState, useMemo } from 'react';
import { useLiveCollection } from './db';
import { useAuth } from './context/AuthContext';
import {
  exportLogsToCSV,
  exportLogsToJSON,
  pruneLogsOlderThanDays,
  logActivity
} from './activityLogger';
import {
  Activity,
  Search,
  Filter,
  Download,
  Trash2,
  RefreshCw,
  Clock,
  User,
  Shield,
  Layers,
  AlertTriangle,
  CheckCircle2,
  Eye,
  X,
  Code,
  Laptop,
  Globe,
  FileText,
  Users,
  MessageSquare,
  BookOpen,
  Calendar,
  Send,
  Sparkles,
  Play,
  Pause
} from 'lucide-react';

const CATEGORY_THEMES = {
  AUTH: { name: 'Authentication', color: '#8b5cf6', bg: '#f5f3ff', border: '#ddd6fe', icon: Shield },
  CLICKS: { name: 'Navigation & Clicks', color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe', icon: Globe },
  SUBMISSIONS: { name: 'Submissions', color: '#dc2626', bg: '#fff1f2', border: '#fecdd3', icon: FileText },
  TEAMS: { name: 'Teams & Members', color: '#059669', bg: '#ecfdf5', border: '#a7f3d0', icon: Users },
  MESSAGES: { name: 'Messages & Chat', color: '#0284c7', bg: '#f0f9ff', border: '#bae6fd', icon: MessageSquare },
  LMS: { name: 'LMS & Curriculum', color: '#d97706', bg: '#fffbeb', border: '#fde68a', icon: BookOpen },
  JUDGING: { name: 'Judging & Scores', color: '#ea580c', bg: '#fff7ed', border: '#ffedd5', icon: CheckCircle2 },
  ADMIN: { name: 'Admin Operations', color: '#be123c', bg: '#fff1f2', border: '#fecdd3', icon: Shield },
  ERRORS: { name: 'System Errors', color: '#e11d48', bg: '#ffe4e6', border: '#fda4af', icon: AlertTriangle },
  GENERAL: { name: 'General Activity', color: '#475569', bg: '#f8fafc', border: '#e2e8f0', icon: Activity }
};

export default function FTActivityLogsPage() {
  const { user } = useAuth();
  const rawLogs = useLiveCollection('ft_activity_logs') || [];

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedRole, setSelectedRole] = useState('ALL');
  const [selectedTrack, setSelectedTrack] = useState('ALL');
  const [dateFilter, setDateFilter] = useState('ALL'); // 'ALL' | 'TODAY' | 'YESTERDAY' | 'WEEK' | 'MONTH'
  const [isLivePaused, setIsLivePaused] = useState(false);
  const [inspectModalLog, setInspectModalLog] = useState(null);
  const [isPruning, setIsPruning] = useState(false);

  // Parse and sort all logs chronologically (newest first)
  const allLogs = useMemo(() => {
    const list = [...rawLogs];
    list.sort((a, b) => {
      const timeA = a.epochMs || (a.timestamp ? new Date(a.timestamp).getTime() : 0);
      const timeB = b.epochMs || (b.timestamp ? new Date(b.timestamp).getTime() : 0);
      return timeB - timeA;
    });
    return list;
  }, [rawLogs]);

  // Apply filters
  const filteredLogs = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfYesterday = startOfToday - 24 * 60 * 60 * 1000;
    const startOfWeek = now.getTime() - 7 * 24 * 60 * 60 * 1000;
    const startOfMonth = now.getTime() - 30 * 24 * 60 * 60 * 1000;

    return allLogs.filter(log => {
      // Category filter
      if (selectedCategory !== 'ALL' && log.category !== selectedCategory) {
        return false;
      }

      // Role filter
      if (selectedRole !== 'ALL') {
        const uRole = (log.user?.role || 'guest').toLowerCase();
        if (selectedRole === 'admin' && !['admin', 'master'].includes(uRole)) return false;
        if (selectedRole === 'judge' && !['judge', 'trainer_judge', 'academic_judge', 'scicomm_judge'].includes(uRole)) return false;
        if (selectedRole === 'competitor' && !['competitor', 'student', 'user'].includes(uRole)) return false;
        if (selectedRole === 'guest' && uRole !== 'guest') return false;
      }

      // Track filter
      if (selectedTrack !== 'ALL') {
        const uTrack = (log.user?.track || '').toLowerCase();
        if (!uTrack.includes(selectedTrack)) return false;
      }

      // Date range filter
      const logEpoch = log.epochMs || (log.timestamp ? new Date(log.timestamp).getTime() : 0);
      if (dateFilter === 'TODAY' && logEpoch < startOfToday) return false;
      if (dateFilter === 'YESTERDAY' && (logEpoch < startOfYesterday || logEpoch >= startOfToday)) return false;
      if (dateFilter === 'WEEK' && logEpoch < startOfWeek) return false;
      if (dateFilter === 'MONTH' && logEpoch < startOfMonth) return false;

      // Fulltext search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matches = (
          (log.action && log.action.toLowerCase().includes(q)) ||
          (log.details && log.details.toLowerCase().includes(q)) ||
          (log.path && log.path.toLowerCase().includes(q)) ||
          (log.user?.name && log.user.name.toLowerCase().includes(q)) ||
          (log.user?.username && log.user.username.toLowerCase().includes(q)) ||
          (log.user?.email && log.user.email.toLowerCase().includes(q)) ||
          (log.device?.browser && log.device.browser.toLowerCase().includes(q)) ||
          (log.sessionId && log.sessionId.toLowerCase().includes(q))
        );
        if (!matches) return false;
      }

      return true;
    });
  }, [allLogs, selectedCategory, selectedRole, selectedTrack, dateFilter, searchQuery]);

  // Quick statistics
  const stats = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    
    const todayLogs = allLogs.filter(l => (l.epochMs || new Date(l.timestamp).getTime()) >= startOfToday);
    const uniqueUsersToday = new Set(todayLogs.map(l => l.user?.id || l.user?.username).filter(Boolean));
    const errorLogsCount = allLogs.filter(l => l.category === 'ERRORS' || l.level === 'error').length;
    const clicksToday = todayLogs.filter(l => l.category === 'CLICKS').length;

    return {
      totalLogs: allLogs.length,
      todayCount: todayLogs.length,
      uniqueUsersToday: uniqueUsersToday.size,
      errorCount: errorLogsCount,
      clicksToday
    };
  }, [allLogs]);

  // Prune Logs Handler
  const handlePruneLogs = async () => {
    const daysStr = prompt('Enter the number of days to keep logs for (older logs will be deleted):', '30');
    if (!daysStr) return;
    const days = parseInt(daysStr, 10);
    if (isNaN(days) || days < 1) {
      alert('Please enter a valid positive number of days.');
      return;
    }

    if (!window.confirm(`⚠️ Are you sure you want to permanently delete activity logs older than ${days} days?`)) {
      return;
    }

    setIsPruning(true);
    try {
      const count = await pruneLogsOlderThanDays(days);
      alert(`✅ Pruned ${count} old activity logs successfully!`);
      logActivity({
        category: 'ADMIN',
        action: 'Pruned Old Activity Logs',
        details: `Admin pruned ${count} activity logs older than ${days} days.`,
        user
      });
    } catch (err) {
      alert('Failed to prune logs: ' + err.message);
    } finally {
      setIsPruning(false);
    }
  };

  // Format timestamp nicely
  const formatTime = (ts) => {
    if (!ts) return 'Unknown time';
    try {
      const d = new Date(ts);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      });
    } catch {
      return ts;
    }
  };

  const getRelativeTime = (ts) => {
    if (!ts) return '';
    try {
      const diffSec = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
      if (diffSec < 10) return 'Just now';
      if (diffSec < 60) return `${diffSec}s ago`;
      const diffMin = Math.floor(diffSec / 60);
      if (diffMin < 60) return `${diffMin}m ago`;
      const diffHour = Math.floor(diffMin / 60);
      if (diffHour < 24) return `${diffHour}h ago`;
      const diffDay = Math.floor(diffHour / 24);
      return `${diffDay}d ago`;
    } catch {
      return '';
    }
  };

  return (
    <div style={{ maxWidth: '1300px', margin: '0 auto', padding: '0 0.5rem 3rem 0.5rem' }}>
      
      {/* ── TOP HEADER HERO CARD ── */}
      <div style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        borderRadius: '24px', padding: '2rem 2.25rem', color: '#ffffff',
        boxShadow: '0 12px 35px rgba(15, 23, 42, 0.18)', marginBottom: '2rem'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem' }}>
              <span style={{
                background: '#be123c', color: '#ffffff', fontSize: '0.76rem', fontWeight: 900,
                padding: '0.2rem 0.7rem', borderRadius: '8px', textTransform: 'uppercase', letterSpacing: '0.05em'
              }}>
                Management & Audit
              </span>
              
              {/* Live Pulsing Indicator */}
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                background: isLivePaused ? 'rgba(239, 68, 68, 0.2)' : 'rgba(34, 197, 94, 0.2)',
                color: isLivePaused ? '#fca5a5' : '#86efac',
                border: `1px solid ${isLivePaused ? 'rgba(239, 68, 68, 0.4)' : 'rgba(34, 197, 94, 0.4)'}`,
                fontSize: '0.75rem', fontWeight: 900, padding: '0.2rem 0.65rem', borderRadius: '20px'
              }}>
                <span style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: isLivePaused ? '#ef4444' : '#22c55e',
                  boxShadow: isLivePaused ? 'none' : '0 0 10px #22c55e'
                }} />
                {isLivePaused ? 'Live Paused' : 'Live Real-time Feed'}
              </span>
            </div>

            <h1 style={{ fontSize: '1.9rem', fontWeight: 900, margin: '0 0 0.4rem 0', display: 'flex', alignItems: 'center', gap: '0.75rem', fontFamily: "'Outfit', sans-serif" }}>
              <Activity size={30} style={{ color: '#be123c' }} /> Website Activity & Audit Logs
            </h1>
            <p style={{ color: '#94a3b8', fontSize: '0.92rem', margin: 0, fontWeight: 600 }}>
              Full audit trail: track every button click, login, submission, team action, message, and administrative event across the entire website.
            </p>
          </div>

          {/* Action Buttons: Pause/Resume, Export CSV, Export JSON, Prune */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setIsLivePaused(!isLivePaused)}
              style={{
                background: 'rgba(255, 255, 255, 0.1)', border: '1px solid rgba(255, 255, 255, 0.2)',
                color: '#ffffff', padding: '0.55rem 1rem', borderRadius: '12px', fontSize: '0.82rem',
                fontWeight: 800, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.4rem'
              }}
            >
              {isLivePaused ? <Play size={15} /> : <Pause size={15} />}
              {isLivePaused ? 'Resume Live' : 'Pause Live'}
            </button>

            <button
              type="button"
              onClick={() => exportLogsToCSV(filteredLogs)}
              style={{
                background: 'linear-gradient(135deg, #059669 0%, #047857 100%)', border: 'none',
                color: '#ffffff', padding: '0.55rem 1rem', borderRadius: '12px', fontSize: '0.82rem',
                fontWeight: 900, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                boxShadow: '0 4px 14px rgba(5, 150, 105, 0.3)'
              }}
            >
              <Download size={15} /> Export CSV
            </button>

            <button
              type="button"
              onClick={() => exportLogsToJSON(filteredLogs)}
              style={{
                background: 'rgba(255, 255, 255, 0.12)', border: '1px solid rgba(255, 255, 255, 0.25)',
                color: '#ffffff', padding: '0.55rem 0.95rem', borderRadius: '12px', fontSize: '0.82rem',
                fontWeight: 800, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.4rem'
              }}
            >
              <Code size={15} /> JSON
            </button>

            <button
              type="button"
              onClick={handlePruneLogs}
              disabled={isPruning}
              title="Prune legacy logs older than X days"
              style={{
                background: '#fff1f2', border: '1.5px solid #fecdd3', color: '#dc2626',
                padding: '0.55rem 0.9rem', borderRadius: '12px', fontSize: '0.82rem',
                fontWeight: 800, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.35rem'
              }}
            >
              <Trash2 size={15} /> Prune
            </button>
          </div>
        </div>

        {/* ── QUICK STATS GRID ── */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
          gap: '1rem', marginTop: '1.75rem', paddingTop: '1.5rem', borderTop: '1px dashed rgba(255,255,255,0.15)'
        }}>
          <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '14px', padding: '0.9rem 1.15rem', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase' }}>Total Logged Actions</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#ffffff', marginTop: '0.2rem' }}>
              {stats.totalLogs.toLocaleString()}
            </div>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '14px', padding: '0.9rem 1.15rem', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase' }}>Active Users Today</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#38bdf8', marginTop: '0.2rem' }}>
              {stats.uniqueUsersToday}
            </div>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '14px', padding: '0.9rem 1.15rem', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase' }}>Events Today</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#4ade80', marginTop: '0.2rem' }}>
              {stats.todayCount.toLocaleString()}
            </div>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '14px', padding: '0.9rem 1.15rem', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase' }}>Clicks & Navigations</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#fbbf24', marginTop: '0.2rem' }}>
              {stats.clicksToday.toLocaleString()}
            </div>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '14px', padding: '0.9rem 1.15rem', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase' }}>System Errors & Alerts</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 900, color: stats.errorCount > 0 ? '#f87171' : '#cbd5e1', marginTop: '0.2rem' }}>
              {stats.errorCount}
            </div>
          </div>
        </div>
      </div>

      {/* ── SEARCH & FILTER CONTROLS ── */}
      <div style={{
        background: '#ffffff', borderRadius: '20px', padding: '1.25rem 1.5rem',
        border: '1.5px solid #e2e8f0', boxShadow: '0 4px 18px rgba(0,0,0,0.03)',
        marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem'
      }}>
        {/* Top Row: Search Box + Preset Selectors */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          {/* Search Box */}
          <div style={{ position: 'relative', flex: 1, minWidth: '280px' }}>
            <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Search by user name, email, action, button clicked, path, or session ID..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                width: '100%', padding: '0.65rem 1rem 0.65rem 2.6rem', borderRadius: '12px',
                border: '1.5px solid #cbd5e1', fontSize: '0.88rem', fontWeight: 600,
                outline: 'none', background: '#f8fafc', color: '#0f172a', boxSizing: 'border-box'
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                style={{ position: 'absolute', right: '0.85rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Quick Dropdown Selectors: Role, Track, Date */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div>
              <select
                value={selectedRole}
                onChange={e => setSelectedRole(e.target.value)}
                style={{
                  padding: '0.6rem 0.9rem', borderRadius: '12px', border: '1.5px solid #cbd5e1',
                  background: '#f8fafc', fontSize: '0.84rem', fontWeight: 700, color: '#334155'
                }}
              >
                <option value="ALL">All Roles</option>
                <option value="admin">Admins & Masters</option>
                <option value="judge">Judges & Trainers</option>
                <option value="competitor">Competitors</option>
                <option value="guest">Guests</option>
              </select>
            </div>

            <div>
              <select
                value={selectedTrack}
                onChange={e => setSelectedTrack(e.target.value)}
                style={{
                  padding: '0.6rem 0.9rem', borderRadius: '12px', border: '1.5px solid #cbd5e1',
                  background: '#f8fafc', fontSize: '0.84rem', fontWeight: 700, color: '#334155'
                }}
              >
                <option value="ALL">All Tracks</option>
                <option value="pop_science">🎥 Pop Science</option>
                <option value="science_journalism">📰 Science Journalism</option>
              </select>
            </div>

            <div>
              <select
                value={dateFilter}
                onChange={e => setDateFilter(e.target.value)}
                style={{
                  padding: '0.6rem 0.9rem', borderRadius: '12px', border: '1.5px solid #cbd5e1',
                  background: '#f8fafc', fontSize: '0.84rem', fontWeight: 700, color: '#334155'
                }}
              >
                <option value="ALL">All Time</option>
                <option value="TODAY">Today Only</option>
                <option value="YESTERDAY">Yesterday</option>
                <option value="WEEK">Last 7 Days</option>
                <option value="MONTH">Last 30 Days</option>
              </select>
            </div>
          </div>
        </div>

        {/* Category Pill Filters Bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', paddingTop: '0.65rem', borderTop: '1px dashed #e2e8f0' }}>
          <span style={{ fontSize: '0.78rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', marginRight: '0.25rem' }}>
            Categories:
          </span>

          <button
            type="button"
            onClick={() => setSelectedCategory('ALL')}
            style={{
              padding: '0.35rem 0.75rem', borderRadius: '20px', fontSize: '0.78rem', fontWeight: 800,
              border: `1.5px solid ${selectedCategory === 'ALL' ? '#0f172a' : '#e2e8f0'}`,
              background: selectedCategory === 'ALL' ? '#0f172a' : '#ffffff',
              color: selectedCategory === 'ALL' ? '#ffffff' : '#475569',
              cursor: 'pointer', transition: 'all 0.15s ease'
            }}
          >
            All Categories ({allLogs.length})
          </button>

          {Object.entries(CATEGORY_THEMES).map(([catKey, theme]) => {
            const count = allLogs.filter(l => l.category === catKey).length;
            const isSelected = selectedCategory === catKey;
            const IconComp = theme.icon;

            return (
              <button
                key={catKey}
                type="button"
                onClick={() => setSelectedCategory(catKey)}
                style={{
                  padding: '0.35rem 0.75rem', borderRadius: '20px', fontSize: '0.78rem', fontWeight: 800,
                  border: `1.5px solid ${isSelected ? theme.color : theme.border}`,
                  background: isSelected ? theme.color : theme.bg,
                  color: isSelected ? '#ffffff' : theme.color,
                  cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                  transition: 'all 0.15s ease'
                }}
              >
                <IconComp size={13} />
                <span>{theme.name}</span>
                <span style={{
                  fontSize: '0.7rem', padding: '0.05rem 0.4rem', borderRadius: '10px',
                  background: isSelected ? 'rgba(255,255,255,0.25)' : '#ffffff',
                  color: isSelected ? '#ffffff' : theme.color
                }}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── LOGS TABLE & STREAM FEED ── */}
      <div style={{
        background: '#ffffff', borderRadius: '22px', border: '1.5px solid #e2e8f0',
        boxShadow: '0 4px 20px rgba(0,0,0,0.04)', overflow: 'hidden'
      }}>
        {/* Table Header / Summary */}
        <div style={{
          padding: '1rem 1.5rem', background: '#f8fafc', borderBottom: '1px solid #e2e8f0',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem'
        }}>
          <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#334155' }}>
            Showing <strong>{filteredLogs.length}</strong> matching activities
          </div>

          <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>
            Click "Inspect" on any activity to view full device metadata & JSON payload
          </div>
        </div>

        {/* List Content */}
        {filteredLogs.length === 0 ? (
          <div style={{ padding: '4rem 2rem', textAlign: 'center' }}>
            <Activity size={48} style={{ color: '#cbd5e1', margin: '0 auto 1rem auto' }} />
            <h3 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#0f172a', margin: '0 0 0.35rem 0' }}>
              No Activity Logs Found
            </h3>
            <p style={{ color: '#64748b', fontSize: '0.88rem', margin: 0 }}>
              {searchQuery || selectedCategory !== 'ALL' || dateFilter !== 'ALL'
                ? 'Try broadening your search filters or selecting All Categories.'
                : 'No activities have been recorded in this workspace yet.'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {filteredLogs.map((log, idx) => {
              const theme = CATEGORY_THEMES[log.category] || CATEGORY_THEMES.GENERAL;
              const IconComp = theme.icon;
              const relativeTime = getRelativeTime(log.timestamp);
              const formattedDateTime = formatTime(log.timestamp);
              const isError = log.level === 'error' || log.category === 'ERRORS';

              return (
                <div
                  key={log.id || idx}
                  style={{
                    padding: '1.1rem 1.5rem',
                    borderBottom: idx === filteredLogs.length - 1 ? 'none' : '1px solid #f1f5f9',
                    borderLeft: `4.5px solid ${isError ? '#e11d48' : theme.color}`,
                    background: isError ? '#fff1f2' : idx % 2 === 0 ? '#ffffff' : '#fafafa',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                    flexWrap: 'wrap', gap: '1rem', transition: 'background 0.15s ease'
                  }}
                >
                  {/* Left Column: Icon + Action & User Details */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', flex: 1, minWidth: '300px' }}>
                    {/* Category Icon Badge */}
                    <div style={{
                      width: '38px', height: '38px', borderRadius: '12px',
                      background: theme.bg, border: `1.5px solid ${theme.border}`,
                      color: theme.color, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0, marginTop: '0.15rem'
                    }}>
                      <IconComp size={19} />
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      {/* Action Title & Badges */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.3rem' }}>
                        <span style={{ fontSize: '0.98rem', fontWeight: 900, color: isError ? '#be123c' : '#0f172a', wordBreak: 'break-word' }}>
                          {log.action}
                        </span>

                        {/* Category Badge */}
                        <span style={{
                          fontSize: '0.68rem', fontWeight: 800, padding: '0.12rem 0.55rem', borderRadius: '20px',
                          background: theme.bg, color: theme.color, border: `1px solid ${theme.border}`
                        }}>
                          {theme.name}
                        </span>

                        {/* Level Tag */}
                        {isError && (
                          <span style={{ fontSize: '0.65rem', fontWeight: 900, padding: '0.1rem 0.45rem', borderRadius: '6px', background: '#e11d48', color: '#ffffff' }}>
                            ERROR ⚠️
                          </span>
                        )}
                      </div>

                      {/* Details Explanation */}
                      {log.details && (
                        <div style={{ fontSize: '0.84rem', color: '#475569', fontWeight: 500, marginBottom: '0.45rem', lineHeight: 1.45, wordBreak: 'break-word' }}>
                          {log.details}
                        </div>
                      )}

                      {/* User & Route Pills */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flexWrap: 'wrap', fontSize: '0.78rem', color: '#64748b' }}>
                        {/* User Pill */}
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontWeight: 700, color: '#1e293b' }}>
                          <User size={13} style={{ color: theme.color }} />
                          <span>{log.user?.name || log.user?.username || 'Guest'}</span>
                          {log.user?.role && (
                            <span style={{
                              fontSize: '0.66rem', fontWeight: 800, padding: '0.08rem 0.4rem', borderRadius: '6px',
                              background: ['admin', 'master'].includes(log.user.role) ? '#fff1f2' : '#eff6ff',
                              color: ['admin', 'master'].includes(log.user.role) ? '#be123c' : '#2563eb',
                              border: `1px solid ${['admin', 'master'].includes(log.user.role) ? '#fecdd3' : '#bfdbfe'}`
                            }}>
                              {log.user.role}
                            </span>
                          )}
                          {log.user?.track && log.user.track !== 'unassigned' && (
                            <span style={{ fontSize: '0.66rem', fontWeight: 700, color: '#64748b' }}>
                              ({log.user.track.includes('pop') ? '🎥 Pop Videos' : '📰 Journalism'})
                            </span>
                          )}
                        </span>

                        {/* Route / Page */}
                        {log.path && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', background: '#f1f5f9', padding: '0.15rem 0.5rem', borderRadius: '6px', fontFamily: 'monospace', fontSize: '0.74rem' }}>
                            <Globe size={11} /> {log.path}
                          </span>
                        )}

                        {/* Device info */}
                        {log.device?.browser && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                            <Laptop size={12} /> {log.device.browser} on {log.device.os || 'OS'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Timestamp & Inspect Button */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.45rem', flexShrink: 0 }}>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.3rem', justifyContent: 'flex-end' }}>
                        <Clock size={12} style={{ color: '#94a3b8' }} /> {relativeTime}
                      </span>
                      <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600 }}>
                        {formattedDateTime}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setInspectModalLog(log)}
                      style={{
                        background: '#ffffff', border: '1.5px solid #cbd5e1', color: '#334155',
                        padding: '0.35rem 0.75rem', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 800,
                        cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <Eye size={13} /> Inspect
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── INSPECT LOG MODAL ── */}
      {inspectModalLog && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 99999, padding: '0.75rem'
        }}>
          <div style={{
            background: '#ffffff', borderRadius: '24px', width: '100%', maxWidth: '720px',
            maxHeight: '90vh', display: 'flex', flexDirection: 'column',
            boxShadow: '0 25px 60px rgba(0,0,0,0.3)', position: 'relative'
          }}>
            {/* Modal Header */}
            <div style={{ padding: '1.4rem 1.75rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Code size={20} style={{ color: '#be123c' }} /> Forensic Activity Inspection
                </h2>
                <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0.2rem 0 0 0', fontWeight: 600 }}>
                  Event ID: <code>{inspectModalLog.id || 'N/A'}</code>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setInspectModalLog(null)}
                style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '1.5rem 1.75rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Event Overview Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', background: '#f8fafc', padding: '1rem', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                <div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>Timestamp</div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0f172a', marginTop: '0.15rem' }}>
                    {formatTime(inspectModalLog.timestamp)}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>Category & Action</div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#be123c', marginTop: '0.15rem' }}>
                    {inspectModalLog.category}: {inspectModalLog.action}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>User Identity</div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0f172a', marginTop: '0.15rem' }}>
                    {inspectModalLog.user?.name || inspectModalLog.user?.username} ({inspectModalLog.user?.role || 'guest'})
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>Session ID</div>
                  <div style={{ fontSize: '0.78rem', fontFamily: 'monospace', color: '#475569', marginTop: '0.15rem' }}>
                    {inspectModalLog.sessionId || 'N/A'}
                  </div>
                </div>
              </div>

              {/* Complete JSON Payload Viewer */}
              <div>
                <div style={{ fontSize: '0.82rem', fontWeight: 900, color: '#0f172a', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Code size={16} /> Complete JSON Payload & Metadata
                </div>
                <pre style={{
                  background: '#0f172a', color: '#f8fafc', padding: '1.2rem', borderRadius: '14px',
                  fontSize: '0.78rem', fontFamily: 'Consolas, Monaco, monospace', lineHeight: 1.5,
                  overflowX: 'auto', margin: 0, border: '1px solid #334155'
                }}>
                  {JSON.stringify(inspectModalLog, null, 2)}
                </pre>
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{ padding: '1rem 1.75rem', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="ft-btn ft-btn-primary"
                onClick={() => setInspectModalLog(null)}
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
