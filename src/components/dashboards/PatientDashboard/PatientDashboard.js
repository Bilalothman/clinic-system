import React, { useEffect, useState } from 'react';
import { NavLink, Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import { useApi } from '../../../hooks/useApi';
import Header from '../../common/Header';
import MyProfile from '../../common/MyProfile';
import MyAppointments from './MyAppointments';
import MyRecords from './MyRecords';
import './PatientDashboard.css';

const PatientOverview = () => {
  const { apiCall } = useApi();
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadDoctors = async () => {
      setLoading(true);
      setError('');
      try {
        const rows = await apiCall('/doctors');
        setDoctors(Array.isArray(rows) ? rows : []);
      } catch (loadError) {
        setError(loadError.message || 'Could not load doctors list.');
      } finally {
        setLoading(false);
      }
    };

    loadDoctors();
  }, [apiCall]);

  return (
    <div className="patient-overview">
      <div className="patient-overview-hero">
        <h2>All Doctors</h2>
        <p>Browse every available doctor in the clinic.</p>
      </div>

      {loading && <div className="patient-doctor-state">Loading doctors...</div>}
      {!loading && error && <div className="patient-doctor-state patient-doctor-error">{error}</div>}
      {!loading && !error && !doctors.length && <div className="patient-doctor-state">No doctors found.</div>}

      {!loading && !error && doctors.length > 0 && (
        <div className="patient-doctor-grid">
          {doctors.map((doctor) => (
            <div className="patient-doctor-card" key={doctor.id}>
              <h3>{doctor.name}</h3>
              <p className="patient-doctor-specialty">{doctor.specialty || '-'}</p>
              <div className="patient-doctor-line"><strong>Fee:</strong> ${Number(doctor.fee || 0)}</div>
              <div className="patient-doctor-line"><strong>Phone:</strong> {doctor.phone || '-'}</div>
              <div className="patient-doctor-line"><strong>Status:</strong> {doctor.status || '-'}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const PatientDashboard = () => {
  const { user } = useAuth();
  const displayName = user?.profile?.name || 'Patient';

  return (
    <div className="layout-container">
      <aside className="patient-side-nav">
        <div className="patient-side-brand">Patient</div>
        <nav className="patient-side-links">
          <NavLink
            to="/patient/appointments"
            className={({ isActive }) => `patient-side-link ${isActive ? 'active' : ''}`}
          >
            Appointments
          </NavLink>
          <NavLink to="/patient/records" className={({ isActive }) => `patient-side-link ${isActive ? 'active' : ''}`}>
            Medical Records
          </NavLink>
          <NavLink to="/patient/profile" className={({ isActive }) => `patient-side-link ${isActive ? 'active' : ''}`}>
            Profile
          </NavLink>
        </nav>
      </aside>

      <div className="main-content">
        <Header title="Patient Dashboard" userRole={displayName} />
        <div className="container">
          <Routes>
            <Route index element={<PatientOverview />} />
            <Route path="appointments" element={<MyAppointments />} />
            <Route path="records" element={<MyRecords />} />
            <Route path="profile" element={<MyProfile title="Patient Profile" />} />
            <Route path="*" element={<Navigate to="/patient" replace />} />
          </Routes>
        </div>
      </div>
    </div>
  );
};

export default PatientDashboard;
