import { db, firestore, getCollectionName } from './db';
import { collection, addDoc, getDocs, query, deleteDoc, doc, where } from 'firebase/firestore';

// In-memory session tracking token
let currentSessionId = null;
export function getSessionId() {
  if (typeof window === 'undefined') return 'server_session';
  if (!currentSessionId) {
    try {
      currentSessionId = sessionStorage.getItem('ft_session_id');
      if (!currentSessionId) {
        currentSessionId = 'sess_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
        sessionStorage.setItem('ft_session_id', currentSessionId);
      }
    } catch {
      currentSessionId = 'sess_' + Date.now();
    }
  }
  return currentSessionId;
}

/**
 * Get device & browser metadata
 */
export function getDeviceMetadata() {
  if (typeof window === 'undefined') return {};
  const ua = navigator.userAgent || '';
  let browser = 'Unknown Browser';
  if (ua.includes('Firefox')) browser = 'Firefox';
  else if (ua.includes('Chrome') && !ua.includes('Edg')) browser = 'Chrome';
  else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari';
  else if (ua.includes('Edg')) browser = 'Edge';

  let os = 'Unknown OS';
  if (ua.includes('Win')) os = 'Windows';
  else if (ua.includes('Mac')) os = 'macOS';
  else if (ua.includes('Linux')) os = 'Linux';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';

  return {
    browser,
    os,
    userAgent: ua,
    screen: `${window.innerWidth}x${window.innerHeight}`,
    path: window.location.pathname + window.location.search,
    referrer: document.referrer || 'direct',
    language: navigator.language || 'en'
  };
}

/**
 * Log an activity to Firestore collection `scicommspark_ft_activity_logs`
 * @param {Object} options
 * @param {string} options.category - 'AUTH' | 'CLICKS' | 'SUBMISSIONS' | 'TEAMS' | 'MESSAGES' | 'LMS' | 'JUDGING' | 'ADMIN' | 'ERRORS'
 * @param {string} options.action - Short title of action (e.g., 'User Logged In', 'Button Clicked', 'Team Created')
 * @param {string} [options.details] - Human-readable explanation
 * @param {string} [options.target] - Target item ID, name, or URL
 * @param {Object} [options.metadata] - Arbitrary JSON payload
 * @param {Object} [options.user] - Override user identity object
 * @param {string} [options.level] - 'info' | 'success' | 'warning' | 'error'
 */
/**
 * Helper to resolve active user identity with multiple fallbacks
 */
export function getActiveUserIdentity(providedUser = null) {
  if (providedUser && providedUser.username && providedUser.username !== 'anonymous' && providedUser.name && providedUser.name !== 'Anonymous User') {
    return {
      id: String(providedUser.id || providedUser.userId || 'guest'),
      username: String(providedUser.username),
      name: String(providedUser.name || providedUser.username),
      email: String(providedUser.email || providedUser.googleEmail || ''),
      role: String(providedUser.role || providedUser.realRole || 'guest'),
      track: String(providedUser.registeredTrack || providedUser.track || 'unassigned')
    };
  }

  if (typeof window !== 'undefined') {
    // 1. Check window.__CURRENT_FT_USER__
    if (window.__CURRENT_FT_USER__ && (window.__CURRENT_FT_USER__.name || window.__CURRENT_FT_USER__.username)) {
      const u = window.__CURRENT_FT_USER__;
      return {
        id: String(u.id || u.userId || 'guest'),
        username: String(u.username || 'user'),
        name: String(u.name || u.username || 'User'),
        email: String(u.email || u.googleEmail || ''),
        role: String(u.role || u.realRole || 'guest'),
        track: String(u.registeredTrack || u.track || 'unassigned')
      };
    }

    // 2. Check localStorage / sessionStorage ft_user
    try {
      const stored = localStorage.getItem('ft_user') || sessionStorage.getItem('ft_user') || localStorage.getItem('user') || sessionStorage.getItem('user');
      if (stored) {
        const u = JSON.parse(stored);
        if (u && (u.name || u.username)) {
          return {
            id: String(u.id || u.userId || 'guest'),
            username: String(u.username || 'user'),
            name: String(u.name || u.username || 'User'),
            email: String(u.email || u.googleEmail || ''),
            role: String(u.role || u.realRole || 'guest'),
            track: String(u.registeredTrack || u.track || 'unassigned')
          };
        }
      }
    } catch {}

    // 3. Check ft_userId in localStorage / sessionStorage
    try {
      const storedId = localStorage.getItem('ft_userId') || sessionStorage.getItem('ft_userId');
      if (storedId) {
        return {
          id: String(storedId),
          username: String(storedId),
          name: String(storedId),
          email: '',
          role: 'user',
          track: 'unassigned'
        };
      }
    } catch {}
  }

  return {
    id: providedUser?.id || providedUser?.userId || 'guest',
    username: providedUser?.username || 'anonymous',
    name: providedUser?.name || providedUser?.username || 'Anonymous User',
    email: providedUser?.email || providedUser?.googleEmail || '',
    role: providedUser?.role || 'guest',
    track: providedUser?.registeredTrack || providedUser?.track || 'unassigned'
  };
}

