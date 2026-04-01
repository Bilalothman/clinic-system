import React from 'react';
import { useLocation } from 'react-router-dom';
import Header from '../../common/Header';
import Sidebar from '../../common/Sidebar';
import DoctorsManagement from './DoctorsManagement';
import PatientsList from './PatientsList';
import './ManagerDashboard.css';

const ManagerDashboard = () => {
  const location = useLocation();
  const currentSection = location.pathname.split('/')[2] || 'overview';

  return (
    <div className="layout-container">
      <Sidebar role="manager" />
      <div className="main-content">
        <Header title="Manager Dashboard" userRole="Administrator" />
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
        </div>
      </div>
    </div>
  );
};

export default ManagerDashboard;
