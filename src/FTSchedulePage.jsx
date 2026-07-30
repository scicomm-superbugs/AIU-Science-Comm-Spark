import { useState } from 'react';
import { Calendar, Video, Newspaper, Sparkles } from 'lucide-react';
import WorkshopManager from './WorkshopManager';
import './scicommspark.css';

export default function FTSchedulePage() {
  const [selectedTrack, setSelectedTrack] = useState('pop_science');

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '1rem 0.5rem 4rem 0.5rem' }}>
      {/* Top Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        borderRadius: '24px',
        padding: '1.75rem 1.5rem',
        color: '#ffffff',
        marginBottom: '2rem',
        boxShadow: '0 10px 30px rgba(15, 23, 42, 0.15)',
        border: '1.5px solid #334155',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{
          position: 'absolute', top: '-40px', right: '-40px', width: '200px', height: '200px',
          borderRadius: '50%', background: 'radial-gradient(circle, rgba(225,29,72,0.2) 0%, transparent 70%)',
          pointerEvents: 'none'
        }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.5rem' }}>
          <span style={{
            fontSize: '0.78rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em',
            background: 'linear-gradient(135deg, #be123c 0%, #e11d48 100%)', color: '#ffffff',
            padding: '0.25rem 0.75rem', borderRadius: '20px', display: 'inline-flex', alignItems: 'center', gap: '0.35rem'
          }}>
            <Sparkles size={14} /> Official Master Calendar
          </span>
        </div>

        <h1 style={{
          fontSize: '1.8rem', fontWeight: 900, margin: '0.2rem 0 0.5rem 0',
          fontFamily: "'Outfit', sans-serif", color: '#ffffff'
        }}>
          🗓️ Competition & Training Schedule
        </h1>
        <p style={{ fontSize: '0.95rem', color: '#94a3b8', margin: 0, maxWidth: '750px', lineHeight: 1.5 }}>
          Explore orientation lectures, masterclasses, office hours, and stage submission deadlines in exact chronological order across all tracks.
        </p>

        {/* Track Selector Bar */}
        <div style={{
          display: 'flex', gap: '0.75rem', marginTop: '1.5rem', flexWrap: 'wrap'
        }}>
          <button
            onClick={() => setSelectedTrack('pop_science')}
            style={{
              padding: '0.65rem 1.25rem',
              borderRadius: '12px',
              border: selectedTrack === 'pop_science' ? '2px solid #e11d48' : '1px solid #475569',
              background: selectedTrack === 'pop_science' ? 'linear-gradient(135deg, #be123c 0%, #e11d48 100%)' : '#1e293b',
              color: '#ffffff',
              fontWeight: 800,
              fontSize: '0.88rem',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              boxShadow: selectedTrack === 'pop_science' ? '0 4px 16px rgba(225, 29, 72, 0.4)' : 'none',
              transition: 'all 0.2s ease'
            }}
          >
            <Video size={16} /> Track 1: Pop Science Videos
          </button>

          <button
            onClick={() => setSelectedTrack('journalism')}
            style={{
              padding: '0.65rem 1.25rem',
              borderRadius: '12px',
              border: selectedTrack === 'journalism' ? '2px solid #2563eb' : '1px solid #475569',
              background: selectedTrack === 'journalism' ? 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)' : '#1e293b',
              color: '#ffffff',
              fontWeight: 800,
              fontSize: '0.88rem',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              boxShadow: selectedTrack === 'journalism' ? '0 4px 16px rgba(37, 99, 235, 0.4)' : 'none',
              transition: 'all 0.2s ease'
            }}
          >
            <Newspaper size={16} /> Track 2: Science Journalism
          </button>
        </div>
      </div>

      {/* Main Embedded Workshop & Schedule Component */}
      <WorkshopManager isAdmin={false} isTrainer={false} currentTrack={selectedTrack} />
    </div>
  );
}
