import React, { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import { useApi } from '../../../hooks/useApi';
import Header from '../../common/Header';
import Sidebar from '../../common/Sidebar';
import MyProfile from '../../common/MyProfile';
import Appointments from './Appointments';
import Patients from './Patients';
import MedicalRecords from './MedicalRecords';
import './DoctorDashboard.css';

const DoctorDashboard = () => {
  const { user } = useAuth();
  const { apiCall } = useApi();
  const location = useLocation();
  const currentSection = location.pathname.split('/')[2] || 'overview';
  const displayName = user?.profile?.name || 'Doctor';
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState('');
  const [dailyStats, setDailyStats] = useState({
    days: [],
    metrics: {
      appointments: [],
      patients: [],
      records: [],
      labResults: [],
    },
    totals: {
      appointments: 0,
      patients: 0,
      records: 0,
      labResults: 0,
    },
  });

  useEffect(() => {
    const loadDailyStats = async () => {
      if (!user?.userId) {
        return;
      }

      setStatsLoading(true);
      setStatsError('');
      try {
        const anchorDate = user?.loginDate ? `&anchorDate=${encodeURIComponent(user.loginDate)}` : '';
        const response = await apiCall(`/doctor-dashboard/stats?days=7${anchorDate}`);
        setDailyStats({
          days: Array.isArray(response?.days) ? response.days : [],
          metrics: {
            appointments: response?.metrics?.appointments || [],
            patients: response?.metrics?.patients || [],
            records: response?.metrics?.records || [],
            labResults: response?.metrics?.labResults || [],
          },
          totals: {
            appointments: Number(response?.totals?.appointments || 0),
            patients: Number(response?.totals?.patients || 0),
            records: Number(response?.totals?.records || 0),
            labResults: Number(response?.totals?.labResults || 0),
          },
        });
      } catch (error) {
        setStatsError(error.message || 'Could not load daily chart data.');
      } finally {
        setStatsLoading(false);
      }
    };

    loadDailyStats();
  }, [apiCall, user?.loginDate, user?.userId]);

  const formatDayLabel = (dateString) => {
    if (!dateString) {
      return '-';
    }

    const date = new Date(`${dateString}T00:00:00`);
    return date.toLocaleDateString('en-US', { weekday: 'short', day: '2-digit' });
  };

  const chartMetrics = useMemo(() => {
    const labels = dailyStats.days || [];
    const buildSeries = (values = []) => labels.map((day, index) => ({
      day: formatDayLabel(day),
      value: Number(values[index] || 0),
    }));

    return [
      {
        label: 'Appointments',
        colorClass: 'doctor-metric-blue',
        values: buildSeries(dailyStats.metrics.appointments),
        total: Number(dailyStats.totals.appointments || 0),
      },
      {
        label: 'Patients',
        colorClass: 'doctor-metric-green',
        values: buildSeries(dailyStats.metrics.patients),
        total: Number(dailyStats.totals.patients || 0),
      },
      {
        label: 'Records',
        colorClass: 'doctor-metric-amber',
        values: buildSeries(dailyStats.metrics.records),
        total: Number(dailyStats.totals.records || 0),
      },
      {
        label: 'Lab Results',
        colorClass: 'doctor-metric-red',
        values: buildSeries(dailyStats.metrics.labResults),
        total: Number(dailyStats.totals.labResults || 0),
      },
    ];
  }, [
    dailyStats.days,
    dailyStats.metrics.appointments,
    dailyStats.metrics.labResults,
    dailyStats.metrics.patients,
    dailyStats.metrics.records,
    dailyStats.totals.appointments,
    dailyStats.totals.labResults,
    dailyStats.totals.patients,
    dailyStats.totals.records,
  ]);

  return (
    <div className="layout-container">
      <Sidebar role="doctor" />
      <div className="main-content">
        <Header title="Doctor Dashboard" userRole={displayName} />
        <div className="container">
          <div className="welcome-section bounce-in">
            <h2>Good Day, {displayName}!</h2>
            <p>Here is your day-by-day activity from the database.</p>
          </div>

          {currentSection === 'overview' && (
            <>
              {statsError && <div className="doctor-stats-state doctor-stats-error">{statsError}</div>}
              {statsLoading && <div className="doctor-stats-state">Loading chart data...</div>}
              {!statsLoading && !statsError && (
                <div className="doctor-chart-grid fade-in-up">
                  {chartMetrics.map((metric) => {
                    const maxMetricValue = Math.max(...metric.values.map((item) => item.value), 1);

                    return (
                      <div className="doctor-chart-card" key={metric.label}>
                        <div className="doctor-chart-header">
                          <h3>{metric.label}</h3>
                        </div>
                        <div className={`doctor-metric-bars ${metric.colorClass}`}>
                          {metric.values.map((item, index) => (
                            <div className="doctor-metric-bar-column" key={`${metric.label}-${index}-${item.day}`}>
                              <span className="doctor-metric-bar-value">{item.value}</span>
                              <div
                                className="doctor-metric-bar-fill"
                                style={{ height: `${Math.max((item.value / maxMetricValue) * 100, 10)}%` }}
                              />
                              <span className="doctor-metric-bar-month">{item.day}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                  {!chartMetrics[0].values.length && (
                    <div className="doctor-stats-state">No daily data available yet.</div>
                  )}
                </div>
              )}
            </>
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
