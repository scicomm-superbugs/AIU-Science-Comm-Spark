import { useState, useMemo } from 'react';
import { useLiveCollection, db } from './db';
import { ClipboardCheck, Users, User, CheckCircle2, Save, Search, Sparkles, Award, MessageSquare, Link as LinkIcon, Star, Filter, Calendar } from 'lucide-react';
import { DEFAULT_STAGES } from './FTMyCompetition';
import { formatSimpleCode } from './ftConstants';
import './scicommspark.css';

export default function FTEvaluationManagement() {
  const scientists = useLiveCollection('scientists') || [];
  const teams = useLiveCollection('ft_teams') || [];
  const submissions = useLiveCollection('submissions') || [];
  const timelineConfig = useLiveCollection('timeline_config') || [];
  const evaluations = useLiveCollection('ft_evaluations') || [];

  const [selectedTrack, setSelectedTrack] = useState('pop_science');
  const [selectedStageId, setSelectedStageId] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [toast, setToast] = useState('');

  // Editing single evaluation state
  const [editingEvalId, setEditingEvalId] = useState(null);
  const [editForm, setEditForm] = useState({ judgeName: '', score: '', comments: '' });

  // Single evaluation entry form state
  const [selectedTargetId, setSelectedTargetId] = useState('');
  const [targetSearchText, setTargetSearchText] = useState('');
  const [showTargetDropdown, setShowTargetDropdown] = useState(false);

  const [selectedSubmissionId, setSelectedSubmissionId] = useState('');
  const [subSearchText, setSubSearchText] = useState('');
  const [showSubDropdown, setShowSubDropdown] = useState(false);

  const [newJudgeId, setNewJudgeId] = useState('');
  const [judgeSearchText, setJudgeSearchText] = useState('');
  const [showJudgeDropdown, setShowJudgeDropdown] = useState(false);

  const [newScore, setNewScore] = useState('');
  const [newComment, setNewComment] = useState('');

  // History filter by submission
  const [selectedHistorySubId, setSelectedHistorySubId] = useState('all');

  // Controlled evaluation form URLs state per submission deliverable
  const [evalUrls, setEvalUrls] = useState({}); // { [subFieldId]: url }

  // Per-submission judge search input & dropdown states
  const [subJudgeSearchText, setSubJudgeSearchText] = useState({});
  const [subJudgeDropdownOpen, setSubJudgeDropdownOpen] = useState({});

  // Per-competitor evaluation draft state
  const [evalForm, setEvalForm] = useState({}); // { [targetId]: { judgeName: '', judgeId: '', score: '', comment: '' } }

  const showToast = (text) => {
    setToast(text);
    setTimeout(() => setToast(''), 3500);
  };

  // Get all judges from scientists collection
  const allJudges = useMemo(() => {
    return scientists.filter(s =>
      ['judge', 'academic_judge', 'scicomm_judge', 'trainer_judge', 'faculty', 'admin', 'master'].includes(s.role)
    );
  }, [scientists]);

  // Current stage timeline config
  const currentStageConfig = useMemo(() => {
    const customConfig = timelineConfig.find(c => c.track === selectedTrack && Number(c.stageId) === Number(selectedStageId));
    const defaultConfig = (DEFAULT_STAGES[selectedTrack] || DEFAULT_STAGES.pop_science).find(s => Number(s.stageId) === Number(selectedStageId));
    return customConfig ? { ...defaultConfig, ...customConfig } : defaultConfig;
  }, [timelineConfig, selectedTrack, selectedStageId]);

  // Calculate max possible stage points from stage criteria
  const maxStagePoints = useMemo(() => {
    if (!currentStageConfig || !currentStageConfig.criteria || currentStageConfig.criteria.length === 0) return 50;
    const sum = currentStageConfig.criteria.reduce((acc, c) => acc + Number(c.maxPoints || c.points || 0), 0);
    return sum > 0 ? sum : 50;
  }, [currentStageConfig]);

  // Submissions for the current stage set by admin
  const stageSubmissions = useMemo(() => {
    if (currentStageConfig?.submissions && currentStageConfig.submissions.length > 0) {
      return currentStageConfig.submissions;
    }
    return [{ id: 'sub_1', name: 'Submission Deliverable 1' }];
  }, [currentStageConfig]);

  // Assigned judges list for current stage
  const assignedJudgeIds = currentStageConfig?.assignedJudgeIds || [];

  // Toggle judge assignment for current stage
  const handleToggleJudgeAssignment = async (judgeId) => {
    try {
      const existingDoc = timelineConfig.find(c => c.track === selectedTrack && Number(c.stageId) === Number(selectedStageId));
      const targetDocId = existingDoc?.id || `${selectedTrack}_stage_${selectedStageId}`;
      const currentIds = existingDoc?.assignedJudgeIds || currentStageConfig?.assignedJudgeIds || [];
      const newIds = currentIds.includes(judgeId)
        ? currentIds.filter(id => id !== judgeId)
        : [...currentIds, judgeId];

      const dataToSave = {
        id: String(targetDocId),
        track: String(selectedTrack === 'all' ? (existingDoc?.track || 'pop_science') : selectedTrack),
        stageId: Number(selectedStageId),
        title: String(existingDoc?.title || currentStageConfig?.title || `Stage ${selectedStageId}`),
        sub: String(existingDoc?.sub || currentStageConfig?.sub || ''),
        deadline: String(existingDoc?.deadline || currentStageConfig?.deadline || 'TBD'),
        isTbd: Boolean(existingDoc?.isTbd || currentStageConfig?.isTbd),
        status: String(existingDoc?.status || currentStageConfig?.status || 'Active Stage'),
        details: String(existingDoc?.details || currentStageConfig?.details || ''),
        criteria: existingDoc?.criteria || currentStageConfig?.criteria || [],
        submissions: (existingDoc?.submissions || currentStageConfig?.submissions || []).map(s => {
          const cleaned = {
            id: String(s.id || ''),
            name: String(s.name || ''),
            type: String(s.type || 'url'),
            openDate: String(s.openDate || ''),
            deadline: String(s.deadline || ''),
            isOpen: Boolean(s.isOpen !== false)
          };
          if (s.googleFormUrl) cleaned.googleFormUrl = String(s.googleFormUrl);
          if (s.evalGoogleFormUrl) cleaned.evalGoogleFormUrl = String(s.evalGoogleFormUrl);
          if (s.assignedJudgeIds) cleaned.assignedJudgeIds = s.assignedJudgeIds.map(id => String(id));
          return cleaned;
        }),
        assignedJudgeIds: newIds.map(id => String(id)),
        acceptSubmissions: Boolean(existingDoc?.acceptSubmissions !== false),
        googleFormUrl: String(existingDoc?.googleFormUrl || currentStageConfig?.googleFormUrl || ''),
        updatedAt: new Date().toISOString()
      };

      await db.timeline_config.set(targetDocId, dataToSave);
      showToast(newIds.includes(judgeId) ? '✅ Judge assigned to stage!' : 'ℹ️ Judge unassigned from stage.');
    } catch (err) {
      alert('Failed to update judge assignment: ' + err.message);
    }
  };

  // Handle saving evaluation Google Form URL per submission deliverable
  const handleSaveEvalGoogleFormUrl = async (subFieldId, evalUrl) => {
    try {
      const existingDoc = timelineConfig.find(c => c.track === selectedTrack && Number(c.stageId) === Number(selectedStageId));
      const targetDocId = existingDoc?.id || `${selectedTrack}_stage_${selectedStageId}`;
      const currentSubs = existingDoc?.submissions || currentStageConfig?.submissions || [];

      const updatedSubs = currentSubs.map(sf =>
        sf.id === subFieldId ? { ...sf, evalGoogleFormUrl: evalUrl.trim() } : sf
      );

      const dataToSave = {
        id: String(targetDocId),
        track: String(selectedTrack === 'all' ? (existingDoc?.track || 'pop_science') : selectedTrack),
        stageId: Number(selectedStageId),
        title: String(existingDoc?.title || currentStageConfig?.title || `Stage ${selectedStageId}`),
        sub: String(existingDoc?.sub || currentStageConfig?.sub || ''),
        deadline: String(existingDoc?.deadline || currentStageConfig?.deadline || 'TBD'),
        isTbd: Boolean(existingDoc?.isTbd || currentStageConfig?.isTbd),
        status: String(existingDoc?.status || currentStageConfig?.status || 'Active Stage'),
        details: String(existingDoc?.details || currentStageConfig?.details || ''),
        criteria: existingDoc?.criteria || currentStageConfig?.criteria || [],
        submissions: updatedSubs.map(s => {
          const cleaned = {
            id: String(s.id || ''),
            name: String(s.name || ''),
            type: String(s.type || 'url'),
            openDate: String(s.openDate || ''),
            deadline: String(s.deadline || ''),
            isOpen: Boolean(s.isOpen !== false)
          };
          if (s.googleFormUrl) cleaned.googleFormUrl = String(s.googleFormUrl);
          if (s.evalGoogleFormUrl) cleaned.evalGoogleFormUrl = String(s.evalGoogleFormUrl);
          if (s.assignedJudgeIds) cleaned.assignedJudgeIds = s.assignedJudgeIds.map(id => String(id));
          return cleaned;
        }),
        assignedJudgeIds: (existingDoc?.assignedJudgeIds || currentStageConfig?.assignedJudgeIds || []).map(id => String(id)),
        acceptSubmissions: Boolean(existingDoc?.acceptSubmissions !== false),
        googleFormUrl: String(existingDoc?.googleFormUrl || currentStageConfig?.googleFormUrl || ''),
        updatedAt: new Date().toISOString()
      };

      await db.timeline_config.set(targetDocId, dataToSave);
      showToast('✅ Evaluation Google Form URL saved successfully!');
    } catch (err) {
      alert('Failed to save evaluation form URL: ' + err.message);
    }
  };

  // Toggle judge assignment specifically for a submission deliverable
  const handleToggleSubmissionJudgeAssignment = async (subFieldId, judgeId) => {
    try {
      const existingDoc = timelineConfig.find(c => c.track === selectedTrack && Number(c.stageId) === Number(selectedStageId));
      const targetDocId = existingDoc?.id || `${selectedTrack}_stage_${selectedStageId}`;
      const currentSubs = existingDoc?.submissions || currentStageConfig?.submissions || [];

      const updatedSubs = currentSubs.map(s => {
        if (s.id === subFieldId) {
          const currentJudgeIds = s.assignedJudgeIds || [];
          const newJudgeIds = currentJudgeIds.includes(judgeId)
            ? currentJudgeIds.filter(id => id !== judgeId)
            : [...currentJudgeIds, judgeId];
          return { ...s, assignedJudgeIds: newJudgeIds.map(id => String(id)) };
        }
        return s;
      });

      const dataToSave = {
        id: String(targetDocId),
        track: String(selectedTrack === 'all' ? (existingDoc?.track || 'pop_science') : selectedTrack),
        stageId: Number(selectedStageId),
        title: String(existingDoc?.title || currentStageConfig?.title || `Stage ${selectedStageId}`),
        sub: String(existingDoc?.sub || currentStageConfig?.sub || ''),
        deadline: String(existingDoc?.deadline || currentStageConfig?.deadline || 'TBD'),
        isTbd: Boolean(existingDoc?.isTbd || currentStageConfig?.isTbd),
        status: String(existingDoc?.status || currentStageConfig?.status || 'Active Stage'),
        details: String(existingDoc?.details || currentStageConfig?.details || ''),
        criteria: existingDoc?.criteria || currentStageConfig?.criteria || [],
        submissions: updatedSubs.map(s => {
          const cleaned = {
            id: String(s.id || ''),
            name: String(s.name || ''),
            type: String(s.type || 'url'),
            openDate: String(s.openDate || ''),
            deadline: String(s.deadline || ''),
            isOpen: Boolean(s.isOpen !== false)
          };
          if (s.googleFormUrl) cleaned.googleFormUrl = String(s.googleFormUrl);
          if (s.evalGoogleFormUrl) cleaned.evalGoogleFormUrl = String(s.evalGoogleFormUrl);
          if (s.assignedJudgeIds) cleaned.assignedJudgeIds = s.assignedJudgeIds.map(id => String(id));
          return cleaned;
        }),
        assignedJudgeIds: (existingDoc?.assignedJudgeIds || currentStageConfig?.assignedJudgeIds || []).map(id => String(id)),
        acceptSubmissions: Boolean(existingDoc?.acceptSubmissions !== false),
        googleFormUrl: String(existingDoc?.googleFormUrl || currentStageConfig?.googleFormUrl || ''),
        updatedAt: new Date().toISOString()
      };

      await db.timeline_config.set(targetDocId, dataToSave);
      showToast('✅ Submission deliverable judge assignment updated successfully!');
    } catch (err) {
      alert('Failed to update submission judge assignment: ' + err.message);
    }
  };

  // Filter list of competitors/teams submitted or participating in this stage
  const competitorsList = useMemo(() => {
    const list = [];

    // Map through submissions for selected stage & track
    submissions.forEach(sub => {
      const isStageMatch = Number(sub.stageId) === Number(selectedStageId);
      if (!isStageMatch) return;

      const isTeam = Boolean(sub.teamId);
      const targetId = isTeam ? sub.teamId : (sub.competitorId || sub.id);
      const matchingTeam = isTeam ? teams.find(t => t.id === sub.teamId) : null;
      const matchingScientist = !isTeam ? scientists.find(s => s.id === sub.competitorId || s.username === sub.competitorUsername) : null;

      const rawTrack = sub.track || matchingTeam?.track || matchingScientist?.registeredTrack || selectedTrack;
      const normTrack = String(rawTrack).toLowerCase();
      const isTrackMatch = selectedTrack === 'all' ||
        (selectedTrack === 'science_journalism' ? (normTrack.includes('journalism') || normTrack.includes('article')) : normTrack.includes('pop'));

      if (!isTrackMatch) return;

      const rawCode = isTeam
        ? (matchingTeam?.code || sub.teamCode || sub.teamId)
        : (matchingScientist?.competitorIdNumber || matchingScientist?.competitorCode || sub.competitorCode || sub.competitorId || sub.id);

      const displayCode = formatSimpleCode(rawCode, isTeam);
      const name = isTeam ? (sub.teamName || matchingTeam?.name || 'Team Submission') : (sub.competitorName || matchingScientist?.name || matchingScientist?.username || 'Competitor');

      // Find existing evaluations for this competitor/team on this stage
      const subEvals = evaluations.filter(e =>
        Number(e.stageId) === Number(selectedStageId) &&
        (e.competitorId === targetId || e.teamId === targetId || e.competitorId === sub.competitorId || e.teamId === sub.teamId)
      );

      list.push({
        targetId,
        targetType: isTeam ? 'team' : 'competitor',
        name,
        code: displayCode,
        track: rawTrack,
        submission: sub,
        evals: subEvals
      });
    });

    // Deduplicate by targetId
    const uniqueMap = new Map();
    list.forEach(item => {
      if (!uniqueMap.has(item.targetId)) {
        uniqueMap.set(item.targetId, item);
      }
    });

    let result = Array.from(uniqueMap.values());

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(item =>
        item.name.toLowerCase().includes(q) ||
        item.code.toLowerCase().includes(q)
      );
    }

    return result;
  }, [submissions, teams, scientists, evaluations, selectedStageId, selectedTrack, searchQuery]);

  // Handle saving evaluation score and comment for a competitor/team
  const handleSaveEvaluation = async (targetItem) => {
    const draft = evalForm[targetItem.targetId] || {};
    const judgeName = draft.judgeName?.trim() || 'Official Judge Panel';
    const scoreVal = draft.score !== undefined && draft.score !== '' ? Number(draft.score) : null;
    const commentText = draft.comment?.trim() || '';

    if (scoreVal === null && !commentText) {
      alert('Please enter a grade score or write a comment before saving.');
      return;
    }

    try {
      const evalData = {
        stageId: Number(selectedStageId),
        track: selectedTrack,
        targetId: targetItem.targetId,
        targetType: targetItem.targetType,
        competitorId: targetItem.targetId,
        teamId: targetItem.targetType === 'team' ? targetItem.targetId : null,
        competitorName: targetItem.name,
        competitorCode: targetItem.code,
        judgeName: judgeName,
        judgeId: draft.judgeId || 'admin_eval',
        comments: commentText,
        score: scoreVal,
        evaluatedAt: new Date().toISOString(),
        status: 'completed'
      };

      await db.ft_evaluations.add(evalData);

      // Clear draft for this target
      setEvalForm(prev => ({
        ...prev,
        [targetItem.targetId]: { judgeName: '', judgeId: '', score: '', comment: '' }
      }));

      showToast(`✅ Grade & comment saved for ${targetItem.name} under judge "${judgeName}"!`);
    } catch (err) {
      alert('Failed to save evaluation: ' + err.message);
    }
  };

  // Delete an existing evaluation record
  const handleDeleteEvaluation = async (evalId) => {
    if (!evalId) return;
    if (!window.confirm('Are you sure you want to delete this evaluation entry?')) return;
    try {
      await db.ft_evaluations.delete(evalId);
      showToast('🗑️ Evaluation record deleted successfully.');
    } catch (err) {
      alert('Failed to delete evaluation record: ' + err.message);
    }
  };

  // Start editing an evaluation record
  const handleStartEditEvaluation = (ev) => {
    setEditingEvalId(ev.id);
    setEditForm({
      judgeName: ev.judgeName || '',
      score: ev.score !== undefined && ev.score !== null ? String(ev.score) : '',
      comments: ev.comments || ''
    });
  };

  // Save edited evaluation record
  const handleSaveEditedEvaluation = async (evId) => {
    try {
      const scoreVal = editForm.score !== '' && !isNaN(Number(editForm.score))
        ? Math.min(maxStagePoints, Math.max(0, Number(editForm.score)))
        : null;

      await db.ft_evaluations.set(evId, {
        judgeName: editForm.judgeName.trim() || 'Official Judge Panel',
        score: scoreVal,
        comments: editForm.comments.trim(),
        updatedAt: new Date().toISOString()
      });

      setEditingEvalId(null);
      showToast('✅ Evaluation entry updated successfully!');
    } catch (err) {
      alert('Failed to save evaluation edits: ' + err.message);
    }
  };

  // Compile all competitor and team options by code for selection
  const competitorOptions = useMemo(() => {
    const options = [];
    const addedIds = new Set();

    // 1. Teams
    teams.forEach(t => {
      const rawTrack = t.track || 'pop_science';
      const normTrack = String(rawTrack).toLowerCase();
      const isTrackMatch = selectedTrack === 'all' ||
        (selectedTrack === 'science_journalism' ? (normTrack.includes('journal') || normTrack.includes('article')) : normTrack.includes('pop'));

      if (isTrackMatch) {
        const code = formatSimpleCode(t.code, true);
        options.push({
          targetId: t.id,
          targetType: 'team',
          code: code,
          name: t.name,
          displayText: `👥 ${code} - ${t.name} (Team)`
        });
        addedIds.add(t.id);
      }
    });

    // 2. Solo Competitors
    scientists.forEach(s => {
      if (s.role === 'competitor' || s.role === 'user' || !s.role) {
        const rawTrack = s.registeredTrack || 'pop_science';
        const normTrack = String(rawTrack).toLowerCase();
        const isTrackMatch = selectedTrack === 'all' ||
          (selectedTrack === 'science_journalism' ? (normTrack.includes('journal') || normTrack.includes('article')) : normTrack.includes('pop'));

        if (isTrackMatch && !addedIds.has(s.id)) {
          const rawCode = s.competitorCode || s.competitorIdNumber || s.employeeId || s.id;
          const code = formatSimpleCode(rawCode, false);
          options.push({
            targetId: s.id,
            targetType: 'competitor',
            code: code,
            name: s.name || s.username,
            displayText: `👤 ${code} - ${s.name || s.username} (Competitor)`
          });
          addedIds.add(s.id);
        }
      }
    });

    return options;
  }, [teams, scientists, selectedTrack]);

  // Filtered competitor options for autocomplete
  const filteredCompetitorOptions = useMemo(() => {
    if (!targetSearchText.trim()) return competitorOptions;
    const q = targetSearchText.toLowerCase().trim();
    return competitorOptions.filter(o =>
      o.code.toLowerCase().includes(q) ||
      o.name.toLowerCase().includes(q)
    );
  }, [competitorOptions, targetSearchText]);

  // Filtered submission options for autocomplete
  const filteredSubmissions = useMemo(() => {
    if (!subSearchText.trim()) return stageSubmissions;
    const q = subSearchText.toLowerCase().trim();
    return stageSubmissions.filter(s => s.name.toLowerCase().includes(q));
  }, [stageSubmissions, subSearchText]);

  // Filtered judge options for autocomplete
  const filteredJudges = useMemo(() => {
    if (!judgeSearchText.trim()) return allJudges;
    const q = judgeSearchText.toLowerCase().trim();
    return allJudges.filter(j =>
      (j.name || '').toLowerCase().includes(q) ||
      (j.username || '').toLowerCase().includes(q) ||
      (j.role || '').toLowerCase().includes(q)
    );
  }, [allJudges, judgeSearchText]);

  // Handle saving new single evaluation entry
  const handleSaveSingleEvaluation = async () => {
    if (!selectedTargetId) {
      alert('Please choose a competitor or team by code first.');
      return;
    }
    if (newScore === '' || newScore === null || isNaN(Number(newScore))) {
      alert(`Please enter points (Required: 0 - ${maxStagePoints} pts max).`);
      return;
    }

    const scoreNum = Math.min(maxStagePoints, Math.max(0, Number(newScore)));
    const targetObj = competitorOptions.find(o => o.targetId === selectedTargetId);
    const selJudgeObj = allJudges.find(j => j.id === newJudgeId);
    const judgeName = selJudgeObj ? (selJudgeObj.name || selJudgeObj.username) : 'Official Judge Panel';
    const selSubObj = stageSubmissions.find(s => s.id === selectedSubmissionId);

    try {
      const evalData = {
        stageId: Number(selectedStageId),
        track: selectedTrack,
        submissionId: selectedSubmissionId || (stageSubmissions[0]?.id || 'sub_1'),
        submissionName: selSubObj ? selSubObj.name : (stageSubmissions[0]?.name || 'Submission Deliverable 1'),
        targetId: selectedTargetId,
        targetType: targetObj?.targetType || 'competitor',
        competitorId: selectedTargetId,
        teamId: targetObj?.targetType === 'team' ? selectedTargetId : null,
        competitorName: targetObj?.name || 'Competitor',
        competitorCode: targetObj?.code || 'C-101',
        judgeName: judgeName,
        judgeId: newJudgeId || 'admin_eval',
        comments: newComment.trim(),
        score: scoreNum,
        evaluatedAt: new Date().toISOString(),
        status: 'completed'
      };

      await db.ft_evaluations.add(evalData);

      // Reset form fields
      setSelectedTargetId('');
      setTargetSearchText('');
      setSelectedSubmissionId('');
      setSubSearchText('');
      setNewJudgeId('');
      setJudgeSearchText('');
      setNewScore('');
      setNewComment('');

      showToast(`✅ Saved ${scoreNum} pts for ${targetObj?.code || ''} (${targetObj?.name || ''})!`);
    } catch (err) {
      alert('Failed to save evaluation entry: ' + err.message);
    }
  };

  // Evaluation & Grading History with Search & Filter
  const historyList = useMemo(() => {
    let list = evaluations.filter(ev => {
      const isStageMatch = Number(ev.stageId) === Number(selectedStageId);
      const normTrack = String(ev.track || '').toLowerCase();
      const isTrackMatch = selectedTrack === 'all' ||
        (selectedTrack === 'science_journalism' ? normTrack.includes('journal') : (!normTrack || normTrack.includes('pop')));
      const isSubMatch = selectedHistorySubId === 'all' ||
        ev.submissionId === selectedHistorySubId ||
        ev.submissionName === selectedHistorySubId;
      return isStageMatch && isTrackMatch && isSubMatch;
    });

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(ev =>
        String(ev.competitorName || '').toLowerCase().includes(q) ||
        String(ev.competitorCode || '').toLowerCase().includes(q) ||
        String(ev.judgeName || '').toLowerCase().includes(q) ||
        String(ev.submissionName || '').toLowerCase().includes(q) ||
        String(ev.comments || '').toLowerCase().includes(q)
      );
    }

    return list.sort((a, b) => new Date(b.evaluatedAt || 0) - new Date(a.evaluatedAt || 0));
  }, [evaluations, selectedStageId, selectedTrack, selectedHistorySubId, searchQuery]);

  return (
    <div className="ft-animate-in" style={{ paddingBottom: '3rem' }}>
      {/* Toast Notification */}
      {toast && (
        <div style={{ position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 9999, background: '#0f172a', color: '#ffffff', padding: '0.85rem 1.4rem', borderRadius: '14px', fontWeight: 800, boxShadow: '0 10px 25px rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span>{toast}</span>
        </div>
      )}

      {/* Header Bar */}
      <div className="ft-page-header" style={{ marginBottom: '1.75rem' }}>
        <div>
          <h1 className="ft-page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ClipboardCheck size={28} style={{ color: 'var(--ft-primary)' }} />
            Evaluation & Judge Management
          </h1>
          <p className="ft-page-subtitle">
            Assign judges to stages, configure per-submission evaluation Google Form URLs, write comments using judge names, and set final grades/points.
          </p>
        </div>

        {/* Track Filter Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: '#ffffff', padding: '0.4rem 0.65rem', borderRadius: '16px', border: '1.5px solid #cbd5e1', boxShadow: '0 4px 14px rgba(0,0,0,0.04)' }}>
          <span style={{ fontSize: '0.82rem', fontWeight: 900, color: '#0f172a', padding: '0 0.2rem' }}>
            🎯 Track:
          </span>
          <button
            type="button"
            onClick={() => setSelectedTrack('pop_science')}
            style={{
              padding: '0.45rem 0.85rem', fontSize: '0.82rem', fontWeight: 800, borderRadius: '10px', border: 'none',
              background: selectedTrack === 'pop_science' ? '#be123c' : '#f1f5f9',
              color: selectedTrack === 'pop_science' ? '#ffffff' : '#64748b',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem'
            }}
          >
            🎙️ Pop Science
          </button>
          <button
            type="button"
            onClick={() => setSelectedTrack('science_journalism')}
            style={{
              padding: '0.45rem 0.85rem', fontSize: '0.82rem', fontWeight: 800, borderRadius: '10px', border: 'none',
              background: selectedTrack === 'science_journalism' ? '#2563eb' : '#f1f5f9',
              color: selectedTrack === 'science_journalism' ? '#ffffff' : '#64748b',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem'
            }}
          >
            📰 Journalism
          </button>
          <button
            type="button"
            onClick={() => setSelectedTrack('all')}
            style={{
              padding: '0.45rem 0.85rem', fontSize: '0.82rem', fontWeight: 800, borderRadius: '10px', border: 'none',
              background: selectedTrack === 'all' ? '#0f172a' : '#f1f5f9',
              color: selectedTrack === 'all' ? '#ffffff' : '#64748b',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem'
            }}
          >
            🌐 All Tracks
          </button>
        </div>
      </div>

      {/* Stage Selector Tabs */}
      <div style={{ display: 'flex', gap: '0.6rem', marginBottom: '2rem' }}>
        {[1, 2, 3].map(stId => (
          <button
            key={stId}
            onClick={() => setSelectedStageId(stId)}
            className="ft-btn"
            style={{
              padding: '0.65rem 1.4rem', borderRadius: '14px', fontWeight: 900, fontSize: '0.9rem',
              background: selectedStageId === stId ? 'linear-gradient(135deg, #be123c 0%, #9f1239 100%)' : '#ffffff',
              color: selectedStageId === stId ? '#ffffff' : '#334155',
              border: selectedStageId === stId ? 'none' : '1.5px solid #cbd5e1',
              boxShadow: selectedStageId === stId ? '0 4px 14px rgba(190,18,60,0.3)' : 'none',
              cursor: 'pointer'
            }}
          >
            🏆 Stage {stId}
          </button>
        ))}
      </div>

      {/* SECTION 1: STAGE JUDGE ASSIGNMENT & EVALUATION GOOGLE FORM URLS */}
      <div className="ft-card" style={{ padding: '1.75rem', borderRadius: '24px', marginBottom: '2rem', background: '#ffffff', border: '1.5px solid #e2e8f0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1.25rem' }}>
          <div style={{ background: '#ecfdf5', color: '#059669', padding: '0.55rem', borderRadius: '12px' }}>
            <Users size={22} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 900, color: '#0f172a', margin: 0 }}>
              Stage {selectedStageId} Judge Assignments & Evaluation Google Form URLs
            </h3>
            <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0.1rem 0 0 0' }}>
              Assign judges to evaluate this stage and configure an Evaluation Google Form URL for each submission deliverable.
            </p>
          </div>
        </div>

        {/* Per-Submission Evaluation Google Form URL Inputs & Per-Submission Judge Assignments */}

        {/* Per-Submission Evaluation Google Form URL Inputs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <label style={{ fontSize: '0.88rem', fontWeight: 900, color: '#0f172a' }}>
            🔗 Evaluation Google Form URL per Submission Deliverable:
          </label>

          {((currentStageConfig?.submissions && currentStageConfig.submissions.length > 0) ? currentStageConfig.submissions : [
            { id: 'sub_def_1', name: 'Submission Deliverable 1' }
          ]).map((subField) => {
            const currentEvalUrlVal = evalUrls[subField.id] !== undefined
              ? evalUrls[subField.id]
              : (subField.evalGoogleFormUrl || '');
            const subAssignedIds = subField.assignedJudgeIds || [];

            return (
              <div key={subField.id} style={{ background: '#ffffff', padding: '1.2rem 1.35rem', borderRadius: '16px', border: '1.5px solid #cbd5e1', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <div style={{ fontSize: '0.9rem', fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span>📝 Submission Title:</span>
                  <strong style={{ color: '#be123c' }}>{subField.name}</strong>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.6rem' }}>
                  <input
                    type="url"
                    className="ft-input"
                    placeholder={`Evaluation Google Form URL for "${subField.name}" (e.g. https://forms.gle/...)`}
                    value={currentEvalUrlVal}
                    onChange={(e) => {
                      const val = e.target.value;
                      setEvalUrls(prev => ({ ...prev, [subField.id]: val }));
                    }}
                    style={{ fontSize: '0.85rem' }}
                  />
                  <button
                    type="button"
                    className="ft-btn ft-btn-primary"
                    onClick={() => handleSaveEvalGoogleFormUrl(subField.id, currentEvalUrlVal)}
                    style={{ fontWeight: 800, fontSize: '0.82rem' }}
                  >
                    <Save size={15} /> Save Form URL
                  </button>
                </div>

                {/* Per-Submission Specific Judge Assignments with Search & Suggestions Autocomplete */}
                <div style={{ background: '#f8fafc', padding: '1rem 1.15rem', borderRadius: '14px', border: '1px solid #e2e8f0', marginTop: '0.25rem', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <label style={{ fontSize: '0.82rem', fontWeight: 900, color: '#0f172a' }}>
                      👨‍⚖️ Assigned Judges for "{subField.name}" ({subAssignedIds.length} Assigned):
                    </label>
                  </div>

                  {/* Assigned Judge Badges with Remove (X) Button */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem' }}>
                    {subAssignedIds.length === 0 ? (
                      <span style={{ fontSize: '0.78rem', color: '#64748b', fontStyle: 'italic' }}>
                        No specific judges assigned yet. Search below to assign judges to this deliverable.
                      </span>
                    ) : (
                      subAssignedIds.map(jId => {
                        const jObj = allJudges.find(j => j.id === jId || j.username === jId || j.email === jId);
                        const jName = jObj ? (jObj.name || jObj.username) : jId;
                        const jRole = jObj?.role || 'judge';

                        return (
                          <span
                            key={jId}
                            style={{
                              padding: '0.35rem 0.65rem 0.35rem 0.8rem', borderRadius: '20px', fontWeight: 800, fontSize: '0.78rem',
                              background: '#ecfdf5', color: '#047857', border: '1.5px solid #a7f3d0',
                              display: 'inline-flex', alignItems: 'center', gap: '0.4rem', boxShadow: '0 2px 6px rgba(5,150,105,0.08)'
                            }}
                          >
                            <span>✅ {jName} <small style={{ color: '#059669', opacity: 0.8 }}>({jRole})</small></span>
                            <button
                              type="button"
                              onClick={() => handleToggleSubmissionJudgeAssignment(subField.id, jId)}
                              title="Remove judge assignment"
                              style={{
                                background: '#be123c', color: '#ffffff', border: 'none', borderRadius: '50%',
                                width: '18px', height: '18px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                cursor: 'pointer', fontSize: '0.65rem', padding: 0, fontWeight: 900, marginLeft: '0.2rem'
                              }}
                            >
                              ✕
                            </button>
                          </span>
                        );
                      })
                    )}
                  </div>

                  {/* Search Input with Live Suggestions Dropdown */}
                  <div style={{ position: 'relative', marginTop: '0.25rem' }}>
                    <div style={{ position: 'relative' }}>
                      <input
                        type="text"
                        className="ft-input"
                        style={{ fontSize: '0.82rem', paddingRight: '2rem', background: '#ffffff' }}
                        placeholder={`🔍 Type judge name or role to assign to "${subField.name}"...`}
                        value={subJudgeSearchText[subField.id] || ''}
                        onFocus={() => setSubJudgeDropdownOpen(prev => ({ ...prev, [subField.id]: true }))}
                        onBlur={() => setTimeout(() => setSubJudgeDropdownOpen(prev => ({ ...prev, [subField.id]: false })), 200)}
                        onChange={e => {
                          const val = e.target.value;
                          setSubJudgeSearchText(prev => ({ ...prev, [subField.id]: val }));
                          setSubJudgeDropdownOpen(prev => ({ ...prev, [subField.id]: true }));
                        }}
                      />
                      <Search size={15} style={{ position: 'absolute', right: 10, top: 11, color: '#94a3b8', pointerEvents: 'none' }} />
                    </div>

                    {subJudgeDropdownOpen[subField.id] && (
                      <div
                        style={{
                          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
                          background: '#ffffff', border: '1.5px solid #cbd5e1', borderRadius: '12px',
                          maxHeight: '200px', overflowY: 'auto', boxShadow: '0 10px 25px rgba(0,0,0,0.12)',
                          marginTop: '0.25rem', padding: '0.35rem 0'
                        }}
                      >
                        {(() => {
                          const q = (subJudgeSearchText[subField.id] || '').toLowerCase().trim();
                          const candidateJudges = allJudges.filter(j => {
                            return (j.name || '').toLowerCase().includes(q) ||
                                   (j.username || '').toLowerCase().includes(q) ||
                                   (j.role || '').toLowerCase().includes(q);
                          });

                          if (candidateJudges.length === 0) {
                            return (
                              <div style={{ padding: '0.6rem 0.85rem', fontSize: '0.8rem', color: '#94a3b8', fontStyle: 'italic' }}>
                                No matching judges found
                              </div>
                            );
                          }

                          return candidateJudges.map(j => {
                            const isAssigned = subAssignedIds.includes(j.id) || subAssignedIds.includes(j.username) || subAssignedIds.includes(j.email);

                            return (
                              <div
                                key={j.id}
                                onClick={() => {
                                  handleToggleSubmissionJudgeAssignment(subField.id, j.id);
                                  setSubJudgeSearchText(prev => ({ ...prev, [subField.id]: '' }));
                                  setSubJudgeDropdownOpen(prev => ({ ...prev, [subField.id]: false }));
                                }}
                                style={{
                                  padding: '0.5rem 0.85rem', fontSize: '0.82rem', fontWeight: 700, color: '#0f172a',
                                  cursor: 'pointer', background: isAssigned ? '#f0fdf4' : 'transparent',
                                  borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                                }}
                                onMouseDown={e => e.preventDefault()}
                              >
                                <span>👨‍⚖️ {j.name || j.username} <span style={{ fontSize: '0.72rem', color: '#64748b' }}>({j.role})</span></span>
                                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: isAssigned ? '#16a34a' : '#2563eb' }}>
                                  {isAssigned ? '✅ Assigned (Click to unassign)' : '➕ Add Judge'}
                                </span>
                              </div>
                            );
                          });
                        })()}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 2: COMPETITOR & TEAM GRADES & JUDGE FEEDBACK ENTRY & HISTORY */}
      <div className="ft-card" style={{ padding: '1.75rem', borderRadius: '24px', background: '#ffffff', border: '1.5px solid #e2e8f0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1.5rem' }}>
          <div style={{ background: '#fff1f2', color: '#be123c', padding: '0.55rem', borderRadius: '12px' }}>
            <Award size={22} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 900, color: '#0f172a', margin: 0 }}>
              Competitor & Team Final Grades & Judge Feedback Center (Stage {selectedStageId})
            </h3>
            <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0.1rem 0 0 0' }}>
              Select a competitor by code, choose judge name, enter points (required), write optional comments, and view history log.
            </p>
          </div>
        </div>

        {/* SINGLE EVALUATION ENTRY FORM */}
        <div style={{ background: '#f8fafc', padding: '1.35rem 1.5rem', borderRadius: '18px', border: '1.5px solid #cbd5e1', marginBottom: '2rem', display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
          <div style={{ fontSize: '0.95rem', fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            <Sparkles size={18} style={{ color: '#be123c' }} />
            Add Grade Score & Feedback Entry (Stage {selectedStageId}):
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.85rem' }}>
            {/* Competitor / Team Selector with Live Search Suggestions */}
            <div style={{ position: 'relative' }}>
              <label className="ft-label" style={{ fontSize: '0.78rem', marginBottom: '0.25rem', fontWeight: 800 }}>
                👤 Select Competitor / Team Code *
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  className="ft-input"
                  style={{ fontSize: '0.85rem', fontWeight: 700, paddingRight: '2rem' }}
                  placeholder="🔍 Search code (e.g. C-941) or name..."
                  value={targetSearchText}
                  onFocus={() => setShowTargetDropdown(true)}
                  onBlur={() => setTimeout(() => setShowTargetDropdown(false), 200)}
                  onChange={e => {
                    setTargetSearchText(e.target.value);
                    setSelectedTargetId('');
                    setShowTargetDropdown(true);
                  }}
                />
                <Search size={16} style={{ position: 'absolute', right: 10, top: 12, color: '#94a3b8', pointerEvents: 'none' }} />
              </div>

              {showTargetDropdown && (
                <div
                  style={{
                    position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
                    background: '#ffffff', border: '1.5px solid #cbd5e1', borderRadius: '12px',
                    maxHeight: '220px', overflowY: 'auto', boxShadow: '0 10px 25px rgba(0,0,0,0.12)',
                    marginTop: '0.25rem', padding: '0.35rem 0'
                  }}
                >
                  {filteredCompetitorOptions.length === 0 ? (
                    <div style={{ padding: '0.6rem 0.85rem', fontSize: '0.82rem', color: '#94a3b8', fontStyle: 'italic' }}>
                      No matching competitors found
                    </div>
                  ) : (
                    filteredCompetitorOptions.map(opt => (
                      <div
                        key={opt.targetId}
                        onClick={() => {
                          setSelectedTargetId(opt.targetId);
                          setTargetSearchText(opt.displayText);
                          setShowTargetDropdown(false);
                        }}
                        style={{
                          padding: '0.55rem 0.85rem', fontSize: '0.83rem', fontWeight: 700, color: '#0f172a',
                          cursor: 'pointer', background: selectedTargetId === opt.targetId ? '#f0f9ff' : 'transparent',
                          borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                        }}
                        onMouseDown={e => e.preventDefault()}
                      >
                        <span>{opt.displayText}</span>
                        {selectedTargetId === opt.targetId && <span style={{ color: '#0284c7', fontWeight: 900 }}>✓</span>}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Submission Deliverable with Live Search Suggestions */}
            <div style={{ position: 'relative' }}>
              <label className="ft-label" style={{ fontSize: '0.78rem', marginBottom: '0.25rem', fontWeight: 800 }}>
                📝 Select Submission Task / Deliverable
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  className="ft-input"
                  style={{ fontSize: '0.85rem', paddingRight: '2rem' }}
                  placeholder="🔍 Search deliverable task..."
                  value={subSearchText}
                  onFocus={() => setShowSubDropdown(true)}
                  onBlur={() => setTimeout(() => setShowSubDropdown(false), 200)}
                  onChange={e => {
                    setSubSearchText(e.target.value);
                    setSelectedSubmissionId('');
                    setShowSubDropdown(true);
                  }}
                />
                <Search size={16} style={{ position: 'absolute', right: 10, top: 12, color: '#94a3b8', pointerEvents: 'none' }} />
              </div>

              {showSubDropdown && (
                <div
                  style={{
                    position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
                    background: '#ffffff', border: '1.5px solid #cbd5e1', borderRadius: '12px',
                    maxHeight: '220px', overflowY: 'auto', boxShadow: '0 10px 25px rgba(0,0,0,0.12)',
                    marginTop: '0.25rem', padding: '0.35rem 0'
                  }}
                >
                  {filteredSubmissions.length === 0 ? (
                    <div style={{ padding: '0.6rem 0.85rem', fontSize: '0.82rem', color: '#94a3b8', fontStyle: 'italic' }}>
                      No matching deliverables found
                    </div>
                  ) : (
                    filteredSubmissions.map(sub => (
                      <div
                        key={sub.id}
                        onClick={() => {
                          setSelectedSubmissionId(sub.id);
                          setSubSearchText(sub.name);
                          setShowSubDropdown(false);
                        }}
                        style={{
                          padding: '0.55rem 0.85rem', fontSize: '0.83rem', fontWeight: 700, color: '#0f172a',
                          cursor: 'pointer', background: selectedSubmissionId === sub.id ? '#f0f9ff' : 'transparent',
                          borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                        }}
                        onMouseDown={e => e.preventDefault()}
                      >
                        <span>📝 {sub.name}</span>
                        {selectedSubmissionId === sub.id && <span style={{ color: '#0284c7', fontWeight: 900 }}>✓</span>}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Judge Name with Live Search Suggestions */}
            <div style={{ position: 'relative' }}>
              <label className="ft-label" style={{ fontSize: '0.78rem', marginBottom: '0.25rem', fontWeight: 800 }}>
                👨‍⚖️ Select Judge Name
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  className="ft-input"
                  style={{ fontSize: '0.85rem', paddingRight: '2rem' }}
                  placeholder="🔍 Search judge name or role..."
                  value={judgeSearchText}
                  onFocus={() => setShowJudgeDropdown(true)}
                  onBlur={() => setTimeout(() => setShowJudgeDropdown(false), 200)}
                  onChange={e => {
                    setJudgeSearchText(e.target.value);
                    setNewJudgeId('');
                    setShowJudgeDropdown(true);
                  }}
                />
                <Search size={16} style={{ position: 'absolute', right: 10, top: 12, color: '#94a3b8', pointerEvents: 'none' }} />
              </div>

              {showJudgeDropdown && (
                <div
                  style={{
                    position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
                    background: '#ffffff', border: '1.5px solid #cbd5e1', borderRadius: '12px',
                    maxHeight: '220px', overflowY: 'auto', boxShadow: '0 10px 25px rgba(0,0,0,0.12)',
                    marginTop: '0.25rem', padding: '0.35rem 0'
                  }}
                >
                  {filteredJudges.length === 0 ? (
                    <div style={{ padding: '0.6rem 0.85rem', fontSize: '0.82rem', color: '#94a3b8', fontStyle: 'italic' }}>
                      No matching judges found
                    </div>
                  ) : (
                    filteredJudges.map(j => (
                      <div
                        key={j.id}
                        onClick={() => {
                          setNewJudgeId(j.id);
                          setJudgeSearchText(`${j.name || j.username} (${j.role})`);
                          setShowJudgeDropdown(false);
                        }}
                        style={{
                          padding: '0.55rem 0.85rem', fontSize: '0.83rem', fontWeight: 700, color: '#0f172a',
                          cursor: 'pointer', background: newJudgeId === j.id ? '#f0f9ff' : 'transparent',
                          borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                        }}
                        onMouseDown={e => e.preventDefault()}
                      >
                        <span>👨‍⚖️ {j.name || j.username} <span style={{ fontSize: '0.72rem', color: '#64748b' }}>({j.role})</span></span>
                        {newJudgeId === j.id && <span style={{ color: '#0284c7', fontWeight: 900 }}>✓</span>}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Final Grade / Points Input (REQUIRED) */}
            <div>
              <label className="ft-label" style={{ fontSize: '0.78rem', marginBottom: '0.25rem', fontWeight: 800, color: '#be123c' }}>
                ⭐ Grade / Points * (Required: 0 - {maxStagePoints} pts max)
              </label>
              <input
                type="number"
                min="0"
                max={maxStagePoints}
                className="ft-input"
                style={{ fontSize: '0.85rem', fontWeight: 700 }}
                placeholder={`Required e.g. ${Math.round(maxStagePoints * 0.9)}`}
                value={newScore}
                onChange={e => {
                  let val = e.target.value;
                  if (val !== '' && Number(val) > maxStagePoints) val = String(maxStagePoints);
                  setNewScore(val);
                }}
              />
            </div>
          </div>

          {/* Optional Judge Comment */}
          <div>
            <label className="ft-label" style={{ fontSize: '0.78rem', marginBottom: '0.25rem', fontWeight: 800 }}>
              💬 Judge Comment & Evaluation Feedback (Optional)
            </label>
            <textarea
              className="ft-textarea"
              rows={2}
              style={{ fontSize: '0.85rem' }}
              placeholder="Write judge feedback or comment (Optional)..."
              value={newComment}
              onChange={e => setNewComment(e.target.value)}
            />
          </div>

          {/* Submit Button */}
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="button"
              className="ft-btn ft-btn-primary"
              onClick={handleSaveSingleEvaluation}
              style={{ fontWeight: 800, fontSize: '0.88rem', padding: '0.65rem 1.4rem', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '0.4rem', boxShadow: '0 4px 14px rgba(190,18,60,0.3)' }}
            >
              <Save size={16} /> Save Grade & Comment to History
            </button>
          </div>
        </div>

        {/* GRADING & FEEDBACK HISTORY SECTION WITH SEARCH & FILTERS */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', borderBottom: '2px solid #f1f5f9', paddingBottom: '0.75rem' }}>
            <div style={{ fontSize: '1rem', fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <MessageSquare size={18} style={{ color: '#be123c' }} />
              Grading & Feedback History Log ({historyList.length} Entries)
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
              {/* Submission Filter Dropdown */}
              <select
                className="ft-select"
                style={{ fontSize: '0.82rem', padding: '0.4rem 0.75rem', width: 'auto', background: '#f8fafc' }}
                value={selectedHistorySubId}
                onChange={e => setSelectedHistorySubId(e.target.value)}
              >
                <option value="all">📂 Filter: All Submissions ({stageSubmissions.length} Tasks)</option>
                {stageSubmissions.map(sub => (
                  <option key={sub.id} value={sub.id}>
                    📝 {sub.name}
                  </option>
                ))}
              </select>

              {/* Search Input for History Log */}
              <div style={{ position: 'relative', minWidth: '240px' }}>
              <Search size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                type="text"
                className="ft-input"
                style={{ paddingLeft: '2.5rem', fontSize: '0.85rem', background: '#f8fafc' }}
                placeholder="Search history by code, name, judge, or comment..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>

          {historyList.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2.5rem 1.5rem', background: '#f8fafc', borderRadius: '16px', border: '1px dashed #cbd5e1' }}>
              <div style={{ fontSize: '2.2rem', marginBottom: '0.4rem' }}>📋</div>
              <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>No Evaluation History Found</div>
              <div style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '0.2rem' }}>
                Use the form above to record grades and comments for Stage {selectedStageId}.
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {historyList.map((ev, evIdx) => {
                const targetEvId = ev.id || evIdx;
                const isEditingThis = editingEvalId === targetEvId;

                if (isEditingThis) {
                  return (
                    <div key={targetEvId} style={{ background: '#f0f9ff', padding: '1rem 1.2rem', borderRadius: '14px', border: '1.5px solid #0284c7', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <div style={{ fontWeight: 900, fontSize: '0.88rem', color: '#0369a1', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        ✏️ Edit History Entry for {ev.competitorCode || 'Competitor'} ({ev.competitorName || ''}):
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '0.75rem' }}>
                        <div>
                          <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#334155', display: 'block', marginBottom: '0.2rem' }}>👨‍⚖️ Judge Name:</label>
                          <input
                            type="text"
                            className="ft-input"
                            style={{ fontSize: '0.82rem', padding: '0.4rem 0.65rem' }}
                            value={editForm.judgeName}
                            onChange={e => setEditForm(prev => ({ ...prev, judgeName: e.target.value }))}
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#334155', display: 'block', marginBottom: '0.2rem' }}>⭐ Points (0 - {maxStagePoints} max):</label>
                          <input
                            type="number"
                            min="0"
                            max={maxStagePoints}
                            className="ft-input"
                            style={{ fontSize: '0.82rem', padding: '0.4rem 0.65rem' }}
                            value={editForm.score}
                            onChange={e => {
                              let v = e.target.value;
                              if (v !== '' && Number(v) > maxStagePoints) v = String(maxStagePoints);
                              setEditForm(prev => ({ ...prev, score: v }));
                            }}
                          />
                        </div>
                      </div>
                      <div>
                        <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#334155', display: 'block', marginBottom: '0.2rem' }}>💬 Feedback Comment (Optional):</label>
                        <textarea
                          className="ft-textarea"
                          style={{ fontSize: '0.82rem', padding: '0.4rem 0.65rem', minHeight: '60px' }}
                          value={editForm.comments}
                          onChange={e => setEditForm(prev => ({ ...prev, comments: e.target.value }))}
                        />
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        <button
                          type="button"
                          className="ft-btn"
                          onClick={() => setEditingEvalId(null)}
                          style={{ background: '#f1f5f9', color: '#475569', fontSize: '0.78rem', padding: '0.35rem 0.85rem', borderRadius: '8px', fontWeight: 700 }}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          className="ft-btn ft-btn-primary"
                          onClick={() => handleSaveEditedEvaluation(ev.id)}
                          style={{ fontSize: '0.78rem', padding: '0.35rem 0.85rem', borderRadius: '8px', fontWeight: 800 }}
                        >
                          💾 Save Changes
                        </button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={targetEvId} style={{ background: '#ffffff', padding: '0.9rem 1.25rem', borderRadius: '14px', border: '1.5px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '0.45rem', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        <span style={{ fontSize: '0.78rem', fontWeight: 900, background: ev.targetType === 'team' ? '#eff6ff' : '#f0fdf4', color: ev.targetType === 'team' ? '#2563eb' : '#16a34a', border: `1px solid ${ev.targetType === 'team' ? '#bfdbfe' : '#bbf7d0'}`, padding: '0.2rem 0.6rem', borderRadius: '8px' }}>
                          {ev.competitorCode || 'C-101'}
                        </span>
                        <strong style={{ fontSize: '0.92rem', color: '#0f172a', fontWeight: 900 }}>
                          {ev.competitorName || 'Competitor'}
                        </strong>
                        <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                          · 👨‍⚖️ {ev.judgeName || 'Official Judge Panel'}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        {ev.score !== null && ev.score !== undefined && ev.score !== '' && (
                          <span style={{ background: '#0284c7', color: '#ffffff', fontWeight: 900, fontSize: '0.82rem', padding: '0.2rem 0.7rem', borderRadius: '8px' }}>
                            ⭐ Score: {ev.score} pts
                          </span>
                        )}

                        {ev.id && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <button
                              type="button"
                              onClick={() => handleStartEditEvaluation(ev)}
                              style={{ background: '#f8fafc', border: '1px solid #cbd5e1', color: '#0f172a', padding: '0.2rem 0.6rem', borderRadius: '7px', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer' }}
                              title="Edit this comment or score"
                            >
                              ✏️ Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteEvaluation(ev.id)}
                              style={{ background: '#fff1f2', border: '1px solid #fecdd3', color: '#be123c', padding: '0.2rem 0.6rem', borderRadius: '7px', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer' }}
                              title="Delete this comment or score"
                            >
                              🗑️ Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {ev.comments ? (
                      <p style={{ fontSize: '0.83rem', color: '#334155', margin: 0, fontStyle: 'italic', background: '#f8fafc', padding: '0.45rem 0.75rem', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                        💬 "{ev.comments}"
                      </p>
                    ) : (
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic' }}>
                        (No feedback comment entered)
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
