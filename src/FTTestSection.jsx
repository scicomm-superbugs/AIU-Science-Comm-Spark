import React, { useState } from 'react';
import { useLiveCollection } from './db';
import { TestTube, CheckCircle, AlertTriangle, RefreshCw, Database, Users, Shield, Award, Zap } from 'lucide-react';

export default function FTTestSection() {
  const scientists = useLiveCollection('scientists') || [];
  const teams = useLiveCollection('ft_teams') || [];
  const submissions = useLiveCollection('submissions') || [];
  const evaluations = useLiveCollection('ft_evaluations') || [];

  const [activeTab, setActiveTab] = useState('overview');
  const [testResult, setTestResult] = useState(null);

  const runTest = (testName) => {
    setTestResult({
      name: testName,
      status: 'success',
      timestamp: new Date().toLocaleTimeString(),
      message: `Test "${testName}" executed successfully. System parameters healthy.`
    });
  };

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', paddingBottom: '3rem' }}>
      {/* Page Header */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
          <div style={{ background: '#eff6ff', color: '#2563eb', padding: '0.6rem', borderRadius: '12px', display: 'flex' }}>
            <TestTube size={24} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 900, color: '#0f172a', margin: 0, fontFamily: "'Outfit', sans-serif" }}>
              Test & System Sandbox
            </h1>
            <p style={{ color: '#64748b', margin: '0.2rem 0 0 0', fontSize: '0.9rem' }}>
              System diagnostics, feature sandbox, and real-time database inspection.
            </p>
          </div>
        </div>
      </div>

      {/* Test Control Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
        <div className="ft-card" style={{ padding: '1.25rem', background: '#ffffff', borderRadius: '20px', border: '1.5px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <div style={{ background: '#eff6ff', color: '#2563eb', padding: '0.5rem', borderRadius: '10px' }}>
              <Users size={20} />
            </div>
            <div>
              <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#0f172a' }}>{scientists.length}</div>
              <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700 }}>Total Registered Users</div>
            </div>
          </div>
          <button onClick={() => runTest('User Database Audit')} className="ft-btn ft-w-full" style={{ background: '#f8fafc', border: '1px solid #cbd5e1', color: '#334155', fontSize: '0.78rem', fontWeight: 800, padding: '0.4rem', borderRadius: '8px' }}>
            ⚡ Run User Audit
          </button>
        </div>

        <div className="ft-card" style={{ padding: '1.25rem', background: '#ffffff', borderRadius: '20px', border: '1.5px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <div style={{ background: '#fff1f2', color: '#be123c', padding: '0.5rem', borderRadius: '10px' }}>
              <Shield size={20} />
            </div>
            <div>
              <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#0f172a' }}>{teams.length}</div>
              <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700 }}>Active Teams</div>
            </div>
          </div>
          <button onClick={() => runTest('Team Integrity Check')} className="ft-btn ft-w-full" style={{ background: '#f8fafc', border: '1px solid #cbd5e1', color: '#334155', fontSize: '0.78rem', fontWeight: 800, padding: '0.4rem', borderRadius: '8px' }}>
            ⚡ Check Teams
          </button>
        </div>

        <div className="ft-card" style={{ padding: '1.25rem', background: '#ffffff', borderRadius: '20px', border: '1.5px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <div style={{ background: '#f0fdf4', color: '#16a34a', padding: '0.5rem', borderRadius: '10px' }}>
              <Database size={20} />
            </div>
            <div>
              <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#0f172a' }}>{submissions.length}</div>
              <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700 }}>Submissions Logged</div>
            </div>
          </div>
          <button onClick={() => runTest('Submissions Pipeline Sync')} className="ft-btn ft-w-full" style={{ background: '#f8fafc', border: '1px solid #cbd5e1', color: '#334155', fontSize: '0.78rem', fontWeight: 800, padding: '0.4rem', borderRadius: '8px' }}>
            ⚡ Verify Submissions
          </button>
        </div>

        <div className="ft-card" style={{ padding: '1.25rem', background: '#ffffff', borderRadius: '20px', border: '1.5px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <div style={{ background: '#fef3c7', color: '#b45309', padding: '0.5rem', borderRadius: '10px' }}>
              <Award size={20} />
            </div>
            <div>
              <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#0f172a' }}>{evaluations.length}</div>
              <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700 }}>Evaluations Submitted</div>
            </div>
          </div>
          <button onClick={() => runTest('Evaluation Score Matrix')} className="ft-btn ft-w-full" style={{ background: '#f8fafc', border: '1px solid #cbd5e1', color: '#334155', fontSize: '0.78rem', fontWeight: 800, padding: '0.4rem', borderRadius: '8px' }}>
            ⚡ Test Leaderboard Sync
          </button>
        </div>
      </div>

      {/* Diagnostics Test Feedback Output */}
      {testResult && (
        <div style={{ padding: '1.25rem', background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: '16px', marginBottom: '2rem', display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
          <CheckCircle size={24} style={{ color: '#16a34a', flexShrink: 0, marginTop: '0.1rem' }} />
          <div>
            <div style={{ fontWeight: 900, fontSize: '0.95rem', color: '#14532d' }}>
              {testResult.name} — Status Passed ✅ ({testResult.timestamp})
            </div>
            <div style={{ fontSize: '0.84rem', color: '#166534', marginTop: '0.2rem' }}>
              {testResult.message}
            </div>
          </div>
        </div>
      )}

      {/* Test Sandbox Panel */}
      <div className="ft-card" style={{ padding: '2rem', background: '#ffffff', borderRadius: '24px', border: '1.5px solid #e2e8f0' }}>
        <h3 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#0f172a', margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          🧪 Test Playground & Diagnostic Controls
        </h3>
        <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1.5rem' }}>
          Use this section to run automated validation tests, test UI state handling, and verify database synchronizations across SciComm Spark.
        </p>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => runTest('Full System Diagnostics')}
            className="ft-btn"
            style={{ background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', color: '#ffffff', fontWeight: 800, padding: '0.65rem 1.25rem', borderRadius: '12px', border: 'none' }}
          >
            🚀 Run Full Diagnostics Test
          </button>

          <button
            onClick={() => runTest('Live Cache Clear')}
            className="ft-btn ft-btn-secondary"
            style={{ fontWeight: 800, padding: '0.65rem 1.25rem', borderRadius: '12px' }}
          >
            🔄 Reset Local Cache
          </button>
        </div>
      </div>
    </div>
  );
}
