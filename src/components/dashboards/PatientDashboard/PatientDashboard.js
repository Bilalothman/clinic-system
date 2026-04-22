import React, { useCallback, useEffect, useState } from 'react';
import { NavLink, Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import { useApi } from '../../../hooks/useApi';
import Header from '../../common/Header';
import MyProfile from '../../common/MyProfile';
import MyAppointments from './MyAppointments';
import MyRecords from './MyRecords';
import './PatientDashboard.css';

const PatientOverview = () => {
  const { user } = useAuth();
  const { apiCall } = useApi();
  const [doctors, setDoctors] = useState([]);
  const [reviewsByDoctor, setReviewsByDoctor] = useState({});
  const [expandedCommentsByDoctor, setExpandedCommentsByDoctor] = useState({});
  const [reviewFormByDoctor, setReviewFormByDoctor] = useState({});
  const [submittingDoctorId, setSubmittingDoctorId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const getInitials = (name) => String(name || 'D')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('') || 'D';

  const groupReviewsByDoctor = useCallback((rows) => {
    const grouped = {};
    (rows || []).forEach((review) => {
      const id = Number(review.doctorId);
      if (!grouped[id]) {
        grouped[id] = [];
      }
      grouped[id].push(review);
    });
    return grouped;
  }, []);

  const buildInitialForms = useCallback((doctorsList, reviewsMap) => {
    const forms = {};
    doctorsList.forEach((doctor) => {
      const myExisting = (reviewsMap[Number(doctor.id)] || []).find(
        (review) => String(review.patientId) === String(user?.userId || '')
      );
      forms[Number(doctor.id)] = {
        rating: String(myExisting?.rating || 5),
        comment: myExisting?.comment || '',
      };
    });
    return forms;
  }, [user?.userId]);

  useEffect(() => {
    const loadDoctorsAndReviews = async () => {
      setLoading(true);
      setError('');
      try {
        const [doctorRows, reviewRows] = await Promise.all([
          apiCall('/doctors'),
          apiCall('/doctor-reviews'),
        ]);

        const safeDoctors = Array.isArray(doctorRows) ? doctorRows : [];
        const groupedReviews = groupReviewsByDoctor(Array.isArray(reviewRows) ? reviewRows : []);
        setDoctors(safeDoctors);
        setReviewsByDoctor(groupedReviews);
        setReviewFormByDoctor(buildInitialForms(safeDoctors, groupedReviews));
      } catch (loadError) {
        setError(loadError.message || 'Could not load doctors list.');
      } finally {
        setLoading(false);
      }
    };

    loadDoctorsAndReviews();
  }, [apiCall, buildInitialForms, groupReviewsByDoctor, user?.userId]);

  const handleReviewFieldChange = (doctorId, field, value) => {
    setReviewFormByDoctor((current) => ({
      ...current,
      [doctorId]: {
        ...(current[doctorId] || { rating: '5', comment: '' }),
        [field]: value,
      },
    }));
  };

  const toggleCommentsForDoctor = (doctorId) => {
    setExpandedCommentsByDoctor((current) => ({
      ...current,
      [doctorId]: !current[doctorId],
    }));
  };

  const handleSubmitReview = async (doctorId) => {
    const doctorForm = reviewFormByDoctor[doctorId] || { rating: '5', comment: '' };
    const rating = Number(doctorForm.rating);
    const comment = String(doctorForm.comment || '').trim();

    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
      setError('Rating must be between 1 and 5.');
      return;
    }

    if (!comment) {
      setError('Comment is required to submit a review.');
      return;
    }

    setSubmittingDoctorId(doctorId);
    setError('');
    try {
      await apiCall(`/doctors/${doctorId}/reviews`, {
        method: 'POST',
        body: JSON.stringify({ rating, comment }),
      });

      const [doctorRows, reviewRows] = await Promise.all([
        apiCall('/doctors'),
        apiCall('/doctor-reviews'),
      ]);
      const safeDoctors = Array.isArray(doctorRows) ? doctorRows : [];
      const groupedReviews = groupReviewsByDoctor(Array.isArray(reviewRows) ? reviewRows : []);
      setDoctors(safeDoctors);
      setReviewsByDoctor(groupedReviews);
      setReviewFormByDoctor(buildInitialForms(safeDoctors, groupedReviews));
    } catch (submitError) {
      setError(submitError.message || 'Could not submit review.');
    } finally {
      setSubmittingDoctorId(null);
    }
  };

  return (
    <div className="patient-overview">
      <div className="patient-overview-hero">
        <h2>All Doctors</h2>
        <p>Browse every available doctor in the clinic.</p>
      </div>

      {loading && <div className="patient-doctor-state">Loading doctors...</div>}
      {!loading && error && <div className="patient-doctor-state patient-doctor-error">{error}</div>}
      {!loading && !error && !doctors.length && <div className="patient-doctor-state">No doctors found.</div>}

      {!loading && !error && doctors.length > 0 && (
        <div className="patient-doctor-grid">
          {doctors.map((doctor) => (
            <div className="patient-doctor-card" key={doctor.id}>
              <div className="patient-doctor-photo-row">
                {doctor.profileImage ? (
                  <img src={doctor.profileImage} alt={`${doctor.name} profile`} className="patient-doctor-photo" />
                ) : (
                  <div className="patient-doctor-photo-fallback">{getInitials(doctor.name)}</div>
                )}
              </div>
              <h3>{doctor.name}</h3>
              <p className="patient-doctor-specialty">{doctor.specialty || '-'}</p>
              <div className="patient-doctor-line">
                <strong>Rating:</strong> {Number(doctor.avgRating || 0).toFixed(1)} / 5
                {' '}({Number(doctor.reviewsCount || 0)} reviews)
              </div>
              <div className="patient-doctor-line"><strong>Fee:</strong> ${Number(doctor.fee || 0)}</div>
              <div className="patient-doctor-line"><strong>Phone:</strong> {doctor.phone || '-'}</div>
              <div className="patient-doctor-line"><strong>Status:</strong> {doctor.status || '-'}</div>

              <button
                type="button"
                className="patient-view-comments-btn"
                onClick={() => toggleCommentsForDoctor(Number(doctor.id))}
              >
                {expandedCommentsByDoctor[Number(doctor.id)] ? 'Hide Comments' : 'View Comments'}
                {' '}
                ({(reviewsByDoctor[Number(doctor.id)] || []).length})
              </button>

              {expandedCommentsByDoctor[Number(doctor.id)] && (
                <div className="patient-doctor-reviews">
                  <h4>Public Reviews</h4>
                  {(reviewsByDoctor[Number(doctor.id)] || []).length ? (
                    (reviewsByDoctor[Number(doctor.id)] || []).map((review) => (
                      <div className="patient-review-item" key={review.id}>
                        <div className="patient-review-head">
                          <strong>{review.patientName}</strong>
                          <span>{review.rating}/5</span>
                        </div>
                        <p>{review.comment}</p>
                      </div>
                    ))
                  ) : (
                    <div className="patient-review-empty">No reviews yet.</div>
                  )}
                </div>
              )}

              {user?.role === 'patient' && (
                <div className="patient-review-form">
                  <h4>Add / Update Your Review</h4>
                  <label htmlFor={`rating-${doctor.id}`}>Rating</label>
                  <select
                    id={`rating-${doctor.id}`}
                    value={(reviewFormByDoctor[Number(doctor.id)] || { rating: '5' }).rating}
                    onChange={(event) => handleReviewFieldChange(Number(doctor.id), 'rating', event.target.value)}
                  >
                    <option value="5">5 - Excellent</option>
                    <option value="4">4 - Very Good</option>
                    <option value="3">3 - Good</option>
                    <option value="2">2 - Fair</option>
                    <option value="1">1 - Poor</option>
                  </select>

                  <label htmlFor={`comment-${doctor.id}`}>Comment</label>
                  <textarea
                    id={`comment-${doctor.id}`}
                    rows="3"
                    value={(reviewFormByDoctor[Number(doctor.id)] || { comment: '' }).comment}
                    onChange={(event) => handleReviewFieldChange(Number(doctor.id), 'comment', event.target.value)}
                    placeholder="Share your experience with this doctor"
                  />

                  <button
                    type="button"
                    className="btn-primary"
                    disabled={submittingDoctorId === Number(doctor.id)}
                    onClick={() => handleSubmitReview(Number(doctor.id))}
                  >
                    {submittingDoctorId === Number(doctor.id) ? 'Saving...' : 'Submit Review'}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const PatientDashboard = () => {
  const { user } = useAuth();
  const displayName = user?.profile?.name || 'Patient';

  return (
    <div className="layout-container">
      <aside className="patient-side-nav">
        <div className="patient-side-brand">Patient</div>
        <nav className="patient-side-links">
          <NavLink
            to="/patient/appointments"
            className={({ isActive }) => `patient-side-link ${isActive ? 'active' : ''}`}
          >
            Appointments
          </NavLink>
          <NavLink to="/patient/records" className={({ isActive }) => `patient-side-link ${isActive ? 'active' : ''}`}>
            Medical Records
          </NavLink>
          <NavLink to="/patient/profile" className={({ isActive }) => `patient-side-link ${isActive ? 'active' : ''}`}>
            Profile
          </NavLink>
        </nav>
      </aside>

      <div className="main-content">
        <Header title="Patient Dashboard" userRole={displayName} />
        <div className="container">
          <Routes>
            <Route index element={<PatientOverview />} />
            <Route path="appointments" element={<MyAppointments />} />
            <Route path="records" element={<MyRecords />} />
            <Route path="profile" element={<MyProfile title="Patient Profile" />} />
            <Route path="*" element={<Navigate to="/patient" replace />} />
          </Routes>
        </div>
      </div>
    </div>
  );
};

export default PatientDashboard;
