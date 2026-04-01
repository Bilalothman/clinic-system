import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import LoadingSpinner from '../common/LoadingSpinner';
import '../auth/Login.css';
import '../auth/Register.css';

const Register = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    address: '',
    dob: '',
    gender: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Simulate registration API call
    setTimeout(() => {
      setLoading(false);
      // Auto-login as patient after registration
      login('patient', Math.floor(Math.random() * 1000) + 200);
      navigate('/patient');
    }, 2000);
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1>👥 Patient Registration</h1>
          <p>Create your patient account</p>
        </div>
        
        {error && <div className="error-message">{error}</div>}
        
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-row">
            <div className="form-group">
              <label>👤 Full Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                required
                placeholder="John Doe"
              />
            </div>
            <div className="form-group">
              <label>📧 Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                required
                placeholder="john@example.com"
              />
            </div>
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label>📱 Phone</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                required
                placeholder="+1-234-567-8900"
              />
            </div>
            <div className="form-group">
              <label>🎂 Date of Birth</label>
              <input
                type="date"
                value={formData.dob}
                onChange={(e) => setFormData({...formData, dob: e.target.value})}
                required
              />
            </div>
          </div>
          
          <div className="form-group">
            <label>🏠 Address</label>
            <textarea
              value={formData.address}
              onChange={(e) => setFormData({...formData, address: e.target.value})}
              rows="3"
              placeholder="123 Main St, City, State 12345"
              required
            />
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label>⚤ Gender</label>
              <select
                value={formData.gender}
                onChange={(e) => setFormData({...formData, gender: e.target.value})}
                required
              >
                <option value="">Select Gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="form-group">
              <label>🔒 Password</label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                required
                placeholder="Create a strong password"
              />
            </div>
          </div>
          
          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? <LoadingSpinner /> : '✅ Create Patient Account'}
          </button>
        </form>
        
        <div className="auth-footer">
          <p>👑 Already have account? <a href="/login">Sign In</a></p>
        </div>
      </div>
    </div>
  );
};

export default Register;
