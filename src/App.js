import React, { useEffect, useCallback } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useNavigate,
  useLocation,
  Navigate
} from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import ManagerDashboard from './components/dashboards/ManagerDashboard/ManagerDashboard';
import DoctorDashboard from './components/dashboards/DoctorDashboard/DoctorDashboard';
import PatientDashboard from './components/dashboards/PatientDashboard/PatientDashboard';
import './index.css';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login', { replace: true, state: { from: location } });
    }
  }, [user, loading, navigate, location]);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner-large">
          <div className="spinner-large"></div>
          <p>Checking authentication...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
};

const DashboardRouter = () => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const getDashboardPath = useCallback((role) => {
    switch (role) {
      case 'manager': return '/manager';
      case 'doctor': return '/doctor';
      case 'patient': return '/patient';
      default: return '/login';
    }
  }, []);

  useEffect(() => {
    if (user) {
      const dashboardPath = getDashboardPath(user.role);
      if (!location.pathname.startsWith(dashboardPath)) {
        navigate(dashboardPath, { replace: true });
      }
    }
  }, [user, location.pathname, navigate, getDashboardPath]);

  if (loading) {
    return null;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <Routes>
      <Route path="/manager" element={<ManagerDashboard />} />
      <Route path="/manager/doctors" element={<ManagerDashboard />} />
      <Route path="/manager/patients" element={<ManagerDashboard />} />
      <Route path="/manager/appointments" element={<ManagerDashboard />} />
      <Route path="/manager/profile" element={<ManagerDashboard />} />
      <Route path="/doctor" element={<DoctorDashboard />} />
      <Route path="/doctor/appointments" element={<DoctorDashboard />} />
      <Route path="/doctor/patients" element={<DoctorDashboard />} />
      <Route path="/doctor/records" element={<DoctorDashboard />} />
      <Route path="/doctor/profile" element={<DoctorDashboard />} />
      <Route path="/patient" element={<PatientDashboard />} />
      <Route path="/patient/appointments" element={<PatientDashboard />} />
      <Route path="/patient/records" element={<PatientDashboard />} />
      <Route path="/patient/profile" element={<PatientDashboard />} />
      <Route path="*" element={<Navigate to={getDashboardPath(user.role)} replace />} />
    </Routes>
  );
};

function AppContent() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <DashboardRouter />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <AppContent />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
