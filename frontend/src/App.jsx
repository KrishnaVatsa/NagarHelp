import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Login from './AuthPages/Login';
import Register from './AuthPages/Register';
import OTPVerify from './AuthPages/OTPVerify';
import ForgotPassword from './AuthPages/ForgotPassword';
import Dashboard from './pages/Dashboard';
import SOSBroadcast from './pages/SOSBroadcast';
import AdminDashboard from './pages/AdminDashboard';
import History from './pages/History';
import CivicDashboard from './pages/CivicDashboard';
import ReportIssue from './pages/ReportIssue';
import IssuesFeed from './pages/IssuesFeed';
import PageLoader from './components/PageLoader';

import { useLocationTracker } from './hooks/useLocationTracker';

function App() {
  const { isAuthenticated, role, loading } = useAuth();
  
  // Start tracking location and listening for SOS alerts if logged in
  useLocationTracker(isAuthenticated);

  if (loading) return <PageLoader />;

  const isAdmin = role === 'admin';

  return (
    <Routes>
      {/* Public Auth Routes */}
      <Route path="/login" element={!isAuthenticated ? <Login /> : <Navigate to="/dashboard" />} />
      <Route path="/register" element={!isAuthenticated ? <Register /> : <Navigate to="/dashboard" />} />
      <Route path="/verify-otp" element={<OTPVerify />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />

      {/* Protected SOS Routes */}
      <Route path="/dashboard" element={isAuthenticated ? <Dashboard /> : <Navigate to="/login" />} />
      <Route path="/sos/:sosId" element={isAuthenticated ? <SOSBroadcast /> : <Navigate to="/login" />} />
      <Route path="/history" element={isAuthenticated ? <History /> : <Navigate to="/login" />} />

      {/* Protected Civic Routes */}
      <Route path="/civic" element={isAuthenticated ? <CivicDashboard /> : <Navigate to="/login" />} />
      <Route path="/civic/dashboard" element={isAuthenticated ? <CivicDashboard /> : <Navigate to="/login" />} />
      <Route path="/civic/report" element={isAuthenticated ? <ReportIssue /> : <Navigate to="/login" />} />
      <Route path="/civic/feed" element={isAuthenticated ? <IssuesFeed /> : <Navigate to="/login" />} />

      {/* Admin */}
      <Route path="/admin" element={isAuthenticated && isAdmin ? <AdminDashboard /> : <Navigate to="/dashboard" />} />
      <Route path="/admin/dashboard" element={isAuthenticated && isAdmin ? <AdminDashboard /> : <Navigate to="/dashboard" />} />

      {/* Default */}
      <Route path="/" element={<Navigate to={isAuthenticated ? '/dashboard' : '/login'} />} />
      <Route path="*" element={<Navigate to={isAuthenticated ? '/dashboard' : '/login'} />} />
    </Routes>
  );
}

export default App;
