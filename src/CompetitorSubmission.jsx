import { useAuth } from './context/AuthContext';
import { useLiveCollection, db } from './db';
import { ExternalLink, ClipboardList, Trash2 } from 'lucide-react';
import './scicommspark.css';

export default function CompetitorSubmission() {
  const { user } = useAuth();
  const submissions = useLiveCollection('submissions') || [];
  
  // Shared Team Submissions: check competitorId OR shared teamName
  const mySubmissions = submissions.filter(s => {
    if (s.competitorId === user?.id || s.competitorEmail === user?.email) return true;
    if (user?.teamName && s.teamName && s.teamName === user?.teamName) return true;
    return false;
  });

  const handleDelete = async (subId, title) => {
    if (window.confirm(`Are you sure you want to delete "${title}"?`)) {
      await db.submissions.delete(subId);
    }
  };

  return (
    <div className="ft-card" style={{ padding: '2rem', marginTop: '2rem' }}>
      <div style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--ft-border)', paddingBottom: '1rem' }}>
        <h2 style={{ fontFamily: "'Outfit', sans-serif", fontSize: '1.4rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <ClipboardList size={24} style={{ color: 'var(--ft-primary)' }} /> Your Uploaded Submissions
        </h2>
        <p style={{ color: 'var(--ft-text-muted)', fontSize: '0.9rem' }}>
          View the list of scientific articles, videos, or presentation materials submitted for your team.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {mySubmissions.length === 0 ? (
          <div style={{ color: 'var(--ft-text-muted)', fontSize: '0.88rem', padding: '1.5rem', textAlign: 'center', background: 'rgba(15, 23, 42, 0.2)', borderRadius: '8px', border: '1px dashed var(--ft-border)' }}>
            No submissions uploaded yet.
          </div>
        ) : (
          mySubmissions.map(sub => (
            <div key={sub.id} style={{
              padding: '1rem', borderRadius: '10px', background: 'rgba(15, 23, 42, 0.4)',
              border: '1px solid var(--ft-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{sub.title}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--ft-text-muted)' }}>
                  Track: {sub.track === 'pop_science' ? 'Pop Science Video' : 'Science Journalism'} · Stage {sub.stageId} · {new Date(sub.submittedAt).toLocaleDateString()}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {(sub.videoUrl || sub.fileUrl || sub.pdfUrl) && (
                  <a href={sub.fileUrl || sub.pdfUrl || sub.videoUrl} target="_blank" rel="noreferrer" className="ft-btn ft-btn-outline" style={{ fontSize: '0.8rem', padding: '0.3rem 0.6rem' }}>
                    View Deliverable <ExternalLink size={14} />
                  </a>
                )}
                <button
                  onClick={() => handleDelete(sub.id, sub.title)}
                  className="ft-btn"
                  style={{ background: '#fff1f2', color: '#be123c', border: '1px solid #fecdd3', fontSize: '0.8rem', padding: '0.3rem 0.6rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                >
                  <Trash2 size={13} /> Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
