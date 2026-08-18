import { useState, useEffect, useMemo } from 'react';
import { db, firestore, getCollectionName, useLiveCollection } from './db';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { 
  Settings, Save, Search, UserCheck, Plus, Trash2, Award, Key, 
  CheckCircle2, ShieldCheck, Clock, Lock, Users, Edit3, X, Sparkles, Check 
} from 'lucide-react';
import { DEFAULT_JUDGING_CRITERIA, FT_DEPARTMENTS, FT_ROLE_LABELS, getUserRoleLabel } from './ftConstants';
import { logActivity } from './activityLogger';
import { useAuth } from './context/AuthContext';
import WorkshopManager from './WorkshopManager';
import './scicommspark.css';

export default function FTAdminSettings() {
  const { user: authUser } = useAuth();
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [allowSelfRegister, setAllowSelfRegister] = useState(true);

  // Judging Criteria state
  const [criteria, setCriteria] = useState(DEFAULT_JUDGING_CRITERIA);
  const [newCritName, setNewCritName] = useState('');
  const [newCritPoints, setNewCritPoints] = useState(25);
  const [newCritCategory, setNewCritCategory] = useState('academic');
  const [newCritStage, setNewCritStage] = useState('all');

  const [users, setUsers] = useState([]);
  const [userSearch, setUserSearch] = useState('');

  const resetRequests = useLiveCollection('ft_reset_requests') || [];
  const teams = useLiveCollection('ft_teams') || [];
  const customTracks = useLiveCollection('ft_tracks') || [];

  const [requestsSearch, setRequestsSearch] = useState('');
  const [requestsFilter, setRequestsFilter] = useState('all'); // 'all' | 'pending' | 'teams' | 'resets' | 'approved'

  // Competition Tracks State
  const [newTrackTitle, setNewTrackTitle] = useState('');
  const [newTrackIcon, setNewTrackIcon] = useState('🎥');
  const [newTrackDesc, setNewTrackDesc] = useState('');
  const [editingTrackId, setEditingTrackId] = useState(null);

  const handleSaveTrack = async (e) => {
    e.preventDefault();
    if (!newTrackTitle.trim()) {
      alert('Please enter a track title');
      return;
    }

    try {
      const trackData = {
        id: editingTrackId ? editingTrackId : newTrackTitle.toLowerCase().replace(/[^a-z0-9]/g, '_'),
        name: newTrackTitle.trim(),
        icon: newTrackIcon || '🏆',
        description: newTrackDesc.trim(),
        updatedAt: new Date().toISOString()
      };

      if (editingTrackId) {
        await db.ft_tracks.update(editingTrackId, trackData);
        setToast({ type: 'success', msg: 'Track updated successfully!' });
      } else {
        await db.ft_tracks.add(trackData);
        setToast({ type: 'success', msg: 'New competition track added successfully!' });
      }

      setNewTrackTitle('');
      setNewTrackIcon('🎥');
      setNewTrackDesc('');
      setEditingTrackId(null);
    } catch (err) {
      alert('Error saving track: ' + err.message);
    }
  };

  const handleEditTrack = (track) => {
    setEditingTrackId(track.id);
    setNewTrackTitle(track.name || '');
    setNewTrackIcon(track.icon || '🎥');
    setNewTrackDesc(track.description || '');
  };

  const handleDeleteTrack = async (trackId) => {
    if (!window.confirm('Are you sure you want to delete this track?')) return;
    try {
      await db.ft_tracks.delete(trackId);
      setToast({ type: 'success', msg: 'Track deleted.' });
    } catch (err) {
      alert('Error deleting track: ' + err.message);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const settings = await db.ft_settings.get();
        if (settings) {
          setAllowSelfRegister(settings.allowSelfRegister !== false);
          if (settings.judgingCriteria && settings.judgingCriteria.length > 0) {
            setCriteria(settings.judgingCriteria);
          }
        }

        const col = getCollectionName('scientists');
        const snap = await getDocs(collection(firestore, col));
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setUsers(list);
      } catch (err) {
        console.error("Failed to load settings/users:", err);
      }
      setLoaded(true);
    })();
  }, []);

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      await db.ft_settings.set({
        allowSelfRegister,
        judgingCriteria: criteria,
        updatedAt: new Date().toISOString(),
      });
      setToast({ type: 'success', msg: 'Competition settings & criteria saved!' });
    } catch (err) {
      setToast({ type: 'error', msg: 'Failed to save: ' + err.message });
    }
    setSaving(false);
    setTimeout(() => setToast(null), 3000);
  };

  const handleAddCriteria = async () => {
    if (!newCritName.trim()) return;
    const newCrit = {
      id: 'crit_' + Date.now(),
      name: newCritName.trim(),
      category: newCritCategory,
      stageId: newCritStage === 'all' ? 'all' : Number(newCritStage),
      maxPoints: Number(newCritPoints) || 25,
      description: `${newCritCategory === 'academic' ? 'Academic' : 'SciComm'} evaluation criterion`
    };
    const updated = [...criteria, newCrit];
    setCriteria(updated);
    setNewCritName('');
    await saveCriteria(updated);
  };

  const handleDeleteCriteria = async (id) => {
    const updated = criteria.filter(c => c.id !== id);
    setCriteria(updated);
    await saveCriteria(updated);
  };

  const handleUpdateUserRole = async (userId, newRole) => {
    try {
      await db.scientists.update(userId, { role: newRole });
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
      setToast({ type: 'success', msg: `User role updated to ${FT_ROLE_LABELS[newRole] || newRole}` });
    } catch (err) {
      setToast({ type: 'error', msg: 'Failed to update role: ' + err.message });
    }
    setTimeout(() => setToast(null), 3000);
  };

  const handleApproveUser = async (userId) => {
    try {
      await db.scientists.update(userId, { accountStatus: 'active' });
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, accountStatus: 'active' } : u));
      setToast({ type: 'success', msg: 'Account approved successfully!' });
    } catch (err) {
      setToast({ type: 'error', msg: 'Approval failed: ' + err.message });
    }
    setTimeout(() => setToast(null), 3000);
  };

  const handleRejectUser = async (userId) => {
    if (!window.confirm("Are you sure you want to reject and delete this registration?")) return;
    try {
      await db.scientists.delete(userId);
      setUsers(prev => prev.filter(u => u.id !== userId));
      setToast({ type: 'success', msg: 'Registration rejected and deleted.' });
    } catch (err) {
      setToast({ type: 'error', msg: 'Rejection failed: ' + err.message });
    }
    setTimeout(() => setToast(null), 3000);
  };

  const handleApproveReset = async (reqId, req) => {
    try {
      await db.ft_reset_requests.update(reqId, {
        status: 'approved',
        approvedAt: new Date().toISOString()
      });

      if (req?.username || req?.email) {
        const usersCol = getCollectionName('scientists');
        const q = query(collection(firestore, usersCol), where('username', '==', req.username || ''));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const userDocId = snap.docs[0].id;
          await db.ft_notifications.add({
            title: 'Password Reset Approved 🔑',
            message: `Your password reset request has been approved! You can now reset your password from the sign-in page.`,
            type: 'password_reset_approved',
            status: 'unread',
            targetRoles: ['competitor', 'user', 'judge', 'trainer'],
            targetUserId: userDocId,
            createdAt: new Date().toISOString(),
            link: '/'
          }).catch(() => {});
        }
      }

      setToast({ type: 'success', msg: `Password reset approved for @${req.username || 'user'}! They can now set their new password from the login page.` });
    } catch (err) {
      setToast({ type: 'error', msg: 'Failed to approve reset request: ' + err.message });
    }
    setTimeout(() => setToast(null), 3500);
  };

  const handleRejectReset = async (reqId) => {
    if (!window.confirm('Are you sure you want to reject and delete this password reset request?')) return;
    try {
      await db.ft_reset_requests.delete(reqId);
      setToast({ type: 'success', msg: 'Password reset request deleted.' });
    } catch (err) {
      setToast({ type: 'error', msg: 'Failed to delete request: ' + err.message });
    }
    setTimeout(() => setToast(null), 3500);
  };

  const pendingJudges = (users || []).filter(u => (u.role === 'judge' || u.role === 'trainer_judge') && u.accountStatus === 'pending');
  const allJudgesAndTrainers = (users || []).filter(u => u.role === 'judge' || u.role === 'trainer' || u.role === 'trainer_judge');

  // ── 1. Team Name Change Requests (From ft_teams) ──────────────────────────
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

  // ── 2. Password Reset Requests (From ft_reset_requests) ──────────────────
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
    const list = [...teamNameChangeRequests, ...passwordResetList];
    return list.sort((a, b) => {
      const timeA = new Date(a.requestedAt || a.createdAt || 0).getTime();
      const timeB = new Date(b.requestedAt || b.createdAt || 0).getTime();
      return timeB - timeA;
    });
  }, [teamNameChangeRequests, passwordResetList]);

  const pendingCount = useMemo(() => {
    return unifiedRequestsList.filter(r => r.status !== 'approved').length;
  }, [unifiedRequestsList]);

  // Filtered requests by Tab and Search query
  const filteredRequests = useMemo(() => {
    return unifiedRequestsList.filter(item => {
      if (requestsFilter === 'pending') return item.status !== 'approved';
      if (requestsFilter === 'approved') return item.status === 'approved';
      if (requestsFilter === 'teams') return item.reqType === 'team_name_change';
      if (requestsFilter === 'resets') return item.reqType === 'password_reset';
      return true; // 'all'
    }).filter(item => {
      if (!requestsSearch.trim()) return true;
      const q = requestsSearch.toLowerCase();
      if (item.reqType === 'team_name_change') {
        return (
          (item.currentTeamName && item.currentTeamName.toLowerCase().includes(q)) ||
          (item.requestedName && item.requestedName.toLowerCase().includes(q)) ||
          (item.requestedBy && item.requestedBy.toLowerCase().includes(q)) ||
          (item.teamCode && item.teamCode.toLowerCase().includes(q)) ||
          (item.reason && item.reason.toLowerCase().includes(q))
        );
      }
      return (
        (item.username && item.username.toLowerCase().includes(q)) ||
        (item.email && item.email.toLowerCase().includes(q))
      );
    });
  }, [unifiedRequestsList, requestsFilter, requestsSearch]);

  if (!loaded) {
    return <div style={{ padding: '3rem', textAlign: 'center' }}>Loading competition settings...</div>;
  }

  // ── ADMIN APPROVE TEAM NAME CHANGE (PRESERVES 100% OF POINTS & RECORDS) ──
  const handleApproveTeamNameChange = async (reqItem) => {
    const team = reqItem.rawTeam;
    if (!team || !reqItem.requestedName) return;

    if (!window.confirm(`✅ Approve team name change for "${team.name}" to "${reqItem.requestedName}"?\n\nAll team points, leaderboard rank, submitted files, and member records will remain 100% intact.`)) {
      return;
    }

    try {
      const oldName = team.name;
      const newName = reqItem.requestedName;

      // 1. Update team name and clear pending request in ft_teams
      await db.ft_teams.update(team.id, {
        name: newName,
        pendingNameChange: null,
        updatedAt: new Date().toISOString()
      });

      // 2. Update member documents in scientists collection
      for (const m of (team.members || [])) {
        try {
          await db.scientists.update(m.userId, { teamName: newName });
        } catch (memberErr) {
          console.warn('Member update note:', memberErr);
        }

        // Notify member
        try {
          await db.ft_notifications.add({
            userId: m.userId,
            targetUserId: m.userId,
            type: 'team',
            title: 'Team Name Change Approved! 🎉',
            message: `Admin approved your team's new name: "${newName}". All your scores and records remain intact!`,
            link: '/dashboard/our-team',
            status: 'unread',
            createdAt: new Date().toISOString()
          });
        } catch (nErr) {}
      }

      logActivity({
        category: 'TEAMS',
        action: 'Approved Team Name Change',
        details: `Admin approved renaming team from "${oldName}" to "${newName}". All points, submissions, and records were preserved.`,
        user: authUser || { role: 'admin', username: 'admin' }
      });

      setToast({ type: 'success', msg: `✅ Team name updated to "${newName}"! Points and records remain untouched.` });
    } catch (err) {
      alert('Failed to approve team name: ' + err.message);
    }
  };

  // ── ADMIN REFUSE TEAM NAME CHANGE ─────────────────────────────────────────
  const handleRejectTeamNameChange = async (reqItem) => {
    const team = reqItem.rawTeam;
    if (!team) return;

    const reason = window.prompt(`Refuse team name change request to "${reqItem.requestedName}"?\n\nEnter an optional refusal reason for the team leader:`, 'Name does not meet guidelines.');
    if (reason === null) return;

    try {
      await db.ft_teams.update(team.id, {
        pendingNameChange: null,
        updatedAt: new Date().toISOString()
      });

      // Notify team members
      for (const m of (team.members || [])) {
        try {
          await db.ft_notifications.add({
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
  };

  return (
    <div className="ft-animate-in">
      <div className="ft-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="ft-page-title">Competition Settings & Management</h1>
          <p className="ft-page-subtitle">Configure judging criteria, user levels, and training workshops schedule.</p>
        </div>
        <button className="ft-btn ft-btn-primary" onClick={handleSaveSettings} disabled={saving}>
          <Save size={18} /> {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      {toast && (
        <div style={{
          padding: '0.8rem 1rem', borderRadius: '8px', marginBottom: '1.5rem', fontWeight: 600, fontSize: '0.9rem',
          background: toast.type === 'success' ? 'var(--ft-success-bg)' : 'rgba(239,68,68,0.15)',
          color: toast.type === 'success' ? 'var(--ft-success)' : '#f87171'
        }}>
          {toast.msg}
        </div>
      )}

      {/* ── UNIFIED SYSTEM & COMPETITOR REQUESTS & APPROVALS CENTER ── */}
      <div className="ft-card" style={{
        padding: '2rem', marginBottom: '2rem',
        border: pendingCount > 0 ? '2px solid #3b82f6' : '1.5px solid #e2e8f0',
        background: '#ffffff',
        boxShadow: pendingCount > 0 ? '0 8px 30px rgba(59, 130, 246, 0.08)' : '0 2px 10px rgba(0,0,0,0.02)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '0.75rem' }}>
          <div>
            <h2 style={{ fontFamily: "'Outfit', sans-serif", fontSize: '1.35rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#0f172a' }}>
              <Sparkles size={24} style={{ color: '#be123c' }} /> Requests & Approvals Center ({unifiedRequestsList.length})
            </h2>
            <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '0.35rem', marginBottom: 0, fontWeight: 500 }}>
              Review, approve, or reject team name change proposals, password reset requests, and user inquiries across the platform.
            </p>
          </div>

          {/* Filter Tabs */}
          <div style={{ display: 'flex', gap: '0.45rem', background: '#f1f5f9', padding: '0.35rem', borderRadius: '14px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setRequestsFilter('all')}
              style={{
                background: requestsFilter === 'all' ? '#ffffff' : 'transparent',
                color: requestsFilter === 'all' ? '#0f172a' : '#64748b',
                fontWeight: 800, fontSize: '0.8rem', padding: '0.4rem 0.8rem',
                borderRadius: '9px', border: 'none', cursor: 'pointer',
                boxShadow: requestsFilter === 'all' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none'
              }}
            >
              All ({unifiedRequestsList.length})
            </button>
            <button
              type="button"
              onClick={() => setRequestsFilter('pending')}
              style={{
                background: requestsFilter === 'pending' ? '#ffffff' : 'transparent',
                color: requestsFilter === 'pending' ? '#d97706' : '#64748b',
                fontWeight: 800, fontSize: '0.8rem', padding: '0.4rem 0.8rem',
                borderRadius: '9px', border: 'none', cursor: 'pointer',
                boxShadow: requestsFilter === 'pending' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none'
              }}
            >
              Pending ⏳ ({pendingCount})
            </button>
            <button
              type="button"
              onClick={() => setRequestsFilter('teams')}
              style={{
                background: requestsFilter === 'teams' ? '#ffffff' : 'transparent',
                color: requestsFilter === 'teams' ? '#2563eb' : '#64748b',
                fontWeight: 800, fontSize: '0.8rem', padding: '0.4rem 0.8rem',
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
                fontWeight: 800, fontSize: '0.8rem', padding: '0.4rem 0.8rem',
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
                fontWeight: 800, fontSize: '0.8rem', padding: '0.4rem 0.8rem',
                borderRadius: '9px', border: 'none', cursor: 'pointer',
                boxShadow: requestsFilter === 'approved' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none'
              }}
            >
              Approved ✅ ({unifiedRequestsList.filter(r => r.status === 'approved').length})
            </button>
          </div>
        </div>

        {/* Search */}
        <div style={{ position: 'relative', marginBottom: '1.25rem' }}>
          <Search size={18} style={{ position: 'absolute', left: 14, top: 12, color: '#94a3b8' }} />
          <input
            type="text"
            className="ft-input"
            style={{ paddingLeft: '2.5rem', background: '#f8fafc', border: '1px solid #cbd5e1', color: '#0f172a', fontWeight: 600 }}
            placeholder="Search all requests by username, team name, requested name, email, or track..."
            value={requestsSearch}
            onChange={e => setRequestsSearch(e.target.value)}
          />
        </div>

        {/* Requests Cards List */}
        {filteredRequests.length === 0 ? (
          <div style={{ padding: '2.5rem 1rem', textAlign: 'center', background: '#f8fafc', borderRadius: '16px', border: '1.5px dashed #cbd5e1', color: '#64748b' }}>
            <Sparkles size={36} style={{ color: '#94a3b8', margin: '0 auto 0.5rem auto' }} />
            <div style={{ fontWeight: 800, fontSize: '1rem', color: '#334155' }}>
              {requestsSearch ? 'No requests match your search.' : 'No requests currently in this list.'}
            </div>
            <div style={{ fontSize: '0.84rem', marginTop: '0.35rem', color: '#64748b' }}>
              Team name changes submitted by team leaders and password reset requests will appear here for one-click admin review.
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {filteredRequests.map(item => {
              // ── A. RENDER TEAM NAME CHANGE REQUEST CARD ──
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

              // ── B. RENDER PASSWORD RESET REQUEST CARD ──
              const req = item.rawReq || item;
              const matchedUser = users.find(u => 
                (u.username && req.username && u.username.toLowerCase() === req.username.toLowerCase()) ||
                (u.email && req.email && u.email.toLowerCase() === req.email.toLowerCase())
              );
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
                    <img
                      src={matchedUser?.avatarUrl || matchedUser?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${req.username || 'user'}`}
                      alt={req.username}
                      style={{
                        width: '52px', height: '52px', borderRadius: '50%',
                        objectFit: 'cover', border: isApproved ? '2px solid #16a34a' : '2px solid #2563eb',
                        flexShrink: 0, background: '#f1f5f9'
                      }}
                    />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 900, fontSize: '1.05rem', color: '#0f172a' }}>
                          {matchedUser?.name || req.username}
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
                        {matchedUser?.role && ` · Role: ${getUserRoleLabel(matchedUser)}`}
                        {matchedUser?.universityId && ` · University ID: ${matchedUser.universityId}`}
                        {matchedUser?.registeredTrack && ` · Track: ${matchedUser.registeredTrack === 'pop_science' ? 'Pop Science' : 'Science Journalism'}`}
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
            })}
          </div>
        )}
      </div>

      {/* Role Management (Trainer & Judge / Admin / Competitor) */}
      <div className="ft-card" style={{ padding: '2rem', marginBottom: '2rem', background: '#ffffff' }}>
        <h2 style={{ fontFamily: "'Outfit', sans-serif", fontSize: '1.3rem', fontWeight: 800, marginBottom: '0.5rem', color: '#0f172a' }}>
          🧑‍⚖️ Account Levels & Roles (Competitor / Trainer & Judge / Admin)
        </h2>
        <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1.25rem', fontWeight: 500 }}>
          Change any user account role between Competitor, Trainer & Judge (Dual Role), Administrator, or System Administrator (Master).
        </p>

        <div style={{ position: 'relative', marginBottom: '1rem' }}>
          <Search size={18} style={{ position: 'absolute', left: 14, top: 12, color: '#94a3b8' }} />
          <input
            type="text"
            className="ft-input"
            style={{ paddingLeft: '2.5rem', background: '#f8fafc', border: '1px solid #cbd5e1', color: '#0f172a', fontWeight: 600 }}
            placeholder="Search users by name, username, or email..."
            value={userSearch}
            onChange={e => setUserSearch(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '380px', overflowY: 'auto' }}>
          {users.filter(u => !userSearch || u.name?.toLowerCase().includes(userSearch.toLowerCase()) || u.email?.toLowerCase().includes(userSearch.toLowerCase())).map(u => (
            <div key={u.id} style={{
              padding: '1rem 1.25rem', borderRadius: '12px', background: '#f8fafc',
              border: '1px solid #cbd5e1', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem',
              boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
            }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: '1rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  {u.name || u.username}
                  <span style={{
                    fontSize: '0.72rem', fontWeight: 800, padding: '0.15rem 0.55rem', borderRadius: '6px',
                    background: u.accountStatus === 'pending' ? '#fef3c7' : '#dcfce7',
                    color: u.accountStatus === 'pending' ? '#d97706' : '#15803d',
                    border: `1px solid ${u.accountStatus === 'pending' ? '#fde68a' : '#86efac'}`
                  }}>
                    {u.accountStatus === 'pending' ? 'Pending Approval ⏳' : 'Active ✅'}
                  </span>
                </div>
                <div style={{ fontSize: '0.82rem', color: '#475569', marginTop: '0.2rem', fontWeight: 500 }}>
                  <strong>{u.email}</strong> · Current Role: <strong style={{ color: '#be123c' }}>{getUserRoleLabel(u)}</strong>
                  {u.registeredTrack && ` · Track: ${u.registeredTrack === 'pop_science' ? 'Pop Science' : 'Science Journalism'}`}
                </div>
              </div>
              <select
                className="ft-select"
                style={{ width: 'auto', padding: '0.45rem 0.85rem', fontSize: '0.85rem', fontWeight: 700, background: '#ffffff', border: '2px solid #cbd5e1', color: '#0f172a', borderRadius: '10px' }}
                value={['judge', 'academic_judge', 'scicomm_judge', 'trainer', 'trainer_judge'].includes(u.role) ? 'trainer_judge' : (u.role || 'competitor')}
                onChange={e => handleUpdateUserRole(u.id, e.target.value)}
              >
                <option value="competitor">Competitor</option>
                <option value="trainer_judge">Trainer & Judge (Dual Role) 🌟</option>
                <option value="admin">Administrator 🛡️</option>
                <option value="master">System Administrator (Master) 👑</option>
              </select>
            </div>
          ))}
        </div>
      </div>

      {/* Tracks & Descriptions Management */}
      <div className="ft-card" style={{ padding: '2rem', marginBottom: '2rem', background: '#ffffff', border: '1.5px solid #e2e8f0' }}>
        <h2 style={{ fontFamily: "'Outfit', sans-serif", fontSize: '1.3rem', fontWeight: 800, marginBottom: '0.5rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          🏆 Competition Tracks & Descriptions Management
        </h2>
        <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1.25rem', fontWeight: 500 }}>
          Add, edit, or customize competition tracks and their full descriptions shown during competitor registration.
        </p>

        {/* Form to Add / Edit Track */}
        <form onSubmit={handleSaveTrack} style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '16px', border: '1.5px solid #cbd5e1', marginBottom: '1.5rem' }}>
          <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0f172a', marginBottom: '1rem' }}>
            {editingTrackId ? '✏️ Edit Competition Track' : '➕ Add New Competition Track'}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
            <div className="ft-input-group" style={{ marginBottom: 0 }}>
              <label className="ft-label">Track Title / اسم المسار *</label>
              <input
                type="text"
                className="ft-input"
                required
                value={newTrackTitle}
                onChange={e => setNewTrackTitle(e.target.value)}
                placeholder="e.g. AI & Robotics Science Show"
              />
            </div>

            <div className="ft-input-group" style={{ marginBottom: 0 }}>
              <label className="ft-label">Track Icon (Emoji) *</label>
              <select
                className="ft-select"
                value={newTrackIcon}
                onChange={e => setNewTrackIcon(e.target.value)}
              >
                <option value="🎥">🎥 Pop Science Video</option>
                <option value="📰">📰 Science Journalism</option>
                <option value="🤖">🤖 AI & Robotics</option>
                <option value="🧬">🧬 Biotech & Life Sciences</option>
                <option value="⚛️">⚛️ Quantum & Physics</option>
                <option value="🌱">🌱 Environment & Energy</option>
                <option value="🎙️">🎙️ Public SciComm</option>
                <option value="🏆">🏆 Custom Competition</option>
              </select>
            </div>
          </div>

          <div className="ft-input-group" style={{ marginBottom: '1.25rem' }}>
            <label className="ft-label">Track Description / وصف المسار (Shown during Registration) *</label>
            <textarea
              className="ft-textarea"
              required
              rows={3}
              value={newTrackDesc}
              onChange={e => setNewTrackDesc(e.target.value)}
              placeholder="Provide a clear description of the goals, formats, and expectations for competitors choosing this track..."
              style={{ fontSize: '0.88rem', color: '#0f172a' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              type="submit"
              className="ft-btn"
              style={{
                background: 'linear-gradient(135deg, #be123c 0%, #9f1239 100%)', color: '#ffffff',
                fontWeight: 800, fontSize: '0.88rem', padding: '0.55rem 1.25rem', borderRadius: '10px',
                border: 'none', cursor: 'pointer'
              }}
            >
              {editingTrackId ? 'Update Track' : 'Add Track'}
            </button>

            {editingTrackId && (
              <button
                type="button"
                className="ft-btn"
                onClick={() => {
                  setEditingTrackId(null);
                  setNewTrackTitle('');
                  setNewTrackDesc('');
                  setNewTrackIcon('🎥');
                }}
                style={{ background: '#ffffff', color: '#64748b', border: '1.5px solid #cbd5e1', fontSize: '0.85rem', fontWeight: 800, borderRadius: '10px' }}
              >
                Cancel Edit
              </button>
            )}
          </div>
        </form>

        {/* Active Tracks List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {(customTracks.length > 0 ? customTracks : [
            {
              id: 'pop_science',
              name: 'Pop Science Videos / فيديوهات تبسيط العلوم',
              icon: '🎥',
              description: 'Transform complex scientific concepts into engaging, creative video content (Reels, TikTok & YouTube) for the public.'
            },
            {
              id: 'science_journalism',
              name: 'Science Journalism / الصحافة العلمية',
              icon: '📰',
              description: 'Investigate, research, craft simplified science articles, and conduct professional interviews with leading scientists.'
            }
          ]).map((tr) => (
            <div key={tr.id} style={{
              padding: '1.1rem 1.25rem', borderRadius: '16px', background: '#f8fafc',
              border: '1.5px solid #cbd5e1', display: 'flex', justifyContent: 'space-between',
              alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem', flex: 1, minWidth: '260px' }}>
                <span style={{ fontSize: '1.5rem', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '10px', width: '42px', height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {tr.icon || '🏆'}
                </span>
                <div>
                  <div style={{ fontWeight: 900, fontSize: '1rem', color: '#0f172a' }}>{tr.name}</div>
                  <div style={{ fontSize: '0.82rem', color: '#475569', marginTop: '0.2rem', lineHeight: 1.45, fontWeight: 500 }}>
                    {tr.description}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  className="ft-btn"
                  onClick={() => handleEditTrack(tr)}
                  style={{ background: '#ffffff', color: '#2563eb', border: '1px solid #bfdbfe', fontSize: '0.78rem', fontWeight: 800, padding: '0.4rem 0.75rem', borderRadius: '8px' }}
                >
                  Edit
                </button>
                {customTracks.some(c => c.id === tr.id) && (
                  <button
                    className="ft-btn"
                    onClick={() => handleDeleteTrack(tr.id)}
                    style={{ background: '#ffffff', color: '#dc2626', border: '1px solid #fca5a5', fontSize: '0.78rem', fontWeight: 800, padding: '0.4rem 0.75rem', borderRadius: '8px' }}
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
