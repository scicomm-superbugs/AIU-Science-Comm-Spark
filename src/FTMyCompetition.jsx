import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from './context/AuthContext';
import { useLiveCollection, db, getCollectionName, firestore, uploadFile } from './db';
import { collection, getDocs } from 'firebase/firestore';
import { Award, Star, MessageSquare, CheckCircle, Clock, X, Send, Video, FileText, ExternalLink } from 'lucide-react';
import { DEFAULT_JUDGING_CRITERIA, calculateAveragedPoints, normalizeTrackKey } from './ftConstants';
import './scicommspark.css';

export const DEFAULT_STAGES = {
  pop_science: [
    {
      id: 'pop_stage_1', stageId: 1, title: 'Stage 1: Short Pop Video', sub: 'Reels / TikTok Video (max 90 seconds)', deadline: '2026-09-01', status: 'Active Stage',
      details: 'Produce a punchy, highly engaging short video introducing a core scientific concept for social media.',
      criteria: [
        { id: 'c1', name: 'Scientific Accuracy', category: 'academic', maxPoints: 25 },
        { id: 'c2', name: 'Hook & Visual Engagement', category: 'scicomm', maxPoints: 25 }
      ]
    },
    {
      id: 'pop_stage_2', stageId: 2, title: 'Stage 2: Long Pop Video', sub: 'YouTube SciComm Video (up to 3 minutes)', deadline: '2026-09-20', status: 'Upcoming Stage',
      details: 'Deep scientific storytelling featuring comprehensive explanation, visual graphics, and clear narration.',
      criteria: [
        { id: 'c3', name: 'Research Depth & Rigor', category: 'academic', maxPoints: 25 },
        { id: 'c4', name: 'Video Editing & Narrative Flow', category: 'scicomm', maxPoints: 25 }
      ]
    },
    {
      id: 'pop_stage_3', stageId: 3, title: 'Stage 3 (Finals): Live Stage Show', sub: 'Interactive Live Presentation (5 mins on stage)', deadline: '2026-10-10', status: 'Grand Finale',
      details: 'Deliver an interactive live science presentation on stage before expert judges, audience, and broadcast.',
      criteria: [
        { id: 'c5', name: 'Scientific Q&A Defense', category: 'academic', maxPoints: 25 },
        { id: 'c6', name: 'Stage Confidence & Delivery', category: 'scicomm', maxPoints: 25 }
      ]
    }
  ],
  science_journalism: [
    {
      id: 'jour_stage_1', stageId: 1, title: 'Stage 1: Research Field Prep', sub: 'Topic Research & Expert Interviews Prep', deadline: '2026-09-01', status: 'Active Stage',
      details: 'Select a scientific topic, gather research data, and conduct interviews with researchers & academic experts.',
      criteria: [
        { id: 'c7', name: 'Literature Review & Citation', category: 'academic', maxPoints: 25 },
        { id: 'c8', name: 'Journalistic Angle', category: 'scicomm', maxPoints: 25 }
      ]
    },
    {
      id: 'jour_stage_2', stageId: 2, title: 'Stage 2: Article Publication', sub: 'Simplified Science Article Publication', deadline: '2026-09-20', status: 'Upcoming Stage',
      details: 'Write a simplified science news article published on the digital platform with opportunity for magazine feature.',
      criteria: [
        { id: 'c9', name: 'Academic Fact Checking', category: 'academic', maxPoints: 25 },
        { id: 'c10', name: 'Article Readability & Style', category: 'scicomm', maxPoints: 25 }
      ]
    },
    {
      id: 'jour_stage_3', stageId: 3, title: 'Stage 3 (Finals): Live Stage Show', sub: 'Live Science Talk Show Interview on Stage', deadline: '2026-10-10', status: 'Grand Finale',
      details: 'Host a simulated live science talk show interview on stage in front of judges and public audience.',
      criteria: [
        { id: 'c11', name: 'Expert Q&A Handling', category: 'academic', maxPoints: 25 },
        { id: 'c12', name: 'Interview Dynamics', category: 'scicomm', maxPoints: 25 }
      ]
    }
  ]
};

