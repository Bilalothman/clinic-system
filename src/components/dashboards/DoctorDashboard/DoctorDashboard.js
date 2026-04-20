import React from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import Header from '../../common/Header';
import Sidebar from '../../common/Sidebar';
import MyProfile from '../../common/MyProfile';
import Appointments from './Appointments';
import Patients from './Patients';
import MedicalRecords from './MedicalRecords';
import './DoctorDashboard.css';

const DoctorDashboard = () => {
  const { user } = useAuth();
  const location = useLocation();
  const currentSection = location.pathname.split('/')[2] || 'overview';
  const displayName = user?.profile?.name || 'Dr. Smith';
  const monthlyMetrics = [
    {
      label: 'Appointments',
      colorClass: 'doctor-metric-blue',
      values: [
        { month: 'Jan', value: 24 },
        { month: 'Feb', value: 28 },
        { month: 'Mar', value: 31 },
        { month: 'Apr', value: 29 },
        { month: 'May', value: 34 },
        { month: 'Jun', value: 36 }
      ]
    },
    {
      label: 'Patients',
      colorClass: 'doctor-metric-green',
      values: [
        { month: 'Jan', value: 18 },
        { month: 'Feb', value: 20 },
        { month: 'Mar', value: 22 },
        { month: 'Apr', value: 23 },
        { month: 'May', value: 24 },
        { month: 'Jun', value: 26 }
      ]
    },
    {
      label: 'Records',
      colorClass: 'doctor-metric-amber',
      values: [
        { month: 'Jan', value: 11 },
        { month: 'Feb', value: 12 },
        { month: 'Mar', value: 13 },
        { month: 'Apr', value: 14 },
        { month: 'May', value: 14 },
        { month: 'Jun', value: 16 }
      ]
    },
    {
      label: 'Consultations',
      colorClass: 'doctor-metric-red',
      values: [
        { month: 'Jan', value: 14 },
        { month: 'Feb', value: 15 },
        { month: 'Mar', value: 16 },
        { month: 'Apr', value: 17 },
        { month: 'May', value: 19 },
        { month: 'Jun', value: 20 }
      ]
    }
  ];

  return (
    <div className="layout-container">
      <Sidebar role="doctor" />
      <div className="main-content">
        <Header title="Doctor Dashboard" userRole={displayName} />
        <div className="container">
          <div className="welcome-section bounce-in">
            <h2>Good Morning, Dr. Smith!</h2>
            <p>Here's what's happening with your patients today</p>
          </div>

          {currentSection === 'overview' && (
            <div className="doctor-chart-grid fade-in-up">
              {monthlyMetrics.map((metric) => {
                const latestValue = metric.values[metric.values.length - 1]?.value || 0;
                const maxMetricValue = Math.max(...metric.values.map((item) => item.value));

                return (
                  <div className="doctor-chart-card" key={metric.label}>
                    <div className="doctor-chart-header">
                      <h3>{metric.label}</h3>
                      <span className="doctor-chart-current-value">{latestValue}</span>
                    </div>
                    <div className={`doctor-metric-bars ${metric.colorClass}`}>
                      {metric.values.map((item) => (
                        <div className="doctor-metric-bar-column" key={`${metric.label}-${item.month}`}>
                          <div
                            className="doctor-metric-bar-fill"
                            style={{ height: `${Math.max((item.value / maxMetricValue) * 100, 10)}%` }}
                          />
                          <span className="doctor-metric-bar-month">{item.month}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {currentSection === 'overview' && (
            <div className="dashboard-grid">
              <Appointments showPendingOnly />
              <div className="dashboard-stack">
                <MedicalRecords />
              </div>
            </div>
          )}

          {currentSection === 'appointments' && <Appointments />}
          {currentSection === 'patients' && <Patients />}
          {currentSection === 'records' && <MedicalRecords />}
          {currentSection === 'profile' && <MyProfile title="Doctor Profile" />}
        </div>
      </div>
    </div>
  );
};

export default DoctorDashboard;
