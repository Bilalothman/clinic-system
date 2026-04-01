import React from 'react';
import { useLocation } from 'react-router-dom';
import Header from '../../common/Header';
import Sidebar from '../../common/Sidebar';
import MyAppointments from './MyAppointments';
import MyRecords from './MyRecords';
import './PatientDashboard.css';

const PatientDashboard = () => {
  const location = useLocation();
  const currentSection = location.pathname.split('/')[2] || 'overview';

  return (
    <div className="layout-container">
      <Sidebar role="patient" />
      <div className="main-content">
        <Header title="Patient Portal" userRole="John Doe" />
        <div className="container">
          <div className="welcome-section bounce-in">
            <h2>Welcome back, John!</h2>
            <p>Manage your appointments and medical records</p>
          </div>
          
          <div className="stats-grid fade-in-up">
            <div className="stat-card pulse-glow">
              <div className="stat-number">2</div>
              <div className="stat-label">Upcoming</div>
            </div>
            <div className="stat-card pulse-glow">
              <div className="stat-number">8</div>
              <div className="stat-label">Records</div>
            </div>
          </div>

          {currentSection === 'overview' && (
            <div className="dashboard-grid">
              <MyAppointments />
              <MyRecords />
            </div>
          )}

          {currentSection === 'appointments' && <MyAppointments />}
          {currentSection === 'records' && <MyRecords />}
        </div>
      </div>
    </div>
  );
};

export default PatientDashboard;
