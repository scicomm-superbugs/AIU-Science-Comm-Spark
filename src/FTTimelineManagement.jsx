import { useState } from 'react';
import { useLiveCollection, db } from './db';
import { Calendar, Clock, Edit3, Save, CheckCircle2, Video, Newspaper, Layers, AlertCircle, Plus, Trash2, Award, UserCheck } from 'lucide-react';
import WorkshopManager from './WorkshopManager';
import './scicommspark.css';

export default function FTTimelineManagement() {
  const customConfig = useLiveCollection('timeline_config') || [];
  const scientists = useLiveCollection('scientists') || [];
  const [activeTrack, setActiveTrack] = useState('pop_science');
  const [savingId, setSavingId] = useState(null);
  const [msg, setMsg] = useState('');

  // Local state for adding criteria within a stage editor
  const [newCritName, setNewCritName] = useState('');
  const [newCritCategory, setNewCritCategory] = useState('academic');
  const [newCritPoints, setNewCritPoints] = useState(25);

  // Default Stage Configurations with custom stage criteria
  const defaultStages = {
    pop_science: [
      {
        id: 'pop_stage_1', stageId: 1, title: 'Stage 1: Short Pop Video', sub: 'Reels / TikTok Video (max 90 seconds)', deadline: '2026-07-31', status: 'Active Stage',
        details: 'Produce a punchy, highly engaging short video introducing a core scientific concept for social media.',
        criteria: [
          { id: 'c1', name: 'Scientific Accuracy', category: 'academic', maxPoints: 25 },
          { id: 'c2', name: 'Hook & Visual Engagement', category: 'scicomm', maxPoints: 25 }
        ]
      },
      {
        id: 'pop_stage_2', stageId: 2, title: 'Stage 2: Long Pop Video', sub: 'YouTube SciComm Video (up to 3 minutes)', deadline: '2026-08-20', status: 'Upcoming Stage',
        details: 'Deep scientific storytelling featuring comprehensive explanation, visual graphics, and clear narration.',
        criteria: [
          { id: 'c3', name: 'Research Depth & Rigor', category: 'academic', maxPoints: 25 },
          { id: 'c4', name: 'Video Editing & Narrative Flow', category: 'scicomm', maxPoints: 25 }
        ]
      },
      {
        id: 'pop_stage_3', stageId: 3, title: 'Stage 3 (Finals): Live Stage Show', sub: 'Interactive Live Presentation (5 mins on stage)', deadline: '2026-09-10', status: 'Grand Finale',
        details: 'Deliver an interactive live science presentation on stage before expert judges, audience, and broadcast.',
        criteria: [
          { id: 'c5', name: 'Scientific Q&A Defense', category: 'academic', maxPoints: 25 },
          { id: 'c6', name: 'Stage Confidence & Delivery', category: 'scicomm', maxPoints: 25 }
        ]
      }
    ],
    science_journalism: [
      {
        id: 'jour_stage_1', stageId: 1, title: 'Stage 1: Research Field Prep', sub: 'Topic Research & Expert Interviews Prep', deadline: '2026-07-31', status: 'Active Stage',
        details: 'Select a scientific topic, gather research data, and conduct interviews with researchers & academic experts.',
        criteria: [
          { id: 'c7', name: 'Literature Review & Citation', category: 'academic', maxPoints: 25 },
          { id: 'c8', name: 'Journalistic Angle', category: 'scicomm', maxPoints: 25 }
        ]
      },
      {
        id: 'jour_stage_2', stageId: 2, title: 'Stage 2: Article Publication', sub: 'Simplified Science Article Publication', deadline: '2026-08-20', status: 'Upcoming Stage',
        details: 'Write a simplified science news article published on the digital platform with opportunity for magazine feature.',
        criteria: [
          { id: 'c9', name: 'Academic Fact Checking', category: 'academic', maxPoints: 25 },
          { id: 'c10', name: 'Article Readability & Style', category: 'scicomm', maxPoints: 25 }
        ]
      },
      {
        id: 'jour_stage_3', stageId: 3, title: 'Stage 3 (Finals): Live Stage Show', sub: 'Live Science Talk Show Interview on Stage', deadline: '2026-09-10', status: 'Grand Finale',
        details: 'Host a simulated live science talk show interview on stage in front of judges and public audience.',
        criteria: [
          { id: 'c11', name: 'Expert Q&A Handling', category: 'academic', maxPoints: 25 },
          { id: 'c12', name: 'Interview Dynamics', category: 'scicomm', maxPoints: 25 }
        ]
      }
    ]
  };

  const judges = scientists.filter(u => ['judge', 'academic_judge', 'scicomm_judge', 'trainer_judge', 'admin', 'master'].includes(u.role));

  const getStageData = (trackId, stageObj) => {
    const found = customConfig.find(c => c.id === stageObj.id || (c.track === trackId && c.stageId === stageObj.stageId));
    return found ? { assignedJudgeIds: [], ...stageObj, ...found } : { assignedJudgeIds: [], ...stageObj };
  };

  const currentStages = defaultStages[activeTrack].map(st => getStageData(activeTrack, st));
  const [editingStage, setEditingStage] = useState(null);

  const handleAddCriteriaToStage = () => {
    if (!newCritName.trim() || !editingStage) return;
    const newCrit = {
      id: 'crit_' + Date.now(),
      name: newCritName.trim(),
      category: newCritCategory,
      maxPoints: Number(newCritPoints) || 25
    };
    const currentList = editingStage.criteria || [];
    setEditingStage({
      ...editingStage,
      criteria: [...currentList, newCrit]
    });
    setNewCritName('');
  };

  const handleDeleteCriteriaFromStage = (critId) => {
    if (!editingStage) return;
    const currentList = editingStage.criteria || [];
    setEditingStage({
      ...editingStage,
      criteria: currentList.filter(c => c.id !== critId)
    });
  };

  const handleSave = async (stage) => {
    setSavingId(stage.id);
    setMsg('');
    try {
      const dataToSave = {
        id: stage.id,
        track: activeTrack,
        stageId: stage.stageId,
        title: stage.title,
        sub: stage.sub,
        deadline: stage.deadline,
        status: stage.status,
        details: stage.details,
        criteria: stage.criteria || [],
        assignedJudgeIds: stage.assignedJudgeIds || [],
        acceptSubmissions: stage.acceptSubmissions !== false,
        googleFormUrl: stage.googleFormUrl || '',
        updatedAt: new Date().toISOString()
      };

      await db.timeline_config.set(stage.id, dataToSave);

      setMsg(`🎉 Saved stage settings & custom criteria for ${stage.title}!`);
      setEditingStage(null);
    } catch (err) {
      alert('Error saving stage configuration: ' + err.message);
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="ft-animate-in">
      <div className="ft-page-header" style={{ marginBottom: '2rem' }}>
        <h1 className="ft-page-title">⚙️ Timeline & Stage Settings</h1>
        <p className="ft-page-subtitle">
          Customize stage deadlines, guidelines, and define stage-specific custom judging criteria.
        </p>
      </div>

      {msg && (
        <div style={{ padding: '0.9rem', borderRadius: '12px', background: 'var(--ft-success-bg)', color: 'var(--ft-success)', marginBottom: '1.5rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <CheckCircle2 size={18} /> {msg}
        </div>
      )}

      {/* Track Selector Tabs */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
        <button
          onClick={() => setActiveTrack('pop_science')}
          style={{
            padding: '0.85rem 1.8rem', borderRadius: '14px', border: '2px solid',
            borderColor: activeTrack === 'pop_science' ? '#be123c' : '#cbd5e1',
            background: activeTrack === 'pop_science' ? '#be123c' : '#ffffff',
            color: activeTrack === 'pop_science' ? '#ffffff' : '#1e293b',
            cursor: 'pointer', fontWeight: 800, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem'
          }}
        >
          <Video size={18} /> Track 1: Pop Science Videos
        </button>

        <button
          onClick={() => setActiveTrack('science_journalism')}
          style={{
            padding: '0.85rem 1.8rem', borderRadius: '14px', border: '2px solid',
            borderColor: activeTrack === 'science_journalism' ? '#2563eb' : '#cbd5e1',
            background: activeTrack === 'science_journalism' ? '#2563eb' : '#ffffff',
            color: activeTrack === 'science_journalism' ? '#ffffff' : '#1e293b',
            cursor: 'pointer', fontWeight: 800, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem'
          }}
        >
          <Newspaper size={18} /> Track 2: Science Journalism
        </button>
      </div>

      {/* Stage Cards List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '3rem' }}>
        {currentStages.map((st) => {
          const isEditing = editingStage && editingStage.id === st.id;

          return (
            <div key={st.id} className="ft-card" style={{ padding: '2rem', border: `2px solid ${activeTrack === 'pop_science' ? '#be123c' : '#2563eb'}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <span className="ft-badge ft-badge-active" style={{ marginBottom: '0.5rem', display: 'inline-block' }}>
                    Stage {st.stageId} · {st.status}
                  </span>
                  <span className={`ft-badge ${st.acceptSubmissions !== false ? 'ft-badge-completed' : 'ft-badge-pending'}`} style={{ marginBottom: '0.5rem', display: 'inline-block', marginLeft: '0.5rem' }}>
                    {st.acceptSubmissions !== false ? 'Accepting Submissions ✅' : 'Submissions Closed ❌'}
                  </span>
                  <h3 style={{ fontSize: '1.3rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>{st.title}</h3>
                  <div style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 600 }}>{st.sub}</div>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  {!isEditing ? (
                    <button className="ft-btn ft-btn-outline" onClick={() => setEditingStage({ ...st })}>
                      <Edit3 size={16} /> Edit Stage Settings & Criteria
                    </button>
                  ) : (
                    <button className="ft-btn ft-btn-primary" onClick={() => handleSave(editingStage)} disabled={savingId === st.id}>
                      <Save size={16} /> {savingId === st.id ? 'Saving...' : 'Save Stage Changes'}
                    </button>
                  )}
                </div>
              </div>

              {/* Edit Form or View Details */}
              {isEditing ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', background: '#f8fafc', padding: '1.5rem', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <label className="ft-label">Stage Title *</label>
                      <input
                        type="text"
                        className="ft-input"
                        value={editingStage.title}
                        onChange={e => setEditingStage({ ...editingStage, title: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="ft-label">Deadline Date *</label>
                      <input
                        type="date"
                        className="ft-input"
                        value={editingStage.deadline}
                        onChange={e => setEditingStage({ ...editingStage, deadline: e.target.value })}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                    <div>
                      <label className="ft-label">Subtitle / Sub-requirement *</label>
                      <input
                        type="text"
                        className="ft-input"
                        value={editingStage.sub}
                        onChange={e => setEditingStage({ ...editingStage, sub: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="ft-label">Stage Status Badge *</label>
                      <select
                        className="ft-select"
                        value={editingStage.status}
                        onChange={e => setEditingStage({ ...editingStage, status: e.target.value })}
                      >
                        <option value="Active Stage">Active Stage</option>
                        <option value="Upcoming Stage">Upcoming Stage</option>
                        <option value="Completed">Completed</option>
                        <option value="Grand Finale">Grand Finale</option>
                      </select>
                    </div>
                    <div>
                      <label className="ft-label">Accept Submissions *</label>
                      <select
                        className="ft-select"
                        value={editingStage.acceptSubmissions !== false ? 'yes' : 'no'}
                        onChange={e => setEditingStage({ ...editingStage, acceptSubmissions: e.target.value === 'yes' })}
                      >
                        <option value="yes">Yes, Accepting Submissions ✅</option>
                        <option value="no">No, Block Submissions ❌</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="ft-label">Detailed Stage Guidelines & Rules</label>
                    <textarea
                      className="ft-textarea"
                      rows={3}
                      value={editingStage.details}
                      onChange={e => setEditingStage({ ...editingStage, details: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="ft-label">Custom Google Form Link for Submissions</label>
                    <input
                      type="url"
                      className="ft-input"
                      placeholder="e.g. https://docs.google.com/forms/d/e/.../viewform"
                      value={editingStage.googleFormUrl || ''}
                      onChange={e => setEditingStage({ ...editingStage, googleFormUrl: e.target.value })}
                    />
                  </div>

                  {/* STAGE CUSTOM JUDGING CRITERIA SETTINGS */}
                  <div style={{ background: '#ffffff', padding: '1.25rem', borderRadius: '12px', border: '1px solid #cbd5e1' }}>
                    <label className="ft-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '1rem', color: '#0f172a' }}>
                      <Award size={18} style={{ color: 'var(--ft-primary)' }} /> Stage {st.stageId} Custom Judging Criteria
                    </label>
                    <p style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: '1rem' }}>
                      Add specific evaluation criteria (Academic 🎓 vs SciComm 🎙️) for competitors submitting work in Stage {st.stageId}.
                    </p>

                    {/* Criteria Input Row */}
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: '0.6rem', marginBottom: '1rem', alignItems: 'center' }}>
                      <input
                        type="text"
                        className="ft-input"
                        placeholder="Criterion Name (e.g. Scientific Accuracy)"
                        value={newCritName}
                        onChange={e => setNewCritName(e.target.value)}
                      />
                      <select
                        className="ft-select"
                        value={newCritCategory}
                        onChange={e => setNewCritCategory(e.target.value)}
                      >
                        <option value="academic">Academic 🎓</option>
                        <option value="scicomm">SciComm 🎙️</option>
                      </select>
                      <input
                        type="number"
                        className="ft-input"
                        placeholder="Max Pts"
                        value={newCritPoints}
                        onChange={e => setNewCritPoints(e.target.value)}
                      />
                      <button className="ft-btn ft-btn-outline" onClick={handleAddCriteriaToStage} type="button">
                        <Plus size={16} /> Add to Stage
                      </button>
                    </div>

                    {/* Active Stage Criteria List */}
                    <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                      {(editingStage.criteria || []).map(c => (
                        <div key={c.id} style={{
                          padding: '0.5rem 0.8rem', borderRadius: '10px', background: '#f8fafc',
                          border: `1.5px solid ${c.category === 'academic' ? '#0284c7' : '#e11d48'}`,
                          display: 'flex', alignItems: 'center', gap: '0.6rem'
                        }}>
                          <div>
                            <span style={{ fontSize: '0.7rem', fontWeight: 800, color: c.category === 'academic' ? '#0284c7' : '#e11d48' }}>
                              {c.category === 'academic' ? 'Academic 🎓' : 'SciComm 🎙️'}
                            </span>
                            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>{c.name} ({c.maxPoints} pts)</div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeleteCriteriaFromStage(c.id)}
                            style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.2rem' }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* STAGE JUDGE ASSIGNMENTS SETTINGS */}
                  <div style={{ background: '#ffffff', padding: '1.25rem', borderRadius: '12px', border: '1px solid #cbd5e1', marginTop: '1rem' }}>
                    <label className="ft-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '1rem', color: '#0f172a' }}>
                      <UserCheck size={18} style={{ color: 'var(--ft-primary)' }} /> Assign Judges to Stage {st.stageId}
                    </label>
                    <p style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: '1rem' }}>
                      Select the academic and science communicator judges who will review submissions and score competitors for this stage.
                    </p>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.75rem' }}>
                      {judges.map(judge => {
                        const isAssigned = (editingStage.assignedJudgeIds || []).includes(judge.id);
                        const roleColor = judge.role === 'academic_judge' ? '#0284c7' : judge.role === 'scicomm_judge' ? '#e11d48' : '#14b8a6';
                        const roleLabel = judge.role === 'academic_judge' ? 'Academic 🎓' : judge.role === 'scicomm_judge' ? 'SciComm 🎙️' : 'Judge';
                        const avatarUrl = judge.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${judge.username || judge.name}`;

                        return (
                          <div
                            key={judge.id}
                            onClick={() => {
                              const currentIds = editingStage.assignedJudgeIds || [];
                              const nextIds = currentIds.includes(judge.id)
                                ? currentIds.filter(id => id !== judge.id)
                                : [...currentIds, judge.id];
                              setEditingStage({
                                ...editingStage,
                                assignedJudgeIds: nextIds
                              });
                            }}
                            style={{
                              padding: '0.75rem',
                              borderRadius: '10px',
                              background: isAssigned ? 'rgba(30, 41, 59, 0.05)' : '#ffffff',
                              border: `2px solid ${isAssigned ? 'var(--ft-primary)' : '#e2e8f0'}`,
                              cursor: 'pointer',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              textAlign: 'center',
                              position: 'relative',
                              transition: 'all 0.2s ease'
                            }}
                          >
                            {isAssigned && (
                              <div style={{
                                position: 'absolute', top: '0.4rem', right: '0.4rem',
                                width: '18px', height: '18px', borderRadius: '50%',
                                background: 'var(--ft-primary)', color: '#ffffff',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '0.65rem', fontWeight: 800
                              }}>
                                ✓
                              </div>
                            )}
                            <img
                              src={avatarUrl}
                              alt={judge.name}
                              style={{ width: '45px', height: '45px', borderRadius: '50%', marginBottom: '0.5rem', border: `2.5px solid ${roleColor}`, objectFit: 'cover' }}
                            />
                            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%' }}>
                              {judge.name}
                            </div>
                            <span style={{
                              fontSize: '0.68rem', fontWeight: 800, color: '#ffffff',
                              background: roleColor, padding: '0.1rem 0.5rem', borderRadius: '10px', marginTop: '0.25rem'
                            }}>
                              {roleLabel}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', background: '#f8fafc', padding: '1.25rem', borderRadius: '14px' }}>
                  <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.9rem', color: '#1e293b' }}>
                    <span>📅 <strong>Deadline:</strong> {new Date(st.deadline).toLocaleDateString([], { dateStyle: 'full' })}</span>
                    <span>🏷️ <strong>Status:</strong> {st.status}</span>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.88rem', color: '#475569', lineHeight: 1.5 }}>
                    {st.details}
                  </p>

                  {/* Criteria Badge Display for Stage */}
                  <div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#1e293b', marginBottom: '0.4rem' }}>
                      ⚖️ Stage {st.stageId} Judging Criteria:
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      {(st.criteria || []).map(c => (
                        <span key={c.id} style={{
                          fontSize: '0.78rem', fontWeight: 700, padding: '0.25rem 0.65rem', borderRadius: '8px',
                          background: '#ffffff', border: `1px solid ${c.category === 'academic' ? '#0284c7' : '#e11d48'}`,
                          color: '#0f172a'
                        }}>
                          {c.category === 'academic' ? '🎓 Academic' : '🎙️ SciComm'} · {c.name} ({c.maxPoints} pts)
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Assigned Judges Display for Stage */}
                  <div style={{ marginTop: '0.75rem', paddingTop: '0.5rem', borderTop: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#1e293b', marginBottom: '0.4rem' }}>
                      👥 Assigned Judges:
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      {(st.assignedJudgeIds || []).length === 0 ? (
                        <span style={{ fontSize: '0.8rem', color: '#64748b', fontStyle: 'italic' }}>No judges assigned yet</span>
                      ) : (
                        (st.assignedJudgeIds || []).map(judgeId => {
                          const judge = scientists.find(u => u.id === judgeId);
                          if (!judge) return null;
                          const roleColor = judge.role === 'academic_judge' ? '#0284c7' : judge.role === 'scicomm_judge' ? '#e11d48' : '#14b8a6';
                          const avatarUrl = judge.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${judge.username || judge.name}`;

                          return (
                            <span key={judgeId} style={{
                              fontSize: '0.78rem', fontWeight: 700, padding: '0.25rem 0.6rem', borderRadius: '20px',
                              background: '#ffffff', border: `1.5px solid ${roleColor}`,
                              color: '#0f172a', display: 'inline-flex', alignItems: 'center', gap: '0.35rem'
                            }}>
                              <img src={avatarUrl} alt="" style={{ width: '18px', height: '18px', borderRadius: '50%', objectFit: 'cover' }} />
                              {judge.name}
                            </span>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Embedded Integrated Workshop & Lecture Schedule Manager */}
      <WorkshopManager isAdmin={true} isTrainer={true} currentTrack={activeTrack} />
    </div>
  );
}
