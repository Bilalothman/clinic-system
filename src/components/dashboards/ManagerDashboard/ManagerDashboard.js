import React from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import Header from '../../common/Header';
import Sidebar from '../../common/Sidebar';
import MyProfile from '../../common/MyProfile';
import DoctorsManagement from './DoctorsManagement';
import PatientsList from './PatientsList';
import AppointmentsOverview from './AppointmentsOverview';
import './ManagerDashboard.css';

const ManagerDashboard = () => {
  const { user } = useAuth();
  const location = useLocation();
  const currentSection = location.pathname.split('/')[2] || 'overview';
  const displayName = user?.profile?.name || 'Administrator';

  return (
    <div className="layout-container">
      <Sidebar role="manager" />
      <div className="main-content">
        <Header title="Manager Dashboard" userRole={displayName} />
        <div className="container">
          <div className="stats-grid fade-in-up">
            <div className="stat-card pulse-glow">
              <div className="stat-number">12</div>
              <div className="stat-label">Doctors</div>
            </div>
            <div className="stat-card pulse-glow">
              <div className="stat-number">156</div>
              <div className="stat-label">Patients</div>
            </div>
            <div className="stat-card pulse-glow">
              <div className="stat-number">89</div>
              <div className="stat-label">Appointments</div>
            </div>
            <div className="stat-card pulse-glow">
              <div className="stat-number">$24.5K</div>
              <div className="stat-label">Revenue</div>
            </div>
          </div>

          {currentSection === 'overview' && (
            <div className="dashboard-grid">
              <DoctorsManagement />
              <PatientsList />
            </div>
          )}

          {currentSection === 'doctors' && <DoctorsManagement />}
          {currentSection === 'patients' && <PatientsList />}
          {currentSection === 'appointments' && <AppointmentsOverview />}
          {currentSection === 'profile' && <MyProfile title="Manager Profile" />}
        </div>
      </div>
    </div>
  );
};

export default ManagerDashboard;
