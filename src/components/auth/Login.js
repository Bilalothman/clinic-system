import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import LoadingSpinner from '../common/LoadingSpinner';
import '../auth/Login.css';

const Login = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Simulate API call delay
    setTimeout(() => {
      setLoading(false);
      
      // MANAGER LOGIN (Unique as requested)
      if (formData.email === 'manager@gmail.com' && formData.password === '1234') {
        login('manager', '1', 'manager-token', {
          name: 'System Administrator',
          email: 'manager@gmail.com',
          phone: '+1-555-100-0001',
          address: 'Head Office',
          dob: '-',
          gender: '-',
        });
        navigate('/manager');
        return;
      }
      
      // DOCTOR LOGIN (Demo)
      if (formData.email.includes('@doctor.com') && formData.password === 'doctor123') {
        login('doctor', '101', 'doctor-token', {
          name: 'Dr. John Smith',
          email: formData.email,
          phone: '+1-555-100-0101',
          address: 'City Hospital',
          dob: '-',
          gender: '-',
        });
        navigate('/doctor');
        return;
      }
      
      // PATIENT DEMO LOGIN (Quick access)
      if (formData.email.includes('@patient.com') && formData.password === 'patient123') {
        login('patient', '201', 'patient-token', {
          name: 'John Doe',
          email: formData.email,
          phone: '+1-555-200-0201',
          address: 'Demo Patient Address',
          dob: '-',
          gender: '-',
        });
        navigate('/patient');
        return;
      }
      
      setError(`❌ Invalid credentials!\n\nDemo Accounts:\n👑 Manager: manager@gmail.com / 1234\n👨‍⚕️ Doctor: doctor@doctor.com / doctor123\n👥 Patient: patient@patient.com / patient123\n\n💡 Or use Register for new Patient account`);
    }, 1500);
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1>🏥 Welcome Back</h1>
          <p>Sign in to your Clinic Management account</p>
        </div>
        
        {error && <div className="error-message">{error}</div>}
        
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label>📧 Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              required
              placeholder="manager@gmail.com"
            />
          </div>
          <div className="form-group">
            <label>🔒 Password</label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              required
              placeholder="Enter your password"
            />
          </div>
          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? <LoadingSpinner /> : '🚀 Sign In'}
          </button>
        </form>
        
        <div className="auth-footer">
          <p>👥 Don't have an account? <a href="/register">Register as Patient</a></p>
          <div className="demo-info glass">
            <strong>🎮 Quick Demo Access:</strong><br />
            👑 <code>manager@gmail.com</code> / <code>1234</code><br />
            👨‍⚕️ <code>doctor@doctor.com</code> / <code>doctor123</code><br />
            👥 <code>patient@patient.com</code> / <code>patient123</code>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
