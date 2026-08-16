import { useState, useMemo, useEffect } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { BookOpen, FileText, ChevronDown, ChevronRight, ExternalLink, Plus, Calendar, Clock, User, Download, CheckCircle2, Search, Layers, GripVertical, Video, Pencil, Trash2, X, Sparkles } from 'lucide-react';
import { useAuth } from './context/AuthContext';
import { db, useLiveCollection } from './db';
import { normalizeTrackKey, renderFormattedDescription } from './ftConstants';
import './scicommspark.css';

export default function FTModulesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const outletContext = useOutletContext();
  
  const scientists = useLiveCollection('scientists') || [];
  const dynamicWorkshops = useLiveCollection('workshops') || [];
  const customModules = useLiveCollection('ft_modules') || [];

  const isAdmin = ['admin', 'master'].includes(user?.role);
  const isTrainer = ['trainer', 'trainer_judge'].includes(user?.role);
  const canManage = isAdmin || isTrainer;

  // Registered track detection
  const meDoc = useMemo(() => scientists.find(s => s.id === user?.id || s.username === user?.username) || user, [scientists, user]);
  const userTrack = normalizeTrackKey(user?.registeredTrack || meDoc?.registeredTrack || user?.track) || 'pop_science';

  // Selected Track Filter
  const [selectedTrack, setSelectedTrack] = useState(userTrack === 'science_journalism' ? 'science_journalism' : 'pop_science');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Accordion Expand/Collapse state: Map of weekId -> boolean
  const [collapsedWeeks, setCollapsedWeeks] = useState({});

  // Admin Add/Edit Material Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [form, setForm] = useState({
    title: '',
    weekNumber: 1,
    weekTitle: 'Week 1: Foundations & Orientation',
    fileName: '',
    fileUrl: '',
    meetingLink: '',
    type: 'pdf', // pdf, video, doc, session
    targetTrack: 'both',
    speakerName: '',
    description: ''
  });

  const toggleWeek = (weekKey) => {
    setCollapsedWeeks(prev => ({
      ...prev,
      [weekKey]: !prev[weekKey]
    }));
  };

  const collapseAll = () => {
    const collapsedMap = {};
    groupedWeeks.forEach(g => { collapsedMap[g.weekKey] = true; });
    setCollapsedWeeks(collapsedMap);
  };

  const expandAll = () => {
    setCollapsedWeeks({});
  };

  // Combine workshops from Firestore & custom uploaded modules into Canvas/Coursera Weekly Groups
  const groupedWeeks = useMemo(() => {
    const normTrack = normalizeTrackKey(selectedTrack);

    // 1. All available items (workshops + custom modules)
    const allItems = [];

    // Map workshops
    (dynamicWorkshops || []).forEach(ws => {
      const target = normalizeTrackKey(ws.targetTrack || ws.trackKey || 'both');
      if (target === 'both' || target === 'all' || target === normTrack || !ws.targetTrack) {
        allItems.push({
          id: ws.id,
          source: 'workshop',
          title: ws.title,
          weekNumber: ws.weekNumber || 1,
          weekTitle: ws.weekTitle || `Week ${ws.weekNumber || 1}: Course & Practical Workshops`,
          fileName: ws.fileName || (ws.fileUrl ? 'Workshop_Materials_Presentation.pdf' : ''),
          fileUrl: ws.fileUrl || ws.presentationLink || '',
          meetingLink: ws.meetingLink || '',
          type: ws.type || 'Workshop',
          targetTrack: target,
          speakerName: ws.trainerName || ws.speakerName || '',
          startDate: ws.startDate || '',
          description: ws.description || ''
        });
      }
    });

    // Map custom modules
    (customModules || []).forEach(mod => {
      const target = normalizeTrackKey(mod.targetTrack || 'both');
      if (target === 'both' || target === 'all' || target === normTrack || !mod.targetTrack) {
        allItems.push({
          id: mod.id,
          source: 'custom_module',
          title: mod.title,
          weekNumber: mod.weekNumber || 1,
          weekTitle: mod.weekTitle || `Week ${mod.weekNumber || 1}: Course Modules`,
          fileName: mod.fileName || 'Course_Handout.pdf',
          fileUrl: mod.fileUrl || '',
          meetingLink: mod.meetingLink || '',
          type: mod.type || 'pdf',
          targetTrack: target,
          speakerName: mod.speakerName || '',
          startDate: mod.createdAt || '',
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

    // Default structure if empty or for organize by week
    const defaultWeeks = [
      { weekNumber: 1, weekKey: 'week-1', weekTitle: 'Week 1: Foundations & Competition Orientation' },
      { weekNumber: 2, weekKey: 'week-2', weekTitle: 'Week 2: Scriptwriting & Scientific Storytelling' },
      { weekNumber: 3, weekKey: 'week-3', weekTitle: 'Week 3: On-Camera Delivery, Voice Acting & Mobile Editing' },
      { weekNumber: 4, weekKey: 'week-4', weekTitle: 'Week 4: Science Journalism Writing & Editorial Ethics' },
      { weekNumber: 5, weekKey: 'week-5', weekTitle: 'Week 5: Live Stage Performance & Showmanship' }
    ];

    // Group items into weeks
    const weekMap = {};

    // Initialize default weeks
    defaultWeeks.forEach(w => {
      weekMap[w.weekKey] = {
        weekNumber: w.weekNumber,
        weekKey: w.weekKey,
        weekTitle: w.weekTitle,
        items: []
      };
    });

    // Distribute items into weeks
    searchFiltered.forEach(item => {
      // Determine week key
      let weekNum = item.weekNumber || 1;

      // If item has a startDate, calculate week relative to competition start date (Aug 1)
      if (item.startDate) {
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
        weekMap[weekKey] = {
          weekNumber: weekNum,
          weekKey,
          weekTitle: item.weekTitle || `Week ${weekNum}: Training & Learning Modules`,
          items: []
        };
      }

      weekMap[weekKey].items.push(item);
    });

    // Sort weeks by weekNumber
    const result = Object.values(weekMap).sort((a, b) => a.weekNumber - b.weekNumber);

    // Sort items within each week chronologically or by ID
    result.forEach(w => {
      w.items.sort((a, b) => new Date(a.startDate || 0) - new Date(b.startDate || 0));
    });

    return result;
  }, [dynamicWorkshops, customModules, selectedTrack, searchQuery]);

  // Admin Save Custom Module Item
  const handleSaveModule = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        title: form.title,
        weekNumber: Number(form.weekNumber) || 1,
        weekTitle: `Week ${form.weekNumber || 1}: ${form.weekTitle || 'Course Modules'}`,
        fileName: form.fileName || 'Module_Material.pdf',
        fileUrl: form.fileUrl || '',
        meetingLink: form.meetingLink || '',
        type: form.type || 'pdf',
        targetTrack: form.targetTrack || 'both',
        speakerName: form.speakerName || '',
        description: form.description || '',
        updatedAt: new Date().toISOString()
      };

      if (editingItem && editingItem.source === 'custom_module') {
        await db.ft_modules.update(editingItem.id, payload);
      } else {
        await db.ft_modules.add({ ...payload, createdAt: new Date().toISOString() });
      }

      setShowModal(false);
      setEditingItem(null);
      setForm({
        title: '', weekNumber: 1, weekTitle: 'Week 1: Foundations & Orientation',
        fileName: '', fileUrl: '', meetingLink: '', type: 'pdf', targetTrack: 'both', speakerName: '', description: ''
      });
    } catch (err) {
      alert('Failed to save module: ' + err.message);
    }
  };

  const handleDeleteModule = async (item) => {
    if (!window.confirm(`Delete module item "${item.title}"?`)) return;
    try {
      if (item.source === 'custom_module') {
        await db.ft_modules.delete(item.id);
      } else if (item.source === 'workshop') {
        await db.workshops.delete(item.id);
      }
    } catch (err) {
      alert('Failed to delete item: ' + err.message);
    }
  };

  return (
    <div style={{ maxWidth: '1240px', margin: '0 auto', padding: '1.5rem 1rem 4rem 1rem', fontFamily: "'Outfit', sans-serif" }}>
      {/* ── TOP LMS HEADER BAR ──────────────────────────────── */}
      <div style={{
        background: '#ffffff', borderRadius: '24px', padding: '1.75rem 2rem',
        border: '1.5px solid #e2e8f0', boxShadow: '0 8px 30px rgba(15, 23, 42, 0.04)',
        marginBottom: '2rem'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.25rem' }}>
          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: 900, textTransform: 'uppercase', color: '#be123c', letterSpacing: '0.08em', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Sparkles size={15} /> AIU SciComm Spark LMS
            </div>
            <h1 style={{ fontSize: '1.85rem', fontWeight: 900, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <BookOpen size={30} style={{ color: '#be123c' }} /> Course & Training Modules
            </h1>
            <p style={{ fontSize: '0.9rem', color: '#64748b', margin: '0.35rem 0 0 0', fontWeight: 600 }}>
              Structured weekly learning modules, lecture PDFs, scripting guides, and workshop resources.
            </p>
          </div>

          {/* Action Buttons & Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={Object.keys(collapsedWeeks).length > 0 ? expandAll : collapseAll}
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
                onClick={() => {
                  setEditingItem(null);
                  setForm({ title: '', weekNumber: 1, weekTitle: 'Foundations & Orientation', fileName: '', fileUrl: '', meetingLink: '', type: 'pdf', targetTrack: 'both', speakerName: '', description: '' });
                  setShowModal(true);
                }}
                style={{
                  padding: '0.65rem 1.25rem', borderRadius: '12px',
                  background: 'linear-gradient(135deg, #be123c 0%, #e11d48 100%)',
                  color: '#ffffff', fontWeight: 900, fontSize: '0.88rem', border: 'none',
                  cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.45rem',
                  boxShadow: '0 4px 16px rgba(190, 18, 60, 0.35)'
                }}
              >
                <Plus size={18} /> + Add Module Material
              </button>
            )}
          </div>
        </div>

        {/* Search Bar & Track Buttons */}
        <div style={{ marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px dashed #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          
          {/* 2 Track Selector Buttons */}
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
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
          <div style={{ position: 'relative', width: '280px' }}>
            <Search size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Search module materials..."
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

      {/* ── CANVAS LMS STYLE ACCORDION MODULE GROUPS ──────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {groupedWeeks.map((weekGroup) => {
          const isCollapsed = Boolean(collapsedWeeks[weekGroup.weekKey]);
          const itemCount = weekGroup.items.length;

          return (
            <div
              key={weekGroup.weekKey}
              style={{
                background: '#ffffff', borderRadius: '18px', border: '1.5px solid #e2e8f0',
                boxShadow: '0 4px 16px rgba(15, 23, 42, 0.03)', overflow: 'hidden',
                transition: 'all 0.2s ease'
              }}
            >
              {/* Accordion Week Header (Canvas LMS Style Light Header Bar) */}
              <div
                onClick={() => toggleWeek(weekGroup.weekKey)}
                style={{
                  padding: '1.1rem 1.5rem', background: '#f8fafc', borderBottom: isCollapsed ? 'none' : '1px solid #e2e8f0',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer',
                  userSelect: 'none'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <GripVertical size={18} style={{ color: '#94a3b8' }} />
                  <div style={{
                    width: '24px', height: '24px', borderRadius: '50%', background: isCollapsed ? '#cbd5e1' : '#be123c',
                    color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'transform 0.2s ease', flexShrink: 0
                  }}>
                    {isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                  </div>

                  <h3 style={{ fontSize: '1.1rem', fontWeight: 900, color: '#0f172a', margin: 0 }}>
                    {weekGroup.weekTitle}
                  </h3>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{
                    fontSize: '0.78rem', fontWeight: 800, padding: '0.22rem 0.65rem', borderRadius: '8px',
                    background: itemCount > 0 ? '#eff6ff' : '#f1f5f9', color: itemCount > 0 ? '#2563eb' : '#64748b',
                    border: `1px solid ${itemCount > 0 ? '#bfdbfe' : '#cbd5e1'}`
                  }}>
                    {itemCount} {itemCount === 1 ? 'Material Item' : 'Items'}
                  </span>

                  <CheckCircle2 size={18} style={{ color: itemCount > 0 ? '#059669' : '#cbd5e1' }} />
                </div>
              </div>

              {/* Accordion Week Body (Canvas LMS List Item Rows) */}
              {!isCollapsed && (
                <div>
                  {itemCount === 0 ? (
                    <div style={{ padding: '2rem 1.5rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.88rem', fontStyle: 'italic', fontWeight: 600 }}>
                      No materials uploaded for this week yet.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      {weekGroup.items.map((item, idx) => {
                        const fileUrl = item.fileUrl || item.presentationLink;

                        return (
                          <div
                            key={item.id || idx}
                            style={{
                              padding: '1.1rem 1.5rem',
                              borderBottom: idx === itemCount - 1 ? 'none' : '1px solid #f1f5f9',
                              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                              flexWrap: 'wrap', gap: '1rem', background: '#ffffff',
                              transition: 'background 0.15s ease'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                            onMouseLeave={(e) => e.currentTarget.style.background = '#ffffff'}
                          >
                            {/* Left Info Column */}
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem', flex: 1, minWidth: '280px' }}>
                              <GripVertical size={16} style={{ color: '#cbd5e1', marginTop: '0.25rem', flexShrink: 0 }} />

                              <div style={{
                                width: '38px', height: '38px', borderRadius: '10px',
                                background: fileUrl ? '#eff6ff' : item.meetingLink ? '#ecfdf5' : '#f8fafc',
                                border: `1.5px solid ${fileUrl ? '#bfdbfe' : item.meetingLink ? '#a7f3d0' : '#e2e8f0'}`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                              }}>
                                {fileUrl ? (
                                  <FileText size={18} style={{ color: '#2563eb' }} />
                                ) : item.meetingLink ? (
                                  <Video size={18} style={{ color: '#059669' }} />
                                ) : (
                                  <BookOpen size={18} style={{ color: '#be123c' }} />
                                )}
                              </div>

                              <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.2rem' }}>
                                  <span style={{ fontSize: '1rem', fontWeight: 900, color: '#0f172a', lineHeight: 1.3 }}>
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
                                </div>

                                {/* Details Subtitle */}
                                <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.85rem', flexWrap: 'wrap' }}>
                                  {item.fileName && (
                                    <span style={{ color: '#2563eb', fontWeight: 800 }}>📎 {item.fileName}</span>
                                  )}
                                  {item.speakerName && (
                                    <span>👤 Speaker: <strong>{item.speakerName}</strong></span>
                                  )}
                                  {item.startDate && (
                                    <span>🕒 {new Date(item.startDate).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                  )}
                                </div>

                                {item.description && (
                                  <div style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '0.35rem', lineHeight: 1.4 }} dir="auto">
                                    {renderFormattedDescription(item.description)}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Right Action Buttons */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexShrink: 0 }}>
                              {fileUrl ? (
                                <a
                                  href={fileUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  style={{
                                    background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                                    color: '#ffffff', padding: '0.5rem 1rem', borderRadius: '10px',
                                    fontSize: '0.82rem', fontWeight: 900, textDecoration: 'none',
                                    display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                                    boxShadow: '0 3px 10px rgba(37, 99, 235, 0.25)'
                                  }}
                                >
                                  Open File <ExternalLink size={14} />
                                </a>
                              ) : item.meetingLink ? (
                                <a
                                  href={item.meetingLink}
                                  target="_blank"
                                  rel="noreferrer"
                                  style={{
                                    background: '#059669', color: '#ffffff', padding: '0.5rem 1rem', borderRadius: '10px',
                                    fontSize: '0.82rem', fontWeight: 900, textDecoration: 'none',
                                    display: 'inline-flex', alignItems: 'center', gap: '0.4rem'
                                  }}
                                >
                                  Join Live Session <ExternalLink size={14} />
                                </a>
                              ) : (
                                <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontStyle: 'italic', fontWeight: 600 }}>
                                  Pending File Link
                                </span>
                              )}

                              <CheckCircle2 size={18} style={{ color: '#059669', marginLeft: '0.25rem' }} />

                              {/* Admin Management Controls */}
                              {canManage && (
                                <div style={{ display: 'flex', gap: '0.35rem', marginLeft: '0.5rem', borderLeft: '1px solid #e2e8f0', paddingLeft: '0.5rem' }}>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteModule(item)}
                                    title="Delete Material"
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
          zIndex: 99999, padding: '1rem'
        }}>
          <div style={{
            background: '#ffffff', borderRadius: '24px', width: '100%', maxWidth: '620px',
            padding: '2rem', boxShadow: '0 25px 60px rgba(0,0,0,0.25)', position: 'relative'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 900, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <BookOpen size={22} style={{ color: '#be123c' }} /> Add Course Module Material
              </h2>
              <button
                onClick={() => setShowModal(false)}
                style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveModule} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label className="ft-label">Material / Lecture Title *</label>
                <input
                  type="text"
                  className="ft-input"
                  placeholder="e.g. Lec 1: Introduction to Pop Science Scriptwriting"
                  value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label className="ft-label">Assign to Week *</label>
                  <select
                    className="ft-select"
                    value={form.weekNumber}
                    onChange={e => setForm({ ...form, weekNumber: Number(e.target.value) })}
                  >
                    <option value={1}>Week 1: Foundations & Orientation</option>
                    <option value={2}>Week 2: Scriptwriting & Storytelling</option>
                    <option value={3}>Week 3: Voice & Video Production</option>
                    <option value={4}>Week 4: Science Journalism Ethics</option>
                    <option value={5}>Week 5: Stage Performance & Showmanship</option>
                  </select>
                </div>

                <div>
                  <label className="ft-label">Target Track *</label>
                  <select
                    className="ft-select"
                    value={form.targetTrack}
                    onChange={e => setForm({ ...form, targetTrack: e.target.value })}
                  >
                    <option value="both">Both Tracks (Track 1 & 2)</option>
                    <option value="pop_science">Track 1: Pop Science Videos</option>
                    <option value="science_journalism">Track 2: Science Journalism</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label className="ft-label">Resource File Name</label>
                  <input
                    type="text"
                    className="ft-input"
                    placeholder="e.g. Lec.1_Scripting_Guide.pdf"
                    value={form.fileName}
                    onChange={e => setForm({ ...form, fileName: e.target.value })}
                  />
                </div>

                <div>
                  <label className="ft-label">Speaker / Instructor Name</label>
                  <input
                    type="text"
                    className="ft-input"
                    placeholder="e.g. Abdullah Amr Maged"
                    value={form.speakerName}
                    onChange={e => setForm({ ...form, speakerName: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="ft-label">Resource File URL (Google Drive / PDF Link)</label>
                <input
                  type="url"
                  className="ft-input"
                  placeholder="https://drive.google.com/... or PDF link"
                  value={form.fileUrl}
                  onChange={e => setForm({ ...form, fileUrl: e.target.value })}
                />
              </div>

              <div>
                <label className="ft-label">Live Session Meeting URL (Optional Zoom/Teams)</label>
                <input
                  type="url"
                  className="ft-input"
                  placeholder="https://zoom.us/j/..."
                  value={form.meetingLink}
                  onChange={e => setForm({ ...form, meetingLink: e.target.value })}
                />
              </div>

              <div>
                <label className="ft-label">Module Description / Overview</label>
                <textarea
                  className="ft-textarea"
                  rows={3}
                  placeholder="Brief description of key learning points and resources..."
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button type="button" className="ft-btn ft-btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="ft-btn ft-btn-primary">Save Material</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
