import React, { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import { useApi } from '../../../hooks/useApi';
import Header from '../../common/Header';
import Sidebar from '../../common/Sidebar';
import MyProfile from '../../common/MyProfile';
import ManagerDoctorReviews from './ManagerDoctorReviews';
import DoctorsManagement from './DoctorsManagement';
import PatientsList from './PatientsList';
import AppointmentsOverview from './AppointmentsOverview';
import './ManagerDashboard.css';

const ManagerDashboard = () => {
  const { user } = useAuth();
  const { apiCall } = useApi();
  const location = useLocation();
  const currentSection = location.pathname.split('/')[2] || 'overview';
  const displayName = user?.profile?.name || 'Administrator';
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState('');
  const [dailyStats, setDailyStats] = useState({
    days: [],
    metrics: {
      doctors: [],
      patients: [],
      appointments: [],
      revenue: [],
    },
    totals: {
      doctors: 0,
      patients: 0,
      appointments: 0,
      revenue: 0,
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
        const response = await apiCall(`/manager-dashboard/stats?days=7${anchorDate}`);
        setDailyStats({
          days: Array.isArray(response?.days) ? response.days : [],
          metrics: {
            doctors: response?.metrics?.doctors || [],
            patients: response?.metrics?.patients || [],
            appointments: response?.metrics?.appointments || [],
            revenue: response?.metrics?.revenue || [],
          },
          totals: {
            doctors: Number(response?.totals?.doctors || 0),
            patients: Number(response?.totals?.patients || 0),
            appointments: Number(response?.totals?.appointments || 0),
            revenue: Number(response?.totals?.revenue || 0),
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
        label: 'Doctors Available',
        colorClass: 'manager-metric-blue',
        values: buildSeries(dailyStats.metrics.doctors),
        total: Number(dailyStats.totals.doctors || 0),
      },
      {
        label: 'Patients Requesting Appointments',
        colorClass: 'manager-metric-green',
        values: buildSeries(dailyStats.metrics.patients),
        total: Number(dailyStats.totals.patients || 0),
      },
      {
        label: 'Appointments Accepted',
        colorClass: 'manager-metric-amber',
        values: buildSeries(dailyStats.metrics.appointments),
        total: Number(dailyStats.totals.appointments || 0),
      },
      {
        label: 'Revenue',
        colorClass: 'manager-metric-red',
        isCurrency: true,
        values: buildSeries(dailyStats.metrics.revenue),
        total: Number(dailyStats.totals.revenue || 0),
      },
    ];
  }, [
    dailyStats.days,
    dailyStats.metrics.appointments,
    dailyStats.metrics.doctors,
    dailyStats.metrics.patients,
    dailyStats.metrics.revenue,
    dailyStats.totals.appointments,
    dailyStats.totals.doctors,
    dailyStats.totals.patients,
    dailyStats.totals.revenue,
  ]);

  return (
    <div className="layout-container">
      <Sidebar role="manager" />
      <div className="main-content">
        <Header title="Manager Dashboard" userRole={displayName} />
        <div className="container">
          {currentSection === 'overview' && (
            <>
              {statsError && <div className="manager-stats-state manager-stats-error">{statsError}</div>}
              {statsLoading && <div className="manager-stats-state">Loading chart data...</div>}
              {!statsLoading && !statsError && (
                <>
                  <div className="manager-chart-grid fade-in-up">
                    {chartMetrics.map((metric) => {
                      const maxMetricValue = Math.max(...metric.values.map((item) => item.value), 1);

                      return (
                        <div className="manager-chart-card" key={metric.label}>
                          <div className="manager-chart-header">
                            <h3>{metric.label}</h3>
                          </div>
                          <div className={`manager-metric-bars ${metric.colorClass}`}>
                            {metric.values.map((item, index) => (
                              <div className="manager-metric-bar-column" key={`${metric.label}-${index}-${item.day}`}>
                                <span className="manager-metric-bar-value">
                                  {metric.isCurrency ? `$${item.value.toFixed(0)}` : item.value}
                                </span>
                                <div
                                  className="manager-metric-bar-fill"
                                  style={{ height: `${Math.max((item.value / maxMetricValue) * 100, 10)}%` }}
                                />
                                <span className="manager-metric-bar-month">{item.day}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                    {!chartMetrics[0].values.length && (
                      <div className="manager-stats-state">No daily data available yet.</div>
                    )}
                  </div>

                  <ManagerDoctorReviews />
                </>
              )}
            </>
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
