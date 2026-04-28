import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import './Sidebar.css';

const Sidebar = ({ role }) => {
  const location = useLocation();

  const managerLinks = [
    { path: '/manager', icon: 'HM', label: 'Home', exact: true },
    { path: '/manager/doctors', icon: 'DR', label: 'Doctors' },
    { path: '/manager/patients', icon: 'PT', label: 'Patients' },
    { path: '/manager/appointments', icon: 'AP', label: 'Appointments' },
    { path: '/manager/complaints', icon: 'MS', label: 'Complaints' },
    { path: '/manager/profile', icon: 'ME', label: 'Profile' },
  ];

  const doctorLinks = [
    { path: '/doctor', icon: 'HM', label: 'Home', exact: true },
    { path: '/doctor/appointments', icon: 'AP', label: 'Appointments' },
    { path: '/doctor/patients', icon: 'PT', label: 'Patients' },
    { path: '/doctor/records', icon: 'MR', label: 'Records' },
    { path: '/doctor/profile', icon: 'ME', label: 'Profile' },
  ];

  const patientLinks = [
    { path: '/patient/appointments', icon: 'AP', label: 'My Appointments' },
    { path: '/patient/records', icon: 'MR', label: 'My Records' },
    { path: '/patient/profile', icon: 'ME', label: 'My Profile' },
  ];

  const links = {
    manager: managerLinks,
    doctor: doctorLinks,
    patient: patientLinks,
  }[role];

  const isActiveLink = (link) => {
    if (link.exact) {
      return location.pathname === link.path;
    }

    return location.pathname.startsWith(link.path);
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-content">
        <div className="sidebar-logo">
          <h2>HMS</h2>
        </div>
        <nav className="sidebar-nav">
          {links.map((link, index) => (
            <Link
              key={index}
              to={link.path}
              className={`nav-link ${isActiveLink(link) ? 'active' : ''}`}
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
