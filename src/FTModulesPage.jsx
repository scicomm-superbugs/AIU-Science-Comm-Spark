import { useState, useMemo } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { 
  BookOpen, FileText, ChevronDown, ChevronRight, ExternalLink, Plus, 
  Calendar, Clock, User, CheckCircle2, Search, Layers, GripVertical, 
  Video, Pencil, Trash2, X, Sparkles, Paperclip, Check, AlertCircle, 
  Download, ArrowRightLeft, MoveRight, Award, Send, CheckCircle, Flame,
  FolderPlus, Filter, RotateCcw
} from 'lucide-react';
import { useAuth } from './context/AuthContext';
import { db, useLiveCollection } from './db';
import { normalizeTrackKey, renderFormattedDescription } from './ftConstants';
import './scicommspark.css';

/**
 * Format exact date and time cleanly without duplicated start/end times
 * e.g. "Thu, Aug 6, 2026 • 5:00 PM"
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
    if (!String(startStr).includes('T') && !String(startStr).includes(':')) {
      targetDate.setHours(23, 59, 59, 999);
    }
    return new Date() > targetDate;
  } catch {
    return false;
  }
}

// Stage Submissions Definitions per Track
const TRACK_STAGE_SUBMISSIONS = {
  pop_science: [
    {
      id: 'stage_pop_1',
      stageId: 1,
      isSubmission: true,
      title: 'Stage 1 Official Submission: Short Pop Video',
      sub: 'Reels / TikTok SciComm Video (max 90 seconds)',
      defaultOpenDate: '2026-08-15T00:00',
      defaultDeadline: '2026-09-01T23:59',
      targetTrack: 'pop_science',
      description: 'Produce a punchy, highly engaging 90-second short video introducing a core scientific concept for social media.'
    },
    {
      id: 'stage_pop_2',
      stageId: 2,
      isSubmission: true,
      title: 'Stage 2 Official Submission: Long Pop Video',
      sub: 'YouTube SciComm Video (up to 3 minutes)',
      defaultOpenDate: '2026-09-02T00:00',
      defaultDeadline: '2026-09-20T23:59',
      targetTrack: 'pop_science',
      description: 'Deep scientific storytelling featuring comprehensive explanation, visual graphics, and clear narration.'
    },
    {
      id: 'stage_pop_3',
      stageId: 3,
      isSubmission: true,
      title: 'Stage 3 (Finals): Grand Finale Live Stage Show',
      sub: 'Interactive Live Presentation (5 mins on stage)',
      defaultOpenDate: '2026-09-21T00:00',
      defaultDeadline: '2026-10-10T23:59',
      targetTrack: 'pop_science',
      description: 'Deliver an interactive live science presentation on stage before expert judges, audience, and broadcast.'
    }
  ],
  science_journalism: [
    {
      id: 'stage_jour_1',
      stageId: 1,
      isSubmission: true,
      title: 'Stage 1 Official Submission: Pre-Interview Preparation',
      sub: 'Topic Research, Profile & Field Interview Prep',
      defaultOpenDate: '2026-08-15T00:00',
      defaultDeadline: '2026-09-01T23:59',
      targetTrack: 'science_journalism',
      googleFormUrl: 'https://forms.gle/tzgEf9QxBj3nG43S9',
      description: 'Submit your Pre-Interview Preparation document via Google Form demonstrating thorough literature review and interview planning.'
    },
    {
      id: 'stage_jour_2',
      stageId: 2,
      isSubmission: true,
      title: 'Stage 2 Official Submission: Article Publication PDF',
      sub: 'Simplified Science Article Publication',
      defaultOpenDate: '2026-09-02T00:00',
      defaultDeadline: '2026-09-20T23:59',
      targetTrack: 'science_journalism',
      description: 'Write and upload a formatted science article PDF document ready for digital publishing and magazine editorial review.'
    },
    {
      id: 'stage_jour_3',
      stageId: 3,
      isSubmission: true,
      title: 'Stage 3 (Finals): Live Talk Show Showcase',
      sub: 'Live Science Talk Show Interview on Stage',
      defaultOpenDate: '2026-09-21T00:00',
      defaultDeadline: '2026-10-10T23:59',
      targetTrack: 'science_journalism',
      description: 'Host a simulated live science talk show interview on stage in front of expert judges and public audience.'
    }
  ]
};

export default function FTModulesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
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

  // Add New Module/Week Modal State
  const [showAddWeekModal, setShowAddWeekModal] = useState(false);
  const [newWeekNumber, setNewWeekNumber] = useState(1);
  const [newWeekTitle, setNewWeekTitle] = useState('');
  const [isSavingNewWeek, setIsSavingNewWeek] = useState(false);

  // Add Content / Workshop / File / Submission Picker Modal State
  const [pickerModalWeek, setPickerModalWeek] = useState(null);
  const [pickerSearchQuery, setPickerSearchQuery] = useState('');
  const [pickerFilterType, setPickerFilterType] = useState('all'); // 'all' | 'workshop' | 'submission' | 'file'
  const [isAssigningItem, setIsAssigningItem] = useState(false);

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

  // Check if a workshop or item matches the selected track tab
  const doesItemMatchTrack = (itemTrack, normTrack) => {
    if (!itemTrack) return true;
    const raw = String(itemTrack).toLowerCase().trim();
    if (raw === 'both' || raw === 'all' || raw === 'both_tracks' || raw === 'all_tracks' || raw.includes('both') || raw.includes('all') || raw === 'common') {
      return true; // Common to both tracks! (e.g. Orientation Lecture)
    }
    if (raw.includes('journal') || raw.includes('article') || raw.includes('news')) {
      return normTrack === 'science_journalism';
    }
    return normTrack === 'pop_science';
  };

  // ── 1. POOL OF ALL AVAILABLE ITEMS FOR CURRENT TRACK ────────────────
  const allTrackAvailableItems = useMemo(() => {
    const normTrack = selectedTrack === 'science_journalism' ? 'science_journalism' : 'pop_science';
    const items = [];

    // A. Workshops & Lectures
    (dynamicWorkshops || []).forEach(ws => {
      const rawTarget = ws.targetTrack || ws.trackKey || 'both';
      if (doesItemMatchTrack(rawTarget, normTrack)) {
        const fileUrl = ws.fileUrl || ws.presentationLink || '';
        const isPassed = isEventPassed(ws.startDate, ws.endDate);
        const normTarget = normalizeTrackKey(rawTarget);

        items.push({
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

    // B. Stage Submissions
    const trackSubmissions = TRACK_STAGE_SUBMISSIONS[normTrack] || TRACK_STAGE_SUBMISSIONS.pop_science;
    trackSubmissions.forEach(defStage => {
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

      let windowStatus = 'active';
      if (openD && !isNaN(openD.getTime()) && now < openD) {
        windowStatus = 'upcoming';
      } else if (deadD && !isNaN(deadD.getTime()) && now > deadD) {
        windowStatus = 'closed';
      }

      items.push({
        id: defStage.id,
        source: 'stage_submission',
        isSubmission: true,
        stageId: defStage.stageId,
        title: custom?.title || defStage.title,
        sub: defStage.sub,
        weekNumber: Number(custom?.weekNumber) || 0,
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

    return items;
  }, [dynamicWorkshops, timelineConfig, selectedTrack]);

  // ── 2. GROUPED MODULES FOR DISPLAY ──────────────────────────────────
  const groupedWeeks = useMemo(() => {
    const normTrack = selectedTrack === 'science_journalism' ? 'science_journalism' : 'pop_science';
    const weekMapByNum = new Map();

    // Only load modules that are explicitly saved and created in Firestore ft_week_titles for this track
    customWeekTitles.forEach(c => {
      if (c.deleted) return;
      const cTrack = normalizeTrackKey(c.track || normTrack);
      if (cTrack !== normTrack && c.track) return;

      const wNum = Number(c.weekNumber);
      if (!wNum || isNaN(wNum)) return;

      weekMapByNum.set(wNum, {
        weekNumber: wNum,
        weekKey: `${normTrack}_week_${wNum}`,
        weekTitle: c.title || `Module ${wNum}`,
        items: []
      });
    });

    // Distribute items that are explicitly assigned to a module
    allTrackAvailableItems.forEach(item => {
      const wNum = Number(item.weekNumber);
      if (wNum > 0 && weekMapByNum.has(wNum)) {
        // Apply search query filter if typed
        if (searchQuery) {
          const q = searchQuery.toLowerCase();
          const matches = (
            item.title.toLowerCase().includes(q) ||
            (item.fileName && item.fileName.toLowerCase().includes(q)) ||
            (item.speakerName && item.speakerName.toLowerCase().includes(q)) ||
            (item.description && item.description.toLowerCase().includes(q))
          );
          if (!matches) return;
        }

        weekMapByNum.get(wNum).items.push(item);
      }
    });

    // Convert map to sorted array
    const result = Array.from(weekMapByNum.values()).sort((a, b) => a.weekNumber - b.weekNumber);

    // Sort items chronologically inside each module
    result.forEach(w => {
      w.items.sort((a, b) => new Date(a.startDate || 0) - new Date(b.startDate || 0));
    });

    return result;
  }, [customWeekTitles, allTrackAvailableItems, selectedTrack, searchQuery]);

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

  // Assign or Remove Item from a Module
  const handleToggleItemAssignment = async (item, targetWeekNum) => {
    if (!canManage) return;
    setIsAssigningItem(true);
    try {
      const isAlreadyInThisWeek = Number(item.weekNumber) === Number(targetWeekNum);
      const newWeekNum = isAlreadyInThisWeek ? 0 : Number(targetWeekNum);

      const updatePayload = {
        weekNumber: newWeekNum,
        updatedAt: new Date().toISOString()
      };

      if (item.isSubmission) {
        await db.timeline_config.set(item.id, updatePayload);
      } else {
        await db.workshops.update(item.id, updatePayload);
      }
    } catch (err) {
      alert('Failed to update item assignment: ' + err.message);
    } finally {
      setIsAssigningItem(false);
    }
  };

  // Handle Saving Custom Week Title for Selected Track
  const handleSaveWeekTitle = async (weekKey, weekNumber) => {
    if (!editingWeekTitleText.trim()) return;
    setIsSavingWeekTitle(true);
    try {
      const wNum = Number(weekNumber);
      const docId = `${selectedTrack}_week_${wNum}`;
      await db.ft_week_titles.set(docId, {
        id: docId,
        weekKey: docId,
        track: selectedTrack,
        weekNumber: wNum,
        title: editingWeekTitleText.trim(),
        deleted: false,
        updatedAt: new Date().toISOString(),
        updatedBy: user?.username || user?.email || 'admin'
      });

      // Clean legacy un-prefixed key
      try {
        await db.ft_week_titles.delete(`week_${wNum}`);
      } catch {}

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
    setNewWeekTitle(`Module ${nextNum}`);
    setShowAddWeekModal(true);
  };

  // Handle Creating New Week for Selected Track
  const handleCreateNewWeek = async (e) => {
    e.preventDefault();
    if (!newWeekTitle.trim()) return;
    setIsSavingNewWeek(true);
    try {
      const wNum = Number(newWeekNumber);
      const docId = `${selectedTrack}_week_${wNum}`;
      await db.ft_week_titles.set(docId, {
        id: docId,
        weekKey: docId,
        track: selectedTrack,
        weekNumber: wNum,
        title: newWeekTitle.trim(),
        deleted: false,
        updatedAt: new Date().toISOString(),
        updatedBy: user?.username || user?.email || 'admin'
      });
      setShowAddWeekModal(false);
      setNewWeekTitle('');
    } catch (err) {
      alert('Failed to create module: ' + err.message);
    } finally {
      setIsSavingNewWeek(false);
    }
  };

  // Handle Deleting a Week from Selected Track cleanly
  const handleDeleteWeek = async (weekGroup) => {
    const trackName = selectedTrack === 'pop_science' ? 'Track 1 (Pop Science)' : 'Track 2 (Science Journalism)';
    if (!window.confirm(`Are you sure you want to delete "${weekGroup.weekTitle}" from ${trackName}? All assigned items will be unassigned.`)) return;

    try {
      const wNum = Number(weekGroup.weekNumber);

      // 1. Unassign all workshops in this week
      const workshopsInThisWeek = dynamicWorkshops.filter(ws => (Number(ws.weekNumber) || 0) === wNum);
      for (const ws of workshopsInThisWeek) {
        await db.workshops.update(ws.id, { weekNumber: 0, updatedAt: new Date().toISOString() });
      }

      // 2. Unassign all submissions in this week
      const submissionsInThisWeek = timelineConfig.filter(c => (Number(c.weekNumber) || 0) === wNum);
      for (const s of submissionsInThisWeek) {
        await db.timeline_config.set(s.id, { weekNumber: 0, updatedAt: new Date().toISOString() });
      }

      // 3. Mark module as deleted in Firestore for this track
      const docId = `${selectedTrack}_week_${wNum}`;
      await db.ft_week_titles.set(docId, {
        id: docId,
        weekKey: docId,
        track: selectedTrack,
        weekNumber: wNum,
        title: weekGroup.weekTitle,
        deleted: true,
        updatedAt: new Date().toISOString()
      });

      // 4. Also delete any legacy un-prefixed key
      try {
        await db.ft_week_titles.delete(`week_${wNum}`);
      } catch {}
    } catch (err) {
      alert('Failed to delete module: ' + err.message);
    }
  };

  // Reset / Clear All Modules in Both Tracks
  const handleClearAllModules = async () => {
    if (!window.confirm('⚠️ Are you sure you want to delete and reset all modules across both tracks? All workshops and submissions will be safely preserved and unassigned so you can build clean modules manually.')) return;

    try {
      // 1. Unassign all workshops
      for (const ws of dynamicWorkshops) {
        if (ws.weekNumber) {
          await db.workshops.update(ws.id, { weekNumber: 0, updatedAt: new Date().toISOString() });
        }
      }

      // 2. Unassign all submissions
      for (const s of timelineConfig) {
        if (s.weekNumber) {
          await db.timeline_config.set(s.id, { weekNumber: 0, updatedAt: new Date().toISOString() });
        }
      }

      // 3. Mark all custom week titles deleted
      for (const c of customWeekTitles) {
        await db.ft_week_titles.set(c.id, { ...c, deleted: true, updatedAt: new Date().toISOString() });
      }

      alert('🎉 All modules cleared! You can now create clean custom modules and add lectures, workshops, files, and submissions manually.');
    } catch (err) {
      alert('Failed to clear modules: ' + err.message);
    }
  };

  // Filter items in the "+ Add Content to Module" Picker Modal
  const pickerFilteredItems = useMemo(() => {
    if (!pickerModalWeek) return [];
    return allTrackAvailableItems.filter(item => {
      // Type filter
      if (pickerFilterType === 'workshop' && item.isSubmission) return false;
      if (pickerFilterType === 'submission' && !item.isSubmission) return false;
      if (pickerFilterType === 'file' && !item.hasFile) return false;

      // Search query filter
      if (pickerSearchQuery) {
        const q = pickerSearchQuery.toLowerCase();
        return (
          item.title.toLowerCase().includes(q) ||
          (item.fileName && item.fileName.toLowerCase().includes(q)) ||
          (item.speakerName && item.speakerName.toLowerCase().includes(q)) ||
          (item.description && item.description.toLowerCase().includes(q))
        );
      }

      return true;
    });
  }, [allTrackAvailableItems, pickerModalWeek, pickerFilterType, pickerSearchQuery]);

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
              <BookOpen size={28} style={{ color: '#be123c' }} /> Course Modules & Curriculum
            </h1>
            <p style={{ fontSize: '0.9rem', color: '#64748b', margin: '0.35rem 0 0 0', fontWeight: 600 }}>
              Track-specific learning modules, live workshops, presentation files, and official stage submissions.
            </p>
          </div>

          {/* Action Buttons & Controls: Add Module, Collapse, Reset */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            {groupedWeeks.length > 0 && (
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
                <Layers size={16} /> {Object.keys(collapsedWeeks).length > 0 ? 'Expand All' : 'Collapse All'}
              </button>
            )}

            {canManage && (
              <>
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
                  <Plus size={18} /> + Add Module to {selectedTrack === 'pop_science' ? 'Track 1' : 'Track 2'}
                </button>

                {groupedWeeks.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearAllModules}
                    title="Clear and reset all modules across tracks"
                    style={{
                      padding: '0.6rem 0.9rem', borderRadius: '12px', background: '#fff1f2',
                      border: '1.5px solid #fecdd3', color: '#dc2626', fontWeight: 800, fontSize: '0.82rem',
                      cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.35rem'
                    }}
                  >
                    <RotateCcw size={15} /> Clear All Modules
                  </button>
                )}
              </>
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
      </div>

      {/* ── EMPTY STATE WHEN NO MODULES EXIST ────────────────────────── */}
      {groupedWeeks.length === 0 && (
        <div style={{
          background: '#ffffff', borderRadius: '20px', padding: '3.5rem 2rem', textAlign: 'center',
          boxShadow: '0 4px 20px rgba(0,0,0,0.04)', border: '1px dashed #cbd5e1', margin: '1rem 0'
        }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '20px', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem auto' }}>
            <BookOpen size={32} />
          </div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 900, color: '#0f172a', margin: '0 0 0.5rem 0' }}>
            No Modules Created Yet in {selectedTrack === 'pop_science' ? 'Track 1 (Pop Science)' : 'Track 2 (Science Journalism)'}
          </h2>
          <p style={{ fontSize: '0.9rem', color: '#64748b', maxWidth: '520px', margin: '0 auto 1.5rem auto', fontWeight: 600 }}>
            Click the button below to add your first module. Then manually pick and assign lectures, workshops, resource files, and stage submissions!
          </p>
          {canManage && (
            <button
              type="button"
              onClick={handleOpenAddWeekModal}
              style={{
                padding: '0.75rem 1.5rem', borderRadius: '14px',
                background: 'linear-gradient(135deg, #be123c 0%, #e11d48 100%)',
                color: '#ffffff', fontWeight: 900, fontSize: '0.92rem', border: 'none',
                cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                boxShadow: '0 4px 20px rgba(190, 18, 60, 0.35)'
              }}
            >
              <Plus size={20} /> + Create First Module for {selectedTrack === 'pop_science' ? 'Track 1' : 'Track 2'}
            </button>
          )}
        </div>
      )}

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
                          title={`Edit Title for ${selectedTrack === 'pop_science' ? 'Track 1' : 'Track 2'}`}
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

                {/* Right Controls: + Add Item Button, Item Count & Delete Week Control */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                  
                  {/* + ADD CONTENT / WORKSHOP / SUBMISSION BUTTON */}
                  {canManage && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPickerModalWeek(weekGroup);
                        setPickerSearchQuery('');
                        setPickerFilterType('all');
                      }}
                      style={{
                        padding: '0.45rem 0.85rem', borderRadius: '10px',
                        background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                        color: '#ffffff', border: 'none', fontWeight: 900, fontSize: '0.8rem',
                        cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                        boxShadow: '0 2px 10px rgba(37, 99, 235, 0.25)'
                      }}
                    >
                      <Plus size={15} /> + Add Item
                    </button>
                  )}

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
                      title={`Delete this module from ${selectedTrack === 'pop_science' ? 'Track 1' : 'Track 2'}`}
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
                    <div style={{ padding: '2.5rem 1.5rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.88rem', fontWeight: 600 }}>
                      <p style={{ margin: '0 0 0.75rem 0', fontStyle: 'italic' }}>
                        No items added to this module yet.
                      </p>
                      {canManage && (
                        <button
                          type="button"
                          onClick={() => {
                            setPickerModalWeek(weekGroup);
                            setPickerSearchQuery('');
                            setPickerFilterType('all');
                          }}
                          style={{
                            background: '#eff6ff', color: '#2563eb', border: '1.5px dashed #93c5fd',
                            padding: '0.5rem 1rem', borderRadius: '10px', fontWeight: 800, fontSize: '0.82rem',
                            cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.35rem'
                          }}
                        >
                          <Plus size={16} /> Add Lectures, Workshops, Files or Submissions
                        </button>
                      )}
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
                                      title="Click & Drag submission milestone across modules"
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

                                  {/* Admin Remove from Module */}
                                  {canManage && (
                                    <button
                                      type="button"
                                      onClick={() => handleToggleItemAssignment(item, weekGroup.weekNumber)}
                                      title="Remove from this module"
                                      style={{
                                        background: '#fff1f2', border: '1px solid #fecdd3', color: '#dc2626',
                                        height: '34px', padding: '0 0.55rem', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 800,
                                        display: 'inline-flex', alignItems: 'center', gap: '0.25rem', cursor: 'pointer'
                                      }}
                                    >
                                      <Trash2 size={13} /> Remove
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
                                    title="Click & Drag to move workshop across modules"
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

                                  {/* Exact Date & Time, Speaker Subtitle */}
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

                                {/* Admin Remove from Module */}
                                {canManage && (
                                  <button
                                    type="button"
                                    onClick={() => handleToggleItemAssignment(item, weekGroup.weekNumber)}
                                    title="Remove workshop from this module"
                                    style={{
                                      background: '#fff1f2', border: '1px solid #fecdd3', color: '#dc2626',
                                      height: '32px', padding: '0 0.55rem', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 800,
                                      display: 'inline-flex', alignItems: 'center', gap: '0.25rem', cursor: 'pointer'
                                    }}
                                  >
                                    <Trash2 size={13} /> Remove
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* ── DEDICATED ATTACHED RESOURCE FILE CARD ── */}
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

      {/* ── "+ ADD CONTENT TO MODULE" PICKER MODAL ─────────────────── */}
      {pickerModalWeek && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 99999, padding: '0.75rem'
        }}>
          <div style={{
            background: '#ffffff', borderRadius: '24px', width: '100%', maxWidth: '720px',
            maxHeight: '90vh', display: 'flex', flexDirection: 'column',
            boxShadow: '0 25px 60px rgba(0,0,0,0.3)', position: 'relative'
          }}>
            {/* Modal Header */}
            <div style={{ padding: '1.5rem 1.75rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: '1.3rem', fontWeight: 900, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <FolderPlus size={22} style={{ color: '#2563eb' }} /> Add Content to {pickerModalWeek.weekTitle}
                </h2>
                <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '0.25rem 0 0 0', fontWeight: 600 }}>
                  Select from all available workshops, lecture materials, and submissions for {selectedTrack === 'pop_science' ? 'Track 1' : 'Track 2'}.
                </p>
              </div>
              <button
                onClick={() => setPickerModalWeek(null)}
                style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Filter Bar */}
            <div style={{ padding: '1rem 1.75rem', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
              {/* Type Tabs */}
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => setPickerFilterType('all')}
                  style={{
                    padding: '0.35rem 0.75rem', borderRadius: '8px', fontSize: '0.78rem', fontWeight: 800,
                    border: '1px solid #cbd5e1', cursor: 'pointer',
                    background: pickerFilterType === 'all' ? '#0f172a' : '#ffffff',
                    color: pickerFilterType === 'all' ? '#ffffff' : '#334155'
                  }}
                >
                  All Items ({allTrackAvailableItems.length})
                </button>
                <button
                  type="button"
                  onClick={() => setPickerFilterType('workshop')}
                  style={{
                    padding: '0.35rem 0.75rem', borderRadius: '8px', fontSize: '0.78rem', fontWeight: 800,
                    border: '1px solid #cbd5e1', cursor: 'pointer',
                    background: pickerFilterType === 'workshop' ? '#0f172a' : '#ffffff',
                    color: pickerFilterType === 'workshop' ? '#ffffff' : '#334155'
                  }}
                >
                  🎥 Workshops & Lectures
                </button>
                <button
                  type="button"
                  onClick={() => setPickerFilterType('submission')}
                  style={{
                    padding: '0.35rem 0.75rem', borderRadius: '8px', fontSize: '0.78rem', fontWeight: 800,
                    border: '1px solid #cbd5e1', cursor: 'pointer',
                    background: pickerFilterType === 'submission' ? '#0f172a' : '#ffffff',
                    color: pickerFilterType === 'submission' ? '#ffffff' : '#334155'
                  }}
                >
                  🎯 Stage Submissions
                </button>
                <button
                  type="button"
                  onClick={() => setPickerFilterType('file')}
                  style={{
                    padding: '0.35rem 0.75rem', borderRadius: '8px', fontSize: '0.78rem', fontWeight: 800,
                    border: '1px solid #cbd5e1', cursor: 'pointer',
                    background: pickerFilterType === 'file' ? '#0f172a' : '#ffffff',
                    color: pickerFilterType === 'file' ? '#ffffff' : '#334155'
                  }}
                >
                  📄 Attached Files
                </button>
              </div>

              {/* Search inside picker */}
              <div style={{ position: 'relative', width: '220px' }}>
                <Search size={14} style={{ position: 'absolute', left: '0.65rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  type="text"
                  placeholder="Filter available list..."
                  value={pickerSearchQuery}
                  onChange={e => setPickerSearchQuery(e.target.value)}
                  style={{
                    width: '100%', padding: '0.35rem 0.65rem 0.35rem 2rem', borderRadius: '8px',
                    border: '1.5px solid #cbd5e1', fontSize: '0.8rem', fontWeight: 600,
                    outline: 'none', background: '#ffffff', color: '#0f172a', boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            {/* Modal Body: Available List */}
            <div style={{ padding: '1rem 1.75rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {pickerFilteredItems.length === 0 ? (
                <div style={{ padding: '3rem 1rem', textAlign: 'center', color: '#94a3b8', fontStyle: 'italic', fontSize: '0.9rem' }}>
                  No matching items found in the {selectedTrack === 'pop_science' ? 'Track 1' : 'Track 2'} pool.
                </div>
              ) : (
                pickerFilteredItems.map(item => {
                  const isInThisWeek = Number(item.weekNumber) === Number(pickerModalWeek.weekNumber);
                  const isInOtherWeek = item.weekNumber > 0 && !isInThisWeek;
                  const formattedTime = formatExactDateTime(item.startDate, item.endDate);

                  return (
                    <div
                      key={item.id}
                      style={{
                        padding: '0.9rem 1.1rem', borderRadius: '14px',
                        border: `1.5px solid ${isInThisWeek ? '#a7f3d0' : '#e2e8f0'}`,
                        background: isInThisWeek ? '#f0fdf4' : '#ffffff',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        flexWrap: 'wrap', gap: '0.75rem', transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: '240px' }}>
                        <div style={{
                          width: '36px', height: '36px', borderRadius: '10px',
                          background: item.isSubmission ? '#f5f3ff' : '#eff6ff',
                          color: item.isSubmission ? '#7c3aed' : '#2563eb',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                        }}>
                          {item.isSubmission ? <Award size={18} /> : item.meetingLink ? <Video size={18} /> : <BookOpen size={18} />}
                        </div>

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '0.92rem', fontWeight: 900, color: '#0f172a' }}>
                              {item.title}
                            </span>
                            {item.isSubmission && (
                              <span style={{ fontSize: '0.65rem', fontWeight: 800, padding: '0.1rem 0.45rem', borderRadius: '6px', background: '#f5f3ff', color: '#7c3aed', border: '1px solid #ddd6fe' }}>
                                Stage Submission
                              </span>
                            )}
                            {item.hasFile && (
                              <span style={{ fontSize: '0.65rem', fontWeight: 800, padding: '0.1rem 0.45rem', borderRadius: '6px', background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe' }}>
                                Has File 📄
                              </span>
                            )}
                          </div>

                          <div style={{ fontSize: '0.76rem', color: '#64748b', marginTop: '0.2rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                            {item.speakerName && <span>Speaker: <strong>{item.speakerName}</strong></span>}
                            {formattedTime && <span>Date: <strong>{formattedTime}</strong></span>}
                            {isInOtherWeek && (
                              <span style={{ color: '#d97706', fontWeight: 700 }}>
                                Currently in Module {item.weekNumber}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Add/Remove Action Button */}
                      <div>
                        {isInThisWeek ? (
                          <button
                            type="button"
                            onClick={() => handleToggleItemAssignment(item, pickerModalWeek.weekNumber)}
                            disabled={isAssigningItem}
                            style={{
                              background: '#ecfdf5', color: '#059669', border: '1.5px solid #a7f3d0',
                              padding: '0.4rem 0.85rem', borderRadius: '10px', fontSize: '0.78rem', fontWeight: 900,
                              cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.35rem'
                            }}
                          >
                            <Check size={14} /> In This Module (Click to Remove)
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleToggleItemAssignment(item, pickerModalWeek.weekNumber)}
                            disabled={isAssigningItem}
                            style={{
                              background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                              color: '#ffffff', border: 'none',
                              padding: '0.45rem 0.95rem', borderRadius: '10px', fontSize: '0.78rem', fontWeight: 900,
                              cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                              boxShadow: '0 2px 8px rgba(37, 99, 235, 0.25)'
                            }}
                          >
                            <Plus size={14} /> {isInOtherWeek ? 'Move to This Module' : '+ Add to Module'}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div style={{ padding: '1rem 1.75rem', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="ft-btn ft-btn-primary"
                onClick={() => setPickerModalWeek(null)}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── ADD NEW MODULE MODAL (TRACK-SPECIFIC) ──────────────────── */}
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
                  <Plus size={22} style={{ color: '#be123c' }} /> Add Module to {selectedTrack === 'pop_science' ? 'Track 1' : 'Track 2'}
                </h2>
                <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '0.25rem 0 0 0', fontWeight: 600 }}>
                  Create an empty module and then manually pick content to add.
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
                <label className="ft-label">Module Number *</label>
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
                <label className="ft-label">Module Title *</label>
                <input
                  type="text"
                  className="ft-input"
                  placeholder={selectedTrack === 'pop_science' ? 'e.g. Module 1: Pop Science Foundations' : 'e.g. Module 1: Science Journalism Orientation'}
                  value={newWeekTitle}
                  onChange={e => setNewWeekTitle(e.target.value)}
                  required
                />
              </div>

              <div style={{ background: '#eff6ff', padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid #bfdbfe', fontSize: '0.8rem', color: '#1e40af', fontWeight: 600 }}>
                💡 After creating this module, click "+ Add Item" to choose from all matching lectures, workshops, files, and submissions.
              </div>

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button type="button" className="ft-btn ft-btn-outline" onClick={() => setShowAddWeekModal(false)}>Cancel</button>
                <button type="submit" className="ft-btn ft-btn-primary" disabled={isSavingNewWeek}>
                  {isSavingNewWeek ? 'Creating...' : `+ Create Module`}
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
                  <ArrowRightLeft size={20} style={{ color: '#be123c' }} /> Move Item to Module
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
                <label className="ft-label">Select Destination Module ({selectedTrack === 'pop_science' ? 'Track 1' : 'Track 2'}) *</label>
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
