import React, { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useApi } from '../../hooks/useApi';
import LoadingSpinner from '../common/LoadingSpinner';
import GoogleSignInButton from './GoogleSignInButton';
import '../auth/Login.css';
import '../auth/Register.css';

const isStrongPassword = (value) => (
  /[A-Z]/.test(String(value || '')) &&
  /\d/.test(String(value || '')) &&
  /[^A-Za-z0-9]/.test(String(value || ''))
);

const Register = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    address: '',
    dob: '',
    gender: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [googleVerification, setGoogleVerification] = useState(null);
  const [verificationCode, setVerificationCode] = useState('');
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

    if (!isStrongPassword(formData.password)) {
      setError('Password must include at least one uppercase letter, one number, and one symbol.');
      setLoading(false);
      return;
    }

    try {
      const result = await apiCall('/auth/register', {
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
    setGoogleVerification(null);
    setVerificationCode('');

    try {
      const result = await apiCall('/auth/google', {
        method: 'POST',
        body: JSON.stringify({ credential, mode: 'register' }),
      });

      if (result.requiresVerification) {
        setGoogleVerification({
          token: result.verificationToken,
          email: result.email,
          message: result.message || 'Verification code sent to your Google email.',
        });
        return;
      }

      login(result.role, result.userId, result.token, result.profile || {});
      redirectByRole(result.role);
    } catch (apiError) {
      setError(
        apiError.message.includes('Email verification is not configured')
          ? 'Email verification is not configured yet. Add SMTP settings in .env, restart the app, and try again.'
          : apiError.message
      );
    } finally {
      setLoading(false);
    }
  }, [apiCall, login, redirectByRole]);

  const handleGoogleVerificationSubmit = async (event) => {
    event.preventDefault();

    if (!googleVerification?.token) {
      setError('Please start Google registration again.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await apiCall('/auth/google/verify', {
        method: 'POST',
        body: JSON.stringify({
          verificationToken: googleVerification.token,
          code: verificationCode,
        }),
      });

      login(result.role, result.userId, result.token, result.profile || {});
      redirectByRole(result.role);
    } catch (apiError) {
      setError(apiError.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1>Patient Registration</h1>
          <p>Create your patient account</p>
        </div>

        {error && <div className="error-message">{error}</div>}

        {!googleVerification ? (
          <>
            <form onSubmit={handleSubmit} className="auth-form" autoComplete="off">
              <div className="form-row">
                <div className="form-group">
                  <label>Full Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    autoComplete="off"
                    required
                    placeholder="John Doe"
                  />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    autoComplete="off"
                    required
                    placeholder="john@example.com"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Phone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    autoComplete="off"
                    required
                    placeholder="+1-234-567-8900"
                  />
                </div>
                <div className="form-group">
                  <label>Date of Birth</label>
                  <input
                    type="date"
                    value={formData.dob}
                    onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                    autoComplete="off"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Address</label>
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  rows="3"
                  placeholder="123 Main St, City, State 12345"
                  autoComplete="off"
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Gender</label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    autoComplete="off"
                    required
                  >
                    <option value="">Select Gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Password</label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    autoComplete="new-password"
                    required
                    placeholder="Create a strong password"
                  />
                  <div className="password-hint">
                    Must include: 1 capital letter, 1 number, and 1 symbol.
                  </div>
                </div>
              </div>

              <button type="submit" className="auth-btn" disabled={loading}>
                {loading ? <LoadingSpinner /> : 'Create Patient Account'}
              </button>
            </form>

            <div className="auth-divider"><span>or</span></div>
            <GoogleSignInButton onCredential={handleGoogleCredential} disabled={loading} />
          </>
        ) : (
          <form className="google-verification-panel" onSubmit={handleGoogleVerificationSubmit}>
            <div>
              <h2>Verify your Google email</h2>
              <p>{googleVerification.message} Enter the 6-digit code sent to {googleVerification.email}.</p>
            </div>
            <div className="form-group">
              <label>Verification Code</label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength="6"
                value={verificationCode}
                onChange={(event) => setVerificationCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="123456"
                required
              />
            </div>
            <button type="submit" className="auth-btn" disabled={loading || verificationCode.length !== 6}>
              {loading ? <LoadingSpinner /> : 'Verify And Create Account'}
            </button>
          </form>
        )}

        {!googleVerification && (
          <div className="auth-footer">
            <p>Already have account? <a href="/login">Sign In</a></p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Register;
