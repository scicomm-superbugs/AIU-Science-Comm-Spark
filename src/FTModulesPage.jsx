import { useState, useMemo } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { 
  BookOpen, FileText, ChevronDown, ChevronRight, ExternalLink, Plus, 
  Calendar, Clock, User, CheckCircle2, Search, Layers, GripVertical, 
  Video, Pencil, Trash2, X, Sparkles, Paperclip, Check, AlertCircle, 
  Download, ArrowRightLeft, MoveRight, Award, Send, CheckCircle, Flame
} from 'lucide-react';
import { useAuth } from './context/AuthContext';
import { db, useLiveCollection } from './db';
import { normalizeTrackKey, renderFormattedDescription } from './ftConstants';
import './scicommspark.css';

/**
 * Format exact date and time cleanly without duplicated start/end times
 * e.g. "Thu, Aug 6, 2026 • 5:00 PM" OR "Fri, Aug 21, 2026 • 10:00 PM - 11:00 PM"
 */
function formatExactDateTime(startStr, endStr) {
  if (!startStr) return null;
  const d = new Date(startStr);
  if (isNaN(d.getTime())) return startStr;

  const dateFormatted = d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  const hasTime = String(startStr).includes('T') || String(startStr).includes(':');
  const timeFormatted = hasTime ? d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  }) : '';

  if (endStr && hasTime) {
    const endD = new Date(endStr);
    if (!isNaN(endD.getTime())) {
      const endTime = endD.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
      // ONLY show end time if it is genuinely different from start time and >= 1 minute apart
      if (endTime && endTime !== timeFormatted && Math.abs(endD.getTime() - d.getTime()) >= 60000) {
        return `${dateFormatted} • ${timeFormatted} - ${endTime}`;
      }
    }
  }

  return timeFormatted ? `${dateFormatted} • ${timeFormatted}` : dateFormatted;
}

/**
 * Format date nicely for submission windows
 */
function formatShortDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;

  const datePart = d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  const hasTime = String(dateStr).includes('T') || String(dateStr).includes(':');
  const timePart = hasTime ? d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  }) : '';

  return timePart ? `${datePart}, ${timePart}` : datePart;
}

/**
 * Check if the workshop / session date and time has passed
 */
function isEventPassed(startStr, endStr) {
  if (!startStr) return false;
  try {
    const targetDate = endStr ? new Date(endStr) : new Date(startStr);
    if (isNaN(targetDate.getTime())) return false;
    // If only date (no time specified), consider it passed after 23:59:59 of that day
    if (!String(startStr).includes('T') && !String(startStr).includes(':')) {
      targetDate.setHours(23, 59, 59, 999);
    }
    return new Date() > targetDate;
  } catch {
    return false;
  }
}

// Default Track-Specific Weeks
const DEFAULT_WEEKS_BY_TRACK = {
  pop_science: [
    { weekNumber: 1, weekKey: 'pop_science_week_1', defaultTitle: 'Week 1: Pop Science Foundations & Competition Orientation' },
    { weekNumber: 2, weekKey: 'pop_science_week_2', defaultTitle: 'Week 2: Short Video Scriptwriting & Scientific Storytelling' },
    { weekNumber: 3, weekKey: 'pop_science_week_3', defaultTitle: 'Week 3: On-Camera Delivery, Voice Acting & Mobile Editing' },
    { weekNumber: 4, weekKey: 'pop_science_week_4', defaultTitle: 'Week 4: Long-Form Video Production & Animation Basics' },
    { weekNumber: 5, weekKey: 'pop_science_week_5', defaultTitle: 'Week 5: Grand Finale Stage Performance & Showmanship' }
  ],
  science_journalism: [
    { weekNumber: 1, weekKey: 'science_journalism_week_1', defaultTitle: 'Week 1: Science Journalism Orientation & Topic Scouting' },
    { weekNumber: 2, weekKey: 'science_journalism_week_2', defaultTitle: 'Week 2: Field Research, Expert Interviews & Scientific Storytelling' },
    { weekNumber: 3, weekKey: 'science_journalism_week_3', defaultTitle: 'Week 3: Science Feature Writing & Editorial Ethics' },
    { weekNumber: 4, weekKey: 'science_journalism_week_4', defaultTitle: 'Week 4: Fact-Checking, Digital Publishing & Headline Crafting' },
    { weekNumber: 5, weekKey: 'science_journalism_week_5', defaultTitle: 'Week 5: Live Stage Talk Show & Grand Finale Showcase' }
  ]
};

// Default Official Stage Submissions per Track
const DEFAULT_STAGE_SUBMISSIONS = {
  pop_science: [
    {
      id: 'pop_stage_1',
      stageId: 1,
      isSubmission: true,
      title: 'Stage 1 Official Submission: Short Pop Video',
      sub: 'Reels / TikTok SciComm Video (max 90 seconds)',
      defaultOpenDate: '2026-08-15T00:00',
      defaultDeadline: '2026-09-01T23:59',
      defaultWeek: 2,
      description: 'Produce a punchy, highly engaging 90-second short video introducing a core scientific concept for social media.'
    },
    {
      id: 'pop_stage_2',
      stageId: 2,
      isSubmission: true,
      title: 'Stage 2 Official Submission: Long Pop Video',
      sub: 'YouTube SciComm Video (up to 3 minutes)',
      defaultOpenDate: '2026-09-02T00:00',
      defaultDeadline: '2026-09-20T23:59',
      defaultWeek: 4,
      description: 'Deep scientific storytelling featuring comprehensive explanation, visual graphics, and clear narration.'
    },
    {
      id: 'pop_stage_3',
      stageId: 3,
      isSubmission: true,
      title: 'Stage 3 (Finals): Grand Finale Live Stage Show',
      sub: 'Interactive Live Presentation (5 mins on stage)',
      defaultOpenDate: '2026-09-21T00:00',
      defaultDeadline: '2026-10-10T23:59',
      defaultWeek: 5,
      description: 'Deliver an interactive live science presentation on stage before expert judges, audience, and broadcast.'
    }
  ],
  science_journalism: [
    {
      id: 'jour_stage_1',
      stageId: 1,
      isSubmission: true,
      title: 'Stage 1 Official Submission: Pre-Interview Preparation',
      sub: 'Topic Research, Profile & Field Interview Prep',
      defaultOpenDate: '2026-08-15T00:00',
      defaultDeadline: '2026-09-01T23:59',
      defaultWeek: 2,
      googleFormUrl: 'https://forms.gle/tzgEf9QxBj3nG43S9',
      description: 'Submit your Pre-Interview Preparation document via Google Form demonstrating thorough literature review and interview planning.'
    },
    {
      id: 'jour_stage_2',
      stageId: 2,
      isSubmission: true,
      title: 'Stage 2 Official Submission: Article Publication PDF',
      sub: 'Simplified Science Article Publication',
      defaultOpenDate: '2026-09-02T00:00',
      defaultDeadline: '2026-09-20T23:59',
      defaultWeek: 4,
      description: 'Write and upload a formatted science article PDF document ready for digital publishing and magazine editorial review.'
    },
    {
      id: 'jour_stage_3',
      stageId: 3,
      isSubmission: true,
      title: 'Stage 3 (Finals): Live Talk Show Showcase',
      sub: 'Live Science Talk Show Interview on Stage',
      defaultOpenDate: '2026-09-21T00:00',
      defaultDeadline: '2026-10-10T23:59',
      defaultWeek: 5,
      description: 'Host a simulated live science talk show interview on stage in front of expert judges and public audience.'
    }
  ]
};

