import React, { Component } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import FTLayout from './FTLayout';
import FTDashboard from './FTDashboard';
import FTPlaceDetails from './FTPlaceDetails';
import FTMyCompetition from './FTMyCompetition';
import FTOurTeam from './FTOurTeam';
import FTSchedulePage from './FTSchedulePage';
import FTAdminPlaces from './FTAdminPlaces';
import FTAdminCompetitors from './FTAdminCompetitors';
import FTAdminSettings from './FTAdminSettings';
import FTAdminSubmissionAssignments from './FTAdminSubmissionAssignments';
import FTJudgeDashboard from './FTJudgeDashboard';
import FTProtectedRoute from './FTProtectedRoute';
import FTTimelineManagement from './FTTimelineManagement';
import FTEvaluationManagement from './FTEvaluationManagement';
import FTActivityLogsPage from './FTActivityLogsPage';
import FTTestSection from './FTTestSection';
import FTChatPage from './FTChatPage';
import FTModulesPage from './FTModulesPage';
import FTNotificationsPage from './FTNotificationsPage';
import Login from './Login';
import Register from './Register';
import Landing from './Landing';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("UI Error Caught by App Boundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '3rem 1.5rem', textAlign: 'center', background: '#f8fafc', minHeight: '80vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: "'Outfit', sans-serif" }}>
          <div style={{ fontSize: '3.5rem', marginBottom: '1rem', animation: 'bounce 1s infinite' }}>⚠️</div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 900, color: '#0f172a', marginBottom: '0.5rem' }}>Something went wrong loading this section</h2>
          <p style={{ color: '#64748b', fontSize: '0.92rem', marginBottom: '1.75rem', maxWidth: '520px', lineHeight: 1.5 }}>
            {this.state.error?.message || 'An unexpected rendering error occurred in the workspace.'}
          </p>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              onClick={() => { this.setState({ hasError: false, error: null }); window.location.hash = '#/'; window.location.reload(); }}
              style={{ background: '#be123c', color: '#ffffff', border: 'none', padding: '0.7rem 1.6rem', borderRadius: '12px', fontWeight: 900, fontSize: '0.9rem', cursor: 'pointer', boxShadow: '0 4px 14px rgba(190,18,60,0.25)' }}
            >
              🔄 Refresh Page
            </button>
            <a
              href="#/"
              onClick={() => { this.setState({ hasError: false, error: null }); }}
              style={{ background: '#ffffff', color: '#334155', border: '1.5px solid #cbd5e1', padding: '0.7rem 1.6rem', borderRadius: '12px', fontWeight: 800, fontSize: '0.9rem', textDecoration: 'none' }}
            >
              🏠 Return to Dashboard
            </a>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Router>
          <Routes>
          {/* Public Landing & Authentication routes */}
          <Route path="/" element={<Landing />} />
          <Route path="/landing" element={<Landing />} />
          <Route path="/preview" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected Dashboard routes */}
          <Route element={<FTProtectedRoute />}>
            <Route path="/dashboard" element={<FTLayout />}>
              {/* Home / Competition Dashboard */}
              <Route index element={<FTDashboard />} />

              {/* Details and Competitor tracking */}
              <Route path="place/:placeId" element={<FTPlaceDetails />} />
              <Route path="my-competition" element={<FTMyCompetition />} />
              <Route path="our-team" element={<FTOurTeam />} />
              <Route path="schedule" element={<FTSchedulePage />} />
              <Route path="modules" element={<FTModulesPage />} />
              <Route path="chat" element={<FTChatPage />} />
              <Route path="notifications" element={<FTNotificationsPage />} />

              {/* Admin/Faculty places */}
              <Route element={<FTProtectedRoute requireRole={['master', 'admin']} />}>
                <Route path="manage-places" element={<FTAdminPlaces />} />
              </Route>

              {/* Competitors & Users list */}
              <Route element={<FTProtectedRoute requireRole={['master', 'admin']} />}>
                <Route path="competitors" element={<FTAdminCompetitors />} />
              </Route>

              {/* Admin configuration settings */}
              <Route element={<FTProtectedRoute requireRole={['master', 'admin']} />}>
                <Route path="settings" element={<FTAdminSettings />} />
                <Route path="timeline-manage" element={<FTTimelineManagement />} />
                <Route path="evaluation-management" element={<FTEvaluationManagement />} />
                <Route path="activity-logs" element={<FTActivityLogsPage />} />
                <Route path="submission-assignments" element={<FTAdminSubmissionAssignments />} />
                <Route path="admin/submission-assignments" element={<FTAdminSubmissionAssignments />} />
                <Route path="test" element={<FTTestSection />} />
              </Route>

              {/* Judge evaluating list */}
              <Route element={<FTProtectedRoute requireRole={['judge', 'trainer_judge', 'academic_judge', 'scicomm_judge', 'master', 'admin']} />}>
                <Route path="judge" element={<FTJudgeDashboard />} />
              </Route>
            </Route>
          </Route>

          {/* Direct legacy aliases redirecting to /dashboard/* */}
          <Route path="/my-competition" element={<Navigate to="/dashboard/my-competition" replace />} />
          <Route path="/our-team" element={<Navigate to="/dashboard/our-team" replace />} />
          <Route path="/competitors" element={<Navigate to="/dashboard/competitors" replace />} />
          <Route path="/settings" element={<Navigate to="/dashboard/settings" replace />} />
          <Route path="/timeline-manage" element={<Navigate to="/dashboard/timeline-manage" replace />} />
          <Route path="/evaluation-management" element={<Navigate to="/dashboard/evaluation-management" replace />} />
          <Route path="/activity-logs" element={<Navigate to="/dashboard/activity-logs" replace />} />
          <Route path="/submission-assignments" element={<Navigate to="/dashboard/admin/submission-assignments" replace />} />
          <Route path="/admin/submission-assignments" element={<Navigate to="/dashboard/admin/submission-assignments" replace />} />
          <Route path="/judge" element={<Navigate to="/dashboard/judge" replace />} />
          <Route path="/chat" element={<Navigate to="/dashboard/chat" replace />} />
          <Route path="/modules" element={<Navigate to="/dashboard/modules" replace />} />
          <Route path="/manage-places" element={<Navigate to="/dashboard/manage-places" replace />} />

          {/* Route fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
