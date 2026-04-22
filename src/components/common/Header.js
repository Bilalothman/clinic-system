import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import './Header.css';

const Header = ({ title, userRole }) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const avatar = user?.profile?.avatar || '';
  const fallbackInitials = String(user?.profile?.name || userRole || 'User')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('') || 'U';

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
          <div className="user-avatar">
            {avatar ? (
              <img src={avatar} alt="Profile avatar" className="user-avatar-image" />
            ) : (
              <span>{fallbackInitials}</span>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