/**
 * Log an activity to Firestore collection `scicommspark_ft_activity_logs`
 * @param {Object} options
 * @param {string} options.category - 'AUTH' | 'CLICKS' | 'SUBMISSIONS' | 'TEAMS' | 'MESSAGES' | 'LMS' | 'JUDGING' | 'ADMIN' | 'ERRORS'
 * @param {string} options.action - Short title of action (e.g., 'User Logged In', 'Button Clicked', 'Team Created')
 * @param {string} [options.details] - Human-readable explanation
 * @param {string} [options.target] - Target item ID, name, or URL
 * @param {Object} [options.metadata] - Arbitrary JSON payload
 * @param {Object} [options.user] - Override user identity object
 * @param {string} [options.level] - 'info' | 'success' | 'warning' | 'error'
 */
export async function logActivity({
  category = 'GENERAL',
  action = 'User Action',
  details = '',
  target = '',
  metadata = {},
  user = null,
  level = 'info'
}) {
  try {
    const activeUser = getActiveUserIdentity(user);
    const device = getDeviceMetadata();
    const sessionId = getSessionId();
    const now = new Date();

    const logEntry = {
      timestamp: now.toISOString(),
      epochMs: now.getTime(),
      category: String(category).toUpperCase(),
      action: String(action).trim(),
      details: String(details || action).trim(),
      target: String(target || '').trim(),
      level: String(level).toLowerCase(),
      path: device.path || window.location.pathname,
      sessionId,
      device: {
        browser: device.browser,
        os: device.os,
        screen: device.screen,
        language: device.language
      },
      user: activeUser,
      metadata: metadata || {}
    };

    // Asynchronously write to Firestore
    await db.ft_activity_logs.add(logEntry);

    // Also buffer in sessionStorage for instant offline recovery
    if (typeof window !== 'undefined') {
      try {
        const recent = JSON.parse(sessionStorage.getItem('ft_recent_local_logs') || '[]');
        recent.unshift({ ...logEntry, id: 'local_' + Date.now() });
        if (recent.length > 50) recent.pop();
        sessionStorage.setItem('ft_recent_local_logs', JSON.stringify(recent));
      } catch {}
    }

    return logEntry;
  } catch (err) {
    console.warn('Activity logging fallback/warning:', err);
    return null;
  }
}

/**
 * Global Click & Interaction Interceptor
 * Automatically captures button clicks, links, and forms with debounce
 */
let isGlobalTrackerInitialized = false;
let lastClickTime = 0;
let lastClickedIdentifier = '';

