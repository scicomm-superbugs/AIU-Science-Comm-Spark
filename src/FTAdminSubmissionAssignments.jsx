import { useState, useMemo } from 'react';
import { useLiveCollection, db } from './db';
import { FileText, Users, User, CheckCircle, Clock, Shield, Search, Sparkles, RefreshCw, Check, Zap, Filter, Trash2 } from 'lucide-react';
import { DEFAULT_STAGES } from './FTMyCompetition';
import { formatSimpleCode } from './ftConstants';
import './scicommspark.css';

export default function FTAdminSubmissionAssignments() {
  const scientists = useLiveCollection('scientists') || [];
  const teams = useLiveCollection('ft_teams') || [];
  const submissions = useLiveCollection('submissions') || [];
  const timelineConfig = useLiveCollection('timeline_config') || [];
  const assignments = useLiveCollection('submission_assignments') || [];
  const evaluations = useLiveCollection('ft_evaluations') || [];

  const [selectedTrack, setSelectedTrack] = useState('pop_science');
  const [selectedStageId, setSelectedStageId] = useState(1);
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('all'); // 'all' | 'evaluated' | 'pending'
  const [searchQuery, setSearchQuery] = useState('');
  const [toast, setToast] = useState('');

  const showToast = (text) => {
    setToast(text);
    setTimeout(() => setToast(''), 3000);
  };

  const handleDeleteSubmission = async (subId, compName) => {
    if (!window.confirm(`Are you sure you want to delete the submission for "${compName}"? This action cannot be undone.`)) {
      return;
    }
    try {
      await db.submissions.delete(subId);
      showToast('🗑️ Submission deleted successfully');
    } catch (err) {
      console.error('Failed to delete submission:', err);
      showToast('❌ Failed to delete submission: ' + err.message);
    }
  };

  // Get all judges from scientists collection + include test judge accounts
  const allJudges = useMemo(() => {
    const dbJudges = scientists.filter(s => 
      ['judge', 'academic_judge', 'scicomm_judge', 'trainer_judge', 'admin', 'master'].includes(s.role)
    );
    const testJudges = [
      { id: 'test_judge_1', name: 'test-judge-1', username: 'test_judge_1', role: 'judge', competitorCode: 'J-201', email: 'test-judge-1@aiu.edu.eg' },
      { id: 'test_judge_trainer', name: 'test-judge-trainer', username: 'test_judge_trainer', role: 'trainer_judge', competitorCode: 'J-301', email: 'test-judge-trainer@aiu.edu.eg' }
    ];
    const combined = [...dbJudges];
    testJudges.forEach(tj => {
      if (!combined.some(j => j.id === tj.id || j.username === tj.username || j.name === tj.name)) {
        combined.push(tj);
      }
    });
    return combined;
  }, [scientists]);

  // Find judges explicitly assigned to this stage in timeline_config (or default to all judges)
  const stageTimelineConfig = useMemo(() => {
    return timelineConfig.find(c => c.track === selectedTrack && Number(c.stageId) === Number(selectedStageId));
  }, [timelineConfig, selectedTrack, selectedStageId]);

  const stageJudges = useMemo(() => {
    const assignedIds = stageTimelineConfig?.assignedJudgeIds || [];
    if (assignedIds.length > 0) {
      return allJudges.filter(j => assignedIds.includes(j.id) || assignedIds.includes(j.username) || assignedIds.includes(j.email));
    }
    return allJudges;
  }, [allJudges, stageTimelineConfig]);

  // Combine all active submissions for selected stage and track directly from submissions collection
  const competitorsList = useMemo(() => {
    const matchedSubs = submissions.filter(sub => {
      const isStageMatch = Number(sub.stageId) === Number(selectedStageId);
      if (!isStageMatch) return false;

      const isTeam = Boolean(sub.teamId);
      const matchingTeam = isTeam ? teams.find(t => t.id === sub.teamId) : null;
      const matchingScientist = !isTeam ? scientists.find(s => s.id === sub.competitorId || s.username === sub.competitorUsername) : null;

      const rawTrack = sub.track || matchingTeam?.track || matchingScientist?.registeredTrack || matchingScientist?.track;
      
      // If no track metadata exists on sub/team/user, show in all track views so no submission is hidden
      if (!rawTrack) return true;

      const subTrack = String(rawTrack).toLowerCase();

      if (selectedTrack === 'science_journalism') {
        return subTrack.includes('journalism') || subTrack.includes('article') || subTrack.includes('news') || subTrack === 'science_journalism';
      } else {
        return subTrack.includes('pop') || subTrack.includes('video') || subTrack === 'pop_science';
      }
    });

    const list = matchedSubs.map(sub => {
      const isTeam = Boolean(sub.teamId);
      const targetId = isTeam ? sub.teamId : (sub.competitorId || sub.id);
      
      // Find matching team or scientist doc for raw code
      const matchingTeam = isTeam ? teams.find(t => t.id === sub.teamId) : null;
      const matchingScientist = !isTeam ? scientists.find(s => s.id === sub.competitorId || s.username === sub.competitorUsername) : null;

      const rawCode = isTeam 
        ? (matchingTeam?.code || sub.teamCode || sub.teamId) 
        : (matchingScientist?.competitorCode || matchingScientist?.competitorIdNumber || matchingScientist?.employeeId || matchingScientist?.universityId || sub.competitorCode || sub.competitorId || sub.id);

      const displayCode = formatSimpleCode(rawCode, isTeam);
      const name = isTeam ? (sub.teamName || matchingTeam?.name || 'Team Submission') : (sub.competitorName || matchingScientist?.name || matchingScientist?.username || 'Solo Competitor');

      // Calculate evaluation stats for this submission
      const subEvals = evaluations.filter(e => 
        Number(e.stageId) === Number(selectedStageId) && 
        (e.competitorId === targetId || e.teamId === targetId || e.competitorId === sub.competitorId || e.teamId === sub.teamId)
      );

      return {
        targetId,
        targetType: isTeam ? 'team' : 'competitor',
        name,
        code: displayCode,
        track: sub.track || selectedTrack,
        submission: sub,
        isEvaluated: subEvals.length > 0,
        evalCount: subEvals.length,
        evals: subEvals
      };
    });

    // Deduplicate by targetId (if multiple submissions for same stage)
    const uniqueMap = new Map();
    list.forEach(item => {
      if (!uniqueMap.has(item.targetId)) {
        uniqueMap.set(item.targetId, item);
      }
    });

    let filtered = Array.from(uniqueMap.values());

    // Filter by Evaluation Status (all / evaluated / pending)
    if (selectedStatusFilter === 'evaluated') {
      filtered = filtered.filter(c => c.isEvaluated);
    } else if (selectedStatusFilter === 'pending') {
      filtered = filtered.filter(c => !c.isEvaluated);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return filtered.filter(c => c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q));
    }

    return filtered;
  }, [submissions, teams, scientists, evaluations, selectedTrack, selectedStageId, selectedStatusFilter, searchQuery]);

  // Helper to get assigned judge IDs for a specific target
  const getAssignedJudgeIds = (targetId) => {
    const docId = `${selectedStageId}_${selectedTrack}_${targetId}`;
    const found = assignments.find(a => a.id === docId || (a.targetId === targetId && Number(a.stageId) === Number(selectedStageId) && a.track === selectedTrack));
    return found?.assignedJudgeIds || [];
  };

  // Toggle a judge assignment (enforces max 1 Academic Judge + max 1 SciComm Judge per submission)
  const handleToggleJudgeAssignment = async (target, clickedJudge) => {
    const docId = `${selectedStageId}_${selectedTrack}_${target.targetId}`;
    const currentJudgeIds = getAssignedJudgeIds(target.targetId);

    const clickedCategory = clickedJudge.role === 'academic_judge' ? 'academic' : clickedJudge.role === 'scicomm_judge' ? 'scicomm' : 'general';

    let updatedJudgeIds = [];

    if (currentJudgeIds.includes(clickedJudge.id)) {
      // Uncheck judge
      updatedJudgeIds = currentJudgeIds.filter(id => id !== clickedJudge.id);
    } else {
      // Check judge: replace any existing judge with the same category (max 1 Academic + 1 SciComm)
      const otherCategoryJudgeIds = currentJudgeIds.filter(id => {
        const jObj = stageJudges.find(j => j.id === id);
        if (!jObj) return false;
        const cat = jObj.role === 'academic_judge' ? 'academic' : jObj.role === 'scicomm_judge' ? 'scicomm' : 'general';
        return cat !== clickedCategory;
      });

      updatedJudgeIds = [...otherCategoryJudgeIds, clickedJudge.id];
    }

    try {
      const existing = assignments.find(a => a.id === docId);
      const data = {
        id: docId,
        stageId: Number(selectedStageId),
        track: selectedTrack,
        targetId: target.targetId,
        targetType: target.targetType,
        targetName: target.name,
        targetCode: target.code,
        assignedJudgeIds: updatedJudgeIds,
        updatedAt: new Date().toISOString()
      };

      if (existing) {
        await db.submission_assignments.update(existing.id, data);
      } else {
        await db.submission_assignments.add(data);
      }

      // Trigger Judge Notification for New Submission Assignment
      if (updatedJudgeIds.includes(clickedJudge.id)) {
        try {
          await db.ft_notifications.add({
            targetUserId: clickedJudge.id,
            targetRoles: ['judge', 'academic_judge', 'scicomm_judge'],
            type: 'assignment',
            title: `⚖️ New Submission Assigned for Evaluation`,
            message: `You have been assigned to evaluate Stage ${selectedStageId} submission for ${target.name} (${target.code}).`,
            link: '/dashboard/judge',
            createdAt: new Date().toISOString(),
            status: 'unread'
          });
        } catch (nErr) {
          console.warn('Failed to send judge assignment notification:', nErr);
        }
      }
    } catch (err) {
      console.error('Failed to save submission assignment:', err);
      showToast('❌ Failed to update assignment: ' + err.message);
    }
  };

  // ⚡ Auto-Distribute Competitors Evenly (1 Academic + 1 SciComm per submission)
  const handleAutoDistribute = async () => {
    if (stageJudges.length === 0) {
      alert('No judges available to distribute submissions to. Please assign judges in Timeline Management first.');
      return;
    }
    if (competitorsList.length === 0) {
      alert('No submissions found for this track and stage.');
      return;
    }

    const academicJudges = stageJudges.filter(j => j.role === 'academic_judge' || j.role === 'admin' || j.role === 'master');
    const scicommJudges = stageJudges.filter(j => j.role === 'scicomm_judge' || j.role === 'trainer_judge' || j.role === 'judge');

    const acadList = academicJudges.length > 0 ? academicJudges : stageJudges;
    const sciList = scicommJudges.length > 0 ? scicommJudges : stageJudges;

    try {
      for (let i = 0; i < competitorsList.length; i++) {
        const target = competitorsList[i];
        const acadJudge = acadList[i % acadList.length];
        const sciJudge = sciList[(i + 1) % sciList.length];

        const assignedIds = [...new Set([acadJudge.id, sciJudge.id])];
        const docId = `${selectedStageId}_${selectedTrack}_${target.targetId}`;

        const data = {
          id: docId,
          stageId: Number(selectedStageId),
          track: selectedTrack,
          targetId: target.targetId,
          targetType: target.targetType,
          targetName: target.name,
          targetCode: target.code,
          assignedJudgeIds: assignedIds,
          updatedAt: new Date().toISOString()
        };

        const existing = assignments.find(a => a.id === docId);
        if (existing) {
          await db.submission_assignments.update(existing.id, data);
        } else {
          await db.submission_assignments.add(data);
        }
      }
      showToast('⚡ Submissions auto-distributed! (1 Academic + 1 SciComm Judge assigned per submission)');
    } catch (err) {
      console.error('Auto distribute failed:', err);
      showToast('❌ Auto-distribute failed: ' + err.message);
    }
  };

  // Clear all assignments for this stage & track
  const handleClearStageAssignments = async () => {
    if (!window.confirm('Are you sure you want to clear judge assignments for this stage?')) return;
    try {
      const stageAssignments = assignments.filter(a => Number(a.stageId) === Number(selectedStageId) && a.track === selectedTrack);
      for (const a of stageAssignments) {
        await db.submission_assignments.delete(a.id);
      }
      showToast('Cleared all submission assignments for this stage.');
    } catch (err) {
      showToast('Failed to clear assignments: ' + err.message);
    }
  };

  return (
    <div className="ft-animate-in">
      {/* Page Header */}
      <div className="ft-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="ft-page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <FileText size={30} style={{ color: '#be123c' }} />
            Submission Judge Assignments
          </h1>
          <p className="ft-page-subtitle">
            Assign specific competitor & team submissions to designated judges for each stage to balance judging workload.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            onClick={handleAutoDistribute}
            className="ft-btn ft-btn-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontWeight: 900, padding: '0.6rem 1.15rem', borderRadius: '12px' }}
          >
            <Zap size={16} /> ⚡ Auto-Distribute Evenly
          </button>
          <button
            onClick={handleClearStageAssignments}
            className="ft-btn ft-btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontWeight: 800, padding: '0.6rem 1rem', borderRadius: '12px', color: '#dc2626' }}
          >
            Clear Stage Assignments
          </button>
        </div>
      </div>

      {toast && (
        <div style={{ padding: '0.85rem 1.25rem', borderRadius: '14px', background: '#f0fdf4', color: '#16a34a', border: '1.5px solid #86efac', marginBottom: '1.5rem', fontWeight: 800, fontSize: '0.9rem' }}>
          ✅ {toast}
        </div>
      )}

      {/* Track & Stage Filter Toolbar */}
      <div style={{ background: '#ffffff', padding: '1.25rem', borderRadius: '20px', border: '1.5px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0,0,0,0.02)', marginBottom: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          {/* Track Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#64748b' }}>Track:</span>
            <button
              onClick={() => setSelectedTrack('pop_science')}
              className="ft-btn"
              style={{
                background: selectedTrack === 'pop_science' ? '#be123c' : '#f1f5f9',
                color: selectedTrack === 'pop_science' ? '#ffffff' : '#475569',
                fontWeight: 800, fontSize: '0.82rem', padding: '0.45rem 0.9rem', borderRadius: '10px', border: 'none'
              }}
            >
              🎥 Pop Science Videos
            </button>
            <button
              onClick={() => setSelectedTrack('science_journalism')}
              className="ft-btn"
              style={{
                background: selectedTrack === 'science_journalism' ? '#2563eb' : '#f1f5f9',
                color: selectedTrack === 'science_journalism' ? '#ffffff' : '#475569',
                fontWeight: 800, fontSize: '0.82rem', padding: '0.45rem 0.9rem', borderRadius: '10px', border: 'none'
              }}
            >
              📰 Science Journalism
            </button>
          </div>

          {/* Search Input */}
          <div style={{ position: 'relative', width: '280px' }}>
            <Search size={16} style={{ position: 'absolute', left: 12, top: 12, color: '#94a3b8' }} />
            <input
              type="text"
              className="ft-input"
              style={{ paddingLeft: '2.3rem', fontSize: '0.85rem' }}
              placeholder="Search competitor or ID..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Stage Selector & Evaluation Status Filter Chips */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', borderTop: '1px solid #f1f5f9', paddingTop: '0.85rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#64748b' }}>Select Stage:</span>
            {[1, 2, 3].map(stId => (
              <button
                key={stId}
                onClick={() => setSelectedStageId(stId)}
                className="ft-btn"
                style={{
                  background: selectedStageId === stId ? '#0f172a' : '#ffffff',
                  color: selectedStageId === stId ? '#ffffff' : '#334155',
                  border: `1.5px solid ${selectedStageId === stId ? '#0f172a' : '#cbd5e1'}`,
                  fontWeight: 800, fontSize: '0.82rem', padding: '0.4rem 1rem', borderRadius: '10px'
                }}
              >
                Stage {stId} Milestone
              </button>
            ))}
          </div>

          {/* Evaluation Status Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <Filter size={14} /> Status:
            </span>
            <button
              onClick={() => setSelectedStatusFilter('all')}
              className="ft-btn"
              style={{
                background: selectedStatusFilter === 'all' ? '#334155' : '#f8fafc',
                color: selectedStatusFilter === 'all' ? '#ffffff' : '#475569',
                border: `1px solid ${selectedStatusFilter === 'all' ? '#334155' : '#cbd5e1'}`,
                fontWeight: 800, fontSize: '0.78rem', padding: '0.35rem 0.75rem', borderRadius: '8px'
              }}
            >
              All Statuses
            </button>
            <button
              onClick={() => setSelectedStatusFilter('pending')}
              className="ft-btn"
              style={{
                background: selectedStatusFilter === 'pending' ? '#b45309' : '#fffbe6',
                color: selectedStatusFilter === 'pending' ? '#ffffff' : '#92400e',
                border: `1px solid ${selectedStatusFilter === 'pending' ? '#b45309' : '#fde68a'}`,
                fontWeight: 800, fontSize: '0.78rem', padding: '0.35rem 0.75rem', borderRadius: '8px'
              }}
            >
              ⏳ Pending Evaluation
            </button>
            <button
              onClick={() => setSelectedStatusFilter('evaluated')}
              className="ft-btn"
              style={{
                background: selectedStatusFilter === 'evaluated' ? '#047857' : '#ecfdf5',
                color: selectedStatusFilter === 'evaluated' ? '#ffffff' : '#065f46',
                border: `1px solid ${selectedStatusFilter === 'evaluated' ? '#047857' : '#a7f3d0'}`,
                fontWeight: 800, fontSize: '0.78rem', padding: '0.35rem 0.75rem', borderRadius: '8px'
              }}
            >
              ✅ Evaluated
            </button>
          </div>
        </div>

      </div>

      {/* Available Judges Header Summary */}
      <div style={{ background: '#f8fafc', padding: '1rem 1.25rem', borderRadius: '16px', border: '1.5px solid #cbd5e1', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <div style={{ fontSize: '0.88rem', fontWeight: 900, color: '#0f172a' }}>
            👨‍⚖️ Available Panel Judges for Stage {selectedStageId} ({stageJudges.length}):
          </div>
          <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.15rem' }}>
            Check the boxes next to judges to assign them to evaluate a specific competitor's submission.
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          {stageJudges.map(j => (
            <span key={j.id} style={{ fontSize: '0.75rem', fontWeight: 800, background: '#ffffff', color: '#0f172a', padding: '0.25rem 0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
              {j.name || j.username} ({j.role === 'academic_judge' ? '🎓 Academic' : j.role === 'scicomm_judge' ? '🎙️ SciComm' : 'Judge'})
            </span>
          ))}
        </div>
      </div>

      {/* Competitors & Submissions Table */}
      <div className="ft-card" style={{ background: '#ffffff', borderRadius: '24px', border: '1.5px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 8px 25px rgba(0,0,0,0.03)' }}>
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #f1f5f9', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 900, color: '#0f172a', margin: 0, fontFamily: "'Outfit', sans-serif" }}>
            Competitors & Teams List ({competitorsList.length})
          </h3>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b' }}>
            Stage {selectedStageId} · {selectedTrack === 'pop_science' ? 'Pop Science' : 'Science Journalism'}
          </span>
        </div>

        {competitorsList.length === 0 ? (
          <div style={{ padding: '3rem 1.5rem', textAlign: 'center', color: '#64748b' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📂</div>
            <div style={{ fontWeight: 800, fontSize: '1rem', color: '#0f172a' }}>No Competitors Found</div>
            <div style={{ fontSize: '0.85rem' }}>No competitors or teams are registered for this track and stage yet.</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ background: '#f1f5f9', borderBottom: '1.5px solid #cbd5e1', color: '#475569', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  <th style={{ padding: '0.85rem 1.25rem', fontWeight: 800 }}>ID / Code</th>
                  <th style={{ padding: '0.85rem 1.25rem', fontWeight: 800 }}>Competitor / Team</th>
                  <th style={{ padding: '0.85rem 1.25rem', fontWeight: 800 }}>Stage Deliverable</th>
                  <th style={{ padding: '0.85rem 1.25rem', fontWeight: 800 }}>Evaluation Status</th>
                  <th style={{ padding: '0.85rem 1.25rem', fontWeight: 800 }}>Assigned Judges ({stageJudges.length})</th>
                </tr>
              </thead>
              <tbody>
                {competitorsList.map((comp) => {
                  const assignedJudgeIds = getAssignedJudgeIds(comp.targetId);
                  const isSubmitted = Boolean(comp.submission);

                  return (
                    <tr key={comp.targetId} style={{ borderBottom: '1px solid #f1f5f9', background: assignedJudgeIds.length > 0 ? '#fafafa' : '#ffffff' }}>
                      
                      {/* Code */}
                      <td style={{ padding: '1rem 1.25rem', fontWeight: 900, color: '#0f172a' }}>
                        <span style={{ background: comp.targetType === 'team' ? '#fff1f2' : '#eff6ff', color: comp.targetType === 'team' ? '#be123c' : '#2563eb', padding: '0.25rem 0.65rem', borderRadius: '8px', border: `1px solid ${comp.targetType === 'team' ? '#fecdd3' : '#bfdbfe'}` }}>
                          {comp.code}
                        </span>
                      </td>

                      {/* Name & Type */}
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <div style={{ fontWeight: 900, color: '#0f172a', fontSize: '0.92rem' }}>
                          {comp.name}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700 }}>
                          {comp.targetType === 'team' ? '👥 Team' : '👤 Individual Competitor'}
                        </div>
                      </td>

                      {/* Submission Deliverable */}
                      <td style={{ padding: '1rem 1.25rem' }}>
                        {isSubmitted ? (
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                              <span style={{ fontSize: '0.78rem', fontWeight: 900, color: '#047857', background: '#ecfdf5', padding: '0.25rem 0.65rem', borderRadius: '8px', border: '1px solid #a7f3d0' }}>
                                ✅ Submitted Work
                              </span>
                              {(comp.submission.videoUrl || comp.submission.fileUrl || comp.submission.pdfUrl) && (
                                <a href={comp.submission.fileUrl || comp.submission.pdfUrl || comp.submission.videoUrl} target="_blank" rel="noreferrer" style={{ color: '#2563eb', fontSize: '0.78rem', fontWeight: 800, textDecoration: 'underline' }}>
                                  View
                                </a>
                              )}
                              <button
                                onClick={() => handleDeleteSubmission(comp.submission.id, comp.name)}
                                style={{
                                  background: '#fff1f2', color: '#be123c', border: '1px solid #fecdd3',
                                  borderRadius: '6px', padding: '0.2rem 0.55rem', fontSize: '0.75rem', fontWeight: 800,
                                  cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.25rem'
                                }}
                                title="Delete / Withdraw Submission"
                              >
                                <Trash2 size={12} /> Delete
                              </button>
                            </div>
                            <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#334155', marginTop: '0.3rem' }}>
                              {comp.submission.title}
                            </div>
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#94a3b8', background: '#f1f5f9', padding: '0.25rem 0.65rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                            ⏳ Not Submitted Yet
                          </span>
                        )}
                      </td>

                      {/* Evaluation Status */}
                      <td style={{ padding: '1rem 1.25rem' }}>
                        {comp.isEvaluated ? (
                          <span style={{ fontSize: '0.78rem', fontWeight: 900, color: '#047857', background: '#ecfdf5', padding: '0.3rem 0.75rem', borderRadius: '10px', border: '1px solid #a7f3d0', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                            ✅ Evaluated ({comp.evalCount} {comp.evalCount === 1 ? 'Review' : 'Reviews'})
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#b45309', background: '#fffbe6', padding: '0.3rem 0.75rem', borderRadius: '10px', border: '1px solid #fde68a', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                            ⏳ Pending Evaluation
                          </span>
                        )}
                      </td>

                      {/* Assigned Judges Checkboxes */}
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
                          {stageJudges.map(judge => {
                            const isAssigned = assignedJudgeIds.includes(judge.id);

                            return (
                              <label
                                key={judge.id}
                                style={{
                                  display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                                  padding: '0.35rem 0.7rem', borderRadius: '10px',
                                  background: isAssigned ? '#fff1f2' : '#f8fafc',
                                  border: `1.5px solid ${isAssigned ? '#be123c' : '#cbd5e1'}`,
                                  color: isAssigned ? '#be123c' : '#475569',
                                  fontSize: '0.78rem', fontWeight: isAssigned ? 900 : 700,
                                  cursor: 'pointer', transition: 'all 0.15s ease'
                                }}
                              >
                                <input
                                  type="checkbox"
                                  checked={isAssigned}
                                  onChange={() => handleToggleJudgeAssignment(comp, judge)}
                                  style={{ width: '15px', height: '15px', accentColor: '#be123c', cursor: 'pointer' }}
                                />
                                <span>{judge.name || judge.username}</span>
                              </label>
                            );
                          })}

                          {assignedJudgeIds.length === 0 && (
                            <span style={{ fontSize: '0.75rem', color: '#dc2626', fontWeight: 700, fontStyle: 'italic', marginLeft: '0.3rem' }}>
                              ⚠️ Unassigned (No judges assigned)
                            </span>
                          )}
                        </div>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

      </div>
    </div>
  );
}