export default function FTModulesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const outletContext = useOutletContext();
  
  const scientists = useLiveCollection('scientists') || [];
  const dynamicWorkshops = useLiveCollection('workshops') || [];
  const customWeekTitles = useLiveCollection('ft_week_titles') || [];
  const timelineConfig = useLiveCollection('timeline_config') || [];

  const isAdmin = ['admin', 'master'].includes(user?.role);
  const isTrainer = ['trainer', 'trainer_judge'].includes(user?.role);
  const canManage = isAdmin || isTrainer;

  // Registered track detection
  const meDoc = useMemo(() => scientists.find(s => s.id === user?.id || s.username === user?.username) || user, [scientists, user]);
  const userTrack = normalizeTrackKey(user?.registeredTrack || meDoc?.registeredTrack || user?.track) || 'pop_science';

  // Selected Track Filter
  const [selectedTrack, setSelectedTrack] = useState(userTrack === 'science_journalism' ? 'science_journalism' : 'pop_science');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Accordion Expand/Collapse state: Map of weekKey -> boolean
  const [collapsedWeeks, setCollapsedWeeks] = useState({});

  // Drag and drop state across weeks
  const [draggedItem, setDraggedItem] = useState(null);
  const [dragOverWeekKey, setDragOverWeekKey] = useState(null);

  // Quick Move Modal (for mobile or quick week assignment)
  const [moveModalItem, setMoveModalItem] = useState(null);
  const [targetMoveWeek, setTargetMoveWeek] = useState(1);

  // Editing Week Title state
  const [editingWeekKey, setEditingWeekKey] = useState(null);
  const [editingWeekTitleText, setEditingWeekTitleText] = useState('');
  const [isSavingWeekTitle, setIsSavingWeekTitle] = useState(false);

  // Add New Week Modal State
  const [showAddWeekModal, setShowAddWeekModal] = useState(false);
  const [newWeekNumber, setNewWeekNumber] = useState(1);
  const [newWeekTitle, setNewWeekTitle] = useState('');
  const [isSavingNewWeek, setIsSavingNewWeek] = useState(false);

  const toggleWeek = (weekKey) => {
    setCollapsedWeeks(prev => ({
      ...prev,
      [weekKey]: !prev[weekKey]
    }));
  };

  const collapseAll = (weeks) => {
    const collapsedMap = {};
    weeks.forEach(g => { collapsedMap[g.weekKey] = true; });
    setCollapsedWeeks(collapsedMap);
  };

  const expandAll = () => {
    setCollapsedWeeks({});
  };

  // Build track-specific grouped weeks with automatic workshop mapping, stage submissions, and chronological sorting
  const groupedWeeks = useMemo(() => {
    const normTrack = selectedTrack === 'science_journalism' ? 'science_journalism' : 'pop_science';
    const allItems = [];

    // Check if a workshop matches the currently selected track tab
    const doesWorkshopMatchTrack = (wsTrack) => {
      if (!wsTrack) return true;
      const raw = String(wsTrack).toLowerCase().trim();
      if (raw === 'both' || raw === 'all' || raw === 'both_tracks' || raw === 'all_tracks' || raw.includes('both') || raw.includes('all') || raw === 'common') {
        return true; // Common to both tracks! (e.g. Orientation Lecture)
      }
      if (raw.includes('journal') || raw.includes('article') || raw.includes('news')) {
        return normTrack === 'science_journalism';
      }
      return normTrack === 'pop_science';
    };

    // 1. Map Workshops automatically filtered by this specific track
    (dynamicWorkshops || []).forEach(ws => {
      const rawTarget = ws.targetTrack || ws.trackKey || 'both';
      if (doesWorkshopMatchTrack(rawTarget)) {
        const fileUrl = ws.fileUrl || ws.presentationLink || '';
        const isPassed = isEventPassed(ws.startDate, ws.endDate);
        const normTarget = normalizeTrackKey(rawTarget);

        allItems.push({
          id: ws.id,
          source: 'workshop',
          isSubmission: false,
          title: ws.title,
          weekNumber: Number(ws.weekNumber) || 0,
          fileName: ws.fileName || (fileUrl ? 'Workshop_Materials_Presentation.pdf' : ''),
          fileUrl: fileUrl,
          hasFile: Boolean(fileUrl),
          meetingLink: ws.meetingLink || '',
          type: ws.type || 'Workshop',
          targetTrack: normTarget,
          speakerName: ws.trainerName || ws.speakerName || '',
          startDate: ws.startDate || '',
          endDate: ws.endDate || '',
          isPassed,
          description: ws.description || ''
        });
      }
    });

    // 2. Map Stage Submissions for this track with open and closing dates
    const trackSubmissions = DEFAULT_STAGE_SUBMISSIONS[normTrack] || DEFAULT_STAGE_SUBMISSIONS.pop_science;
    trackSubmissions.forEach(defStage => {
      // Find override in timeline_config
      const custom = timelineConfig.find(c => 
        c.id === defStage.id || 
        (Number(c.stageId) === Number(defStage.stageId) && normalizeTrackKey(c.trackId || c.targetTrack) === normTrack)
      );

      const openDate = custom?.openDate || (custom?.submissions && custom.submissions[0]?.openDate) || defStage.defaultOpenDate;
      let deadline = custom?.deadline || (custom?.submissions && custom.submissions[0]?.deadline) || defStage.defaultDeadline;
      if (deadline && !deadline.includes('T') && deadline !== 'TBD') {
        deadline = `${deadline}T23:59`;
      }

      const now = new Date();
      const openD = openDate ? new Date(openDate) : null;
      const deadD = deadline ? new Date(deadline) : null;

      let windowStatus = 'active'; // 'upcoming' | 'active' | 'closed'
      if (openD && !isNaN(openD.getTime()) && now < openD) {
        windowStatus = 'upcoming';
      } else if (deadD && !isNaN(deadD.getTime()) && now > deadD) {
        windowStatus = 'closed';
      }

      allItems.push({
        id: defStage.id,
        source: 'stage_submission',
        isSubmission: true,
        stageId: defStage.stageId,
        title: custom?.title || defStage.title,
        sub: defStage.sub,
        weekNumber: Number(custom?.weekNumber) || defStage.defaultWeek || defStage.stageId * 2,
        openDate: openDate || '',
        deadline: deadline || '',
        startDate: openDate || '',
        endDate: deadline || '',
        windowStatus,
        isPassed: windowStatus === 'closed',
        targetTrack: normTrack,
        googleFormUrl: custom?.googleFormUrl || (custom?.submissions && custom.submissions[0]?.googleFormUrl) || defStage.googleFormUrl || '',
        acceptSubmissions: custom?.acceptSubmissions !== false,
        description: custom?.details || defStage.description || ''
      });
    });

    // 3. Search query filter
    const searchFiltered = allItems.filter(item => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        item.title.toLowerCase().includes(q) ||
        (item.fileName && item.fileName.toLowerCase().includes(q)) ||
        (item.speakerName && item.speakerName.toLowerCase().includes(q)) ||
        (item.description && item.description.toLowerCase().includes(q))
      );
    });

    // 4. Track-Specific Default Weeks
    const trackDefaultWeeks = DEFAULT_WEEKS_BY_TRACK[normTrack] || DEFAULT_WEEKS_BY_TRACK.pop_science;
    const weekMap = {};

    // Initialize with default weeks for this track unless marked deleted
    trackDefaultWeeks.forEach(w => {
      const customDoc = customWeekTitles.find(c => 
        (c.track === normTrack && Number(c.weekNumber) === Number(w.weekNumber)) ||
        c.id === w.weekKey ||
        c.weekKey === w.weekKey
      );

      if (customDoc?.deleted) return; // Skip deleted week

      weekMap[w.weekKey] = {
        weekNumber: w.weekNumber,
        weekKey: w.weekKey,
        weekTitle: customDoc?.title || w.defaultTitle,
        items: []
      };
    });

    // Add any custom added weeks for THIS SPECIFIC TRACK from Firestore
    customWeekTitles.forEach(c => {
      if (c.deleted) return;
      const cTrack = normalizeTrackKey(c.track || normTrack);
      if (cTrack !== normTrack) return; // Only process weeks belonging to this track!

      const weekKey = c.weekKey || c.id || `${normTrack}_week_${c.weekNumber}`;
      if (!weekMap[weekKey]) {
        weekMap[weekKey] = {
          weekNumber: Number(c.weekNumber) || 1,
          weekKey,
          weekTitle: c.title || `Week ${c.weekNumber}: Learning Modules`,
          items: []
        };
      } else if (c.title) {
        weekMap[weekKey].weekTitle = c.title;
      }
    });

    // 5. Distribute workshops & submissions into this track's week groups
    searchFiltered.forEach(item => {
      let weekNum = item.weekNumber;

      // If item has no explicit weekNumber, automatically calculate from date relative to Aug 1
      if (!weekNum && item.startDate) {
        try {
          const itemDate = new Date(item.startDate);
          const compStart = new Date('2026-08-01');
          const diffDays = Math.floor((itemDate - compStart) / (1000 * 60 * 60 * 24));
          if (diffDays >= 0) {
            weekNum = Math.min(6, Math.floor(diffDays / 7) + 1);
          } else {
            weekNum = 1;
          }
        } catch {
          weekNum = 1;
        }
      }

      if (!weekNum) weekNum = 1;

      const weekKey = `${normTrack}_week_${weekNum}`;
      if (!weekMap[weekKey]) {
        const customTitleDoc = customWeekTitles.find(c => 
          (c.track === normTrack && Number(c.weekNumber) === Number(weekNum)) ||
          c.id === weekKey ||
          c.weekKey === weekKey
        );
        weekMap[weekKey] = {
          weekNumber: weekNum,
          weekKey,
          weekTitle: customTitleDoc?.title || `Week ${weekNum}: Training & Submissions`,
          items: []
        };
      }

      weekMap[weekKey].items.push(item);
    });

    // 6. Sort weeks by weekNumber
    const result = Object.values(weekMap).sort((a, b) => a.weekNumber - b.weekNumber);

    // 7. Sort items within each week chronologically by date and time
    result.forEach(w => {
      w.items.sort((a, b) => new Date(a.startDate || 0) - new Date(b.startDate || 0));
    });

    return result;
  }, [dynamicWorkshops, customWeekTitles, timelineConfig, selectedTrack, searchQuery]);

  // ── DRAG AND DROP HANDLERS ACROSS WEEKS ──────────────────────────────
  const handleDragStart = (e, item) => {
    if (!canManage) return;
    setDraggedItem(item);
    e.dataTransfer.setData('text/plain', JSON.stringify({ id: item.id, source: item.source, weekNumber: item.weekNumber }));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOverWeek = (e, weekKey) => {
    if (!canManage || !draggedItem) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverWeekKey !== weekKey) {
      setDragOverWeekKey(weekKey);
    }
  };

  const handleDragLeaveWeek = (e, weekKey) => {
    if (dragOverWeekKey === weekKey) {
      setDragOverWeekKey(null);
    }
  };

  const handleDropOnWeek = async (e, targetWeekNum, targetWeekKey) => {
    e.preventDefault();
    setDragOverWeekKey(null);
    if (!draggedItem || !canManage) return;

    if (draggedItem.weekNumber === targetWeekNum) {
      setDraggedItem(null);
      return;
    }

    try {
      const updatePayload = {
        weekNumber: Number(targetWeekNum),
        updatedAt: new Date().toISOString()
      };
      if (draggedItem.isSubmission) {
        await db.timeline_config.set(draggedItem.id, updatePayload);
      } else {
        await db.workshops.update(draggedItem.id, updatePayload);
      }
    } catch (err) {
      alert('Failed to move item: ' + err.message);
    } finally {
      setDraggedItem(null);
    }
  };

  // Quick Move to Week (for mobile)
  const handleConfirmQuickMove = async (e) => {
    e.preventDefault();
    if (!moveModalItem) return;
    try {
      const updatePayload = {
        weekNumber: Number(targetMoveWeek),
        updatedAt: new Date().toISOString()
      };
      if (moveModalItem.isSubmission) {
        await db.timeline_config.set(moveModalItem.id, updatePayload);
      } else {
        await db.workshops.update(moveModalItem.id, updatePayload);
      }
      setMoveModalItem(null);
    } catch (err) {
      alert('Failed to move: ' + err.message);
    }
  };

  // Handle Saving Custom Week Title for Selected Track
  const handleSaveWeekTitle = async (weekKey, weekNumber) => {
    if (!editingWeekTitleText.trim()) return;
    setIsSavingWeekTitle(true);
    try {
      const docId = `${selectedTrack}_week_${weekNumber}`;
      await db.ft_week_titles.set(docId, {
        id: docId,
        weekKey: docId,
        track: selectedTrack,
        weekNumber: Number(weekNumber),
        title: editingWeekTitleText.trim(),
        deleted: false,
        updatedAt: new Date().toISOString(),
        updatedBy: user?.username || user?.email || 'admin'
      });
      setEditingWeekKey(null);
    } catch (err) {
      alert('Failed to update week title: ' + err.message);
    } finally {
      setIsSavingWeekTitle(false);
    }
  };

  // Open Add New Week Modal for Selected Track
  const handleOpenAddWeekModal = () => {
    const maxWeek = groupedWeeks.reduce((max, w) => Math.max(max, w.weekNumber), 0);
    const nextNum = maxWeek + 1;
    setNewWeekNumber(nextNum);
    const trackLabel = selectedTrack === 'pop_science' ? 'Pop Science' : 'Science Journalism';
    setNewWeekTitle(`Week ${nextNum}: ${trackLabel} Modules`);
    setShowAddWeekModal(true);
  };

  // Handle Creating New Week for Selected Track
  const handleCreateNewWeek = async (e) => {
    e.preventDefault();
    if (!newWeekTitle.trim()) return;
    setIsSavingNewWeek(true);
    try {
      const docId = `${selectedTrack}_week_${newWeekNumber}`;
      await db.ft_week_titles.set(docId, {
        id: docId,
        weekKey: docId,
        track: selectedTrack,
        weekNumber: Number(newWeekNumber),
        title: newWeekTitle.trim(),
        deleted: false,
        updatedAt: new Date().toISOString(),
        updatedBy: user?.username || user?.email || 'admin'
      });
      setShowAddWeekModal(false);
      setNewWeekTitle('');
    } catch (err) {
      alert('Failed to create week: ' + err.message);
    } finally {
      setIsSavingNewWeek(false);
    }
  };

  // Handle Deleting a Week from Selected Track
  const handleDeleteWeek = async (weekGroup) => {
    const trackName = selectedTrack === 'pop_science' ? 'Track 1 (Pop Science)' : 'Track 2 (Science Journalism)';
    if (!window.confirm(`Are you sure you want to delete "${weekGroup.weekTitle}" from ${trackName}?`)) return;

    try {
      // Reassign any workshops in this week to week 1 so they are not lost
      const workshopsInThisWeek = dynamicWorkshops.filter(ws => (Number(ws.weekNumber) || 1) === weekGroup.weekNumber);
      for (const ws of workshopsInThisWeek) {
        await db.workshops.update(ws.id, { weekNumber: 1, updatedAt: new Date().toISOString() });
      }

      // Mark week as deleted in Firestore for this track
      const docId = `${selectedTrack}_week_${weekGroup.weekNumber}`;
      await db.ft_week_titles.set(docId, {
        id: docId,
        weekKey: docId,
        track: selectedTrack,
        weekNumber: weekGroup.weekNumber,
        title: weekGroup.weekTitle,
        deleted: true,
        updatedAt: new Date().toISOString()
      });
    } catch (err) {
      alert('Failed to delete week: ' + err.message);
    }
  };

  return (
    <div className="lms-modules-container">
      {/* ── TOP LMS HEADER CARD ──────────────────────────────── */}
      <div className="lms-header-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.25rem' }}>
          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: 900, textTransform: 'uppercase', color: '#be123c', letterSpacing: '0.08em', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Sparkles size={15} /> AIU SciComm Spark LMS
            </div>
            <h1 style={{ fontSize: '1.85rem', fontWeight: 900, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <BookOpen size={28} style={{ color: '#be123c' }} /> Course Modules & Submissions
            </h1>
            <p style={{ fontSize: '0.9rem', color: '#64748b', margin: '0.35rem 0 0 0', fontWeight: 600 }}>
              Track-specific learning modules, live workshops, and official stage submission windows.
            </p>
          </div>

          {/* Action Buttons & Controls: Add Week & Collapse */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => Object.keys(collapsedWeeks).length > 0 ? expandAll() : collapseAll(groupedWeeks)}
              style={{
                padding: '0.6rem 1.1rem', borderRadius: '12px', background: '#f8fafc',
                border: '1.5px solid #cbd5e1', color: '#334155', fontWeight: 800, fontSize: '0.85rem',
                cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                transition: 'all 0.2s ease'
              }}
            >
              <Layers size={16} /> {Object.keys(collapsedWeeks).length > 0 ? 'Expand All Weeks' : 'Collapse All'}
            </button>

            {canManage && (
              <button
                type="button"
                onClick={handleOpenAddWeekModal}
                style={{
                  padding: '0.65rem 1.25rem', borderRadius: '12px',
                  background: 'linear-gradient(135deg, #be123c 0%, #e11d48 100%)',
                  color: '#ffffff', fontWeight: 900, fontSize: '0.88rem', border: 'none',
                  cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.45rem',
                  boxShadow: '0 4px 16px rgba(190, 18, 60, 0.35)'
                }}
              >
                <Plus size={18} /> + Add Week to {selectedTrack === 'pop_science' ? 'Track 1' : 'Track 2'}
              </button>
            )}
          </div>
        </div>

        {/* Search Bar & Track Buttons */}
        <div style={{ marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '1px dashed #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          
          {/* 2 Track Selector Buttons */}
          <div className="lms-track-btn-group" style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setSelectedTrack('pop_science')}
              style={{
                padding: '0.6rem 1.2rem', borderRadius: '14px', fontWeight: 900, fontSize: '0.88rem',
                border: `2px solid ${selectedTrack === 'pop_science' ? '#be123c' : '#cbd5e1'}`,
                background: selectedTrack === 'pop_science' ? 'linear-gradient(135deg, #be123c 0%, #e11d48 100%)' : '#ffffff',
                color: selectedTrack === 'pop_science' ? '#ffffff' : '#334155',
                cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                boxShadow: selectedTrack === 'pop_science' ? '0 4px 14px rgba(190, 18, 60, 0.3)' : 'none',
                transition: 'all 0.2s ease'
              }}
            >
              <span>🎥 Track 1: Pop Science Videos</span>
              {userTrack === 'pop_science' && (
                <span style={{
                  fontSize: '0.68rem', fontWeight: 900, padding: '0.15rem 0.5rem', borderRadius: '8px',
                  background: selectedTrack === 'pop_science' ? '#ffffff' : '#fef2f2',
                  color: selectedTrack === 'pop_science' ? '#be123c' : '#dc2626',
                  border: `1px solid ${selectedTrack === 'pop_science' ? '#fecdd3' : '#fca5a5'}`
                }}>
                  Your Track 🎯
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setSelectedTrack('science_journalism')}
              style={{
                padding: '0.6rem 1.2rem', borderRadius: '14px', fontWeight: 900, fontSize: '0.88rem',
                border: `2px solid ${selectedTrack === 'science_journalism' ? '#be123c' : '#cbd5e1'}`,
                background: selectedTrack === 'science_journalism' ? 'linear-gradient(135deg, #be123c 0%, #e11d48 100%)' : '#ffffff',
                color: selectedTrack === 'science_journalism' ? '#ffffff' : '#334155',
                cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                boxShadow: selectedTrack === 'science_journalism' ? '0 4px 14px rgba(190, 18, 60, 0.3)' : 'none',
                transition: 'all 0.2s ease'
              }}
            >
              <span>📰 Track 2: Science Journalism</span>
              {userTrack === 'science_journalism' && (
                <span style={{
                  fontSize: '0.68rem', fontWeight: 900, padding: '0.15rem 0.5rem', borderRadius: '8px',
                  background: selectedTrack === 'science_journalism' ? '#ffffff' : '#fef2f2',
                  color: selectedTrack === 'science_journalism' ? '#be123c' : '#dc2626',
                  border: `1px solid ${selectedTrack === 'science_journalism' ? '#fecdd3' : '#fca5a5'}`
                }}>
                  Your Track 🎯
                </span>
              )}
            </button>
          </div>

          {/* Search Box */}
          <div className="lms-search-box-wrapper" style={{ position: 'relative', width: '280px' }}>
            <Search size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder={`Search ${selectedTrack === 'pop_science' ? 'Track 1' : 'Track 2'} modules...`}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                width: '100%', padding: '0.55rem 0.85rem 0.55rem 2.4rem', borderRadius: '12px',
                border: '1.5px solid #cbd5e1', fontSize: '0.85rem', fontWeight: 600,
                outline: 'none', background: '#f8fafc', color: '#0f172a', boxSizing: 'border-box'
              }}
            />
          </div>
        </div>

        {canManage && (
          <div style={{ marginTop: '0.75rem', fontSize: '0.78rem', color: '#64748b', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
            <span>💡 <strong>Track-Isolated View:</strong> {selectedTrack === 'pop_science' ? 'Track 1 (Pop Science Videos)' : 'Track 2 (Science Journalism)'} displays its matching workshops and official stage submission deadlines.</span>
          </div>
        )}
      </div>

      {/* ── CANVAS LMS STYLE ACCORDION MODULE GROUPS ──────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {groupedWeeks.map((weekGroup) => {
          const isCollapsed = Boolean(collapsedWeeks[weekGroup.weekKey]);
          const itemCount = weekGroup.items.length;
          const isEditingThisTitle = editingWeekKey === weekGroup.weekKey;
          const isWeekDragTarget = dragOverWeekKey === weekGroup.weekKey;

          return (
            <div
              key={weekGroup.weekKey}
              className={`lms-week-card ${isWeekDragTarget ? 'lms-week-drag-over' : ''}`}
              onDragOver={(e) => handleDragOverWeek(e, weekGroup.weekKey)}
              onDragLeave={(e) => handleDragLeaveWeek(e, weekGroup.weekKey)}
              onDrop={(e) => handleDropOnWeek(e, weekGroup.weekNumber, weekGroup.weekKey)}
            >
              {/* Accordion Week Header */}
              <div
                className="lms-week-header"
                style={{
                  padding: '1.1rem 1.5rem', background: isWeekDragTarget ? '#fff1f2' : '#f8fafc',
                  borderBottom: isCollapsed ? 'none' : '1px solid #e2e8f0',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem',
                  userSelect: 'none'
                }}
              >
                {/* Left Week Title & Controls */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: '240px' }}>
                  <div
                    onClick={() => toggleWeek(weekGroup.weekKey)}
                    style={{
                      width: '24px', height: '24px', borderRadius: '50%', background: isCollapsed ? '#cbd5e1' : '#be123c',
                      color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer', transition: 'transform 0.2s ease', flexShrink: 0
                    }}
                  >
                    {isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                  </div>

                  {/* Inline Week Title Editing */}
                  {isEditingThisTitle ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, flexWrap: 'wrap' }} onClick={e => e.stopPropagation()}>
                      <input
                        type="text"
                        value={editingWeekTitleText}
                        onChange={e => setEditingWeekTitleText(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') handleSaveWeekTitle(weekGroup.weekKey, weekGroup.weekNumber);
                          if (e.key === 'Escape') setEditingWeekKey(null);
                        }}
                        autoFocus
                        style={{
                          fontSize: '1rem', fontWeight: 900, color: '#0f172a', padding: '0.35rem 0.75rem',
                          borderRadius: '8px', border: '2px solid #be123c', outline: 'none', background: '#ffffff',
                          width: '100%', maxWidth: '380px'
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveWeekTitle(weekGroup.weekKey, weekGroup.weekNumber)}
                        disabled={isSavingWeekTitle}
                        style={{
                          background: '#059669', color: '#ffffff', border: 'none', borderRadius: '8px',
                          padding: '0.4rem 0.75rem', fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer',
                          display: 'inline-flex', alignItems: 'center', gap: '0.3rem'
                        }}
                      >
                        <Check size={14} /> Save
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingWeekKey(null)}
                        style={{
                          background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '8px',
                          padding: '0.4rem 0.65rem', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer'
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <h3
                        className="lms-week-title"
                        onClick={() => toggleWeek(weekGroup.weekKey)}
                        style={{ fontSize: '1.12rem', fontWeight: 900, color: '#0f172a', margin: 0, cursor: 'pointer', lineHeight: 1.3 }}
                      >
                        {weekGroup.weekTitle}
                      </h3>

                      {canManage && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingWeekKey(weekGroup.weekKey);
                            setEditingWeekTitleText(weekGroup.weekTitle);
                          }}
                          title={`Edit Week Title for ${selectedTrack === 'pop_science' ? 'Track 1' : 'Track 2'}`}
                          style={{
                            background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px',
                            color: '#be123c', padding: '0.2rem 0.45rem', fontSize: '0.72rem', fontWeight: 800,
                            cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                          }}
                        >
                          <Pencil size={12} /> Edit Title
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Right Badges, Item Count & Delete Week Control */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <span style={{
                    fontSize: '0.78rem', fontWeight: 800, padding: '0.22rem 0.65rem', borderRadius: '8px',
                    background: itemCount > 0 ? '#eff6ff' : '#f1f5f9', color: itemCount > 0 ? '#2563eb' : '#64748b',
                    border: `1px solid ${itemCount > 0 ? '#bfdbfe' : '#cbd5e1'}`
                  }}>
                    {itemCount} {itemCount === 1 ? 'Item' : 'Items'}
                  </span>

                  {canManage && (
                    <button
                      type="button"
                      onClick={() => handleDeleteWeek(weekGroup)}
                      title={`Delete this week from ${selectedTrack === 'pop_science' ? 'Track 1' : 'Track 2'}`}
                      style={{
                        background: '#fef2f2', border: '1px solid #fecdd3', color: '#dc2626',
                        width: '32px', height: '32px', borderRadius: '8px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
                      }}
                    >
                      <Trash2 size={13} />
                    </button>
                  )}

                  <CheckCircle2 size={18} style={{ color: itemCount > 0 ? '#059669' : '#cbd5e1' }} />
                </div>
              </div>

              {/* Accordion Week Body */}
              {!isCollapsed && (
                <div>
                  {itemCount === 0 ? (
                    <div style={{ padding: '2.5rem 1.5rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.88rem', fontStyle: 'italic', fontWeight: 600 }}>
                      No workshops or submissions scheduled for this week in {selectedTrack === 'pop_science' ? 'Track 1 (Pop Science)' : 'Track 2 (Science Journalism)'} yet.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      {weekGroup.items.map((item, idx) => {
                        const isThisItemDragged = draggedItem?.id === item.id;

                        // ── RENDERING SUBMISSION ITEM ──
                        if (item.isSubmission) {
                          const openDateFormatted = formatShortDate(item.openDate);
                          const deadlineFormatted = formatShortDate(item.deadline);
                          const isClosed = item.windowStatus === 'closed';
                          const isUpcoming = item.windowStatus === 'upcoming';
                          const isActive = item.windowStatus === 'active';

                          return (
                            <div
                              key={item.id || idx}
                              draggable={canManage}
                              onDragStart={(e) => handleDragStart(e, item)}
                              onDragEnd={() => setDraggedItem(null)}
                              className={isThisItemDragged ? 'lms-item-drag-active' : ''}
                              style={{
                                borderBottom: idx === itemCount - 1 ? 'none' : '1px solid #f1f5f9',
                                background: isClosed ? '#fcfcfd' : 'linear-gradient(135deg, #ffffff 0%, #faf5ff 100%)',
                                transition: 'all 0.15s ease'
                              }}
                            >
                              <div
                                className="lms-item-row"
                                style={{
                                  opacity: isClosed ? 0.75 : 1,
                                  borderLeft: `4px solid ${isClosed ? '#94a3b8' : isActive ? '#059669' : '#8b5cf6'}`
                                }}
                              >
                                {/* Left Info Column */}
                                <div className="lms-item-left-info" style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem', flex: 1, minWidth: '260px' }}>
                                  {/* Drag Grip Handle */}
                                  {canManage && (
                                    <div
                                      className="lms-drag-grip"
                                      title="Click & Drag submission milestone across weeks"
                                      style={{ marginTop: '0.2rem', flexShrink: 0 }}
                                    >
                                      <GripVertical size={18} />
                                    </div>
                                  )}

                                  {/* Submission Icon Box */}
                                  <div style={{
                                    width: '42px', height: '42px', borderRadius: '12px',
                                    background: isClosed ? '#f1f5f9' : isActive ? '#ecfdf5' : '#f5f3ff',
                                    border: `1.5px solid ${isClosed ? '#cbd5e1' : isActive ? '#a7f3d0' : '#ddd6fe'}`,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                                  }}>
                                    <Award size={21} style={{ color: isClosed ? '#94a3b8' : isActive ? '#059669' : '#7c3aed' }} />
                                  </div>

                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    {/* Title, Official Submission Badge, Window Status Badge */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.35rem' }}>
                                      <span style={{
                                        fontSize: '1.05rem', fontWeight: 900,
                                        color: isClosed ? '#64748b' : '#1e1b4b',
                                        textDecoration: isClosed ? 'line-through' : 'none',
                                        lineHeight: 1.35, wordBreak: 'break-word'
                                      }}>
                                        {item.title}
                                      </span>

                                      <span style={{
                                        fontSize: '0.68rem', fontWeight: 900, padding: '0.18rem 0.6rem', borderRadius: '6px',
                                        background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
                                        color: '#ffffff', boxShadow: '0 2px 6px rgba(124, 58, 237, 0.25)'
                                      }}>
                                        📝 Stage Submission
                                      </span>

                                      {/* Window Status Badge */}
                                      {isActive && (
                                        <span style={{
                                          fontSize: '0.68rem', fontWeight: 900, padding: '0.15rem 0.55rem', borderRadius: '6px',
                                          background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0',
                                          display: 'inline-flex', alignItems: 'center', gap: '0.3rem'
                                        }}>
                                          <Flame size={12} /> Submissions Open Now
                                        </span>
                                      )}

                                      {isUpcoming && (
                                        <span style={{
                                          fontSize: '0.68rem', fontWeight: 900, padding: '0.15rem 0.55rem', borderRadius: '6px',
                                          background: '#fffbeb', color: '#d97706', border: '1px solid #fde68a',
                                          display: 'inline-flex', alignItems: 'center', gap: '0.3rem'
                                        }}>
                                          <Clock size={12} /> Upcoming Window
                                        </span>
                                      )}

                                      {isClosed && (
                                        <span style={{
                                          fontSize: '0.68rem', fontWeight: 900, padding: '0.15rem 0.55rem', borderRadius: '6px',
                                          background: '#f1f5f9', color: '#64748b', border: '1px solid #cbd5e1'
                                        }}>
                                          🏁 Submission Closed
                                        </span>
                                      )}
                                    </div>

                                    {/* Subtitle / Format */}
                                    {item.sub && (
                                      <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#475569', marginBottom: '0.4rem' }}>
                                        {item.sub}
                                      </div>
                                    )}

                                    {/* Open Date & Closing Deadline Dates */}
                                    <div style={{
                                      display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap',
                                      background: '#ffffff', padding: '0.45rem 0.85rem', borderRadius: '10px',
                                      border: '1px solid #e2e8f0', width: 'fit-content', marginTop: '0.35rem'
                                    }}>
                                      {openDateFormatted && (
                                        <span style={{ fontSize: '0.8rem', color: '#059669', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                                          <Calendar size={14} /> Opens: <strong>{openDateFormatted}</strong>
                                        </span>
                                      )}

                                      {deadlineFormatted && (
                                        <span style={{ fontSize: '0.8rem', color: isClosed ? '#94a3b8' : '#be123c', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                                          <Clock size={14} /> Deadline: <strong>{deadlineFormatted}</strong>
                                        </span>
                                      )}
                                    </div>

                                    {/* Description */}
                                    {item.description && (
                                      <div style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '0.45rem', lineHeight: 1.45 }} dir="auto">
                                        {renderFormattedDescription(item.description)}
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Right Action Button for Submission */}
                                <div className="lms-item-actions-wrapper" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                                  {/* Direct Submission Action */}
                                  {item.googleFormUrl ? (
                                    <a
                                      href={item.googleFormUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      style={{
                                        background: isClosed ? '#94a3b8' : 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
                                        color: '#ffffff', padding: '0.55rem 1rem', borderRadius: '10px',
                                        fontSize: '0.82rem', fontWeight: 900, textDecoration: 'none',
                                        display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                                        boxShadow: isClosed ? 'none' : '0 3px 12px rgba(124, 58, 237, 0.3)',
                                        pointerEvents: isClosed ? 'none' : 'auto'
                                      }}
                                    >
                                      <Send size={14} /> Submit via Form <ExternalLink size={14} />
                                    </a>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => navigate('/app/my-competition')}
                                      style={{
                                        background: isClosed ? '#94a3b8' : 'linear-gradient(135deg, #be123c 0%, #e11d48 100%)',
                                        color: '#ffffff', padding: '0.55rem 1rem', borderRadius: '10px',
                                        fontSize: '0.82rem', fontWeight: 900, border: 'none', cursor: 'pointer',
                                        display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                                        boxShadow: isClosed ? 'none' : '0 3px 12px rgba(190, 18, 60, 0.3)'
                                      }}
                                    >
                                      <Send size={14} /> {isClosed ? 'View Submission' : 'Go to Submit 🚀'}
                                    </button>
                                  )}

                                  {/* Admin Move to Week */}
                                  {canManage && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setMoveModalItem(item);
                                        setTargetMoveWeek(item.weekNumber || 1);
                                      }}
                                      title="Move submission milestone to another week"
                                      style={{
                                        background: '#f8fafc', border: '1px solid #cbd5e1', color: '#334155',
                                        height: '34px', padding: '0 0.55rem', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 800,
                                        display: 'inline-flex', alignItems: 'center', gap: '0.25rem', cursor: 'pointer'
                                      }}
                                    >
                                      <ArrowRightLeft size={13} /> Move
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        }

                        // ── RENDERING WORKSHOP ITEM ──
                        const formattedTime = formatExactDateTime(item.startDate, item.endDate);
                        const isPassed = item.isPassed;

                        return (
                          <div
                            key={item.id || idx}
                            draggable={canManage}
                            onDragStart={(e) => handleDragStart(e, item)}
                            onDragEnd={() => setDraggedItem(null)}
                            className={isThisItemDragged ? 'lms-item-drag-active' : ''}
                            style={{
                              borderBottom: idx === itemCount - 1 ? 'none' : '1px solid #f1f5f9',
                              background: isPassed ? '#fcfcfd' : '#ffffff',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            {/* ── WORKSHOP MAIN ROW ── */}
                            <div
                              className="lms-item-row"
                              style={{
                                opacity: isPassed ? 0.72 : 1
                              }}
                            >
                              {/* Left Info Column */}
                              <div className="lms-item-left-info" style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem', flex: 1, minWidth: '260px' }}>
                                
                                {/* Drag Grip Handle (Desktop & Mobile) */}
                                {canManage && (
                                  <div
                                    className="lms-drag-grip"
                                    title="Click & Drag to move workshop across weeks"
                                    style={{ marginTop: '0.2rem', flexShrink: 0 }}
                                  >
                                    <GripVertical size={18} />
                                  </div>
                                )}

                                {/* Icon Box */}
                                <div style={{
                                  width: '40px', height: '40px', borderRadius: '12px',
                                  background: isPassed ? '#f1f5f9' : item.meetingLink ? '#ecfdf5' : '#eff6ff',
                                  border: `1.5px solid ${isPassed ? '#cbd5e1' : item.meetingLink ? '#a7f3d0' : '#bfdbfe'}`,
                                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                                }}>
                                  {item.meetingLink ? (
                                    <Video size={19} style={{ color: isPassed ? '#94a3b8' : '#059669' }} />
                                  ) : (
                                    <BookOpen size={19} style={{ color: isPassed ? '#94a3b8' : '#be123c' }} />
                                  )}
                                </div>

                                <div style={{ flex: 1, minWidth: 0 }}>
                                  {/* Title & Passed Badge */}
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.25rem' }}>
                                    <span style={{
                                      fontSize: '1.02rem', fontWeight: 900,
                                      color: isPassed ? '#64748b' : '#0f172a',
                                      textDecoration: isPassed ? 'line-through' : 'none',
                                      lineHeight: 1.35, wordBreak: 'break-word'
                                    }}>
                                      {item.title}
                                    </span>

                                    {/* Passed / Past Session Status Badge */}
                                    {isPassed && (
                                      <span style={{
                                        fontSize: '0.68rem', fontWeight: 900, padding: '0.15rem 0.55rem', borderRadius: '6px',
                                        background: '#f1f5f9', color: '#64748b', border: '1px solid #cbd5e1',
                                        display: 'inline-flex', alignItems: 'center', gap: '0.25rem'
                                      }}>
                                        🏁 Past Session
                                      </span>
                                    )}
                                  </div>

                                  {/* Exact Date & Time, Speaker Subtitle (No Duplicate Time!) */}
                                  <div style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.85rem', flexWrap: 'wrap', marginTop: '0.2rem' }}>
                                    {item.speakerName && (
                                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                                        <User size={13} style={{ color: '#be123c' }} />
                                        <span>Speaker: <strong>{item.speakerName}</strong></span>
                                      </span>
                                    )}

                                    {formattedTime && (
                                      <span style={{
                                        display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                                        color: isPassed ? '#94a3b8' : '#0284c7', fontWeight: 800,
                                        textDecoration: isPassed ? 'line-through' : 'none'
                                      }}>
                                        <Clock size={13} />
                                        <span>{formattedTime}</span>
                                      </span>
                                    )}
                                  </div>

                                  {/* Formatted Description */}
                                  {item.description && (
                                    <div style={{ fontSize: '0.82rem', color: isPassed ? '#94a3b8' : '#475569', marginTop: '0.4rem', lineHeight: 1.45 }} dir="auto">
                                      {renderFormattedDescription(item.description)}
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Right Action Controls for Workshop */}
                              <div className="lms-item-actions-wrapper" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                                {/* Join Live Session Button (if meetingLink exists and NOT passed) */}
                                {item.meetingLink && !isPassed && (
                                  <a
                                    href={item.meetingLink}
                                    target="_blank"
                                    rel="noreferrer"
                                    style={{
                                      background: '#059669', color: '#ffffff', padding: '0.5rem 0.9rem', borderRadius: '10px',
                                      fontSize: '0.82rem', fontWeight: 900, textDecoration: 'none',
                                      display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                                      boxShadow: '0 3px 10px rgba(5, 150, 105, 0.25)'
                                    }}
                                  >
                                    Join Live Session <ExternalLink size={14} />
                                  </a>
                                )}

                                {item.meetingLink && isPassed && (
                                  <span style={{
                                    fontSize: '0.76rem', color: '#94a3b8', background: '#f1f5f9',
                                    border: '1px solid #e2e8f0', padding: '0.35rem 0.65rem', borderRadius: '8px',
                                    fontWeight: 700
                                  }}>
                                    Live Session Ended
                                  </span>
                                )}

                                <CheckCircle2 size={18} style={{ color: isPassed ? '#94a3b8' : '#059669' }} />

                                {/* Admin Quick Reassignment */}
                                {canManage && (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginLeft: '0.3rem', borderLeft: '1px solid #e2e8f0', paddingLeft: '0.4rem' }}>
                                    {/* Quick Move to Week Button */}
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setMoveModalItem(item);
                                        setTargetMoveWeek(item.weekNumber || 1);
                                      }}
                                      title="Move workshop to another week"
                                      style={{
                                        background: '#f8fafc', border: '1px solid #cbd5e1', color: '#334155',
                                        height: '32px', padding: '0 0.55rem', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 800,
                                        display: 'inline-flex', alignItems: 'center', gap: '0.25rem', cursor: 'pointer'
                                      }}
                                    >
                                      <ArrowRightLeft size={13} /> Move
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* ── DEDICATED ATTACHED RESOURCE FILE CARD (ALWAYS ACCESSIBLE & NOT DIMMED!) ── */}
                            {item.hasFile && (
                              <div className="lms-attached-file-card">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: '220px' }}>
                                  <div style={{
                                    width: '36px', height: '36px', borderRadius: '10px',
                                    background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
                                    border: '1.5px solid #93c5fd',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                                  }}>
                                    <FileText size={18} style={{ color: '#2563eb' }} />
                                  </div>

                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                                      <span style={{ fontSize: '0.92rem', fontWeight: 900, color: '#0f172a', wordBreak: 'break-word' }}>
                                        {item.fileName || 'Lecture_Presentation_Materials.pdf'}
                                      </span>
                                      <span style={{
                                        fontSize: '0.65rem', fontWeight: 900, padding: '0.12rem 0.45rem', borderRadius: '6px',
                                        background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0'
                                      }}>
                                        Available Material 📄
                                      </span>
                                    </div>
                                    <div style={{ fontSize: '0.76rem', color: '#64748b', fontWeight: 700, marginTop: '0.15rem' }}>
                                      Permanent Lecture Slides & Handout Resources (Always Accessible)
                                    </div>
                                  </div>
                                </div>

                                {/* Right Download / Open File Button */}
                                <div className="lms-attached-file-actions">
                                  <a
                                    href={item.fileUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    style={{
                                      background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                                      color: '#ffffff', padding: '0.48rem 1rem', borderRadius: '10px',
                                      fontSize: '0.82rem', fontWeight: 900, textDecoration: 'none',
                                      display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                                      boxShadow: '0 3px 12px rgba(37, 99, 235, 0.28)'
                                    }}
                                  >
                                    Open File <ExternalLink size={14} />
                                  </a>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── ADD NEW WEEK MODAL (TRACK-SPECIFIC) ────────────────────── */}
      {showAddWeekModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 99999, padding: '0.75rem'
        }}>
          <div style={{
            background: '#ffffff', borderRadius: '22px', width: '100%', maxWidth: '520px',
            padding: '1.75rem', boxShadow: '0 25px 60px rgba(0,0,0,0.25)', position: 'relative'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h2 style={{ fontSize: '1.3rem', fontWeight: 900, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Plus size={22} style={{ color: '#be123c' }} /> Add Week to {selectedTrack === 'pop_science' ? 'Track 1 (Pop Science)' : 'Track 2 (Science Journalism)'}
                </h2>
                <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '0.25rem 0 0 0', fontWeight: 600 }}>
                  This week will be created exclusively for {selectedTrack === 'pop_science' ? 'Track 1' : 'Track 2'}.
                </p>
              </div>
              <button
                onClick={() => setShowAddWeekModal(false)}
                style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateNewWeek} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
              <div>
                <label className="ft-label">Week Number *</label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  className="ft-input"
                  value={newWeekNumber}
                  onChange={e => setNewWeekNumber(Number(e.target.value))}
                  required
                />
              </div>

              <div>
                <label className="ft-label">Week Title / Description *</label>
                <input
                  type="text"
                  className="ft-input"
                  placeholder={selectedTrack === 'pop_science' ? 'e.g. Week 6: Advanced Editing & Visual Effects' : 'e.g. Week 6: Investigative Journalism & Long-Form Articles'}
                  value={newWeekTitle}
                  onChange={e => setNewWeekTitle(e.target.value)}
                  required
                />
              </div>

              <div style={{ background: '#eff6ff', padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid #bfdbfe', fontSize: '0.8rem', color: '#1e40af', fontWeight: 600 }}>
                💡 Workshops and submissions tagged for {selectedTrack === 'pop_science' ? 'Track 1' : 'Track 2'} will automatically flow into this week.
              </div>

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button type="button" className="ft-btn ft-btn-outline" onClick={() => setShowAddWeekModal(false)}>Cancel</button>
                <button type="submit" className="ft-btn ft-btn-primary" disabled={isSavingNewWeek}>
                  {isSavingNewWeek ? 'Creating...' : `+ Create Week for ${selectedTrack === 'pop_science' ? 'Track 1' : 'Track 2'}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── QUICK MOVE TO WEEK MODAL (FOR MOBILE & FAST REASSIGNMENT) ──── */}
      {moveModalItem && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 99999, padding: '0.75rem'
        }}>
          <div style={{
            background: '#ffffff', borderRadius: '22px', width: '100%', maxWidth: '460px',
            padding: '1.75rem', boxShadow: '0 25px 60px rgba(0,0,0,0.25)', position: 'relative'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <ArrowRightLeft size={20} style={{ color: '#be123c' }} /> Move Item to Week
                </h2>
                <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '0.25rem 0 0 0', fontWeight: 600 }}>
                  Item: <strong>{moveModalItem.title}</strong>
                </p>
              </div>
              <button
                onClick={() => setMoveModalItem(null)}
                style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleConfirmQuickMove} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
              <div>
                <label className="ft-label">Select Destination Week ({selectedTrack === 'pop_science' ? 'Track 1' : 'Track 2'}) *</label>
                <select
                  className="ft-select"
                  value={targetMoveWeek}
                  onChange={e => setTargetMoveWeek(Number(e.target.value))}
                >
                  {groupedWeeks.map(g => (
                    <option key={g.weekKey} value={g.weekNumber}>
                      {g.weekTitle}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button type="button" className="ft-btn ft-btn-outline" onClick={() => setMoveModalItem(null)}>Cancel</button>
                <button type="submit" className="ft-btn ft-btn-primary">Move Now</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
