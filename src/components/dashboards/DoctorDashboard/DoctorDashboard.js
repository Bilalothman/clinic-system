import React from 'react';
import { useLocation } from 'react-router-dom';
import Header from '../../common/Header';
import Sidebar from '../../common/Sidebar';
import Appointments from './Appointments';
import Patients from './Patients';
import MedicalRecords from './MedicalRecords';
import './DoctorDashboard.css';

const DoctorDashboard = () => {
  const location = useLocation();
  const currentSection = location.pathname.split('/')[2] || 'overview';

  return (
    <div className="layout-container">
      <Sidebar role="doctor" />
      <div className="main-content">
        <Header title="Doctor Dashboard" userRole="Dr. Smith" />
        <div className="container">
          <div className="stats-grid fade-in-up">
            <div className="stat-card pulse-glow">
              <div className="stat-number">5</div>
              <div className="stat-label">Today's Appointments</div>
            </div>
            <div className="stat-card pulse-glow">
              <div className="stat-number">23</div>
              <div className="stat-label">Total Patients</div>
            </div>
            <div className="stat-card pulse-glow">
              <div className="stat-number">8</div>
              <div className="stat-label">Pending Records</div>
            </div>
          </div>
          <div className="welcome-section bounce-in">
            <h2>Good Morning, Dr. Smith!</h2>
            <p>Here's what's happening with your patients today</p>
          </div>

          {currentSection === 'overview' && (
            <div className="dashboard-grid">
              <Appointments />
              <div className="dashboard-stack">
                <Patients />
                <MedicalRecords />
              </div>
            </div>
          )}

          {currentSection === 'appointments' && <Appointments />}
          {currentSection === 'patients' && <Patients />}
          {currentSection === 'records' && <MedicalRecords />}
        </div>
      </div>
    </div>
  );
};

export default DoctorDashboard;
