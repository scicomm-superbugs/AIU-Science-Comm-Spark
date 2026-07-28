import { useState, useEffect, useMemo, Fragment } from 'react';
import { useOutletContext } from 'react-router-dom';
import { db, firestore, getCollectionName } from './db';
import { useLiveCollection } from './db';
import { collection, getDocs } from 'firebase/firestore';
import { Search, Download, X, Users, User, Video, BookOpen, Layers, Shield, Trash2, Edit3, Sparkles, Eye } from 'lucide-react';
import { FT_DEPARTMENTS, FT_REG_STATUS_ICONS, FT_REG_STATUS_LABELS, FT_DEFAULT_REQUIRED_HOURS, normalizeTrackKey } from './ftConstants';
import './scicommspark.css';

export default function FTAdminCompetitors() {
  const context = useOutletContext() || {};
  const meDoc = context.meDoc;
  const userRole = context.userRole || 'master';

  const [competitors, setCompetitors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('All'); // All, teams, individuals
  const [trackFilter, setTrackFilter] = useState('All'); // All, pop_science, science_journalism
  const [expandedId, setExpandedId] = useState(null);

  const [editingCompetitor, setEditingCompetitor] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toast, setToast] = useState(null);
  const [allScientists, setAllScientists] = useState([]);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [addingToTeamModal, setAddingToTeamModal] = useState(null);
  const [adminAddSearch, setAdminAddSearch] = useState('');

  const teams = useLiveCollection('ft_teams') || [];
  const tracksList = useLiveCollection('ft_tracks') || [];
  const submissions = useLiveCollection('submissions') || [];
  const evaluations = useLiveCollection('ft_evaluations') || [];
  const submissionAssignments = useLiveCollection('submission_assignments') || [];

  const [editForm, setEditForm] = useState({
    name: '',
    username: '',
    email: '',
    universityId: '',
    title: '',
    role: 'competitor',
    registeredTrack: 'pop_science',
    department: '',
    avatarUrl: '',
    nationalId: '',
    institutionName: '',
    isAlameinStudent: true,
    competitorIdNumber: ''
  });

  // Load all users / scientists
  useEffect(() => {
    (async () => {
      try {
        const col = getCollectionName('scientists');
        const snap = await getDocs(collection(firestore, col));
        const allUsers = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setAllScientists(allUsers);
        const competitorList = allUsers.filter(u => u.role === 'competitor' || u.role === 'user' || !u.role);
        setCompetitors(competitorList);
      } catch (err) {
        console.error('Failed to load competitors:', err);
      }
      setLoading(false);
    })();
  }, []);

  // Helper for CSV downloading with UTF-8 BOM for Excel
  const downloadCSV = (filename, headers, rows) => {
    const escapeCell = (val) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const headerLine = headers.map(escapeCell).join(',');
    const rowLines = rows.map(row => row.map(escapeCell).join(','));
    
    const csvContent = '\uFEFF' + [headerLine, ...rowLines].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 1. Export Users & Competitors CSV
  const exportUsersCSV = () => {
    const headers = [
      'User Doc ID',
      'Competitor Code',
      'Full Name',
      'Username',
      'Email',
      'Phone / WhatsApp',
      'System Role',
      'Participation Mode',
      'Registered Track',
      'Team Name',
      'Team Code',
      'Team Members Count',
      'Institution / University',
      'Department',
      'Is Alamein Student',
      'National ID / ID Number',
      'University ID',
      'Account Created Date'
    ];

    const rows = allScientists.map(u => {
      const myTeam = teams.find(t => (t.members || []).some(m => m.userId === u.id || m.username === u.username || m.userId === u.username));
      const isTeam = Boolean(myTeam);
      const displayCode = u.competitorCode || formatSimpleCode(u.competitorIdNumber || u.id, isTeam);
      const trackLabel = normalizeTrackKey(u.registeredTrack) === 'science_journalism' ? 'Science Journalism' : 'Pop Science Videos';

      return [
        u.id || '',
        displayCode,
        u.name || u.username || 'Competitor',
        u.username || '',
        u.email || '',
        u.phone || u.whatsapp || '',
        u.role || 'competitor',
        isTeam ? 'Team' : 'Individual',
        trackLabel,
        myTeam?.name || 'N/A',
        myTeam?.code || 'N/A',
        myTeam?.members?.length || 1,
        u.institutionName || 'AIU',
        u.department || '',
        u.isAlameinStudent !== false ? 'Yes' : 'No',
        u.nationalId || u.competitorIdNumber || '',
        u.universityId || '',
        u.createdAt || ''
      ];
    });

    downloadCSV('AIU_SciComm_All_Users_And_Competitors', headers, rows);
  };

  // 2. Export Judges Information CSV
  const exportJudgesCSV = () => {
    const headers = [
      'Judge Doc ID',
      'Judge Full Name',
      'Username',
      'Email',
      'Phone / WhatsApp',
      'System Role Key',
      'Role Title Label',
      'Track Expertise',
      'Assigned Submissions Count',
      'Evaluations Completed Count',
      'Total Evaluation Points Awarded',
      'Department / Title',
      'Account Created Date'
    ];

    const judges = allScientists.filter(u => ['academic_judge', 'scicomm_judge', 'trainer_judge', 'admin', 'master'].includes(u.role));

    const rows = judges.map(j => {
      const jIds = [j.id, j.username, j.email].filter(Boolean).map(x => String(x).toLowerCase());
      
      const assignedSubs = submissionAssignments.filter(a => 
        (a.assignedJudgeIds || []).some(jid => jIds.includes(String(jid).toLowerCase()))
      );

      const evals = evaluations.filter(e => jIds.includes(String(e.judgeId).toLowerCase()));
      const totalPoints = evals.reduce((sum, e) => sum + (Number(e.totalScore) || 0), 0);

      const roleLabel = (j.role === 'admin' || j.role === 'master')
        ? 'Master Evaluation Administrator 🛡️'
        : 'Judge';

      return [
        j.id || '',
        j.name || j.username || 'Judge',
        j.username || '',
        j.email || '',
        j.phone || j.whatsapp || '',
        j.role || '',
        roleLabel,
        j.registeredTrack ? (normalizeTrackKey(j.registeredTrack) === 'science_journalism' ? 'Science Journalism' : 'Pop Science') : 'All Competition Tracks',
        assignedSubs.length,
        evals.length,
        totalPoints,
        j.department || j.title || 'N/A',
        j.createdAt || ''
      ];
    });

    downloadCSV('AIU_SciComm_All_Judges_Information', headers, rows);
  };

  // 3. Export Submissions CSV
  const exportSubmissionsCSV = () => {
    const headers = [
      'Submission Doc ID',
      'Stage ID',
      'Stage Title',
      'Competition Track',
      'Competitor Code',
      'Competitor / Team Name',
      'Competitor Email',
      'Competitor Phone',
      'Submission Title',
      'Deliverable Type',
      'Video URL',
      'PDF Article URL / Document File',
      'Status',
      'Submitted Timestamp',
      'Assigned Judges Count',
      'Evaluations Conducted Count',
      'Average Total Score (pts)'
    ];

    const rows = submissions.map(sub => {
      const compDoc = allScientists.find(s => s.id === sub.competitorId || s.email === sub.competitorEmail);
      const teamDoc = teams.find(t => t.id === sub.teamId);

      const displayCode = sub.teamId 
        ? formatSimpleCode(sub.teamCode || sub.teamId, true)
        : formatSimpleCode(compDoc?.competitorCode || compDoc?.competitorIdNumber || sub.competitorId, false);

      const realTrack = normalizeTrackKey(compDoc?.registeredTrack || teamDoc?.track || sub.track);
      const trackLabel = realTrack === 'science_journalism' ? 'Science Journalism' : 'Pop Science Videos';

      const matchedEvals = evaluations.filter(e => Number(e.stageId) === Number(sub.stageId) && (e.competitorId === sub.competitorId || e.teamId === sub.teamId));
      const avgScore = matchedEvals.length > 0
        ? (matchedEvals.reduce((s, e) => s + (Number(e.totalScore) || 0), 0) / matchedEvals.length).toFixed(1)
        : 'Pending';

      const targetId = sub.teamId || sub.competitorId;
      const assignment = submissionAssignments.find(a => Number(a.stageId) === Number(sub.stageId) && (a.targetId === targetId || (a.id && targetId && a.id.includes(targetId))));

      return [
        sub.id || '',
        sub.stageId || 1,
        `Stage ${sub.stageId || 1}`,
        trackLabel,
        displayCode,
        sub.teamName || sub.competitorName || compDoc?.name || 'Competitor',
        sub.competitorEmail || compDoc?.email || '',
        compDoc?.phone || compDoc?.whatsapp || sub.competitorPhone || '',
        sub.title || 'Untitled Project',
        realTrack === 'science_journalism' ? 'Science Article PDF' : 'Pop Science Video',
        sub.videoUrl || '',
        sub.fileUrl || sub.pdfUrl || '',
        sub.status || 'submitted',
        sub.submittedAt || '',
        assignment?.assignedJudgeIds?.length || 0,
        matchedEvals.length,
        avgScore
      ];
    });

    downloadCSV('AIU_SciComm_All_Submissions', headers, rows);
  };

  // 4. Export Evaluations CSV
  const exportEvaluationsCSV = () => {
    const headers = [
      'Evaluation Doc ID',
      'Stage ID',
      'Stage Title',
      'Competition Track',
      'Competitor / Team Code',
      'Competitor / Team Name',
      'Judge Doc ID',
      'Judge Name',
      'Judge System Role',
      'Total Awarded Score (pts)',
      'Scientific Accuracy Points (c1)',
      'Hook & Visual Engagement Points (c2)',
      'Criteria Breakdown JSON',
      'Judge Comments & Feedback',
      'Evaluated Timestamp'
    ];

    const rows = evaluations.map(ev => {
      const judgeDoc = allScientists.find(s => s.id === ev.judgeId || s.username === ev.judgeId);
      const compDoc = allScientists.find(s => s.id === ev.competitorId);
      const displayCode = ev.teamId 
        ? formatSimpleCode(ev.teamId, true) 
        : formatSimpleCode(compDoc?.competitorCode || ev.competitorId, false);

      const trackLabel = normalizeTrackKey(ev.track) === 'science_journalism' ? 'Science Journalism' : 'Pop Science Videos';

      return [
        ev.id || '',
        ev.stageId || 1,
        `Stage ${ev.stageId || 1}`,
        trackLabel,
        displayCode,
        ev.competitorName || compDoc?.name || 'Competitor',
        ev.judgeId || '',
        judgeDoc?.name || judgeDoc?.username || ev.judgeName || 'Judge',
        judgeDoc?.role || 'judge',
        ev.totalScore || 0,
        ev.criteriaScores?.c1 || 0,
        ev.criteriaScores?.c2 || 0,
        JSON.stringify(ev.criteriaScores || {}),
        ev.comments || '',
        ev.evaluatedAt || ev.timestamp || ''
      ];
    });

    downloadCSV('AIU_SciComm_All_Evaluations_And_Grading', headers, rows);
  };

  const formatSimpleCode = (rawCode, isTeam = false) => {
    if (!rawCode) return isTeam ? 'T-101' : 'C-101';
    if (/^(T-|C-)\d{3,4}$/.test(rawCode)) return rawCode;
    let hash = 0;
    for (let i = 0; i < String(rawCode).length; i++) {
      hash = (hash + String(rawCode).charCodeAt(i)) % 900;
    }
    return (isTeam ? 'T-' : 'C-') + (100 + hash);
  };

  const getTeamInviteCode = (t) => {
    if (!t) return '';
    if (t.inviteCode) return t.inviteCode;
    const numStr = String(t.code || t.id || '101').replace(/\D/g, '') || '101';
    return `SPARK-${numStr}X`;
  };

  // Role Filter State
  const [roleFilter, setRoleFilter] = useState('All'); // All, competitor, judge, admin, teams, individuals
  const [overviewModalDoc, setOverviewModalDoc] = useState(null);

  // Unified List: Group Teams + Competitors + Judges + Admins + Staff
  const unifiedList = useMemo(() => {
    // 1. Teams Entries
    const teamEntries = teams.map(t => {
      const memberUserIds = (t.members || []).map(m => m.userId).filter(Boolean);
      const memberUsernames = (t.members || []).map(m => m.username).filter(Boolean);

      const memberDocs = allScientists.filter(c => 
        memberUserIds.includes(c.id) || 
        memberUsernames.includes(c.username)
      );

      const depts = [...new Set(memberDocs.map(m => m.department).filter(Boolean))].join(', ') || 'Computer Science & AI';
      const insts = [...new Set(memberDocs.map(m => m.institutionName).filter(Boolean))].join(', ') || 'Alamein International University';

      return {
        id: t.id,
        type: 'team',
        category: 'team',
        roleLabel: '👥 Competition Team',
        displayId: formatSimpleCode(t.code, true),
        teamInviteCode: t.inviteCode || getTeamInviteCode(t),
        name: t.name,
        track: t.track || 'pop_science',
        members: t.members || [],
        memberDocs,
        department: depts,
        institutionName: insts,
        createdAt: t.createdAt
      };
    });

    // 2. All Individual Users (Competitors, Judges, Admins, Staff)
    const userEntries = allScientists.map(c => {
      const myTeam = teams.find(t => (t.members || []).some(m => m.userId === c.id || m.username === c.username));
      const isTeamMember = Boolean(myTeam);

      let cat = 'competitor';
      let roleLabel = '👤 Competitor';
      const isCompetitorRole = !c.role || c.role === 'competitor' || c.role === 'user';
      if (c.role === 'academic_judge') {
        cat = 'judge';
        roleLabel = '⚖️ Judge';
      } else if (c.role === 'scicomm_judge') {
        cat = 'judge';
        roleLabel = '⚖️ Judge';
      } else if (c.role === 'judge') {
        cat = 'judge';
        roleLabel = '⚖️ Judge';
      } else if (c.role === 'trainer_judge') {
        cat = 'judge';
        roleLabel = '🎓 Trainer & Judge (Dual)';
      } else if (c.role === 'admin' || c.role === 'master' || c.role === 'system_administrator') {
        cat = 'admin';
        roleLabel = '👑 Master Admin';
      } else if (c.role === 'trainer') {
        cat = 'admin';
        roleLabel = '🎓 Academic Trainer';
      }

      const rawCode = c.competitorCode || c.competitorIdNumber || c.employeeId || c.universityId || c.id;
      const displayId = c.competitorCode || formatSimpleCode(rawCode, isTeamMember);

      return {
        id: c.id,
        type: isTeamMember ? 'team_member' : 'individual',
        category: cat,
        roleLabel,
        isCompetitorRole,
        displayId,
        name: c.name || c.username || 'User',
        email: c.email || '',
        phone: c.phone || c.whatsapp || '—',
        username: c.username,
        role: c.role || 'competitor',
        avatar: c.avatarUrl || c.avatar,
        track: isCompetitorRole ? (c.registeredTrack || 'pop_science') : (c.registeredTrack || null),
        department: c.department || 'Computer Science & AI',
        institutionName: c.institutionName || (c.isAlameinStudent !== false ? 'Alamein International University' : '—'),
        nationalId: c.nationalId || '—',
        isAlameinStudent: c.isAlameinStudent !== false,
        participationMode: isCompetitorRole ? (c.participationMode || (isTeamMember ? 'team' : 'individual')) : null,
        myTeam,
        rawDoc: c
      };
    });

    return [...teamEntries, ...userEntries];
  }, [teams, allScientists]);

  // Filter unified list
  const filteredList = useMemo(() => {
    return unifiedList.filter(item => {
      const matchSearch = !search ||
        item.name?.toLowerCase().includes(search.toLowerCase()) ||
        item.displayId?.toLowerCase().includes(search.toLowerCase()) ||
        item.email?.toLowerCase().includes(search.toLowerCase()) ||
        item.roleLabel?.toLowerCase().includes(search.toLowerCase()) ||
        item.members?.some(m => m.name?.toLowerCase().includes(search.toLowerCase()) || m.username?.toLowerCase().includes(search.toLowerCase()));

      const matchType = typeFilter === 'All' ||
        (typeFilter === 'teams' && item.type === 'team') ||
        (typeFilter === 'individuals' && (item.type === 'individual' || item.type === 'team_member'));

      const matchRole = roleFilter === 'All' ||
        (roleFilter === 'competitor' && item.category === 'competitor') ||
        (roleFilter === 'judge' && item.category === 'judge') ||
        (roleFilter === 'admin' && item.category === 'admin') ||
        (roleFilter === 'teams' && item.type === 'team') ||
        (roleFilter === 'individuals' && item.type !== 'team');

      const matchTrack = trackFilter === 'All' || item.track === trackFilter || !item.track;

      return matchSearch && matchType && matchRole && matchTrack;
    });
  }, [unifiedList, search, typeFilter, roleFilter, trackFilter]);

  // Summary Counts
  const totalEntries = unifiedList.length;
  const teamsCount = unifiedList.filter(i => i.type === 'team').length;
  const competitorsCount = unifiedList.filter(i => i.category === 'competitor').length;
  const judgesCount = unifiedList.filter(i => i.category === 'judge').length;
  const adminsCount = unifiedList.filter(i => i.category === 'admin').length;
  const track1Count = unifiedList.filter(i => i.track === 'pop_science').length;
  const track2Count = unifiedList.filter(i => i.track === 'science_journalism').length;

  // Export CSV
  const exportCSV = () => {
    const headers = ['Type', 'ID Number', 'Name', 'Phone / WhatsApp', 'Track', 'Department / Institution', 'Members Count'];
    const rows = filteredList.map(i => {
      let phoneStr = '';
      if (i.type === 'team') {
        const memberPhones = (i.memberDocs || []).map(m => m.phone || m.whatsapp).filter(Boolean);
        phoneStr = memberPhones.length > 0 ? memberPhones.join('; ') : '—';
      } else {
        phoneStr = i.phone || i.rawDoc?.phone || i.rawDoc?.whatsapp || '—';
      }

      return [
        i.type === 'team' ? 'Team' : 'Individual',
        `"${i.displayId || ''}"`,
        `"${i.name || ''}"`,
        `"${phoneStr}"`,
        `"${i.track === 'pop_science' ? 'Pop Videos' : 'Science Journalism'}"`,
        `"${i.department || i.institutionName || ''}"`,
        i.type === 'team' ? (i.members || []).length : 1
      ];
    });
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `competition_participants_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const openEditModal = (competitor) => {
    setEditingCompetitor(competitor);
    const myTeamDoc = teams.find(t => (t.members || []).some(m => m.userId === competitor.id || m.username === competitor.username));
    
    let formattedId = '';
    if (myTeamDoc) {
      formattedId = formatSimpleCode(myTeamDoc.code, true);
    } else {
      const raw = competitor.competitorCode || competitor.competitorIdNumber || competitor.universityId || competitor.id;
      formattedId = formatSimpleCode(raw, false);
    }

    setEditForm({
      name: competitor.name || '',
      username: competitor.username || '',
      email: competitor.email || '',
      universityId: competitor.universityId || '',
      title: competitor.title || '',
      role: competitor.role || 'competitor',
      participationMode: competitor.participationMode || (myTeamDoc ? 'team' : 'individual'),
      registeredTrack: competitor.registeredTrack || 'pop_science',
      department: competitor.department || '',
      avatarUrl: competitor.avatarUrl || competitor.avatar || '',
      nationalId: competitor.nationalId || '',
      institutionName: competitor.institutionName || '',
      isAlameinStudent: competitor.isAlameinStudent !== false,
      competitorIdNumber: formattedId,
      password: competitor.password || ''
    });
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editForm.email || !editForm.email.includes('@')) {
      alert('Please enter a valid email address.');
      return;
    }
    try {
      let updatedId = editForm.competitorIdNumber.trim();
      if (editForm.participationMode === 'individual' && !updatedId.startsWith('C-')) {
        updatedId = formatSimpleCode(updatedId || editingCompetitor.id, false);
      }

      const updates = {
        name: editForm.name.trim(),
        username: editForm.username.trim(),
        email: editForm.email.trim().toLowerCase(),
        universityId: editForm.universityId.trim(),
        title: editForm.title.trim(),
        role: editForm.role,
        participationMode: editForm.participationMode,
        registeredTrack: editForm.registeredTrack,
        department: editForm.department,
        avatarUrl: editForm.avatarUrl,
        nationalId: editForm.nationalId.trim(),
        institutionName: editForm.institutionName.trim(),
        isAlameinStudent: editForm.isAlameinStudent,
        competitorIdNumber: updatedId
      };

      if (editForm.password && editForm.password.trim()) {
        updates.password = editForm.password.trim();
      }

      await db.scientists.update(editingCompetitor.id, updates);

      // If switched to individual mode, remove competitor from any existing team
      if (editForm.participationMode === 'individual') {
        const myTeamDoc = teams.find(t => (t.members || []).some(m => m.userId === editingCompetitor.id || m.username === editingCompetitor.username));
        if (myTeamDoc) {
          const updatedMembers = (myTeamDoc.members || []).filter(m => m.userId !== editingCompetitor.id && m.username !== editingCompetitor.username);
          if (updatedMembers.length === 0) {
            await db.ft_teams.delete(myTeamDoc.id);
          } else {
            let newLeaderId = myTeamDoc.leaderId;
            let newLeaderUsername = myTeamDoc.leaderUsername;
            if (myTeamDoc.leaderId === editingCompetitor.id && updatedMembers.length > 0) {
              updatedMembers[0].role = 'Team Leader';
              newLeaderId = updatedMembers[0].userId;
              newLeaderUsername = updatedMembers[0].username;
            }
            await db.ft_teams.update(myTeamDoc.id, {
              members: updatedMembers,
              leaderId: newLeaderId,
              leaderUsername: newLeaderUsername
            });
          }
        }
      }
      
      // Synchronize team track if competitor belongs to a team
      const myTeamDoc = teams.find(t => (t.members || []).some(m => m.userId === editingCompetitor.id || m.username === editingCompetitor.username));
      if (myTeamDoc && editForm.registeredTrack !== myTeamDoc.track) {
        await db.ft_teams.update(myTeamDoc.id, { track: editForm.registeredTrack });
        setTeams(prev => prev.map(t => t.id === myTeamDoc.id ? { ...t, track: editForm.registeredTrack } : t));
      }

      // Update local state
      setCompetitors(prev => prev.map(c => c.id === editingCompetitor.id ? { ...c, ...updates } : c));
      setEditingCompetitor(null);
      setToast({ type: 'success', text: 'Competitor details, track & mode updated successfully!' });
      setTimeout(() => setToast(null), 3000);
    } catch (err) {
      alert('Failed to update competitor: ' + err.message);
    }
  };

  const toggleParticipationMode = async (scientistDoc) => {
    if (!scientistDoc || !scientistDoc.id) return;
    const currentMode = scientistDoc.participationMode || 'team';
    const newMode = currentMode === 'team' ? 'individual' : 'team';
    const actionLabel = newMode === 'individual'
      ? `Switch "${scientistDoc.name || scientistDoc.username}" to Individual Mode? (They will be removed from any team)`
      : `Switch "${scientistDoc.name || scientistDoc.username}" to Team Mode? (They will be able to create or join teams)`;

    if (!window.confirm(actionLabel)) return;

    try {
      await db.scientists.update(scientistDoc.id, { participationMode: newMode });

      if (newMode === 'individual') {
        const myTeamDoc = teams.find(t => (t.members || []).some(m => m.userId === scientistDoc.id || m.username === scientistDoc.username));
        if (myTeamDoc) {
          const updatedMembers = (myTeamDoc.members || []).filter(m => m.userId !== scientistDoc.id && m.username !== scientistDoc.username);
          if (updatedMembers.length === 0) {
            await db.ft_teams.delete(myTeamDoc.id);
          } else {
            let newLeaderId = myTeamDoc.leaderId;
            let newLeaderUsername = myTeamDoc.leaderUsername;
            if (myTeamDoc.leaderId === scientistDoc.id && updatedMembers.length > 0) {
              updatedMembers[0].role = 'Team Leader';
              newLeaderId = updatedMembers[0].userId;
              newLeaderUsername = updatedMembers[0].username;
            }
            await db.ft_teams.update(myTeamDoc.id, {
              members: updatedMembers,
              leaderId: newLeaderId,
              leaderUsername: newLeaderUsername
            });
          }
        }
      }

      setCompetitors(prev => prev.map(c => c.id === scientistDoc.id ? { ...c, participationMode: newMode } : c));
      setToast({ type: 'success', text: `Switched "${scientistDoc.name || scientistDoc.username}" to ${newMode === 'team' ? 'Team' : 'Individual'} mode!` });
      setTimeout(() => setToast(null), 3000);
    } catch (err) {
      alert('Failed to switch participation mode: ' + err.message);
    }
  };

  const toggleTrack = async (itemOrDoc) => {
    if (!itemOrDoc) return;

    if (itemOrDoc.type === 'team') {
      const currentTrack = itemOrDoc.track || 'pop_science';
      const newTrack = currentTrack === 'pop_science' ? 'science_journalism' : 'pop_science';
      const newTrackLabel = newTrack === 'pop_science' ? 'Pop Science Videos (Track 1)' : 'Science Journalism (Track 2)';

      if (!window.confirm(`Switch team "${itemOrDoc.name}" and all its members to ${newTrackLabel}?`)) return;

      try {
        await db.ft_teams.update(itemOrDoc.id, { track: newTrack });

        // Synchronize all member scientist docs to the new track
        const memberIds = (itemOrDoc.members || []).map(m => m.userId).filter(Boolean);
        for (const mId of memberIds) {
          await db.scientists.update(mId, { registeredTrack: newTrack });
        }

        setTeams(prev => prev.map(t => t.id === itemOrDoc.id ? { ...t, track: newTrack } : t));
        setCompetitors(prev => prev.map(c => memberIds.includes(c.id) ? { ...c, registeredTrack: newTrack } : c));
        setToast({ type: 'success', text: `Switched team "${itemOrDoc.name}" to ${newTrackLabel}!` });
        setTimeout(() => setToast(null), 3000);
      } catch (err) {
        alert('Failed to switch team track: ' + err.message);
      }
    } else {
      const scientistDoc = itemOrDoc.rawDoc || itemOrDoc;
      if (!scientistDoc || !scientistDoc.id) return;

      const currentTrack = scientistDoc.registeredTrack || 'pop_science';
      const newTrack = currentTrack === 'pop_science' ? 'science_journalism' : 'pop_science';
      const newTrackLabel = newTrack === 'pop_science' ? 'Pop Science Videos (Track 1)' : 'Science Journalism (Track 2)';

      if (!window.confirm(`Switch "${scientistDoc.name || scientistDoc.username}" track to ${newTrackLabel}?`)) return;

      try {
        await db.scientists.update(scientistDoc.id, { registeredTrack: newTrack });

        // If competitor belongs to a team, synchronize the team's track as well
        const myTeamDoc = teams.find(t => (t.members || []).some(m => m.userId === scientistDoc.id || m.username === scientistDoc.username));
        if (myTeamDoc) {
          await db.ft_teams.update(myTeamDoc.id, { track: newTrack });
          setTeams(prev => prev.map(t => t.id === myTeamDoc.id ? { ...t, track: newTrack } : t));
        }

        setCompetitors(prev => prev.map(c => c.id === scientistDoc.id ? { ...c, registeredTrack: newTrack } : c));
        setToast({ type: 'success', text: `Switched "${scientistDoc.name || scientistDoc.username}" to ${newTrackLabel}!` });
        setTimeout(() => setToast(null), 3000);
      } catch (err) {
        alert('Failed to switch track: ' + err.message);
      }
    }
  };

  const removeMemberFromTeam = async (teamItem, memberObj, memberDoc) => {
    if (!teamItem) return;
    const mId = memberDoc?.id || memberObj?.userId;
    const mUsername = memberObj?.username || memberDoc?.username;
    const mName = memberDoc?.name || memberObj?.name || mUsername || 'competitor';

    if (!window.confirm(`Remove "${mName}" from team "${teamItem.name}"? (Status will change to Individual Competitor)`)) return;

    try {
      const updatedMembers = (teamItem.members || []).filter(m => m.userId !== mId && m.username !== mUsername);

      if (updatedMembers.length === 0) {
        await db.ft_teams.delete(teamItem.id);
      } else {
        let newLeaderId = teamItem.leaderId;
        let newLeaderUsername = teamItem.leaderUsername;
        if ((teamItem.leaderId === mId || teamItem.leaderUsername === mUsername) && updatedMembers.length > 0) {
          updatedMembers[0].role = 'Team Leader';
          newLeaderId = updatedMembers[0].userId;
          newLeaderUsername = updatedMembers[0].username;
        }
        await db.ft_teams.update(teamItem.id, {
          members: updatedMembers,
          leaderId: newLeaderId,
          leaderUsername: newLeaderUsername
        });
      }

      if (mId) {
        await db.scientists.update(mId, { participationMode: 'individual' });
        setCompetitors(prev => prev.map(c => c.id === mId ? { ...c, participationMode: 'individual' } : c));
      }

      setToast({ type: 'success', text: `Removed "${mName}" from team and set to Individual mode!` });
      setTimeout(() => setToast(null), 3000);
    } catch (err) {
      alert('Failed to remove member: ' + err.message);
    }
  };

  const addMemberToTeam = async (targetTeam, candidateCompetitor) => {
    if (!targetTeam || !candidateCompetitor) return;
    if ((targetTeam.members || []).length >= 3) {
      alert('This team has reached its maximum capacity of 3 members.');
      return;
    }

    const candName = candidateCompetitor.name || candidateCompetitor.username;
    if (!window.confirm(`Add "${candName}" to team "${targetTeam.name}"?`)) return;

    try {
      const newMemberObj = {
        userId: candidateCompetitor.id,
        name: candidateCompetitor.name || candidateCompetitor.username,
        username: candidateCompetitor.username,
        avatar: candidateCompetitor.avatarUrl || candidateCompetitor.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${candidateCompetitor.username}`,
        role: 'Team Member',
        joinedAt: new Date().toISOString()
      };

      const updatedMembers = [...(targetTeam.members || []), newMemberObj];

      await db.ft_teams.update(targetTeam.id, { members: updatedMembers });
      await db.scientists.update(candidateCompetitor.id, {
        participationMode: 'team',
        registeredTrack: targetTeam.track || candidateCompetitor.registeredTrack || 'pop_science'
      });

      setCompetitors(prev => prev.map(c => c.id === candidateCompetitor.id ? {
        ...c,
        participationMode: 'team',
        registeredTrack: targetTeam.track || c.registeredTrack
      } : c));

      setAddingToTeamModal(null);
      setToast({ type: 'success', text: `Added "${candName}" to team "${targetTeam.name}"!` });
      setTimeout(() => setToast(null), 3000);
    } catch (err) {
      alert('Failed to add member to team: ' + err.message);
    }
  };

  const availableForAdminAdd = useMemo(() => {
    if (!addingToTeamModal) return [];
    const teamMemberUserIds = (addingToTeamModal.members || []).map(m => m.userId).filter(Boolean);
    const teamMemberUsernames = (addingToTeamModal.members || []).map(m => m.username).filter(Boolean);

    return competitors.filter(c => {
      const isAlreadyInTeam = teamMemberUserIds.includes(c.id) || teamMemberUsernames.includes(c.username);
      const isRoleEligible = !c.role || c.role === 'competitor' || c.role === 'user';
      const displayId = formatSimpleCode(c.competitorCode || c.competitorIdNumber || c.universityId || c.id, false);
      const matchesSearch = !adminAddSearch || 
        c.name?.toLowerCase().includes(adminAddSearch.toLowerCase()) ||
        c.username?.toLowerCase().includes(adminAddSearch.toLowerCase()) ||
        c.email?.toLowerCase().includes(adminAddSearch.toLowerCase()) ||
        displayId.toLowerCase().includes(adminAddSearch.toLowerCase());

      return !isAlreadyInTeam && isRoleEligible && matchesSearch;
    }).map(c => ({
      ...c,
      rawDoc: c,
      displayId: formatSimpleCode(c.competitorCode || c.competitorIdNumber || c.universityId || c.id, false)
    }));
  }, [addingToTeamModal, competitors, adminAddSearch]);

  const handleDeleteEntry = async (item) => {
    if (!window.confirm(`Are you sure you want to delete ${item.type === 'team' ? 'team' : 'competitor'} "${item.name}"?`)) return;
    setIsDeleting(true);
    try {
      if (item.type === 'team') {
        await db.ft_teams.delete(item.id);
      } else {
        await db.scientists.delete(item.id);
        setCompetitors(prev => prev.filter(c => c.id !== item.id));
      }
      setToast({ type: 'success', text: 'Entry deleted successfully!' });
      setTimeout(() => setToast(null), 3000);
    } catch (err) {
      alert('Failed to delete entry: ' + err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="ft-animate-in">
      {/* Top Header */}
      <div className="ft-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="ft-page-title">Users, Teams & Roles Overview</h1>
          <p className="ft-page-subtitle">Manage competition participants, team groups, assigned tracks, and competitor profiles.</p>
        </div>
        {['admin', 'master'].includes(userRole) && (
          <div style={{ position: 'relative' }}>
            <button 
              type="button"
              onClick={() => setExportMenuOpen(!exportMenuOpen)} 
              className="ft-btn ft-btn-primary" 
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800, padding: '0.65rem 1.25rem', borderRadius: '12px', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', color: '#ffffff', border: 'none', boxShadow: '0 4px 14px rgba(15,23,42,0.25)', cursor: 'pointer' }}
            >
              <Download size={16} /> Export CSV Reports ▾
            </button>

            {exportMenuOpen && (
              <div 
                style={{
                  position: 'absolute', top: '115%', right: 0, width: '310px',
                  background: '#ffffff', border: '1.5px solid #e2e8f0', borderRadius: '16px',
                  boxShadow: '0 20px 40px -10px rgba(0,0,0,0.25)', zIndex: 99999, overflow: 'hidden',
                  padding: '0.5rem'
                }}
              >
                <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 900, textTransform: 'uppercase', padding: '0.5rem 0.75rem 0.25rem 0.75rem', letterSpacing: '0.05em' }}>
                  🛡️ Admin CSV Excel Data Exports
                </div>

                <button 
                  type="button"
                  onClick={() => { exportUsersCSV(); setExportMenuOpen(false); }}
                  style={{ width: '100%', textAlign: 'left', padding: '0.65rem 0.75rem', borderRadius: '8px', border: 'none', background: 'transparent', cursor: 'pointer', fontWeight: 700, fontSize: '0.84rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.55rem' }}
                >
                  👥 Export All Users & Competitors (CSV)
                </button>

                <button 
                  type="button"
                  onClick={() => { exportJudgesCSV(); setExportMenuOpen(false); }}
                  style={{ width: '100%', textAlign: 'left', padding: '0.65rem 0.75rem', borderRadius: '8px', border: 'none', background: 'transparent', cursor: 'pointer', fontWeight: 700, fontSize: '0.84rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.55rem' }}
                >
                  🎙️ Export All Judges Information (CSV)
                </button>

                <button 
                  type="button"
                  onClick={() => { exportSubmissionsCSV(); setExportMenuOpen(false); }}
                  style={{ width: '100%', textAlign: 'left', padding: '0.65rem 0.75rem', borderRadius: '8px', border: 'none', background: 'transparent', cursor: 'pointer', fontWeight: 700, fontSize: '0.84rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.55rem' }}
                >
                  📤 Export All Submissions (CSV)
                </button>

                <button 
                  type="button"
                  onClick={() => { exportEvaluationsCSV(); setExportMenuOpen(false); }}
                  style={{ width: '100%', textAlign: 'left', padding: '0.65rem 0.75rem', borderRadius: '8px', border: 'none', background: 'transparent', cursor: 'pointer', fontWeight: 700, fontSize: '0.84rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.55rem' }}
                >
                  🏅 Export All Evaluations & Grading (CSV)
                </button>

                <div style={{ height: '1px', background: '#f1f5f9', margin: '0.35rem 0' }} />

                <button 
                  type="button"
                  onClick={() => { 
                    exportUsersCSV(); 
                    setTimeout(exportJudgesCSV, 300); 
                    setTimeout(exportSubmissionsCSV, 600); 
                    setTimeout(exportEvaluationsCSV, 900); 
                    setExportMenuOpen(false); 
                  }}
                  style={{ width: '100%', textAlign: 'left', padding: '0.7rem 0.75rem', borderRadius: '8px', border: 'none', background: '#f0fdf4', color: '#16a34a', cursor: 'pointer', fontWeight: 900, fontSize: '0.84rem', display: 'flex', alignItems: 'center', gap: '0.55rem' }}
                >
                  📦 Download Full Master Suite (All 4 CSVs)
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {toast && (
        <div style={{ padding: '0.9rem', borderRadius: '12px', background: toast.type === 'success' ? '#f0fdf4' : '#fef2f2', color: toast.type === 'success' ? '#16a34a' : '#dc2626', border: `1.5px solid ${toast.type === 'success' ? '#86efac' : '#fca5a5'}`, marginBottom: '1.5rem', fontWeight: 800, fontSize: '0.9rem' }}>
          {toast.text}
        </div>
      )}

      {/* Summary Stats Grid */}
      <div className="ft-stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', marginBottom: '1.5rem' }}>
        <div className="ft-stat-card">
          <div className="ft-stat-icon" style={{ background: 'var(--ft-primary-bg)' }}>👥</div>
          <div>
            <div className="ft-stat-value">{totalEntries}</div>
            <div className="ft-stat-label">Total System Users</div>
          </div>
        </div>
        <div className="ft-stat-card">
          <div className="ft-stat-icon" style={{ background: '#eff6ff' }}>🤝</div>
          <div>
            <div className="ft-stat-value" style={{ color: '#2563eb' }}>{teamsCount}</div>
            <div className="ft-stat-label">Teams</div>
          </div>
        </div>
        <div className="ft-stat-card">
          <div className="ft-stat-icon" style={{ background: '#f0fdf4' }}>👤</div>
          <div>
            <div className="ft-stat-value" style={{ color: '#059669' }}>{competitorsCount}</div>
            <div className="ft-stat-label">Competitors</div>
          </div>
        </div>
        <div className="ft-stat-card">
          <div className="ft-stat-icon" style={{ background: '#fef3c7' }}>🎓</div>
          <div>
            <div className="ft-stat-value" style={{ color: '#b45309' }}>{judgesCount}</div>
            <div className="ft-stat-label">Judges Panel</div>
          </div>
        </div>
        <div className="ft-stat-card">
          <div className="ft-stat-icon" style={{ background: '#fae8ff' }}>👑</div>
          <div>
            <div className="ft-stat-value" style={{ color: '#86198f' }}>{adminsCount}</div>
            <div className="ft-stat-label">Admins & Staff</div>
          </div>
        </div>
        <div className="ft-stat-card">
          <div className="ft-stat-icon" style={{ background: '#fff1f2' }}>🎬</div>
          <div>
            <div className="ft-stat-value" style={{ color: '#be123c' }}>{track1Count}</div>
            <div className="ft-stat-label">Track 1 (Videos)</div>
          </div>
        </div>
        <div className="ft-stat-card">
          <div className="ft-stat-icon" style={{ background: '#eff6ff' }}>📰</div>
          <div>
            <div className="ft-stat-value" style={{ color: '#2563eb' }}>{track2Count}</div>
            <div className="ft-stat-label">Track 2 (Journalism)</div>
          </div>
        </div>
      </div>

      {/* Search Bar & Role/Track Filters */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem', background: '#ffffff', padding: '1.25rem', borderRadius: '20px', border: '1.5px solid #e2e8f0', boxShadow: '0 4px 16px rgba(0,0,0,0.02)' }}>
        <div className="ft-search-input-wrapper" style={{ width: '100%' }}>
          <Search size={18} />
          <input type="text" placeholder="Search by name, ID number (T-101 / C-101 / J-201), team name, email, or role..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {/* Competition & System Role Filters */}
        <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap', alignItems: 'center' }}>
          
          {/* System Role Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#64748b' }}>Account Role:</span>
            <div className="ft-filter-chips" style={{ margin: 0 }}>
              <button className={`ft-chip ${roleFilter === 'All' ? 'active' : ''}`} onClick={() => setRoleFilter('All')}>All Roles ({totalEntries})</button>
              <button className={`ft-chip ${roleFilter === 'competitor' ? 'active' : ''}`} onClick={() => setRoleFilter('competitor')}>👤 Competitors ({competitorsCount})</button>
              <button className={`ft-chip ${roleFilter === 'judge' ? 'active' : ''}`} onClick={() => setRoleFilter('judge')}>🎓 Judges ({judgesCount})</button>
              <button className={`ft-chip ${roleFilter === 'admin' ? 'active' : ''}`} onClick={() => setRoleFilter('admin')}>👑 Admins & Staff ({adminsCount})</button>
              <button className={`ft-chip ${roleFilter === 'teams' ? 'active' : ''}`} onClick={() => setRoleFilter('teams')}>👥 Teams ({teamsCount})</button>
            </div>
          </div>

          {/* Track Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#64748b' }}>Competition Track:</span>
            <div className="ft-filter-chips" style={{ margin: 0 }}>
              <button className={`ft-chip ${trackFilter === 'All' ? 'active' : ''}`} onClick={() => setTrackFilter('All')}>All Tracks</button>
              <button className={`ft-chip ${trackFilter === 'pop_science' ? 'active' : ''}`} onClick={() => setTrackFilter('pop_science')}>🎬 Track 1: Pop Videos ({track1Count})</button>
              <button className={`ft-chip ${trackFilter === 'science_journalism' ? 'active' : ''}`} onClick={() => setTrackFilter('science_journalism')}>📰 Track 2: Journalism ({track2Count})</button>
            </div>
          </div>
        </div>
      </div>

      {/* Participants Table */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {[1, 2, 3, 4].map(i => <div key={i} className="ft-skeleton" style={{ height: '64px', borderRadius: '16px' }} />)}
        </div>
      ) : filteredList.length === 0 ? (
        <div className="ft-empty">
          <div className="ft-empty-icon">👥</div>
          <div className="ft-empty-title">No Competition Participants Found</div>
          <div className="ft-empty-text">Try adjusting your search query or filter selection.</div>
        </div>
      ) : (
        <div className="ft-table-wrapper">
          <table className="ft-table" style={{ tableLayout: 'fixed', width: '100%', minWidth: '950px' }}>
            <thead>
              <tr>
                <th style={{ width: '120px' }}>ID Number</th>
                <th style={{ width: '260px' }}>Participant / Team Name</th>
                <th style={{ width: '140px' }}>Participation</th>
                <th style={{ width: '180px' }}>Competition Track</th>
                <th style={{ width: '180px' }}>Institution / Department</th>
                <th style={{ width: '90px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredList.map(item => {
                const isExpanded = expandedId === item.id;
                const trackInfo = tracksList.find(tr => tr.id === item.track || tr.trackId === item.track);

                return (
                  <Fragment key={item.id}>
                    <tr onClick={() => setExpandedId(isExpanded ? null : item.id)} style={{ cursor: 'pointer', background: isExpanded ? '#f8fafc' : undefined }}>
                      {/* ID Number */}
                      <td style={{ width: '120px' }}>
                        <span style={{
                          fontFamily: "'Outfit', sans-serif",
                          fontWeight: 900,
                          color: item.type === 'team' ? '#be123c' : '#2563eb',
                          background: item.type === 'team' ? '#fff1f2' : '#eff6ff',
                          padding: '0.3rem 0.65rem',
                          borderRadius: '8px',
                          fontSize: '0.85rem',
                          border: `1.5px solid ${item.type === 'team' ? '#fecdd3' : '#bfdbfe'}`,
                          display: 'inline-flex', alignItems: 'center', gap: '0.3rem'
                        }}>
                          {item.displayId}
                        </span>
                      </td>

                      {/* Participant / Team Name & Avatars */}
                      <td style={{ width: '260px' }}>
                        {item.type === 'team' ? (
                          <div>
                            <div style={{ fontWeight: 900, fontSize: '0.95rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              👥 {item.name}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.3rem' }}>
                              {(item.members || []).map((m, mIdx) => (
                                <img
                                  key={mIdx}
                                  src={m.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${m.username}`}
                                  alt={m.name}
                                  title={`${m.name} (${m.role})`}
                                  style={{ width: '24px', height: '24px', borderRadius: '50%', border: '1.5px solid #be123c', objectFit: 'cover' }}
                                />
                              ))}
                              <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700 }}>
                                {(item.members || []).map(m => m.name || m.username).join(', ')}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <img
                              src={item.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${item.username}`}
                              alt=""
                              style={{ width: '36px', height: '36px', borderRadius: '50%', border: '2px solid #2563eb', objectFit: 'cover', flexShrink: 0 }}
                            />
                            <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#0f172a' }}>{item.name}</div>
                              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{item.email}</div>
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Participation Mode */}
                      <td style={{ width: '140px' }}>
                        {item.type === 'team' ? (
                          <span style={{
                            fontSize: '0.75rem', fontWeight: 800, padding: '0.2rem 0.6rem', borderRadius: '6px',
                            background: '#fff1f2', color: '#be123c', border: '1px solid #fecdd3'
                          }}>
                            👥 Team ({(item.members || []).length} members)
                          </span>
                        ) : item.isCompetitorRole ? (
                          <span style={{
                            fontSize: '0.75rem', fontWeight: 800, padding: '0.2rem 0.6rem', borderRadius: '6px',
                            background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe'
                          }}>
                            👤 Individual
                          </span>
                        ) : (
                          <span style={{
                            fontSize: '0.75rem', fontWeight: 800, padding: '0.2rem 0.6rem', borderRadius: '6px',
                            background: item.category === 'admin' ? '#fef3c7' : '#f0fdf4',
                            color: item.category === 'admin' ? '#92400e' : '#15803d',
                            border: `1px solid ${item.category === 'admin' ? '#fde68a' : '#86efac'}`
                          }}>
                            {item.roleLabel}
                          </span>
                        )}
                      </td>

                      {/* Competition Track */}
                      <td style={{ width: '180px' }}>
                        {item.track ? (
                          <span style={{
                            fontSize: '0.78rem', fontWeight: 800, color: item.track === 'pop_science' ? '#be123c' : '#2563eb',
                            display: 'inline-flex', alignItems: 'center', gap: '0.35rem', background: '#f8fafc', padding: '0.25rem 0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1'
                          }}>
                            {item.track === 'pop_science' ? '🎥 Track 1: Pop Videos' : '📰 Track 2: Journalism'}
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#94a3b8' }}>—</span>
                        )}
                      </td>

                      {/* Institution / Department */}
                      <td style={{ width: '180px' }}>
                        <span style={{ fontSize: '0.8rem', color: '#475569', fontWeight: 600 }}>
                          {item.department || item.institutionName || 'Alamein International University'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td style={{ width: '120px' }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', gap: '0.35rem' }}>
                          <button
                            className="ft-btn"
                            onClick={() => setOverviewModalDoc(item)}
                            title="View Account Overview & Details"
                            style={{ background: '#e0f2fe', border: 'none', padding: '0.35rem', borderRadius: '8px', color: '#0284c7', cursor: 'pointer' }}
                          >
                            <Eye size={15} />
                          </button>

                          <button
                            className="ft-btn"
                            onClick={() => {
                              if (item.type === 'team') {
                                const leaderDoc = item.memberDocs?.find(d => d.id === item.rawDoc?.leaderId || d.username === item.rawDoc?.leaderUsername) || item.memberDocs?.[0] || item.rawDoc;
                                openEditModal(leaderDoc);
                              } else {
                                openEditModal(item.rawDoc || item);
                              }
                            }}
                            title="Edit Account / Competitor Details"
                            style={{ background: '#f1f5f9', border: 'none', padding: '0.35rem', borderRadius: '8px', color: '#2563eb', cursor: 'pointer' }}
                          >
                            <Edit3 size={15} />
                          </button>

                          <button
                            className="ft-btn"
                            onClick={() => handleDeleteEntry(item)}
                            title="Delete Entry"
                            style={{ background: '#fff1f2', border: 'none', padding: '0.35rem', borderRadius: '8px', color: '#dc2626', cursor: 'pointer' }}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* EXPANDED DETAILS PANEL */}
                    {isExpanded && (
                      <tr style={{ background: '#f8fafc' }}>
                        <td colSpan="6" style={{ padding: '1.5rem 2rem', borderBottom: '2px solid #cbd5e1' }}>
                          
                          {/* TEAM EXPANDED DETAILS */}
                          {item.type === 'team' ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                              
                              {/* Header Card */}
                              <div style={{ padding: '1.25rem', background: '#ffffff', borderRadius: '16px', border: '1.5px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '0.75rem' }}>
                                  <div>
                                    <h4 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                      👥 Team: {item.name}
                                    </h4>
                                    <div style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '0.2rem' }}>
                                      Track: <strong>{item.track === 'pop_science' ? 'Track 1: Pop Science Videos' : 'Track 2: Science Journalism'}</strong>
                                    </div>
                                  </div>

                                  <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
                                    <div style={{ background: '#fff1f2', border: '1px solid #fecdd3', padding: '0.35rem 0.8rem', borderRadius: '10px', fontSize: '0.82rem', color: '#be123c', fontWeight: 800 }}>
                                      🏷️ Team ID: {item.displayId}
                                    </div>
                                    <div style={{ background: '#fef3c7', border: '1px solid #fde68a', padding: '0.35rem 0.8rem', borderRadius: '10px', fontSize: '0.82rem', color: '#b45309', fontWeight: 800 }}>
                                      🔑 Team Invite Code: {item.teamInviteCode}
                                    </div>
                                  </div>
                                </div>

                                {trackInfo?.description && (
                                  <p style={{ fontSize: '0.85rem', color: '#475569', margin: '0.5rem 0 0 0', background: '#f8fafc', padding: '0.65rem 0.9rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                                    📖 <strong>Track Focus:</strong> {trackInfo.description}
                                  </p>
                                )}
                              </div>

                              {/* Team Members List Header */}
                              <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                                  <h5 style={{ fontSize: '0.9rem', fontWeight: 900, color: '#0f172a', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    👥 Team Members Personal Profiles ({(item.members || []).length} / 3)
                                  </h5>
                                  {(item.members || []).length < 3 && (
                                    <button
                                      type="button"
                                      className="ft-btn"
                                      onClick={(e) => { e.stopPropagation(); setAddingToTeamModal(item.rawDoc || item); setAdminAddSearch(''); }}
                                      style={{ background: '#f0fdf4', color: '#16a34a', border: '1.5px solid #86efac', fontSize: '0.8rem', fontWeight: 800, padding: '0.35rem 0.8rem', borderRadius: '10px', cursor: 'pointer' }}
                                    >
                                      ➕ Add Competitor to Team
                                    </button>
                                  )}
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
                                  {(item.members || []).map((m, mIdx) => {
                                    const mDoc = item.memberDocs?.find(d => d.id === m.userId || d.username === m.username) || {};
                                    const mCode = formatSimpleCode(item.code || item.displayId, true);

                                    return (
                                      <div key={mIdx} style={{ padding: '1.25rem', background: '#ffffff', borderRadius: '16px', border: '1.5px solid #e2e8f0', boxShadow: '0 4px 14px rgba(0,0,0,0.03)' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginBottom: '1rem', borderBottom: '1px solid #f1f5f9', pb: '0.75rem' }}>
                                          <img
                                            src={mDoc.avatarUrl || mDoc.avatar || m.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${m.username}`}
                                            alt=""
                                            style={{ width: '48px', height: '48px', borderRadius: '50%', border: '2px solid #be123c', objectFit: 'cover', flexShrink: 0 }}
                                          />
                                          <div>
                                            <div style={{ fontWeight: 900, fontSize: '0.98rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                              {m.name || mDoc.name || m.username}
                                              <span style={{ fontSize: '0.7rem', background: m.role === 'Team Leader' ? '#fff1f2' : '#f1f5f9', color: m.role === 'Team Leader' ? '#be123c' : '#475569', padding: '0.15rem 0.5rem', borderRadius: '6px', fontWeight: 800 }}>
                                                {m.role === 'Team Leader' ? '👑 Leader' : '👤 Member'}
                                              </span>
                                            </div>
                                            <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.15rem' }}>
                                              @{m.username} · {mDoc.email || 'No email registered'}
                                            </div>
                                          </div>
                                        </div>

                                        {/* Member Personal Details Grid */}
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem', fontSize: '0.8rem', background: '#f8fafc', padding: '0.85rem', borderRadius: '10px', border: '1px solid #cbd5e1' }}>
                                          <div>
                                            <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', display: 'block' }}>Member Code</span>
                                            <strong style={{ color: '#2563eb' }}>🏷️ {mCode}</strong>
                                          </div>
                                          <div>
                                            <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', display: 'block' }}>Phone / WhatsApp</span>
                                            <strong style={{ color: '#0f172a' }}>📱 {mDoc.phone || mDoc.whatsapp || '—'}</strong>
                                          </div>
                                          <div>
                                            <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', display: 'block' }}>National ID</span>
                                            <strong style={{ color: '#0f172a' }}>🪪 {mDoc.nationalId || '—'}</strong>
                                          </div>
                                          <div>
                                            <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', display: 'block' }}>AIU Student?</span>
                                            <strong style={{ color: '#0f172a' }}>{mDoc.isAlameinStudent !== false ? 'Yes ✅' : 'No 🌐'}</strong>
                                          </div>
                                          <div style={{ gridColumn: 'span 2' }}>
                                            <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', display: 'block' }}>Institution / Dept</span>
                                            <strong style={{ color: '#0f172a' }}>🏫 {mDoc.institutionName || 'Alamein International University'} ({mDoc.department || 'Computer Science & AI'})</strong>
                                          </div>
                                        </div>

                                        {/* Admin Action Buttons for Member */}
                                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid #f1f5f9', flexWrap: 'wrap' }}>
                                          <button
                                            type="button"
                                            className="ft-btn"
                                            onClick={(e) => { e.stopPropagation(); openEditModal(mDoc); }}
                                            style={{ background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', fontSize: '0.75rem', fontWeight: 800, padding: '0.3rem 0.65rem', borderRadius: '8px', cursor: 'pointer' }}
                                          >
                                            ✏️ Edit Competitor Details
                                          </button>
                                          <button
                                            type="button"
                                            className="ft-btn"
                                            onClick={(e) => { e.stopPropagation(); removeMemberFromTeam(item.rawDoc || item, m, mDoc); }}
                                            style={{ background: '#fff1f2', color: '#be123c', border: '1px solid #fecdd3', fontSize: '0.75rem', fontWeight: 800, padding: '0.3rem 0.65rem', borderRadius: '8px', cursor: 'pointer' }}
                                          >
                                            👤 Remove & Make Individual
                                          </button>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>

                            </div>
                          ) : (

                            /* INDIVIDUAL COMPETITOR EXPANDED DETAILS */
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                              
                              <div style={{ padding: '1.25rem', background: '#ffffff', borderRadius: '16px', border: '1.5px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                                    <img
                                      src={item.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${item.username}`}
                                      alt=""
                                      style={{ width: '56px', height: '56px', borderRadius: '50%', border: '2.5px solid #2563eb', objectFit: 'cover' }}
                                    />
                                    <div>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <h4 style={{ fontSize: '1.3rem', fontWeight: 900, color: '#0f172a', margin: 0 }}>{item.name}</h4>
                                        {item.rawDoc?.title && (
                                          <span style={{ fontSize: '0.72rem', background: '#eff6ff', color: '#2563eb', padding: '0.15rem 0.5rem', borderRadius: '6px', fontWeight: 800, border: '1px solid #bfdbfe' }}>
                                            {item.rawDoc.title}
                                          </span>
                                        )}
                                      </div>
                                      <div style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '0.15rem' }}>@{item.username} · {item.email}</div>
                                    </div>
                                  </div>

                                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                                    <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', padding: '0.45rem 1rem', borderRadius: '12px', fontSize: '0.9rem', color: '#2563eb', fontWeight: 900 }}>
                                      🏷️ Competitor ID: {item.displayId}
                                    </div>
                                  </div>
                                </div>

                                {/* Full Personal Details Grid */}
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', background: '#f8fafc', padding: '1.25rem', borderRadius: '14px', border: '1px solid #cbd5e1' }}>
                                  <div>
                                    <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>Registered Track</div>
                                    <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#be123c', marginTop: '0.15rem' }}>
                                      {item.track === 'pop_science' ? '🎥 Track 1: Pop Science Videos' : '📰 Track 2: Science Journalism'}
                                    </div>
                                  </div>

                                  <div>
                                    <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>Phone / WhatsApp</div>
                                    <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a', marginTop: '0.15rem' }}>📱 {item.phone || item.rawDoc?.whatsapp || '—'}</div>
                                  </div>

                                  <div>
                                    <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>National ID Number</div>
                                    <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a', marginTop: '0.15rem' }}>🪪 {item.nationalId}</div>
                                  </div>

                                  <div>
                                    <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>Institution / University</div>
                                    <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a', marginTop: '0.15rem' }}>🏫 {item.institutionName}</div>
                                  </div>

                                  <div>
                                    <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>Department / Major</div>
                                    <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a', marginTop: '0.15rem' }}>🎓 {item.department}</div>
                                  </div>

                                  <div>
                                    <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>AIU Student Status</div>
                                    <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a', marginTop: '0.15rem' }}>{item.isAlameinStudent ? 'Yes ✅ (AIU Student)' : 'No 🌐 (External Participant)'}</div>
                                  </div>
                                </div>
                              </div>

                            </div>
                          )}

                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* EDIT COMPETITOR MODAL */}
      {editingCompetitor && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.75)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '1rem' }}>
          <div className="ft-card ft-animate-in" style={{ width: '100%', maxWidth: '600px', padding: '2rem', background: '#ffffff', borderRadius: '24px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0f172a', margin: 0 }}>✏️ Edit Competitor Details</h3>
              <button onClick={() => setEditingCompetitor(null)} style={{ background: '#f1f5f9', border: 'none', width: '32px', height: '32px', borderRadius: '50%', fontWeight: 800, cursor: 'pointer' }}>✕</button>
            </div>

            <form onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="ft-input-group">
                <label className="ft-label">Full Name / الاسم الكامل *</label>
                <input type="text" className="ft-input" required value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
              </div>

              <div className="ft-input-group">
                <label className="ft-label">Email Address / البريد الإلكتروني *</label>
                <input type="email" className="ft-input" required value={editForm.email} onChange={e => setEditForm({ ...editForm, email: e.target.value })} />
              </div>

              <div className="ft-input-group">
                <label className="ft-label">Password / كلمة السر (Set or Change Password)</label>
                <input
                  type="text"
                  className="ft-input"
                  placeholder="Enter new password (or leave blank to keep current password)"
                  value={editForm.password || ''}
                  onChange={e => setEditForm({ ...editForm, password: e.target.value })}
                />
              </div>

              <div className="ft-input-group">
                <label className="ft-label">Competitor ID / Code *</label>
                <input type="text" className="ft-input" value={editForm.competitorIdNumber} onChange={e => setEditForm({ ...editForm, competitorIdNumber: e.target.value })} placeholder="e.g. C-101" />
              </div>

              <div className="ft-input-group">
                <label className="ft-label">Participation Mode / وضع المشاركة *</label>
                <select className="ft-select" value={editForm.participationMode} onChange={e => setEditForm({ ...editForm, participationMode: e.target.value })}>
                  <option value="team">Team Mode 👥 (Can join or create teams)</option>
                  <option value="individual">Individual Competitor 👤 (Solo participation)</option>
                </select>
              </div>

              <div className="ft-input-group">
                <label className="ft-label">Competition Track / المسار *</label>
                <select className="ft-select" value={editForm.registeredTrack} onChange={e => setEditForm({ ...editForm, registeredTrack: e.target.value })}>
                  <option value="pop_science">Pop Science Videos 🎥</option>
                  <option value="science_journalism">Science Journalism 📰</option>
                </select>
              </div>

              <div className="ft-input-group">
                <label className="ft-label">Institution / Institution Name *</label>
                <input type="text" className="ft-input" value={editForm.institutionName} onChange={e => setEditForm({ ...editForm, institutionName: e.target.value })} />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button type="button" className="ft-btn ft-btn-secondary" onClick={() => setEditingCompetitor(null)}>Cancel</button>
                <button type="submit" className="ft-btn ft-btn-primary">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* ADD COMPETITOR TO TEAM MODAL */}
      {addingToTeamModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.75)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '1rem' }}>
          <div className="ft-card ft-animate-in" style={{ width: '100%', maxWidth: '540px', padding: '2rem', background: '#ffffff', borderRadius: '24px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0f172a', margin: 0 }}>
                  👥 Add Member to "{addingToTeamModal.name}"
                </h3>
                <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '0.2rem 0 0 0' }}>
                  Current Capacity: {(addingToTeamModal.members || []).length} / 3 members
                </p>
              </div>
              <button onClick={() => setAddingToTeamModal(null)} style={{ background: '#f1f5f9', border: 'none', width: '32px', height: '32px', borderRadius: '50%', fontWeight: 800, cursor: 'pointer' }}>✕</button>
            </div>

            <div className="ft-input-group" style={{ marginBottom: '1.25rem' }}>
              <label className="ft-label">Search Competitors by Name / Username / Email / ID</label>
              <input
                type="text"
                className="ft-input"
                value={adminAddSearch}
                onChange={e => setAdminAddSearch(e.target.value)}
                placeholder="Search registered competitors..."
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', maxHeight: '300px', overflowY: 'auto' }}>
              {availableForAdminAdd.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b', fontSize: '0.9rem' }}>
                  No eligible competitors found to add.
                </div>
              ) : (
                availableForAdminAdd.map(cand => (
                  <div key={cand.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.85rem 1rem', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <img
                        src={cand.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${cand.username}`}
                        alt=""
                        style={{ width: '36px', height: '36px', borderRadius: '50%', border: '2px solid #2563eb' }}
                      />
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '0.88rem', color: '#0f172a' }}>{cand.name}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>@{cand.username} · {cand.displayId}</div>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="ft-btn"
                      onClick={() => addMemberToTeam(addingToTeamModal, cand.rawDoc)}
                      style={{ background: '#f0fdf4', color: '#16a34a', border: '1px solid #86efac', fontSize: '0.78rem', fontWeight: 800, padding: '0.35rem 0.75rem', borderRadius: '8px', cursor: 'pointer' }}
                    >
                      ➕ Add to Team
                    </button>
                  </div>
                ))
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
              <button type="button" className="ft-btn ft-btn-secondary" onClick={() => setAddingToTeamModal(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ACCOUNT OVERVIEW MODAL */}
      {overviewModalDoc && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.7)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100000, padding: '1rem' }} onClick={() => setOverviewModalDoc(null)}>
          <div className="ft-card ft-animate-in" style={{ background: '#ffffff', borderRadius: '24px', padding: '2rem', maxWidth: '580px', width: '100%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 25px 50px rgba(0,0,0,0.3)', border: '1.5px solid #cbd5e1' }} onClick={e => e.stopPropagation()}>
            
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #f1f5f9', paddingBottom: '1rem', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <img
                  src={overviewModalDoc.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${overviewModalDoc.username || overviewModalDoc.id}`}
                  alt=""
                  style={{ width: '56px', height: '56px', borderRadius: '50%', border: '2.5px solid #be123c', objectFit: 'cover' }}
                />
                <div>
                  <h3 style={{ fontSize: '1.3rem', fontWeight: 900, color: '#0f172a', margin: 0, fontFamily: "'Outfit', sans-serif" }}>
                    {overviewModalDoc.name}
                  </h3>
                  <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 800, background: '#f1f5f9', padding: '0.15rem 0.55rem', borderRadius: '8px', color: '#334155' }}>
                      ID: {overviewModalDoc.displayId}
                    </span>
                    <span>·</span>
                    <span style={{ fontWeight: 800, color: '#be123c' }}>
                      {overviewModalDoc.roleLabel || overviewModalDoc.role}
                    </span>
                  </div>
                </div>
              </div>

              <button type="button" onClick={() => setOverviewModalDoc(null)} style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', fontSize: '1rem', color: '#64748b', fontWeight: 900 }}>
                ✕
              </button>
            </div>

            {/* Profile Details Cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              
              <div style={{ background: '#f8fafc', padding: '1.1rem 1.25rem', borderRadius: '16px', border: '1px solid #e2e8f0', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.9rem' }}>
                <div>
                  <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Email Address</div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0f172a', marginTop: '0.15rem', wordBreak: 'break-all' }}>{overviewModalDoc.email || '—'}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Phone / WhatsApp</div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0f172a', marginTop: '0.15rem' }}>{overviewModalDoc.phone || '—'}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Competition Track</div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#be123c', marginTop: '0.15rem' }}>
                    {overviewModalDoc.track === 'science_journalism' ? '📰 Track 2: Science Journalism' : (overviewModalDoc.track === 'pop_science' ? '🎥 Track 1: Pop Science Videos' : 'All Competition Tracks')}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Institution / Dept</div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0f172a', marginTop: '0.15rem' }}>
                    {overviewModalDoc.institutionName || 'AIU'} ({overviewModalDoc.department || 'General'})
                  </div>
                </div>
              </div>

              {/* If Team */}
              {overviewModalDoc.type === 'team' && (
                <div style={{ background: '#fff1f2', padding: '1.1rem', borderRadius: '16px', border: '1px solid #fecdd3' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 900, color: '#9f1239', marginBottom: '0.5rem' }}>
                    👥 Team Members ({overviewModalDoc.members?.length || 0}) — Invite Code: <strong>{overviewModalDoc.teamInviteCode}</strong>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                    {(overviewModalDoc.members || []).map((m, idx) => (
                      <div key={idx} style={{ background: '#ffffff', padding: '0.55rem 0.85rem', borderRadius: '10px', border: '1px solid #fecdd3', fontSize: '0.82rem', fontWeight: 800, color: '#334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>{m.name || m.username}</span>
                        <span style={{ color: '#be123c', fontWeight: 900 }}>{m.role || 'Member'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '1.25rem', marginTop: '1.25rem', borderTop: '1px solid #f1f5f9', gap: '0.75rem' }}>
              <button
                type="button"
                className="ft-btn ft-btn-primary"
                onClick={() => setOverviewModalDoc(null)}
                style={{ borderRadius: '10px', padding: '0.55rem 1.3rem', fontWeight: 800 }}
              >
                Close Overview
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
