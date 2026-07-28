import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from './context/AuthContext';
import { useLiveCollection, db, getCollectionName, firestore, uploadFile } from './db';
import { collection, getDocs } from 'firebase/firestore';
import { Award, Star, MessageSquare, CheckCircle, Clock, X, Send, Video, FileText, ExternalLink } from 'lucide-react';
import { DEFAULT_JUDGING_CRITERIA, calculateAveragedPoints, normalizeTrackKey, formatUnifiedDate, renderFormattedDescription } from './ftConstants';
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
          type: 'url',
          deadline: '2026-09-01',
          description: 'Before the interview, each participant is required to submit a Pre-Interview Preparation document via Google Form demonstrating their research, planning, and understanding of the interview topic.',
          googleFormUrl: 'https://forms.gle/tzgEf9QxBj3nG43S9'
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
  const liveEvaluations = useLiveCollection('ft_evaluations') || [];
  const timelineConfig = useLiveCollection('timeline_config') || [];
  const publishedResults = useLiveCollection('published_results') || [];
  const scientists = useLiveCollection('scientists') || [];
  const teams = useLiveCollection('ft_teams') || [];
  const submissions = useLiveCollection('submissions') || [];

  const meDoc = scientists.find(s => s.id === user?.id || s.email === user?.email || s.username === user?.username) || user;
  const myTeam = teams.find(t => (t.members || []).some(m => m.userId === user?.id || m.userId === meDoc?.id));

  const myIdentifiers = useMemo(() => {
    return [
      user?.id,
      user?.email,
      user?.username,
      meDoc?.id,
      meDoc?.code,
      meDoc?.competitorCode,
      myTeam?.id,
      myTeam?.code
    ].filter(Boolean);
  }, [user, meDoc, myTeam]);

  const myEvaluations = useMemo(() => {
    return liveEvaluations.filter(e => {
      if (!e) return false;
      return myIdentifiers.some(id =>
        id === e.targetId ||
        id === e.competitorId ||
        id === e.teamId ||
        id === e.competitorCode
      );
    });
  }, [liveEvaluations, myIdentifiers]);

  const [overviewModalData, setOverviewModalData] = useState(null);

  const isAdminOrStaff = Boolean(
    !user?.isImpersonating && (
      user?.role === 'admin' ||
      user?.role === 'system_administrator' ||
      user?.isMasterAdmin ||
      user?.role === 'trainer' ||
      user?.role === 'academic_judge' ||
      user?.role === 'scicomm_judge' ||
      !user?.registeredTrack
    )
  );

  const [adminSelectedTrack, setAdminSelectedTrack] = useState('all');

  const actualCompetitorTrack = normalizeTrackKey(user?.registeredTrack || meDoc?.registeredTrack || myTeam?.track || user?.track) || 'pop_science';
  const competitorTrack = isAdminOrStaff ? adminSelectedTrack : actualCompetitorTrack;

  const rawStages = competitorTrack === 'all'
    ? [
        ...DEFAULT_STAGES.pop_science.map(st => ({ ...st, trackKey: 'pop_science', trackLabel: 'Pop Science Videos 🎥' })),
        ...DEFAULT_STAGES.science_journalism.map(st => ({ ...st, trackKey: 'science_journalism', trackLabel: 'Science Journalism 📰' }))
      ]
    : (DEFAULT_STAGES[competitorTrack] || DEFAULT_STAGES.pop_science).map(st => ({ ...st, trackKey: competitorTrack }));

  const getStageData = (stObj) => {
    const tKey = stObj.trackKey || competitorTrack;
    const found = timelineConfig.find(c => c.track === tKey && Number(c.stageId) === Number(stObj.stageId));
    return found ? { assignedJudgeIds: [], ...stObj, ...found } : { assignedJudgeIds: [], ...stObj };
  };

  const stages = rawStages.map(st => getStageData(st));
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
  const [submitFieldId, setSubmitFieldId] = useState(null);
  const [virtualBrowserForm, setVirtualBrowserForm] = useState(null);
  const [iframeLoadCount, setIframeLoadCount] = useState(0);
  const [confirmCloseModal, setConfirmCloseModal] = useState(false);

  useEffect(() => {
    if (virtualBrowserForm) {
      setIframeLoadCount(0);
    }
  }, [virtualBrowserForm]);

  const getEmbedUrl = (rawUrl) => {
    if (!rawUrl) return 'https://docs.google.com/forms/d/e/1FAIpQLSfbgcAi8mYiNdlWsIbzj8jgxOCFIrrwl1l-6b3akaZ9Dd2XDg/viewform?embedded=true';
    let url = rawUrl.trim();
    if (url.includes('forms.gle/tzgEf9QxBj3nG43S9')) {
      return 'https://docs.google.com/forms/d/e/1FAIpQLSfbgcAi8mYiNdlWsIbzj8jgxOCFIrrwl1l-6b3akaZ9Dd2XDg/viewform?embedded=true';
    }
    if (url.includes('/viewform') && !url.includes('embedded=true')) {
      url += (url.includes('?') ? '&' : '?') + 'embedded=true';
    }
    return url;
  };

  const handleMarkGoogleFormSubmitted = async (stage, field) => {
    try {
      const fieldId = field?.id || 'sub_def_1';
      const existingSub = mySubmissions.find(s => Number(s.stageId) === Number(stage.stageId));

      const updatedItems = {
        ...(existingSub?.submittedItems || {}),
        [fieldId]: {
          name: field?.name || `Submission ${stage.stageId}`,
          type: 'url',
          value: field?.googleFormUrl || stage?.googleFormUrl || 'Google Form Completed',
          submittedAt: new Date().toISOString()
        }
      };

      const data = {
        competitorId: user?.id || 'guest',
        competitorName: user?.name || user?.username || 'Competitor',
        competitorEmail: user?.email || '',
        teamName: user?.teamName || '',
        track: competitorTrack,
        stageId: Number(stage.stageId),
        title: `${field?.name || stage.title} (Google Form)`,
        submittedItems: updatedItems,
        status: 'pending',
        submittedAt: new Date().toISOString()
      };

      if (existingSub) {
        await db.submissions.update(existingSub.id, data);
      } else {
        await db.submissions.add(data);
      }

      // Trigger Admin Notification for New Submission
      try {
        await db.ft_notifications.add({
          targetRoles: ['admin', 'master'],
          type: 'submission',
          title: `📤 New Project Submission Received`,
          message: `${user?.name || 'Competitor'} submitted project deliverable for Stage ${stageId}.`,
          link: '/dashboard/evaluations',
          createdAt: new Date().toISOString(),
          status: 'unread'
        });
      } catch (nErr) {
        console.warn('Failed to send admin submission notification:', nErr);
      }
    } catch (err) {
      console.error('Failed to log submission:', err);
    }
  };

  const handleOpenSubmitModal = (stage, existingSub = null, targetFieldId = null) => {
    setSubmitStage(stage);
    setSubmitFieldId(targetFieldId);
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
            display: 'flex', alignItems: 'center', gap: '0.4rem',
            background: '#ffffff', padding: '0.45rem 0.75rem', borderRadius: '16px',
            border: '1.5px solid #cbd5e1', boxShadow: '0 4px 14px rgba(0,0,0,0.05)', flexWrap: 'wrap'
          }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 900, color: '#0f172a', padding: '0 0.25rem' }}>
              🎯 Track Filter:
            </span>
            <button
              type="button"
              onClick={() => setAdminSelectedTrack('all')}
              style={{
                padding: '0.45rem 0.85rem', fontSize: '0.82rem', fontWeight: 800, borderRadius: '10px', border: 'none',
                background: adminSelectedTrack === 'all' ? '#0f172a' : '#f1f5f9',
                color: adminSelectedTrack === 'all' ? '#ffffff' : '#64748b',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem', transition: 'all 0.2s ease'
              }}
            >
              🌐 All Tracks
            </button>
            <button
              type="button"
              onClick={() => setAdminSelectedTrack('pop_science')}
              style={{
                padding: '0.45rem 0.85rem', fontSize: '0.82rem', fontWeight: 800, borderRadius: '10px', border: 'none',
                background: adminSelectedTrack === 'pop_science' ? '#be123c' : '#f1f5f9',
                color: adminSelectedTrack === 'pop_science' ? '#ffffff' : '#64748b',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem', transition: 'all 0.2s ease'
              }}
            >
              🎙️ Pop Science
            </button>
            <button
              type="button"
              onClick={() => setAdminSelectedTrack('science_journalism')}
              style={{
                padding: '0.45rem 0.85rem', fontSize: '0.82rem', fontWeight: 800, borderRadius: '10px', border: 'none',
                background: adminSelectedTrack === 'science_journalism' ? '#2563eb' : '#f1f5f9',
                color: adminSelectedTrack === 'science_journalism' ? '#ffffff' : '#64748b',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem', transition: 'all 0.2s ease'
              }}
            >
              📰 Journalism
            </button>
          </div>
        )}
      </div>

      {/* STAGE-BY-STAGE DASHBOARD CARDS — MODERN GRAPHICAL HUD */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', marginBottom: '2.5rem' }}>
        {stages.map((st) => {
          const stageSub = mySubmissions.find(s => Number(s.stageId) === Number(st.stageId));
          const stageEvals = myEvaluations.filter(e => Number(e.stageId) === Number(st.stageId));

          // Check if custom timeline config exists for this stage
          const customStageDoc = timelineConfig.find(c => c.track === (st.trackKey || competitorTrack) && Number(c.stageId) === Number(st.stageId));

          // Real deliverables configured by admin for this stage
          const hasCustomSubs = Boolean(customStageDoc && Array.isArray(customStageDoc.submissions));
          const subFields = (customStageDoc?.submissions && customStageDoc.submissions.length > 0)
            ? customStageDoc.submissions
            : (st.submissions && st.submissions.length > 0)
              ? st.submissions
              : (hasCustomSubs ? [] : (Number(st.stageId) === 1
                  ? (competitorTrack === 'pop_science'
                      ? [{ id: 'sub_def_1', name: 'Short Pop Video URL', type: 'url', deadline: st.deadline, question: 'Paste your YouTube, TikTok, Instagram Reels, or Google Drive video URL:' }]
                      : [{ id: 'sub_def_2', name: 'Science Article PDF Document', type: 'file', deadline: st.deadline, question: 'Upload your formatted science article PDF document:' }])
                  : []));

          const isStageActive = subFields.length > 0 && st.acceptSubmissions !== false && (
            Number(st.stageId) === 1 || st.status === 'Active Stage' || st.status === 'Active' || st.acceptSubmissions === true || Boolean(stageSub) || stageEvals.length > 0
          );

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

                  const fieldEvals = myEvaluations.filter(e => {
                    const stageMatch = Number(e.stageId) === Number(st.stageId);
                    const subMatch = !e.submissionId || e.submissionId === sf.id || String(e.submissionId) === String(sf.id) || !e.fieldId || String(e.fieldId) === String(sf.id);
                    return stageMatch && subMatch;
                  });

                  const isEvaluated = fieldEvals.length > 0;
                  const totalScore = fieldEvals.reduce((sum, e) => sum + Number(e.score || 0), 0);

                  // Submission window check
                  const now = new Date();
                  const todayStr = now.toISOString().slice(0, 10);
                  const hasOpenDate = Boolean(sf.openDate);
                  const hasCloseDate = Boolean(effDeadline);
                  const isBeforeOpen = hasOpenDate && todayStr < sf.openDate;
                  const isAfterClose = hasCloseDate && todayStr > effDeadline;
                  const isWindowBlocked = (isBeforeOpen || isAfterClose) && !isAdminOrStaff;
                  const isManuallyClosed = sf.isOpen === false;
                  const isDisabled = (isManuallyClosed || isWindowBlocked) && !isFieldSubmitted && !isEvaluated;

                  // Days until open
                  const daysUntilOpen = isBeforeOpen ? Math.ceil((new Date(sf.openDate) - now) / 86400000) : 0;

                  // Published status check for this submission
                  const pubDoc = publishedResults.find(p => {
                    const stageMatch = Number(p.stageId) === Number(st.stageId);
                    const subMatch = p.subId === sf.id || p.subId === 'all' || !p.subId;
                    return stageMatch && subMatch && p.isPublished === true;
                  });
                  const isSubPublished = Boolean(pubDoc) || isAdminOrStaff;
                  const isShowEvaluated = isEvaluated && isSubPublished;
                  const isShowUnderEvaluation = (isFieldSubmitted || isEvaluated) && !isShowEvaluated;

                  return (
                    <button
                      key={sf.id || idx}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isFieldSubmitted || isEvaluated) {
                          setOverviewModalData({
                            stage: st,
                            field: sf,
                            fieldEvals,
                            totalScore,
                            stageSub,
                            isStagePublished: isSubPublished
                          });
                          return;
                        }
                        if (isDisabled) return;
                        const targetUrl = sf.googleFormUrl || st.googleFormUrl || 'https://forms.gle/tzgEf9QxBj3nG43S9';
                        setVirtualBrowserForm({
                          stage: st,
                          field: sf,
                          rawUrl: targetUrl
                        });
                      }}
                      className="ft-btn"
                      disabled={isDisabled}
                      style={{
                        background: isShowEvaluated
                          ? 'linear-gradient(135deg, #059669 0%, #047857 100%)'
                          : isShowUnderEvaluation
                            ? 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)'
                            : isDisabled
                              ? isBeforeOpen ? '#fffbeb' : '#fff1f2'
                              : 'linear-gradient(135deg, #e11d48 0%, #be123c 100%)',
                        color: (isShowEvaluated || isShowUnderEvaluation || !isDisabled) ? '#ffffff' : (isBeforeOpen ? '#92400e' : '#be123c'),
                        fontWeight: 800,
                        padding: '0.55rem 1.15rem',
                        borderRadius: '12px',
                        fontSize: '0.85rem',
                        border: (isShowEvaluated || isShowUnderEvaluation || !isDisabled)
                          ? 'none'
                          : (isBeforeOpen ? '1.5px solid #fde68a' : '1.5px solid #fecdd3'),
                        boxShadow: isShowEvaluated
                          ? '0 4px 14px rgba(5, 150, 105, 0.3)'
                          : isShowUnderEvaluation
                            ? '0 4px 14px rgba(2, 132, 199, 0.3)'
                            : isDisabled
                              ? 'none'
                              : '0 4px 14px rgba(225, 29, 72, 0.35)',
                        cursor: isDisabled ? 'not-allowed' : 'pointer',
                        opacity: isDisabled ? 0.9 : 1,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.45rem',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      {isManuallyClosed ? (
                        <>
                          <span>🛑 Closed:</span> {sf.name || `Stage ${st.stageId}`}
                        </>
                      ) : isBeforeOpen && !isAdminOrStaff ? (
                        <>
                          <span>⏳ Opens in {daysUntilOpen}d:</span> {sf.name || `Stage ${st.stageId}`}
                        </>
                      ) : isAfterClose && !isAdminOrStaff ? (
                        <>
                          <span>🛑 Window Closed:</span> {sf.name || `Stage ${st.stageId}`}
                        </>
                      ) : isShowEvaluated ? (
                        <>
                          <span>⭐ Evaluated:</span> {sf.name || `Stage ${st.stageId}`} ↗
                        </>
                      ) : isShowUnderEvaluation ? (
                        <>
                          <span>⏳ Under Evaluation:</span> {sf.name || `Stage ${st.stageId}`} ↗
                        </>
                      ) : (
                        <>
                          <Send size={15} style={{ color: '#ffffff' }} /> Submit {sf.name || `Stage ${st.stageId}`}
                        </>
                      )}
                      <span style={{
                        fontSize: '0.72rem',
                        background: (isShowEvaluated || isShowUnderEvaluation || !isDisabled) ? 'rgba(255,255,255,0.22)' : (isBeforeOpen ? 'rgba(146,64,14,0.1)' : 'rgba(190,18,60,0.1)'),
                        color: (isShowEvaluated || isShowUnderEvaluation || !isDisabled) ? '#ffffff' : (isBeforeOpen ? '#92400e' : '#be123c'),
                        padding: '0.15rem 0.5rem',
                        borderRadius: '6px',
                        marginLeft: '0.2rem',
                        fontWeight: 800
                      }}>
                        {sf.openDate ? `📅 ${formatUnifiedDate(sf.openDate)} → ${formatUnifiedDate(effDeadline)}` : `⏰ ${formatUnifiedDate(effDeadline)}`}
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
              ]).filter(field => !submitFieldId || field.id === submitFieldId).map((field, idx) => {
                const currentItem = subItems[field.id] || { value: '', fileUrl: '' };

                // Window status check for this field in modal
                const nowModal = new Date();
                const todayModal = nowModal.toISOString().slice(0, 10);
                const fieldOpenDate = field.openDate;
                const fieldCloseDate = field.deadline || submitStage.deadline;
                const fieldBeforeOpen = Boolean(fieldOpenDate) && todayModal < fieldOpenDate;
                const fieldAfterClose = Boolean(fieldCloseDate) && todayModal > fieldCloseDate;
                const fieldWindowBlocked = (fieldBeforeOpen || fieldAfterClose) && !isAdminOrStaff;
                const fieldManuallyClosed = field.isOpen === false;
                const fieldIsLocked = fieldManuallyClosed || fieldWindowBlocked;
                const daysUntilFieldOpen = fieldBeforeOpen ? Math.ceil((new Date(fieldOpenDate) - nowModal) / 86400000) : 0;

                return (
                  <div key={field.id} style={{ background: fieldIsLocked ? (fieldBeforeOpen ? '#fffbeb' : '#fef2f2') : '#ffffff', padding: '1.1rem 1.25rem', borderRadius: '16px', border: fieldIsLocked ? (fieldBeforeOpen ? '1.5px solid #fde68a' : '1.5px solid #fecdd3') : '1.5px solid #cbd5e1', display: 'flex', flexDirection: 'column', gap: '0.65rem', opacity: fieldIsLocked ? 0.75 : 1 }}>
                    {fieldManuallyClosed && (
                      <div style={{ padding: '0.65rem 1rem', borderRadius: '10px', background: '#fff1f2', color: '#be123c', fontSize: '0.85rem', fontWeight: 800, border: '1.5px solid #fecdd3', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        🛑 Submissions for this deliverable are currently <strong>closed</strong> by the competition administrators.
                      </div>
                    )}
                    {!fieldManuallyClosed && fieldBeforeOpen && !isAdminOrStaff && (
                      <div style={{ padding: '0.65rem 1rem', borderRadius: '10px', background: '#fffbeb', color: '#92400e', fontSize: '0.85rem', fontWeight: 800, border: '1.5px solid #fde68a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        ⏳ Submission window has not opened yet. Opens on <strong>{formatUnifiedDate(fieldOpenDate)}</strong> ({daysUntilFieldOpen} day{daysUntilFieldOpen !== 1 ? 's' : ''} remaining).
                      </div>
                    )}
                    {!fieldManuallyClosed && fieldAfterClose && !isAdminOrStaff && (
                      <div style={{ padding: '0.65rem 1rem', borderRadius: '10px', background: '#fff1f2', color: '#be123c', fontSize: '0.85rem', fontWeight: 800, border: '1.5px solid #fecdd3', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        🛑 Submission window has ended. The deadline was <strong>{formatUnifiedDate(fieldCloseDate)}</strong>. No new submissions are accepted.
                      </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <label className="ft-label" style={{ margin: 0, fontSize: '0.92rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.45rem', fontWeight: 800 }}>
                        <span>{field.type === 'url' ? '🔗' : field.type === 'file' ? '📄' : field.type === 'textbox' ? '📝' : '📁'}</span>
                        <span>{field.name}</span>
                      </label>
                      <span style={{ fontSize: '0.75rem', fontWeight: 800, padding: '0.2rem 0.6rem', borderRadius: '8px', background: '#fff1f2', color: '#be123c', border: '1px solid #fecdd3' }}>
                        {field.openDate
                          ? `📅 ${formatUnifiedDate(field.openDate)} → ${formatUnifiedDate(field.deadline || submitStage.deadline)}`
                          : `⏰ Deadline: ${formatUnifiedDate(field.deadline || submitStage.deadline)}`}
                      </span>
                    </div>

                    {(field.description || field.question) && (
                      <div style={{ fontSize: '0.83rem', color: '#334155', fontWeight: 600, background: '#f8fafc', padding: '0.75rem 1rem', borderRadius: '12px', border: '1.5px solid #cbd5e1', lineHeight: 1.5 }}>
                        <div style={{ fontWeight: 900, color: '#0f172a', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          📋 <strong>Description & Requirements:</strong>
                        </div>
                        <div style={{ color: '#475569' }}>
                          {renderFormattedDescription(field.description || field.question)}
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
                            <div key={q.id || qIdx} style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', background: '#f8fafc', padding: '0.85rem 1rem', borderRadius: '14px', border: '1.5px solid #cbd5e1' }}>
                              <label className="ft-label" style={{ margin: 0, fontSize: '0.9rem', color: '#0f172a', fontWeight: 900 }}>
                                ❓ {q.label} *
                              </label>

                              {q.description && (
                                <div style={{ fontSize: '0.82rem', color: '#475569', lineHeight: 1.5, background: '#ffffff', padding: '0.6rem 0.85rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                                  {renderFormattedDescription(q.description)}
                                </div>
                              )}

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
                  disabled={isSubmitting || !policyConsent || (() => {
                    const allFields = ((submitStage.submissions && submitStage.submissions.length > 0) ? submitStage.submissions : []).filter(f => !submitFieldId || f.id === submitFieldId);
                    const nowCheck = new Date().toISOString().slice(0, 10);
                    return !isAdminOrStaff && allFields.some(f => f.isOpen === false || (f.openDate && nowCheck < f.openDate) || ((f.deadline || submitStage.deadline) && nowCheck > (f.deadline || submitStage.deadline)));
                  })()}
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

      {/* VIRTUAL BROWSER GOOGLE FORM EMBEDDED MODAL */}
      {virtualBrowserForm && createPortal(
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, padding: '1rem' }} onClick={() => setConfirmCloseModal(true)}>
          <div className="ft-card ft-animate-in" style={{ width: '95vw', maxWidth: '1100px', height: '92vh', background: '#ffffff', borderRadius: '24px', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.4)', border: '1px solid #cbd5e1', position: 'relative' }} onClick={e => e.stopPropagation()}>
            
            {/* Top Control Bar Above Iframe (Non-overlapping) */}
            <div style={{
              padding: '0.7rem 1.25rem', background: '#0f172a', color: '#ffffff',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              gap: '1rem', borderBottom: '1.5px solid #1e293b', flexShrink: 0, zIndex: 30
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.84rem', fontWeight: 800, color: '#cbd5e1' }}>
                <span style={{ fontSize: '1rem' }}>💡</span>
                <span>After submitting form below, click to complete →</span>
              </div>

              <button
                type="button"
                onClick={() => setConfirmCloseModal(true)}
                style={{
                  background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                  color: '#ffffff', border: 'none',
                  padding: '0.5rem 1.15rem', borderRadius: '10px', fontWeight: 900,
                  fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center',
                  gap: '0.45rem', boxShadow: '0 4px 14px rgba(37,99,235,0.35)',
                  transition: 'transform 0.15s ease'
                }}
                title="Click to complete & save submission"
              >
                <span>💾 Save & Close</span>
                <span style={{ background: 'rgba(255,255,255,0.25)', borderRadius: '50%', width: '20px', height: '20px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.78rem' }}>✕</span>
              </button>
            </div>

            {/* Embedded Iframe Container */}
            <div style={{ flex: 1, position: 'relative', width: '100%', height: '100%', background: '#ffffff', overflow: 'hidden' }}>
              <iframe
                src={getEmbedUrl(virtualBrowserForm.rawUrl)}
                title="Google Form View"
                style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* COMPETITOR SMART EXIT CONFIRMATION DIALOG */}
      {confirmCloseModal && virtualBrowserForm && createPortal(
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100000, padding: '1rem' }} onClick={() => setConfirmCloseModal(false)}>
          <div className="ft-card ft-animate-in" style={{ background: '#ffffff', padding: '1.75rem', borderRadius: '20px', maxWidth: '440px', width: '100%', textAlign: 'center', boxShadow: '0 20px 40px rgba(0,0,0,0.25)' }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📝</div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0f172a', margin: '0 0 0.5rem 0' }}>
              Did you finish your submission?
            </h3>
            <p style={{ fontSize: '0.88rem', color: '#475569', lineHeight: 1.5, margin: '0 0 1.5rem 0' }}>
              If you have completed and sent your submission, mark it as completed to set your status to Under Evaluation.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="ft-btn"
                onClick={() => {
                  setConfirmCloseModal(false);
                  setVirtualBrowserForm(null);
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
                  await handleMarkGoogleFormSubmitted(virtualBrowserForm.stage, virtualBrowserForm.field);
                  setVirtualBrowserForm(null);
                }}
                style={{ background: 'linear-gradient(135deg, #059669 0%, #047857 100%)', color: '#ffffff', border: 'none', fontWeight: 900, padding: '0.65rem 1.1rem', borderRadius: '12px', boxShadow: '0 4px 14px rgba(5,150,105,0.3)' }}
              >
                ✅ Yes, Mark Submitted
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* COMPETITOR EVALUATION OVERVIEW MODAL */}
      {overviewModalData && createPortal(
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100000, padding: '1.25rem' }}
          onClick={() => setOverviewModalData(null)}
        >
          <div
            className="ft-card ft-animate-in"
            style={{ background: '#ffffff', padding: '1.85rem 2rem', borderRadius: '24px', maxWidth: '560px', width: '100%', maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 25px 50px rgba(0,0,0,0.3)', border: '1.5px solid #cbd5e1', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #f1f5f9', paddingBottom: '1rem' }}>
              <div>
                <div style={{ fontSize: '0.8rem', fontWeight: 900, color: '#be123c', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  🏆 Stage {overviewModalData.stage.stageId} Evaluation Overview
                </div>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 900, color: '#0f172a', margin: '0.2rem 0 0 0', fontFamily: "'Outfit', sans-serif" }}>
                  {overviewModalData.field.name}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setOverviewModalData(null)}
                style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', fontSize: '1rem', fontWeight: 900, color: '#64748b' }}
              >
                ✕
              </button>
            </div>

            {(() => {
              const livePubDoc = publishedResults.find(p => {
                const stageMatch = Number(p.stageId) === Number(overviewModalData.stage.stageId);
                const subMatch = p.subId === overviewModalData.field.id || p.subId === 'all' || !p.subId;
                return stageMatch && subMatch && p.isPublished === true;
              });
              const isPublished = Boolean(livePubDoc) || overviewModalData.isStagePublished;
              return !isPublished && !isAdminOrStaff;
            })() ? (
              <div style={{ background: '#fff1f2', padding: '1.65rem 1.5rem', borderRadius: '20px', border: '1.5px solid #fecdd3', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.65rem' }}>
                <div style={{ fontSize: '2.8rem', lineHeight: 1 }}>🔒</div>
                <h4 style={{ fontSize: '1.15rem', fontWeight: 900, color: '#9f1239', margin: 0, fontFamily: "'Outfit', sans-serif" }}>
                  Stage {overviewModalData.stage.stageId} Evaluation Results Pending Publication
                </h4>
                <p style={{ fontSize: '0.86rem', color: '#881337', lineHeight: 1.55, margin: 0, maxWidth: '420px' }}>
                  Evaluation scores and judge feedback for Stage {overviewModalData.stage.stageId} are currently under review by the judging panel and admin team.
                </p>
                <div style={{ background: '#ffffff', padding: '0.4rem 0.95rem', borderRadius: '12px', border: '1px solid #fecdd3', fontWeight: 800, fontSize: '0.8rem', color: '#be123c', marginTop: '0.25rem', boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
                  ⏳ Final scores & judge comments will be released once officially published by the Admin.
                </div>
              </div>
            ) : (
              <>
                {/* Grade Summary Box */}
                <div style={{ background: overviewModalData.fieldEvals.length > 0 ? '#f0fdf4' : '#fffbeb', padding: '1.25rem', borderRadius: '16px', border: overviewModalData.fieldEvals.length > 0 ? '1.5px solid #86efac' : '1.5px solid #fde68a', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
                  <div>
                    <div style={{ fontSize: '0.78rem', fontWeight: 900, color: overviewModalData.fieldEvals.length > 0 ? '#166534' : '#92400e', textTransform: 'uppercase' }}>
                      {overviewModalData.fieldEvals.length > 0 ? '✅ Final Grade Awarded' : '⏳ Status'}
                    </div>
                    <div style={{ fontSize: '1.6rem', fontWeight: 900, color: overviewModalData.fieldEvals.length > 0 ? '#15803d' : '#b45309', margin: '0.1rem 0 0 0' }}>
                      {overviewModalData.fieldEvals.length > 0 ? `${overviewModalData.totalScore} pts` : 'Under Evaluation'}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 800, padding: '0.35rem 0.85rem', borderRadius: '20px', background: overviewModalData.fieldEvals.length > 0 ? '#dcfce7' : '#fef3c7', color: overviewModalData.fieldEvals.length > 0 ? '#15803d' : '#92400e', border: overviewModalData.fieldEvals.length > 0 ? '1px solid #86efac' : '1px solid #fde68a' }}>
                      {overviewModalData.fieldEvals.length > 0 ? 'Graded & Verified' : 'In Review by Judges'}
                    </span>
                  </div>
                </div>

                {/* Judge Feedback Comments Section */}
                <div>
                  <div style={{ fontSize: '0.92rem', fontWeight: 900, color: '#0f172a', marginBottom: '0.65rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span>💬</span> Judge Comments & Evaluation Feedback:
                  </div>

                  {overviewModalData.fieldEvals.length === 0 ? (
                    <div style={{ padding: '1rem 1.25rem', background: '#f8fafc', borderRadius: '14px', border: '1px dashed #cbd5e1', color: '#64748b', fontSize: '0.85rem', fontStyle: 'italic', textAlign: 'center' }}>
                      There are no comments or evaluation scores recorded yet. Your submission is currently under review.
                    </div>
                  ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {overviewModalData.fieldEvals.map((ev, idx) => {
                    const hasComment = Boolean(ev.comments && ev.comments.trim());
                    return (
                      <div key={ev.id || idx} style={{ background: '#f8fafc', padding: '1rem 1.15rem', borderRadius: '14px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: 900, color: '#0f172a' }}>
                            👨‍⚖️ {ev.judgeName || 'Official Panel Judge'}
                          </span>
                          <span style={{ fontSize: '0.82rem', fontWeight: 900, color: '#be123c', background: '#fff1f2', padding: '0.2rem 0.6rem', borderRadius: '8px', border: '1px solid #fecdd3' }}>
                            {ev.score !== undefined ? `${ev.score} pts` : 'No score'}
                          </span>
                        </div>

                        <div style={{ fontSize: '0.85rem', color: hasComment ? '#334155' : '#94a3b8', fontStyle: hasComment ? 'normal' : 'italic', background: '#ffffff', padding: '0.65rem 0.85rem', borderRadius: '10px', border: '1px solid #cbd5e1', lineHeight: 1.45 }}>
                          {hasComment ? `"${ev.comments.trim()}"` : 'There are no comments provided for this evaluation entry.'}
                        </div>

                        {ev.evaluatedAt && (
                          <div style={{ fontSize: '0.72rem', color: '#94a3b8', textAlign: 'right' }}>
                            🕒 {new Date(ev.evaluatedAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            </>
            )}

            {/* Modal Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '0.5rem', borderTop: '1px solid #f1f5f9' }}>
              <button
                type="button"
                className="ft-btn ft-btn-primary"
                onClick={() => setOverviewModalData(null)}
                style={{ padding: '0.6rem 1.4rem', borderRadius: '12px', fontWeight: 800 }}
              >
                Close Overview
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
