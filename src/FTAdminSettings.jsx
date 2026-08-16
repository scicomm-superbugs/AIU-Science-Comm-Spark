import { useState, useEffect, useMemo } from 'react';
import { db, firestore, getCollectionName, useLiveCollection } from './db';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { Settings, Save, Search, UserCheck, Plus, Trash2, Award, Key, CheckCircle2, ShieldCheck, Clock, Lock } from 'lucide-react';
import { DEFAULT_JUDGING_CRITERIA, FT_DEPARTMENTS, FT_ROLE_LABELS, getUserRoleLabel } from './ftConstants';
import WorkshopManager from './WorkshopManager';
import './scicommspark.css';

export default function FTAdminSettings() {
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
  const customTracks = useLiveCollection('ft_tracks') || [];

  const [resetSearch, setResetSearch] = useState('');
  const [resetFilter, setResetFilter] = useState('all'); // 'all' | 'pending' | 'approved'

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

  if (!loaded) {
    return <div style={{ padding: '3rem', textAlign: 'center' }}>Loading competition settings...</div>;
  }

  const pendingJudges = users.filter(u => (u.role === 'judge' || u.role === 'trainer_judge') && u.accountStatus === 'pending');
  const allJudgesAndTrainers = users.filter(u => u.role === 'judge' || u.role === 'trainer' || u.role === 'trainer_judge');

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
      {/* Pending Account Registrations */}
      {users.filter(u => u.accountStatus === 'pending').length > 0 && (
        <div className="ft-card" style={{ padding: '2rem', marginBottom: '2rem', border: '2px solid #e11d48', background: '#ffffff', boxShadow: '0 8px 30px rgba(225, 29, 72, 0.06)' }}>
          <h2 style={{ fontFamily: "'Outfit', sans-serif", fontSize: '1.3rem', fontWeight: 800, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#be123c' }}>
            ⏳ Pending Account Registrations ({users.filter(u => u.accountStatus === 'pending').length})
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1.5rem', fontWeight: 500 }}>
            Review national IDs, university details, and profiles before accepting new users.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {users.filter(u => u.accountStatus === 'pending').map(u => {
              const isCompetitor = u.role === 'competitor' || u.role === 'user' || !u.role;
              return (
                <div key={u.id} style={{
                  padding: '1.25rem 1.5rem', borderRadius: '16px', background: '#f8fafc',
                  border: '1.5px solid #cbd5e1', boxShadow: '0 4px 14px rgba(0,0,0,0.04)', display: 'flex', gap: '1.25rem', flexWrap: 'wrap',
                  justifyContent: 'space-between', alignItems: 'center'
                }}>
                  {/* Left: Avatar & Basic Info */}
                  <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'flex-start', flex: 1, minWidth: '300px' }}>
                    <img 
                      src={u.avatarUrl || u.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.username}`} 
                      alt="" 
                      style={{ width: '64px', height: '64px', borderRadius: '50%', border: '3px solid #be123c', objectFit: 'cover', flexShrink: 0, boxShadow: '0 4px 12px rgba(190, 18, 60, 0.2)' }} 
                    />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                      <div style={{ fontWeight: 900, fontSize: '1.15rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                        {u.name} 
                        <span style={{
                          background: isCompetitor ? '#eff6ff' : '#ecfdf5',
                          border: `1px solid ${isCompetitor ? '#93c5fd' : '#a7f3d0'}`,
                          color: isCompetitor ? '#1d4ed8' : '#047857',
                          fontSize: '0.75rem', fontWeight: 800, padding: '0.2rem 0.65rem', borderRadius: '8px'
                        }}>
                          {isCompetitor ? `Competitor (${u.registeredTrack === 'pop_science' ? 'Pop Science' : 'Science Journalism'})` : 'Judge / Speaker'}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.85rem', color: '#475569', fontWeight: 600 }}>
                        📧 <strong>{u.email}</strong> · 👤 @{u.username} · 📞 {u.phone || 'No phone'}
                      </div>
                      <div style={{ fontSize: '0.85rem', color: '#334155', marginTop: '0.35rem', display: 'flex', flexDirection: 'column', gap: '0.2rem', background: '#ffffff', padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                        <div>🪪 <strong style={{ color: '#0f172a' }}>National ID:</strong> {u.nationalId || 'N/A'}</div>
                        <div>🏫 <strong style={{ color: '#0f172a' }}>Institution:</strong> {u.institutionName || 'N/A'} {u.universityId ? `(ID: ${u.universityId})` : ''}</div>
                        <div>🧬 <strong style={{ color: '#0f172a' }}>Department/Specialty:</strong> {u.department || 'N/A'}</div>
                        {!isCompetitor && <div>🧑‍🏫 <strong style={{ color: '#0f172a' }}>Title:</strong> {u.title || 'N/A'}</div>}
                      </div>
                    </div>
                  </div>

                  {/* Right: Approve / Reject Actions */}
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button 
                      onClick={() => handleApproveUser(u.id)} 
                      className="ft-btn" 
                      style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.6rem 1.1rem', background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)', color: '#ffffff', border: 'none', borderRadius: '10px', fontWeight: 800, cursor: 'pointer', boxShadow: '0 4px 14px rgba(22, 163, 74, 0.25)' }}
                    >
                      <UserCheck size={16} /> Approve Account
                    </button>
                    <button 
                      onClick={() => handleRejectUser(u.id)} 
                      className="ft-btn" 
                      style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.6rem 1.1rem', background: '#ffffff', border: '2px solid #fca5a5', color: '#dc2626', borderRadius: '10px', fontWeight: 800, cursor: 'pointer' }}
                    >
                      <Trash2 size={16} /> Reject
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── PASSWORD RESET REQUESTS APPROVAL SECTION ── */}
      <div className="ft-card" style={{ padding: '2rem', marginBottom: '2rem', border: resetRequests.filter(r => r.status !== 'approved').length > 0 ? '2px solid #3b82f6' : '1.5px solid #e2e8f0', background: '#ffffff', boxShadow: resetRequests.filter(r => r.status !== 'approved').length > 0 ? '0 8px 30px rgba(59, 130, 246, 0.08)' : '0 2px 10px rgba(0,0,0,0.02)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '0.75rem' }}>
          <div>
            <h2 style={{ fontFamily: "'Outfit', sans-serif", fontSize: '1.3rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.55rem', color: '#0f172a' }}>
              <Key size={22} style={{ color: '#2563eb' }} /> Password Reset Requests ({resetRequests.length})
            </h2>
            <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '0.35rem', marginBottom: 0, fontWeight: 500 }}>
              Review, approve, or reject user password reset requests. Approved users can set their new password from the sign-in screen.
            </p>
          </div>

          {/* Filter Pills */}
          <div style={{ display: 'flex', gap: '0.5rem', background: '#f1f5f9', padding: '0.3rem', borderRadius: '12px' }}>
            <button
              type="button"
              onClick={() => setResetFilter('all')}
              style={{
                background: resetFilter === 'all' ? '#ffffff' : 'transparent',
                color: resetFilter === 'all' ? '#0f172a' : '#64748b',
                fontWeight: 800, fontSize: '0.8rem', padding: '0.35rem 0.75rem',
                borderRadius: '8px', border: 'none', cursor: 'pointer',
                boxShadow: resetFilter === 'all' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none'
              }}
            >
              All ({resetRequests.length})
            </button>
            <button
              type="button"
              onClick={() => setResetFilter('pending')}
              style={{
                background: resetFilter === 'pending' ? '#ffffff' : 'transparent',
                color: resetFilter === 'pending' ? '#d97706' : '#64748b',
                fontWeight: 800, fontSize: '0.8rem', padding: '0.35rem 0.75rem',
                borderRadius: '8px', border: 'none', cursor: 'pointer',
                boxShadow: resetFilter === 'pending' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none'
              }}
            >
              Pending ⏳ ({resetRequests.filter(r => r.status !== 'approved').length})
            </button>
            <button
              type="button"
              onClick={() => setResetFilter('approved')}
              style={{
                background: resetFilter === 'approved' ? '#ffffff' : 'transparent',
                color: resetFilter === 'approved' ? '#16a34a' : '#64748b',
                fontWeight: 800, fontSize: '0.8rem', padding: '0.35rem 0.75rem',
                borderRadius: '8px', border: 'none', cursor: 'pointer',
                boxShadow: resetFilter === 'approved' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none'
              }}
            >
              Approved ✅ ({resetRequests.filter(r => r.status === 'approved').length})
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
            placeholder="Search reset requests by username or email..."
            value={resetSearch}
            onChange={e => setResetSearch(e.target.value)}
          />
        </div>

        {/* Requests List */}
        {resetRequests
          .filter(r => {
            if (resetFilter === 'pending') return r.status !== 'approved';
            if (resetFilter === 'approved') return r.status === 'approved';
            return true;
          })
          .filter(r => {
            if (!resetSearch) return true;
            const q = resetSearch.toLowerCase();
            return (r.username && r.username.toLowerCase().includes(q)) || (r.email && r.email.toLowerCase().includes(q));
          })
          .length === 0 ? (
          <div style={{ padding: '2rem 1rem', textAlign: 'center', background: '#f8fafc', borderRadius: '16px', border: '1px dashed #cbd5e1', color: '#64748b' }}>
            <Key size={32} style={{ color: '#94a3b8', margin: '0 auto 0.5rem auto' }} />
            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#334155' }}>
              {resetSearch ? 'No password reset requests match your search.' : 'No password reset requests currently in this list.'}
            </div>
            <div style={{ fontSize: '0.82rem', marginTop: '0.25rem' }}>
              When users request a password reset on the login screen, they will appear here for admin approval.
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {resetRequests
              .filter(r => {
                if (resetFilter === 'pending') return r.status !== 'approved';
                if (resetFilter === 'approved') return r.status === 'approved';
                return true;
              })
              .filter(r => {
                if (!resetSearch) return true;
                const q = resetSearch.toLowerCase();
                return (r.username && r.username.toLowerCase().includes(q)) || (r.email && r.email.toLowerCase().includes(q));
              })
              .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
              .map(req => {
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
                          width: '52px',
                          height: '52px',
                          borderRadius: '50%',
                          objectFit: 'cover',
                          border: isApproved ? '2px solid #16a34a' : '2px solid #2563eb',
                          flexShrink: 0,
                          background: '#f1f5f9'
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
                          <span
                            style={{
                              fontSize: '0.72rem',
                              fontWeight: 800,
                              padding: '0.15rem 0.6rem',
                              borderRadius: '9999px',
                              background: isApproved ? '#dcfce7' : '#fef3c7',
                              color: isApproved ? '#15803d' : '#d97706',
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
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.4rem',
                              padding: '0.55rem 1.1rem',
                              background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
                              color: '#ffffff',
                              border: 'none',
                              borderRadius: '10px',
                              fontWeight: 800,
                              fontSize: '0.84rem',
                              cursor: 'pointer',
                              boxShadow: '0 4px 14px rgba(22, 163, 74, 0.25)'
                            }}
                          >
                            <CheckCircle2 size={16} /> Approve Reset
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRejectReset(req.id)}
                            className="ft-btn"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.4rem',
                              padding: '0.55rem 0.95rem',
                              background: '#ffffff',
                              border: '1.5px solid #fca5a5',
                              color: '#dc2626',
                              borderRadius: '10px',
                              fontWeight: 800,
                              fontSize: '0.84rem',
                              cursor: 'pointer'
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
                              background: '#ffffff',
                              border: '1.5px solid #cbd5e1',
                              color: '#64748b',
                              borderRadius: '8px',
                              padding: '0.4rem 0.6rem',
                              cursor: 'pointer',
                              fontSize: '0.78rem',
                              fontWeight: 700,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.3rem'
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
