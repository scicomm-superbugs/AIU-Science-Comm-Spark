import { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { useLiveCollection, db } from './db';
import { Calendar, Clock, Plus, Trash2, Edit3, AlertCircle, CheckCircle2, User, MapPin, Link2, ExternalLink, Video, BookOpen, Layers, Search, Award, Send, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import './scicommspark.css';

export default function WorkshopManager({ isAdmin = true, isTrainer = true, currentTrack = 'all' }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const workshops = useLiveCollection('workshops') || [];
  const allAccounts = useLiveCollection('scientists') || [];
  const customConfig = useLiveCollection('timeline_config') || [];

  const meDoc = useMemo(() => allAccounts.find(s => s.id === user?.id || s.username === user?.username) || user, [allAccounts, user]);
  const isCompetitorUser = !user || user.role === 'competitor' || user.role === 'user';
  const competitorTrack = meDoc?.registeredTrack || user?.registeredTrack || 'pop_science';

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Default Stage Milestones for both competition tracks
  const defaultStageMilestones = useMemo(() => {
    const getDeadline = (stageId, trackId, fallback) => {
      const found = customConfig.find(c => c.stageId === stageId && c.trackId === trackId);
      if (found && found.deadline && found.deadline !== '2026-07-31' && found.deadline !== 'TBD') {
        return found.deadline.includes('T') ? found.deadline : `${found.deadline}T23:59`;
      }
      return fallback;
    };

    return [
      {
        id: 'stage_pop_1',
        stageId: 1,
        isStage: true,
        title: 'Stage 1 Submission Deadline: Short Pop Video (Reels/TikTok)',
        type: 'Stage Milestone',
        targetTrack: 'pop_science',
        description: 'Submission deadline for 90-second Short Pop-Science video concept.',
        startDate: getDeadline(1, 'pop_science', '2026-09-01T23:59'),
        endDate: getDeadline(1, 'pop_science', '2026-09-01T23:59')
      },
      {
        id: 'stage_pop_2',
        stageId: 2,
        isStage: true,
        title: 'Stage 2 Submission Deadline: Long Pop Video (YouTube)',
        type: 'Stage Milestone',
        targetTrack: 'pop_science',
        description: 'Submission deadline for up to 3-minute YouTube Pop-Science video.',
        startDate: getDeadline(2, 'pop_science', '2026-09-20T23:59'),
        endDate: getDeadline(2, 'pop_science', '2026-09-20T23:59')
      },
      {
        id: 'stage_pop_3',
        stageId: 3,
        isStage: true,
        title: 'Stage 3 (Finals) Grand Finale: Live Stage Show',
        type: 'Stage Milestone',
        targetTrack: 'pop_science',
        description: 'Grand Finale live stage show presentation in front of judges.',
        startDate: getDeadline(3, 'pop_science', '2026-10-10T23:59'),
        endDate: getDeadline(3, 'pop_science', '2026-10-10T23:59')
      },
      {
        id: 'stage_jour_1',
        stageId: 1,
        isStage: true,
        title: 'Stage 1 Submission Deadline: Field Research & Prep',
        type: 'Stage Milestone',
        targetTrack: 'science_journalism',
        description: 'Submission deadline for field interviews & scientific preparation.',
        startDate: getDeadline(1, 'science_journalism', '2026-09-01T23:59'),
        endDate: getDeadline(1, 'science_journalism', '2026-09-01T23:59')
      },
      {
        id: 'stage_jour_2',
        stageId: 2,
        isStage: true,
        title: 'Stage 2 Submission Deadline: Digital Science Article',
        type: 'Stage Milestone',
        targetTrack: 'science_journalism',
        description: 'Submission deadline for published digital journalism science article.',
        startDate: getDeadline(2, 'science_journalism', '2026-09-20T23:59'),
        endDate: getDeadline(2, 'science_journalism', '2026-09-20T23:59')
      },
      {
        id: 'stage_jour_3',
        stageId: 3,
        isStage: true,
        title: 'Stage 3 (Finals) Grand Finale: Live Talk Show',
        type: 'Stage Milestone',
        targetTrack: 'science_journalism',
        description: 'Grand Finale live stage talk show interview in front of judges.',
        startDate: getDeadline(3, 'science_journalism', '2026-10-10T23:59'),
        endDate: getDeadline(3, 'science_journalism', '2026-10-10T23:59')
      }
    ];
  }, [customConfig]);

  const [trackFilter, setTrackFilter] = useState(currentTrack || 'all');

  useEffect(() => {
    if (isCompetitorUser && competitorTrack) {
      setTrackFilter(competitorTrack);
    } else if (currentTrack) {
      setTrackFilter(currentTrack);
    }
  }, [isCompetitorUser, competitorTrack, currentTrack]);

  // Master Schedule combining workshops, orientations, lectures & stage milestones
  const allMasterEvents = useMemo(() => {
    const filteredWs = workshops.filter(ws => {
      if (trackFilter === 'all' || !trackFilter) return true;
      return ws.targetTrack === 'both' || ws.targetTrack === trackFilter || !ws.targetTrack;
    });

    const filteredStages = defaultStageMilestones.filter(st => {
      if (trackFilter === 'all' || !trackFilter) return true;
      return st.targetTrack === trackFilter;
    });

    const combined = [...filteredWs, ...filteredStages];
    return combined.sort((a, b) => new Date(a.startDate || '2099-01-01') - new Date(b.startDate || '2099-01-01'));
  }, [workshops, defaultStageMilestones, trackFilter]);

  // Calendar View Mode & Selected Date State
  const [viewMode, setViewMode] = useState('calendar'); // 'calendar' (default) or 'list'

  const getFormattedDateString = (d) => {
    if (!d) return '';
    const dateObj = new Date(d);
    if (isNaN(dateObj.getTime())) return '';
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const todayStr = useMemo(() => getFormattedDateString(new Date()), []);
  const [selectedDateStr, setSelectedDateStr] = useState(todayStr);
  const [calendarMonth, setCalendarMonth] = useState(new Date());

  // Dictionary of events keyed by YYYY-MM-DD
  const eventsByDate = useMemo(() => {
    const map = {};
    allMasterEvents.forEach(evt => {
      const dateKey = getFormattedDateString(evt.startDate || evt.endDate);
      if (dateKey) {
        if (!map[dateKey]) map[dateKey] = [];
        map[dateKey].push(evt);
      }
    });
    return map;
  }, [allMasterEvents]);

  // Events on currently selected date
  const selectedDayEvents = useMemo(() => {
    return eventsByDate[selectedDateStr] || [];
  }, [eventsByDate, selectedDateStr]);

  // Upcoming events within next 7 days
  const upcomingThisWeekEvents = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const next7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    next7Days.setHours(23, 59, 59, 999);

    return allMasterEvents.filter(evt => {
      const evtDate = evt.startDate || evt.endDate;
      if (!evtDate) return false;
      const d = new Date(evtDate);
      return !isNaN(d.getTime()) && d >= now && d <= next7Days;
    }).sort((a, b) => new Date(a.startDate || a.endDate) - new Date(b.startDate || b.endDate));
  }, [allMasterEvents]);

  // Google Calendar Grid Math for Month View
  const calendarDays = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days = [];

    // Prev month padding
    const prevMonthDays = new Date(year, month, 0).getDate();
    for (let i = firstDay - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, prevMonthDays - i);
      days.push({
        dateObj: d,
        dateStr: getFormattedDateString(d),
        dayNum: prevMonthDays - i,
        isCurrentMonth: false
      });
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(year, month, d);
      days.push({
        dateObj,
        dateStr: getFormattedDateString(dateObj),
        dayNum: d,
        isCurrentMonth: true
      });
    }

    // Next month padding
    const totalCells = days.length > 35 ? 42 : 35;
    const remaining = totalCells - days.length;
    for (let d = 1; d <= remaining; d++) {
      const dateObj = new Date(year, month + 1, d);
      days.push({
        dateObj,
        dateStr: getFormattedDateString(dateObj),
        dayNum: d,
        isCurrentMonth: false
      });
    }

    return days;
  }, [calendarMonth]);

  const handlePrevMonth = () => {
    setCalendarMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };
  const handleNextMonth = () => {
    setCalendarMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };
  const handleTodayClick = () => {
    const today = new Date();
    setCalendarMonth(today);
    setSelectedDateStr(getFormattedDateString(today));
  };

  const [form, setForm] = useState({
    title: '',
    type: 'Workshop',
    targetTrack: 'both',
    trainerName: '',
    trainerId: '',
    startDate: '',
    endDate: '',
    meetingLink: '',
    location: '',
    description: ''
  });

  // Trainer autocomplete state
  const [trainerQuery, setTrainerQuery] = useState('');
  const [showTrainerDropdown, setShowTrainerDropdown] = useState(false);
  const [selectedTrainer, setSelectedTrainer] = useState(null);
  const trainerRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (trainerRef.current && !trainerRef.current.contains(e.target)) {
        setShowTrainerDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Filter accounts by trainer query
  const trainerSuggestions = useMemo(() => {
    if (!trainerQuery || trainerQuery.length < 1) return [];
    const q = trainerQuery.toLowerCase();
    return allAccounts
      .filter(a => a.accountStatus === 'active')
      .filter(a =>
        (a.name && a.name.toLowerCase().includes(q)) ||
        (a.username && a.username.toLowerCase().includes(q)) ||
        (a.email && a.email.toLowerCase().includes(q))
      )
      .slice(0, 6);
  }, [trainerQuery, allAccounts]);

  const handleSelectTrainer = (account) => {
    setSelectedTrainer(account);
    setTrainerQuery(account.name || account.username);
    setForm(prev => ({ ...prev, trainerName: account.name || account.username, trainerId: account.id }));
    setShowTrainerDropdown(false);
  };

  const handleClearTrainer = () => {
    setSelectedTrainer(null);
    setTrainerQuery('');
    setForm(prev => ({ ...prev, trainerName: '', trainerId: '' }));
  };

  // Helper to find trainer account for list display or modal population
  const getTrainerAccount = (ws) => {
    if (ws.trainerId) {
      return allAccounts.find(a => a.id === ws.trainerId) || null;
    }
    if (ws.trainerName) {
      return allAccounts.find(a => a.name === ws.trainerName || a.username === ws.trainerName) || null;
    }
    return null;
  };

  const handleOpenAdd = () => {
    setError('');
    setEditingId(null);
    setForm({
      title: '',
      type: 'Workshop',
      targetTrack: 'both',
      trainerName: '',
      trainerId: '',
      startDate: '',
      endDate: '',
      meetingLink: '',
      location: '',
      description: ''
    });
    setSelectedTrainer(null);
    setTrainerQuery('');
    setShowModal(true);
  };

  const handleOpenEdit = (ws) => {
    setError('');
    setEditingId(ws.id);

    // Format ISO string to datetime-local format (YYYY-MM-DDTHH:mm)
    const formatForInput = (dateStr) => {
      if (!dateStr) return '';
      try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return '';
        const pad = (num) => String(num).padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
      } catch {
        return '';
      }
    };

    setForm({
      title: ws.title || '',
      type: ws.type || 'Workshop',
      targetTrack: ws.targetTrack || 'both',
      trainerName: ws.trainerName || '',
      trainerId: ws.trainerId || '',
      startDate: formatForInput(ws.startDate),
      endDate: formatForInput(ws.endDate),
      meetingLink: ws.meetingLink || '',
      location: ws.location || '',
      description: ws.description || ''
    });

    const trainerAcc = getTrainerAccount(ws);
    if (trainerAcc) {
      setSelectedTrainer(trainerAcc);
      setTrainerQuery(trainerAcc.name || trainerAcc.username);
    } else {
      setSelectedTrainer(null);
      setTrainerQuery(ws.trainerName || '');
    }

    setShowModal(true);
  };

  // Filter workshops based on track targeting
  const filteredWorkshops = workshops.filter(ws => {
    if (currentTrack === 'all' || !currentTrack) return true;
    return ws.targetTrack === 'both' || ws.targetTrack === currentTrack || !ws.targetTrack;
  });

  // Date Overlap Conflict Prevention Engine
  const checkConflict = (newStartStr, newEndStr, currentId = null) => {
    const newStart = new Date(newStartStr).getTime();
    const effectiveEndStr = newEndStr || newStartStr;
    const newEnd = new Date(effectiveEndStr).getTime();

    if (isNaN(newStart)) {
      return 'Invalid start date provided.';
    }

    if (newEnd < newStart) {
      return 'End time cannot be earlier than start time.';
    }

    for (let ws of workshops) {
      if (currentId && ws.id === currentId) continue;
      const wsStart = new Date(ws.startDate).getTime();
      const wsEnd = new Date(ws.endDate || ws.startDate).getTime();

      // Only flag if there's an actual interval overlap with another event
      if (newStart < wsEnd && newEnd > wsStart) {
        const fmtStart = new Date(ws.startDate).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });
        const fmtEnd = new Date(ws.endDate || ws.startDate).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });
        return `Date & Time Conflict! Overlaps with event "${ws.title}" (${fmtStart} - ${fmtEnd}).`;
      }
    }
    return null;
  };

  const handleSaveWorkshop = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!form.title || !form.startDate) {
      setError('Please fill in required fields (Event Title & Start Date).');
      return;
    }

    // Auto-default end date to start date if not provided or if earlier than start date
    const finalEndDate = (form.endDate && new Date(form.endDate) >= new Date(form.startDate))
      ? form.endDate
      : form.startDate;

    const conflictErr = checkConflict(form.startDate, finalEndDate, editingId);
    if (conflictErr) {
      setError(conflictErr);
      return;
    }

    try {
      const payload = {
        title: form.title,
        type: form.type || 'Workshop',
        targetTrack: form.targetTrack || 'both',
        trainerName: form.trainerName || 'SciComm Speaker',
        trainerId: form.trainerId || '',
        startDate: form.startDate,
        endDate: finalEndDate,
        meetingLink: form.meetingLink || '',
        location: form.location || 'Online Session',
        description: form.description || '',
        updatedAt: new Date().toISOString()
      };

      if (editingId) {
        await db.workshops.update(editingId, payload);
        setSuccess('Event / Workshop updated successfully!');
      } else {
        await db.workshops.add({ ...payload, createdAt: new Date().toISOString() });
        setSuccess('Event / Workshop scheduled successfully!');

        // Trigger Notification to All Users for New Workshop
        try {
          await db.ft_notifications.add({
            targetRoles: ['competitor', 'user', 'judge', 'academic_judge', 'scicomm_judge', 'admin', 'master'],
            type: 'workshop',
            title: `🎓 New Training Workshop Scheduled`,
            message: `Workshop "${payload.title}" is scheduled for ${payload.startDate || 'upcoming session'}. Click to view details and register.`,
            link: '/dashboard/timeline',
            createdAt: new Date().toISOString(),
            status: 'unread'
          });
        } catch (nErr) {
          console.warn('Failed to send workshop notification:', nErr);
        }
      }

      setShowModal(false);
      setEditingId(null);
      setForm({ title: '', type: 'Workshop', targetTrack: 'both', trainerName: '', trainerId: '', startDate: '', endDate: '', meetingLink: '', location: '', description: '' });
      setSelectedTrainer(null);
      setTrainerQuery('');
    } catch (err) {
      setError('Failed to save event: ' + err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to cancel this event?')) return;
    try {
      await db.workshops.delete(id);
      setSuccess('Event removed successfully.');
    } catch (err) {
      alert('Error deleting event: ' + err.message);
    }
  };

  return (
    <div className="ft-card" style={{ padding: '2rem', marginTop: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontFamily: "'Outfit', sans-serif", fontSize: '1.35rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
            🗓️ Competition & Training Schedule
          </h2>
          <p style={{ color: 'var(--ft-text-muted)', fontSize: '0.88rem', marginTop: '0.2rem' }}>
            All competition stage submission deadlines, orientation sessions, lectures, and masterclasses in exact chronological order.
          </p>
        </div>

        {(isAdmin || isTrainer) && (
          <button className="ft-btn ft-btn-primary" onClick={handleOpenAdd}>
            <Plus size={18} /> Add Workshop / Lecture
          </button>
        )}
      </div>

      {/* View Switcher Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', gap: '0.4rem', background: '#e2e8f0', padding: '0.25rem', borderRadius: '10px' }}>
          <button
            type="button"
            onClick={() => setViewMode('calendar')}
            style={{
              padding: '0.45rem 0.9rem', fontSize: '0.82rem', fontWeight: 800, borderRadius: '8px', border: 'none',
              background: viewMode === 'calendar' ? 'var(--ft-primary)' : 'transparent',
              color: viewMode === 'calendar' ? '#ffffff' : '#475569',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem', transition: 'all 0.2s ease'
            }}
          >
            <Calendar size={15} /> Calendar View
          </button>

          <button
            type="button"
            onClick={() => setViewMode('list')}
            style={{
              padding: '0.45rem 0.9rem', fontSize: '0.82rem', fontWeight: 800, borderRadius: '8px', border: 'none',
              background: viewMode === 'list' ? 'var(--ft-primary)' : 'transparent',
              color: viewMode === 'list' ? '#ffffff' : '#475569',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem', transition: 'all 0.2s ease'
            }}
          >
            <Layers size={15} /> List View
          </button>
        </div>

        {viewMode === 'calendar' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button
              type="button"
              onClick={handleTodayClick}
              style={{
                padding: '0.4rem 0.85rem', fontSize: '0.8rem', fontWeight: 800, borderRadius: '8px',
                background: '#ffffff', color: 'var(--ft-primary)', border: '1.5px solid var(--ft-primary)',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem'
              }}
            >
              📅 Today
            </button>
            <div style={{ display: 'flex', alignItems: 'center', background: '#ffffff', border: '1.5px solid #cbd5e1', borderRadius: '8px' }}>
              <button
                type="button"
                onClick={handlePrevMonth}
                style={{ padding: '0.4rem 0.6rem', border: 'none', background: 'none', cursor: 'pointer', color: '#334155' }}
              >
                <ChevronLeft size={16} />
              </button>
              <span style={{ fontWeight: 800, fontSize: '0.88rem', color: '#0f172a', padding: '0 0.5rem', minWidth: '130px', textAlign: 'center' }}>
                {calendarMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </span>
              <button
                type="button"
                onClick={handleNextMonth}
                style={{ padding: '0.4rem 0.6rem', border: 'none', background: 'none', cursor: 'pointer', color: '#334155' }}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {viewMode === 'calendar' ? (
        <div className="ft-schedule-calendar-grid" style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '1.5rem', alignItems: 'start' }}>
          {/* Calendar Grid Box */}
          <div style={{ background: '#ffffff', borderRadius: '16px', border: '1.5px solid #e2e8f0', padding: '1rem', boxShadow: '0 4px 16px rgba(0,0,0,0.03)' }}>
            {/* Day Header Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.3rem', marginBottom: '0.5rem', textAlign: 'center' }}>
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                <div key={d} style={{ fontSize: '0.78rem', fontWeight: 900, color: '#64748b', padding: '0.3rem 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {d}
                </div>
              ))}
            </div>

            {/* Grid of Days */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.35rem' }}>
              {calendarDays.map((day, idx) => {
                const dayEvents = eventsByDate[day.dateStr] || [];
                const isSelected = day.dateStr === selectedDateStr;
                const isToday = day.dateStr === todayStr;

                return (
                  <div
                    key={idx}
                    onClick={() => setSelectedDateStr(day.dateStr)}
                    style={{
                      minHeight: '78px',
                      minWidth: 0,
                      boxSizing: 'border-box',
                      padding: '0.35rem',
                      borderRadius: '10px',
                      background: isSelected ? 'rgba(30, 41, 59, 0.06)' : day.isCurrentMonth ? '#f8fafc' : '#f1f5f9',
                      border: `2px solid ${isSelected ? 'var(--ft-primary)' : isToday ? '#be123c' : '#e2e8f0'}`,
                      opacity: day.isCurrentMonth ? 1 : 0.45,
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      transition: 'all 0.15s ease',
                      boxShadow: isSelected ? '0 4px 12px rgba(0,0,0,0.12)' : 'none'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{
                        fontSize: '0.82rem',
                        fontWeight: isToday || isSelected ? 900 : 700,
                        color: isToday ? '#ffffff' : day.isCurrentMonth ? '#0f172a' : '#94a3b8',
                        background: isToday ? '#be123c' : 'transparent',
                        padding: isToday ? '0.1rem 0.4rem' : '0',
                        borderRadius: '6px'
                      }}>
                        {day.dayNum}
                      </span>
                      {dayEvents.length > 0 && (
                        <span style={{ fontSize: '0.68rem', fontWeight: 900, background: 'var(--ft-primary)', color: '#ffffff', padding: '0.05rem 0.35rem', borderRadius: '10px' }}>
                          {dayEvents.length}
                        </span>
                      )}
                    </div>

                    {/* Mini event tags */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', marginTop: '0.25rem', overflow: 'hidden' }}>
                      {dayEvents.slice(0, 2).map((evt, eIdx) => {
                        const isStage = !!evt.isStage;
                        const badgeColor = isStage ? '#be123c' : evt.type === 'Orientation' ? '#0d9488' : '#2563eb';
                        return (
                          <div
                            key={eIdx}
                            style={{
                              fontSize: '0.65rem',
                              fontWeight: 800,
                              background: `${badgeColor}15`,
                              color: badgeColor,
                              borderLeft: `3px solid ${badgeColor}`,
                              padding: '0.1rem 0.3rem',
                              borderRadius: '3px',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis'
                            }}
                          >
                            {isStage ? `🏆 S${evt.stageId}` : evt.title}
                          </div>
                        );
                      })}
                      {dayEvents.length > 2 && (
                        <div style={{ fontSize: '0.6rem', color: '#64748b', fontWeight: 700, paddingLeft: '0.2rem' }}>
                          +{dayEvents.length - 2} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Selected Day Summary & Upcoming Events This Week */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Selected Day Summary Box */}
            <div style={{ background: '#f8fafc', borderRadius: '16px', border: '1.5px solid #e2e8f0', padding: '1.25rem', boxShadow: '0 4px 16px rgba(0,0,0,0.03)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
                <h3 style={{ fontSize: '0.98rem', fontWeight: 900, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  📅 Events on {selectedDateStr ? new Date(selectedDateStr + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Selected Day'}
                </h3>
                {selectedDateStr === todayStr && (
                  <span style={{ fontSize: '0.7rem', fontWeight: 900, background: '#be123c', color: '#ffffff', padding: '0.15rem 0.5rem', borderRadius: '6px' }}>
                    TODAY
                  </span>
                )}
              </div>

              {selectedDayEvents.length === 0 ? (
                <div style={{ padding: '1.5rem 1rem', textAlign: 'center', background: '#ffffff', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
                  <div style={{ fontSize: '1.5rem', marginBottom: '0.3rem' }}>💤</div>
                  <div style={{ fontWeight: 800, fontSize: '0.88rem', color: '#475569' }}>No Scheduled Events</div>
                  <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '0.2rem' }}>There are no deadlines or sessions on this date.</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {selectedDayEvents.map((evt, idx) => {
                    const isStage = !!evt.isStage;
                    const badgeColor = isStage ? '#be123c' : evt.type === 'Orientation' ? '#0d9488' : '#2563eb';

                    return (
                      <div key={idx} style={{ background: '#ffffff', borderRadius: '12px', padding: '0.95rem', border: `1.5px solid ${badgeColor}40`, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.4rem' }}>
                          <span style={{ fontSize: '0.72rem', fontWeight: 900, background: `${badgeColor}15`, color: badgeColor, padding: '0.15rem 0.55rem', borderRadius: '6px', border: `1px solid ${badgeColor}30` }}>
                            {isStage ? `🏆 STAGE ${evt.stageId} MILESTONE` : (evt.type || 'WORKSHOP').toUpperCase()}
                          </span>
                          {evt.targetTrack && evt.targetTrack !== 'both' && (
                            <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#64748b' }}>
                              · {evt.targetTrack === 'pop_science' ? 'Pop Videos' : 'Journalism'}
                            </span>
                          )}
                        </div>

                        <div style={{ fontSize: '0.92rem', fontWeight: 900, color: '#0f172a', marginBottom: '0.3rem' }}>
                          {evt.title}
                        </div>

                        {evt.description && (
                          <div style={{ fontSize: '0.8rem', color: '#475569', marginBottom: '0.6rem' }}>
                            {evt.description}
                          </div>
                        )}

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid #f1f5f9', flexWrap: 'wrap' }}>
                          <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                            <Clock size={13} />
                            {evt.startDate ? new Date(evt.startDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '11:59 PM'}
                          </div>

                          {isStage ? (
                            <button
                              onClick={() => navigate('/dashboard/my-competition')}
                              style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', fontWeight: 800, borderRadius: '8px', background: '#be123c', color: '#ffffff', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                            >
                              <Send size={12} /> Submit Stage Work
                            </button>
                          ) : evt.meetingLink ? (
                            <a
                              href={evt.meetingLink}
                              target="_blank"
                              rel="noreferrer"
                              style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', fontWeight: 800, borderRadius: '8px', background: '#0d9488', color: '#ffffff', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                            >
                              <ExternalLink size={12} /> Join Session
                            </a>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Upcoming Events This Week Section */}
            <div style={{ background: '#f8fafc', borderRadius: '16px', border: '1.5px solid #e2e8f0', padding: '1.25rem', boxShadow: '0 4px 16px rgba(0,0,0,0.03)' }}>
              <h3 style={{ fontSize: '0.98rem', fontWeight: 900, color: '#0f172a', margin: '0 0 0.85rem 0', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                ⚡ Upcoming Events This Week
              </h3>

              {upcomingThisWeekEvents.length === 0 ? (
                <div style={{ fontSize: '0.82rem', color: '#94a3b8', fontStyle: 'italic', padding: '0.5rem' }}>
                  No upcoming deadlines or sessions scheduled for the next 7 days.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  {upcomingThisWeekEvents.map((evt, idx) => {
                    const isStage = !!evt.isStage;
                    const badgeColor = isStage ? '#be123c' : '#2563eb';
                    const dateStr = evt.startDate || evt.endDate;

                    return (
                      <div key={idx} style={{ background: '#ffffff', padding: '0.75rem 0.9rem', borderRadius: '10px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.6rem' }}>
                        <div>
                          <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a' }}>
                            {evt.title}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.15rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                            <Calendar size={12} />
                            {dateStr ? new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'TBD'}
                          </div>
                        </div>
                        <span style={{ fontSize: '0.68rem', fontWeight: 900, background: `${badgeColor}15`, color: badgeColor, padding: '0.2rem 0.5rem', borderRadius: '6px' }}>
                          {isStage ? 'Deadline' : 'Session'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Unified Master List of Events & Stage Milestones */
        allMasterEvents.length === 0 ? (
          <div className="ft-empty" style={{ padding: '2rem' }}>
            <div className="ft-empty-icon">📆</div>
            <div className="ft-empty-title">No Events Scheduled</div>
            <div className="ft-empty-text">No workshops, lectures, or stage deadlines have been scheduled yet.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {allMasterEvents.map((ws) => {
              const trainerAcc = getTrainerAccount(ws);
              const isStage = !!ws.isStage;
              const typeLower = (ws.type || 'workshop').toLowerCase();
              
              // Check if date has passed
              const dateToCheck = ws.startDate || ws.endDate;
              const isPassed = dateToCheck ? new Date(dateToCheck).getTime() < Date.now() : false;

              // Accent colors by type
              const accentColor = isPassed ? '#94a3b8'
                : isStage ? '#be123c'
                : typeLower === 'orientation' ? '#0d9488'
                : typeLower === 'lecture' ? '#7c3aed'
                : typeLower === 'office hours' ? '#d97706'
                : '#059669';

              const badgeBg = isPassed ? '#f1f5f9'
                : isStage ? '#fff1f2'
                : typeLower === 'orientation' ? '#ccfbf1'
                : typeLower === 'lecture' ? '#f3e8ff'
                : typeLower === 'office hours' ? '#fef3c7'
                : '#ecfdf5';

              const badgeTextColor = isPassed ? '#64748b'
                : isStage ? '#be123c'
                : typeLower === 'orientation' ? '#0f766e'
                : typeLower === 'lecture' ? '#6d28d9'
                : typeLower === 'office hours' ? '#b45309'
                : '#047857';

              return (
                <div key={ws.id} style={{
                  padding: '1.4rem 1.6rem', borderRadius: '18px',
                  background: isPassed ? '#f8fafc' : '#ffffff',
                  border: isPassed ? '1.5px solid #cbd5e1' : '1.5px solid #e2e8f0',
                  borderLeft: `6px solid ${accentColor}`,
                  opacity: isPassed ? 0.68 : 1,
                  filter: isPassed ? 'grayscale(20%)' : 'none',
                  boxShadow: isPassed ? 'none' : '0 4px 20px rgba(0,0,0,0.04)',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.25rem',
                  position: 'relative', overflow: 'hidden', transition: 'all 0.3s ease'
                }}>
                  <div style={{ flex: 1, minWidth: '280px' }}>
                    {/* Header Row: Type Badge + Track Tag + Event Title */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.6rem', flexWrap: 'wrap' }}>
                      <span style={{
                        fontSize: '0.78rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.04em',
                        background: badgeBg, color: badgeTextColor, padding: '0.2rem 0.65rem', borderRadius: '8px'
                      }}>
                        {isPassed ? '✔️ DONE / PASSED'
                        : isStage ? `🏆 STAGE ${ws.stageId} MILESTONE`
                        : ws.type === 'Orientation' ? '🚀 Orientation'
                        : ws.type === 'Lecture' ? '🎙️ Lecture'
                        : ws.type === 'Office Hours' ? '💬 Office Hours'
                        : `🎓 ${ws.type || 'Workshop'}`}
                    </span>
                    <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.65rem', borderRadius: '8px', background: '#f1f5f9', color: '#475569', fontWeight: 800, border: '1px solid #cbd5e1' }}>
                      {ws.targetTrack === 'pop_science' ? '🎥 Pop Videos Track' : ws.targetTrack === 'science_journalism' ? '📰 Journalism Track' : '🌐 Both Competition Tracks'}
                    </span>
                  </div>

                  {/* Title with Hand Scratch (Strikethrough) if passed */}
                  <h3 style={{
                    fontSize: '1.2rem', fontWeight: 900, margin: '0 0 0.6rem 0',
                    color: isPassed ? '#64748b' : '#0f172a',
                    textDecoration: isPassed ? 'line-through 2.5px #be123c' : 'none',
                    fontFamily: "'Outfit', sans-serif"
                  }}>
                    {ws.title}
                  </h3>

                  {/* Metadata Row: Speaker / Stage Details + Date & Time */}
                  <div style={{ display: 'flex', gap: '1rem', color: '#475569', fontSize: '0.85rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    {/* Speaker / Stage Chip */}
                    {isStage ? (
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                        background: '#f8fafc', border: '1px solid #e2e8f0', padding: '0.3rem 0.75rem', borderRadius: '20px', fontWeight: 700
                      }}>
                        <Award size={14} style={{ color: accentColor }} />
                        <span style={{ color: '#0f172a', fontWeight: 800 }}>Competition Stage Submission</span>
                      </span>
                    ) : trainerAcc ? (
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: '0.45rem',
                        background: '#f8fafc', border: '1px solid #e2e8f0', padding: '0.3rem 0.75rem', borderRadius: '20px', fontWeight: 700
                      }}>
                        <img
                          src={trainerAcc.avatarUrl || trainerAcc.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${trainerAcc.username}`}
                          alt=""
                          style={{ width: 26, height: 26, borderRadius: '50%', objectFit: 'cover', border: `2px solid ${accentColor}` }}
                        />
                        <span style={{ color: '#0f172a', fontWeight: 800 }}>{trainerAcc.name}</span>
                        {trainerAcc.title && <span style={{ color: '#64748b', fontSize: '0.78rem' }}>({trainerAcc.title})</span>}
                      </span>
                    ) : (
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                        background: '#f8fafc', border: '1px solid #e2e8f0', padding: '0.3rem 0.75rem', borderRadius: '20px', fontWeight: 700
                      }}>
                        <User size={14} style={{ color: accentColor }} />
                        <span style={{ color: '#0f172a', fontWeight: 800 }}>{ws.trainerName || 'SciComm Speaker'}</span>
                      </span>
                    )}

                    {/* Date Time Pill */}
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                      background: '#f8fafc', border: '1px solid #e2e8f0', padding: '0.3rem 0.75rem', borderRadius: '20px', fontWeight: 700, color: '#334155'
                    }}>
                      <Clock size={14} style={{ color: accentColor }} /> 
                      {new Date(ws.startDate).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                      {ws.endDate && ws.endDate !== ws.startDate && ` — ${new Date(ws.endDate).toLocaleString([], { timeStyle: 'short' })}`}
                    </span>
                  </div>

                  {ws.description && (
                    <p style={{
                      fontSize: '0.9rem', color: isPassed ? '#94a3b8' : '#475569',
                      marginTop: '0.75rem', marginBottom: 0, lineHeight: 1.5, fontWeight: 500,
                      textDecoration: isPassed ? 'line-through 1.5px #cbd5e1' : 'none'
                    }}>
                      {ws.description}
                    </p>
                  )}
                </div>

                {/* Right Action Buttons */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexShrink: 0 }}>
                  {/* For Passed Events */}
                  {isPassed ? (
                    <span style={{
                      background: '#e2e8f0', color: '#64748b', fontWeight: 800, fontSize: '0.82rem',
                      padding: '0.5rem 1rem', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '0.35rem'
                    }}>
                      <Check size={14} /> Completed / Passed
                    </span>
                  ) : isStage ? (
                    /* For Stage Milestones: Direct Submit Button */
                    <button
                      className="ft-btn"
                      onClick={() => navigate('/my-competition')}
                      style={{
                        background: 'linear-gradient(135deg, #be123c 0%, #9f1239 100%)',
                        color: '#ffffff', fontWeight: 800, fontSize: '0.88rem', padding: '0.55rem 1.1rem',
                        borderRadius: '12px', border: 'none', boxShadow: '0 4px 14px rgba(190, 18, 60, 0.35)',
                        display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer'
                      }}
                    >
                      <Send size={15} /> Submit Stage Work
                    </button>
                  ) : (
                    /* For Active Workshops / Orientations / Lectures */
                    ws.meetingLink && (
                      <a
                        href={ws.meetingLink}
                        target="_blank"
                        rel="noreferrer"
                        className="ft-btn"
                        style={{
                          background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                          color: '#ffffff', fontWeight: 800, fontSize: '0.88rem', padding: '0.55rem 1.1rem',
                          borderRadius: '12px', border: 'none', boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)',
                          display: 'flex', alignItems: 'center', gap: '0.4rem', textDecoration: 'none'
                        }}
                      >
                        {ws.type === 'Orientation' ? '🚀 Join Orientation'
                          : ws.type === 'Lecture' ? '🎙️ Join Live Lecture'
                          : ws.type === 'Office Hours' ? '💬 Join Office Hours'
                          : '🎓 Join Workshop'} <ExternalLink size={15} />
                      </a>
                    )
                  )}

                  {/* Admin / Trainer Controls for Workshops */}
                  {!isStage && (isAdmin || isTrainer) && (
                    <button
                      className="ft-btn"
                      onClick={() => handleOpenEdit(ws)}
                      style={{
                        background: '#ffffff', color: '#2563eb', border: '1.5px solid #bfdbfe',
                        padding: '0.55rem 0.9rem', borderRadius: '12px', fontWeight: 800, fontSize: '0.85rem',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem'
                      }}
                    >
                      <Edit3 size={15} /> Edit
                    </button>
                  )}

                  {!isStage && isAdmin && (
                    <button
                      className="ft-btn"
                      onClick={() => handleDelete(ws.id)}
                      style={{
                        background: '#ffffff', color: '#dc2626', border: '1.5px solid #fca5a5',
                        padding: '0.55rem 0.9rem', borderRadius: '12px', fontWeight: 800, fontSize: '0.85rem',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem'
                      }}
                    >
                      <Trash2 size={15} /> Delete
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )
    )}

      {/* Modal for adding/editing workshop/lecture */}
      {showModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000,
          background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
        }}>
          <div className="ft-card ft-animate-in" style={{ width: '100%', maxWidth: '580px', padding: '2rem', background: '#ffffff', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '1.25rem', color: '#0f172a' }}>
              {editingId ? '✏️ Edit Workshop or Lecture' : 'Schedule Workshop or Lecture'}
            </h3>
            
            {error && (
              <div style={{ padding: '0.8rem', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', marginBottom: '1rem', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertCircle size={18} /> {error}
              </div>
            )}

            <form onSubmit={handleSaveWorkshop} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label className="ft-label">Event Title *</label>
                <input type="text" className="ft-input" placeholder="e.g., SciComm Scripting Masterclass" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label className="ft-label">Event Type</label>
                  <select className="ft-select" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                    <option value="Workshop">Workshop</option>
                    <option value="Lecture">Lecture</option>
                    <option value="Orientation">Orientation</option>
                    <option value="Office Hours">Office Hours</option>
                  </select>
                </div>
                <div>
                  <label className="ft-label">Target Track *</label>
                  <select className="ft-select" value={form.targetTrack} onChange={e => setForm({ ...form, targetTrack: e.target.value })}>
                    <option value="both">Both Tracks</option>
                    <option value="pop_science">Pop Science Videos</option>
                    <option value="science_journalism">Science Journalism</option>
                  </select>
                </div>
              </div>

              {/* Trainer / Speaker Autocomplete */}
              <div ref={trainerRef} style={{ position: 'relative' }}>
                <label className="ft-label">Trainer / Speaker Name *</label>
                <div style={{ position: 'relative' }}>
                  <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
                  <input
                    type="text"
                    className="ft-input"
                    style={{ paddingLeft: '2.25rem' }}
                    placeholder="Search by name, username, or email..."
                    value={trainerQuery}
                    onChange={e => {
                      setTrainerQuery(e.target.value);
                      setShowTrainerDropdown(true);
                      if (!e.target.value) handleClearTrainer();
                    }}
                    onFocus={() => trainerQuery && setShowTrainerDropdown(true)}
                    required
                  />
                </div>

                {/* Autocomplete Dropdown */}
                {showTrainerDropdown && trainerSuggestions.length > 0 && (
                  <div style={{
                    position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
                    background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px',
                    boxShadow: '0 12px 40px rgba(0,0,0,0.12)', marginTop: '0.25rem',
                    maxHeight: '260px', overflowY: 'auto'
                  }}>
                    {trainerSuggestions.map(acc => (
                      <div
                        key={acc.id}
                        onClick={() => handleSelectTrainer(acc)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '0.75rem',
                          padding: '0.7rem 1rem', cursor: 'pointer',
                          borderBottom: '1px solid #f1f5f9',
                          transition: 'background 0.15s ease'
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                        onMouseLeave={e => e.currentTarget.style.background = '#ffffff'}
                      >
                        <img
                          src={acc.avatarUrl || acc.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${acc.username}`}
                          alt=""
                          style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', border: '2px solid #e2e8f0', flexShrink: 0 }}
                        />
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {acc.name || acc.username}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {acc.title || acc.role || ''}{acc.institutionName ? ` · ${acc.institutionName}` : ''}{acc.department ? ` · ${acc.department}` : ''}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {showTrainerDropdown && trainerQuery.length >= 1 && trainerSuggestions.length === 0 && (
                  <div style={{
                    position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
                    background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.08)', marginTop: '0.25rem',
                    padding: '1rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem'
                  }}>
                    No matching accounts found
                  </div>
                )}

                {/* Selected Trainer Preview Card */}
                {selectedTrainer && (
                  <div style={{
                    marginTop: '0.75rem', padding: '0.75rem 1rem', borderRadius: '12px',
                    background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)',
                    border: '1.5px solid #059669',
                    display: 'flex', alignItems: 'center', gap: '0.75rem'
                  }}>
                    <img
                      src={selectedTrainer.avatarUrl || selectedTrainer.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedTrainer.username}`}
                      alt=""
                      style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover', border: '3px solid #059669', flexShrink: 0 }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0f172a' }}>
                        {selectedTrainer.name || selectedTrainer.username}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#475569', marginTop: '0.1rem' }}>
                        {selectedTrainer.title && <span style={{ fontWeight: 600 }}>{selectedTrainer.title}</span>}
                        {selectedTrainer.title && selectedTrainer.institutionName && ' · '}
                        {selectedTrainer.institutionName && <span>{selectedTrainer.institutionName}</span>}
                        {!selectedTrainer.title && !selectedTrainer.institutionName && selectedTrainer.department && <span>{selectedTrainer.department}</span>}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '0.15rem' }}>
                        @{selectedTrainer.username} · {selectedTrainer.email || ''}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleClearTrainer}
                      style={{
                        background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer',
                        fontSize: '1.1rem', fontWeight: 800, padding: '0.25rem', lineHeight: 1
                      }}
                      title="Clear selection"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label className="ft-label">Start Date & Time *</label>
                  <input type="datetime-local" className="ft-input" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} required />
                </div>
                <div>
                  <label className="ft-label">End Date & Time (Optional)</label>
                  <input type="datetime-local" className="ft-input" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} />
                </div>
              </div>

              <div>
                <label className="ft-label">Meeting Link (Zoom / Teams URL)</label>
                <input type="url" className="ft-input" placeholder="https://zoom.us/j/..." value={form.meetingLink} onChange={e => setForm({ ...form, meetingLink: e.target.value })} />
              </div>

              <div>
                <label className="ft-label">Event Details / Description</label>
                <textarea className="ft-textarea" rows={3} placeholder="Brief summary of topics covered..." value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
              </div>

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button type="button" className="ft-btn ft-btn-outline" onClick={() => { setShowModal(false); setEditingId(null); handleClearTrainer(); }}>Cancel</button>
                <button type="submit" className="ft-btn ft-btn-primary">
                  {editingId ? 'Save Changes' : 'Save Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
