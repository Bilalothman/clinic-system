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
  const monthlyMetrics = [
    {
      label: 'Doctors',
      colorClass: 'metric-blue',
      values: [
        { month: 'Jan', value: 9 },
        { month: 'Feb', value: 10 },
        { month: 'Mar', value: 10 },
        { month: 'Apr', value: 11 },
        { month: 'May', value: 12 },
        { month: 'Jun', value: 12 }
      ]
    },
    {
      label: 'Patients',
      colorClass: 'metric-green',
      values: [
        { month: 'Jan', value: 98 },
        { month: 'Feb', value: 110 },
        { month: 'Mar', value: 125 },
        { month: 'Apr', value: 137 },
        { month: 'May', value: 149 },
        { month: 'Jun', value: 156 }
      ]
    },
    {
      label: 'Appointments',
      colorClass: 'metric-amber',
      values: [
        { month: 'Jan', value: 52 },
        { month: 'Feb', value: 63 },
        { month: 'Mar', value: 71 },
        { month: 'Apr', value: 68 },
        { month: 'May', value: 80 },
        { month: 'Jun', value: 89 }
      ]
    },
    {
      label: 'Revenue',
      colorClass: 'metric-red',
      isCurrency: true,
      values: [
        { month: 'Jan', value: 14.2 },
        { month: 'Feb', value: 16.7 },
        { month: 'Mar', value: 18.3 },
        { month: 'Apr', value: 20.5 },
        { month: 'May', value: 22.1 },
        { month: 'Jun', value: 24.5 }
      ]
    }
  ];

  return (
    <div className="layout-container">
      <Sidebar role="manager" />
      <div className="main-content">
        <Header title="Manager Dashboard" userRole={displayName} />
        <div className="container">
          {currentSection === 'overview' && (
            <div className="stats-chart-grid fade-in-up">
              {monthlyMetrics.map((metric) => {
                const latestValue = metric.values[metric.values.length - 1]?.value || 0;
                const maxMetricValue = Math.max(...metric.values.map((item) => item.value));

                return (
                  <div className="metric-chart-card" key={metric.label}>
                    <div className="metric-chart-header">
                      <h3>{metric.label}</h3>
                      <span className="metric-current-value">
                        {metric.isCurrency ? `$${latestValue.toFixed(1)}K` : latestValue}
                      </span>
                    </div>
                    <div className={`metric-bars ${metric.colorClass}`}>
                      {metric.values.map((item) => (
                        <div className="metric-bar-column" key={`${metric.label}-${item.month}`}>
                          <div
                            className="metric-bar-fill"
                            style={{ height: `${Math.max((item.value / maxMetricValue) * 100, 10)}%` }}
                          />
                          <span className="metric-bar-month">{item.month}</span>
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
