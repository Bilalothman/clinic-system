import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import './Sidebar.css';

const Sidebar = ({ role }) => {
  const location = useLocation();

  const managerLinks = [
    { path: '/manager/doctors', icon: '👨‍⚕️', label: 'Doctors' },
    { path: '/manager/patients', icon: '👥', label: 'Patients' },
  ];

  const doctorLinks = [
    { path: '/doctor/appointments', icon: '📅', label: 'Appointments' },
    { path: '/doctor/patients', icon: '👤', label: 'Patients' },
    { path: '/doctor/records', icon: '📋', label: 'Records' },
  ];

  const patientLinks = [
    { path: '/patient/appointments', icon: '📅', label: 'My Appointments' },
    { path: '/patient/records', icon: '📋', label: 'My Records' },
  ];

  const links = {
    manager: managerLinks,
    doctor: doctorLinks,
    patient: patientLinks,
  }[role];

  return (
    <aside className="sidebar">
      <div className="sidebar-content">
        <div className="sidebar-logo">
          <h2>🏥 HMS</h2>
        </div>
        <nav className="sidebar-nav">
          {links.map((link, index) => (
            <Link
              key={index}
              to={link.path}
              className={`nav-link ${location.pathname.startsWith(link.path) ? 'active' : ''}`}
            >
              <span className="nav-icon">{link.icon}</span>
              <span className="nav-label">{link.label}</span>
            </Link>
          ))}
        </nav>
      </div>
    </aside>
  );
};

export default Sidebar;
