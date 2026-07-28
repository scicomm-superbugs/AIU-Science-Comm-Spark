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

  // Controlled evaluation form URLs state per submission deliverable
  const [evalUrls, setEvalUrls] = useState({}); // { [subFieldId]: url }

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

        {/* Judge Assignment Checkbox Chips */}
        <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '16px', border: '1.5px solid #e2e8f0', marginBottom: '1.5rem' }}>
          <label style={{ fontSize: '0.88rem', fontWeight: 900, color: '#0f172a', display: 'block', marginBottom: '0.65rem' }}>
            👨‍⚖️ Assign Judges to Stage {selectedStageId} ({assignedJudgeIds.length} Assigned):
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem' }}>
            {allJudges.length === 0 ? (
              <span style={{ fontSize: '0.82rem', color: '#64748b', fontStyle: 'italic' }}>
                No registered judges found. Add users with Judge or Faculty roles in Users & Roles.
              </span>
            ) : (
              allJudges.map(j => {
                const isAssigned = assignedJudgeIds.includes(j.id) || assignedJudgeIds.includes(j.username) || assignedJudgeIds.includes(j.email);
                return (
                  <button
                    key={j.id}
                    type="button"
                    onClick={() => handleToggleJudgeAssignment(j.id)}
                    style={{
                      padding: '0.45rem 0.85rem', borderRadius: '10px', fontWeight: 800, fontSize: '0.82rem',
                      background: isAssigned ? '#f0fdf4' : '#ffffff',
                      color: isAssigned ? '#16a34a' : '#475569',
                      border: isAssigned ? '1.5px solid #86efac' : '1.5px solid #cbd5e1',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem', transition: 'all 0.15s ease'
                    }}
                  >
                    <span>{isAssigned ? '✅' : '➕'}</span>
                    <span>{j.name || j.username}</span>
                    <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>({j.role})</span>
                  </button>
                );
              })
            )}
          </div>
        </div>

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

            return (
              <div key={subField.id} style={{ background: '#ffffff', padding: '1rem 1.25rem', borderRadius: '14px', border: '1.5px solid #cbd5e1', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
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
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 2: COMPETITOR & TEAM GRADES, SCORES & JUDGE COMMENTS */}
      <div className="ft-card" style={{ padding: '1.75rem', borderRadius: '24px', background: '#ffffff', border: '1.5px solid #e2e8f0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{ background: '#fff1f2', color: '#be123c', padding: '0.55rem', borderRadius: '12px' }}>
              <Award size={22} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 900, color: '#0f172a', margin: 0 }}>
                Competitor & Team Final Grades & Judge Feedback Center
              </h3>
              <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0.1rem 0 0 0' }}>
                Write comments using specific judge names and set final points for each competitor or team.
              </p>
            </div>
          </div>

          <div className="ft-input-group" style={{ margin: 0, minWidth: '260px' }}>
            <div style={{ position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                type="text"
                className="ft-input"
                style={{ paddingLeft: '2.5rem', fontSize: '0.85rem' }}
                placeholder="Search competitors by name or ID..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>

        {competitorsList.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1.5rem', background: '#f8fafc', borderRadius: '16px', border: '1px dashed #cbd5e1' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📋</div>
            <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>No Submissions Found for Stage {selectedStageId}</div>
            <div style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '0.25rem' }}>
              Competitors submitting via Google Forms or workspace will automatically appear here for grading & judge commenting.
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {competitorsList.map((item) => {
              const draft = evalForm[item.targetId] || {};
              const existingEvals = item.evals || [];

              return (
                <div key={item.targetId} style={{ background: '#f8fafc', borderRadius: '18px', padding: '1.4rem 1.6rem', border: '1.5px solid #cbd5e1', display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
                  {/* Competitor / Team Row Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.85rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span style={{ fontSize: '0.78rem', fontWeight: 900, background: item.targetType === 'team' ? '#eff6ff' : '#f0fdf4', color: item.targetType === 'team' ? '#2563eb' : '#16a34a', border: `1px solid ${item.targetType === 'team' ? '#bfdbfe' : '#bbf7d0'}`, padding: '0.25rem 0.65rem', borderRadius: '10px' }}>
                        {item.code}
                      </span>
                      <div>
                        <h4 style={{ fontSize: '1.05rem', fontWeight: 900, color: '#0f172a', margin: 0 }}>
                          {item.name}
                        </h4>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.1rem' }}>
                          {item.targetType === 'team' ? '👥 Team Competitor' : '👤 Solo Competitor'} · Stage {selectedStageId}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.82rem', fontWeight: 800, background: existingEvals.length > 0 ? '#dcfce7' : '#fffbeb', color: existingEvals.length > 0 ? '#15803d' : '#b45309', padding: '0.3rem 0.75rem', borderRadius: '8px', border: `1px solid ${existingEvals.length > 0 ? '#86efac' : '#fde68a'}` }}>
                        {existingEvals.length > 0 ? `✅ Evaluated (${existingEvals.length} Feedback entries)` : '⏳ Pending Grade & Comments'}
                      </span>
                    </div>
                  </div>

                  {/* Existing Judge Feedback & Scores List */}
                  {existingEvals.length > 0 && (
                    <div style={{ background: '#ffffff', padding: '1rem', borderRadius: '12px', border: '1px solid #cbd5e1', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                      <div style={{ fontSize: '0.82rem', fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <MessageSquare size={15} style={{ color: '#be123c' }} />
                        Recorded Judge Comments & Scores:
                      </div>
                      {existingEvals.map((ev, evIdx) => (
                        <div key={ev.id || evIdx} style={{ background: '#f8fafc', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontWeight: 900, fontSize: '0.85rem', color: '#be123c' }}>
                              👨‍⚖️ Judge: {ev.judgeName || 'Official Judge Panel'}
                            </span>
                            {ev.score !== null && ev.score !== undefined && (
                              <span style={{ background: '#0284c7', color: '#ffffff', fontWeight: 900, fontSize: '0.82rem', padding: '0.2rem 0.6rem', borderRadius: '8px' }}>
                                ⭐ Score: {ev.score} pts
                              </span>
                            )}
                          </div>
                          {ev.comments && (
                            <p style={{ fontSize: '0.82rem', color: '#334155', margin: 0, fontStyle: 'italic', lineHeight: 1.4 }}>
                              "{ev.comments}"
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add / Update Judge Comment & Grade Entry Form */}
                  <div style={{ background: '#ffffff', padding: '1.1rem 1.25rem', borderRadius: '14px', border: '1.5px solid #cbd5e1', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                    <div style={{ fontSize: '0.88rem', fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Sparkles size={16} style={{ color: '#be123c' }} />
                      Add Judge Comment & Final Score for {item.name}:
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '0.75rem' }}>
                      {/* Judge Name Dropdown / Input */}
                      <div>
                        <label className="ft-label" style={{ fontSize: '0.78rem', marginBottom: '0.25rem' }}>
                          👨‍⚖️ Select Judge Name for Comment *
                        </label>
                        <select
                          className="ft-select"
                          style={{ fontSize: '0.82rem' }}
                          value={draft.judgeId || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            const selJudge = allJudges.find(j => j.id === val);
                            setEvalForm(prev => ({
                              ...prev,
                              [item.targetId]: {
                                ...prev[item.targetId],
                                judgeId: val,
                                judgeName: selJudge ? (selJudge.name || selJudge.username) : val
                              }
                            }));
                          }}
                        >
                          <option value="">-- Select Assigned Judge Name --</option>
                          {allJudges.map(j => (
                            <option key={j.id} value={j.id}>
                              {j.name || j.username} ({j.role})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Final Grade / Points Input */}
                      <div>
                        <label className="ft-label" style={{ fontSize: '0.78rem', marginBottom: '0.25rem' }}>
                          ⭐ Final Grade / Points (e.g. 0 - 100)
                        </label>
                        <input
                          type="number"
                          className="ft-input"
                          style={{ fontSize: '0.85rem' }}
                          placeholder="e.g. 95"
                          value={draft.score !== undefined ? draft.score : ''}
                          onChange={e => setEvalForm(prev => ({
                            ...prev,
                            [item.targetId]: { ...prev[item.targetId], score: e.target.value }
                          }))}
                        />
                      </div>
                    </div>

                    {/* Judge Comment Textarea */}
                    <div>
                      <label className="ft-label" style={{ fontSize: '0.78rem', marginBottom: '0.25rem' }}>
                        💬 Judge Comment & Evaluation Feedback (Using Judge Name)
                      </label>
                      <textarea
                        className="ft-textarea"
                        rows={2}
                        style={{ fontSize: '0.85rem' }}
                        placeholder={`Write feedback under judge "${draft.judgeName || 'Selected Judge'}"...`}
                        value={draft.comment || ''}
                        onChange={e => setEvalForm(prev => ({
                          ...prev,
                          [item.targetId]: { ...prev[item.targetId], comment: e.target.value }
                        }))}
                      />
                    </div>

                    {/* Save Button */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <button
                        type="button"
                        className="ft-btn ft-btn-primary"
                        onClick={() => handleSaveEvaluation(item)}
                        style={{ fontWeight: 800, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                      >
                        <Save size={16} /> Save Grade & Comment
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
