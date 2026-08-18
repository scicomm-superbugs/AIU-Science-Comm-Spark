import { useState, useMemo } from 'react';
import { db, firestore, getCollectionName, useLiveCollection } from './db';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { 
  Sparkles, Search, Clock, CheckCircle2, Trash2, Check, X, Users, User,
  ChevronDown, ChevronUp, ShieldCheck, Key, UserCheck, Filter, ArrowRight
} from 'lucide-react';
import { FT_ROLE_COLORS, getUserRoleLabel } from './ftConstants';
import { logActivity } from './activityLogger';
import { useAuth } from './context/AuthContext';
import './scicommspark.css';

export default function FTRequestsPage() {
  const { user: authUser } = useAuth();
  const [toast, setToast] = useState(null);

  // Live collections
  const resetRequests = useLiveCollection('ft_reset_requests') || [];
  const teams = useLiveCollection('ft_teams') || [];
  const liveScientists = useLiveCollection('scientists') || [];

  const [requestsSearch, setRequestsSearch] = useState('');
  const [requestsFilter, setRequestsFilter] = useState('pending'); // Default to 'pending'
  const [showApprovedGroup, setShowApprovedGroup] = useState(false); // Collapsed by default

  // ── 1. New Account Registration & Approval Requests (From scientists) ───────
  const newAccountRequests = useMemo(() => {
    return (liveScientists || [])
      .filter(s => s.role !== 'master' && s.username !== 'admin' && s.username !== 'admin_sys_1')
      .map(s => {
        const isPending = s.accountStatus === 'pending' || s.status === 'pending' || s.isPendingApproval;
        return {
          id: `account_${s.id || s.username}`,
          reqType: 'new_account',
          userId: s.id || s.username,
          username: s.username || '',
          name: s.name || s.username || 'User',
          email: s.email || '',
          phone: s.phone || '',
          role: s.role || 'competitor',
          registeredTrack: s.registeredTrack || s.track || 'pop_science',
          participationMode: s.participationMode || 'team',
          nationalId: s.nationalId || '',
          institutionName: s.institutionName || (s.isAlameinStudent ? 'Alamein International University' : ''),
          isAlameinStudent: !!s.isAlameinStudent,
          universityId: s.universityId || '',
          title: s.title || '',
          department: s.department || '',
          avatar: s.avatarUrl || s.avatar,
          status: isPending ? 'pending' : 'approved',
          createdAt: s.createdAt || s.registeredAt || new Date().toISOString(),
          approvedAt: s.approvedAt,
          rawUser: s
        };
      });
  }, [liveScientists]);

  // ── 2. Team Name Change Requests (From ft_teams) ──────────────────────────
  const teamNameChangeRequests = useMemo(() => {
    return (teams || [])
      .filter(t => t.pendingNameChange && t.pendingNameChange.requestedName)
      .map(t => {
        const p = t.pendingNameChange;
        const leaderMember = (t.members || []).find(m => m.role === 'Team Leader') || (t.members || [])[0];
        return {
          id: `team_name_${t.id}`,
          reqType: 'team_name_change',
          teamId: t.id,
          teamCode: t.code || t.displayId || t.id,
          currentTeamName: t.name,
          requestedName: p.requestedName,
          requestedBy: p.requestedBy || leaderMember?.name || leaderMember?.username || 'Team Leader',
          requestedById: p.requestedById || leaderMember?.userId,
          reason: p.reason || '',
          requestedAt: p.requestedAt || t.updatedAt || new Date().toISOString(),
          status: p.status || 'pending',
          track: t.track || 'pop_science',
          members: t.members || [],
          rawTeam: t
        };
      });
  }, [teams]);

  // ── 3. Password Reset Requests (From ft_reset_requests) ──────────────────
  const passwordResetList = useMemo(() => {
    return (resetRequests || []).map(r => ({
      id: r.id,
      reqType: 'password_reset',
      username: r.username,
      email: r.email,
      status: r.status || 'pending',
      createdAt: r.createdAt || new Date().toISOString(),
      approvedAt: r.approvedAt,
      rawReq: r
    }));
  }, [resetRequests]);

  // Combined and sorted requests list
  const unifiedRequestsList = useMemo(() => {
    const list = [...newAccountRequests, ...teamNameChangeRequests, ...passwordResetList];
    return list.sort((a, b) => {
      // Pending requests come first
      if (a.status === 'pending' && b.status !== 'pending') return -1;
      if (a.status !== 'pending' && b.status === 'pending') return 1;
      // Then newer first
      const dateA = new Date(a.requestedAt || a.createdAt || 0).getTime();
      const dateB = new Date(b.requestedAt || b.createdAt || 0).getTime();
      return dateB - dateA;
    });
  }, [newAccountRequests, teamNameChangeRequests, passwordResetList]);

  // Pending count across all categories
  const pendingCount = useMemo(() => {
    return unifiedRequestsList.filter(r => r.status === 'pending').length;
  }, [unifiedRequestsList]);

  // Filtered requests based on active tab and search query
  const filteredRequests = useMemo(() => {
    let list = unifiedRequestsList;

    if (requestsFilter === 'pending') {
      list = list.filter(r => r.status === 'pending');
    } else if (requestsFilter === 'accounts') {
      list = list.filter(r => r.reqType === 'new_account');
    } else if (requestsFilter === 'teams') {
      list = list.filter(r => r.reqType === 'team_name_change');
    } else if (requestsFilter === 'resets') {
      list = list.filter(r => r.reqType === 'password_reset');
    } else if (requestsFilter === 'approved') {
      list = list.filter(r => r.status === 'approved');
    }

    if (requestsSearch.trim()) {
      const q = requestsSearch.toLowerCase().trim();
      list = list.filter(r => {
        const usernameMatch = r.username && r.username.toLowerCase().includes(q);
        const nameMatch = r.name && r.name.toLowerCase().includes(q);
        const emailMatch = r.email && r.email.toLowerCase().includes(q);
        const phoneMatch = r.phone && r.phone.toLowerCase().includes(q);
        const institutionMatch = r.institutionName && r.institutionName.toLowerCase().includes(q);
        const currentTeamMatch = r.currentTeamName && r.currentTeamName.toLowerCase().includes(q);
        const reqNameMatch = r.requestedName && r.requestedName.toLowerCase().includes(q);
        const reqByMatch = r.requestedBy && r.requestedBy.toLowerCase().includes(q);
        const trackMatch = r.track && r.track.toLowerCase().includes(q);
        const registeredTrackMatch = r.registeredTrack && r.registeredTrack.toLowerCase().includes(q);
        return usernameMatch || nameMatch || emailMatch || phoneMatch || institutionMatch || currentTeamMatch || reqNameMatch || reqByMatch || trackMatch || registeredTrackMatch;
      });
    }

    return list;
  }, [unifiedRequestsList, requestsFilter, requestsSearch]);

  // ── ACTION HANDLERS ──────────────────────────────────────────────────────

  // A. Approve New Account
  const handleApproveUser = async (userId, userDoc) => {
    try {
      await db.scientists.update(userId, {
        accountStatus: 'active',
        status: 'active',
        isPendingApproval: false,
        approvedAt: new Date().toISOString(),
        approvedBy: authUser?.username || authUser?.name || 'admin'
      });

      // Send welcome notification
      try {
        await db.ft_notifications.create({
          userId: userId,
          targetUserId: userId,
          type: 'registration_approved',
          title: 'Account Approved! 🎉',
          message: 'Welcome to AIU Science Communication Spark! Your account registration has been reviewed and approved by the administration. You now have full access to training modules, submissions, and competition features.',
          link: '/dashboard',
          status: 'unread',
          createdAt: new Date().toISOString()
        });
      } catch (e) {}

      logActivity({
        category: 'ADMIN_OPS',
        action: 'Approved User Account',
        details: `Admin approved account for @${userDoc?.username || userId} (${userDoc?.name || 'User'}).`,
        user: authUser || { role: 'admin', username: 'admin' }
      });

      setToast({ type: 'success', msg: `Account for @${userDoc?.username || userId} successfully approved and activated!` });
    } catch (err) {
      setToast({ type: 'error', msg: 'Failed to approve account: ' + err.message });
    }
    setTimeout(() => setToast(null), 3500);
  };

  // B. Reject New Account
  const handleRejectUser = async (userId, userDoc) => {
    if (!window.confirm(`Are you sure you want to reject and remove registration for @${userDoc?.username || userId}? This action cannot be undone.`)) return;
    try {
      await db.scientists.delete(userId);

      logActivity({
        category: 'ADMIN_OPS',
        action: 'Rejected User Registration',
        details: `Admin rejected and removed registration for @${userDoc?.username || userId}.`,
        user: authUser || { role: 'admin', username: 'admin' }
      });

      setToast({ type: 'info', msg: `Registration for @${userDoc?.username || userId} was rejected and removed.` });
    } catch (err) {
      setToast({ type: 'error', msg: 'Failed to reject registration: ' + err.message });
    }
    setTimeout(() => setToast(null), 3500);
  };

  // C. Approve Password Reset
  const handleApproveReset = async (reqId, req) => {
    try {
      await db.ft_reset_requests.update(reqId, {
        status: 'approved',
        approvedAt: new Date().toISOString(),
        approvedBy: authUser?.username || authUser?.name || 'admin'
      });

      let userDocId = null;
      if (req.username) {
        const uSnap = await getDocs(query(collection(firestore, getCollectionName('scientists')), where('username', '==', req.username)));
        if (!uSnap.empty) userDocId = uSnap.docs[0].id;
      }
      if (!userDocId && req.email) {
        const eSnap = await getDocs(query(collection(firestore, getCollectionName('scientists')), where('email', '==', req.email)));
        if (!eSnap.empty) userDocId = eSnap.docs[0].id;
      }

      if (userDocId) {
        await db.scientists.update(userDocId, {
          passwordResetApproved: true,
          passwordResetApprovedAt: new Date().toISOString()
        });

        try {
          await db.ft_notifications.create({
            userId: userDocId,
            type: 'password_reset_approved',
            title: 'Password Reset Approved 🔑',
            message: 'Your password reset request has been approved by an administrator. You can now reset your password on the login screen.',
            status: 'unread',
            targetUserId: userDocId,
            createdAt: new Date().toISOString(),
            link: '/'
          });
        } catch (e) {}
      }

      logActivity({
        category: 'ADMIN_OPS',
        action: 'Approved Password Reset',
        details: `Admin approved password reset request for @${req.username || 'user'}.`,
        user: authUser || { role: 'admin', username: 'admin' }
      });

      setToast({ type: 'success', msg: `Password reset approved for @${req.username || 'user'}! They can now set their new password from the login page.` });
    } catch (err) {
      setToast({ type: 'error', msg: 'Failed to approve reset request: ' + err.message });
    }
    setTimeout(() => setToast(null), 3500);
  };

  // D. Reject Password Reset
  const handleRejectReset = async (reqId) => {
    if (!window.confirm('Are you sure you want to reject and delete this password reset request?')) return;
    try {
      await db.ft_reset_requests.delete(reqId);
      setToast({ type: 'info', msg: 'Password reset request deleted.' });
    } catch (err) {
      setToast({ type: 'error', msg: 'Failed to delete request: ' + err.message });
    }
    setTimeout(() => setToast(null), 3500);
  };

  // E. Approve Team Name Change
  const handleApproveTeamNameChange = async (reqItem) => {
    try {
      const team = reqItem.rawTeam;
      if (!team) throw new Error('Team record not found.');

      const newName = reqItem.requestedName;
      const oldName = reqItem.currentTeamName;

      await db.ft_teams.update(team.id, {
        name: newName,
        pendingNameChange: null,
        updatedAt: new Date().toISOString()
      });

      if (team.members && team.members.length > 0) {
        for (const m of team.members) {
          const userDocId = m.userId || m.username;
          if (userDocId) {
            try {
              await db.scientists.update(userDocId, {
                teamName: newName,
                updatedAt: new Date().toISOString()
              });
            } catch (uErr) {}

            try {
              await db.ft_notifications.create({
                userId: m.userId,
                targetUserId: m.userId,
                type: 'team',
                title: 'Team Name Change Approved! 🎉',
                message: `Your team name has been officially changed from "${oldName}" to "${newName}". All points and submissions remain 100% preserved.`,
                link: '/dashboard/our-team',
                status: 'unread',
                createdAt: new Date().toISOString()
              });
            } catch (nErr) {}
          }
        }
      }

      logActivity({
        category: 'TEAMS',
        action: 'Approved Team Name Change',
        details: `Admin approved renaming team "${oldName}" to "${newName}". Points and records fully preserved.`,
        user: authUser || { role: 'admin', username: 'admin' }
      });

      setToast({ type: 'success', msg: `Team "${oldName}" has been successfully renamed to "${newName}"!` });
    } catch (err) {
      alert('Failed to approve team name: ' + err.message);
    }
    setTimeout(() => setToast(null), 3500);
  };

  // F. Reject Team Name Change
  const handleRejectTeamNameChange = async (reqItem) => {
    const reason = window.prompt('Optional: Enter a brief reason for refusing the name change proposal:');
    try {
      const team = reqItem.rawTeam;
      if (!team) throw new Error('Team record not found.');

      await db.ft_teams.update(team.id, {
        pendingNameChange: null,
        updatedAt: new Date().toISOString()
      });

      for (const m of team.members || []) {
        try {
          await db.ft_notifications.create({
            userId: m.userId,
            targetUserId: m.userId,
            type: 'team',
            title: 'Team Name Change Declined ❌',
            message: `Admin declined the request to rename your team to "${reqItem.requestedName}". ${reason ? `Reason: "${reason}"` : ''}`,
            link: '/dashboard/our-team',
            status: 'unread',
            createdAt: new Date().toISOString()
          });
        } catch (nErr) {}
      }

      logActivity({
        category: 'TEAMS',
        action: 'Rejected Team Name Change',
        details: `Admin rejected renaming team "${team.name}" to "${reqItem.requestedName}". Reason: ${reason || 'None'}.`,
        user: authUser || { role: 'admin', username: 'admin' }
      });

      setToast({ type: 'info', msg: `Team name change request for "${team.name}" refused.` });
    } catch (err) {
      alert('Failed to refuse team name: ' + err.message);
    }
    setTimeout(() => setToast(null), 3500);
  };

  // ── REUSABLE RENDERER FOR REQUEST CARDS ──────────────────────────────────
  const renderRequestCard = (item) => {
    // ── A. RENDER NEW ACCOUNT REGISTRATION & APPROVAL CARD ──
    if (item.reqType === 'new_account') {
      const isApproved = item.status === 'approved';
      const roleColor = FT_ROLE_COLORS[item.role] || '#2563eb';
      const trackLabel = item.registeredTrack === 'science_journalism' ? 'Track 2: Science Journalism' : 'Track 1: Pop Science';

      return (
        <div
          key={item.id}
          style={{
            padding: '1.25rem 1.5rem',
            borderRadius: '16px',
            background: isApproved ? '#f0fdf4' : '#fffbeb',
            border: isApproved ? '1.5px solid #86efac' : '2px solid #fde68a',
            boxShadow: '0 4px 14px rgba(0,0,0,0.03)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1.25rem'
          }}
        >
          {/* Left: User details */}
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', flex: 1, minWidth: '280px' }}>
            <img
              src={item.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${item.username || 'user'}`}
              alt={item.name}
              style={{
                width: '52px', height: '52px', borderRadius: '50%',
                objectFit: 'cover', border: `2px solid ${isApproved ? '#16a34a' : roleColor}`,
                flexShrink: 0, background: '#f1f5f9'
              }}
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 900, fontSize: '1.05rem', color: '#0f172a' }}>
                  {item.name}
                </span>
                <span style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 600 }}>
                  @{item.username}
                </span>
                <span style={{
                  fontSize: '0.72rem', fontWeight: 800, padding: '0.15rem 0.55rem', borderRadius: '6px',
                  background: '#e0f2fe', color: '#0369a1', border: '1px solid #bae6fd'
                }}>
                  👤 New Account
                </span>
                <span style={{
                  fontSize: '0.72rem', fontWeight: 800, padding: '0.15rem 0.55rem', borderRadius: '6px',
                  background: `${roleColor}18`, color: roleColor, border: `1px solid ${roleColor}40`
                }}>
                  {getUserRoleLabel({ role: item.role })}
                </span>
                <span
                  style={{
                    fontSize: '0.72rem', fontWeight: 800, padding: '0.15rem 0.6rem', borderRadius: '9999px',
                    background: isApproved ? '#dcfce7' : '#fef3c7', color: isApproved ? '#15803d' : '#d97706',
                    border: `1px solid ${isApproved ? '#86efac' : '#fde68a'}`
                  }}
                >
                  {isApproved ? 'Active / Approved ✅' : 'Pending Review ⏳'}
                </span>
              </div>

              <div style={{ fontSize: '0.84rem', color: '#475569', fontWeight: 500, display: 'flex', flexWrap: 'wrap', gap: '0.5rem 1rem' }}>
                <span>📧 <strong>{item.email || 'No email'}</strong></span>
                {item.phone && <span>📱 {item.phone}</span>}
                <span>🎯 Track: <strong>{trackLabel}</strong></span>
                <span>👥 Mode: <strong>{item.participationMode === 'team' ? 'Team Mode' : 'Solo Competitor'}</strong></span>
                {item.institutionName && <span>🏛️ {item.institutionName}</span>}
                {item.universityId && <span>🎓 ID: {item.universityId}</span>}
                {item.nationalId && <span>🪪 NID: {item.nationalId}</span>}
              </div>

              <div style={{ fontSize: '0.74rem', color: '#94a3b8', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.15rem' }}>
                <Clock size={13} /> Registered: {item.createdAt ? new Date(item.createdAt).toLocaleString() : 'Recently'}
                {isApproved && item.approvedAt && (
                  <span style={{ color: '#16a34a', marginLeft: '0.5rem' }}>
                    • Approved: {new Date(item.approvedAt).toLocaleString()}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right: Action Buttons */}
          <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'center', flexShrink: 0 }}>
            {!isApproved ? (
              <>
                <button
                  type="button"
                  onClick={() => handleApproveUser(item.userId, item.rawUser)}
                  className="ft-btn"
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.55rem 1.15rem',
                    background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)', color: '#ffffff',
                    border: 'none', borderRadius: '10px', fontWeight: 900, fontSize: '0.84rem',
                    cursor: 'pointer', boxShadow: '0 4px 14px rgba(22, 163, 74, 0.25)'
                  }}
                >
                  <Check size={16} /> Approve Account
                </button>
                <button
                  type="button"
                  onClick={() => handleRejectUser(item.userId, item.rawUser)}
                  className="ft-btn"
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.55rem 0.95rem',
                    background: '#ffffff', border: '1.5px solid #fca5a5', color: '#dc2626',
                    borderRadius: '10px', fontWeight: 800, fontSize: '0.84rem', cursor: 'pointer'
                  }}
                >
                  <Trash2 size={15} /> Reject
                </button>
              </>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#16a34a', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                  <CheckCircle2 size={16} /> Active Account
                </span>
              </div>
            )}
          </div>
        </div>
      );
    }

    // ── B. RENDER TEAM NAME CHANGE REQUEST CARD ──
    if (item.reqType === 'team_name_change') {
      const isApproved = item.status === 'approved';
      const trackName = item.track === 'pop_science' ? 'Track 1: Pop Science' : 'Track 2: Science Journalism';

      return (
        <div
          key={item.id}
          style={{
            padding: '1.35rem 1.5rem',
            borderRadius: '16px',
            background: isApproved ? '#f0fdf4' : '#fffbeb',
            border: isApproved ? '1.5px solid #86efac' : '2px solid #fde68a',
            boxShadow: '0 4px 14px rgba(0,0,0,0.03)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1.25rem'
          }}
        >
          {/* Left: Team Info & Proposed Name Box */}
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', flex: 1, minWidth: '280px' }}>
            <div style={{
              width: '52px', height: '52px', borderRadius: '14px',
              background: isApproved ? '#dcfce7' : '#fef3c7',
              border: isApproved ? '2px solid #86efac' : '2px solid #fde68a',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: isApproved ? '#16a34a' : '#b45309', flexShrink: 0
            }}>
              <Users size={26} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 900, fontSize: '1.1rem', color: '#0f172a' }}>
                  👥 Team: {item.currentTeamName}
                </span>
                <span style={{
                  fontSize: '0.74rem', fontWeight: 800, padding: '0.15rem 0.55rem', borderRadius: '6px',
                  background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe'
                }}>
                  ID: {item.teamCode}
                </span>
                <span style={{
                  fontSize: '0.74rem', fontWeight: 800, padding: '0.15rem 0.55rem', borderRadius: '6px',
                  background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1'
                }}>
                  {trackName}
                </span>
                <span style={{
                  fontSize: '0.72rem', fontWeight: 800, padding: '0.15rem 0.6rem', borderRadius: '9999px',
                  background: isApproved ? '#dcfce7' : '#fef3c7', color: isApproved ? '#15803d' : '#d97706',
                  border: `1px solid ${isApproved ? '#86efac' : '#fde68a'}`
                }}>
                  {isApproved ? 'Approved ✅' : 'Pending Name Change ⏳'}
                </span>
              </div>

              {/* Proposed Name Highlight Banner */}
              <div style={{
                background: '#ffffff', border: '1.5px solid #fde68a', borderRadius: '12px',
                padding: '0.75rem 1rem', marginTop: '0.25rem', display: 'flex', flexDirection: 'column', gap: '0.25rem'
              }}>
                <div style={{ fontSize: '0.92rem', color: '#0f172a', fontWeight: 700 }}>
                  ⚡ Requested New Name: <strong style={{ color: '#b45309', fontSize: '1.05rem', background: '#fef3c7', padding: '0.15rem 0.6rem', borderRadius: '8px' }}>"{item.requestedName}"</strong>
                </div>
                <div style={{ fontSize: '0.82rem', color: '#475569', fontWeight: 500 }}>
                  👤 Requested by: <strong>{item.requestedBy}</strong> · Members: {item.members?.length || 1}/3
                </div>
                {item.reason && (
                  <div style={{ fontSize: '0.82rem', color: '#78350f', fontStyle: 'italic', background: '#fffbeb', padding: '0.35rem 0.6rem', borderRadius: '6px' }}>
                    📝 Note from Leader: "{item.reason}"
                  </div>
                )}
                <div style={{ fontSize: '0.74rem', color: '#059669', fontWeight: 700, marginTop: '0.15rem' }}>
                  🛡️ Guaranteed: Points, leaderboard rank, submitted files, and team member records will NOT be modified.
                </div>
              </div>

              <div style={{ fontSize: '0.74rem', color: '#94a3b8', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.2rem' }}>
                <Clock size={13} /> Requested: {item.requestedAt ? new Date(item.requestedAt).toLocaleString() : 'Recently'}
              </div>
            </div>
          </div>

          {/* Right: Actions */}
          <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'center', flexShrink: 0 }}>
            <button
              type="button"
              onClick={() => handleApproveTeamNameChange(item)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.6rem 1.15rem',
                background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)', color: '#ffffff',
                border: 'none', borderRadius: '10px', fontWeight: 900, fontSize: '0.84rem', cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(22, 163, 74, 0.25)'
              }}
            >
              <Check size={16} /> Approve Name
            </button>
            <button
              type="button"
              onClick={() => handleRejectTeamNameChange(item)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.6rem 1rem',
                background: '#ffffff', border: '1.5px solid #fca5a5', color: '#dc2626',
                borderRadius: '10px', fontWeight: 800, fontSize: '0.84rem', cursor: 'pointer'
              }}
            >
              <X size={16} /> Refuse
            </button>
          </div>
        </div>
      );
    }

    // ── C. RENDER PASSWORD RESET REQUEST CARD ──
    const req = item.rawReq || item;
    const isApproved = req.status === 'approved';

    return (
      <div
        key={req.id}
        style={{
          padding: '1.25rem 1.5rem',
          borderRadius: '16px',
          background: isApproved ? '#f0fdf4' : '#ffffff',
          border: isApproved ? '1.5px solid #86efac' : '1.5px solid #cbd5e1',
          boxShadow: '0 4px 14px rgba(0,0,0,0.03)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1.25rem'
        }}
      >
        {/* Left: User & Request info */}
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', flex: 1, minWidth: '280px' }}>
          <div style={{
            width: '52px', height: '52px', borderRadius: '50%',
            background: isApproved ? '#dcfce7' : '#f3e8ff',
            border: isApproved ? '2px solid #16a34a' : '2px solid #7c3aed',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: isApproved ? '#16a34a' : '#7c3aed', flexShrink: 0
          }}>
            <Key size={24} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 900, fontSize: '1.05rem', color: '#0f172a' }}>
                {req.username}
              </span>
              <span style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 600 }}>
                @{req.username}
              </span>
              <span style={{
                fontSize: '0.72rem', fontWeight: 800, padding: '0.15rem 0.55rem', borderRadius: '6px',
                background: '#f3e8ff', color: '#7c3aed', border: '1px solid #d8b4fe'
              }}>
                🔑 Password Reset
              </span>
              <span
                style={{
                  fontSize: '0.72rem', fontWeight: 800, padding: '0.15rem 0.6rem', borderRadius: '9999px',
                  background: isApproved ? '#dcfce7' : '#fef3c7', color: isApproved ? '#15803d' : '#d97706',
                  border: `1px solid ${isApproved ? '#86efac' : '#fde68a'}`
                }}
              >
                {isApproved ? 'Approved ✅' : 'Pending Approval ⏳'}
              </span>
            </div>

            <div style={{ fontSize: '0.84rem', color: '#475569', fontWeight: 500 }}>
              📧 <strong>{req.email}</strong>
            </div>

            <div style={{ fontSize: '0.74rem', color: '#94a3b8', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Clock size={13} /> Requested: {req.createdAt ? new Date(req.createdAt).toLocaleString() : 'Recently'}
              {isApproved && req.approvedAt && (
                <span style={{ color: '#16a34a', marginLeft: '0.5rem' }}>
                  • Approved: {new Date(req.approvedAt).toLocaleString()}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'center', flexShrink: 0 }}>
          {!isApproved ? (
            <>
              <button
                type="button"
                onClick={() => handleApproveReset(req.id, req)}
                className="ft-btn"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.55rem 1.1rem',
                  background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)', color: '#ffffff',
                  border: 'none', borderRadius: '10px', fontWeight: 800, fontSize: '0.84rem',
                  cursor: 'pointer', boxShadow: '0 4px 14px rgba(22, 163, 74, 0.25)'
                }}
              >
                <CheckCircle2 size={16} /> Approve Reset
              </button>
              <button
                type="button"
                onClick={() => handleRejectReset(req.id)}
                className="ft-btn"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.55rem 0.95rem',
                  background: '#ffffff', border: '1.5px solid #fca5a5', color: '#dc2626',
                  borderRadius: '10px', fontWeight: 800, fontSize: '0.84rem', cursor: 'pointer'
                }}
              >
                <Trash2 size={15} /> Reject
              </button>
            </>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#16a34a', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                <CheckCircle2 size={16} /> Ready for User to Reset
              </span>
              <button
                type="button"
                onClick={() => handleRejectReset(req.id)}
                title="Delete/Dismiss approved reset token"
                style={{
                  background: '#ffffff', border: '1.5px solid #cbd5e1', color: '#64748b',
                  borderRadius: '8px', padding: '0.4rem 0.6rem', cursor: 'pointer',
                  fontSize: '0.78rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.3rem'
                }}
              >
                <Trash2 size={14} /> Remove
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="ft-animate-in">
      <div className="ft-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.75rem' }}>
        <div>
          <h1 className="ft-page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <Sparkles size={28} style={{ color: '#be123c' }} /> Requests & Approvals Center
          </h1>
          <p className="ft-page-subtitle">
            Centralized admin hub to review and approve new user account registrations, team name changes, and password reset requests.
          </p>
        </div>

        {/* Quick Pending Badge */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '0.6rem', padding: '0.55rem 1.15rem',
          background: pendingCount > 0 ? '#fef3c7' : '#f0fdf4',
          border: `1.5px solid ${pendingCount > 0 ? '#fde68a' : '#86efac'}`,
          borderRadius: '12px', color: pendingCount > 0 ? '#b45309' : '#15803d',
          fontWeight: 800, fontSize: '0.9rem'
        }}>
          {pendingCount > 0 ? (
            <>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#d97706', boxShadow: '0 0 10px #d97706' }} />
              <span>{pendingCount} Pending Action Required</span>
            </>
          ) : (
            <>
              <CheckCircle2 size={18} style={{ color: '#16a34a' }} />
              <span>All Caught Up (0 Pending)</span>
            </>
          )}
        </div>
      </div>

      {toast && (
        <div style={{
          padding: '0.8rem 1rem', borderRadius: '8px', marginBottom: '1.5rem', fontWeight: 600, fontSize: '0.9rem',
          background: toast.type === 'success' ? 'var(--ft-success-bg)' : toast.type === 'info' ? '#eff6ff' : 'rgba(239,68,68,0.15)',
          color: toast.type === 'success' ? 'var(--ft-success)' : toast.type === 'info' ? '#1d4ed8' : '#f87171',
          border: `1px solid ${toast.type === 'success' ? '#86efac' : toast.type === 'info' ? '#bfdbfe' : '#fca5a5'}`
        }}>
          {toast.msg}
        </div>
      )}

      {/* Main Card Container */}
      <div className="ft-card" style={{
        padding: '2rem', marginBottom: '2rem',
        border: pendingCount > 0 ? '2px solid #3b82f6' : '1.5px solid #e2e8f0',
        background: '#ffffff',
        boxShadow: pendingCount > 0 ? '0 8px 30px rgba(59, 130, 246, 0.08)' : '0 2px 10px rgba(0,0,0,0.02)'
      }}>
        {/* Navigation / Filter Tabs */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', gap: '0.45rem', background: '#f1f5f9', padding: '0.35rem', borderRadius: '14px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setRequestsFilter('pending')}
              style={{
                background: requestsFilter === 'pending' ? '#ffffff' : 'transparent',
                color: requestsFilter === 'pending' ? '#d97706' : '#64748b',
                fontWeight: 800, fontSize: '0.82rem', padding: '0.45rem 0.9rem',
                borderRadius: '9px', border: 'none', cursor: 'pointer',
                boxShadow: requestsFilter === 'pending' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                display: 'inline-flex', alignItems: 'center', gap: '0.35rem'
              }}
            >
              <span>Pending ⏳</span>
              <span style={{
                fontSize: '0.72rem', padding: '0.1rem 0.45rem', borderRadius: '9999px',
                background: pendingCount > 0 ? '#fef3c7' : '#e2e8f0',
                color: pendingCount > 0 ? '#b45309' : '#64748b'
              }}>
                {pendingCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setRequestsFilter('all')}
              style={{
                background: requestsFilter === 'all' ? '#ffffff' : 'transparent',
                color: requestsFilter === 'all' ? '#0f172a' : '#64748b',
                fontWeight: 800, fontSize: '0.82rem', padding: '0.45rem 0.9rem',
                borderRadius: '9px', border: 'none', cursor: 'pointer',
                boxShadow: requestsFilter === 'all' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none'
              }}
            >
              All ({unifiedRequestsList.length})
            </button>

            <button
              type="button"
              onClick={() => setRequestsFilter('accounts')}
              style={{
                background: requestsFilter === 'accounts' ? '#ffffff' : 'transparent',
                color: requestsFilter === 'accounts' ? '#0284c7' : '#64748b',
                fontWeight: 800, fontSize: '0.82rem', padding: '0.45rem 0.9rem',
                borderRadius: '9px', border: 'none', cursor: 'pointer',
                boxShadow: requestsFilter === 'accounts' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none'
              }}
            >
              👤 New Accounts ({newAccountRequests.length})
            </button>

            <button
              type="button"
              onClick={() => setRequestsFilter('teams')}
              style={{
                background: requestsFilter === 'teams' ? '#ffffff' : 'transparent',
                color: requestsFilter === 'teams' ? '#2563eb' : '#64748b',
                fontWeight: 800, fontSize: '0.82rem', padding: '0.45rem 0.9rem',
                borderRadius: '9px', border: 'none', cursor: 'pointer',
                boxShadow: requestsFilter === 'teams' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none'
              }}
            >
              👥 Team Name Changes ({teamNameChangeRequests.length})
            </button>

            <button
              type="button"
              onClick={() => setRequestsFilter('resets')}
              style={{
                background: requestsFilter === 'resets' ? '#ffffff' : 'transparent',
                color: requestsFilter === 'resets' ? '#7c3aed' : '#64748b',
                fontWeight: 800, fontSize: '0.82rem', padding: '0.45rem 0.9rem',
                borderRadius: '9px', border: 'none', cursor: 'pointer',
                boxShadow: requestsFilter === 'resets' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none'
              }}
            >
              🔑 Password Resets ({passwordResetList.length})
            </button>

            <button
              type="button"
              onClick={() => setRequestsFilter('approved')}
              style={{
                background: requestsFilter === 'approved' ? '#ffffff' : 'transparent',
                color: requestsFilter === 'approved' ? '#16a34a' : '#64748b',
                fontWeight: 800, fontSize: '0.82rem', padding: '0.45rem 0.9rem',
                borderRadius: '9px', border: 'none', cursor: 'pointer',
                boxShadow: requestsFilter === 'approved' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none'
              }}
            >
              Approved ✅ ({unifiedRequestsList.filter(r => r.status === 'approved').length})
            </button>
          </div>
        </div>

        {/* Global Search Bar */}
        <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
          <Search size={18} style={{ position: 'absolute', left: 14, top: 12, color: '#94a3b8' }} />
          <input
            type="text"
            className="ft-input"
            style={{ paddingLeft: '2.5rem', background: '#f8fafc', border: '1px solid #cbd5e1', color: '#0f172a', fontWeight: 600 }}
            placeholder="Search all requests by name, username, email, phone, institution, university ID, national ID, team name, or track..."
            value={requestsSearch}
            onChange={e => setRequestsSearch(e.target.value)}
          />
        </div>

        {/* Requests Cards List */}
        {filteredRequests.length === 0 ? (
          <div style={{ padding: '3rem 1.5rem', textAlign: 'center', background: '#f8fafc', borderRadius: '16px', border: '1.5px dashed #cbd5e1', color: '#64748b' }}>
            <Sparkles size={40} style={{ color: '#94a3b8', margin: '0 auto 0.75rem auto' }} />
            <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#334155' }}>
              {requestsSearch ? 'No requests match your search.' : 'No requests currently in this view.'}
            </div>
            <div style={{ fontSize: '0.88rem', marginTop: '0.35rem', color: '#64748b' }}>
              New account registrations, team name changes, and password reset requests will appear here for one-click admin review.
            </div>
          </div>
        ) : requestsFilter === 'approved' ? (
          /* Explicit Approved Tab: Render all approved items */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {filteredRequests.map(item => renderRequestCard(item))}
          </div>
        ) : (
          /* Pending / All / Category Tabs: Prominently show Pending, and Collapse Approved */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {(() => {
              const pendingItems = filteredRequests.filter(item => item.status === 'pending');
              const approvedItems = filteredRequests.filter(item => item.status === 'approved');

              return (
                <>
                  {/* 1. Pending Section (Always Expanded & Front/Center) */}
                  {pendingItems.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 0.2rem' }}>
                        <span style={{ fontSize: '0.9rem', fontWeight: 900, color: '#b45309', display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}>
                          <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#d97706', boxShadow: '0 0 8px #d97706' }} />
                          Action Required ({pendingItems.length} Pending Review)
                        </span>
                      </div>
                      {pendingItems.map(item => renderRequestCard(item))}
                    </div>
                  ) : (
                    <div style={{
                      padding: '1.25rem 1.5rem', background: '#f0fdf4', border: '1.5px solid #86efac',
                      borderRadius: '14px', display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#166534'
                    }}>
                      <CheckCircle2 size={22} style={{ color: '#16a34a', flexShrink: 0 }} />
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '0.92rem' }}>
                          All caught up! No pending requests in this section.
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#15803d', marginTop: '0.15rem' }}>
                          Any new registrations, team name change proposals, or password resets will immediately appear here.
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 2. Approved / Handled Section (Collapsible Accordion) */}
                  {approvedItems.length > 0 && (
                    <div style={{ marginTop: '0.5rem' }}>
                      <button
                        type="button"
                        onClick={() => setShowApprovedGroup(prev => !prev)}
                        style={{
                          width: '100%',
                          padding: '0.85rem 1.25rem',
                          background: '#f8fafc',
                          border: '1.5px solid #cbd5e1',
                          borderRadius: '14px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          cursor: 'pointer',
                          fontWeight: 800,
                          fontSize: '0.88rem',
                          color: '#334155',
                          boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                          <CheckCircle2 size={18} style={{ color: '#16a34a' }} />
                          <span>Approved & Completed Records ({approvedItems.length})</span>
                          <span style={{
                            fontSize: '0.72rem', fontWeight: 800,
                            background: showApprovedGroup ? '#e0f2fe' : '#dcfce7',
                            color: showApprovedGroup ? '#0369a1' : '#15803d',
                            padding: '0.15rem 0.55rem', borderRadius: '9999px'
                          }}>
                            {showApprovedGroup ? 'Expanded ▾' : 'Collapsed ▸'}
                          </span>
                        </span>

                        <span style={{ fontSize: '0.82rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 700 }}>
                          {showApprovedGroup ? (
                            <><span>Hide Approved Records</span> <ChevronUp size={16} /></>
                          ) : (
                            <><span>Show Approved Records</span> <ChevronDown size={16} /></>
                          )}
                        </span>
                      </button>

                      {showApprovedGroup && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginTop: '1rem' }}>
                          {approvedItems.map(item => renderRequestCard(item))}
                        </div>
                      )}
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
}
