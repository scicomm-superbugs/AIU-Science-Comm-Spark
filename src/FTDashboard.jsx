import { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Video, Newspaper, Calendar, Clock, ArrowRight, Award, CheckCircle2, Play, BookOpen, Layers, GitCommit, Zap, Mic, Users, Globe, Mail, ChevronRight, FileText, Check, Radio, ExternalLink, Pencil, Upload, X } from 'lucide-react';
import { useAuth } from './context/AuthContext';
import { db, useLiveCollection } from './db';
import { COMPETITION_TRACKS, DEFAULT_JUDGING_CRITERIA, normalizeTrackKey, formatUnifiedDate, getCleanAcademicTitle } from './ftConstants';
import { CanvaTransformBox, EditableLogo } from './Landing';
import WorkshopManager from './WorkshopManager';
import './scicommspark.css';

export default function FTDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const settingsCollection = useLiveCollection('ft_settings');
  const settingsData = settingsCollection?.[0] || {};
  const customConfig = useLiveCollection('timeline_config') || [];
  const scientists = useLiveCollection('scientists') || [];
  const dynamicWorkshops = useLiveCollection('workshops') || [];
  const liveEvaluations = useLiveCollection('ft_evaluations') || [];
  const publishedResults = useLiveCollection('published_results') || [];

  const isAdmin = ['admin', 'master'].includes(user?.role);
  const [editingPoster, setEditingPoster] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const savePosterSetting = async (updates) => {
    try {
      const merged = { ...settingsData, ...updates, updatedAt: new Date().toISOString() };
      await db.ft_settings.set(merged);
    } catch (err) {
      console.error('Error saving poster transform settings:', err);
    }
  };
  
  // Find competitor doc & lock track
  const meDoc = useMemo(() => scientists.find(s => s.id === user?.id || s.username === user?.username) || user, [scientists, user]);
  
  // Find Abdullah Amr Maged's account dynamically from scientists
  const abdullahAccount = useMemo(() => {
    if (!scientists || scientists.length === 0) return null;
    return scientists.find(s => 
      (s.email && s.email.toLowerCase().includes('abdullah')) ||
      (s.username && s.username.toLowerCase().includes('abdullah')) ||
      (s.name && s.name.toLowerCase().includes('abdullah')) ||
      s.role === 'master'
    ) || null;
  }, [scientists]);

  const isCompetitorUser = user?.isImpersonating || !user || user.role === 'competitor' || user.role === 'user';
  const userTrack = normalizeTrackKey(user?.registeredTrack || meDoc?.registeredTrack || user?.track) || 'pop_science';

  const [selectedTrack, setSelectedTrack] = useState(isCompetitorUser ? userTrack : 'pop_science');
  const [selectedStepId, setSelectedStepId] = useState(1);
  const [openMobileCardId, setOpenMobileCardId] = useState(null);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Sync track when competitor doc loads
  useEffect(() => {
    if (isCompetitorUser && userTrack) {
      setSelectedTrack(userTrack);
    }
  }, [isCompetitorUser, userTrack]);

  // Sequential Stages per Track
  const defaultStages = {
    pop_science: [
      {
        id: 1,
        type: 'stage',
        title: 'Stage 1: Short Pop Video',
        badge: 'Active Stage',
        sub: 'Reels / TikTok Video (max 90 seconds)',
        deadline: '2026-09-01',
        icon: <Video size={22} />,
        color: '#d97706',
        bgColor: '#fffbeb',
        details: 'Produce a punchy, highly engaging short video introducing a core scientific concept for social media.'
      },
      {
        id: 2,
        type: 'stage',
        title: 'Stage 2: Long Pop Video',
        badge: 'Next Milestone',
        sub: 'YouTube SciComm Video (up to 3 minutes)',
        deadline: '2026-09-20',
        icon: <Play size={22} />,
        color: '#d97706',
        bgColor: '#fffbeb',
        details: 'Deep scientific storytelling featuring comprehensive explanation, visual graphics, and clear narration.'
      },
      {
        id: 3,
        type: 'stage',
        title: 'Stage 3 (Finals): Live Stage Show',
        badge: 'Grand Finale',
        sub: 'Interactive Live Presentation (5 mins on stage)',
        deadline: '2026-10-10',
        icon: <Award size={24} />,
        color: '#d97706',
        bgColor: '#fffbeb',
        details: 'Deliver an interactive live science presentation on stage before expert judges, audience, and broadcast.'
      }
    ],
    science_journalism: [
      {
        id: 1,
        type: 'stage',
        title: 'Stage 1: Research Field Prep',
        badge: 'Active Stage',
        sub: 'Topic Research & Expert Interviews Prep',
        deadline: '2026-09-01',
        icon: <BookOpen size={22} />,
        color: '#d97706',
        bgColor: '#fffbeb',
        details: 'Select a scientific topic, gather research data, and conduct interviews with researchers & academic experts.'
      },
      {
        id: 2,
        type: 'stage',
        title: 'Stage 2: Article Publication',
        badge: 'Next Milestone',
        sub: 'Simplified Science Article Publication',
        deadline: '2026-09-20',
        icon: <FileText size={22} />,
        color: '#d97706',
        bgColor: '#fffbeb',
        details: 'Write a simplified science news article published on the digital platform with opportunity for magazine feature.'
      },
      {
        id: 3,
        type: 'stage',
        title: 'Stage 3 (Finals): Live Stage Show',
        badge: 'Grand Finale',
        sub: 'Live Science Talk Show Interview on Stage',
        deadline: '2026-10-10',
        icon: <Award size={24} />,
        color: '#d97706',
        bgColor: '#fffbeb',
        details: 'Host a simulated live science talk show interview on stage in front of judges and public audience.'
      }
    ]
  };

  const getMergedStage = (st, trackId) => {
    if (st.type !== 'stage') return st;
    const found = customConfig.find(c => c.track === trackId && Number(c.stageId) === Number(st.id));
    if (found) {
      return {
        ...st,
        title: found.title || st.title,
        sub: found.sub || st.sub,
        deadline: found.deadline || st.deadline,
        openDate: found.openDate || st.openDate,
        fieldOpenDate: found.fieldOpenDate || st.fieldOpenDate,
        badge: found.status || st.badge,
        details: found.details || st.details,
        submissions: found.submissions || st.submissions || [],
        criteria: found.criteria || [],
        assignedJudgeIds: found.assignedJudgeIds || []
      };
    }
    return { ...st, submissions: st.submissions || [], criteria: [], assignedJudgeIds: [] };
  };

  const getRawDate = (dateStr, fallbackIdx = 0) => {
    if (!dateStr || dateStr === 'TBD') return new Date(2099, 11, 31, 23, 59, 59 + fallbackIdx);
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? new Date(2099, 11, 31, 23, 59, 59 + fallbackIdx) : d;
  };

  const steps = useMemo(() => {
    // 1. Get merged stages for this track from defaultStages and Firestore timeline_config
    const rawStages = (defaultStages[selectedTrack] || defaultStages.pop_science).map((st) => getMergedStage(st, selectedTrack));

    const stageMilestoneEvents = [];
    const rawSubmissionItems = [];

    rawStages.forEach((st, stageIdx) => {
      // A. Stage Milestone Event
      stageMilestoneEvents.push({
        ...st,
        type: 'stage',
        badge: 'Stage Milestone',
        deadline: formatUnifiedDate(st.deadline),
        _rawDate: getRawDate(st.deadline, stageIdx * 10),
        _sortPriority: 3 // Stage milestones come after workshops & submission opens on same date
      });

      // B. Individual Submissions Open Items
      const stageSubs = (st.submissions && st.submissions.length > 0)
        ? st.submissions
        : (st.openDate || st.fieldOpenDate
            ? [{ id: 'default', name: `Stage ${st.id} Submissions`, openDate: st.openDate || st.fieldOpenDate, deadline: st.deadline }]
            : []
          );

      stageSubs.forEach((sub, subIdx) => {
        let openDateStr = sub.openDate || sub.startDate || sub.open || sub.fieldOpenDate;
        let closeDateStr = sub.closeDate || sub.deadline || sub.endDate || sub.closes || st.deadline;

        if (!openDateStr && st.deadline && st.deadline !== 'TBD') {
          const d = new Date(st.deadline);
          if (!isNaN(d.getTime())) {
            const openD = new Date(d);
            openD.setDate(openD.getDate() - 14);
            openDateStr = openD.toISOString().split('T')[0];
          }
        }

        if (openDateStr) {
          const subNameClean = sub.name || sub.title || `Stage ${st.id} Deliverable`;
          rawSubmissionItems.push({
            id: `sub_${st.id}_${sub.id || subIdx}`,
            stageId: st.id,
            stageTitle: st.title || `Stage ${st.id}`,
            subName: subNameClean,
            openDate: openDateStr,
            closeDate: closeDateStr,
            _rawDate: getRawDate(openDateStr, (stageIdx * 10) + subIdx + 1)
          });
        }
      });
    });

    // Group submission items that share the EXACT SAME openDate into 1 combined submission event step
    const groupedSubmissionsMap = {};
    rawSubmissionItems.forEach(item => {
      const dateKey = item.openDate;
      if (!groupedSubmissionsMap[dateKey]) {
        groupedSubmissionsMap[dateKey] = [];
      }
      groupedSubmissionsMap[dateKey].push(item);
    });

    const submissionEvents = Object.keys(groupedSubmissionsMap).map(dateKey => {
      const items = groupedSubmissionsMap[dateKey];
      const primaryItem = items[0];

      let combinedTitle = '';
      if (items.length === 1) {
        const cleanName = primaryItem.subName.replace(/\s*submissions?\s*(open)?/i, '').trim();
        combinedTitle = `${cleanName} Submission`;
      } else {
        const names = items.map(i => i.subName.replace(/\s*submissions?\s*(open)?/i, '').trim());
        combinedTitle = `${names.join(' & ')} Submission`;
      }

      return {
        id: `sub_group_${dateKey.replace(/[^a-zA-Z0-9]/g, '_')}`,
        type: 'submission_open',
        title: combinedTitle,
        items: items,
        badge: 'Submission',
        deadline: formatUnifiedDate(dateKey),
        closeDeadline: primaryItem.closeDate ? formatUnifiedDate(primaryItem.closeDate) : '',
        openDate: dateKey,
        _rawDate: primaryItem._rawDate,
        _sortPriority: 2, // Submissions come AFTER workshops (priority 1) on same date
        icon: <Upload size={20} />,
        color: '#dc2626',
        bgColor: '#fff1f2',
        details: items.map(i => `• ${i.subName} (${i.stageTitle}): Opens ${formatUnifiedDate(i.openDate)}, Deadline: ${formatUnifiedDate(i.closeDate)}`).join('\n')
      };
    });

    // 2. Map dynamic workshops for this track
    const trackWorkshops = dynamicWorkshops
      .filter(ws => ws.targetTrack === 'both' || ws.targetTrack === selectedTrack)
      .map((ws, idx) => ({
        id: ws.id,
        type: 'workshop',
        title: ws.title,
        badge: ws.type || 'Workshop',
        meetingLink: ws.meetingLink || '',
        sub: ws.trainerName ? `Trainer: ${ws.trainerName}` : 'Training Session',
        trainerName: ws.trainerName || '',
        trainerId: ws.trainerId || '',
        deadline: formatUnifiedDate(ws.startDate),
        startDate: ws.startDate,
        _rawDate: getRawDate(ws.startDate, 500 + idx),
        _sortPriority: 1, // Workshops & Office Hours come FIRST on same date
        icon: ws.type === 'Orientation' ? <Zap size={20} />
            : ws.type === 'Lecture' ? <Mic size={20} />
            : ws.type === 'Office Hours' ? <Clock size={20} />
            : <Sparkles size={20} />,
        color: ws.type === 'Office Hours' ? '#059669' : '#2563eb',
        bgColor: ws.type === 'Office Hours' ? '#ecfdf5' : '#eff6ff',
        details: ws.description || 'No description provided.'
      }));

    // 3. Combine ALL individual events
    const combined = [...stageMilestoneEvents, ...submissionEvents, ...trackWorkshops];

    // 4. Sort strictly chronologically by calendar day, and then by _sortPriority (Workshops=1, Submissions=2, Milestones=3)
    combined.sort((a, b) => {
      const getDayKey = (d) => {
        if (!d || isNaN(d.getTime())) return 9999999999999;
        return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0).getTime();
      };

      const dayA = getDayKey(a._rawDate);
      const dayB = getDayKey(b._rawDate);

      if (dayA !== dayB) return dayA - dayB;
      return (a._sortPriority || 1) - (b._sortPriority || 1);
    });

    // 5. Assign step sequential numbers 01, 02, 03...
    return combined.map((item, idx) => ({
      ...item,
      stepNumber: String(idx + 1).padStart(2, '0')
    }));
  }, [selectedTrack, customConfig, dynamicWorkshops]);

  // Automatically select the first step in chronological order whose date has not passed yet
  useEffect(() => {
    if (steps && steps.length > 0) {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

      // Find first chronological step where date is today or in the future
      const targetStep = steps.find(s => {
        if (!s._rawDate || isNaN(s._rawDate.getTime())) return false;
        const stepDay = new Date(s._rawDate.getFullYear(), s._rawDate.getMonth(), s._rawDate.getDate(), 0, 0, 0, 0);
        return stepDay >= todayStart;
      });

      if (targetStep) {
        setSelectedStepId(targetStep.id);
      } else {
        // If all dates have passed, select the last step
        setSelectedStepId(steps[steps.length - 1].id);
      }
    }
  }, [steps]);

  // Helper to match workshop trainer account
  const getTrainerAccountForStep = (step) => {
    if (!step) return null;
    if (step.trainerId) {
      const found = scientists.find(a => a.id === step.trainerId);
      if (found) return found;
    }
    const cleanName = (step.trainerName || step.sub || '').replace(/^Trainer:\s*/i, '').trim();
    if (!cleanName) return null;
    const match = scientists.find(a => 
      (a.name && a.name.toLowerCase().includes(cleanName.toLowerCase())) ||
      (cleanName.toLowerCase().includes(a.name?.toLowerCase())) ||
      (a.username && a.username.toLowerCase() === cleanName.toLowerCase())
    );
    if (match) return match;
    return {
      name: cleanName,
      username: cleanName.toLowerCase().replace(/\s+/g, '_'),
      role: 'trainer',
      title: 'Workshop Trainer & Speaker',
      institutionName: 'AIU SciComm Spark',
      department: 'Science Communication'
    };
  };

  // Dynamic columns for single-page responsive Zigzag Timeline
  const COLUMNS = useMemo(() => {
    if (windowWidth < 640) return 2;
    if (windowWidth < 1024) return 4;
    return steps.length <= 6 ? steps.length : 6;
  }, [windowWidth, steps.length]);

  // Find index of currently selected/targeted step node dynamically
  const selectedStepIndex = useMemo(() => {
    if (!steps || steps.length === 0) return 0;
    const targetStr = String(selectedStepId).toLowerCase().trim();
    const idx = steps.findIndex(s => {
      const sId = String(s.id).toLowerCase().trim();
      const sStageId = s.stageId !== undefined ? String(s.stageId).toLowerCase().trim() : '';
      return sId === targetStr || (sStageId && sStageId === targetStr);
    });
    return idx >= 0 ? idx : 0;
  }, [steps, selectedStepId]);

  // Track previous track & previous step index for continuous sequential laser wave animations
  const prevTrackRef = useRef(selectedTrack);
  const prevStepIndexRef = useRef(selectedStepIndex);

  useEffect(() => {
    if (prevTrackRef.current !== selectedTrack) {
      prevTrackRef.current = selectedTrack;
      prevStepIndexRef.current = selectedStepIndex;
    } else {
      prevStepIndexRef.current = selectedStepIndex;
    }
  }, [selectedTrack, selectedStepIndex]);

  // Calculate staggered transition delay per segment for continuous sequential fill/rewind
  const getSegmentTransitionDelay = (segmentIndex) => {
    // Prevent staggered rewind animations from triggering across different tracks
    if (prevTrackRef.current !== selectedTrack) return '0s';

    const prevIdx = prevStepIndexRef.current;
    const currIdx = selectedStepIndex;

    if (currIdx > prevIdx) {
      if (segmentIndex >= prevIdx && segmentIndex < currIdx) {
        const offset = segmentIndex - prevIdx;
        return `${offset * 0.12}s`;
      }
    } else if (currIdx < prevIdx) {
      if (segmentIndex >= currIdx && segmentIndex < prevIdx) {
        const offset = (prevIdx - 1) - segmentIndex;
        return `${offset * 0.12}s`;
      }
    }
    return '0s';
  };

  // Calculate progress percentage to stop exactly on the targeted step node
  const targetedProgressPercent = useMemo(() => {
    if (steps.length <= 1) return 0;
    return (selectedStepIndex / (steps.length - 1)) * 100;
  }, [steps.length, selectedStepIndex]);

  // Real-time progress: compute what % of the timeline has elapsed based on today
  const timelineProgress = useMemo(() => {
    if (steps.length < 2) return 0;
    const now = new Date();
    const firstDate = steps[0]._rawDate;
    const lastDate = steps[steps.length - 1]._rawDate;
    const totalSpan = lastDate - firstDate;
    if (totalSpan <= 0) return 100;
    const elapsed = now - firstDate;
    const pct = (elapsed / totalSpan) * 100;
    return Math.max(0, Math.min(100, pct));
  }, [steps]);

  // Find which step index today falls on or past
  const currentStepIndex = useMemo(() => {
    const now = new Date();
    let idx = 0;
    for (let i = 0; i < steps.length; i++) {
      if (now >= steps[i]._rawDate) idx = i;
    }
    return idx;
  }, [steps]);

  const activeStep = steps.find(s => s.id === selectedStepId) || steps[0];
  const trackThemeColor = selectedTrack === 'pop_science' ? '#be123c' : '#2563eb';

  return (
    <div className="ft-animate-in" style={{ color: '#0f172a' }}>
      
      {/* POSTER BRANDING HEADER */}
      <div style={{
        background: '#ffffff', borderRadius: '20px', padding: '2rem', marginBottom: '2rem',
        border: '1px solid #e2e8f0', boxShadow: '0 8px 30px rgba(15, 23, 42, 0.04)',
        position: 'relative'
      }}>
        {/* Admin Poster Edit Toggle */}
        {isAdmin && (
          <div style={{ position: 'absolute', top: '12px', right: '12px', zIndex: 100 }}>
            <button
              onClick={() => setEditingPoster(prev => !prev)}
              style={{
                background: editingPoster ? '#2563eb' : '#f1f5f9',
                color: editingPoster ? '#ffffff' : '#475569',
                border: '1px solid #cbd5e1', borderRadius: '12px',
                padding: '0.45rem 0.9rem', fontWeight: 800, fontSize: '0.78rem',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem',
                boxShadow: editingPoster ? '0 4px 12px rgba(37,99,235,0.3)' : 'none'
              }}
            >
              <Pencil size={14} /> {editingPoster ? 'Done Editing Poster' : 'Edit Poster Logos Layout'}
            </button>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
          {/* Left: Creator Credit Box (Designed & Programmed with ❤️ by Abdullah Amr Maged) */}
          <CanvaTransformBox
            editing={editingPoster}
            scale={settingsData.dashLeftBrandScale || 1}
            rotate={settingsData.dashLeftBrandRotate || 0}
            offsetX={settingsData.dashLeftBrandOffsetX || 0}
            offsetY={settingsData.dashLeftBrandOffsetY || 0}
            onTransformChange={({ scale, rotate, offsetX, offsetY }) => {
              savePosterSetting({ dashLeftBrandScale: scale, dashLeftBrandRotate: rotate, dashLeftBrandOffsetX: offsetX, dashLeftBrandOffsetY: offsetY });
            }}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.85rem',
              background: 'linear-gradient(135deg, #ffffff 0%, #fff1f2 100%)',
              padding: '0.6rem 1rem',
              borderRadius: '16px',
              border: '1.5px solid #fecdd3',
              boxShadow: '0 4px 15px rgba(190, 18, 60, 0.08)'
            }}>
              <img
                src={abdullahAccount?.avatarUrl || abdullahAccount?.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=AbdullahAmr'}
                alt="Abdullah Amr Maged"
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  border: '2.5px solid #be123c',
                  boxShadow: '0 4px 12px rgba(190, 18, 60, 0.2)',
                  objectFit: 'cover',
                  flexShrink: 0
                }}
              />
              <div>
                <div style={{ fontWeight: 800, fontSize: '0.84rem', color: '#334155', display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
                  <span>Designed & Programmed with</span>
                  <span style={{ color: '#be123c', fontSize: '0.95rem', lineHeight: 1 }}>❤️</span>
                  <span>by</span>
                  <span style={{ fontWeight: 900, color: '#be123c', fontFamily: "'Outfit', sans-serif" }}>
                    {abdullahAccount?.name || 'Abdullah Amr Maged'}
                  </span>
                </div>
                <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 700, marginTop: '0.15rem' }}>
                  {getCleanAcademicTitle(abdullahAccount) || abdullahAccount?.title || abdullahAccount?.institutionName || 'Teaching Assistant at Alamein International University'}
                </div>
              </div>
            </div>
          </CanvaTransformBox>

          {/* Right SciComm Badge Logo */}
          <CanvaTransformBox
            editing={editingPoster}
            scale={settingsData.dashBadgeScale || 1}
            rotate={settingsData.dashBadgeRotate || 0}
            offsetX={settingsData.dashBadgeOffsetX || 0}
            offsetY={settingsData.dashBadgeOffsetY || 0}
            onTransformChange={({ scale, rotate, offsetX, offsetY }) => {
              savePosterSetting({ dashBadgeScale: scale, dashBadgeRotate: rotate, dashBadgeOffsetX: offsetX, dashBadgeOffsetY: offsetY });
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#f1f5f9', padding: '0.4rem 1rem', borderRadius: '12px' }}>
              <span style={{ fontWeight: 800, color: '#be123c', fontSize: '0.9rem' }}>AIU.</span>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1e293b' }}>SCI COMM</span>
            </div>
          </CanvaTransformBox>
        </div>

        <div className="ft-poster-title-container" style={{ margin: '0.5rem 0', textAlign: 'center' }}>
          {/* Main Center Poster Logo */}
          <EditableLogo
            src={settingsData.dashLogoSrc || "./spark_logo.png"}
            onUpload={(base64) => savePosterSetting({ dashLogoSrc: base64 })}
            editing={editingPoster}
            scale={settingsData.dashLogoScale || 1}
            rotate={settingsData.dashLogoRotate || 0}
            offsetX={settingsData.dashLogoOffsetX || 0}
            offsetY={settingsData.dashLogoOffsetY || 0}
            onTransformChange={({ scale, rotate, offsetX, offsetY }) => {
              savePosterSetting({ dashLogoScale: scale, dashLogoRotate: rotate, dashLogoOffsetX: offsetX, dashLogoOffsetY: offsetY });
            }}
            style={{ height: '100px', objectFit: 'contain', marginBottom: '0.6rem', filter: 'drop-shadow(0 4px 15px rgba(190,18,60,0.15))' }}
            alt="SciComm Spark Logo"
          />

          <div className="ft-poster-edition">2nd EDITION</div>
          <div className="ft-poster-main-title">
            SCIENCE COMM
            {/* Cursive Spark word */}
            <CanvaTransformBox
              editing={editingPoster}
              scale={settingsData.dashSparkScale || 1}
              rotate={settingsData.dashSparkRotate || 0}
              offsetX={settingsData.dashSparkOffsetX || 0}
              offsetY={settingsData.dashSparkOffsetY || 0}
              onTransformChange={({ scale, rotate, offsetX, offsetY }) => {
                savePosterSetting({ dashSparkScale: scale, dashSparkRotate: rotate, dashSparkOffsetX: offsetX, dashSparkOffsetY: offsetY });
              }}
            >
              <span className="ft-poster-spark">Spark</span>
            </CanvaTransformBox>
          </div>
          <div className="ft-poster-competition">C O M P E T I T I O N</div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', flexWrap: 'wrap', borderTop: '1px solid #f1f5f9', paddingTop: '1rem', marginTop: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.88rem', fontWeight: 700, color: '#1e293b' }}>
            <Globe size={16} style={{ color: '#2563eb' }} /> ONLINE PLATFORM
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.88rem', fontWeight: 700, color: '#be123c' }}>
            <Calendar size={16} /> Deadline: 31 Jul 2026
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.88rem', fontWeight: 700, color: '#475569' }}>
            <Mail size={16} style={{ color: '#059669' }} /> scmnexus@aiu.edu.eg
          </div>
        </div>
      </div>

      {/* TRACK SELECTOR BUTTONS */}
      <div className="ft-track-selector-bar" style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
        {isCompetitorUser ? (
          <div className="ft-track-btn" style={{
            padding: '0.9rem 2.2rem', borderRadius: '16px', border: '2px solid',
            borderColor: selectedTrack === 'pop_science' ? '#be123c' : '#2563eb',
            background: selectedTrack === 'pop_science' ? '#be123c' : '#2563eb',
            color: '#ffffff', fontWeight: 800, fontSize: '1.02rem', display: 'flex', alignItems: 'center', gap: '0.6rem',
            boxShadow: '0 8px 20px rgba(0,0,0,0.15)'
          }}>
            {selectedTrack === 'pop_science' ? <Video size={18} /> : <Newspaper size={18} />}
            <span>{selectedTrack === 'pop_science' ? 'Track 1: Pop Science Videos' : 'Track 2: Science Journalism'}</span>
            {meDoc?.teamName && <span style={{ background: 'rgba(255,255,255,0.2)', padding: '0.2rem 0.6rem', borderRadius: '10px', fontSize: '0.82rem' }}>Team: {meDoc.teamName}</span>}
          </div>
        ) : (
          <>
            <button
              className="ft-track-btn"
              onClick={() => setSelectedTrack('pop_science')}
              style={{
                padding: '0.9rem 2.2rem', borderRadius: '16px', border: '2px solid',
                borderColor: selectedTrack === 'pop_science' ? '#be123c' : '#e2e8f0',
                background: selectedTrack === 'pop_science' ? '#be123c' : '#ffffff',
                color: selectedTrack === 'pop_science' ? '#ffffff' : '#475569',
                cursor: 'pointer', fontWeight: 800, fontSize: '1.02rem', display: 'flex', alignItems: 'center', gap: '0.6rem',
                boxShadow: selectedTrack === 'pop_science' ? '0 8px 20px rgba(190, 18, 60, 0.25)' : '0 2px 6px rgba(0,0,0,0.03)',
                transition: 'all 0.3s ease'
              }}
            >
              <Video size={18} /> Track 1: Pop Science Videos
            </button>

            <button
              className="ft-track-btn"
              onClick={() => setSelectedTrack('science_journalism')}
              style={{
                padding: '0.9rem 2.2rem', borderRadius: '16px', border: '2px solid',
                borderColor: selectedTrack === 'science_journalism' ? '#2563eb' : '#e2e8f0',
                background: selectedTrack === 'science_journalism' ? '#2563eb' : '#ffffff',
                color: selectedTrack === 'science_journalism' ? '#ffffff' : '#475569',
                cursor: 'pointer', fontWeight: 800, fontSize: '0.98rem', display: 'flex', alignItems: 'center', gap: '0.6rem',
                boxShadow: selectedTrack === 'science_journalism' ? '0 8px 20px rgba(37, 99, 235, 0.25)' : '0 2px 6px rgba(0,0,0,0.03)',
                transition: 'all 0.3s ease'
              }}
            >
              <Newspaper size={18} /> Track 2: Science Journalism
            </button>
          </>
        )}
      </div>

      {/* CHRONOLOGICAL TIMELINE SECTION — CYBER GLASSMORPHISM HUD */}
      <div 
        className="ft-timeline-card-container"
        style={{
          background: '#ffffff', borderRadius: '24px', padding: '2.5rem 2rem', marginBottom: '2rem',
          border: '1px solid #e2e8f0', boxShadow: '0 12px 40px rgba(15, 23, 42, 0.05)',
          position: 'relative', overflow: 'hidden'
        }}
      >
        {/* Top Header */}
        <div className="ft-timeline-header-flex" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
              <span style={{ fontSize: '1.2rem' }}>🎯</span>
              <h2 className="ft-timeline-header-title" style={{ fontFamily: "'Outfit', sans-serif", fontSize: '1.35rem', fontWeight: 900, margin: 0, color: '#0f172a', letterSpacing: '-0.01em' }}>
                Chronological Timeline Road Map
              </h2>
            </div>
            <p style={{ color: '#64748b', fontSize: '0.85rem', margin: 0, fontWeight: 500 }}>
              Follow steps 01 → {String(steps.length).padStart(2, '0')} sequentially in exact chronological order from start to grand finale.
            </p>
          </div>

          <div className="ft-timeline-legend-bar" style={{ display: 'flex', gap: '0.85rem', fontSize: '0.8rem', fontWeight: 800, flexWrap: 'wrap' }}>
            <span className="ft-timeline-legend-pill" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#dc2626', background: '#fff1f2', padding: '0.35rem 0.8rem', borderRadius: '20px', border: '1px solid #fecdd3' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#dc2626', boxShadow: '0 0 8px #dc2626' }} /> Submission (Red)
            </span>
            <span className="ft-timeline-legend-pill" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#d97706', background: '#fffbeb', padding: '0.35rem 0.8rem', borderRadius: '20px', border: '1px solid #fde68a' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#d97706', boxShadow: '0 0 8px #d97706' }} /> Stage Milestone (Gold)
            </span>
            <span className="ft-timeline-legend-pill" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#2563eb', background: '#eff6ff', padding: '0.35rem 0.8rem', borderRadius: '20px', border: '1px solid #bfdbfe' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#2563eb', boxShadow: '0 0 8px #2563eb' }} /> Workshops (Blue)
            </span>
            <span className="ft-timeline-legend-pill" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#059669', background: '#ecfdf5', padding: '0.35rem 0.8rem', borderRadius: '20px', border: '1px solid #a7f3d0' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#059669', boxShadow: '0 0 8px #059669' }} /> Office Hours (Green)
            </span>
          </div>
        </div>
         {/* ZIGZAG SNAKE TIMELINE ROAD MAP — FITS ALL STEPS ON ONE PAGE WITHOUT HORIZONTAL SCROLL */}
        <div className="ft-desktop-timeline" style={{ position: 'relative', margin: '1.5rem 0 2.5rem 0', width: '100%' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${COLUMNS}, 1fr)`,
            gap: '2.75rem 1.25rem',
            position: 'relative',
            width: '100%'
          }}>
            {steps.map((st, idx) => {
              const isSelected = String(selectedStepId).toLowerCase().trim() === String(st.id).toLowerCase().trim();
              const rowIndex = Math.floor(idx / COLUMNS);
              const isEvenRow = rowIndex % 2 === 0;
              const colInRow = idx % COLUMNS;
              const colPosition = isEvenRow ? colInRow : (COLUMNS - 1 - colInRow);
              const gridColumn = colPosition + 1;
              const gridRow = rowIndex + 1;

              const hasNext = idx < steps.length - 1;
              const isSameRowAsNext = hasNext && Math.floor((idx + 1) / COLUMNS) === rowIndex;
              const isTurnToNext = hasNext && Math.floor((idx + 1) / COLUMNS) !== rowIndex;

              const isSegmentActive = selectedStepIndex > idx;
              const isTipSegment = selectedStepIndex === idx + 1;
              const segDelay = getSegmentTransitionDelay(idx);

              return (
                <div
                  key={st.id}
                  style={{
                    gridColumn: gridColumn,
                    gridRow: gridRow,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    textAlign: 'center',
                    position: 'relative'
                  }}
                >
                  {/* A. Horizontal Connector Segment (to next node in same row) */}
                  {isSameRowAsNext && (
                    <div style={{
                      position: 'absolute',
                      top: '30px',
                      ...(isEvenRow
                        ? { left: '50%', width: 'calc(100% + 1.25rem)' }
                        : { right: '50%', width: 'calc(100% + 1.25rem)' }
                      ),
                      height: '8px',
                      background: '#e2e8f0',
                      borderRadius: '10px',
                      zIndex: 1,
                      boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.1)'
                    }}>
                      {/* Laser Fill Segment */}
                      <div style={{
                        height: '100%',
                        width: isSegmentActive ? '100%' : '0%',
                        background: selectedTrack === 'pop_science'
                          ? (isEvenRow
                              ? 'linear-gradient(90deg, #be123c 0%, #e11d48 60%, #f43f5e 100%)'
                              : 'linear-gradient(270deg, #be123c 0%, #e11d48 60%, #f43f5e 100%)'
                            )
                          : (isEvenRow
                              ? 'linear-gradient(90deg, #1d4ed8 0%, #2563eb 60%, #3b82f6 100%)'
                              : 'linear-gradient(270deg, #1d4ed8 0%, #2563eb 60%, #3b82f6 100%)'
                            ),
                        borderRadius: '10px',
                        boxShadow: isSegmentActive ? `0 0 16px ${trackThemeColor}80, 0 0 25px ${trackThemeColor}40` : 'none',
                        transition: `width 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) ${segDelay}`,
                        position: 'relative',
                        float: isEvenRow ? 'left' : 'right'
                      }} />

                      {/* Radar Tip Pointer on active tip */}
                      {isTipSegment && (
                        <div style={{
                          position: 'absolute',
                          top: '-6px',
                          ...(isEvenRow ? { right: '-10px' } : { left: '-10px' }),
                          width: '20px', height: '20px', borderRadius: '50%',
                          background: '#ffffff',
                          border: `4px solid ${trackThemeColor}`,
                          boxShadow: `0 0 0 4px ${trackThemeColor}30, 0 0 20px ${trackThemeColor}`,
                          animation: 'ftTodayPulse 2s ease-in-out infinite',
                          zIndex: 3,
                          transition: `all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) ${segDelay}`
                        }} />
                      )}
                    </div>
                  )}

                  {/* B. Vertical Turn Connector Segment (from end of row down to next row) */}
                  {isTurnToNext && (
                    <div style={{
                      position: 'absolute',
                      top: '30px',
                      left: 'calc(50% - 4px)',
                      width: '8px',
                      height: 'calc(100% + 2.75rem)',
                      background: '#e2e8f0',
                      borderRadius: '10px',
                      zIndex: 1,
                      boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.1)'
                    }}>
                      {/* Laser Fill Segment */}
                      <div style={{
                        width: '100%',
                        height: isSegmentActive ? '100%' : '0%',
                        background: selectedTrack === 'pop_science'
                          ? 'linear-gradient(180deg, #be123c 0%, #e11d48 60%, #f43f5e 100%)'
                          : 'linear-gradient(180deg, #1d4ed8 0%, #2563eb 60%, #3b82f6 100%)',
                        borderRadius: '10px',
                        boxShadow: isSegmentActive ? `0 0 16px ${trackThemeColor}80, 0 0 25px ${trackThemeColor}40` : 'none',
                        transition: `height 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) ${segDelay}`,
                        position: 'relative'
                      }} />

                      {/* Radar Tip Pointer on active vertical tip */}
                      {isTipSegment && (
                        <div style={{
                          position: 'absolute',
                          bottom: '-10px',
                          left: '-6px',
                          width: '20px', height: '20px', borderRadius: '50%',
                          background: '#ffffff',
                          border: `4px solid ${trackThemeColor}`,
                          boxShadow: `0 0 0 4px ${trackThemeColor}30, 0 0 20px ${trackThemeColor}`,
                          animation: 'ftTodayPulse 2s ease-in-out infinite',
                          zIndex: 3,
                          transition: `all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) ${segDelay}`
                        }} />
                      )}
                    </div>
                  )}

                  {/* Step Node Icon Circle */}
                  <div
                    onClick={() => { setSelectedStepId(st.id); setIsDetailModalOpen(true); }}
                    style={{
                      width: '68px', height: '68px', borderRadius: '50%',
                      background: isSelected
                        ? `linear-gradient(135deg, ${st.color} 0%, #0f172a 100%)`
                        : '#ffffff',
                      color: isSelected ? '#ffffff' : st.color,
                      border: `4px solid ${isSelected ? st.color : '#cbd5e1'}`,
                      boxShadow: isSelected
                        ? `0 0 0 6px ${st.color}25, 0 10px 25px ${st.color}40`
                        : '0 4px 14px rgba(0,0,0,0.06)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '1.25rem', fontWeight: 900, fontFamily: "'Outfit', sans-serif",
                      transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                      transform: isSelected ? 'scale(1.12) translateY(-2px)' : 'scale(1)',
                      position: 'relative', zIndex: 5, cursor: 'pointer'
                    }}
                  >
                    {st.stepNumber}
                  </div>

                  {/* Glassmorphic Step Title Card (Below Node) */}
                  <div
                    onClick={() => { setSelectedStepId(st.id); setIsDetailModalOpen(true); }}
                    style={{
                      marginTop: '1.25rem', padding: '0.9rem 0.85rem', borderRadius: '16px',
                      background: isSelected
                        ? `linear-gradient(135deg, ${st.bgColor} 0%, #ffffff 100%)`
                        : (st.type === 'submission_open' ? '#fff1f2' : '#f8fafc'),
                      border: `2px solid ${isSelected ? st.color : (st.type === 'submission_open' ? '#fecdd3' : '#e2e8f0')}`,
                      width: '100%',
                      boxShadow: isSelected ? `0 8px 20px ${st.color}20` : 'none',
                      transition: 'all 0.25s ease',
                      transform: isSelected ? 'translateY(-2px)' : 'none',
                      zIndex: 5, cursor: 'pointer'
                    }}
                  >
                    <div style={{
                      fontSize: '0.7rem', fontWeight: 800, color: st.color,
                      textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.25rem',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem'
                    }}>
                      <span>
                        {st.type === 'submission_open' ? '📤 Submission'
                          : st.type === 'stage' ? '🏆 Milestone'
                          : st.badge === 'Orientation' ? '🚀 Orientation'
                          : st.badge === 'Lecture' ? '🎙️ Lecture'
                          : st.badge === 'Office Hours' ? '💬 Office Hours'
                          : `📚 ${st.badge || 'Workshop'}`}
                      </span>
                      <span>· {st.stepNumber}</span>
                    </div>

                    <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#0f172a', lineHeight: 1.35, marginBottom: '0.4rem' }}>
                      {st.title}
                    </div>

                    {st.type === 'submission_open' ? (
                      <div style={{
                        fontSize: '0.72rem', color: '#dc2626', fontWeight: 800,
                        display: 'flex', flexDirection: 'column', gap: '0.2rem', alignItems: 'center'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <Calendar size={12} style={{ color: '#dc2626' }} />
                          <span>Opens: {st.deadline}</span>
                        </div>
                        {st.closeDeadline && (
                          <div style={{ fontSize: '0.66rem', color: '#991b1b', fontWeight: 800, background: '#fef2f2', padding: '0.12rem 0.45rem', borderRadius: '6px', border: '1px solid #fca5a5' }}>
                            ⏰ Deadline: {st.closeDeadline}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}>
                        <Calendar size={12} style={{ color: st.color }} /> {st.deadline}
                      </div>
                    )}

                    {st.items && st.items.length > 1 && (
                      <div style={{
                        marginTop: '0.4rem', paddingTop: '0.35rem', borderTop: '1px dashed #fecdd3',
                        display: 'flex', flexDirection: 'column', gap: '0.2rem', alignItems: 'center', width: '100%'
                      }}>
                        {st.items.map((it, iIdx) => (
                          <div key={iIdx} style={{
                            fontSize: '0.65rem', fontWeight: 800, color: '#991b1b', background: '#ffffff',
                            padding: '0.15rem 0.4rem', borderRadius: '6px', border: '1px solid #fecdd3',
                            width: '100%', boxSizing: 'border-box', textAlign: 'center'
                          }}>
                            <div>• {it.subName}</div>
                            <div style={{ fontSize: '0.62rem', color: '#dc2626', fontWeight: 700 }}>
                              Deadline: {formatUnifiedDate(it.closeDate)}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* MOBILE SINGLE-COLUMN VERTICAL ROADMAP WITH INLINE PREVIEWS */}
        <div className="ft-mobile-vertical-timeline" style={{ flexDirection: 'column', margin: '1.25rem 0 2.25rem 0', position: 'relative', paddingLeft: '3.2rem', gap: '1.25rem' }}>
          {/* Continuous Vertical Laser Progress Track */}
          <div style={{
            position: 'absolute', top: '24px', bottom: '24px', left: '24px', width: '6px',
            background: '#e2e8f0', borderRadius: '10px', zIndex: 1, overflow: 'hidden'
          }}>
            <div style={{
              width: '100%', height: `${targetedProgressPercent}%`,
              background: selectedTrack === 'pop_science'
                ? 'linear-gradient(180deg, #be123c 0%, #e11d48 60%, #f43f5e 100%)'
                : 'linear-gradient(180deg, #1d4ed8 0%, #2563eb 60%, #3b82f6 100%)',
              borderRadius: '10px', boxShadow: `0 0 14px ${trackThemeColor}90`,
              transition: 'height 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)'
            }} />
          </div>

          {steps.map((st, idx) => {
            const isSelected = String(selectedStepId).toLowerCase().trim() === String(st.id).toLowerCase().trim();
            const isPast = selectedStepIndex >= idx;

            return (
              <div 
                key={st.id}
                onClick={() => { setSelectedStepId(st.id); setIsDetailModalOpen(true); }}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: '1rem',
                  position: 'relative', zIndex: 3, cursor: 'pointer',
                  width: '100%'
                }}
              >
                {/* Numbered Circle Node */}
                <div style={{
                  position: 'absolute', left: '-3.2rem', top: '4px',
                  width: '50px', height: '50px', borderRadius: '50%',
                  background: isSelected
                    ? `linear-gradient(135deg, ${st.color} 0%, #0f172a 100%)`
                    : isPast ? st.color : '#ffffff',
                  color: isSelected || isPast ? '#ffffff' : st.color,
                  border: `4px solid ${isSelected ? st.color : isPast ? st.color : '#cbd5e1'}`,
                  boxShadow: isSelected
                    ? `0 0 0 6px ${st.color}25, 0 8px 20px ${st.color}40`
                    : '0 4px 12px rgba(0,0,0,0.06)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.1rem', fontWeight: 900, fontFamily: "'Outfit', sans-serif",
                  flexShrink: 0, transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
                }}>
                  {st.stepNumber}
                </div>

                {/* Inline Step Preview Card */}
                <div style={{
                  flex: 1, padding: '1rem 1.15rem', borderRadius: '18px',
                  background: isSelected ? `linear-gradient(135deg, ${st.bgColor} 0%, #ffffff 100%)` : '#ffffff',
                  border: `2px solid ${isSelected ? st.color : '#e2e8f0'}`,
                  boxShadow: isSelected ? `0 8px 24px ${st.color}25` : '0 2px 8px rgba(0,0,0,0.03)',
                  transition: 'all 0.3s ease'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem', flexWrap: 'wrap', gap: '0.4rem' }}>
                    <span style={{
                      fontSize: '0.72rem', fontWeight: 900, textTransform: 'uppercase',
                      color: '#ffffff', background: st.color,
                      padding: '0.2rem 0.65rem', borderRadius: '12px', letterSpacing: '0.04em'
                    }}>
                      {st.badge}
                    </span>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Calendar size={12} style={{ color: st.color }} /> {st.deadline}
                    </span>
                  </div>

                  <div style={{ fontSize: '0.98rem', fontWeight: 900, color: '#0f172a', lineHeight: 1.3, marginBottom: '0.35rem' }}>
                    {st.title}
                  </div>

                  {st.items && st.items.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginTop: '0.4rem' }}>
                      {st.items.map((it, iIdx) => (
                        <div key={iIdx} style={{ fontSize: '0.78rem', color: '#475569', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <span style={{ color: st.color, fontWeight: 900 }}>•</span> {it.title}
                        </div>
                      ))}
                    </div>
                  ) : st.sub ? (
                    <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600, marginTop: '0.25rem' }}>
                      {st.sub}
                    </div>
                  ) : null}
                </div>

              </div>
            );
          })}
        </div>

        {/* GRAPHICAL POPUP MODAL WINDOW FOR STEP DETAILS */}
        {isDetailModalOpen && activeStep && (
          <div
            className="ft-timeline-modal-container"
            onClick={() => setIsDetailModalOpen(false)}
            style={{
              position: 'fixed', inset: 0, zIndex: 99999,
              background: 'rgba(5, 9, 17, 0.85)',
              backdropFilter: 'blur(12px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '1.5rem', overflowY: 'auto'
            }}
          >
            <div
              className="ft-timeline-modal-content"
              onClick={(e) => e.stopPropagation()}
              style={{
                borderRadius: '24px', background: '#090d16', color: '#ffffff',
                boxShadow: `0 25px 60px ${activeStep.color}50, 0 0 100px rgba(0,0,0,0.9)`,
                overflow: 'hidden', width: '100%', maxWidth: '1000px', maxHeight: '90vh',
                border: `2px solid ${activeStep.color}`, position: 'relative',
                animation: 'ftPopIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                display: 'flex', flexDirection: 'column'
              }}
            >
              {/* Floating Close Button (X) */}
              <button
                onClick={() => setIsDetailModalOpen(false)}
                style={{
                  position: 'absolute', top: '1.25rem', right: '1.25rem', zIndex: 20,
                  background: 'rgba(255, 255, 255, 0.12)', border: '1px solid rgba(255,255,255,0.2)',
                  color: '#ffffff', width: '38px', height: '38px', borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', transition: 'all 0.2s ease',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#e11d48'; e.currentTarget.style.transform = 'scale(1.1)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)'; e.currentTarget.style.transform = 'scale(1)'; }}
              >
                <X size={20} />
              </button>

              {/* Header Bar inside Dark HUD */}
              <div 
                className="ft-timeline-hud-header"
                style={{
                  padding: '1.6rem 2rem',
                  background: `linear-gradient(135deg, ${activeStep.color}35 0%, rgba(9, 13, 22, 0.98) 100%)`,
                  borderBottom: '1px solid rgba(255,255,255,0.15)',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.25rem'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.35rem', flexWrap: 'wrap', paddingRight: '2.5rem' }}>
                  <div style={{
                    width: 52, height: 52, borderRadius: '16px', background: activeStep.color,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff',
                    boxShadow: `0 0 20px ${activeStep.color}`, flexShrink: 0
                  }}>
                    {activeStep.icon}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                      <span style={{
                        fontSize: '0.78rem', fontWeight: 900, textTransform: 'uppercase',
                        color: '#ffffff', background: activeStep.color,
                        padding: '0.25rem 0.75rem', borderRadius: '20px', letterSpacing: '0.06em',
                        boxShadow: `0 0 12px ${activeStep.color}`
                      }}>
                        {activeStep.badge}
                      </span>
                      <span style={{ fontSize: '0.78rem', background: '#1e293b', border: '1px solid #475569', padding: '0.25rem 0.7rem', borderRadius: '8px', color: '#f8fafc', fontWeight: 700 }}>
                        {selectedTrack === 'pop_science' ? 'Pop Science Track' : 'Journalism Track'}
                      </span>
                    </div>
                    <h3 style={{ fontSize: '1.5rem', fontWeight: 900, margin: 0, color: '#ffffff', fontFamily: "'Outfit', sans-serif", textShadow: '0 2px 10px rgba(0,0,0,0.5)', lineHeight: 1.25 }}>
                      {activeStep.title}
                    </h3>
                  </div>
                </div>

                {/* CTA Button in HUD Header - Only visible to competitors */}
                {!['judge', 'academic_judge', 'scicomm_judge', 'trainer_judge', 'trainer', 'admin', 'master'].includes(user?.role) && (
                  <div className="ft-timeline-hud-cta">
                    {activeStep.type === 'stage' ? (
                      <button
                        className="ft-btn"
                        onClick={() => { setIsDetailModalOpen(false); navigate('/my-competition'); }}
                        style={{
                          background: `linear-gradient(135deg, ${activeStep.color} 0%, #e11d48 100%)`,
                          color: '#ffffff', fontWeight: 900, padding: '0.85rem 1.6rem', borderRadius: '14px',
                          fontSize: '0.98rem', border: 'none', boxShadow: `0 4px 20px ${activeStep.color}80`,
                          display: 'flex', alignItems: 'center', gap: '0.55rem', cursor: 'pointer',
                          letterSpacing: '0.01em'
                        }}
                      >
                        Submit Work for Stage {activeStep.id} <ArrowRight size={18} />
                      </button>
                    ) : activeStep.meetingLink ? (
                      <a
                        href={activeStep.meetingLink}
                        target="_blank"
                        rel="noreferrer"
                        className="ft-btn"
                        style={{
                          background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                          color: '#ffffff', fontWeight: 900, padding: '0.85rem 1.6rem', borderRadius: '14px',
                          fontSize: '0.98rem', textDecoration: 'none', border: 'none',
                          boxShadow: '0 4px 20px rgba(16, 185, 129, 0.45)',
                          display: 'flex', alignItems: 'center', gap: '0.55rem'
                        }}
                      >
                        {activeStep.badge === 'Orientation' ? '🚀 Join Orientation Session'
                          : activeStep.badge === 'Lecture' ? '🎙️ Join Live Lecture'
                          : activeStep.badge === 'Office Hours' ? '💬 Join Office Hours'
                          : '🎓 Join Workshop Session'} <ExternalLink size={16} />
                      </a>
                    ) : (
                      <a
                        href="#workshops-section"
                        onClick={() => setIsDetailModalOpen(false)}
                        className="ft-btn"
                        style={{
                          background: '#1e293b', border: `2px solid ${activeStep.color}`,
                          color: '#ffffff', fontWeight: 900, padding: '0.85rem 1.6rem', borderRadius: '14px',
                          fontSize: '0.98rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.55rem'
                        }}
                      >
                        {activeStep.badge === 'Orientation' ? '🚀 View Orientation Schedule'
                          : activeStep.badge === 'Lecture' ? '🎙️ View Lecture Schedule'
                          : activeStep.badge === 'Office Hours' ? '💬 View Office Hours Schedule'
                          : '🎓 View Workshop Schedule'} <ExternalLink size={16} />
                      </a>
                    )}
                  </div>
                )}
              </div>

              {/* Body content inside HUD Card */}
              <div style={{ padding: '2rem', overflowY: 'auto' }}>
                {/* High-Contrast Subtitle Badge or Full Trainer Profile Card */}
                {(() => {
                  const trainerAcc = getTrainerAccountForStep(activeStep);
                  if (activeStep.type === 'workshop' && trainerAcc) {
                    return (
                      <div style={{
                        margin: '0.2rem 0 1.25rem 0', padding: '0.85rem 1.25rem', borderRadius: '16px',
                        background: '#161f30', border: `1.5px solid ${activeStep.color}`,
                        display: 'inline-flex', alignItems: 'center', gap: '1rem',
                        boxShadow: `0 4px 20px ${activeStep.color}25`
                      }}>
                        <img
                          src={trainerAcc.avatarUrl || trainerAcc.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${trainerAcc.username}`}
                          alt={trainerAcc.name}
                          style={{ width: '48px', height: '48px', borderRadius: '50%', border: `2.5px solid ${activeStep.color}`, objectFit: 'cover', flexShrink: 0 }}
                        />
                        <div>
                          <div style={{ fontSize: '0.72rem', fontWeight: 900, textTransform: 'uppercase', color: activeStep.color, letterSpacing: '0.06em' }}>
                            {activeStep.badge === 'Orientation' ? '🚀 Session Host & Lead Presenter'
                              : activeStep.badge === 'Lecture' ? '🎙️ Guest Lecturer / Speaker'
                              : activeStep.badge === 'Office Hours' ? '💬 Office Hours Mentor'
                              : `🎓 Lead ${activeStep.badge || 'Workshop'} Trainer / Speaker`}
                          </div>
                          <div style={{ fontSize: '1.05rem', fontWeight: 900, color: '#ffffff', margin: '0.15rem 0' }}>
                            {trainerAcc.name || trainerAcc.username}
                          </div>
                          <div style={{ fontSize: '0.82rem', color: '#cbd5e1', fontWeight: 600 }}>
                            <span>{getCleanAcademicTitle(trainerAcc)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div style={{
                      fontSize: '1.05rem', fontWeight: 900,
                      color: selectedTrack === 'pop_science' ? '#ff6b81' : '#38bdf8',
                      marginBottom: '0.6rem', display: 'inline-block',
                      background: selectedTrack === 'pop_science' ? 'rgba(255, 107, 129, 0.12)' : 'rgba(56, 189, 248, 0.12)',
                      padding: '0.35rem 0.85rem', borderRadius: '10px',
                      border: `1px solid ${selectedTrack === 'pop_science' ? 'rgba(255, 107, 129, 0.3)' : 'rgba(56, 189, 248, 0.3)'}`
                    }}>
                      {activeStep.sub}
                    </div>
                  );
                })()}

                {/* Crisp Bright Description */}
                <p style={{ fontSize: '0.98rem', color: '#f1f5f9', margin: '0 0 1.75rem 0', maxWidth: '850px', lineHeight: 1.65, fontWeight: 500 }}>
                  {activeStep.details}
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.75rem', borderTop: '1px solid rgba(255,255,255,0.12)', paddingTop: '1.75rem' }}>
                  {/* Left Box: Judging Criteria */}
                  {activeStep.type === 'stage' && (
                    <div>
                      <div style={{ fontSize: '0.88rem', fontWeight: 900, color: '#ffffff', marginBottom: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '1rem' }}>⚖️</span> JUDGING CRITERIA BREAKDOWN:
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {(() => {
                          const stageCriteria = (activeStep.criteria && activeStep.criteria.length > 0)
                            ? activeStep.criteria
                            : DEFAULT_JUDGING_CRITERIA.filter(dc => dc.stageId === 'all' || Number(dc.stageId) === Number(activeStep.id));

                          if (stageCriteria.length === 0) {
                            return <span style={{ fontSize: '0.9rem', color: '#94a3b8', fontStyle: 'italic' }}>No criteria assigned to this stage yet</span>;
                          }

                          // Check if user has an evaluation score published
                          const userEval = (liveEvaluations || []).find(ev =>
                            (Number(ev.stageId) === Number(activeStep.id) || Number(ev.stageId) === Number(activeStep.stageId)) &&
                            (ev.competitorId === meDoc?.id || ev.competitorUsername === meDoc?.username || ev.competitorCode === meDoc?.code || ev.competitorId === user?.id || ev.userId === user?.id)
                          );

                          const isPublished = (publishedResults || []).some(p =>
                            (Number(p.stageId) === Number(activeStep.id) || Number(p.stageId) === Number(activeStep.stageId)) &&
                            p.isPublished === true
                          );

                          const showEvaluatedScore = Boolean(userEval && (isPublished || isAdmin));

                          return stageCriteria.map((c, idx) => {
                            const maxPts = Number(c.maxPoints || c.points || c.weight || c.score || 25);
                            const scoredPts = (userEval && userEval.criteriaScores && userEval.criteriaScores[c.id]) !== undefined
                              ? Number(userEval.criteriaScores[c.id])
                              : (showEvaluatedScore && userEval?.score !== undefined ? Math.round(Number(userEval.score) / stageCriteria.length) : null);

                            return (
                              <div key={c.id || c.name || idx} style={{
                                padding: '0.8rem 1.1rem', borderRadius: '14px',
                                background: '#161f30', border: `1.5px solid ${c.category === 'academic' ? '#0284c7' : '#e11d48'}`,
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                boxShadow: '0 4px 14px rgba(0,0,0,0.2)'
                              }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                                  <span style={{
                                    fontSize: '0.78rem', padding: '0.25rem 0.65rem', borderRadius: '8px',
                                    background: c.category === 'academic' ? '#0284c7' : '#e11d48',
                                    color: '#ffffff', fontWeight: 900
                                  }}>
                                    {c.category === 'academic' ? 'Academic 🎓' : 'SciComm 🎙️'}
                                  </span>
                                  <span style={{ fontWeight: 800, fontSize: '0.95rem', color: '#ffffff' }}>{c.name}</span>
                                </div>
                                <span style={{
                                  fontSize: '0.88rem', fontWeight: 900,
                                  color: showEvaluatedScore ? '#ffffff' : '#0f172a',
                                  background: showEvaluatedScore ? 'linear-gradient(135deg, #059669 0%, #10b981 100%)' : '#f59e0b',
                                  padding: '0.25rem 0.75rem', borderRadius: '8px',
                                  boxShadow: showEvaluatedScore ? '0 2px 10px rgba(16, 185, 129, 0.4)' : '0 2px 8px rgba(245, 158, 11, 0.4)'
                                }}>
                                  {scoredPts !== null ? `⭐ ${scoredPts} / ${maxPts} pts` : `${maxPts} pts`}
                                </span>
                              </div>
                            );
                          });
                        })()}
                      </div>
                    </div>
                  )}

                  {/* Right Box: Assigned Judges */}
                  {activeStep.type === 'stage' && (
                    <div>
                      <div style={{ fontSize: '0.88rem', fontWeight: 900, color: '#ffffff', marginBottom: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '1rem' }}>👥</span> EVALUATION PANEL:
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {(activeStep.assignedJudgeIds || []).length === 0 ? (
                          <span style={{ fontSize: '0.9rem', color: '#94a3b8', fontStyle: 'italic' }}>No judges assigned to this stage yet</span>
                        ) : (
                          (activeStep.assignedJudgeIds || []).map(judgeId => {
                            const judge = scientists.find(u => u.id === judgeId);
                            if (!judge) return null;
                            const roleColor = '#c084fc';
                            const roleLabel = 'Judge';
                            const avatarUrl = judge.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${judge.username || judge.name}`;

                            return (
                              <div key={judgeId} style={{
                                display: 'flex', alignItems: 'center', gap: '0.95rem',
                                background: '#161f30', padding: '0.85rem 1.15rem', borderRadius: '16px',
                                border: `1.5px solid ${roleColor}80`,
                                boxShadow: '0 4px 16px rgba(0,0,0,0.2)', flexWrap: 'wrap'
                              }}>
                                <img
                                  src={avatarUrl}
                                  alt={judge.name}
                                  style={{ width: '46px', height: '46px', borderRadius: '50%', border: `2.5px solid ${roleColor}`, objectFit: 'cover', flexShrink: 0, boxShadow: `0 0 10px ${roleColor}40` }}
                                />
                                <div style={{ flex: 1 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', flexWrap: 'wrap' }}>
                                    <div style={{ fontSize: '0.98rem', fontWeight: 900, color: '#ffffff' }}>{judge.name}</div>
                                    <span style={{ fontSize: '0.7rem', fontWeight: 900, background: `${roleColor}25`, color: roleColor, padding: '0.15rem 0.5rem', borderRadius: '6px', border: `1px solid ${roleColor}60` }}>
                                      {roleLabel}
                                    </span>
                                  </div>
                                  <div style={{ fontSize: '0.8rem', color: '#cbd5e1', marginTop: '0.2rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                                    <span>🎓 {getCleanAcademicTitle(judge)}</span>
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Embedded Workshop Schedule */}
      <div id="workshops-section">
        <WorkshopManager isAdmin={false} isTrainer={false} currentTrack={selectedTrack} />
      </div>
    </div>
  );
}
