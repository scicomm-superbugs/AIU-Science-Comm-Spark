import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useOutletContext } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { db, firestore, getCollectionName, useLiveCollection } from './db';
import { collection, getDocs } from 'firebase/firestore';
import { Award, Calendar, Video, BookOpen, ExternalLink, CheckCircle, Star, MessageSquare, Clock, Filter, Users, User, Shield } from 'lucide-react';
import { normalizeTrackKey } from './ftConstants';
import './scicommspark.css';

// Default Competition Stages Definition (Module Scope)
const ALL_STAGES = [
  {
    id: 'pop_stage_1', stageId: 1, track: 'pop_science', trackTitle: 'Pop Science Videos',
    title: 'Stage 1: Short Pop Video', sub: 'Reels / TikTok Video (max 90 seconds)', deadline: '2026-07-31', status: 'Active Stage',
    details: 'Produce a punchy, highly engaging short video introducing a core scientific concept for social media.',
    criteria: [
      { id: 'c1', name: 'Scientific Accuracy', category: 'academic', maxPoints: 25 },
      { id: 'c2', name: 'Hook & Visual Engagement', category: 'scicomm', maxPoints: 25 }
    ]
  },
  {
    id: 'pop_stage_2', stageId: 2, track: 'pop_science', trackTitle: 'Pop Science Videos',
    title: 'Stage 2: Long Pop Video', sub: 'YouTube SciComm Video (up to 3 minutes)', deadline: '2026-08-20', status: 'Upcoming Stage',
    details: 'Deep scientific storytelling featuring comprehensive explanation, visual graphics, and clear narration.',
    criteria: [
      { id: 'c3', name: 'Research Depth & Rigor', category: 'academic', maxPoints: 25 },
      { id: 'c4', name: 'Video Editing & Narrative Flow', category: 'scicomm', maxPoints: 25 }
    ]
  },
  {
    id: 'pop_stage_3', stageId: 3, track: 'pop_science', trackTitle: 'Pop Science Videos',
    title: 'Stage 3 (Finals): Live Stage Show', sub: 'Interactive Live Presentation (5 mins on stage)', deadline: '2026-09-10', status: 'Grand Finale',
    details: 'Deliver an interactive live science presentation on stage before expert judges, audience, and broadcast.',
    criteria: [
      { id: 'c5', name: 'Scientific Q&A Defense', category: 'academic', maxPoints: 25 },
      { id: 'c6', name: 'Stage Confidence & Delivery', category: 'scicomm', maxPoints: 25 }
    ]
  },
  {
    id: 'jour_stage_1', stageId: 1, track: 'science_journalism', trackTitle: 'Science Journalism',
    title: 'Stage 1: Research Field Prep', sub: 'Topic Research & Expert Interviews Prep', deadline: '2026-07-31', status: 'Active Stage',
    details: 'Select a scientific topic, gather research data, and conduct interviews with researchers & academic experts.',
    criteria: [
      { id: 'c7', name: 'Literature Review & Citation', category: 'academic', maxPoints: 25 },
      { id: 'c8', name: 'Journalistic Angle', category: 'scicomm', maxPoints: 25 }
    ]
  },
  {
    id: 'jour_stage_2', stageId: 2, track: 'science_journalism', trackTitle: 'Science Journalism',
    title: 'Stage 2: Article Publication', sub: 'Simplified Science Article Publication', deadline: '2026-08-20', status: 'Upcoming Stage',
    details: 'Write a simplified science news article published on the digital platform with opportunity for magazine feature.',
    criteria: [
      { id: 'c9', name: 'Academic Fact Checking', category: 'academic', maxPoints: 25 },
      { id: 'c10', name: 'Article Readability & Style', category: 'scicomm', maxPoints: 25 }
    ]
  },
  {
    id: 'jour_stage_3', stageId: 3, track: 'science_journalism', trackTitle: 'Science Journalism',
    title: 'Stage 3 (Finals): Live Stage Show', sub: 'Live Science Talk Show Interview on Stage', deadline: '2026-09-10', status: 'Grand Finale',
    details: 'Host a simulated live science talk show interview on stage in front of judges and public audience.',
    criteria: [
      { id: 'c11', name: 'Expert Q&A Handling', category: 'academic', maxPoints: 25 },
      { id: 'c12', name: 'Interview Dynamics', category: 'scicomm', maxPoints: 25 }
    ]
  }
];

