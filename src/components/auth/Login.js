import React, { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useApi } from '../../hooks/useApi';
import LoadingSpinner from '../common/LoadingSpinner';
import GoogleSignInButton from './GoogleSignInButton';
import '../auth/Login.css';

const Login = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login } = useAuth();
  const { apiCall } = useApi();

  const redirectByRole = useCallback((role) => {
    if (role === 'manager') {
      navigate('/manager');
      return;
    }

    if (role === 'doctor') {
      navigate('/doctor');
      return;
    }

    navigate('/patient');
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await apiCall('/auth/login', {
        method: 'POST',
        body: JSON.stringify(formData),
      });

      login(result.role, result.userId, result.token, result.profile || {});
      redirectByRole(result.role);
    } catch (apiError) {
      setError(apiError.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleCredential = useCallback(async (credential) => {
    setLoading(true);
    setError('');

    try {
      const result = await apiCall('/auth/google', {
        method: 'POST',
        body: JSON.stringify({ credential }),
      });

      login(result.role, result.userId, result.token, result.profile || {});
      redirectByRole(result.role);
    } catch (apiError) {
      setError(apiError.message);
    } finally {
      setLoading(false);
    }
  }, [apiCall, login, redirectByRole]);

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1>Welcome Back</h1>
          <p>Sign in to your Clinic Management account</p>
        </div>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form" autoComplete="off">
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              autoComplete="off"
              required
              placeholder="Enter your email"
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              autoComplete="new-password"
              required
              placeholder="Enter your password"
            />
          </div>
          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? <LoadingSpinner /> : 'Sign In'}
          </button>
        </form>

        <div className="auth-divider"><span>or</span></div>
        <GoogleSignInButton onCredential={handleGoogleCredential} disabled={loading} />

        <div className="auth-footer">
          <p>Do not have an account? <a href="/register">Register as Patient</a></p>
        </div>
      </div>
    </div>
  );
};

export default Login;
