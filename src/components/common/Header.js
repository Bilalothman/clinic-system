import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import './Header.css';

const Header = ({ title, userRole }) => {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="header">
      <div className="header-content">
        <h1 className="header-title">{title}</h1>
        <div className="header-user">
          <span className="user-role">{userRole}</span>
          <button type="button" className="logout-btn" onClick={handleLogout}>
            Sign Out
          </button>
          <div className="user-avatar">User</div>
        </div>
      </div>
    </header>
  );
};

export default Header;