export default function FTMyCompetition() {
  const { user } = useAuth();
  const [evaluations, setEvaluations] = useState([]);

  const timelineConfig = useLiveCollection('timeline_config') || [];
  const scientists = useLiveCollection('scientists') || [];
  const teams = useLiveCollection('ft_teams') || [];
  const submissions = useLiveCollection('submissions') || [];

  const meDoc = scientists.find(s => s.id === user?.id || s.email === user?.email || s.username === user?.username) || user;
  const myTeam = teams.find(t => (t.members || []).some(m => m.userId === user?.id || m.userId === meDoc?.id));

  const competitorTrack = normalizeTrackKey(meDoc?.registeredTrack || user?.registeredTrack || myTeam?.track || user?.track);
  const rawStages = DEFAULT_STAGES[competitorTrack] || DEFAULT_STAGES.pop_science;

  const getStageData = (trackId, stageObj) => {
    const found = timelineConfig.find(c => c.track === trackId && Number(c.stageId) === Number(stageObj.stageId));
    return found ? { assignedJudgeIds: [], ...stageObj, ...found } : { assignedJudgeIds: [], ...stageObj };
  };

  const stages = rawStages.map(st => getStageData(competitorTrack, st));
  const mySubmissions = submissions.filter(s => s.competitorId === user?.id || s.competitorEmail === user?.email || (myTeam && s.teamId === myTeam.id));

  const [collapsedStages, setCollapsedStages] = useState({});

  const toggleCollapse = (stageId) => {
    setCollapsedStages(prev => ({
      ...prev,
      [stageId]: !prev[stageId]
    }));
  };

  const [submitModalOpen, setSubmitModalOpen] = useState(false);
  const [submitStage, setSubmitStage] = useState(null);
  const [subTitle, setSubTitle] = useState('');
  const [subVideoUrl, setSubVideoUrl] = useState('');
  const [subArticleContent, setSubArticleContent] = useState('');
  const [subFileUrl, setSubFileUrl] = useState('');
  const [subPdfFile, setSubPdfFile] = useState(null);
  const [pdfUploading, setPdfUploading] = useState(false);
  const [policyConsent, setPolicyConsent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [editingSubId, setEditingSubId] = useState(null);
  const [subItems, setSubItems] = useState({});

  const handleOpenSubmitModal = (stage, existingSub = null) => {
    setSubmitStage(stage);
    setSubmitError('');
    setPolicyConsent(Boolean(existingSub));
    setSubPdfFile(null);
    setPdfUploading(false);

    const fields = (stage.submissions && stage.submissions.length > 0)
      ? stage.submissions
      : (competitorTrack === 'pop_science'
          ? [{ id: 'sub_def_1', name: 'Submission 1: Short Pop Video URL', type: 'url', question: 'Paste your YouTube, TikTok, Instagram Reels, or Google Drive video URL:' }]
          : [{ id: 'sub_def_2', name: 'Submission 1: Science Article Document', type: 'file', question: 'Upload your formatted science article PDF document (.pdf):' }]);

    const initialItems = {};
    fields.forEach(f => {
      const savedItem = existingSub?.submittedItems?.[f.id];
      initialItems[f.id] = {
        name: f.name,
        type: f.type,
        question: f.question,
        value: savedItem?.value || (f.type === 'url' ? existingSub?.videoUrl || '' : f.type === 'textbox' ? existingSub?.articleContent || '' : existingSub?.fileUrl || ''),
        fileUrl: savedItem?.fileUrl || existingSub?.fileUrl || existingSub?.pdfUrl || ''
      };
    });

    setSubItems(initialItems);

    if (existingSub) {
      setEditingSubId(existingSub.id);
      setSubTitle(existingSub.title || '');
      setSubVideoUrl(existingSub.videoUrl || '');
      setSubArticleContent(existingSub.articleContent || '');
      setSubFileUrl(existingSub.fileUrl || existingSub.pdfUrl || existingSub.videoUrl || '');
    } else {
      setEditingSubId(null);
      setSubTitle('');
      setSubVideoUrl('');
      setSubArticleContent('');
      setSubFileUrl('');
    }
    setSubmitModalOpen(true);
  };

  const handleSubmissionSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');
    if (!subTitle.trim()) {
      setSubmitError('Please enter a submission project title.');
      return;
    }

    setIsSubmitting(true);
    try {
      let mainVideoUrl = subVideoUrl.trim();
      let mainFileUrl = subFileUrl.trim();

      Object.values(subItems).forEach(item => {
        if (item.type === 'url' && item.value && !mainVideoUrl) {
          mainVideoUrl = item.value.trim();
        }
        if ((item.type === 'file' || item.type === 'link_file') && item.fileUrl && !mainFileUrl) {
          mainFileUrl = item.fileUrl.trim();
        }
        if (item.type === 'link_file' && item.value && !mainVideoUrl) {
          mainVideoUrl = item.value.trim();
        }
      });

      if (subPdfFile && !mainFileUrl) {
        mainFileUrl = await uploadFile(subPdfFile, `articles/${Date.now()}_${subPdfFile.name}`);
      }

      const data = {
        competitorId: user?.id || 'guest',
        competitorName: user?.name || user?.username || 'Competitor',
        competitorEmail: user?.email || '',
        teamName: user?.teamName || '',
        track: competitorTrack,
        stageId: Number(submitStage.stageId),
        title: subTitle.trim(),
        videoUrl: mainVideoUrl || mainFileUrl,
        fileUrl: mainFileUrl,
        pdfUrl: mainFileUrl,
        articleContent: subArticleContent.trim(),
        submittedItems: subItems,
        status: 'pending',
        submittedAt: new Date().toISOString()
      };

      if (editingSubId) {
        await db.submissions.update(editingSubId, data);
      } else {
        await db.submissions.add(data);
      }

      setSubmitModalOpen(false);
    } catch (err) {
      setSubmitError('Failed to submit: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const trackThemeColor = competitorTrack === 'pop_science' ? '#be123c' : '#2563eb';

  return (
    <div className="ft-animate-in">
      <div className="ft-page-header">
        <h1 className="ft-page-title">My Competition Workspace</h1>
        <p className="ft-page-subtitle">Track your submission status, assigned judges, dynamic criteria, and scores stage-by-stage.</p>
        {user?.competitorIdNumber && (
          <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--ft-primary)', marginTop: '0.4rem', background: 'rgba(225, 29, 72, 0.05)', border: '1px solid rgba(225, 29, 72, 0.15)', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.4rem 0.8rem', borderRadius: '8px' }}>
            🎫 Competitor ID: {user.competitorIdNumber}
          </div>
        )}
      </div>

      {/* STAGE-BY-STAGE DASHBOARD CARDS — MODERN GRAPHICAL HUD */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', marginBottom: '2.5rem' }}>
        {stages.map((st) => {
          const stageSub = mySubmissions.find(s => Number(s.stageId) === Number(st.stageId));
          const stageEvals = evaluations.filter(e => Number(e.stageId) === Number(st.stageId));

          const isStageActive = Number(st.stageId) === 1 || st.status === 'Active Stage' || st.status === 'Active' || st.acceptSubmissions === true || Boolean(stageSub) || stageEvals.length > 0;
          const isCollapsed = collapsedStages[st.stageId] !== undefined ? collapsedStages[st.stageId] : !isStageActive;

          if (isCollapsed) {
            return (
              <div key={st.id} style={{
                background: '#ffffff', borderRadius: '18px', padding: '1.25rem 1.75rem',
                border: `1.5px solid ${isStageActive ? '#a7f3d0' : '#e2e8f0'}`, boxShadow: '0 4px 14px rgba(0,0,0,0.02)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 900, color: isStageActive ? '#047857' : '#64748b', background: isStageActive ? '#ecfdf5' : '#f1f5f9', padding: '0.25rem 0.75rem', borderRadius: '20px', border: `1px solid ${isStageActive ? '#a7f3d0' : '#cbd5e1'}` }}>
                    Stage {st.stageId}
                  </span>
                  <div>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 900, color: '#334155', margin: 0, fontFamily: "'Outfit', sans-serif" }}>
                      {st.title}
                    </h3>
                    <div style={{ fontSize: '0.8rem', color: isStageActive ? '#059669' : '#94a3b8', marginTop: '0.15rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', fontWeight: 700 }}>
                      <span>{isStageActive ? '🟢 Submissions Open / Active Stage' : '🔒 Submissions Closed / Upcoming Stage'}</span>
                      <span>·</span>
                      <span>📅 Deadline: {new Date(st.deadline).toLocaleDateString([], { dateStyle: 'medium' })}</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => toggleCollapse(st.stageId)}
                  className="ft-btn"
                  style={{ background: '#f8fafc', color: '#475569', border: '1.5px solid #cbd5e1', fontSize: '0.82rem', fontWeight: 800, padding: '0.45rem 1rem', borderRadius: '10px', cursor: 'pointer' }}
                >
                  Show Stage Details ▼
                </button>
              </div>
            );
          }

          return (
            <div key={st.id} style={{
              background: '#ffffff', borderRadius: '22px', padding: '2rem',
              border: `2px solid ${trackThemeColor}30`,
              boxShadow: '0 10px 35px rgba(15, 23, 42, 0.05)',
              position: 'relative', overflow: 'hidden', transition: 'all 0.3s ease'
            }}>
              {/* Left Color Accent Bar */}
              <div style={{
                position: 'absolute', top: 0, left: 0, bottom: 0, width: '6px',
                background: `linear-gradient(180deg, ${trackThemeColor} 0%, #7c3aed 100%)`
              }} />

              {/* Card Header Info */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.25rem', marginBottom: '1.25rem', paddingLeft: '0.5rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem', flexWrap: 'wrap' }}>
                    <span style={{
                      fontSize: '0.78rem', fontWeight: 900, color: '#ffffff', background: trackThemeColor,
                      padding: '0.25rem 0.75rem', borderRadius: '20px', letterSpacing: '0.04em',
                      boxShadow: `0 3px 10px ${trackThemeColor}40`
                    }}>
                      Stage {st.stageId}
                    </span>
                    <span style={{
                      fontSize: '0.75rem', fontWeight: 700,
                      background: isStageActive ? '#ecfdf5' : '#f1f5f9',
                      color: isStageActive ? '#059669' : '#475569',
                      padding: '0.25rem 0.65rem', borderRadius: '8px', border: `1px solid ${isStageActive ? '#a7f3d0' : '#cbd5e1'}`
                    }}>
                      {isStageActive ? '🟢 Submissions Open / Active' : '🔒 Upcoming Stage'}
                    </span>
                  </div>

                  <h3 style={{ fontSize: '1.4rem', fontWeight: 900, margin: '0.2rem 0', color: '#0f172a', fontFamily: "'Outfit', sans-serif" }}>
                    {st.title}
                  </h3>
                  <div style={{ fontSize: '0.9rem', color: trackThemeColor, fontWeight: 700 }}>
                    {st.sub}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{
                    background: '#fff1f2', border: '1px solid #fecdd3', padding: '0.65rem 1.1rem',
                    borderRadius: '14px', textAlign: 'right', boxShadow: '0 2px 8px rgba(190, 18, 60, 0.05)'
                  }}>
                    <div style={{ fontSize: '0.72rem', color: '#9f1239', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Deadline Date
                    </div>
                    <div style={{ fontWeight: 900, color: '#be123c', fontSize: '1rem', marginTop: '0.1rem' }}>
                      📅 {st.deadline === 'TBD' || st.isTbd || !st.deadline ? 'TBD (To Be Determined)' : (isNaN(new Date(st.deadline).getTime()) ? st.deadline : new Date(st.deadline).toLocaleDateString([], { dateStyle: 'medium' }))}
                    </div>
                  </div>

                  <button
                    onClick={() => toggleCollapse(st.stageId)}
                    className="ft-btn"
                    style={{ background: '#f8fafc', color: '#64748b', border: '1px solid #cbd5e1', fontSize: '0.78rem', fontWeight: 800, padding: '0.45rem 0.8rem', borderRadius: '10px', cursor: 'pointer' }}
                  >
                    Collapse ▲
                  </button>
                </div>
              </div>

              {/* Stage Description & Guidelines */}
              <p style={{ fontSize: '0.92rem', color: '#475569', lineHeight: 1.6, margin: '0 0 1.5rem 0', paddingLeft: '0.5rem', maxWidth: '850px' }}>
                {st.details}
              </p>

              {/* Grid: Assigned Judges & Dynamic Criteria */}
              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem',
                borderTop: '1px solid #f1f5f9', paddingTop: '1.25rem', marginBottom: '1.5rem', paddingLeft: '0.5rem'
              }}>
                {/* Left: Assigned Judges */}
                <div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 900, color: '#0f172a', marginBottom: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span>👥</span> ASSIGNED EVALUATORS:
                  </div>
                  <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
                    {(st.assignedJudgeIds || []).length === 0 ? (
                      <span style={{ fontSize: '0.82rem', color: '#94a3b8', fontStyle: 'italic' }}>No judges assigned yet</span>
                    ) : (
                      (st.assignedJudgeIds || []).map(judgeId => {
                        const judge = scientists.find(u => u.id === judgeId);
                        if (!judge) return null;
                        const roleColor = judge.role === 'academic_judge' ? '#0284c7' : judge.role === 'scicomm_judge' ? '#e11d48' : '#8b5cf6';
                        const roleLabel = judge.role === 'academic_judge' ? 'Academic 🎓' : judge.role === 'scicomm_judge' ? 'SciComm 🎙️' : 'Academic & SciComm Judge';
                        const avatarUrl = judge.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${judge.username || judge.name}`;

                        return (
                          <div key={judgeId} style={{
                            display: 'flex', alignItems: 'center', gap: '0.55rem',
                            background: '#f8fafc', padding: '0.45rem 0.8rem', borderRadius: '12px',
                            border: `1.5px solid ${roleColor}60`, boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
                          }}>
                            <img src={avatarUrl} alt="" style={{ width: '26px', height: '26px', borderRadius: '50%', border: `1.5px solid ${roleColor}`, objectFit: 'cover' }} />
                            <div>
                              <div style={{ fontWeight: 800, fontSize: '0.82rem', color: '#0f172a' }}>{judge.name}</div>
                              <div style={{ fontSize: '0.65rem', fontWeight: 900, color: roleColor }}>{roleLabel}</div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Right: Judging Criteria Chips */}
                <div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 900, color: '#0f172a', marginBottom: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span>⚖️</span> DYNAMIC STAGE CRITERIA:
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {(st.criteria || []).length === 0 ? (
                      <span style={{ fontSize: '0.82rem', color: '#94a3b8', fontStyle: 'italic' }}>No criteria defined yet</span>
                    ) : (
                      (st.criteria || []).map(c => (
                        <div key={c.id} style={{
                          fontSize: '0.78rem', fontWeight: 800, padding: '0.4rem 0.75rem', borderRadius: '10px',
                          background: c.category === 'academic' ? '#f0f9ff' : '#fff1f2',
                          border: `1.5px solid ${c.category === 'academic' ? '#0284c7' : '#e11d48'}`,
                          color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.4rem'
                        }}>
                          <span style={{ fontSize: '0.7rem' }}>{c.category === 'academic' ? '🎓 Academic' : '🎙️ SciComm'}</span>
                          <span>· {c.name}</span>
                          <span style={{
                            fontSize: '0.7rem', fontWeight: 900, background: c.category === 'academic' ? '#0284c7' : '#e11d48',
                            color: '#ffffff', padding: '0.1rem 0.4rem', borderRadius: '6px'
                          }}>
                            {c.maxPoints} pts
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>

              {/* Bottom: Submission & Scores Row */}
              <div style={{
                borderTop: '2px dashed #e2e8f0', paddingTop: '1.5rem',
                display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem',
                paddingLeft: '0.5rem'
              }}>
                
                {/* SUBMISSION STATE GRAPHIC BOX */}
                <div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 900, color: '#0f172a', marginBottom: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span>📤</span> YOUR SUBMISSION:
                  </div>

                  {stageSub ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <div style={{
                        background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)',
                        padding: '1.1rem 1.25rem', borderRadius: '16px', border: '2px solid #059669',
                        boxShadow: '0 4px 15px rgba(5, 150, 105, 0.1)'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                          <span style={{ fontWeight: 900, fontSize: '0.98rem', color: '#065f46', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span>✅</span> {stageSub.title}
                          </span>
                          <span style={{ fontSize: '0.72rem', background: '#059669', color: '#ffffff', fontWeight: 900, padding: '0.15rem 0.5rem', borderRadius: '6px' }}>
                            SUBMITTED
                          </span>
                        </div>

                        <div style={{ fontSize: '0.78rem', color: '#047857', fontWeight: 600 }}>
                          Submitted: {new Date(stageSub.submittedAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                        </div>

                        {/* Render submitted items list if available */}
                        {stageSub.submittedItems && Object.keys(stageSub.submittedItems).length > 0 ? (
                          <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                            {Object.entries(stageSub.submittedItems).map(([fId, item]) => (
                              <div key={fId} style={{ background: '#ffffff', padding: '0.55rem 0.8rem', borderRadius: '10px', border: '1.5px solid #a7f3d0', fontSize: '0.82rem' }}>
                                <div style={{ fontWeight: 800, color: '#065f46', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                  <span>{item.type === 'url' ? '🔗' : item.type === 'file' ? '📄' : item.type === 'textbox' ? '📝' : '📁'}</span>
                                  <span>{item.name}</span>
                                </div>
                                {item.value && (
                                  <div style={{ marginTop: '0.2rem', color: '#1e293b' }}>
                                    {item.type === 'url' ? (
                                      <a href={item.value} target="_blank" rel="noreferrer" style={{ color: '#0284c7', fontWeight: 800, textDecoration: 'underline' }}>{item.value} ↗</a>
                                    ) : (
                                      <span>"{item.value}"</span>
                                    )}
                                  </div>
                                )}
                                {item.fileUrl && (
                                  <div style={{ marginTop: '0.2rem' }}>
                                    <a href={item.fileUrl} target="_blank" rel="noreferrer" style={{ color: '#047857', fontWeight: 800, textDecoration: 'underline', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                                      📄 View Deliverable File <ExternalLink size={13} />
                                    </a>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          (stageSub.videoUrl || stageSub.fileUrl || stageSub.pdfUrl) ? (
                            <div style={{ marginTop: '0.65rem' }}>
                              <a href={stageSub.fileUrl || stageSub.pdfUrl || stageSub.videoUrl} target="_blank" rel="noreferrer" className="ft-btn" style={{
                                fontSize: '0.82rem', background: '#ffffff', border: '1.5px solid #059669',
                                color: '#065f46', textDecoration: 'none', fontWeight: 800, padding: '0.35rem 0.85rem',
                                borderRadius: '8px', display: 'inline-flex', alignItems: 'center', gap: '0.35rem'
                              }}>
                                🔗 View Uploaded Deliverable / PDF <ExternalLink size={14} />
                              </a>
                            </div>
                          ) : null
                        )}
                      </div>

                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        {st.acceptSubmissions !== false && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenSubmitModal(st, stageSub);
                            }}
                            className="ft-btn"
                            style={{
                              background: '#ffffff', border: '2px solid #cbd5e1',
                              color: '#334155', fontWeight: 800, padding: '0.5rem 1rem', borderRadius: '10px',
                              fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem',
                              position: 'relative', zIndex: 10
                            }}
                          >
                            ✏️ Edit / Resubmit Work
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={async (e) => {
                            e.stopPropagation();
                            if (window.confirm('Are you sure you want to delete this submission? This action cannot be undone.')) {
                              await db.submissions.delete(stageSub.id);
                            }
                          }}
                          className="ft-btn"
                          style={{
                            background: '#fff1f2', border: '2px solid #fecdd3',
                            color: '#be123c', fontWeight: 800, padding: '0.5rem 1rem', borderRadius: '10px',
                            fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem',
                            position: 'relative', zIndex: 10
                          }}
                        >
                          🗑️ Delete Submission
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {/* GRAPHICAL UPLOAD DROP-ZONE CARD */}
                      <div style={{
                        padding: '1.25rem', borderRadius: '16px',
                        background: 'linear-gradient(135deg, #fff1f2 0%, #fff7ed 100%)',
                        border: '2px dashed #f43f5e', color: '#be123c',
                        display: 'flex', alignItems: 'center', gap: '1rem',
                        boxShadow: '0 4px 14px rgba(190, 18, 60, 0.06)'
                      }}>
                        <div style={{
                          width: 44, height: 44, borderRadius: '12px', background: '#be123c',
                          color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          boxShadow: '0 4px 12px rgba(190, 18, 60, 0.3)', flexShrink: 0
                        }}>
                          <Send size={20} />
                        </div>
                        <div>
                          <div style={{ fontWeight: 900, fontSize: '0.92rem', color: '#9f1239' }}>
                            No submission uploaded yet
                          </div>
                          <div style={{ fontSize: '0.78rem', color: '#be123c', marginTop: '0.15rem', fontWeight: 500 }}>
                            Upload your project files or video link before the stage deadline.
                          </div>
                        </div>
                      </div>

                      {st.acceptSubmissions !== false ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleOpenSubmitModal(st);
                          }}
                          className="ft-btn"
                          style={{
                            alignSelf: 'flex-start',
                            background: `linear-gradient(135deg, ${trackThemeColor} 0%, #e11d48 100%)`,
                            color: '#ffffff', fontWeight: 900, padding: '0.75rem 1.4rem', borderRadius: '12px',
                            fontSize: '0.92rem', border: 'none', boxShadow: `0 4px 16px ${trackThemeColor}60`,
                            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem',
                            position: 'relative', zIndex: 10
                          }}
                        >
                          <Send size={16} /> Submit Work for Stage {st.stageId}
                        </button>
                      ) : (
                        <span style={{ fontSize: '0.82rem', color: '#64748b', fontStyle: 'italic', fontWeight: 600 }}>
                          🔒 Submissions are currently closed for this stage.
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* EVALUATION & SCORING GRAPHIC BOX */}
                <div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 900, color: '#0f172a', marginBottom: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span>🏆</span> EVALUATIONS & FEEDBACK:
                  </div>

                  {stageEvals.length === 0 ? (
                    stageSub ? (
                      <div style={{
                        padding: '1.25rem', borderRadius: '16px',
                        background: 'linear-gradient(135deg, #fffbe6 0%, #fef3c7 100%)',
                        border: '2px solid #f59e0b', color: '#b45309',
                        display: 'flex', alignItems: 'center', gap: '0.85rem'
                      }}>
                        <div style={{ fontSize: '1.4rem' }}>⏳</div>
                        <div>
                          <div style={{ fontWeight: 900, fontSize: '0.92rem', color: '#92400e' }}>
                            Awaiting Evaluation
                          </div>
                          <div style={{ fontSize: '0.78rem', color: '#b45309', marginTop: '0.15rem' }}>
                            Submission received! Assigned judges are reviewing your work.
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div style={{
                        padding: '1.25rem', borderRadius: '16px',
                        background: '#f8fafc', border: '1.5px solid #e2e8f0',
                        color: '#64748b', fontSize: '0.85rem', fontWeight: 600, fontStyle: 'italic'
                      }}>
                        Scores and feedback comments will appear here once your submission is graded by the panel.
                      </div>
                    )
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                      {/* Overall Averaged Stage Score Banner across judges */}
                      {stageEvals.length > 0 && (
                        <div style={{
                          background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
                          border: '1.5px solid #a7f3d0', padding: '0.75rem 1.1rem', borderRadius: '14px',
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.88rem', fontWeight: 900, color: '#047857' }}>
                            <span>📊</span> Overall Stage Averaged Grade ({stageEvals.length} {stageEvals.length === 1 ? 'Judge Evaluation' : 'Judges Averaged'}):
                          </div>
                          <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#065f46', background: '#ffffff', padding: '0.2rem 0.75rem', borderRadius: '10px', border: '1px solid #6ee7b7' }}>
                            {calculateAveragedPoints(stageEvals)} / {(st.criteria || []).reduce((sum, c) => sum + Number(c.maxPoints || 0), 0) || 50} pts
                          </div>
                        </div>
                      )}

                      {stageEvals.map(evalDoc => {
                        const isAcademic = evalDoc.judgeRole === 'academic_judge';
                        const judgeRoleColor = isAcademic ? '#0284c7' : evalDoc.judgeRole === 'scicomm_judge' ? '#e11d48' : '#14b8a6';
                        const judgeRoleLabel = isAcademic ? 'Academic Review 🎓' : evalDoc.judgeRole === 'scicomm_judge' ? 'SciComm Review 🎙️' : 'Official Review';

                        // Calculate total max points of all stage criteria combined (e.g. 25 + 25 = 50 pts)
                        const stageAllCriteriaMaxSum = (st.criteria || []).reduce((sum, c) => sum + Number(c.maxPoints || 0), 0) || 50;
                        const displayMaxScore = stageAllCriteriaMaxSum;

                        const dateRaw = evalDoc.evaluatedAt || evalDoc.createdAt;
                        const dateFormatted = dateRaw && !isNaN(new Date(dateRaw).getTime()) ? new Date(dateRaw).toLocaleDateString([], { dateStyle: 'medium' }) : 'Recently';

                        return (
                          <div key={evalDoc.id} style={{
                            background: '#ffffff', padding: '1rem 1.2rem', borderRadius: '16px',
                            border: `2px solid ${judgeRoleColor}`, boxShadow: '0 4px 14px rgba(0,0,0,0.05)'
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                              <span style={{ fontSize: '0.75rem', fontWeight: 900, background: judgeRoleColor, color: '#ffffff', padding: '0.25rem 0.65rem', borderRadius: '8px' }}>
                                {judgeRoleLabel}
                              </span>
                               <span style={{ fontSize: '1.05rem', fontWeight: 900, color: '#0f172a', background: '#fef3c7', padding: '0.2rem 0.65rem', borderRadius: '8px', border: '1px solid #f59e0b' }}>
                                {evalDoc.totalScore} / {displayMaxScore} pts
                              </span>
                            </div>

                             {(() => {
                               const judgeAcc = scientists.find(s => s.name === evalDoc.judgeName || s.username === evalDoc.judgeName || s.id === evalDoc.judgeId);
                               return (
                                 <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', margin: '0.4rem 0' }}>
                                   <img
                                     src={judgeAcc?.avatarUrl || judgeAcc?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${evalDoc.judgeName}`}
                                     alt=""
                                     style={{ width: 34, height: 34, borderRadius: '50%', border: `2px solid ${judgeRoleColor}`, objectFit: 'cover', flexShrink: 0 }}
                                   />
                                   <div>
                                     <div style={{ fontSize: '0.84rem', color: '#0f172a', fontWeight: 800 }}>
                                       Evaluated by <strong>{evalDoc.judgeName}</strong> on {dateFormatted}
                                     </div>
                                     {judgeAcc && (judgeAcc.title || judgeAcc.institutionName || judgeAcc.department) && (
                                       <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600 }}>
                                         {judgeAcc.title && <span>{judgeAcc.title}</span>}
                                         {judgeAcc.institutionName && <span>{judgeAcc.title ? ' · ' : ''}🏫 {judgeAcc.institutionName}</span>}
                                         {!judgeAcc.institutionName && judgeAcc.department && <span>{judgeAcc.title ? ' · ' : ''}🎓 {judgeAcc.department}</span>}
                                       </div>
                                     )}
                                   </div>
                                 </div>
                               );
                             })()}
                            
                            {/* Judge Feedback Comments */}
                            {evalDoc.comments && (
                              <div style={{
                                marginTop: '0.6rem', fontSize: '0.85rem', color: '#1e293b', fontStyle: 'italic',
                                background: '#f8fafc', padding: '0.6rem 0.85rem', borderRadius: '10px',
                                borderLeft: `4px solid ${judgeRoleColor}`, fontWeight: 500
                              }}>
                                "{evalDoc.comments}"
                              </div>
                            )}

                            {/* Criteria Score Chips */}
                            {evalDoc.criteriaBreakdown && (
                              <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.45rem', flexWrap: 'wrap' }}>
                                {Object.entries(evalDoc.criteriaBreakdown).map(([critId, score]) => {
                                  const cDetail = st.criteria?.find(c => c.id === critId);
                                  if (!cDetail) return null;
                                  return (
                                    <span key={critId} style={{
                                      fontSize: '0.72rem', fontWeight: 800, padding: '0.25rem 0.55rem', borderRadius: '6px',
                                      background: '#f1f5f9', border: '1px solid #cbd5e1', color: '#0f172a'
                                    }}>
                                      {cDetail.name}: <strong style={{ color: judgeRoleColor }}>{score} pts</strong>
                                    </span>
                                  );
                                })}
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
        })}
      </div>

      {/* Submission Popup Modal */}
      {submitModalOpen && submitStage && createPortal(
        <div 
          className="ft-modal-overlay"
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, width: '100vw', height: '100vh', height: '100dvh',
            background: 'rgba(15, 23, 42, 0.85)',
            backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', zIndex: 9999999, padding: '1rem', overflowY: 'auto',
            boxSizing: 'border-box'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setSubmitModalOpen(false);
          }}
        >
          <div className="ft-modal-container" style={{
            background: '#ffffff',
            border: '1.5px solid #cbd5e1',
            borderRadius: '24px', width: '100%', maxWidth: '560px',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.4)', overflow: 'hidden',
            display: 'flex', flexDirection: 'column', maxHeight: 'calc(100dvh - 3.5rem)',
            position: 'relative', zIndex: 10000000, boxSizing: 'border-box'
          }}>
            {/* Header */}
            <div style={{
              padding: '1.25rem 1.5rem', borderBottom: '1px solid #f1f5f9',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              background: '#f8fafc'
            }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 900, margin: 0, color: '#0f172a', fontFamily: "'Outfit', sans-serif" }}>
                  📤 {editingSubId ? 'Edit' : 'Submit'} Work for Stage {submitStage.stageId}
                </h3>
                <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.78rem', color: '#64748b', fontWeight: 700 }}>
                  {submitStage.title} ({competitorTrack === 'pop_science' ? 'Pop Science Track' : 'Science Journalism Track'})
                </p>
              </div>
              <button 
                type="button"
                onClick={() => setSubmitModalOpen(false)}
                style={{ background: '#f1f5f9', border: 'none', width: '32px', height: '32px', borderRadius: '50%', fontWeight: 800, cursor: 'pointer', color: '#475569' }}
              >
                ✕
              </button>
            </div>

            {/* Content Form */}
            <form className="ft-modal-form" onSubmit={handleSubmissionSubmit} style={{ padding: '1.25rem 1.25rem 3.5rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', overflowY: 'auto' }}>
              {submitError && (
                <div style={{ padding: '0.75rem 1rem', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', fontSize: '0.85rem', fontWeight: 600 }}>
                  ⚠️ {submitError}
                </div>
              )}

              {/* Submission Instructions Box */}
              <div style={{ background: '#f8fafc', padding: '1rem 1.25rem', borderRadius: '14px', border: '1.5px solid #cbd5e1', fontSize: '0.82rem', color: '#334155', lineHeight: 1.5 }}>
                <div style={{ fontWeight: 900, color: '#0f172a', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  📋 Submission Instructions & Guidelines:
                </div>
                {competitorTrack === 'pop_science' ? (
                  <ul style={{ margin: 0, paddingLeft: '1.2rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', color: '#475569' }}>
                    <li>Provide a valid video URL (YouTube, TikTok, Instagram Reels, or Google Drive link).</li>
                    <li>If using a <strong>Google Drive link</strong>, set sharing access to <strong>"Anyone with link can view"</strong>.</li>
                    <li>Ensure scientific facts and media content comply with AIU SciComm Spark competition ethics.</li>
                  </ul>
                ) : (
                  <ul style={{ margin: 0, paddingLeft: '1.2rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', color: '#475569' }}>
                    <li>Upload your Science Journalism Article as a <strong>PDF Document (.pdf file)</strong>.</li>
                    <li>Ensure research citations, literature references, and journalistic ethics are adhered to.</li>
                  </ul>
                )}
              </div>

              {/* Submission Title */}
              <div>
                <label className="ft-label">Submission Project Title *</label>
                <input 
                  type="text" 
                  className="ft-input" 
                  required
                  placeholder={competitorTrack === 'pop_science' ? "e.g. Explaining Quantum Entanglement in 90 Seconds" : "e.g. The Future of Renewable Energy: A SciComm Investigation"}
                  value={subTitle}
                  onChange={e => setSubTitle(e.target.value)}
                  style={{ fontSize: '0.92rem', fontWeight: 700 }}
                />
              </div>

              {/* DYNAMIC MULTI-SUBMISSION DELIVERABLE FIELDS */}
              {((submitStage.submissions && submitStage.submissions.length > 0) ? submitStage.submissions : [
                competitorTrack === 'pop_science'
                  ? { id: 'sub_def_1', name: 'Submission 1: Short Pop Video URL', type: 'url', question: 'Paste your YouTube, TikTok, Instagram Reels, or Google Drive video URL:' }
                  : { id: 'sub_def_2', name: 'Submission 1: Science Article Document', type: 'file', question: 'Upload your formatted science article PDF document (.pdf):' }
              ]).map((field, idx) => {
                const currentItem = subItems[field.id] || { value: '', fileUrl: '' };

                return (
                  <div key={field.id} style={{ background: '#ffffff', padding: '1.1rem 1.25rem', borderRadius: '16px', border: '1.5px solid #cbd5e1', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                    <label className="ft-label" style={{ margin: 0, fontSize: '0.92rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.45rem', fontWeight: 800 }}>
                      <span>{field.type === 'url' ? '🔗' : field.type === 'file' ? '📄' : field.type === 'textbox' ? '📝' : '📁'}</span>
                      <span>{field.name}</span>
                    </label>
                    
                    {field.question && (
                      <div style={{ fontSize: '0.82rem', color: '#475569', fontWeight: 600 }}>
                        ❓ {field.question}
                      </div>
                    )}

                    {/* Field Inputs by Type */}
                    {(field.type === 'url' || field.type === 'link_file') && (
                      <div style={{ position: 'relative' }}>
                        <Video size={16} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--ft-primary)' }} />
                        <input
                          type="url"
                          className="ft-input"
                          style={{ paddingLeft: '2.4rem', fontSize: '0.88rem', fontWeight: 600 }}
                          placeholder="https://youtube.com/watch?v=... or https://drive.google.com/..."
                          value={currentItem.value || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setSubItems(prev => ({
                              ...prev,
                              [field.id]: { ...prev[field.id], name: field.name, type: field.type, question: field.question, value: val }
                            }));
                            if (idx === 0) setSubVideoUrl(val);
                          }}
                        />
                      </div>
                    )}

                    {(field.type === 'file' || field.type === 'link_file') && (
                      <div>
                        <input
                          type="file"
                          accept=".pdf,.doc,.docx,.mp4,.png,.jpg,.jpeg,application/pdf"
                          className="ft-input"
                          style={{ fontSize: '0.82rem', padding: '0.45rem' }}
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setPdfUploading(true);
                              try {
                                const url = await uploadFile(file, `submissions/${Date.now()}_${file.name}`);
                                setSubItems(prev => ({
                                  ...prev,
                                  [field.id]: { ...prev[field.id], name: field.name, type: field.type, question: field.question, fileUrl: url }
                                }));
                                if (idx === 0) setSubFileUrl(url);
                              } catch (err) {
                                setSubmitError('Upload failed: ' + err.message);
                              } finally {
                                setPdfUploading(false);
                              }
                            }
                          }}
                        />
                        {currentItem.fileUrl && (
                          <div style={{ marginTop: '0.35rem', fontSize: '0.8rem', color: '#047857', background: '#ecfdf5', padding: '0.35rem 0.65rem', borderRadius: '6px', border: '1px solid #a7f3d0' }}>
                            📄 File Uploaded: <a href={currentItem.fileUrl} target="_blank" rel="noreferrer" style={{ color: '#047857', fontWeight: 800, textDecoration: 'underline' }}>View File ↗</a>
                          </div>
                        )}
                      </div>
                    )}

                    {field.type === 'textbox' && (
                      <textarea
                        className="ft-textarea"
                        rows={3}
                        placeholder="Type your response / answer / notes here..."
                        value={currentItem.value || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSubItems(prev => ({
                            ...prev,
                            [field.id]: { ...prev[field.id], name: field.name, type: field.type, question: field.question, value: val }
                          }));
                          if (idx === 0) setSubArticleContent(val);
                        }}
                      />
                    )}
                  </div>
                );
              })}

              {/* Ethics & Policy Consent Checkbox */}
              <div style={{ background: '#fff1f2', padding: '0.85rem 1rem', borderRadius: '12px', border: '1.5px solid #fecdd3', display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                <input
                  type="checkbox"
                  id="policyConsentCheck"
                  required
                  checked={policyConsent}
                  onChange={e => setPolicyConsent(e.target.checked)}
                  style={{ width: '18px', height: '18px', marginTop: '0.15rem', cursor: 'pointer', accentColor: '#be123c' }}
                />
                <label htmlFor="policyConsentCheck" style={{ fontSize: '0.8rem', color: '#9f1239', fontWeight: 700, cursor: 'pointer', lineHeight: 1.4 }}>
                  I confirm that this submission is my original scientific work, adheres to official AIU SciComm Spark rules & ethics policy, and grants evaluation access to the competition judging panel. *
                </label>
              </div>

              {/* Actions Footer */}
              <div className="ft-modal-actions" style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', borderTop: '1px solid var(--ft-border)', paddingTop: '1.25rem', marginTop: '0.5rem' }}>
                <button 
                  type="button" 
                  className="ft-btn ft-btn-secondary"
                  onClick={() => setSubmitModalOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="ft-btn ft-btn-primary"
                  disabled={isSubmitting || !policyConsent}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem', opacity: policyConsent ? 1 : 0.6 }}
                >
                  <Send size={16} />
                  {isSubmitting ? 'Submitting...' : editingSubId ? 'Update Work' : 'Submit Work'}
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
