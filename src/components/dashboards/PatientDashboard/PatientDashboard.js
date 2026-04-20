import React from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import Header from '../../common/Header';
import Sidebar from '../../common/Sidebar';
import MyProfile from '../../common/MyProfile';
import MyAppointments from './MyAppointments';
import MyRecords from './MyRecords';
import './PatientDashboard.css';

const PatientDashboard = () => {
  const { user } = useAuth();
  const location = useLocation();
  const currentSection = location.pathname.split('/')[2] || 'overview';
  const displayName = user?.profile?.name || 'John Doe';
  const monthlyMetrics = [
    {
      label: 'Upcoming Appointments',
      colorClass: 'patient-metric-blue',
      values: [
        { month: 'Jan', value: 1 },
        { month: 'Feb', value: 2 },
        { month: 'Mar', value: 2 },
        { month: 'Apr', value: 3 },
        { month: 'May', value: 2 },
        { month: 'Jun', value: 2 }
      ]
    },
    {
      label: 'Completed Visits',
      colorClass: 'patient-metric-green',
      values: [
        { month: 'Jan', value: 3 },
        { month: 'Feb', value: 4 },
        { month: 'Mar', value: 5 },
        { month: 'Apr', value: 4 },
        { month: 'May', value: 6 },
        { month: 'Jun', value: 6 }
      ]
    },
    {
      label: 'Lab Reports',
      colorClass: 'patient-metric-amber',
      values: [
        { month: 'Jan', value: 2 },
        { month: 'Feb', value: 3 },
        { month: 'Mar', value: 3 },
        { month: 'Apr', value: 4 },
        { month: 'May', value: 4 },
        { month: 'Jun', value: 5 }
      ]
    },
    {
      label: 'Prescriptions',
      colorClass: 'patient-metric-red',
      values: [
        { month: 'Jan', value: 2 },
        { month: 'Feb', value: 2 },
        { month: 'Mar', value: 3 },
        { month: 'Apr', value: 3 },
        { month: 'May', value: 4 },
        { month: 'Jun', value: 4 }
      ]
    }
  ];

  return (
    <div className="layout-container">
      <Sidebar role="patient" />
      <div className="main-content">
        <Header title="Patient Portal" userRole={displayName} />
        <div className="container">
          <div className="welcome-section bounce-in">
            <h2>Welcome back, {displayName}!</h2>
            <p>Manage your appointments and medical records</p>
          </div>
          
          {currentSection === 'overview' && (
            <div className="patient-chart-grid fade-in-up">
              {monthlyMetrics.map((metric) => {
                const latestValue = metric.values[metric.values.length - 1]?.value || 0;
                const maxMetricValue = Math.max(...metric.values.map((item) => item.value));

                return (
                  <div className="patient-chart-card" key={metric.label}>
                    <div className="patient-chart-header">
                      <h3>{metric.label}</h3>
                      <span className="patient-chart-current-value">{latestValue}</span>
                    </div>
                    <div className={`patient-metric-bars ${metric.colorClass}`}>
                      {metric.values.map((item) => (
                        <div className="patient-metric-bar-column" key={`${metric.label}-${item.month}`}>
                          <div
                            className="patient-metric-bar-fill"
                            style={{ height: `${Math.max((item.value / maxMetricValue) * 100, 10)}%` }}
                          />
                          <span className="patient-metric-bar-month">{item.month}</span>
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
              <MyAppointments />
              <MyRecords />
            </div>
          )}

          {currentSection === 'appointments' && <MyAppointments />}
          {currentSection === 'records' && <MyRecords />}
          {currentSection === 'profile' && <MyProfile title="Patient Profile" />}
        </div>
      </div>
    </div>
  );
};

export default PatientDashboard;
