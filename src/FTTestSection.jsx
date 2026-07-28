import React, { useState } from 'react';
import { RefreshCw, Lock, Maximize2, Minimize2, FileText, Globe, CheckCircle2 } from 'lucide-react';
import { useAuth } from './context/AuthContext';
import { db } from './db';

export default function FTTestSection() {
  const { user } = useAuth();
  const [mode, setMode] = useState('webview'); // 'webview' or 'native'
  const [isLoading, setIsLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);

  // Native Form State
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    track: 'pop_science',
    submissionUrl: '',
    notes: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const embeddedUrl = "https://docs.google.com/forms/d/e/1FAIpQLSfbgcAi8mYiNdlWsIbzj8jgxOCFIrrwl1l-6b3akaZ9Dd2XDg/viewform?embedded=true";

  const handleRefresh = () => {
    setIsLoading(true);
    setIframeKey(prev => prev + 1);
  };

  const handleNativeSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await db.submissions.add({
        userId: user?.id || 'guest',
        userName: formData.name,
        userEmail: formData.email,
        track: formData.track,
        submissionUrl: formData.submissionUrl,
        notes: formData.notes,
        submittedAt: new Date().toISOString(),
        source: 'Test_Form_Page'
      });
      setSubmitted(true);
    } catch (err) {
      alert('Failed to submit form: ' + err.message);
    }
    setSubmitting(false);
  };

  return (
    <div 
      style={{ 
        width: '100%', 
        height: isFullscreen ? '100vh' : 'calc(100vh - 120px)', 
        minHeight: '680px', 
        display: 'flex', 
        flexDirection: 'column',
        position: isFullscreen ? 'fixed' : 'relative',
        inset: isFullscreen ? 0 : 'auto',
        zIndex: isFullscreen ? 3000 : 1,
        background: '#f8fafc',
        padding: isFullscreen ? '0' : '0 0 1rem 0',
        transition: 'all 0.25s ease'
      }}
    >
      <div 
        style={{ 
          flex: 1, 
          width: '100%', 
          background: '#ffffff', 
          borderRadius: isFullscreen ? '0' : '24px', 
          border: isFullscreen ? 'none' : '1.5px solid #cbd5e1', 
          boxShadow: isFullscreen ? 'none' : '0 12px 36px rgba(15,23,42,0.08)', 
          overflow: 'hidden', 
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Virtual Browser Top Navigation Bar */}
        <div 
          style={{ 
            height: '48px', 
            background: '#f1f5f9', 
            borderBottom: '1px solid #e2e8f0', 
            display: 'flex', 
            alignItems: 'center', 
            justify: 'space-between', 
            padding: '0 1rem', 
            gap: '1rem',
            userSelect: 'none'
          }}
        >
          {/* Virtual Browser Window Controls & Address Bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, maxWidth: '650px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ef4444' }} />
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#eab308' }} />
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#22c55e' }} />
            </div>

            {/* Virtual Address Bar */}
            <div 
              style={{ 
                flex: 1, 
                background: '#ffffff', 
                border: '1px solid #cbd5e1', 
                borderRadius: '8px', 
                padding: '0.25rem 0.75rem', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.4rem', 
                fontSize: '0.78rem', 
                color: '#475569',
                fontFamily: 'monospace',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}
            >
              <Lock size={13} style={{ color: '#16a34a', flexShrink: 0 }} />
              <span style={{ fontWeight: 700, color: '#0f172a' }}>https://</span>
              <span style={{ color: '#64748b' }}>forms.gle/tzgEf9QxBj3nG43S9</span>
            </div>
          </div>

          {/* Virtual Browser View Switcher & Toolbar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ display: 'flex', background: '#e2e8f0', padding: '0.15rem', borderRadius: '8px', gap: '0.15rem' }}>
              <button
                onClick={() => setMode('webview')}
                style={{
                  border: 'none',
                  background: mode === 'webview' ? '#ffffff' : 'transparent',
                  color: mode === 'webview' ? '#2563eb' : '#64748b',
                  fontWeight: 800,
                  fontSize: '0.75rem',
                  padding: '0.3rem 0.65rem',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem'
                }}
              >
                <Globe size={13} />
                Virtual Browser
              </button>
              <button
                onClick={() => setMode('native')}
                style={{
                  border: 'none',
                  background: mode === 'native' ? '#ffffff' : 'transparent',
                  color: mode === 'native' ? '#2563eb' : '#64748b',
                  fontWeight: 800,
                  fontSize: '0.75rem',
                  padding: '0.3rem 0.65rem',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem'
                }}
              >
                <FileText size={13} />
                In-App Form
              </button>
            </div>

            {mode === 'webview' && (
              <button 
                onClick={handleRefresh}
                className="ft-btn"
                title="Refresh Webview"
                style={{ background: '#ffffff', border: '1px solid #cbd5e1', padding: '0.35rem 0.65rem', borderRadius: '8px', color: '#334155', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', fontWeight: 800 }}
              >
                <RefreshCw size={13} className={isLoading ? 'spin' : ''} />
                Reload
              </button>
            )}

            <button 
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="ft-btn"
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen Viewport"}
              style={{ background: '#ffffff', border: '1px solid #cbd5e1', padding: '0.35rem 0.65rem', borderRadius: '8px', color: '#334155', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', fontWeight: 800 }}
            >
              {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
              {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            </button>
          </div>
        </div>

        {/* Viewport Area */}
        <div style={{ flex: 1, width: '100%', position: 'relative', background: '#ffffff', overflowY: 'auto' }}>
          {mode === 'webview' ? (
            <>
              {isLoading && (
                <div 
                  style={{ 
                    position: 'absolute', 
                    inset: 0, 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center', 
                    justify: 'center', 
                    background: '#ffffff', 
                    zIndex: 10 
                  }}
                >
                  <div className="ft-spinner" style={{ width: '38px', height: '38px', borderWidth: '3px', marginBottom: '0.85rem' }} />
                  <div style={{ fontWeight: 800, color: '#334155', fontSize: '0.9rem' }}>
                    Loading Google Form Virtual Browser...
                  </div>
                </div>
              )}

              <iframe
                key={iframeKey}
                src={embeddedUrl}
                title="SciComm Spark Virtual Webview"
                onLoad={() => setIsLoading(false)}
                style={{
                  width: '100%',
                  height: '100%',
                  border: 'none',
                  display: 'block'
                }}
                allow="storage-access *; accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-popups-to-escape-sandbox allow-storage-access-by-user-activation"
                allowFullScreen
              />
            </>
          ) : (
            /* NATIVE IN-APP FORM VIEWPORT (100% IN-PAGE SUBMISSION) */
            <div style={{ maxWidth: '680px', margin: '2rem auto', padding: '2rem', background: '#ffffff' }}>
              {submitted ? (
                <div style={{ textAlign: 'center', padding: '3rem 1.5rem', background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: '20px' }}>
                  <CheckCircle2 size={48} style={{ color: '#16a34a', margin: '0 auto 1rem auto' }} />
                  <h3 style={{ fontSize: '1.4rem', fontWeight: 900, color: '#14532d', margin: 0 }}>Form Submitted Successfully!</h3>
                  <p style={{ color: '#166534', marginTop: '0.5rem', fontSize: '0.9rem' }}>Your response has been recorded directly inside SciComm Spark.</p>
                  <button 
                    onClick={() => { setSubmitted(false); setFormData({ name: user?.name || '', email: user?.email || '', track: 'pop_science', submissionUrl: '', notes: '' }); }}
                    className="ft-btn ft-btn-primary" 
                    style={{ marginTop: '1.5rem', background: '#16a34a' }}
                  >
                    Submit Another Response
                  </button>
                </div>
              ) : (
                <form onSubmit={handleNativeSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div style={{ borderBottom: '2px solid #cbd5e1', paddingBottom: '1rem', marginBottom: '0.5rem' }}>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#0f172a', margin: 0, fontFamily: "'Outfit', sans-serif" }}>
                      📝 Competition Submission Form
                    </h2>
                    <p style={{ color: '#64748b', fontSize: '0.88rem', margin: '0.3rem 0 0 0' }}>
                      Fill out all fields below to submit directly inside SciComm Spark.
                    </p>
                  </div>

                  <div className="ft-input-group">
                    <label className="ft-label">Full Name / الاسم الكامل *</label>
                    <input
                      type="text"
                      className="ft-input"
                      required
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Enter your full name..."
                    />
                  </div>

                  <div className="ft-input-group">
                    <label className="ft-label">Email Address / البريد الإلكتروني *</label>
                    <input
                      type="email"
                      className="ft-input"
                      required
                      value={formData.email}
                      onChange={e => setFormData({ ...formData, email: e.target.value })}
                      placeholder="name@example.com"
                    />
                  </div>

                  <div className="ft-input-group">
                    <label className="ft-label">Competition Track / المسار *</label>
                    <select
                      className="ft-select"
                      value={formData.track}
                      onChange={e => setFormData({ ...formData, track: e.target.value })}
                    >
                      <option value="pop_science">Pop Science Videos 🎥</option>
                      <option value="science_journalism">Science Journalism 📰</option>
                    </select>
                  </div>

                  <div className="ft-input-group">
                    <label className="ft-label">Submission Link / رابط المشاركة *</label>
                    <input
                      type="url"
                      className="ft-input"
                      required
                      value={formData.submissionUrl}
                      onChange={e => setFormData({ ...formData, submissionUrl: e.target.value })}
                      placeholder="https://drive.google.com/... or https://youtube.com/..."
                    />
                  </div>

                  <div className="ft-input-group">
                    <label className="ft-label">Notes & Description / ملاحظات ووصف</label>
                    <textarea
                      className="ft-textarea"
                      rows={4}
                      value={formData.notes}
                      onChange={e => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Describe your scientific storytelling entry..."
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="ft-btn ft-btn-primary"
                    style={{ padding: '0.85rem', fontSize: '1rem', fontWeight: 900, borderRadius: '14px', marginTop: '1rem' }}
                  >
                    {submitting ? 'Submitting Form...' : '🚀 Submit Response In-App'}
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
