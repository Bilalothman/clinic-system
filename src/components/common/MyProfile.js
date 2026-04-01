import React, { useEffect, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import {
  getDoctorFeesFromStorage,
  subscribeToDoctorFees,
  updateDoctorFee,
} from '../../utils/doctorFeesStore';
import {
  getDoctorAvailabilityFromStorage,
  subscribeToDoctorAvailability,
  updateDoctorAvailability,
} from '../../utils/doctorAvailabilityStore';
import './MyProfile.css';

const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const timeSlots = ['09:00 AM', '10:30 AM', '01:00 PM', '03:00 PM', '04:30 PM'];

const formatValue = (value) => {
  if (value === null || value === undefined || value === '') {
    return '-';
  }

  return value;
};

const MyProfile = ({ title = 'My Profile' }) => {
  const { user } = useAuth();
  const profile = user?.profile || {};
  const [doctorFees, setDoctorFees] = useState(() => getDoctorFeesFromStorage());
  const [doctorAvailability, setDoctorAvailability] = useState(() => getDoctorAvailabilityFromStorage());
  const [feeInput, setFeeInput] = useState('');
  const [feeFeedback, setFeeFeedback] = useState('');
  const [availabilityFeedback, setAvailabilityFeedback] = useState('');
  const [selectedDays, setSelectedDays] = useState([]);
  const [selectedTimes, setSelectedTimes] = useState([]);
  const doctorName = profile.name || 'Dr. John Smith';
  const currentDoctorFee = doctorFees[doctorName] || 0;
  const currentDoctorAvailability = doctorAvailability[doctorName] || { days: [], times: [] };

  useEffect(() => {
    const unsubscribe = subscribeToDoctorFees(setDoctorFees);
    return unsubscribe;
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToDoctorAvailability(setDoctorAvailability);
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (user?.role === 'doctor') {
      setFeeInput(String(currentDoctorFee));
    }
  }, [user?.role, currentDoctorFee]);

  useEffect(() => {
    if (user?.role === 'doctor') {
      setSelectedDays(currentDoctorAvailability.days || []);
      setSelectedTimes(currentDoctorAvailability.times || []);
    }
  }, [user?.role, currentDoctorAvailability.days, currentDoctorAvailability.times]);

  const handleDoctorFeeSave = () => {
    const parsedFee = Number(feeInput);

    if (!Number.isFinite(parsedFee) || parsedFee <= 0) {
      setFeeFeedback('Please enter a valid fee greater than 0.');
      return;
    }

    const result = updateDoctorFee(doctorName, Math.round(parsedFee));

    if (!result.ok) {
      setFeeFeedback(result.message || 'Could not update fee.');
      return;
    }

    setFeeFeedback('Consultation fee updated successfully.');
  };

  const toggleAvailabilityValue = (currentValues, value, setter) => {
    if (currentValues.includes(value)) {
      setter(currentValues.filter((item) => item !== value));
      return;
    }

    setter([...currentValues, value]);
  };

  const handleSaveAvailability = () => {
    if (!selectedDays.length) {
      setAvailabilityFeedback('Please select at least one clinic day.');
      return;
    }

    if (!selectedTimes.length) {
      setAvailabilityFeedback('Please select at least one clinic time slot.');
      return;
    }

    const result = updateDoctorAvailability(doctorName, selectedDays, selectedTimes);

    if (!result.ok) {
      setAvailabilityFeedback(result.message || 'Could not update availability.');
      return;
    }

    setAvailabilityFeedback('Clinic availability updated successfully.');
  };

  return (
    <div className="card fade-in-up">
      <div className="card-header">
        <h3>{title}</h3>
      </div>

      <div className="profile-grid">
        <div className="profile-item">
          <span className="profile-label">Full Name</span>
          <span className="profile-value">{formatValue(profile.name)}</span>
        </div>
        <div className="profile-item">
          <span className="profile-label">Email</span>
          <span className="profile-value">{formatValue(profile.email)}</span>
        </div>
        <div className="profile-item">
          <span className="profile-label">Role</span>
          <span className="profile-value profile-role">{formatValue(user?.role)}</span>
        </div>
        <div className="profile-item">
          <span className="profile-label">Account ID</span>
          <span className="profile-value">{formatValue(user?.userId)}</span>
        </div>
        <div className="profile-item">
          <span className="profile-label">Phone</span>
          <span className="profile-value">{formatValue(profile.phone)}</span>
        </div>
        <div className="profile-item">
          <span className="profile-label">Gender</span>
          <span className="profile-value">{formatValue(profile.gender)}</span>
        </div>
        <div className="profile-item">
          <span className="profile-label">Date Of Birth</span>
          <span className="profile-value">{formatValue(profile.dob)}</span>
        </div>
        <div className="profile-item profile-item-wide">
          <span className="profile-label">Address</span>
          <span className="profile-value">{formatValue(profile.address)}</span>
        </div>
        <div className="profile-item">
          <span className="profile-label">Login Date</span>
          <span className="profile-value">{formatValue(user?.loginDate)}</span>
        </div>
      </div>

      {user?.role === 'doctor' && (
        <div className="doctor-settings-panel">
          <div className="doctor-fee-panel">
            <h4>Consultation Fee</h4>
            <div className="doctor-fee-row">
              <input
                type="number"
                min="1"
                value={feeInput}
                onChange={(e) => setFeeInput(e.target.value)}
                aria-label="Doctor consultation fee"
              />
              <button type="button" className="btn-primary" onClick={handleDoctorFeeSave}>
                Save Fee
              </button>
            </div>
            <div className="doctor-fee-current">Current fee for {doctorName}: ${currentDoctorFee}</div>
            {feeFeedback && <div className="doctor-fee-feedback">{feeFeedback}</div>}
          </div>

          <div className="doctor-availability-panel">
            <h4>Clinic Availability</h4>

            <div className="availability-group">
              <div className="availability-title">Available Days</div>
              <div className="availability-options">
                {weekdays.map((day) => (
                  <label key={day} className="availability-option">
                    <input
                      type="checkbox"
                      checked={selectedDays.includes(day)}
                      onChange={() => toggleAvailabilityValue(selectedDays, day, setSelectedDays)}
                    />
                    <span>{day}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="availability-group">
              <div className="availability-title">Available Time Slots</div>
              <div className="availability-options">
                {timeSlots.map((time) => (
                  <label key={time} className="availability-option">
                    <input
                      type="checkbox"
                      checked={selectedTimes.includes(time)}
                      onChange={() => toggleAvailabilityValue(selectedTimes, time, setSelectedTimes)}
                    />
                    <span>{time}</span>
                  </label>
                ))}
              </div>
            </div>

            <button type="button" className="btn-primary" onClick={handleSaveAvailability}>
              Save Availability
            </button>
            {availabilityFeedback && <div className="doctor-fee-feedback">{availabilityFeedback}</div>}
          </div>
        </div>
      )}
    </div>
  );
};

export default MyProfile;