export function initGlobalActivityTracker() {
  if (typeof window === 'undefined' || isGlobalTrackerInitialized) return;
  isGlobalTrackerInitialized = true;

  // 1. Global Click Listener
  document.addEventListener('click', (event) => {
    try {
      const target = event.target;
      if (!target) return;

      // Find closest interactive element
      const clickable = target.closest('button, a, [role="button"], input[type="submit"], input[type="button"], summary, [data-action]');
      if (!clickable) return;

      // Get readable label
      let label = clickable.innerText || clickable.getAttribute('title') || clickable.getAttribute('aria-label') || clickable.getAttribute('data-action') || clickable.id || clickable.className || 'Button';
      label = String(label).replace(/\s+/g, ' ').trim();
      if (!label || label.length > 80) {
        label = label.slice(0, 80) + '...';
      }

      // Ignore trivial internal toggles if label is empty or purely whitespace
      if (!label || label === '...' || label.length < 2) return;

      const identifier = `${label}_${window.location.pathname}_${clickable.tagName}`;
      const now = Date.now();
      // Debounce duplicate clicks within 450ms
      if (identifier === lastClickedIdentifier && now - lastClickTime < 450) {
        return;
      }
      lastClickTime = now;
      lastClickedIdentifier = identifier;

      // Determine category
      let category = 'CLICKS';
      const textLower = label.toLowerCase();
      if (textLower.includes('submit') || textLower.includes('form') || textLower.includes('deliverable')) {
        category = 'SUBMISSIONS';
      } else if (textLower.includes('team') || textLower.includes('member') || textLower.includes('invite')) {
        category = 'TEAMS';
      } else if (textLower.includes('module') || textLower.includes('workshop') || textLower.includes('lecture') || textLower.includes('file')) {
        category = 'LMS';
      } else if (textLower.includes('message') || textLower.includes('chat') || textLower.includes('send') || textLower.includes('broadcast')) {
        category = 'MESSAGES';
      } else if (textLower.includes('sign in') || textLower.includes('login') || textLower.includes('logout') || textLower.includes('register')) {
        category = 'AUTH';
      }

      logActivity({
        category,
        action: `Clicked "${label}"`,
        details: `User interacted with <${clickable.tagName.toLowerCase()}> element "${label}" on ${window.location.pathname}`,
        target: clickable.getAttribute('href') || clickable.id || label,
        metadata: {
          tagName: clickable.tagName,
          id: clickable.id || '',
          className: String(clickable.className || '').slice(0, 100),
          href: clickable.getAttribute('href') || ''
        }
      });
    } catch (clickErr) {
      console.warn('Global click tracker suppressed:', clickErr);
    }
  }, { capture: true, passive: true });

  // 2. Global Uncaught Error Interceptor
  window.addEventListener('error', (event) => {
    try {
      logActivity({
        category: 'ERRORS',
        action: `JavaScript Error: ${event.message || 'Unknown Error'}`,
        details: `${event.message} at ${event.filename || 'unknown'}:${event.lineno || 0}:${event.colno || 0}`,
        level: 'error',
        metadata: {
          message: event.message,
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          stack: event.error?.stack || ''
        }
      });
    } catch {}
  });

  // 3. Global Unhandled Promise Rejection Interceptor
  window.addEventListener('unhandledrejection', (event) => {
    try {
      const reason = event.reason;
      const msg = reason?.message || String(reason) || 'Unhandled Promise Rejection';
      logActivity({
        category: 'ERRORS',
        action: `Async Error: ${msg}`,
        details: msg,
        level: 'error',
        metadata: {
          reason: msg,
          stack: reason?.stack || ''
        }
      });
    } catch {}
  });
}

/**
 * Export logs array to CSV formatted file
 */
export function exportLogsToCSV(logs = []) {
  if (!logs || logs.length === 0) {
    alert('No activity logs to export.');
    return;
  }

  const headers = ['Timestamp', 'Category', 'Action', 'Details', 'Level', 'User Name', 'Username', 'User Email', 'Role', 'Track', 'Page Path', 'Browser', 'OS', 'Session ID'];

  const rows = logs.map(l => {
    return [
      `"${l.timestamp || ''}"`,
      `"${l.category || ''}"`,
      `"${(l.action || '').replace(/"/g, '""')}"`,
      `"${(l.details || '').replace(/"/g, '""')}"`,
      `"${l.level || 'info'}"`,
      `"${(l.user?.name || '').replace(/"/g, '""')}"`,
      `"${(l.user?.username || '').replace(/"/g, '""')}"`,
      `"${(l.user?.email || '').replace(/"/g, '""')}"`,
      `"${l.user?.role || ''}"`,
      `"${l.user?.track || ''}"`,
      `"${l.path || ''}"`,
      `"${l.device?.browser || ''}"`,
      `"${l.device?.os || ''}"`,
      `"${l.sessionId || ''}"`
    ].join(',');
  });

  const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows].join('\r\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `scicommspark_activity_logs_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Export logs array to JSON formatted file
 */
export function exportLogsToJSON(logs = []) {
  if (!logs || logs.length === 0) {
    alert('No activity logs to export.');
    return;
  }

  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(logs, null, 2));
  const link = document.createElement('a');
  link.setAttribute('href', dataStr);
  link.setAttribute('download', `scicommspark_activity_logs_${new Date().toISOString().slice(0, 10)}.json`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Prune / Delete logs older than X days
 */
export async function pruneLogsOlderThanDays(days = 30) {
  try {
    const cutoffMs = Date.now() - (days * 24 * 60 * 60 * 1000);
    const q = query(
      collection(firestore, getCollectionName('ft_activity_logs')),
      where('epochMs', '<', cutoffMs)
    );
    const snap = await getDocs(q);
    let deletedCount = 0;
    for (const d of snap.docs) {
      await deleteDoc(doc(firestore, getCollectionName('ft_activity_logs'), d.id));
      deletedCount++;
    }
    return deletedCount;
  } catch (err) {
    console.error('Failed to prune logs:', err);
    throw err;
  }
}
