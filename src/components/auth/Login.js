import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useApi } from '../../hooks/useApi';
import LoadingSpinner from '../common/LoadingSpinner';
import '../auth/Login.css';

const Login = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login } = useAuth();
  const { apiCall } = useApi();

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

      if (result.role === 'manager') {
        navigate('/manager');
        return;
      }

      if (result.role === 'doctor') {
        navigate('/doctor');
        return;
      }

      navigate('/patient');
    } catch (apiError) {
      setError(`${apiError.message}\n\nDemo accounts:\n- manager@gmail.com / 1234\n- doctor@doctor.com / doctor123\n- patient@patient.com / patient123`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1>Welcome Back</h1>
          <p>Sign in to your Clinic Management account</p>
        </div>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              placeholder="manager@gmail.com"
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
              placeholder="Enter your password"
            />
          </div>
          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? <LoadingSpinner /> : 'Sign In'}
          </button>
        </form>

        <div className="auth-footer">
          <p>Do not have an account? <a href="/register">Register as Patient</a></p>
          <div className="demo-info glass">
            <strong>Quick Demo Access:</strong><br />
            <code>manager@gmail.com</code> / <code>1234</code><br />
            <code>doctor@doctor.com</code> / <code>doctor123</code><br />
            <code>patient@patient.com</code> / <code>patient123</code>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
