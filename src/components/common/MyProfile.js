import React, { useEffect, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useApi } from '../../hooks/useApi';
import { DOCTOR_TIME_SLOTS } from '../../constants/timeSlots';
import './MyProfile.css';

const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const formatValue = (value) => {
  if (value === null || value === undefined || value === '') {
    return '-';
  }

  return value;
};

const MyProfile = ({ title = 'My Profile' }) => {
  const { user, updateProfile } = useAuth();
  const { apiCall } = useApi();
  const profile = user?.profile || {};
  const [doctorFee, setDoctorFee] = useState(0);
  const [feeInput, setFeeInput] = useState('');
  const [feeFeedback, setFeeFeedback] = useState('');
  const [availabilityFeedback, setAvailabilityFeedback] = useState('');
  const [profileFeedback, setProfileFeedback] = useState('');
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: '',
    email: '',
    phone: '',
    gender: '',
    dob: '',
    address: '',
  });
  const [selectedDays, setSelectedDays] = useState([]);
  const [selectedTimes, setSelectedTimes] = useState([]);
  const doctorName = profile.name || 'Doctor';

  useEffect(() => {
    setProfileForm({
      name: profile.name || '',
      email: profile.email || '',
      phone: profile.phone || '',
      gender: profile.gender || '',
      dob: profile.dob || '',
      address: profile.address || '',
    });
  }, [profile.address, profile.dob, profile.email, profile.gender, profile.name, profile.phone]);

  const loadDoctorSettings = async () => {
    if (user?.role !== 'doctor') {
      return;
    }

    try {
      const rows = await apiCall('/doctors');
      const me = (rows || []).find((doctor) => String(doctor.id) === String(user?.userId));

      if (!me) {
        return;
      }

      setDoctorFee(me.fee || 0);
      setFeeInput(String(me.fee || 0));
      setSelectedDays(me.availableDays || []);
      setSelectedTimes(me.availableTimes || []);
    } catch (error) {
      setFeeFeedback(error.message);
    }
  };

  useEffect(() => {
    loadDoctorSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.role, user?.userId]);

  const handleDoctorFeeSave = async () => {
    const parsedFee = Number(feeInput);

    if (!Number.isFinite(parsedFee) || parsedFee <= 0) {
      setFeeFeedback('Please enter a valid fee greater than 0.');
      return;
    }

    try {
      const updated = await apiCall(`/doctors/${user?.userId}/fee`, {
        method: 'PATCH',
        body: JSON.stringify({ fee: Math.round(parsedFee) }),
      });
      setDoctorFee(updated.fee || 0);
      setFeeInput(String(updated.fee || 0));
      setFeeFeedback('Consultation fee updated successfully.');
    } catch (error) {
      setFeeFeedback(error.message || 'Could not update fee.');
    }
  };

  const toggleAvailabilityValue = (currentValues, value, setter) => {
    if (currentValues.includes(value)) {
      setter(currentValues.filter((item) => item !== value));
      return;
    }

    setter([...currentValues, value]);
  };

  const handleSaveAvailability = async () => {
    if (!selectedDays.length) {
      setAvailabilityFeedback('Please select at least one clinic day.');
      return;
    }

    if (!selectedTimes.length) {
      setAvailabilityFeedback('Please select at least one clinic time slot.');
      return;
    }

    try {
      const updated = await apiCall(`/doctors/${user?.userId}/availability`, {
        method: 'PATCH',
        body: JSON.stringify({ days: selectedDays, times: selectedTimes }),
      });

      setSelectedDays(updated.availableDays || []);
      setSelectedTimes(updated.availableTimes || []);
      setAvailabilityFeedback('Clinic availability updated successfully.');
    } catch (error) {
      setAvailabilityFeedback(error.message || 'Could not update availability.');
    }
  };

  const handleProfileFieldChange = (field, value) => {
    setProfileForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleSaveProfile = async () => {
    if (user?.role !== 'doctor' && user?.role !== 'patient') {
      return;
    }

    if (!profileForm.name.trim() || !profileForm.email.trim() || !profileForm.phone.trim()) {
      setProfileFeedback('Name, email, and phone are required.');
      return;
    }

    try {
      const updated = await apiCall('/profile', {
        method: 'PATCH',
        body: JSON.stringify({
          name: profileForm.name.trim(),
          email: profileForm.email.trim(),
          phone: profileForm.phone.trim(),
          gender: profileForm.gender.trim(),
          dob: profileForm.dob || null,
          address: profileForm.address.trim(),
        }),
      });

      const nextProfile = updated?.profile || {};
      updateProfile(nextProfile);
      setProfileFeedback('Profile updated successfully.');
      setIsEditingProfile(false);
    } catch (error) {
      setProfileFeedback(error.message || 'Could not update profile.');
    }
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

      {(user?.role === 'doctor' || user?.role === 'patient') && (
        <div className="doctor-settings-panel">
          <div className="doctor-profile-edit-panel">
            <h4>Profile Details</h4>

            <div className="doctor-profile-actions">
              {!isEditingProfile ? (
                <button type="button" className="btn-primary" onClick={() => setIsEditingProfile(true)}>
                  Edit Profile
                </button>
              ) : (
                <>
                  <button type="button" className="btn-primary" onClick={handleSaveProfile}>
                    Save Profile
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => {
                      setIsEditingProfile(false);
                      setProfileForm({
                        name: profile.name || '',
                        email: profile.email || '',
                        phone: profile.phone || '',
                        gender: profile.gender || '',
                        dob: profile.dob || '',
                        address: profile.address || '',
                      });
                    }}
                  >
                    Cancel
                  </button>
                </>
              )}
            </div>

            {isEditingProfile && (
              <div className="doctor-profile-form-grid">
                <div className="doctor-profile-field">
                  <label htmlFor="doctor-profile-name">Full Name</label>
                  <input
                    id="doctor-profile-name"
                    value={profileForm.name}
                    onChange={(e) => handleProfileFieldChange('name', e.target.value)}
                    placeholder="Doctor full name"
                  />
                </div>

                <div className="doctor-profile-field">
                  <label htmlFor="doctor-profile-email">Email</label>
                  <input
                    id="doctor-profile-email"
                    type="email"
                    value={profileForm.email}
                    onChange={(e) => handleProfileFieldChange('email', e.target.value)}
                    placeholder="doctor@email.com"
                  />
                </div>

                <div className="doctor-profile-field">
                  <label htmlFor="doctor-profile-phone">Phone</label>
                  <input
                    id="doctor-profile-phone"
                    value={profileForm.phone}
                    onChange={(e) => handleProfileFieldChange('phone', e.target.value)}
                    placeholder="+1 555 000 0000"
                  />
                </div>

                <div className="doctor-profile-field">
                  <label htmlFor="doctor-profile-gender">Gender</label>
                  <input
                    id="doctor-profile-gender"
                    value={profileForm.gender}
                    onChange={(e) => handleProfileFieldChange('gender', e.target.value)}
                    placeholder="Male/Female"
                  />
                </div>

                <div className="doctor-profile-field">
                  <label htmlFor="doctor-profile-dob">Date Of Birth</label>
                  <input
                    id="doctor-profile-dob"
                    type="date"
                    value={profileForm.dob || ''}
                    onChange={(e) => handleProfileFieldChange('dob', e.target.value)}
                  />
                </div>

                <div className="doctor-profile-field doctor-profile-field-wide">
                  <label htmlFor="doctor-profile-address">Address</label>
                  <input
                    id="doctor-profile-address"
                    value={profileForm.address}
                    onChange={(e) => handleProfileFieldChange('address', e.target.value)}
                    placeholder="Clinic or home address"
                  />
                </div>
              </div>
            )}

            {profileFeedback && <div className="doctor-fee-feedback">{profileFeedback}</div>}
          </div>

          {user?.role === 'doctor' && (
            <>
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
                <div className="doctor-fee-current">Current fee for {doctorName}: ${doctorFee}</div>
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
                    {DOCTOR_TIME_SLOTS.map((time) => (
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
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default MyProfile;
