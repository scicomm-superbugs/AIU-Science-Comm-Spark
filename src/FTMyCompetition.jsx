import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from './context/AuthContext';
import { useLiveCollection, db, getCollectionName, firestore, uploadFile } from './db';
import { collection, getDocs } from 'firebase/firestore';
import { Award, Star, MessageSquare, CheckCircle, Clock, X, Send, Video, FileText, ExternalLink } from 'lucide-react';
import { DEFAULT_JUDGING_CRITERIA, calculateAveragedPoints, normalizeTrackKey, formatUnifiedDate } from './ftConstants';
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
      id: 'jour_stage_1', stageId: 1, title: 'Stage 1: Pre-Interview Preparation', sub: 'Topic Research, Profile & Interview Prep', deadline: '2026-09-01', status: 'Active Stage',
      details: 'Before the interview, each participant is required to submit a Pre-Interview Preparation document demonstrating their research, planning, and understanding of the interview topic.',
      criteria: [
        { id: 'c7', name: 'Literature Review & Citation', category: 'academic', maxPoints: 25 },
        { id: 'c8', name: 'Journalistic Angle', category: 'scicomm', maxPoints: 25 }
      ],
      submissions: [
        {
          id: 'sub_jour_1',
          name: 'Pre-Interview Preparation',
          type: 'mixed',
          deadline: '2026-09-01',
          description: 'Before the interview, each participant is required to submit a Pre-Interview Preparation document demonstrating their research, planning, and understanding of the interview topic.\n\nThe document must include:\n1. Interviewee Profile (Full name, position, affiliation, expertise, bio)\n2. Research Abstract (150-250 words)\n3. Interview Objective (Main purpose & story message)\n4. Interview Questions (8-10 open-ended questions)\n5. Audience Impact (Public relevance & expected takeaway)',
          question: 'Complete all 5 required pre-interview preparation sections below:',
          questions: [
            { id: 'q_profile', label: '1. Interviewee Profile (Full Name, Position/Affiliation, Expertise & Bio)', type: 'textbox' },
            { id: 'q_abstract', label: '2. Research Abstract (150–250 words summarizing interviewee research)', type: 'textbox' },
            { id: 'q_objective', label: '3. Interview Objective (Main purpose & story message)', type: 'textbox' },
            { id: 'q_questions', label: '4. Interview Questions (8–10 open-ended questions in logical sequence)', type: 'textbox' },
            { id: 'q_impact', label: '5. Audience Impact (Public relevance & expected takeaway)', type: 'textbox' },
            { id: 'q_pdf_doc', label: 'Upload Complete Preparation Document PDF (Optional / Attachment)', type: 'file' }
          ]
        }
      ]
    },
    {
      id: 'jour_stage_2', stageId: 2, title: 'Stage 2: Article Publication', sub: 'Simplified Science Article Publication', deadline: '2026-09-20', status: 'Upcoming Stage',
      details: 'Write a simplified science news article published on the digital platform with opportunity for magazine feature.',
      criteria: [
        { id: 'c9', name: 'Academic Fact Checking', category: 'academic', maxPoints: 25 },
        { id: 'c10', name: 'Article Readability & Style', category: 'scicomm', maxPoints: 25 }
      ],
      submissions: [
        { id: 'sub_def_5', name: 'Submission 1: Article PDF Document', type: 'file', question: 'Upload your formatted science article PDF document:' }
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

  const isAdminOrStaff = Boolean(
    user?.role === 'admin' ||
    user?.role === 'system_administrator' ||
    user?.isMasterAdmin ||
    user?.role === 'trainer' ||
    user?.role === 'academic_judge' ||
    user?.role === 'scicomm_judge' ||
    !user?.registeredTrack
  );

  const [adminSelectedTrack, setAdminSelectedTrack] = useState('pop_science');

  const actualCompetitorTrack = normalizeTrackKey(meDoc?.registeredTrack || user?.registeredTrack || myTeam?.track || user?.track) || 'pop_science';
  const competitorTrack = isAdminOrStaff ? adminSelectedTrack : actualCompetitorTrack;

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
      <div className="ft-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.25rem', marginBottom: '2rem' }}>
        <div>
          <h1 className="ft-page-title">My Competition Workspace</h1>
          <p className="ft-page-subtitle">Track your submission status, assigned judges, dynamic criteria, and scores stage-by-stage.</p>
          {user?.competitorIdNumber && (
            <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--ft-primary)', marginTop: '0.4rem', background: 'rgba(225, 29, 72, 0.05)', border: '1px solid rgba(225, 29, 72, 0.15)', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.4rem 0.8rem', borderRadius: '8px' }}>
              🎫 Competitor ID: {user.competitorIdNumber}
            </div>
          )}
        </div>

        {isAdminOrStaff && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            background: '#ffffff', padding: '0.45rem 0.75rem', borderRadius: '14px',
            border: '1.5px solid #cbd5e1', boxShadow: '0 4px 14px rgba(0,0,0,0.04)'
          }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 900, color: '#334155', padding: '0 0.3rem' }}>
              👀 Admin Track Preview:
            </span>
            <button
              type="button"
              onClick={() => setAdminSelectedTrack('pop_science')}
              style={{
                padding: '0.45rem 0.9rem', fontSize: '0.82rem', fontWeight: 800, borderRadius: '10px', border: 'none',
                background: competitorTrack === 'pop_science' ? '#be123c' : '#f1f5f9',
                color: competitorTrack === 'pop_science' ? '#ffffff' : '#64748b',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem', transition: 'all 0.2s ease'
              }}
            >
              🎙️ Pop Science Videos
            </button>
            <button
              type="button"
              onClick={() => setAdminSelectedTrack('science_journalism')}
              style={{
                padding: '0.45rem 0.9rem', fontSize: '0.82rem', fontWeight: 800, borderRadius: '10px', border: 'none',
                background: competitorTrack === 'science_journalism' ? '#2563eb' : '#f1f5f9',
                color: competitorTrack === 'science_journalism' ? '#ffffff' : '#64748b',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem', transition: 'all 0.2s ease'
              }}
            >
              📰 Science Journalism
            </button>
          </div>
        )}
      </div>

      {/* STAGE-BY-STAGE DASHBOARD CARDS — MODERN GRAPHICAL HUD */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', marginBottom: '2.5rem' }}>
        {stages.map((st) => {
          const stageSub = mySubmissions.find(s => Number(s.stageId) === Number(st.stageId));
          const stageEvals = evaluations.filter(e => Number(e.stageId) === Number(st.stageId));

          const isStageActive = Number(st.stageId) === 1 || st.status === 'Active Stage' || st.status === 'Active' || st.acceptSubmissions === true || Boolean(stageSub) || stageEvals.length > 0;

          // Deliverables configured for this stage
          const subFields = (st.submissions && st.submissions.length > 0)
            ? st.submissions
            : (competitorTrack === 'pop_science'
                ? [{ id: 'sub_def_1', name: 'Short Pop Video URL', type: 'url', deadline: st.deadline, question: 'Paste your YouTube, TikTok, Instagram Reels, or Google Drive video URL:' }]
                : [{ id: 'sub_def_2', name: 'Science Article PDF Document', type: 'file', deadline: st.deadline, question: 'Upload your formatted science article PDF document:' }]);

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
                    <span>{st.sub}</span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
                {isStageActive && subFields.map((sf, idx) => {
                  const effDeadline = sf.deadline || st.deadline;
                  const isFieldSubmitted = Boolean(stageSub) && (
                    Boolean(stageSub.submittedItems?.[sf.id]?.value) ||
                    Boolean(stageSub.submittedItems?.[sf.id]?.fileUrl) ||
                    Boolean(stageSub.videoUrl) ||
                    Boolean(stageSub.fileUrl)
                  );

                  return (
                    <button
                      key={sf.id || idx}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenSubmitModal(st, stageSub);
                      }}
                      className="ft-btn"
                      style={{
                        background: isFieldSubmitted
                          ? 'linear-gradient(135deg, #059669 0%, #047857 100%)'
                          : '#f1f5f9',
                        color: isFieldSubmitted ? '#ffffff' : '#334155',
                        fontWeight: 800,
                        padding: '0.55rem 1.15rem',
                        borderRadius: '12px',
                        fontSize: '0.85rem',
                        border: isFieldSubmitted ? 'none' : '1.5px solid #cbd5e1',
                        boxShadow: isFieldSubmitted ? '0 4px 14px rgba(5, 150, 105, 0.3)' : 'none',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.45rem',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      {isFieldSubmitted ? (
                        <>
                          <span>✅ Submitted:</span> {sf.name || `Stage ${st.stageId}`}
                        </>
                      ) : (
                        <>
                          <Send size={15} style={{ color: 'var(--ft-primary)' }} /> Submit {sf.name || `Stage ${st.stageId}`}
                        </>
                      )}
                      <span style={{
                        fontSize: '0.72rem',
                        background: isFieldSubmitted ? 'rgba(255,255,255,0.25)' : '#e2e8f0',
                        color: isFieldSubmitted ? '#ffffff' : '#475569',
                        padding: '0.15rem 0.5rem',
                        borderRadius: '6px',
                        marginLeft: '0.2rem',
                        fontWeight: 800
                      }}>
                        ⏰ {formatUnifiedDate(effDeadline)}
                      </span>
                    </button>
                  );
                })}
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
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <label className="ft-label" style={{ margin: 0, fontSize: '0.92rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.45rem', fontWeight: 800 }}>
                        <span>{field.type === 'url' ? '🔗' : field.type === 'file' ? '📄' : field.type === 'textbox' ? '📝' : '📁'}</span>
                        <span>{field.name}</span>
                      </label>
                      <span style={{ fontSize: '0.75rem', fontWeight: 800, padding: '0.2rem 0.6rem', borderRadius: '8px', background: '#fff1f2', color: '#be123c', border: '1px solid #fecdd3' }}>
                        ⏰ Deadline: {formatUnifiedDate(field.deadline || submitStage.deadline)}
                      </span>
                    </div>

                    {(field.description || field.question) && (
                      <div style={{ fontSize: '0.83rem', color: '#334155', fontWeight: 600, background: '#f8fafc', padding: '0.65rem 0.85rem', borderRadius: '10px', border: '1.5px solid #cbd5e1', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                        📝 <strong>Description & Requirements:</strong>
                        <div style={{ marginTop: '0.2rem', color: '#475569' }}>
                          {field.description || field.question}
                        </div>
                      </div>
                    )}

                    {/* RENDER MULTI-QUESTIONS IF CONFIGURED */}
                    {field.questions && field.questions.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginTop: '0.35rem', paddingTop: '0.5rem', borderTop: '1px dashed #cbd5e1' }}>
                        {field.questions.map((q, qIdx) => {
                          const qKey = `${field.id}_${q.id || qIdx}`;
                          const qVal = subItems[qKey]?.value || '';
                          const qFileUrl = subItems[qKey]?.fileUrl || '';

                          return (
                            <div key={q.id || qIdx} style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                              <label className="ft-label" style={{ margin: 0, fontSize: '0.85rem', color: '#0f172a', fontWeight: 800 }}>
                                ❓ Question {qIdx + 1}: {q.label} *
                              </label>

                              {q.type === 'short_text' && (
                                <input
                                  type="text"
                                  className="ft-input"
                                  required
                                  style={{ fontSize: '0.85rem' }}
                                  placeholder={`Enter ${q.label}...`}
                                  value={qVal}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setSubItems(prev => ({
                                      ...prev,
                                      [qKey]: { name: q.label, type: q.type, value: val }
                                    }));
                                  }}
                                />
                              )}

                              {q.type === 'textbox' && (
                                <textarea
                                  className="ft-textarea"
                                  rows={3}
                                  required
                                  style={{ fontSize: '0.85rem' }}
                                  placeholder={`Write your answer for ${q.label}...`}
                                  value={qVal}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setSubItems(prev => ({
                                      ...prev,
                                      [qKey]: { name: q.label, type: q.type, value: val }
                                    }));
                                  }}
                                />
                              )}

                              {q.type === 'url' && (
                                <div style={{ position: 'relative' }}>
                                  <Video size={16} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--ft-primary)' }} />
                                  <input
                                    type="url"
                                    className="ft-input"
                                    required
                                    style={{ paddingLeft: '2.4rem', fontSize: '0.85rem' }}
                                    placeholder="https://..."
                                    value={qVal}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setSubItems(prev => ({
                                        ...prev,
                                        [qKey]: { name: q.label, type: q.type, value: val }
                                      }));
                                    }}
                                  />
                                </div>
                              )}

                              {q.type === 'file' && (
                                <div>
                                  <input
                                    type="file"
                                    accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
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
                                            [qKey]: { name: q.label, type: q.type, value: file.name, fileUrl: url }
                                          }));
                                        } catch (err) {
                                          setSubmitError('Upload failed: ' + err.message);
                                        } finally {
                                          setPdfUploading(false);
                                        }
                                      }
                                    }}
                                  />
                                  {qFileUrl && (
                                    <div style={{ marginTop: '0.3rem', fontSize: '0.78rem', color: '#047857', fontWeight: 700 }}>
                                      📄 File uploaded successfully!
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      /* SINGLE QUESTION / SINGLE INPUT FALLBACK */
                      <>
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
                      </>
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
