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

  // Build grouped weeks with automatic workshop mapping and chronological sorting
  const groupedWeeks = useMemo(() => {
    const normTrack = normalizeTrackKey(selectedTrack);
    const allItems = [];

    // Map Workshops automatically from timeline / workshop settings
    (dynamicWorkshops || []).forEach(ws => {
      const target = normalizeTrackKey(ws.targetTrack || ws.trackKey || 'both');
      if (target === 'both' || target === 'all' || target === normTrack || !ws.targetTrack) {
        const fileUrl = ws.fileUrl || ws.presentationLink || '';
        const isPassed = isEventPassed(ws.startDate, ws.endDate);

        allItems.push({
          id: ws.id,
          source: 'workshop',
          title: ws.title,
          weekNumber: Number(ws.weekNumber) || 0,
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

    // Initialize with default weeks unless deleted by admin
    defaultWeeks.forEach(w => {
      const customTitleDoc = customWeekTitles.find(c => c.id === w.weekKey || c.weekKey === w.weekKey);
      if (customTitleDoc?.deleted) return; // Skip deleted weeks

      const title = customTitleDoc?.title || w.defaultTitle;
      weekMap[w.weekKey] = {
        weekNumber: w.weekNumber,
        weekKey: w.weekKey,
        weekTitle: title,
        items: []
      };
    });

    // Add any custom added weeks from Firestore
    customWeekTitles.forEach(c => {
      if (c.deleted) return;
      const weekKey = c.weekKey || c.id || `week-${c.weekNumber}`;
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

    // Distribute workshops automatically into week groups
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

      const weekKey = `week-${weekNum}`;
      if (!weekMap[weekKey]) {
        const customTitleDoc = customWeekTitles.find(c => c.id === weekKey || c.weekKey === weekKey);
        weekMap[weekKey] = {
          weekNumber: weekNum,
          weekKey,
          weekTitle: customTitleDoc?.title || `Week ${weekNum}: Training & Learning Modules`,
          items: []
        };
      }

      weekMap[weekKey].items.push(item);
    });

    // Sort weeks by weekNumber
    const result = Object.values(weekMap).sort((a, b) => a.weekNumber - b.weekNumber);

    // Sort items within each week chronologically by date and time
    result.forEach(w => {
      w.items.sort((a, b) => new Date(a.startDate || 0) - new Date(b.startDate || 0));
    });

    return result;
  }, [dynamicWorkshops, customWeekTitles, selectedTrack, searchQuery]);

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
      await db.workshops.update(draggedItem.id, updatePayload);
    } catch (err) {
      alert('Failed to move workshop: ' + err.message);
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
      await db.workshops.update(moveModalItem.id, updatePayload);
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

  // Open Add New Week Modal
  const handleOpenAddWeekModal = () => {
    const maxWeek = groupedWeeks.reduce((max, w) => Math.max(max, w.weekNumber), 0);
    const nextNum = maxWeek + 1;
    setNewWeekNumber(nextNum);
    setNewWeekTitle(`Week ${nextNum}: New Learning & Workshop Modules`);
    setShowAddWeekModal(true);
  };

  // Handle Creating New Week
  const handleCreateNewWeek = async (e) => {
    e.preventDefault();
    if (!newWeekTitle.trim()) return;
    setIsSavingNewWeek(true);
    try {
      const weekKey = `week-${newWeekNumber}`;
      await db.ft_week_titles.set(weekKey, {
        id: weekKey,
        weekKey,
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

  // Handle Deleting a Week
  const handleDeleteWeek = async (weekGroup) => {
    if (!window.confirm(`Are you sure you want to delete "${weekGroup.weekTitle}"?`)) return;

    try {
      // Reassign any workshops in this week to week 1 so they are not lost
      const workshopsInThisWeek = dynamicWorkshops.filter(ws => (Number(ws.weekNumber) || 1) === weekGroup.weekNumber);
      for (const ws of workshopsInThisWeek) {
        await db.workshops.update(ws.id, { weekNumber: 1, updatedAt: new Date().toISOString() });
      }

      // Mark week as deleted in Firestore
      await db.ft_week_titles.set(weekGroup.weekKey, {
        id: weekGroup.weekKey,
        weekKey: weekGroup.weekKey,
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
              <BookOpen size={28} style={{ color: '#be123c' }} /> Course & Training Modules
            </h1>
            <p style={{ fontSize: '0.9rem', color: '#64748b', margin: '0.35rem 0 0 0', fontWeight: 600 }}>
              Structured weekly learning modules and workshops automatically populated from timeline settings.
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
                <Plus size={18} /> + Add New Week
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
          <div style={{ marginTop: '0.75rem', fontSize: '0.78rem', color: '#64748b', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
            <span>💡 <strong>Note:</strong> Workshops and attached files are automatically populated from Timeline Settings and organized by date/time. You can add or delete weeks here, edit week titles, or drag items between weeks.</span>
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

                {/* Right Badges, Item Count & Delete Week Control */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <span style={{
                    fontSize: '0.78rem', fontWeight: 800, padding: '0.22rem 0.65rem', borderRadius: '8px',
                    background: itemCount > 0 ? '#eff6ff' : '#f1f5f9', color: itemCount > 0 ? '#2563eb' : '#64748b',
                    border: `1px solid ${itemCount > 0 ? '#bfdbfe' : '#cbd5e1'}`
                  }}>
                    {itemCount} {itemCount === 1 ? 'Workshop' : 'Workshops'}
                  </span>

                  {canManage && (
                    <button
                      type="button"
                      onClick={() => handleDeleteWeek(weekGroup)}
                      title={`Delete ${weekGroup.weekTitle}`}
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
                      No workshops scheduled for this week yet. Workshops added in Workshop Timeline Settings will automatically appear here.
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

      {/* ── ADD NEW WEEK MODAL ────────────────────────────────────── */}
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
              <h2 style={{ fontSize: '1.3rem', fontWeight: 900, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Plus size={22} style={{ color: '#be123c' }} /> Add New Course Week
              </h2>
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
                  placeholder="e.g. Week 6: Post-Production, Pitching & Showcase"
                  value={newWeekTitle}
                  onChange={e => setNewWeekTitle(e.target.value)}
                  required
                />
              </div>

              <div style={{ background: '#eff6ff', padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid #bfdbfe', fontSize: '0.8rem', color: '#1e40af', fontWeight: 600 }}>
                💡 Workshops and files added in Workshop Timeline Settings will automatically arrange into this week by their dates.
              </div>

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button type="button" className="ft-btn ft-btn-outline" onClick={() => setShowAddWeekModal(false)}>Cancel</button>
                <button type="submit" className="ft-btn ft-btn-primary" disabled={isSavingNewWeek}>
                  {isSavingNewWeek ? 'Creating...' : '+ Create Week'}
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
                  <ArrowRightLeft size={20} style={{ color: '#be123c' }} /> Move Workshop to Week
                </h2>
                <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '0.25rem 0 0 0', fontWeight: 600 }}>
                  Workshop: <strong>{moveModalItem.title}</strong>
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
