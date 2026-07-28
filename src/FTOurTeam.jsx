import { useState, useMemo } from 'react';
import { useAuth } from './context/AuthContext';
import { useLiveCollection, db } from './db';
import { calculateAveragedPoints, normalizeTrackKey } from './ftConstants';
import { Users, UserPlus, Trophy, Award, Copy, Check, Star, Shield, LogOut, Trash2, Plus, Sparkles, User, Layers } from 'lucide-react';
import './scicommspark.css';

export default function FTOurTeam() {
  const { user } = useAuth();
  const teams = useLiveCollection('ft_teams') || [];
  const allScientists = useLiveCollection('scientists') || [];
  const allSubmissions = useLiveCollection('submissions') || [];
  const allEvaluations = useLiveCollection('ft_evaluations') || [];

  const [copiedCode, setCopiedCode] = useState(false);
  const [createTeamName, setCreateTeamName] = useState('');
  const [createTrack, setCreateTrack] = useState('pop_science');
  const [joinCodeInput, setJoinCodeInput] = useState('');
  
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [showTeamSetupSection, setShowTeamSetupSection] = useState(false);
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Find the current user's scientist doc
  const meDoc = useMemo(() => {
    if (!user) return null;
    return allScientists.find(s => s.id === user.id || s.username === user.username) || user;
  }, [allScientists, user]);

  // Find the current user's team if joined
  const myTeam = useMemo(() => {
    if (!user) return null;
    return teams.find(t => t.members?.some(m => m.userId === user.id || m.username === user.username));
  }, [teams, user]);

  const isLeader = useMemo(() => {
    if (!myTeam || !user) return false;
    return myTeam.leaderId === user.id || myTeam.leaderUsername === user.username;
  }, [myTeam, user]);

  const isCompetitorUser = useMemo(() => {
    const role = user?.role || meDoc?.role;
    return !role || role === 'competitor' || role === 'user';
  }, [user, meDoc]);

  const partMode = user?.participationMode || meDoc?.participationMode || (myTeam ? 'team' : 'individual');

  const isIndividualMode = useMemo(() => {
    return isCompetitorUser && partMode === 'individual' && !myTeam;
  }, [isCompetitorUser, partMode, myTeam]);

  const showTeamSetup = useMemo(() => {
    return isCompetitorUser && !myTeam;
  }, [isCompetitorUser, myTeam]);

  const formatSimpleCode = (rawCode, isTeam = false) => {
    if (!rawCode) return isTeam ? 'T-101' : 'C-101';
    if (/^(T-|C-)\d{3,4}$/.test(rawCode)) return rawCode;
    let hash = 0;
    for (let i = 0; i < String(rawCode).length; i++) {
      hash = (hash + String(rawCode).charCodeAt(i)) % 900;
    }
    return (isTeam ? 'T-' : 'C-') + (100 + hash);
  };

  // Generate simple 3-digit team code / Team ID (e.g. T-808)
  const generateTeamCode = () => {
    return 'T-' + Math.floor(100 + Math.random() * 900);
  };

  // Generate custom invitation code (e.g. SPARK-789X)
  const generateInviteCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let randStr = '';
    for (let i = 0; i < 4; i++) {
      randStr += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `SPARK-${randStr}`;
  };

  // Get Team Invite Code with fallback for legacy team records
  const getTeamInviteCode = (t) => {
    if (!t) return '';
    if (t.inviteCode) return t.inviteCode;
    const numStr = String(t.code || t.id || '101').replace(/\D/g, '') || '101';
    return `SPARK-${numStr}X`;
  };

  // Personal competitor code for individual competitor
  const myCompetitorCode = useMemo(() => {
    if (myTeam) return formatSimpleCode(myTeam.code, true);
    const raw = meDoc?.competitorCode || meDoc?.competitorIdNumber || meDoc?.employeeId || meDoc?.universityId || user?.id;
    return formatSimpleCode(raw, false);
  }, [myTeam, meDoc, user]);

  // Unified Leaderboard combining Teams + Solo Competitors
  const unifiedLeaderboard = useMemo(() => {
    // 1. Map Teams
    const teamEntries = teams.map(team => {
      const memberUserIds = (team.members || []).map(m => m.userId).filter(Boolean);
      const memberUsernames = (team.members || []).map(m => m.username).filter(Boolean);

      const teamCode = formatSimpleCode(team.code, true);
      const teamEvals = allEvaluations.filter(ev => 
        (memberUserIds.length > 0 && memberUserIds.includes(ev.competitorId)) || 
        (memberUsernames.length > 0 && memberUsernames.includes(ev.competitorUsername)) ||
        ev.teamId === team.id ||
        ev.targetId === team.id ||
        ev.competitorCode === teamCode
      );

      const totalPoints = calculateAveragedPoints(teamEvals);

      const teamSubmissions = allSubmissions.filter(sub => 
        memberUserIds.includes(sub.competitorId) || 
        memberUsernames.includes(sub.competitorUsername) ||
        sub.teamId === team.id
      );

      return {
        id: team.id,
        name: team.name,
        type: 'team', // 'team' | 'individual'
        code: teamCode,
        track: team.track,
        membersCount: (team.members || []).length,
        totalPoints,
        submissionsCount: teamSubmissions.length
      };
    });

    // 2. Map Solo Individual Competitors (not assigned to any team)
    const teamUserIds = teams.flatMap(t => (t.members || []).map(m => m.userId).filter(Boolean));
    const soloCompetitors = allScientists.filter(s => 
      (s.role === 'competitor' || s.role === 'user' || !s.role) &&
      !teamUserIds.includes(s.id)
    );

    const soloEntries = soloCompetitors.map(s => {
      const rawCode = s.competitorCode || s.competitorIdNumber || s.employeeId || s.universityId || s.id;
      const code = formatSimpleCode(rawCode, false);

      const sEvals = allEvaluations.filter(ev => 
        ev.competitorId === s.id || 
        ev.targetId === s.id ||
        ev.competitorUsername === s.username ||
        (ev.competitorName && (ev.competitorName === s.name || ev.competitorName === s.username)) ||
        (ev.competitorCode && ev.competitorCode === code)
      );
      const totalPoints = calculateAveragedPoints(sEvals);
      const sSubs = allSubmissions.filter(sub => sub.competitorId === s.id || sub.competitorUsername === s.username);

      return {
        id: s.id,
        name: s.name || s.username,
        username: s.username,
        avatar: s.avatarUrl || s.avatar,
        type: 'individual',
        code,
        track: s.registeredTrack || 'pop_science',
        membersCount: 1,
        totalPoints,
        submissionsCount: sSubs.length
      };
    });

    const combined = [...teamEntries, ...soloEntries];
    return combined.sort((a, b) => b.totalPoints - a.totalPoints);
  }, [teams, allScientists, allEvaluations, allSubmissions]);

  // Selected track for Leaderboard tab
  const [selectedLeaderboardTrack, setSelectedLeaderboardTrack] = useState('pop_science');

  // Track 1: Pop Science Videos Leaderboard
  const popScienceLeaderboard = useMemo(() => {
    return unifiedLeaderboard.filter(item =>
      item.track === 'pop_science' ||
      item.track === 'Pop Science Videos' ||
      !item.track
    );
  }, [unifiedLeaderboard]);

  // Track 2: Science Journalism Leaderboard
  const journalismLeaderboard = useMemo(() => {
    return unifiedLeaderboard.filter(item =>
      item.track === 'science_journalism' ||
      item.track === 'Science Journalism'
    );
  }, [unifiedLeaderboard]);

  // Active Leaderboard List based on Tab
  const activeLeaderboard = useMemo(() => {
    if (selectedLeaderboardTrack === 'science_journalism') return journalismLeaderboard;
    if (selectedLeaderboardTrack === 'all') return unifiedLeaderboard;
    return popScienceLeaderboard;
  }, [selectedLeaderboardTrack, popScienceLeaderboard, journalismLeaderboard, unifiedLeaderboard]);

  // Personal Rank on Track Leaderboard
  const myLeaderboardStat = useMemo(() => {
    if (!user) return { rank: 1, totalPoints: 0, submissionsCount: 0, trackName: '' };
    const myTrackKey = normalizeTrackKey(user?.registeredTrack || meDoc?.registeredTrack || myTeam?.track) || 'pop_science';
    const targetTrackLeaderboard = myTrackKey === 'science_journalism' ? journalismLeaderboard : popScienceLeaderboard;
    const targetId = myTeam ? myTeam.id : user.id;

    const index = targetTrackLeaderboard.findIndex(item => item.id === targetId);
    const entry = targetTrackLeaderboard[index];
    return {
      rank: index >= 0 ? index + 1 : 1,
      totalPoints: entry?.totalPoints || 0,
      submissionsCount: entry?.submissionsCount || 0,
      trackName: myTrackKey === 'science_journalism' ? 'Track 2: Science Journalism' : 'Track 1: Pop Science Videos'
    };
  }, [user, meDoc, myTeam, popScienceLeaderboard, journalismLeaderboard]);

  // Create Team Handler
  const handleCreateTeam = async (e) => {
    e.preventDefault();
    if (!createTeamName.trim()) {
      setError('Please enter a team name');
      return;
    }
    setError('');
    setSuccess('');
    setIsSubmitting(true);

    try {
      const userTrack = user?.registeredTrack || meDoc?.registeredTrack || 'pop_science';
      const teamCode = generateTeamCode();
      const inviteCode = generateInviteCode();

      const newTeam = {
        name: createTeamName.trim(),
        track: userTrack,
        code: teamCode,
        inviteCode: inviteCode,
        leaderId: user.id,
        leaderUsername: user.username,
        members: [
          {
            userId: user.id,
            name: meDoc.name || user.username,
            username: user.username,
            avatar: meDoc.avatarUrl || meDoc.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`,
            role: 'Team Leader',
            joinedAt: new Date().toISOString()
          }
        ],
        createdAt: new Date().toISOString()
      };

      await db.ft_teams.add(newTeam);
      await db.scientists.update(user.id, { participationMode: 'team' });
      setSuccess(`Team "${createTeamName.trim()}" created successfully! Invite code: ${inviteCode}`);
      setCreateTeamName('');
    } catch (err) {
      setError('Failed to create team: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Join Team Handler
  const handleJoinTeam = async (e) => {
    e.preventDefault();
    const cleanCode = joinCodeInput.trim().toUpperCase();
    if (!cleanCode) {
      setError('Please enter a team invite code');
      return;
    }
    setError('');
    setSuccess('');
    setIsSubmitting(true);

    try {
      // ONLY allow joining via Invitation Code (e.g. SPARK-836X). Team ID (T-XXX) or Competitor ID (C-XXX) are disallowed.
      const targetTeam = teams.find(t => {
        const teamInviteCode = (t.inviteCode || getTeamInviteCode(t)).toUpperCase();
        return teamInviteCode === cleanCode;
      });

      if (!targetTeam) {
        if (/^T-\d+$/i.test(cleanCode)) {
          setError('Team IDs (T-XXX) cannot be used to join. Please use the official Team Invite Code (e.g. SPARK-836X).');
        } else if (/^C-\d+$/i.test(cleanCode)) {
          setError('Competitor IDs (C-XXX) cannot be used to join a team. Please enter the Team Invite Code (e.g. SPARK-836X).');
        } else {
          setError('Invalid team invite code. Please enter a valid invitation code (e.g. SPARK-836X).');
        }
        setIsSubmitting(false);
        return;
      }

      if ((targetTeam.members || []).length >= 3) {
        setError('This team has already reached its maximum capacity of 3 members!');
        setIsSubmitting(false);
        return;
      }

      const normalizeTrack = (tr) => (tr === 'science_journalism' || tr === 'journalism') ? 'science_journalism' : 'pop_science';
      const userTrack = normalizeTrack(meDoc?.registeredTrack || user?.registeredTrack || 'pop_science');
      const teamTrack = normalizeTrack(targetTeam.track || 'pop_science');

      if (userTrack !== teamTrack) {
        const teamTrackLabel = teamTrack === 'science_journalism' ? 'Science Journalism' : 'Pop Science Videos';
        const userTrackLabel = userTrack === 'science_journalism' ? 'Science Journalism' : 'Pop Science Videos';
        setError(`Cannot join team! Team "${targetTeam.name}" is registered for the "${teamTrackLabel}" track, but your account is registered for "${userTrackLabel}". All team members must be registered for the same track.`);
        setIsSubmitting(false);
        return;
      }

      const updatedMembers = [
        ...(targetTeam.members || []),
        {
          userId: user.id,
          name: meDoc.name || user.username,
          username: user.username,
          avatar: meDoc.avatarUrl || meDoc.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`,
          role: 'Team Member',
          joinedAt: new Date().toISOString()
        }
      ];

      await db.ft_teams.update(targetTeam.id, { members: updatedMembers });
      await db.scientists.update(user.id, { participationMode: 'team' });
      setSuccess(`Successfully joined team "${targetTeam.name}"! 🎉`);
      setJoinCodeInput('');
    } catch (err) {
      setError('Failed to join team: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Add Member by Search Handler
  const handleAddMember = async (targetUser) => {
    if ((myTeam.members || []).length >= 3) {
      alert('Team has reached maximum capacity of 3 members.');
      return;
    }

    const normalizeTrack = (tr) => (tr === 'science_journalism' || tr === 'journalism') ? 'science_journalism' : 'pop_science';
    const targetTrack = normalizeTrack(targetUser.registeredTrack || 'pop_science');
    const teamTrack = normalizeTrack(myTeam.track || 'pop_science');

    if (targetTrack !== teamTrack) {
      alert('Cannot add member: Competitor track does not match the team track.');
      return;
    }

    try {
      const updatedMembers = [
        ...(myTeam.members || []),
        {
          userId: targetUser.id,
          name: targetUser.name || targetUser.username,
          username: targetUser.username,
          avatar: targetUser.avatarUrl || targetUser.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${targetUser.username}`,
          role: 'Team Member',
          joinedAt: new Date().toISOString()
        }
      ];

      await db.ft_teams.update(myTeam.id, { members: updatedMembers });
      await db.scientists.update(targetUser.id, { participationMode: 'team' });
      setSuccess(`Added ${targetUser.name || targetUser.username} to your team!`);
      setShowAddMemberModal(false);
    } catch (err) {
      alert('Failed to add member: ' + err.message);
    }
  };

  // Remove Member Handler
  const handleRemoveMember = async (memberUserId) => {
    if (!isLeader) {
      alert('Only the Team Leader can remove members.');
      return;
    }
    if (!window.confirm('Are you sure you want to remove this member from the team?')) return;

    try {
      const updatedMembers = (myTeam.members || []).filter(m => m.userId !== memberUserId);
      await db.ft_teams.update(myTeam.id, { members: updatedMembers });
      await db.scientists.update(memberUserId, { participationMode: 'team' });
      setSuccess('Member removed from team.');
    } catch (err) {
      alert('Failed to remove member: ' + err.message);
    }
  };

  // Leave Team Handler
  const handleLeaveTeam = async () => {
    if (!window.confirm('Are you sure you want to leave this team?')) return;
    try {
      const updatedMembers = (myTeam.members || []).filter(m => m.userId !== user.id);
      if (updatedMembers.length === 0) {
        await db.ft_teams.delete(myTeam.id);
      } else {
        let newLeaderId = myTeam.leaderId;
        let newLeaderUsername = myTeam.leaderUsername;
        if (isLeader && updatedMembers.length > 0) {
          updatedMembers[0].role = 'Team Leader';
          newLeaderId = updatedMembers[0].userId;
          newLeaderUsername = updatedMembers[0].username;
        }
        await db.ft_teams.update(myTeam.id, {
          members: updatedMembers,
          leaderId: newLeaderId,
          leaderUsername: newLeaderUsername
        });
      }
      await db.scientists.update(user.id, { participationMode: 'team' });
      setSuccess('You have left the team.');
    } catch (err) {
      alert('Failed to leave team: ' + err.message);
    }
  };

  const copyCode = (codeToCopy) => {
    if (!codeToCopy) return;
    navigator.clipboard.writeText(codeToCopy);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Search competitors not in any team matching the team's track
  const availableCompetitors = useMemo(() => {
    const allAssignedIds = teams.flatMap(t => (t.members || []).map(m => m.userId));
    const normalizeTrack = (tr) => (tr === 'science_journalism' || tr === 'journalism') ? 'science_journalism' : 'pop_science';
    const teamTrack = myTeam ? normalizeTrack(myTeam.track) : null;

    return allScientists.filter(s => {
      const sTrack = normalizeTrack(s.registeredTrack || 'pop_science');
      const isSameTrack = !teamTrack || sTrack === teamTrack;

      return (s.role === 'competitor' || s.role === 'user' || !s.role) &&
        !allAssignedIds.includes(s.id) &&
        s.id !== user.id &&
        isSameTrack &&
        (memberSearchQuery === '' ||
         s.name?.toLowerCase().includes(memberSearchQuery.toLowerCase()) ||
         s.username?.toLowerCase().includes(memberSearchQuery.toLowerCase()));
    });
  }, [allScientists, teams, user.id, myTeam, memberSearchQuery]);

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', paddingBottom: '3rem' }}>
      
      {/* Top Title Bar */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.6rem', fontFamily: "'Outfit', sans-serif" }}>
          <Trophy size={32} style={{ color: '#be123c' }} />
          {!isCompetitorUser ? 'Competition Leaderboard' : isIndividualMode ? 'Leaderboard & Progress' : 'Our Team & Leaderboard'}
        </h1>
        <p style={{ color: '#64748b', fontSize: '0.95rem', margin: '0.3rem 0 0 0' }}>
          {!isCompetitorUser
            ? 'View live overall competition standings, accumulated team and competitor scores, and rankings.'
            : isIndividualMode
            ? 'Follow live rankings, accumulated points, and individual competition progress.'
            : 'Form a team of up to 3 competitors, track accumulated scores, and follow live rankings.'}
        </p>
      </div>

      {error && (
        <div style={{ padding: '0.9rem', borderRadius: '12px', background: '#fef2f2', color: '#dc2626', border: '1.5px solid #fca5a5', marginBottom: '1.5rem', fontWeight: 700, fontSize: '0.9rem' }}>
          ⚠️ {error}
        </div>
      )}

      {success && (
        <div style={{ padding: '0.9rem', borderRadius: '12px', background: '#f0fdf4', color: '#16a34a', border: '1.5px solid #86efac', marginBottom: '1.5rem', fontWeight: 700, fontSize: '0.9rem' }}>
          ✅ {success}
        </div>
      )}

      {/* INDIVIDUAL COMPETITOR HUD BANNER */}
      {isIndividualMode && (
        <div style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          borderRadius: '24px', padding: '2rem 2.25rem', color: '#ffffff',
          boxShadow: '0 12px 35px rgba(15, 23, 42, 0.15)', marginBottom: '2rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
              <img
                src={meDoc?.avatarUrl || meDoc?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`}
                alt=""
                style={{ width: '68px', height: '68px', borderRadius: '50%', border: '3.5px solid #be123c', objectFit: 'cover', background: '#ffffff', flexShrink: 0 }}
              />
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.35rem', flexWrap: 'wrap' }}>
                  <span style={{ background: '#be123c', color: '#ffffff', fontSize: '0.75rem', fontWeight: 900, padding: '0.2rem 0.65rem', borderRadius: '8px', textTransform: 'uppercase' }}>
                    {meDoc?.registeredTrack === 'pop_science' ? '🎥 Pop Videos Track' : '📰 Science Journalism Track'}
                  </span>
                  <span style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(4px)', color: '#ffffff', fontSize: '0.75rem', fontWeight: 800, padding: '0.2rem 0.65rem', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    👤 Individual Competitor
                  </span>
                </div>

                <h2 style={{ fontSize: '1.75rem', fontWeight: 900, margin: '0 0 0.35rem 0', fontFamily: "'Outfit', sans-serif" }}>
                  {meDoc?.name || user.username}
                </h2>

                {/* Unique Individual Competitor Code */}
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.6rem', background: 'rgba(255,255,255,0.1)', padding: '0.35rem 0.85rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.15)' }}>
                  <span style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>Competitor Code:</span>
                  <span style={{ fontWeight: 900, letterSpacing: '0.05em', color: '#fbbf24' }}>{myCompetitorCode}</span>
                  <button
                    onClick={() => copyCode(myCompetitorCode)}
                    style={{ background: 'none', border: 'none', color: copiedCode ? '#4ade80' : '#ffffff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.75rem', fontWeight: 800 }}
                  >
                    {copiedCode ? <Check size={14} /> : <Copy size={14} />}
                    {copiedCode ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>
            </div>

            {/* Individual Rank & Points */}
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <div style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(6px)', padding: '1rem 1.4rem', borderRadius: '18px', border: '1px solid rgba(255,255,255,0.12)', textAlign: 'center', minWidth: '110px' }}>
                <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase' }}>Rank</div>
                <div style={{ fontSize: '1.7rem', fontWeight: 900, color: '#f59e0b', marginTop: '0.1rem' }}>
                  #{myLeaderboardStat.rank}
                </div>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(6px)', padding: '1rem 1.4rem', borderRadius: '18px', border: '1px solid rgba(255,255,255,0.12)', textAlign: 'center', minWidth: '110px' }}>
                <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase' }}>Points</div>
                <div style={{ fontSize: '1.7rem', fontWeight: 900, color: '#38bdf8', marginTop: '0.1rem' }}>
                  {myLeaderboardStat.totalPoints} pts
                </div>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* TEAM CREATION / JOINING SECTION (Only shown for competitors who registered in Team mode and do not have a team yet) */}
      {showTeamSetup && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '2rem', marginBottom: '2rem' }}>
          
          {/* Create Team Card */}
          <div className="ft-card" style={{ padding: '2rem', background: '#ffffff', borderRadius: '24px', border: '1.5px solid #e2e8f0', boxShadow: '0 10px 30px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: '#fff1f2', color: '#be123c', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Sparkles size={24} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0f172a', margin: 0 }}>Create a New Team</h3>
                <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '0.1rem 0 0 0' }}>Start a team & invite up to 2 peers (Max 3 members)</p>
              </div>
            </div>

            <form onSubmit={handleCreateTeam}>
              <div className="ft-input-group" style={{ marginBottom: '1.5rem' }}>
                <label className="ft-label">Team Name / اسم الفريق *</label>
                <input
                  type="text"
                  className="ft-input"
                  required
                  value={createTeamName}
                  onChange={(e) => setCreateTeamName(e.target.value)}
                  placeholder="e.g. Quantum Communicators"
                />
              </div>

              <button
                type="submit"
                className="ft-btn ft-w-full"
                disabled={isSubmitting}
                style={{
                  background: 'linear-gradient(135deg, #be123c 0%, #9f1239 100%)', color: '#ffffff',
                  fontWeight: 800, padding: '0.75rem', borderRadius: '12px', border: 'none',
                  boxShadow: '0 4px 16px rgba(190, 18, 60, 0.3)', cursor: 'pointer'
                }}
              >
                {isSubmitting ? 'Creating Team...' : '🚀 Create Team'}
              </button>
            </form>
          </div>

          {/* Join Team Card */}
          <div className="ft-card" style={{ padding: '2rem', background: '#ffffff', borderRadius: '24px', border: '1.5px solid #e2e8f0', boxShadow: '0 10px 30px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <UserPlus size={24} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0f172a', margin: 0 }}>Join Existing Team</h3>
                <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '0.1rem 0 0 0' }}>Enter your team's 6-character invite code</p>
              </div>
            </div>

            <form onSubmit={handleJoinTeam}>
              <div className="ft-input-group" style={{ marginBottom: '1.5rem' }}>
                <label className="ft-label">Team Invite Code / كود الفريق *</label>
                <input
                  type="text"
                  className="ft-input"
                  required
                  value={joinCodeInput}
                  onChange={(e) => setJoinCodeInput(e.target.value)}
                  placeholder="e.g. SPARK-789X"
                  style={{ textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 800 }}
                />
              </div>

              <button
                type="submit"
                className="ft-btn ft-w-full"
                disabled={isSubmitting}
                style={{
                  background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', color: '#ffffff',
                  fontWeight: 800, padding: '0.75rem', borderRadius: '12px', border: 'none',
                  boxShadow: '0 4px 16px rgba(37, 99, 235, 0.3)', cursor: 'pointer'
                }}
              >
                {isSubmitting ? 'Joining...' : '🔗 Join Team'}
              </button>
            </form>
          </div>

        </div>
      )}

      {/* TEAM HUD HERO BANNER & TEAM MEMBERS GRID (Only shown if competitor is in a team) */}
      {myTeam && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', marginBottom: '2rem' }}>
          
          {/* Team HUD Hero Banner */}
          <div style={{
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
            borderRadius: '24px', padding: '2.25rem', color: '#ffffff',
            boxShadow: '0 12px 35px rgba(15, 23, 42, 0.15)', position: 'relative', overflow: 'hidden'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.5rem', position: 'relative', zIndex: 1 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                  <span style={{ background: '#be123c', color: '#ffffff', fontSize: '0.75rem', fontWeight: 900, padding: '0.25rem 0.75rem', borderRadius: '8px', textTransform: 'uppercase' }}>
                    {myTeam.track === 'pop_science' ? '🎥 Pop Videos Track' : '📰 Science Journalism Track'}
                  </span>
                  <span style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(4px)', color: '#ffffff', fontSize: '0.75rem', fontWeight: 800, padding: '0.25rem 0.75rem', borderRadius: '8px' }}>
                    👥 {(myTeam.members || []).length} / 3 Members
                  </span>
                </div>

                <h2 style={{ fontSize: '2rem', fontWeight: 900, margin: '0 0 0.5rem 0', fontFamily: "'Outfit', sans-serif" }}>
                  {myTeam.name}
                </h2>

                {/* Copyable Shared Team Code & Team ID */}
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.6rem', background: 'rgba(255,255,255,0.1)', padding: '0.4rem 0.9rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.15)' }}>
                    <span style={{ fontSize: '0.82rem', color: '#cbd5e1' }}>Team Invite Code:</span>
                    <span style={{ fontWeight: 900, letterSpacing: '0.05em', color: '#fbbf24' }}>{getTeamInviteCode(myTeam)}</span>
                    <button
                      onClick={() => copyCode(getTeamInviteCode(myTeam))}
                      style={{ background: 'none', border: 'none', color: copiedCode ? '#4ade80' : '#ffffff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.78rem', fontWeight: 800 }}
                    >
                      {copiedCode ? <Check size={14} /> : <Copy size={14} />}
                      {copiedCode ? 'Copied!' : 'Copy'}
                    </button>
                  </div>

                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(255,255,255,0.1)', padding: '0.4rem 0.9rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.15)', fontSize: '0.82rem', color: '#cbd5e1' }}>
                    <span>Team ID:</span>
                    <strong style={{ color: '#ffffff', fontWeight: 900 }}>{formatSimpleCode(myTeam.code, true)}</strong>
                  </div>
                </div>
              </div>

              {/* Team Rank & Total Points HUD */}
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(6px)', padding: '1rem 1.4rem', borderRadius: '18px', border: '1px solid rgba(255,255,255,0.12)', textAlign: 'center', minWidth: '120px' }}>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase' }}>Rank</div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#f59e0b', marginTop: '0.1rem' }}>
                    #{myLeaderboardStat.rank}
                  </div>
                </div>

                <div style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(6px)', padding: '1rem 1.4rem', borderRadius: '18px', border: '1px solid rgba(255,255,255,0.12)', textAlign: 'center', minWidth: '120px' }}>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase' }}>Team Points</div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#38bdf8', marginTop: '0.1rem' }}>
                    {myLeaderboardStat.totalPoints} pts
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Team Members Grid Section (Max 3 Members) */}
          <div className="ft-card" style={{ padding: '2rem', background: '#ffffff', borderRadius: '24px', border: '1.5px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '1.3rem', fontWeight: 900, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  👥 Team Members (Max 3)
                </h3>
                <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0.2rem 0 0 0' }}>
                  A team can have a maximum of 3 members collaborating in the competition.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                {(myTeam.members || []).length < 3 && (
                  <button
                    className="ft-btn"
                    onClick={() => setShowAddMemberModal(true)}
                    style={{
                      background: 'linear-gradient(135deg, #be123c 0%, #9f1239 100%)', color: '#ffffff',
                      fontWeight: 800, fontSize: '0.85rem', padding: '0.55rem 1.1rem', borderRadius: '12px',
                      border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem',
                      boxShadow: '0 4px 14px rgba(190, 18, 60, 0.3)'
                    }}
                  >
                    <Plus size={16} /> Add Member ({(myTeam.members || []).length}/3)
                  </button>
                )}

              </div>
            </div>

            {/* 3 Member Cards Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
              {(myTeam.members || []).map((m, idx) => {
                const memberDoc = allScientists.find(s => s.id === m.userId || s.username === m.username) || {};
                return (
                  <div key={m.userId || idx} style={{
                    padding: '1.25rem', borderRadius: '18px', background: '#f8fafc',
                    border: m.userId === user.id ? '2px solid #be123c' : '1.5px solid #e2e8f0',
                    boxShadow: '0 4px 14px rgba(0,0,0,0.02)', position: 'relative'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.85rem' }}>
                      <img
                        src={memberDoc.avatarUrl || memberDoc.avatar || m.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${m.username}`}
                        alt={m.name}
                        style={{ width: '56px', height: '56px', borderRadius: '50%', border: '3px solid #be123c', objectFit: 'cover', background: '#ffffff', flexShrink: 0 }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 900, fontSize: '1rem', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {m.name || memberDoc.name || m.username}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.1rem' }}>
                          @{m.username} {memberDoc.title ? `· ${memberDoc.title}` : ''}
                        </div>
                        <div style={{ marginTop: '0.35rem', display: 'flex', gap: '0.35rem', flexWrap: 'wrap', alignItems: 'center' }}>
                          <span style={{
                            fontSize: '0.7rem', fontWeight: 900, textTransform: 'uppercase', padding: '0.15rem 0.55rem', borderRadius: '6px',
                            background: m.role === 'Team Leader' ? '#fff1f2' : '#eff6ff',
                            color: m.role === 'Team Leader' ? '#be123c' : '#2563eb',
                            border: `1px solid ${m.role === 'Team Leader' ? '#fecdd3' : '#bfdbfe'}`
                          }}>
                            {m.role === 'Team Leader' ? '👑 Team Leader' : '👤 Team Member'}
                          </span>
                          <span style={{ fontSize: '0.7rem', fontWeight: 800, padding: '0.15rem 0.55rem', borderRadius: '6px', background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1' }}>
                            🏷️ Team Code: {myTeam.code}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div style={{ fontSize: '0.8rem', color: '#475569', borderTop: '1px dashed #cbd5e1', paddingTop: '0.65rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>Joined: {new Date(m.joinedAt || Date.now()).toLocaleDateString()}</span>
                      
                      {isLeader && m.userId !== user.id && (
                        <button
                          onClick={() => handleRemoveMember(m.userId)}
                          style={{ background: 'none', border: 'none', color: '#dc2626', fontSize: '0.78rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
                        >
                          <Trash2 size={13} /> Remove
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Empty Member Slot Cards (If < 3) */}
              {Array.from({ length: 3 - (myTeam.members || []).length }).map((_, idx) => (
                <div key={`empty-${idx}`} style={{
                  padding: '1.5rem', borderRadius: '18px', background: '#ffffff',
                  border: '2px dashed #cbd5e1', display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: '0.6rem', minHeight: '140px'
                }}>
                  <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: '#f1f5f9', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>
                    ➕
                  </div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#64748b' }}>
                    Empty Slot ({(myTeam.members || []).length + idx + 1}/3)
                  </div>
                  <button
                    onClick={() => setShowAddMemberModal(true)}
                    style={{ background: 'none', border: 'none', color: '#be123c', fontSize: '0.8rem', fontWeight: 800, cursor: 'pointer', textDecoration: 'underline' }}
                  >
                    Add Member
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SIDE-BY-SIDE SPLIT COMPETITION LEADERBOARDS (TRACK 1 & TRACK 2) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.75rem', alignItems: 'start' }}>
        
        {/* LEFT COLUMN: TRACK 1 POP SCIENCE VIDEOS */}
        <div className="ft-card" style={{ padding: '1.75rem', background: '#ffffff', borderRadius: '24px', border: '1.5px solid #fecdd3', boxShadow: '0 4px 16px rgba(190,18,60,0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '2px solid #fff1f2', paddingBottom: '0.85rem' }}>
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#9f1239', margin: '0 0 0.2rem 0', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <Trophy size={20} style={{ color: '#f59e0b' }} /> 🎥 Track 1: Pop Science Videos
              </h3>
              <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0 }}>
                Live rankings for visual, video & multimedia science communication competitors.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {popScienceLeaderboard.length === 0 ? (
              <div style={{ padding: '2rem 1rem', textAlign: 'center', background: '#fff1f2', borderRadius: '16px', border: '1px dashed #fecdd3' }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.3rem' }}>🎥</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#9f1239' }}>No Track 1 Entries Yet</div>
                <div style={{ fontSize: '0.78rem', color: '#881337', marginTop: '0.15rem' }}>
                  Pop science video scores will appear here as soon as judges evaluate submissions.
                </div>
              </div>
            ) : (
              popScienceLeaderboard.map((item, idx) => {
                const isMeOrMyTeam = myTeam ? item.id === myTeam.id : item.id === user.id;

                return (
                  <div key={item.id} style={{
                    padding: '1rem 1.15rem', borderRadius: '16px',
                    background: isMeOrMyTeam ? '#fff1f2' : '#f8fafc',
                    border: isMeOrMyTeam ? '2px solid #be123c' : '1px solid #e2e8f0',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem',
                    boxShadow: isMeOrMyTeam ? '0 4px 14px rgba(190, 18, 60, 0.12)' : '0 2px 6px rgba(0,0,0,0.02)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                      <span style={{
                        width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0,
                        background: idx === 0 ? '#fef3c7' : idx === 1 ? '#e2e8f0' : idx === 2 ? '#ffedd5' : '#f1f5f9',
                        color: idx === 0 ? '#b45309' : idx === 1 ? '#475569' : idx === 2 ? '#c2410c' : '#64748b',
                        fontWeight: 900, fontSize: '0.88rem', display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}>
                        #{idx + 1}
                      </span>

                      <div>
                        <div style={{ fontWeight: 900, fontSize: '0.95rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                          {item.name} 
                          {isMeOrMyTeam && <span style={{ color: '#be123c', fontSize: '0.75rem', fontWeight: 800 }}>(You)</span>}
                        </div>

                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.15rem', display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '0.68rem', fontWeight: 800, padding: '0.1rem 0.4rem', borderRadius: '6px', background: item.type === 'team' ? '#fff1f2' : '#eff6ff', color: item.type === 'team' ? '#be123c' : '#2563eb', border: `1px solid ${item.type === 'team' ? '#fecdd3' : '#bfdbfe'}` }}>
                            {item.type === 'team' ? `👥 Team (${item.membersCount})` : '👤 Solo'}
                          </span>
                          <span style={{ background: '#ffffff', padding: '0.05rem 0.35rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontWeight: 800, color: '#334155' }}>
                            🏷️ {item.code}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 900, fontSize: '1.15rem', color: '#0f172a' }}>
                        {item.totalPoints || 0} pts
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                        {item.submissionsCount} sub(s)
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: TRACK 2 SCIENCE JOURNALISM */}
        <div className="ft-card" style={{ padding: '1.75rem', background: '#ffffff', borderRadius: '24px', border: '1.5px solid #bfdbfe', boxShadow: '0 4px 16px rgba(37,99,235,0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '2px solid #eff6ff', paddingBottom: '0.85rem' }}>
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#1d4ed8', margin: '0 0 0.2rem 0', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <Trophy size={20} style={{ color: '#f59e0b' }} /> 📰 Track 2: Science Journalism
              </h3>
              <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0 }}>
                Live rankings for science journalism, investigation & written media competitors.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {journalismLeaderboard.length === 0 ? (
              <div style={{ padding: '2rem 1rem', textAlign: 'center', background: '#eff6ff', borderRadius: '16px', border: '1px dashed #bfdbfe' }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.3rem' }}>📰</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#1d4ed8' }}>No Track 2 Entries Yet</div>
                <div style={{ fontSize: '0.78rem', color: '#1e40af', marginTop: '0.15rem' }}>
                  Journalism scores will appear here as soon as judges evaluate submissions.
                </div>
              </div>
            ) : (
              journalismLeaderboard.map((item, idx) => {
                const isMeOrMyTeam = myTeam ? item.id === myTeam.id : item.id === user.id;

                return (
                  <div key={item.id} style={{
                    padding: '1rem 1.15rem', borderRadius: '16px',
                    background: isMeOrMyTeam ? '#eff6ff' : '#f8fafc',
                    border: isMeOrMyTeam ? '2px solid #2563eb' : '1px solid #e2e8f0',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem',
                    boxShadow: isMeOrMyTeam ? '0 4px 14px rgba(37, 99, 235, 0.12)' : '0 2px 6px rgba(0,0,0,0.02)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                      <span style={{
                        width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0,
                        background: idx === 0 ? '#fef3c7' : idx === 1 ? '#e2e8f0' : idx === 2 ? '#ffedd5' : '#f1f5f9',
                        color: idx === 0 ? '#b45309' : idx === 1 ? '#475569' : idx === 2 ? '#c2410c' : '#64748b',
                        fontWeight: 900, fontSize: '0.88rem', display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}>
                        #{idx + 1}
                      </span>

                      <div>
                        <div style={{ fontWeight: 900, fontSize: '0.95rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                          {item.name} 
                          {isMeOrMyTeam && <span style={{ color: '#2563eb', fontSize: '0.75rem', fontWeight: 800 }}>(You)</span>}
                        </div>

                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.15rem', display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '0.68rem', fontWeight: 800, padding: '0.1rem 0.4rem', borderRadius: '6px', background: item.type === 'team' ? '#fff1f2' : '#eff6ff', color: item.type === 'team' ? '#be123c' : '#2563eb', border: `1px solid ${item.type === 'team' ? '#fecdd3' : '#bfdbfe'}` }}>
                            {item.type === 'team' ? `👥 Team (${item.membersCount})` : '👤 Solo'}
                          </span>
                          <span style={{ background: '#ffffff', padding: '0.05rem 0.35rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontWeight: 800, color: '#334155' }}>
                            🏷️ {item.code}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 900, fontSize: '1.15rem', color: '#0f172a' }}>
                        {item.totalPoints || 0} pts
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                        {item.submissionsCount} sub(s)
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

      {/* MODAL: SEARCH & ADD MEMBER TO TEAM (MAX 3) */}
      {showAddMemberModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 2000,
          background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
        }}>
          <div className="ft-card ft-animate-in" style={{
            width: '100%', maxWidth: '520px', padding: '2rem', background: '#ffffff',
            borderRadius: '24px', boxShadow: '0 20px 50px rgba(0,0,0,0.25)', maxHeight: '90vh', overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ fontSize: '1.3rem', fontWeight: 900, color: '#0f172a', margin: 0, fontFamily: "'Outfit', sans-serif" }}>
                  👥 Add Team Member (Max 3)
                </h3>
                <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '0.2rem 0 0 0' }}>
                  Search for registered competitors or share your team code.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddMemberModal(false)}
                style={{ background: '#f1f5f9', border: 'none', width: '36px', height: '36px', borderRadius: '50%', fontSize: '1.1rem', fontWeight: 800, color: '#475569', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                ✕
              </button>
            </div>

            {/* Invite Code Share Card */}
            <div style={{ padding: '1rem', background: '#fff1f2', border: '1.5px solid #fecdd3', borderRadius: '16px', marginBottom: '1.25rem', textAlign: 'center' }}>
              <div style={{ fontSize: '0.82rem', color: '#be123c', fontWeight: 700 }}>Or share your Team Invite Code directly:</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#be123c', letterSpacing: '0.06em', margin: '0.3rem 0' }}>
                {getTeamInviteCode(myTeam)}
              </div>
              <button
                onClick={() => copyCode(getTeamInviteCode(myTeam))}
                className="ft-btn"
                style={{ background: '#ffffff', color: '#be123c', border: '1px solid #fecdd3', fontSize: '0.78rem', fontWeight: 800, padding: '0.35rem 0.8rem', borderRadius: '8px' }}
              >
                {copiedCode ? '✅ Copied Invite Code!' : '📋 Copy Invite Code'}
              </button>
            </div>

            {/* Competitor Search Input */}
            <div className="ft-input-group" style={{ marginBottom: '1rem' }}>
              <label className="ft-label">Search Competitors by Name / Username</label>
              <input
                type="text"
                className="ft-input"
                value={memberSearchQuery}
                onChange={(e) => setMemberSearchQuery(e.target.value)}
                placeholder="Type name or username..."
              />
            </div>

            {/* Competitors List */}
            <div style={{ maxHeight: '220px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {availableCompetitors.length === 0 ? (
                <div style={{ fontSize: '0.85rem', color: '#94a3b8', textAlign: 'center', padding: '1rem' }}>
                  No available unassigned competitors found.
                </div>
              ) : (
                availableCompetitors.map((s) => (
                  <div key={s.id} style={{
                    padding: '0.75rem 1rem', borderRadius: '12px', background: '#f8fafc',
                    border: '1px solid #cbd5e1', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      <img
                        src={s.avatarUrl || s.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${s.username}`}
                        alt=""
                        style={{ width: '36px', height: '36px', borderRadius: '50%', border: '2px solid #be123c', objectFit: 'cover' }}
                      />
                      <div>
                        <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0f172a' }}>{s.name || s.username}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>@{s.username} {s.department ? `· ${s.department}` : ''}</div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleAddMember(s)}
                      className="ft-btn"
                      style={{ background: '#059669', color: '#ffffff', fontSize: '0.78rem', fontWeight: 800, padding: '0.35rem 0.75rem', borderRadius: '8px', border: 'none', cursor: 'pointer' }}
                    >
                      Add +
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
