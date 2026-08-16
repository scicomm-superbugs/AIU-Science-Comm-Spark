import { useState, useMemo } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { 
  BookOpen, FileText, ChevronDown, ChevronRight, ExternalLink, Plus, 
  Calendar, Clock, User, CheckCircle2, Search, Layers, GripVertical, 
  Video, Pencil, Trash2, X, Sparkles, Paperclip, Check, AlertCircle, 
  Download, ArrowRightLeft, MoveRight
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

export default function FTModulesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const outletContext = useOutletContext();
  
  const scientists = useLiveCollection('scientists') || [];
  const dynamicWorkshops = useLiveCollection('workshops') || [];
  const customModules = useLiveCollection('ft_modules') || [];
  const customWeekTitles = useLiveCollection('ft_week_titles') || [];

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

  // Admin Add/Edit Material Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [form, setForm] = useState({
    title: '',
    weekNumber: 1,
    weekTitle: '',
    itemKind: 'workshop', // 'workshop' | 'resource_file'
    fileName: '',
    fileUrl: '',
    meetingLink: '',
    startDate: '',
    endDate: '',
    type: 'pdf',
    targetTrack: 'both',
    speakerName: '',
    description: ''
  });

  // Quick Attach File Modal State (for workshops that don't have files yet)
  const [attachModalItem, setAttachModalItem] = useState(null);
  const [attachFileName, setAttachFileName] = useState('');
  const [attachFileUrl, setAttachFileUrl] = useState('');
  const [isSavingAttachment, setIsSavingAttachment] = useState(false);

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

  // Build grouped weeks
  const groupedWeeks = useMemo(() => {
    const normTrack = normalizeTrackKey(selectedTrack);
    const allItems = [];

    // Map Workshops
    (dynamicWorkshops || []).forEach(ws => {
      const target = normalizeTrackKey(ws.targetTrack || ws.trackKey || 'both');
      if (target === 'both' || target === 'all' || target === normTrack || !ws.targetTrack) {
        const fileUrl = ws.fileUrl || ws.presentationLink || '';
        const isPassed = isEventPassed(ws.startDate, ws.endDate);

        allItems.push({
          id: ws.id,
          source: 'workshop',
          title: ws.title,
          weekNumber: Number(ws.weekNumber) || 1,
          weekTitle: ws.weekTitle || '',
          fileName: ws.fileName || (fileUrl ? 'Workshop_Materials_Presentation.pdf' : ''),
          fileUrl: fileUrl,
          hasFile: Boolean(fileUrl),
          meetingLink: ws.meetingLink || '',
          type: ws.type || 'Workshop',
          targetTrack: target,
          speakerName: ws.trainerName || ws.speakerName || '',
          startDate: ws.startDate || '',
          endDate: ws.endDate || '',
          isPassed,
          description: ws.description || ''
        });
      }
    });

    // Map Custom Modules / Files
    (customModules || []).forEach(mod => {
      const target = normalizeTrackKey(mod.targetTrack || 'both');
      if (target === 'both' || target === 'all' || target === normTrack || !mod.targetTrack) {
        const fileUrl = mod.fileUrl || '';
        const isPassed = isEventPassed(mod.startDate, mod.endDate);

        allItems.push({
          id: mod.id,
          source: 'custom_module',
          title: mod.title,
          weekNumber: Number(mod.weekNumber) || 1,
          weekTitle: mod.weekTitle || '',
          fileName: mod.fileName || (fileUrl ? 'Course_Handout.pdf' : ''),
          fileUrl: fileUrl,
          hasFile: Boolean(fileUrl),
          meetingLink: mod.meetingLink || '',
          type: mod.type || 'pdf',
          targetTrack: target,
          speakerName: mod.speakerName || '',
          startDate: mod.startDate || mod.createdAt || '',
          endDate: mod.endDate || '',
          isPassed,
          description: mod.description || ''
        });
      }
    });

    // Search query filter
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

    // Default base week structure
    const defaultWeeks = [
      { weekNumber: 1, weekKey: 'week-1', defaultTitle: 'Week 1: Foundations & Competition Orientation' },
      { weekNumber: 2, weekKey: 'week-2', defaultTitle: 'Week 2: Scriptwriting & Scientific Storytelling' },
      { weekNumber: 3, weekKey: 'week-3', defaultTitle: 'Week 3: On-Camera Delivery, Voice Acting & Mobile Editing' },
      { weekNumber: 4, weekKey: 'week-4', defaultTitle: 'Week 4: Science Journalism Writing & Editorial Ethics' },
      { weekNumber: 5, weekKey: 'week-5', defaultTitle: 'Week 5: Live Stage Performance & Showmanship' }
    ];

    const weekMap = {};

    // Initialize with custom titles from Firestore or defaults
    defaultWeeks.forEach(w => {
      const customTitleDoc = customWeekTitles.find(c => c.id === w.weekKey || c.weekKey === w.weekKey);
      const title = customTitleDoc?.title || w.defaultTitle;

      weekMap[w.weekKey] = {
        weekNumber: w.weekNumber,
        weekKey: w.weekKey,
        weekTitle: title,
        items: []
      };
    });

    // Distribute items into week groups
    searchFiltered.forEach(item => {
      let weekNum = item.weekNumber || 1;

      // If item has a startDate, calculate week relative to competition start date (Aug 1) if not explicitly set
      if (!item.weekNumber && item.startDate) {
        try {
          const itemDate = new Date(item.startDate);
          const compStart = new Date('2026-08-01');
          const diffDays = Math.floor((itemDate - compStart) / (1000 * 60 * 60 * 24));
          if (diffDays >= 0) {
            weekNum = Math.min(6, Math.floor(diffDays / 7) + 1);
          }
        } catch {}
      }

      const weekKey = `week-${weekNum}`;
      if (!weekMap[weekKey]) {
        const customTitleDoc = customWeekTitles.find(c => c.id === weekKey || c.weekKey === weekKey);
        weekMap[weekKey] = {
          weekNumber: weekNum,
          weekKey,
          weekTitle: customTitleDoc?.title || item.weekTitle || `Week ${weekNum}: Training & Learning Modules`,
          items: []
        };
      }

      weekMap[weekKey].items.push(item);
    });

    // Sort weeks by weekNumber
    const result = Object.values(weekMap).sort((a, b) => a.weekNumber - b.weekNumber);

    // Sort items within each week chronologically
    result.forEach(w => {
      w.items.sort((a, b) => new Date(a.startDate || 0) - new Date(b.startDate || 0));
    });

    return result;
  }, [dynamicWorkshops, customModules, customWeekTitles, selectedTrack, searchQuery]);

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

      if (draggedItem.source === 'workshop') {
        await db.workshops.update(draggedItem.id, updatePayload);
      } else {
        await db.ft_modules.update(draggedItem.id, updatePayload);
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

      if (moveModalItem.source === 'workshop') {
        await db.workshops.update(moveModalItem.id, updatePayload);
      } else {
        await db.ft_modules.update(moveModalItem.id, updatePayload);
      }

      setMoveModalItem(null);
    } catch (err) {
      alert('Failed to move: ' + err.message);
    }
  };

  // Handle Saving Custom Week Title
  const handleSaveWeekTitle = async (weekKey, weekNumber) => {
    if (!editingWeekTitleText.trim()) return;
    setIsSavingWeekTitle(true);
    try {
      await db.ft_week_titles.set(weekKey, {
        id: weekKey,
        weekKey,
        weekNumber,
        title: editingWeekTitleText.trim(),
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

  // Open Edit Modal for a Workshop or Custom Module
  const handleOpenEditModal = (item) => {
    setEditingItem(item);
    
    // Format datetime-local strings
    const formatForInput = (dStr) => {
      if (!dStr) return '';
      try {
        const d = new Date(dStr);
        if (isNaN(d.getTime())) return '';
        const pad = (n) => String(n).padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
      } catch {
        return '';
      }
    };

    setForm({
      title: item.title || '',
      weekNumber: item.weekNumber || 1,
      weekTitle: item.weekTitle || '',
      itemKind: item.source === 'workshop' ? 'workshop' : 'resource_file',
      fileName: item.fileName || '',
      fileUrl: item.fileUrl || '',
      meetingLink: item.meetingLink || '',
      startDate: formatForInput(item.startDate),
      endDate: formatForInput(item.endDate),
      type: item.type || 'pdf',
      targetTrack: item.targetTrack || 'both',
      speakerName: item.speakerName || '',
      description: item.description || ''
    });
    setShowModal(true);
  };

  // Open Add New Modal
  const handleOpenAddModal = (defaultWeekNum = 1) => {
    setEditingItem(null);
    setForm({
      title: '',
      weekNumber: defaultWeekNum,
      weekTitle: '',
      itemKind: 'workshop',
      fileName: '',
      fileUrl: '',
      meetingLink: '',
      startDate: '',
      endDate: '',
      type: 'pdf',
      targetTrack: 'both',
      speakerName: '',
      description: ''
    });
    setShowModal(true);
  };

  // Handle Save Module / Workshop Item
  const handleSaveModule = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        title: form.title.trim(),
        weekNumber: Number(form.weekNumber) || 1,
        fileName: form.fileName ? form.fileName.trim() : '',
        fileUrl: form.fileUrl ? form.fileUrl.trim() : '',
        meetingLink: form.meetingLink ? form.meetingLink.trim() : '',
        type: form.type || 'pdf',
        targetTrack: form.targetTrack || 'both',
        trainerName: form.speakerName ? form.speakerName.trim() : '',
        speakerName: form.speakerName ? form.speakerName.trim() : '',
        startDate: form.startDate || '',
        endDate: form.endDate || '',
        description: form.description ? form.description.trim() : '',
        updatedAt: new Date().toISOString()
      };

      if (editingItem) {
        if (editingItem.source === 'workshop') {
          await db.workshops.update(editingItem.id, payload);
        } else {
          await db.ft_modules.update(editingItem.id, payload);
        }
      } else {
        // Create new item
        if (form.itemKind === 'workshop') {
          await db.workshops.add({ ...payload, createdAt: new Date().toISOString() });
        } else {
          await db.ft_modules.add({ ...payload, createdAt: new Date().toISOString() });
        }
      }

      setShowModal(false);
      setEditingItem(null);
    } catch (err) {
      alert('Failed to save: ' + err.message);
    }
  };

  // Handle Quick File Attachment to an existing workshop
  const handleSaveQuickAttachment = async (e) => {
    e.preventDefault();
    if (!attachModalItem) return;
    setIsSavingAttachment(true);
    try {
      const updateData = {
        fileName: attachFileName.trim() || 'Workshop_Materials_Presentation.pdf',
        fileUrl: attachFileUrl.trim(),
        updatedAt: new Date().toISOString()
      };

      if (attachModalItem.source === 'workshop') {
        await db.workshops.update(attachModalItem.id, updateData);
      } else {
        await db.ft_modules.update(attachModalItem.id, updateData);
      }

      setAttachModalItem(null);
      setAttachFileName('');
      setAttachFileUrl('');
    } catch (err) {
      alert('Failed to attach file: ' + err.message);
    } finally {
      setIsSavingAttachment(false);
    }
  };

  // Handle Delete Item
  const handleDeleteItem = async (item) => {
    if (!window.confirm(`Are you sure you want to delete "${item.title}"?`)) return;
    try {
      if (item.source === 'custom_module') {
        await db.ft_modules.delete(item.id);
      } else if (item.source === 'workshop') {
        await db.workshops.delete(item.id);
      }
    } catch (err) {
      alert('Failed to delete: ' + err.message);
    }
  };

  // Remove Attached File from a workshop
  const handleDetachFile = async (item) => {
    if (!window.confirm(`Remove attached file from "${item.title}"?`)) return;
    try {
      const updateData = { fileName: '', fileUrl: '', presentationLink: '', updatedAt: new Date().toISOString() };
      if (item.source === 'workshop') {
        await db.workshops.update(item.id, updateData);
      } else {
        await db.ft_modules.update(item.id, updateData);
      }
    } catch (err) {
      alert('Failed to remove file: ' + err.message);
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
              <BookOpen size={28} style={{ color: '#be123c' }} /> Course & Training Modules
            </h1>
            <p style={{ fontSize: '0.9rem', color: '#64748b', margin: '0.35rem 0 0 0', fontWeight: 600 }}>
              Structured weekly learning modules, live workshops, and downloadable course materials.
            </p>
          </div>

          {/* Action Buttons & Controls */}
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
                onClick={() => handleOpenAddModal(1)}
                style={{
                  padding: '0.65rem 1.25rem', borderRadius: '12px',
                  background: 'linear-gradient(135deg, #be123c 0%, #e11d48 100%)',
                  color: '#ffffff', fontWeight: 900, fontSize: '0.88rem', border: 'none',
                  cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.45rem',
                  boxShadow: '0 4px 16px rgba(190, 18, 60, 0.35)'
                }}
              >
                <Plus size={18} /> + Add Module / Workshop
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
              placeholder="Search modules & materials..."
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
          <div style={{ marginTop: '0.75rem', fontSize: '0.78rem', color: '#64748b', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span>💡 <strong>Admin Tip:</strong> You can drag & drop items across weeks using the grip handle</span>
            <GripVertical size={14} style={{ color: '#be123c' }} />
            <span>or use the quick Move button on mobile.</span>
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
                          title="Edit Week Title"
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

                {/* Right Badges & Count */}
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
                      onClick={() => handleOpenAddModal(weekGroup.weekNumber)}
                      title="Add item directly to this week"
                      style={{
                        background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px',
                        padding: '0.3rem 0.65rem', fontSize: '0.75rem', fontWeight: 800, color: '#be123c',
                        cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.3rem'
                      }}
                    >
                      <Plus size={14} /> Add Item
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
                      No modules or workshops scheduled for this week yet. Drag items here or click "+ Add Item".
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      {weekGroup.items.map((item, idx) => {
                        const formattedTime = formatExactDateTime(item.startDate, item.endDate);
                        const isPassed = item.isPassed;
                        const isThisItemDragged = draggedItem?.id === item.id;

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
                            {/* ── WORKSHOP / MODULE MAIN ROW ── */}
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
                                    title="Click & Drag to move across weeks"
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
                                  {/* Title & Track Badge & Passed Badge */}
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.25rem' }}>
                                    <span style={{
                                      fontSize: '1.02rem', fontWeight: 900,
                                      color: isPassed ? '#64748b' : '#0f172a',
                                      textDecoration: isPassed ? 'line-through' : 'none',
                                      lineHeight: 1.35, wordBreak: 'break-word'
                                    }}>
                                      {item.title}
                                    </span>

                                    <span style={{
                                      fontSize: '0.68rem', fontWeight: 900, padding: '0.15rem 0.55rem', borderRadius: '6px',
                                      background: item.targetTrack === 'both' ? '#f1f5f9' : '#fef2f2',
                                      color: item.targetTrack === 'both' ? '#475569' : '#be123c',
                                      border: `1px solid ${item.targetTrack === 'both' ? '#cbd5e1' : '#fecdd3'}`
                                    }}>
                                      {item.targetTrack === 'both' ? 'Both Tracks' : item.targetTrack === 'pop_science' ? 'Track 1' : 'Track 2'}
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

                                {/* Admin Management Controls */}
                                {canManage && (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginLeft: '0.3rem', borderLeft: '1px solid #e2e8f0', paddingLeft: '0.4rem' }}>
                                    {/* Attach File Button (if no file yet) */}
                                    {!item.hasFile && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setAttachModalItem(item);
                                          setAttachFileName('');
                                          setAttachFileUrl('');
                                        }}
                                        title="Attach Lecture PDF / Slides to this workshop"
                                        style={{
                                          background: '#eff6ff', border: '1px solid #bfdbfe', color: '#2563eb',
                                          height: '32px', padding: '0 0.6rem', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 800,
                                          display: 'inline-flex', alignItems: 'center', gap: '0.25rem', cursor: 'pointer'
                                        }}
                                      >
                                        <Paperclip size={13} /> + Attach File
                                      </button>
                                    )}

                                    {/* Quick Move to Week Button */}
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setMoveModalItem(item);
                                        setTargetMoveWeek(item.weekNumber || 1);
                                      }}
                                      title="Move to another week"
                                      style={{
                                        background: '#f8fafc', border: '1px solid #cbd5e1', color: '#334155',
                                        height: '32px', padding: '0 0.5rem', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 800,
                                        display: 'inline-flex', alignItems: 'center', gap: '0.25rem', cursor: 'pointer'
                                      }}
                                    >
                                      <ArrowRightLeft size={13} /> Move
                                    </button>

                                    {/* Edit Item */}
                                    <button
                                      type="button"
                                      onClick={() => handleOpenEditModal(item)}
                                      title="Edit Everything (Title, Date, Time, Speaker, Description)"
                                      style={{
                                        background: '#f8fafc', border: '1px solid #cbd5e1', color: '#334155',
                                        width: '32px', height: '32px', borderRadius: '8px',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
                                      }}
                                    >
                                      <Pencil size={14} />
                                    </button>

                                    {/* Delete Item */}
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteItem(item)}
                                      title="Delete Item"
                                      style={{
                                        background: '#fef2f2', border: '1px solid #fecdd3', color: '#dc2626',
                                        width: '32px', height: '32px', borderRadius: '8px',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
                                      }}
                                    >
                                      <Trash2 size={14} />
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

                                {/* Right Download / Open File Button & Admin Controls */}
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

                                  {/* Admin Detach / Edit File option */}
                                  {canManage && (
                                    <div style={{ display: 'flex', gap: '0.3rem', marginLeft: '0.2rem' }}>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setAttachModalItem(item);
                                          setAttachFileName(item.fileName || '');
                                          setAttachFileUrl(item.fileUrl || '');
                                        }}
                                        title="Change File Link"
                                        style={{
                                          background: '#f8fafc', border: '1px solid #cbd5e1', color: '#334155',
                                          width: '30px', height: '30px', borderRadius: '8px',
                                          display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
                                        }}
                                      >
                                        <Pencil size={12} />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleDetachFile(item)}
                                        title="Remove File Attachment"
                                        style={{
                                          background: '#fef2f2', border: '1px solid #fecdd3', color: '#dc2626',
                                          width: '30px', height: '30px', borderRadius: '8px',
                                          display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
                                        }}
                                      >
                                        <Trash2 size={12} />
                                      </button>
                                    </div>
                                  )}
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

      {/* ── ADMIN ADD / EDIT MODULE MODAL ──────────────────────────────── */}
      {showModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 99999, padding: '0.75rem'
        }}>
          <div style={{
            background: '#ffffff', borderRadius: '22px', width: '100%', maxWidth: '680px', maxHeight: '90vh', overflowY: 'auto',
            padding: '1.75rem', boxShadow: '0 25px 60px rgba(0,0,0,0.25)', position: 'relative'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1.3rem', fontWeight: 900, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <BookOpen size={22} style={{ color: '#be123c' }} /> {editingItem ? 'Edit Module / Workshop Details' : 'Add Module / Workshop Material'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveModule} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
              <div>
                <label className="ft-label">Title *</label>
                <input
                  type="text"
                  className="ft-input"
                  placeholder="e.g. Orientation Lecture: Competition Rules & Criteria"
                  value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  required
                />
              </div>

              {/* Week Assignment & Target Track */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                <div>
                  <label className="ft-label">Assign to Week *</label>
                  <select
                    className="ft-select"
                    value={form.weekNumber}
                    onChange={e => setForm({ ...form, weekNumber: Number(e.target.value) })}
                  >
                    <option value={1}>Week 1</option>
                    <option value={2}>Week 2</option>
                    <option value={3}>Week 3</option>
                    <option value={4}>Week 4</option>
                    <option value={5}>Week 5</option>
                    <option value={6}>Week 6</option>
                  </select>
                </div>

                <div>
                  <label className="ft-label">Target Track *</label>
                  <select
                    className="ft-select"
                    value={form.targetTrack}
                    onChange={e => setForm({ ...form, targetTrack: e.target.value })}
                  >
                    <option value="both">Both Tracks (Track 1 & Track 2)</option>
                    <option value="pop_science">Track 1: Pop Science Videos</option>
                    <option value="science_journalism">Track 2: Science Journalism</option>
                  </select>
                </div>
              </div>

              {/* Exact Date & Time */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                <div>
                  <label className="ft-label">Exact Start Date & Time</label>
                  <input
                    type="datetime-local"
                    className="ft-input"
                    value={form.startDate}
                    onChange={e => setForm({ ...form, startDate: e.target.value })}
                  />
                  <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block', marginTop: '0.2rem' }}>
                    Auto-scratches & dims if passed.
                  </span>
                </div>

                <div>
                  <label className="ft-label">Exact End Date & Time (Optional)</label>
                  <input
                    type="datetime-local"
                    className="ft-input"
                    value={form.endDate}
                    onChange={e => setForm({ ...form, endDate: e.target.value })}
                  />
                </div>
              </div>

              {/* Speaker / Trainer & Live Meeting Link */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                <div>
                  <label className="ft-label">Speaker / Trainer Name</label>
                  <input
                    type="text"
                    className="ft-input"
                    placeholder="e.g. Abdullah Amr Maged"
                    value={form.speakerName}
                    onChange={e => setForm({ ...form, speakerName: e.target.value })}
                  />
                </div>

                <div>
                  <label className="ft-label">Live Session Meeting URL (Zoom/Teams)</label>
                  <input
                    type="url"
                    className="ft-input"
                    placeholder="https://zoom.us/j/..."
                    value={form.meetingLink}
                    onChange={e => setForm({ ...form, meetingLink: e.target.value })}
                  />
                </div>
              </div>

              {/* Attached Resource File (Separated Section) */}
              <div style={{
                background: '#f8fafc', padding: '1rem', borderRadius: '14px', border: '1.5px solid #e2e8f0',
                display: 'flex', flexDirection: 'column', gap: '0.85rem'
              }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Paperclip size={16} style={{ color: '#2563eb' }} /> Attached Resource File (Always Available & Not Dimmed)
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.85rem' }}>
                  <div>
                    <label className="ft-label">File Display Name</label>
                    <input
                      type="text"
                      className="ft-input"
                      placeholder="e.g. Orientation_Presentation.pdf"
                      value={form.fileName}
                      onChange={e => setForm({ ...form, fileName: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="ft-label">File Link / URL (Google Drive / PDF)</label>
                    <input
                      type="url"
                      className="ft-input"
                      placeholder="https://drive.google.com/... or direct PDF link"
                      value={form.fileUrl}
                      onChange={e => setForm({ ...form, fileUrl: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="ft-label">Overview / Description (Arabic & English)</label>
                <textarea
                  className="ft-textarea"
                  rows={3}
                  placeholder="Key briefing points, topics covered, instructions..."
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                <button type="button" className="ft-btn ft-btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="ft-btn ft-btn-primary">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── QUICK ATTACH FILE MODAL ──────────────────────────────── */}
      {attachModalItem && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 99999, padding: '0.75rem'
        }}>
          <div style={{
            background: '#ffffff', borderRadius: '22px', width: '100%', maxWidth: '540px',
            padding: '1.75rem', boxShadow: '0 25px 60px rgba(0,0,0,0.25)', position: 'relative'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Paperclip size={20} style={{ color: '#2563eb' }} /> Attach Resource File
                </h2>
                <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '0.25rem 0 0 0', fontWeight: 600 }}>
                  For: <strong>{attachModalItem.title}</strong>
                </p>
              </div>
              <button
                onClick={() => setAttachModalItem(null)}
                style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveQuickAttachment} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label className="ft-label">Resource File Name *</label>
                <input
                  type="text"
                  className="ft-input"
                  placeholder="e.g. Workshop_Presentation.pdf"
                  value={attachFileName}
                  onChange={e => setAttachFileName(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="ft-label">Resource File URL (Google Drive / Direct PDF link) *</label>
                <input
                  type="url"
                  className="ft-input"
                  placeholder="https://drive.google.com/... or PDF link"
                  value={attachFileUrl}
                  onChange={e => setAttachFileUrl(e.target.value)}
                  required
                />
              </div>

              <div style={{ background: '#eff6ff', padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid #bfdbfe', fontSize: '0.8rem', color: '#1e40af', fontWeight: 600 }}>
                💡 Attached files remain always accessible and active for competitors even if the live workshop time has passed.
              </div>

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                <button type="button" className="ft-btn ft-btn-outline" onClick={() => setAttachModalItem(null)}>Cancel</button>
                <button type="submit" className="ft-btn ft-btn-primary" disabled={isSavingAttachment}>
                  {isSavingAttachment ? 'Attaching...' : 'Attach File'}
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
                <label className="ft-label">Select Destination Week *</label>
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
                  <option value={6}>Week 6: Additional Modules</option>
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