export default function FTJudgeDashboard() {
  const { user } = useAuth();
  const { meDoc, userId, userRole } = useOutletContext() || {};

  const [activeTab, setActiveTab] = useState('stages'); // 'stages', 'workshops', 'submissions'
  const [selectedStageId, setSelectedStageId] = useState(1);
  const [selectedTrackFilter, setSelectedTrackFilter] = useState('All');
  const [scientists, setScientists] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal State for Grading
  const [evalModalItem, setEvalModalItem] = useState(null);
  const [evalScores, setEvalScores] = useState({});
  const [comments, setComments] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  const evaluations = useLiveCollection('ft_evaluations') || [];
  const submissions = useLiveCollection('submissions') || [];
  const workshops = useLiveCollection('workshops') || [];
  const timelineConfig = useLiveCollection('timeline_config') || [];
  const teams = useLiveCollection('ft_teams') || [];
  const submissionAssignments = useLiveCollection('submission_assignments') || [];

  // Load all scientists / users
  useEffect(() => {
    (async () => {
      try {
        const col = getCollectionName('scientists');
        const snap = await getDocs(collection(firestore, col));
        setScientists(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error('Failed to load scientists:', err);
      }
      setLoading(false);
    })();
  }, []);

  const formatSimpleCode = (rawCode, isTeam = false) => {
    if (!rawCode) return isTeam ? 'T-101' : 'C-101';
    if (/^(T-|C-)\d{3,4}$/.test(rawCode)) return rawCode;
    let hash = 0;
    for (let i = 0; i < String(rawCode).length; i++) {
      hash = (hash + String(rawCode).charCodeAt(i)) % 900;
    }
    return (isTeam ? 'T-' : 'C-') + (100 + hash);
  };

  // Filter criteria dynamically based on judge specialty role (Academic vs SciComm vs Dual/Master)
  const filterCriteriaByRole = (criteriaList = [], role = '') => {
    if (role === 'academic_judge') {
      return criteriaList.filter(c => c.category === 'academic');
    }
    if (role === 'scicomm_judge') {
      return criteriaList.filter(c => c.category === 'scicomm');
    }
    return criteriaList;
  };

  // Judge Role Label
  const judgeRoleTitle = useMemo(() => {
    if (userRole === 'academic_judge') return 'Academic Judge 🎓';
    if (userRole === 'scicomm_judge') return 'Science Communicator Judge 🎙️';
    if (userRole === 'trainer_judge') return 'Trainer & Judge (Dual Role) 🌟';
    if (userRole === 'admin' || userRole === 'master') return 'Master Evaluation Administrator 🛡️';
    return 'General Competition Judge ⚖️';
  }, [userRole]);

  // Compute Real Assigned Stages for this judge (configured by admin in Timeline Management)
  const assignedStages = useMemo(() => {
    const isSuper = ['admin', 'master'].includes(userRole);

    // Merge default stages with custom timelineConfig assignments from Firestore
    const enriched = ALL_STAGES.map(st => {
      const live = timelineConfig.find(c => c.id === st.id || (c.track === st.track && Number(c.stageId) === Number(st.stageId)));
      return live ? { ...st, ...live } : st;
    });

    if (isSuper) return enriched;

    const myIdentifiers = [userId, meDoc?.id, meDoc?.username, meDoc?.email].filter(Boolean);

    const explicitlyAssigned = enriched.filter(st => {
      const ids = st.assignedJudgeIds || st.assignedJudges || [];
      return ids.some(id => myIdentifiers.includes(id));
    });

    // If explicit admin stage assignments exist for this judge, return only those
    if (explicitlyAssigned.length > 0) {
      return explicitlyAssigned;
    }

    // Default fallback: If no explicit assignments saved yet, show active Stage 1
    return enriched.filter(st => Number(st.stageId) === 1);
  }, [timelineConfig, userRole, userId, meDoc]);

  // Tab 2: Assigned Workshops to Conduct
  const assignedWorkshops = useMemo(() => {
    const isSuper = ['admin', 'master'].includes(userRole);
    return workshops.filter(w => isSuper || w.trainerId === userId || w.trainerId === meDoc?.id || w.trainerUsername === meDoc?.username);
  }, [workshops, userId, meDoc, userRole]);

  // Dynamic label for Workshops / Orientations / Sessions tab
  const workshopsTabLabel = useMemo(() => {
    if (!assignedWorkshops || assignedWorkshops.length === 0) return '🎓 Assigned Workshops & Sessions (0)';

    const types = assignedWorkshops.map(w => String(w.type || w.category || '').toLowerCase());
    const hasOrientation = types.some(t => t.includes('orient'));
    const hasWorkshop = types.some(t => t.includes('work'));
    const hasSession = types.some(t => t.includes('session') || t.includes('lecture') || t.includes('training'));

    if (hasOrientation && !hasWorkshop && !hasSession) {
      return `🎓 Assigned Orientations (${assignedWorkshops.length})`;
    }
    if (hasWorkshop && !hasOrientation && !hasSession) {
      return `🎓 Assigned Workshops (${assignedWorkshops.length})`;
    }
    if (hasSession && !hasOrientation && !hasWorkshop) {
      return `🎓 Assigned Sessions (${assignedWorkshops.length})`;
    }
    if (hasOrientation && hasWorkshop) {
      return `🎓 Assigned Orientations & Workshops (${assignedWorkshops.length})`;
    }
    return `🎓 Assigned Sessions & Workshops (${assignedWorkshops.length})`;
  }, [assignedWorkshops]);

  const availableStageNumbers = useMemo(() => {
    const nums = [...new Set(assignedStages.map(st => Number(st.stageId)))].sort((a, b) => a - b);
    return nums.length > 0 ? nums : [1];
  }, [assignedStages]);

  const availableTracks = useMemo(() => {
    return [...new Set(assignedStages.map(st => st.track))];
  }, [assignedStages]);

  // Derive effective selected stage ID safely without setState side-effects
  const effectiveStageId = useMemo(() => {
    if (availableStageNumbers.includes(Number(selectedStageId))) {
      return Number(selectedStageId);
    }
    return availableStageNumbers[0] || 1;
  }, [availableStageNumbers, selectedStageId]);

  // Collect all identifiers for the current logged in judge
  const myJudgeIdentifiers = useMemo(() => {
    return [
      userId,
      meDoc?.id,
      meDoc?.username,
      meDoc?.email,
      user?.id,
      user?.username,
      user?.email
    ].filter(Boolean);
  }, [userId, meDoc, user]);

  // Helper to check target submission assignment match
  const checkSubmissionAssignment = (sub, assignment) => {
    if (!assignment || !assignment.assignedJudgeIds || assignment.assignedJudgeIds.length === 0) return false;
    
    // Check if logged in judge is in assignedJudgeIds list
    const lowerMyIds = myJudgeIdentifiers.map(id => String(id).toLowerCase());
    const isJudgeAssigned = assignment.assignedJudgeIds.some(jid => lowerMyIds.includes(String(jid).toLowerCase()));
    if (!isJudgeAssigned) return false;

    const targetId = sub.teamId || sub.competitorId;
    const aTarget = String(assignment.targetId || '').toLowerCase();
    const aDocId = String(assignment.id || '').toLowerCase();

    // 1. Direct ID match
    if (aTarget === String(sub.id).toLowerCase()) return true;
    if (targetId && (aTarget === String(targetId).toLowerCase() || aDocId.includes(String(targetId).toLowerCase()))) return true;
    if (sub.competitorId && (aTarget === String(sub.competitorId).toLowerCase() || aDocId.includes(String(sub.competitorId).toLowerCase()))) return true;
    if (sub.teamId && (aTarget === String(sub.teamId).toLowerCase() || aDocId.includes(String(sub.teamId).toLowerCase()))) return true;
    if (sub.competitorEmail && aTarget === String(sub.competitorEmail).toLowerCase()) return true;

    // 2. Find scientist / team doc match
    const compDoc = scientists.find(s => 
      s.id === sub.competitorId || 
      s.email === sub.competitorEmail || 
      s.username === sub.competitorUsername ||
      s.competitorCode === sub.competitorCode
    );

    if (compDoc) {
      const compIdentifiers = [
        compDoc.id, compDoc.email, compDoc.username, compDoc.competitorCode, compDoc.competitorIdNumber
      ].filter(Boolean).map(x => String(x).toLowerCase());

      if (compIdentifiers.some(id => aTarget === id || aDocId.includes(id))) {
        return true;
      }
    }

    const teamDoc = teams.find(t => t.id === sub.teamId);
    if (teamDoc) {
      const teamIdentifiers = [teamDoc.id, teamDoc.code].filter(Boolean).map(x => String(x).toLowerCase());
      if (teamIdentifiers.some(id => aTarget === id || aDocId.includes(id))) {
        return true;
      }
    }

    return false;
  };

  // Submissions filtered by Effective Stage, Selected Track, AND Specific Submission Assignments
  const filteredSubmissions = useMemo(() => {
    return submissions.filter(sub => {
      const matchStage = Number(sub.stageId) === effectiveStageId;
      if (!matchStage) return false;

      // Track normalization
      const compDoc = scientists.find(s => s.id === sub.competitorId || s.email === sub.competitorEmail);
      const teamDoc = teams.find(t => t.id === sub.teamId);
      const realTrack = normalizeTrackKey(compDoc?.registeredTrack || teamDoc?.track || sub.track);

      const matchTrack = selectedTrackFilter === 'All' || realTrack === normalizeTrackKey(selectedTrackFilter);
      if (!matchTrack) return false;

      const compAssignment = submissionAssignments.find(a => 
        Number(a.stageId) === effectiveStageId && checkSubmissionAssignment(sub, a)
      );

      return Boolean(compAssignment);
    });
  }, [submissions, effectiveStageId, selectedTrackFilter, myJudgeIdentifiers, submissionAssignments, scientists, teams]);

  // All submissions assigned to THIS judge across all stages/tracks
  const myAssignedSubmissions = useMemo(() => {
    return submissions.filter(sub => {
      const compAssignment = submissionAssignments.find(a => 
        Number(a.stageId) === Number(sub.stageId) && checkSubmissionAssignment(sub, a)
      );
      return Boolean(compAssignment);
    });
  }, [submissions, submissionAssignments, myJudgeIdentifiers, scientists, teams]);

  const openGradingModal = (subItem) => {
    setEvalModalItem(subItem);
    const existingEval = evaluations.find(e => 
      Number(e.stageId) === Number(subItem.stageId) && 
      (e.competitorId === subItem.competitorId || e.teamId === subItem.teamId) &&
      e.judgeId === (userId || meDoc?.id)
    );

    if (existingEval) {
      setEvalScores(existingEval.criteriaScores || {});
      setComments(existingEval.comments || '');
    } else {
      setEvalScores({});
      setComments('');
    }
  };

  const handleSaveGrading = async (e) => {
    e.preventDefault();
    if (!evalModalItem) return;
    setIsSubmitting(true);

    try {
      const totalScore = Object.values(evalScores).reduce((a, b) => Number(a || 0) + Number(b || 0), 0);
      const stageData = ALL_STAGES.find(s => Number(s.stageId) === Number(evalModalItem.stageId) && s.track === evalModalItem.track) || ALL_STAGES[0];
      const maxPossibleScore = (stageData.criteria || []).reduce((sum, c) => sum + Number(c.maxPoints || 0), 0) || 50;

      const evalData = {
        competitorId: evalModalItem.competitorId || '',
        competitorName: evalModalItem.competitorName || evalModalItem.name || '',
        competitorEmail: evalModalItem.competitorEmail || '',
        teamId: evalModalItem.teamId || '',
        teamName: evalModalItem.teamName || '',
        stageId: Number(evalModalItem.stageId),
        stageTitle: stageData.title,
        track: evalModalItem.track || 'pop_science',
        judgeId: userId || meDoc?.id || 'judge_master',
        judgeName: meDoc?.name || 'Judge Panel',
        judgeRole: userRole,
        criteriaScores: evalScores,
        totalScore,
        maxScore: maxPossibleScore,
        comments: comments.trim(),
        evaluatedAt: new Date().toISOString()
      };

      const existingEval = evaluations.find(e => 
        Number(e.stageId) === Number(evalModalItem.stageId) && 
        (e.competitorId === evalModalItem.competitorId || e.teamId === evalModalItem.teamId) &&
        e.judgeId === (userId || meDoc?.id)
      );

      if (existingEval) {
        await db.ft_evaluations.update(existingEval.id, evalData);
      } else {
        await db.ft_evaluations.add(evalData);
      }

      setToast({ type: 'success', text: `Evaluation for ${evalModalItem.competitorName || 'submission'} saved! Score: ${totalScore} pts` });
      setEvalModalItem(null);
      setTimeout(() => setToast(null), 3500);
    } catch (err) {
      alert('Failed to save evaluation: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="ft-animate-in">
      {/* Top Banner Header */}
      <div className="ft-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="ft-page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Award size={30} style={{ color: '#be123c' }} />
            Judge & Trainer Evaluation Portal
          </h1>
          <p className="ft-page-subtitle">
            Manage assigned competition stages, conduct live training workshops, and grade competitor & team submissions.
          </p>
        </div>

        <div style={{ background: '#fff1f2', border: '1.5px solid #fecdd3', padding: '0.45rem 1rem', borderRadius: '12px', color: '#be123c', fontWeight: 900, fontSize: '0.88rem' }}>
          {judgeRoleTitle}
        </div>
      </div>

      {toast && (
        <div style={{ padding: '0.9rem 1.25rem', borderRadius: '14px', background: '#f0fdf4', color: '#16a34a', border: '1.5px solid #86efac', marginBottom: '1.5rem', fontWeight: 800, fontSize: '0.92rem' }}>
          ✅ {toast.text}
        </div>
      )}

      {/* Main Tab Switcher */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.75rem', borderBottom: '2px solid #e2e8f0', paddingBottom: '0.5rem', flexWrap: 'wrap' }}>
        <button
          onClick={() => setActiveTab('stages')}
          className="ft-btn"
          style={{
            background: activeTab === 'stages' ? '#be123c' : '#ffffff',
            color: activeTab === 'stages' ? '#ffffff' : '#64748b',
            border: `1.5px solid ${activeTab === 'stages' ? '#be123c' : '#cbd5e1'}`,
            fontWeight: 800, fontSize: '0.9rem', padding: '0.6rem 1.25rem', borderRadius: '12px', cursor: 'pointer',
            boxShadow: activeTab === 'stages' ? '0 4px 14px rgba(190,18,60,0.25)' : 'none'
          }}
        >
          🏆 Assigned Stages ({assignedStages.length})
        </button>

        <button
          onClick={() => setActiveTab('workshops')}
          className="ft-btn"
          style={{
            background: activeTab === 'workshops' ? '#be123c' : '#ffffff',
            color: activeTab === 'workshops' ? '#ffffff' : '#64748b',
            border: `1.5px solid ${activeTab === 'workshops' ? '#be123c' : '#cbd5e1'}`,
            fontWeight: 800, fontSize: '0.9rem', padding: '0.6rem 1.25rem', borderRadius: '12px', cursor: 'pointer',
            boxShadow: activeTab === 'workshops' ? '0 4px 14px rgba(190,18,60,0.25)' : 'none'
          }}
        >
          {workshopsTabLabel}
        </button>

        <button
          onClick={() => setActiveTab('submissions')}
          className="ft-btn"
          style={{
            background: activeTab === 'submissions' ? '#be123c' : '#ffffff',
            color: activeTab === 'submissions' ? '#ffffff' : '#64748b',
            border: `1.5px solid ${activeTab === 'submissions' ? '#be123c' : '#cbd5e1'}`,
            fontWeight: 800, fontSize: '0.9rem', padding: '0.6rem 1.25rem', borderRadius: '12px', cursor: 'pointer',
            boxShadow: activeTab === 'submissions' ? '0 4px 14px rgba(190,18,60,0.25)' : 'none'
          }}
        >
          📝 Submissions & Grading ({myAssignedSubmissions.length})
        </button>
      </div>

      {/* ── TAB 1: ASSIGNED STAGES ────────────────────────────────────────── */}
      {/* ── TAB 1: ASSIGNED STAGES ────────────────────────────────────────── */}
      {activeTab === 'stages' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.5rem' }}>
          {assignedStages.map((st) => {
            const hasStageAssigns = submissionAssignments.some(a => Number(a.stageId) === Number(st.stageId) && (!a.track || a.track === st.track));

            const stageSubs = submissions.filter(sub => {
              const matchStage = Number(sub.stageId) === Number(st.stageId);
              const matchTrack = sub.track === st.track;
              if (!matchStage || !matchTrack) return false;

              const targetId = sub.teamId || sub.competitorId;
              const compAssignment = submissionAssignments.find(a => 
                Number(a.stageId) === Number(st.stageId) && 
                (a.targetId === targetId || a.targetId === sub.competitorId || a.targetId === sub.teamId || (a.id && targetId && a.id.includes(targetId)))
              );

              if (compAssignment && compAssignment.assignedJudgeIds && compAssignment.assignedJudgeIds.length > 0) {
                return compAssignment.assignedJudgeIds.some(jid => myJudgeIdentifiers.includes(jid));
              }

              return false;
            });

            const stageSubCount = stageSubs.length;
            const evaluatedCount = evaluations.filter(e => Number(e.stageId) === Number(st.stageId) && e.track === st.track && myJudgeIdentifiers.includes(e.judgeId)).length;
            const pendingCount = Math.max(0, stageSubCount - evaluatedCount);
            const myCriteria = filterCriteriaByRole(st.criteria, userRole);

            return (
              <div
                key={st.id}
                className="ft-card ft-animate-in"
                style={{
                  background: '#ffffff',
                  borderRadius: '22px',
                  border: '1.5px solid #e2e8f0',
                  boxShadow: '0 8px 25px rgba(0,0,0,0.03)',
                  padding: '1.4rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '1.1rem',
                  transition: 'transform 0.2s ease, boxShadow 0.2s ease'
                }}
              >
                {/* Top Card Bar */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 900, color: '#ffffff', background: st.track === 'pop_science' ? '#be123c' : '#2563eb', padding: '0.25rem 0.65rem', borderRadius: '12px', letterSpacing: '0.02em' }}>
                      {st.trackTitle}
                    </span>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', padding: '0.25rem 0.65rem', borderRadius: '12px' }}>
                      Stage {st.stageId}
                    </span>
                  </div>

                  <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', background: '#f8fafc', padding: '0.25rem 0.65rem', borderRadius: '10px', border: '1px solid #cbd5e1' }}>
                    📅 {new Date(st.deadline).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                </div>

                {/* Title & Description */}
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#0f172a', margin: '0 0 0.25rem 0', fontFamily: "'Outfit', sans-serif" }}>
                    {st.title}
                  </h3>
                  <div style={{ fontSize: '0.8rem', color: '#be123c', fontWeight: 800, marginBottom: '0.35rem' }}>
                    {st.sub}
                  </div>
                  <p style={{ fontSize: '0.82rem', color: '#475569', lineHeight: 1.45, margin: 0, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {st.details}
                  </p>
                </div>

                {/* Quick HUD Metrics */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.4rem', background: '#f8fafc', padding: '0.75rem 0.5rem', borderRadius: '14px', border: '1.5px solid #e2e8f0', textAlign: 'center' }}>
                  <div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#0f172a' }}>{stageSubCount}</div>
                    <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Submissions</div>
                  </div>

                  <div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#047857' }}>{evaluatedCount}</div>
                    <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#047857', textTransform: 'uppercase' }}>Completed</div>
                  </div>

                  <div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 900, color: pendingCount > 0 ? '#be123c' : '#64748b' }}>{pendingCount}</div>
                    <div style={{ fontSize: '0.65rem', fontWeight: 800, color: pendingCount > 0 ? '#be123c' : '#64748b', textTransform: 'uppercase' }}>Pending</div>
                  </div>
                </div>

                {/* Scoped Criteria List */}
                <div>
                  <div style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 900, textTransform: 'uppercase', marginBottom: '0.35rem', letterSpacing: '0.04em' }}>
                    ⚖️ Scoped Criteria ({myCriteria.length}):
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                    {myCriteria.map(c => (
                      <span key={c.id} style={{ fontSize: '0.73rem', fontWeight: 800, padding: '0.2rem 0.55rem', borderRadius: '8px', background: '#f1f5f9', border: '1px solid #cbd5e1', color: '#0f172a' }}>
                        {c.name} (<strong style={{ color: '#be123c' }}>{c.maxPoints} pts</strong>)
                      </span>
                    ))}
                  </div>
                </div>

                {/* Full Width Graphical Action Button */}
                <button
                  onClick={() => { setSelectedStageId(st.stageId); setSelectedTrackFilter(st.track); setActiveTab('submissions'); }}
                  className="ft-btn"
                  style={{
                    width: '100%',
                    background: 'linear-gradient(135deg, #be123c 0%, #9f1239 100%)',
                    color: '#ffffff',
                    border: 'none',
                    fontSize: '0.88rem',
                    fontWeight: 900,
                    padding: '0.75rem 1rem',
                    borderRadius: '14px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    boxShadow: '0 6px 20px rgba(190, 18, 60, 0.25)',
                    transition: 'transform 0.15s ease'
                  }}
                >
                  🏅 Open & Evaluate ({pendingCount} Pending) →
                </button>

              </div>
            );
          })}
        </div>
      )}

      {/* ── TAB 2: ASSIGNED SESSIONS & WORKSHOPS ────────────────────────────────────────── */}
      {activeTab === 'workshops' && (
        <div>
          {assignedWorkshops.length === 0 ? (
            <div className="ft-empty" style={{ background: '#ffffff', borderRadius: '24px', border: '1.5px solid #e2e8f0', padding: '3.5rem 2rem' }}>
              <div className="ft-empty-icon">🎓</div>
              <div className="ft-empty-title">No Assigned Sessions or Workshops Found</div>
              <div className="ft-empty-text">You currently have no scheduled orientations, training workshops, or live lectures assigned to conduct.</div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.5rem' }}>
              {assignedWorkshops.map((w) => (
                <div
                  key={w.id}
                  className="ft-card ft-animate-in"
                  style={{
                    background: '#ffffff',
                    borderRadius: '22px',
                    border: '1.5px solid #e2e8f0',
                    boxShadow: '0 8px 25px rgba(0,0,0,0.03)',
                    padding: '1.4rem',
                    display: 'flex',
                    flexDirection: 'column',
                    justify: 'space-between',
                    gap: '1.1rem',
                    transition: 'transform 0.2s ease, boxShadow 0.2s ease'
                  }}
                >
                  {/* Top Bar */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 900, background: '#eff6ff', color: '#2563eb', padding: '0.25rem 0.65rem', borderRadius: '12px', border: '1px solid #bfdbfe' }}>
                      💡 {w.type || w.category || 'Live Session'}
                    </span>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', background: '#f8fafc', padding: '0.25rem 0.65rem', borderRadius: '10px', border: '1px solid #cbd5e1' }}>
                      Track: {w.targetTrack === 'both' ? 'Both Tracks' : w.targetTrack === 'pop_science' ? 'Pop Science' : 'Science Journalism'}
                    </span>
                  </div>

                  {/* Title & Description */}
                  <div>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#0f172a', margin: '0 0 0.35rem 0', fontFamily: "'Outfit', sans-serif" }}>
                      {w.title}
                    </h3>
                    <p style={{ fontSize: '0.82rem', color: '#475569', lineHeight: 1.45, margin: 0, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {w.description || 'Interactive training session to guide competitors on key stage deliverables and skills.'}
                    </p>
                  </div>

                  {/* Date & Time HUD Box */}
                  <div style={{ background: '#f8fafc', padding: '0.75rem 0.85rem', borderRadius: '14px', border: '1.5px solid #e2e8f0', fontSize: '0.8rem', color: '#334155', fontWeight: 800, display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span>📅</span> Date: <strong style={{ color: '#0f172a' }}>{w.startDate ? new Date(w.startDate).toLocaleDateString([], { dateStyle: 'full' }) : 'TBA'}</strong>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span>⏰</span> Time: <strong style={{ color: '#0f172a' }}>{w.startDate ? new Date(w.startDate).toLocaleTimeString([], { timeStyle: 'short' }) : 'TBA'}</strong>
                    </div>
                  </div>

                  {/* Full Width Action Button */}
                  {w.meetingLink ? (
                    <a
                      href={w.meetingLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ft-btn"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        width: '100%',
                        background: 'linear-gradient(135deg, #be123c 0%, #9f1239 100%)',
                        color: '#ffffff',
                        fontWeight: 900,
                        fontSize: '0.88rem',
                        padding: '0.75rem 1rem',
                        borderRadius: '14px',
                        textDecoration: 'none',
                        boxShadow: '0 6px 20px rgba(190, 18, 60, 0.25)',
                        transition: 'transform 0.15s ease'
                      }}
                    >
                      <Video size={18} /> Launch & Conduct Meeting →
                    </a>
                  ) : (
                    <div style={{ fontSize: '0.8rem', color: '#94a3b8', textAlign: 'center', fontWeight: 700, padding: '0.6rem', background: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
                      Meeting link will be provided prior to session start.
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 3: SUBMISSIONS & EVALUATION WORKSPACE ────────────────────────────────────────── */}
      {activeTab === 'submissions' && (
        <div>
          {/* Sub-Header Controls */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem', background: '#ffffff', padding: '1.25rem', borderRadius: '20px', border: '1.5px solid #e2e8f0' }}>
            
            {/* Dynamic Stage Tabs Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#64748b' }}>Select Stage:</span>
              <div className="ft-filter-chips" style={{ margin: 0 }}>
                {availableStageNumbers.map(sNum => (
                  <button
                    key={sNum}
                    className={`ft-chip ${effectiveStageId === sNum ? 'active' : ''}`}
                    onClick={() => setSelectedStageId(sNum)}
                  >
                    Stage {sNum}
                  </button>
                ))}
              </div>
            </div>

            {/* Dynamic Track Filter Selector */}
            {availableTracks.length > 1 ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#64748b' }}>Filter Track:</span>
                <div className="ft-filter-chips" style={{ margin: 0 }}>
                  <button className={`ft-chip ${selectedTrackFilter === 'All' ? 'active' : ''}`} onClick={() => setSelectedTrackFilter('All')}>All Tracks</button>
                  {availableTracks.includes('pop_science') && (
                    <button className={`ft-chip ${selectedTrackFilter === 'pop_science' ? 'active' : ''}`} onClick={() => setSelectedTrackFilter('pop_science')}>🎥 Pop Science</button>
                  )}
                  {availableTracks.includes('science_journalism') && (
                    <button className={`ft-chip ${selectedTrackFilter === 'science_journalism' ? 'active' : ''}`} onClick={() => setSelectedTrackFilter('science_journalism')}>📰 Journalism</button>
                  )}
                </div>
              </div>
            ) : (
              <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#475569', background: '#f8fafc', padding: '0.35rem 0.85rem', borderRadius: '10px', border: '1px solid #cbd5e1' }}>
                Track: <strong>{availableTracks[0] === 'pop_science' ? '🎥 Pop Science Videos' : '📰 Science Journalism'}</strong>
              </div>
            )}
          </div>

          {/* Submissions High-Density Compact Table */}
          {filteredSubmissions.length === 0 ? (
            <div className="ft-empty">
              <div className="ft-empty-icon">📝</div>
              <div className="ft-empty-title">No Submissions Uploaded for Stage {effectiveStageId}</div>
              <div className="ft-empty-text">Competitors have not uploaded deliverables for this stage yet. Check back closer to the stage deadline.</div>
            </div>
          ) : (
            <div className="ft-table-wrapper" style={{ background: '#ffffff', borderRadius: '20px', border: '1.5px solid #e2e8f0', boxShadow: '0 4px 16px rgba(0,0,0,0.02)' }}>
              <table className="ft-table" style={{ tableLayout: 'fixed', width: '100%', minWidth: '850px' }}>
                <thead>
                  <tr>
                    <th style={{ width: '110px' }}>ID Number</th>
                    <th style={{ width: '220px' }}>Competitor / Team</th>
                    <th style={{ width: '150px' }}>Track</th>
                    <th style={{ width: '220px' }}>Submitted Deliverable Work</th>
                    <th style={{ width: '120px' }}>Status</th>
                    <th style={{ width: '110px' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSubmissions.map((sub) => {
                    const existingEval = evaluations.find(e => 
                      Number(e.stageId) === Number(sub.stageId) && 
                      (e.competitorId === sub.competitorId || e.teamId === sub.teamId) &&
                      e.judgeId === (userId || meDoc?.id)
                    );

                    const compDoc = scientists.find(s => s.id === sub.competitorId || s.email === sub.competitorEmail);
                    const displayCode = sub.teamId 
                      ? formatSimpleCode(sub.teamCode || sub.teamId, true)
                      : formatSimpleCode(compDoc?.competitorCode || compDoc?.competitorIdNumber || sub.competitorId, false);

                    return (
                      <tr key={sub.id} onClick={() => openGradingModal(sub)} style={{ cursor: 'pointer', background: existingEval ? '#f0fdf4' : undefined }}>
                        <td style={{ width: '110px' }}>
                          <span style={{
                            fontFamily: "'Outfit', sans-serif",
                            fontWeight: 900,
                            color: sub.teamId ? '#be123c' : '#2563eb',
                            background: sub.teamId ? '#fff1f2' : '#eff6ff',
                            padding: '0.25rem 0.55rem',
                            borderRadius: '8px',
                            fontSize: '0.82rem',
                            border: `1.5px solid ${sub.teamId ? '#fecdd3' : '#bfdbfe'}`
                          }}>
                            {displayCode}
                          </span>
                        </td>

                        <td style={{ width: '220px' }}>
                          <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#0f172a' }}>
                            {sub.teamName ? `👥 ${sub.teamName}` : (sub.competitorName || 'Competitor')}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                            {sub.competitorEmail || 'Submitted work'}
                          </div>
                        </td>

                        <td style={{ width: '150px' }}>
                          <span style={{ fontSize: '0.78rem', fontWeight: 800, color: sub.track === 'pop_science' ? '#be123c' : '#2563eb' }}>
                            {sub.track === 'pop_science' ? '🎥 Pop Videos' : '📰 Journalism'}
                          </span>
                        </td>

                        <td style={{ width: '220px' }} onClick={e => e.stopPropagation()}>
                          {normalizeTrackKey(compDoc?.registeredTrack || sub.track) === 'pop_science' ? (
                            (sub.videoUrl || sub.fileUrl) ? (
                              <a href={sub.videoUrl || sub.fileUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#be123c', fontWeight: 800, fontSize: '0.82rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', textDecoration: 'none' }}>
                                🎥 Open Video Work <ExternalLink size={13} />
                              </a>
                            ) : (
                              <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>No Video Attached</span>
                            )
                          ) : (
                            (sub.fileUrl || sub.pdfUrl || sub.videoUrl) ? (
                              <a href={sub.fileUrl || sub.pdfUrl || sub.videoUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb', fontWeight: 800, fontSize: '0.82rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', textDecoration: 'none' }}>
                                📄 Open Article PDF <ExternalLink size={13} />
                              </a>
                            ) : (
                              <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>No PDF Attached</span>
                            )
                          )}
                        </td>

                        <td style={{ width: '120px' }}>
                          {existingEval ? (
                            <span style={{ fontSize: '0.75rem', fontWeight: 900, background: '#dcfce7', color: '#15803d', padding: '0.2rem 0.55rem', borderRadius: '8px', border: '1px solid #86efac' }}>
                              {existingEval.totalScore} pts ✅
                            </span>
                          ) : (
                            <span style={{ fontSize: '0.75rem', fontWeight: 800, background: '#fef3c7', color: '#b45309', padding: '0.2rem 0.55rem', borderRadius: '8px', border: '1px solid #fde68a' }}>
                              Pending ⏳
                            </span>
                          )}
                        </td>

                        <td style={{ width: '110px' }} onClick={e => e.stopPropagation()}>
                          <button
                            onClick={() => openGradingModal(sub)}
                            className="ft-btn"
                            style={{
                              background: existingEval ? '#f1f5f9' : '#be123c',
                              color: existingEval ? '#334155' : '#ffffff',
                              border: `1.5px solid ${existingEval ? '#cbd5e1' : '#be123c'}`,
                              fontWeight: 900, fontSize: '0.78rem', padding: '0.35rem 0.75rem', borderRadius: '8px', cursor: 'pointer'
                            }}
                          >
                            {existingEval ? '✏️ Review' : '🏅 Evaluate'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* GRADING POPUP MODAL */}
      {evalModalItem && createPortal(
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.82)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, padding: '1.5rem', overflowY: 'auto' }}>
          <div className="ft-card ft-animate-in" style={{ width: '100%', maxWidth: '640px', padding: '1.75rem', background: '#ffffff', borderRadius: '24px', margin: 'auto', maxHeight: 'calc(100vh - 3rem)', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem', flexShrink: 0 }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0f172a', margin: 0 }}>
                  🏅 Grade Submission: {evalModalItem.teamName || evalModalItem.competitorName}
                </h3>
                <div style={{ fontSize: '0.8rem', color: '#be123c', fontWeight: 800, marginTop: '0.15rem' }}>
                  Stage {evalModalItem.stageId} · Track: {evalModalItem.track === 'pop_science' ? 'Pop Science' : 'Science Journalism'}
                </div>
              </div>

              <button onClick={() => setEvalModalItem(null)} style={{ background: '#f1f5f9', border: 'none', width: '32px', height: '32px', borderRadius: '50%', fontWeight: 800, cursor: 'pointer' }}>✕</button>
            </div>

            <form onSubmit={handleSaveGrading} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', overflowY: 'auto', paddingRight: '0.25rem' }}>
              
              {/* Submission Deliverable Preview Box */}
              <div style={{ background: '#f8fafc', padding: '1rem 1.25rem', borderRadius: '14px', border: '1.5px solid #cbd5e1' }}>
                <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                  📁 Submitted Deliverable Work:
                </div>
                <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0f172a', marginBottom: '0.4rem' }}>
                  {evalModalItem.title || 'Stage Deliverable Project'}
                </div>
                {normalizeTrackKey(evalModalItem.track) === 'pop_science' ? (
                  (evalModalItem.videoUrl || evalModalItem.fileUrl) ? (
                    <a
                      href={evalModalItem.videoUrl || evalModalItem.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ft-btn"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: '#be123c', color: '#ffffff', fontWeight: 800, fontSize: '0.82rem', padding: '0.45rem 0.9rem', borderRadius: '8px', textDecoration: 'none', marginTop: '0.25rem' }}
                    >
                      🎥 Watch Submitted Video Work <ExternalLink size={14} />
                    </a>
                  ) : (
                    <div style={{ fontSize: '0.82rem', color: '#94a3b8', fontStyle: 'italic', marginTop: '0.2rem' }}>No video link provided</div>
                  )
                ) : (
                  (evalModalItem.fileUrl || evalModalItem.pdfUrl || evalModalItem.videoUrl) ? (
                    <a
                      href={evalModalItem.fileUrl || evalModalItem.pdfUrl || evalModalItem.videoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ft-btn"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: '#2563eb', color: '#ffffff', fontWeight: 800, fontSize: '0.82rem', padding: '0.45rem 0.9rem', borderRadius: '8px', textDecoration: 'none', marginTop: '0.25rem' }}
                    >
                      📄 Open Science Article (PDF) <ExternalLink size={14} />
                    </a>
                  ) : (
                    <div style={{ fontSize: '0.82rem', color: '#94a3b8', fontStyle: 'italic', marginTop: '0.2rem' }}>No PDF article attached</div>
                  )
                )}
              </div>

              {/* Scoring Criteria Inputs */}
              <div>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 900, color: '#0f172a', margin: '0 0 0.75rem 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  📊 Criteria Points Breakdown
                </h4>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {filterCriteriaByRole(
                    ALL_STAGES.find(s => Number(s.stageId) === Number(evalModalItem.stageId) && s.track === evalModalItem.track)?.criteria || [],
                    userRole
                  ).map(crit => (
                    <div key={crit.id} style={{ background: '#f8fafc', padding: '1rem', borderRadius: '14px', border: '1.5px solid #cbd5e1' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                        <label style={{ fontWeight: 800, fontSize: '0.92rem', color: '#0f172a' }}>{crit.name}</label>
                        <span style={{ fontSize: '0.8rem', fontWeight: 900, color: '#be123c' }}>
                          Max: {crit.maxPoints} pts
                        </span>
                      </div>
                      <input
                        type="number"
                        min="0"
                        max={crit.maxPoints}
                        required
                        className="ft-input"
                        value={evalScores[crit.id] || ''}
                        onChange={e => setEvalScores({ ...evalScores, [crit.id]: Number(e.target.value) })}
                        placeholder={`Enter score 0 - ${crit.maxPoints}`}
                        style={{ fontSize: '0.95rem', fontWeight: 800 }}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Written Feedback Comments */}
              <div className="ft-input-group">
                <label className="ft-label">Judges Feedback & Advice / ملاحظات وتعليقات المقيم *</label>
                <textarea
                  className="ft-textarea"
                  rows={3}
                  required
                  value={comments}
                  onChange={e => setComments(e.target.value)}
                  placeholder="Provide constructive feedback, praise, or suggestions for the competitor/team..."
                  style={{ fontSize: '0.88rem' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button type="button" className="ft-btn ft-btn-secondary" onClick={() => setEvalModalItem(null)}>Cancel</button>
                <button type="submit" className="ft-btn ft-btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving Evaluation...' : 'Save & Submit Grade'}
                </button>
              </div>

            </form>

          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
