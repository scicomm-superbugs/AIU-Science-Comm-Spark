import React, { useState } from 'react';
import { FileText, CheckCircle2, Send, Clock, Sparkles, AlertCircle } from 'lucide-react';
import { useAuth } from './context/AuthContext';
import { db } from './db';

export default function FTTestSection() {
  const { user } = useAuth();

  const [formData, setFormData] = useState({
    email: user?.email || '',
    participationType: 'Individual',
    fullName: user?.name || '',
    institution: 'Alamein International University',
    track: 'pop_science',
    submissionUrl: '',
    notes: ''
  });

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.email || !formData.email.includes('@')) {
      alert('Please provide a valid email address.');
      return;
    }
    if (!formData.submissionUrl) {
      alert('Please provide your submission link.');
      return;
    }

    setSubmitting(true);
    try {
      // Save submission record locally & sync
      await db.submissions.add({
        userId: user?.id || 'guest',
        userName: formData.fullName,
        userEmail: formData.email,
        participationType: formData.participationType,
        institution: formData.institution,
        track: formData.track,
        submissionUrl: formData.submissionUrl,
        notes: formData.notes,
        submittedAt: new Date().toISOString(),
        source: 'SciComm_Spark_Test_Form'
      });

      setSubmitted(true);
    } catch (err) {
      alert('Failed to submit form: ' + err.message);
    }
    setSubmitting(false);
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '1rem 0 3rem 0' }}>
      <div 
        className="ft-card ft-animate-in"
        style={{ 
          background: '#ffffff', 
          borderRadius: '24px', 
          border: '1.5px solid #cbd5e1', 
          boxShadow: '0 10px 30px rgba(15,23,42,0.06)', 
          overflow: 'hidden' 
        }}
      >
        {/* Header Section */}
        <div style={{ background: 'linear-gradient(135deg, #be123c 0%, #9f1239 100%)', padding: '2.25rem 2rem', color: '#ffffff' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(255,255,255,0.18)', padding: '0.35rem 0.85rem', borderRadius: '100px', fontSize: '0.8rem', fontWeight: 800, marginBottom: '1rem' }}>
            <Sparkles size={14} /> SciComm Spark Competition Form
          </div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 900, margin: '0 0 0.5rem 0', fontFamily: "'Outfit', sans-serif" }}>
            SciComm Spark Official Registration & Submission
          </h1>
          <p style={{ margin: 0, opacity: 0.9, fontSize: '0.92rem', lineHeight: 1.5 }}>
            Submit your Scientific Communication entries directly on this page. All questions and details are rendered below.
          </p>
        </div>

        {/* Competition Track Info Card */}
        <div style={{ padding: '1.5rem 2rem', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#be123c', fontWeight: 900, fontSize: '0.95rem', marginBottom: '0.5rem' }}>
            <Clock size={16} /> Submission deadline: July 31, 2026
          </div>
          <p style={{ margin: 0, fontSize: '0.85rem', color: '#475569', lineHeight: 1.6 }}>
            We can't wait to see your creativity, passion, and scientific storytelling skills. Good luck to all participants!
          </p>
        </div>

        {/* Form Body */}
        <div style={{ padding: '2rem' }}>
          {submitted ? (
            <div style={{ textAlign: 'center', padding: '3rem 1.5rem', background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: '20px' }}>
              <CheckCircle2 size={54} style={{ color: '#16a34a', margin: '0 auto 1.25rem auto' }} />
              <h3 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#14532d', margin: 0 }}>
                Response Recorded Successfully!
              </h3>
              <p style={{ color: '#166534', marginTop: '0.6rem', fontSize: '0.92rem', lineHeight: 1.5 }}>
                Your submission has been received and saved directly in SciComm Spark.
              </p>
              <button 
                onClick={() => { setSubmitted(false); setFormData({ email: user?.email || '', participationType: 'Individual', fullName: user?.name || '', institution: 'Alamein International University', track: 'pop_science', submissionUrl: '', notes: '' }); }}
                className="ft-btn ft-btn-primary" 
                style={{ marginTop: '1.75rem', background: '#be123c', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '12px', fontWeight: 800 }}
              >
                Submit Another Response
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              
              {/* Question 1: Email */}
              <div className="ft-card" style={{ padding: '1.25rem', background: '#ffffff', borderRadius: '16px', border: '1.5px solid #cbd5e1' }}>
                <label className="ft-label" style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.6rem' }}>
                  Email Address / البريد الإلكتروني <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="email"
                  className="ft-input"
                  required
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  placeholder="Enter your email address..."
                />
              </div>

              {/* Question 2: Participation Type */}
              <div className="ft-card" style={{ padding: '1.25rem', background: '#ffffff', borderRadius: '16px', border: '1.5px solid #cbd5e1' }}>
                <label className="ft-label" style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.75rem' }}>
                  How would you like to participate in the competition? <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', fontSize: '0.9rem', color: '#334155', fontWeight: 700 }}>
                    <input
                      type="radio"
                      name="participationType"
                      value="Individual"
                      checked={formData.participationType === 'Individual'}
                      onChange={e => setFormData({ ...formData, participationType: e.target.value })}
                      style={{ width: '18px', height: '18px', accentColor: '#be123c' }}
                    />
                    Individual (Solo Competitor)
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', fontSize: '0.9rem', color: '#334155', fontWeight: 700 }}>
                    <input
                      type="radio"
                      name="participationType"
                      value="Team"
                      checked={formData.participationType === 'Team'}
                      onChange={e => setFormData({ ...formData, participationType: e.target.value })}
                      style={{ width: '18px', height: '18px', accentColor: '#be123c' }}
                    />
                    Team (Up to 3 members)
                  </label>
                </div>
              </div>

              {/* Question 3: Full Name */}
              <div className="ft-card" style={{ padding: '1.25rem', background: '#ffffff', borderRadius: '16px', border: '1.5px solid #cbd5e1' }}>
                <label className="ft-label" style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.6rem' }}>
                  Full Name / الاسم الكامل <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="text"
                  className="ft-input"
                  required
                  value={formData.fullName}
                  onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                  placeholder="Enter your full name..."
                />
              </div>

              {/* Question 4: Track */}
              <div className="ft-card" style={{ padding: '1.25rem', background: '#ffffff', borderRadius: '16px', border: '1.5px solid #cbd5e1' }}>
                <label className="ft-label" style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.6rem' }}>
                  Select Competition Track / المسار <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <select
                  className="ft-select"
                  value={formData.track}
                  onChange={e => setFormData({ ...formData, track: e.target.value })}
                >
                  <option value="pop_science">🎥 Track 1: Pop Science Videos (Short & Long form storytelling)</option>
                  <option value="science_journalism">📰 Track 2: Science Journalism (Articles, Publishing & Fieldwork)</option>
                </select>
              </div>

              {/* Question 5: Submission Link */}
              <div className="ft-card" style={{ padding: '1.25rem', background: '#ffffff', borderRadius: '16px', border: '1.5px solid #cbd5e1' }}>
                <label className="ft-label" style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.6rem' }}>
                  Submission Link / Google Drive / Video URL <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="url"
                  className="ft-input"
                  required
                  value={formData.submissionUrl}
                  onChange={e => setFormData({ ...formData, submissionUrl: e.target.value })}
                  placeholder="https://drive.google.com/... or https://youtube.com/..."
                />
                <span style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.4rem', display: 'block' }}>
                  Paste a publicly accessible Google Drive link, YouTube video link, or article link.
                </span>
              </div>

              {/* Question 6: Notes */}
              <div className="ft-card" style={{ padding: '1.25rem', background: '#ffffff', borderRadius: '16px', border: '1.5px solid #cbd5e1' }}>
                <label className="ft-label" style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.6rem' }}>
                  Additional Notes & Description / ملاحظات ووصف
                </label>
                <textarea
                  className="ft-textarea"
                  rows={4}
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Provide a short description or context for your entry..."
                />
              </div>

              {/* Submit Button */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button
                  type="submit"
                  disabled={submitting}
                  className="ft-btn"
                  style={{
                    background: 'linear-gradient(135deg, #be123c 0%, #9f1239 100%)',
                    color: '#ffffff',
                    padding: '0.85rem 2.25rem',
                    fontSize: '1rem',
                    fontWeight: 900,
                    borderRadius: '14px',
                    border: 'none',
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(190, 18, 60, 0.25)'
                  }}
                >
                  {submitting ? 'Submitting...' : '🚀 Submit Response In-Page'}
                </button>
              </div>

            </form>
          )}
        </div>
      </div>
    </div>
  );
}
