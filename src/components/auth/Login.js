import React, { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useApi } from '../../hooks/useApi';
import LoadingSpinner from '../common/LoadingSpinner';
import GoogleSignInButton from './GoogleSignInButton';
import '../auth/Login.css';

const Login = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [resetMode, setResetMode] = useState('login');
  const [resetForm, setResetForm] = useState({ email: '', code: '', newPassword: '', confirmPassword: '' });
  const [resetSession, setResetSession] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
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
    setSuccess('');

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

  const startForgotPassword = () => {
    setResetMode('email');
    setResetForm({
      email: formData.email,
      code: '',
      newPassword: '',
      confirmPassword: '',
    });
    setResetSession(null);
    setError('');
    setSuccess('');
  };

  const backToLogin = () => {
    setResetMode('login');
    setResetSession(null);
    setResetForm({ email: '', code: '', newPassword: '', confirmPassword: '' });
    setError('');
    setSuccess('');
  };

  const handleForgotPassword = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const result = await apiCall('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email: resetForm.email }),
      });

      setResetSession({
        token: result.resetToken,
        email: result.email || resetForm.email,
      });
      setResetMode('code');
      setSuccess(result.message || 'Verification code sent to your email.');
      setResetForm((current) => ({ ...current, code: '', newPassword: '', confirmPassword: '' }));
    } catch (apiError) {
      setError(apiError.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    if (!resetSession?.token) {
      setLoading(false);
      setError('Please request a verification code first.');
      return;
    }

    if (resetForm.newPassword !== resetForm.confirmPassword) {
      setLoading(false);
      setError('New password and confirmation do not match.');
      return;
    }

    try {
      const result = await apiCall('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          resetToken: resetSession.token,
          code: resetForm.code,
          newPassword: resetForm.newPassword,
        }),
      });

      setFormData((current) => ({ ...current, email: resetSession.email, password: '' }));
      setResetMode('login');
      setResetSession(null);
      setResetForm({ email: '', code: '', newPassword: '', confirmPassword: '' });
      setSuccess(result.message || 'Password changed successfully. You can sign in now.');
    } catch (apiError) {
      setError(apiError.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleCredential = useCallback(async (credential) => {
    setLoading(true);
    setError('');
    setSuccess('');

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
          <h1>{resetMode === 'login' ? 'Welcome Back' : 'Reset Password'}</h1>
          <p>
            {resetMode === 'login'
              ? 'Sign in to your Clinic Management account'
              : 'Verify your email before changing your password'}
          </p>
        </div>

        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        {resetMode === 'login' && (
          <>
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
              <button type="button" className="forgot-password-link" onClick={startForgotPassword}>
                Forgot password?
              </button>
              <button type="submit" className="auth-btn" disabled={loading}>
                {loading ? <LoadingSpinner /> : 'Sign In'}
              </button>
            </form>

            <div className="auth-divider"><span>or</span></div>
            <GoogleSignInButton onCredential={handleGoogleCredential} disabled={loading} />

            <div className="auth-footer">
              <p>Do not have an account? <a href="/register">Register as Patient</a></p>
            </div>
          </>
        )}

        {resetMode === 'email' && (
          <form onSubmit={handleForgotPassword} className="auth-form" autoComplete="off">
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                value={resetForm.email}
                onChange={(e) => setResetForm({ ...resetForm, email: e.target.value })}
                autoComplete="off"
                required
                placeholder="Enter your account email"
              />
            </div>
            <button type="submit" className="auth-btn" disabled={loading}>
              {loading ? <LoadingSpinner /> : 'Send Verification Code'}
            </button>
            <button type="button" className="auth-secondary-btn" onClick={backToLogin} disabled={loading}>
              Back To Login
            </button>
          </form>
        )}

        {resetMode === 'code' && (
          <form onSubmit={handleResetPassword} className="auth-form" autoComplete="off">
            <div className="form-group">
              <label>Verification Code</label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength="6"
                value={resetForm.code}
                onChange={(e) => setResetForm({ ...resetForm, code: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                required
                placeholder="123456"
              />
            </div>
            <div className="form-group">
              <label>New Password</label>
              <input
                type="password"
                value={resetForm.newPassword}
                onChange={(e) => setResetForm({ ...resetForm, newPassword: e.target.value })}
                autoComplete="new-password"
                required
                minLength="6"
                placeholder="Enter new password"
              />
            </div>
            <div className="form-group">
              <label>Confirm Password</label>
              <input
                type="password"
                value={resetForm.confirmPassword}
                onChange={(e) => setResetForm({ ...resetForm, confirmPassword: e.target.value })}
                autoComplete="new-password"
                required
                minLength="6"
                placeholder="Confirm new password"
              />
            </div>
            <button type="submit" className="auth-btn" disabled={loading || resetForm.code.length !== 6}>
              {loading ? <LoadingSpinner /> : 'Change Password'}
            </button>
            <button type="button" className="auth-secondary-btn" onClick={handleForgotPassword} disabled={loading}>
              Send Code Again
            </button>
            <button type="button" className="auth-secondary-btn" onClick={backToLogin} disabled={loading}>
              Back To Login
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default Login;
