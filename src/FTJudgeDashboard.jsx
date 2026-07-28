import { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useOutletContext } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { db, firestore, getCollectionName, useLiveCollection } from './db';
import { collection, getDocs } from 'firebase/firestore';
import { Award, Calendar, Video, ExternalLink, CheckCircle, Star, Filter, Users, User, Shield } from 'lucide-react';
import { normalizeTrackKey } from './ftConstants';
import './scicommspark.css';

// Default Competition Stages Definition (Module Scope)
const ALL_STAGES = [
  {
    id: 'pop_stage_1', stageId: 1, track: 'pop_science', trackTitle: 'Pop Science Videos',
    title: 'Stage 1: Short Pop Video', sub: 'Reels / TikTok Video (max 90 seconds)', deadline: '2026-09-01', status: 'Active Stage',
    details: 'Produce a punchy, highly engaging short video introducing a core scientific concept for social media.',
    criteria: [
      { id: 'c1', name: 'Scientific Accuracy', category: 'academic', maxPoints: 25 },
      { id: 'c2', name: 'Hook & Visual Engagement', category: 'scicomm', maxPoints: 25 }
    ]
  },
  {
    id: 'pop_stage_2', stageId: 2, track: 'pop_science', trackTitle: 'Pop Science Videos',
    title: 'Stage 2: Long Pop Video', sub: 'YouTube SciComm Video (up to 3 minutes)', deadline: '2026-09-20', status: 'Upcoming Stage',
    details: 'Deep scientific storytelling featuring comprehensive explanation, visual graphics, and clear narration.',
    criteria: [
      { id: 'c3', name: 'Research Depth & Rigor', category: 'academic', maxPoints: 25 },
      { id: 'c4', name: 'Video Editing & Narrative Flow', category: 'scicomm', maxPoints: 25 }
    ]
  },
  {
    id: 'pop_stage_3', stageId: 3, track: 'pop_science', trackTitle: 'Pop Science Videos',
    title: 'Stage 3 (Finals): Live Stage Show', sub: 'Interactive Live Presentation (5 mins on stage)', deadline: '2026-10-10', status: 'Grand Finale',
    details: 'Deliver an interactive live science presentation on stage before expert judges, audience, and broadcast.',
    criteria: [
      { id: 'c5', name: 'Scientific Q&A Defense', category: 'academic', maxPoints: 25 },
      { id: 'c6', name: 'Stage Confidence & Delivery', category: 'scicomm', maxPoints: 25 }
    ]
  },
  {
    id: 'jour_stage_1', stageId: 1, track: 'science_journalism', trackTitle: 'Science Journalism',
    title: 'Stage 1: Research Field Prep', sub: 'Topic Research & Expert Interviews Prep', deadline: '2026-09-01', status: 'Active Stage',
    details: 'Select a scientific topic, gather research data, and conduct interviews with researchers & academic experts.',
    criteria: [
      { id: 'c7', name: 'Literature Review & Citation', category: 'academic', maxPoints: 25 },
      { id: 'c8', name: 'Journalistic Angle', category: 'scicomm', maxPoints: 25 }
    ]
  },
  {
    id: 'jour_stage_2', stageId: 2, track: 'science_journalism', trackTitle: 'Science Journalism',
    title: 'Stage 2: Article Publication', sub: 'Simplified Science Article Publication', deadline: '2026-09-20', status: 'Upcoming Stage',
    details: 'Write a simplified science news article published on the digital platform with opportunity for magazine feature.',
    criteria: [
      { id: 'c9', name: 'Academic Fact Checking', category: 'academic', maxPoints: 25 },
      { id: 'c10', name: 'Article Readability & Style', category: 'scicomm', maxPoints: 25 }
    ]
  },
  {
    id: 'jour_stage_3', stageId: 3, track: 'science_journalism', trackTitle: 'Science Journalism',
    title: 'Stage 3 (Finals): Live Stage Show', sub: 'Live Science Talk Show Interview on Stage', deadline: '2026-10-10', status: 'Grand Finale',
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

  const [activeTab, setActiveTab] = useState('stages'); // 'stages', 'workshops'
  const [evalVirtualBrowserUrl, setEvalVirtualBrowserUrl] = useState(null);
  const [confirmCloseModal, setConfirmCloseModal] = useState(false);
  const [toast, setToast] = useState(null);

  const loadCountRef = useRef(0);

  const evaluations = useLiveCollection('ft_evaluations') || [];
  const workshops = useLiveCollection('workshops') || [];
  const timelineConfig = useLiveCollection('timeline_config') || [];

  useEffect(() => {
    if (evalVirtualBrowserUrl) {
      loadCountRef.current = 0;
    }
  }, [evalVirtualBrowserUrl]);

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

  // Compute Real Assigned Stages for this judge (configured by admin in Timeline Management / Evaluation Management)
  const assignedStages = useMemo(() => {
    const isSuper = ['admin', 'master'].includes(userRole);

    const enriched = ALL_STAGES.map(st => {
      const live = timelineConfig.find(c => c.id === st.id || (c.track === st.track && Number(c.stageId) === Number(st.stageId)));
      return live ? { ...st, ...live } : st;
    });

    if (isSuper) return enriched;

    const myIdentifiers = [userId, meDoc?.id, meDoc?.username, meDoc?.email].filter(Boolean);

    return enriched.filter(st => {
      const assignedIds = st.assignedJudgeIds || [];
      return assignedIds.some(id => myIdentifiers.includes(id));
    });
  }, [timelineConfig, userId, meDoc, userRole]);

  // Compute Assigned Workshops & Live Orientations
  const assignedWorkshops = useMemo(() => {
    const isSuper = ['admin', 'master'].includes(userRole);
    if (isSuper) return workshops;

    const myIdentifiers = [userId, meDoc?.id, meDoc?.username, meDoc?.email, meDoc?.name].filter(Boolean);
    return workshops.filter(w => {
      const instructors = w.instructorIds || [w.instructorId, w.instructorName].filter(Boolean);
      return instructors.some(inst => myIdentifiers.includes(inst));
    });
  }, [workshops, userId, meDoc, userRole]);

  const workshopsTabLabel = useMemo(() => {
    return userRole === 'trainer_judge' ? '🎓 Conduct Orientations & Workshops' : '🎓 Assigned Orientations & Workshops';
  }, [userRole]);

  const getEmbedUrl = (rawUrl) => {
    if (!rawUrl) return 'https://docs.google.com/forms/d/e/1FAIpQLSfbgcAi8mYiNdlWsIbzj8jgxOCFIrrwl1l-6b3akaZ9Dd2XDg/viewform?embedded=true';
    let url = rawUrl.trim();
    if (url.includes('forms.gle/tzgEf9QxBj3nG43S9')) {
      return 'https://docs.google.com/forms/d/e/1FAIpQLSfbgcAi8mYiNdlWsIbzj8jgxOCFIrrwl1l-6b3akaZ9Dd2XDg/viewform?embedded=true';
    }
    if (url.includes('/forms/d/') && url.includes('/edit')) {
      url = url.replace(/\/edit.*$/, '/viewform');
    }
    if (url.includes('/viewform') && !url.includes('embedded=true')) {
      url += (url.includes('?') ? '&' : '?') + 'embedded=true';
    }
    return url;
  };

  const handleMarkEvaluationCompleted = async (stage, field) => {
    try {
      const fieldId = String(field?.id || 'sub_def_1');
      const fieldName = field?.name || stage.title;
      const myJudgeId = userId || meDoc?.id || user?.id || 'judge_user';
      const myJudgeName = meDoc?.name || meDoc?.username || user?.name || user?.username || 'Judge';

      const evalData = {
        stageId: Number(stage.stageId),
        track: stage.track || 'pop_science',
        fieldId: fieldId,
        fieldName: fieldName,
        judgeId: myJudgeId,
        judgeName: myJudgeName,
        status: 'completed',
        comments: `Google Evaluation Form Submitted for ${fieldName}`,
        evaluatedAt: new Date().toISOString()
      };

      await db.ft_evaluations.add(evalData);
      setToast({ type: 'success', text: `Evaluation marked as completed for ${fieldName}!` });
      setTimeout(() => setToast(null), 3500);
    } catch (err) {
      console.error('Failed to log evaluation completion:', err);
    }
  };

  return (
    <div className="ft-animate-in" style={{ paddingBottom: '3rem' }}>
      {/* Top Banner Header */}
      <div className="ft-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.75rem' }}>
        <div>
          <h1 className="ft-page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Award size={30} style={{ color: '#be123c' }} />
            Judge & Trainer Evaluation Portal
          </h1>
          <p className="ft-page-subtitle">
            Manage assigned competition stages, open evaluation Google Forms for stage deliverables, and conduct live workshops.
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
          {workshopsTabLabel} ({assignedWorkshops.length})
        </button>
      </div>

      {/* ── TAB 1: ASSIGNED STAGES ────────────────────────────────────────── */}
      {activeTab === 'stages' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1.5rem' }}>
          {assignedStages.map((st) => {
            const myCriteria = filterCriteriaByRole(st.criteria, userRole);
            const deliverables = (st.submissions && st.submissions.length > 0)
              ? st.submissions
              : [{ id: 'sub_def_1', name: st.title }];

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
                      {st.trackTitle || (st.track === 'pop_science' ? 'Pop Science Videos' : 'Science Journalism')}
                    </span>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', padding: '0.25rem 0.65rem', borderRadius: '12px' }}>
                      Stage {st.stageId}
                    </span>
                  </div>

                  <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', background: '#f8fafc', padding: '0.25rem 0.65rem', borderRadius: '10px', border: '1px solid #cbd5e1' }}>
                    📅 {st.deadline || 'TBA'}
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

                {/* Scoped Criteria List */}
                <div>
                  <div style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 900, textTransform: 'uppercase', marginBottom: '0.35rem', letterSpacing: '0.04em' }}>
                    ⚖️ Scoped Criteria ({myCriteria.length}):
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                    {myCriteria.map(c => (
                      <span key={c.id} style={{ fontSize: '0.73rem', fontWeight: 800, padding: '0.2rem 0.55rem', borderRadius: '8px', background: '#f1f5f9', border: '1px solid #cbd5e1', color: '#0f172a' }}>
                        {c.name} (<strong style={{ color: '#be123c' }}>{c.maxPoints || c.points || 25} pts</strong>)
                      </span>
                    ))}
                  </div>
                </div>

                {/* Submission Deliverables Evaluation Buttons */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.25rem' }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 900, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    📝 Stage Deliverables & Evaluation Forms:
                  </div>

                  {deliverables.map((sf, idx) => {
                    const evalUrl = sf.evalGoogleFormUrl || st.evalGoogleFormUrl || st.googleFormUrl;
                    const targetFieldId = String(sf.id || idx || 'sub_def_1');
                    const targetFieldName = String(sf.name || '').toLowerCase();

                    const isCompleted = evaluations.some(e => {
                      const matchStage = Number(e.stageId) === Number(st.stageId);
                      const matchTrack = !e.track || e.track === st.track;
                      const matchJudge = (e.judgeId === userId || e.judgeId === meDoc?.id || e.judgeId === user?.id);

                      if (!matchStage || !matchTrack || !matchJudge) return false;

                      if (e.fieldId) {
                        return String(e.fieldId) === targetFieldId;
                      }
                      if (e.comments) {
                        const commentLower = String(e.comments).toLowerCase();
                        return targetFieldName && commentLower.includes(targetFieldName);
                      }
                      return false;
                    });

                    return (
                      <button
                        key={sf.id || idx}
                        type="button"
                        className="ft-btn"
                        onClick={() => {
                          if (evalUrl) {
                            setEvalVirtualBrowserUrl({
                              rawUrl: evalUrl,
                              title: `${st.title} - ${sf.name}`,
                              stage: st,
                              field: sf
                            });
                          } else {
                            alert(`No evaluation Google Form URL has been configured for "${sf.name}" by Admin in Evaluation Management yet.`);
                          }
                        }}
                        style={{
                          width: '100%',
                          background: isCompleted
                            ? 'linear-gradient(135deg, #059669 0%, #047857 100%)'
                            : (evalUrl ? 'linear-gradient(135deg, #be123c 0%, #9f1239 100%)' : '#cbd5e1'),
                          color: '#ffffff',
                          border: 'none',
                          fontSize: '0.85rem',
                          fontWeight: 800,
                          padding: '0.65rem 0.9rem',
                          borderRadius: '12px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.45rem',
                          boxShadow: isCompleted ? '0 4px 14px rgba(5,150,105,0.3)' : (evalUrl ? '0 4px 14px rgba(190, 18, 60, 0.25)' : 'none')
                        }}
                      >
                        {isCompleted ? `✅ Evaluation Completed (${sf.name})` : `🏅 Open & Evaluate: ${sf.name} ↗`}
                      </button>
                    );
                  })}
                </div>

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
                    justifyContent: 'space-between',
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

      {/* VIRTUAL EMBEDDED BROWSER MODAL FOR EVALUATION GOOGLE FORMS */}
      {evalVirtualBrowserUrl && createPortal(
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, padding: '1rem' }} onClick={() => setConfirmCloseModal(true)}>
          <div className="ft-card ft-animate-in" style={{ width: '95vw', maxWidth: '1100px', height: '92vh', background: '#ffffff', borderRadius: '24px', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.4)', border: '1px solid #cbd5e1', position: 'relative' }} onClick={e => e.stopPropagation()}>

            {/* Floating Close Button */}
            <button
              type="button"
              onClick={() => setConfirmCloseModal(true)}
              style={{
                position: 'absolute', top: '14px', right: '18px', zIndex: 30,
                background: '#ffffff', border: '1.5px solid #cbd5e1', color: '#0f172a',
                width: '36px', height: '36px', borderRadius: '50%', fontWeight: 900,
                fontSize: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'center',
                justifyContent: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
              }}
              title="Close Modal"
            >
              ✕
            </button>

            {/* Embedded Iframe Container */}
            <div style={{ flex: 1, position: 'relative', width: '100%', height: '100%', background: '#ffffff', overflow: 'hidden' }}>
              <iframe
                src={getEmbedUrl(evalVirtualBrowserUrl.rawUrl)}
                title="Evaluation Google Form"
                style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>

          </div>
        </div>,
        document.body
      )}

      {/* SMART EXIT CONFIRMATION DIALOG */}
      {confirmCloseModal && evalVirtualBrowserUrl && createPortal(
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100000, padding: '1rem' }} onClick={() => setConfirmCloseModal(false)}>
          <div className="ft-card ft-animate-in" style={{ background: '#ffffff', padding: '1.75rem', borderRadius: '20px', maxWidth: '440px', width: '100%', textAlign: 'center', boxShadow: '0 20px 40px rgba(0,0,0,0.25)' }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📝</div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0f172a', margin: '0 0 0.5rem 0' }}>
              Did you submit your evaluation form?
            </h3>
            <p style={{ fontSize: '0.88rem', color: '#475569', lineHeight: 1.5, margin: '0 0 1.5rem 0' }}>
              If you have submitted the Google Form response, mark it as completed to update your stage evaluation progress.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="ft-btn"
                onClick={() => {
                  setConfirmCloseModal(false);
                  setEvalVirtualBrowserUrl(null);
                }}
                style={{ background: '#f1f5f9', color: '#475569', border: '1.5px solid #cbd5e1', fontWeight: 800, padding: '0.65rem 1.1rem', borderRadius: '12px' }}
              >
                ❌ No, Close Without Saving
              </button>
              <button
                type="button"
                className="ft-btn"
                onClick={async () => {
                  setConfirmCloseModal(false);
                  await handleMarkEvaluationCompleted(evalVirtualBrowserUrl.stage, evalVirtualBrowserUrl.field);
                  setEvalVirtualBrowserUrl(null);
                }}
                style={{ background: 'linear-gradient(135deg, #059669 0%, #047857 100%)', color: '#ffffff', border: 'none', fontWeight: 900, padding: '0.65rem 1.1rem', borderRadius: '12px', boxShadow: '0 4px 14px rgba(5,150,105,0.3)' }}
              >
                ✅ Yes, Mark Completed
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
