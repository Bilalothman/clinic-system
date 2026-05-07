import React, { useCallback, useEffect, useState } from 'react';
import { NavLink, Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import { useApi } from '../../../hooks/useApi';
import Header from '../../common/Header';
import MyProfile from '../../common/MyProfile';
import MyAppointments from './MyAppointments';
import MyRecords from './MyRecords';
import ContactUs from './ContactUs';
import ClinicLocation from './ClinicLocation';
import './PatientDashboard.css';

const StarRating = ({ value, onChange, disabled = false, labelId }) => (
  <div
    className={`patient-star-rating${disabled ? ' is-disabled' : ''}`}
    role={onChange ? 'radiogroup' : 'img'}
    aria-labelledby={labelId}
    aria-label={onChange ? undefined : `${value || 0} out of 5 stars`}
  >
    {[1, 2, 3, 4, 5].map((starValue) => {
      const filled = starValue <= Number(value || 0);

      if (!onChange) {
        return (
          <span
            key={starValue}
            className={`patient-star${filled ? ' is-filled' : ''}`}
            aria-hidden="true"
          >
            {'\u2605'}
          </span>
        );
      }

      return (
        <button
          key={starValue}
          type="button"
          className={`patient-star-button${filled ? ' is-filled' : ''}`}
          onClick={() => onChange(String(starValue))}
          disabled={disabled}
          role="radio"
          aria-checked={starValue === Number(value || 0)}
          aria-label={`${starValue} star${starValue > 1 ? 's' : ''}`}
        >
          {'\u2605'}
        </button>
      );
    })}
  </div>
);

const emptyReviewForm = { rating: '', comment: '' };

// Store each patient's chatbot history separately so accounts do not share messages.
const getSpecialtyChatStorageKey = (userId) => `patientSpecialtyChat:${userId || 'guest'}`;

// If saved chat data is missing or broken, start with an empty conversation.
const readStoredSpecialtyChat = (userId) => {
  try {
    const parsed = JSON.parse(localStorage.getItem(getSpecialtyChatStorageKey(userId)) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
};

const readFileAsDataUrl = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result || ''));
  reader.onerror = () => reject(new Error('Could not read the selected PDF.'));
  reader.readAsDataURL(file);
});

const getDoctorClinicStatus = (doctor) => {
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  const availableDays = Array.isArray(doctor?.availableDays) ? doctor.availableDays : [];
  const availableTimes = Array.isArray(doctor?.availableTimes) ? doctor.availableTimes : [];
  const isInClinicToday = availableDays.includes(today) && availableTimes.length > 0;

  return isInClinicToday ? 'In Clinic Today' : 'Not In Clinic Today';
};

const PatientOverview = () => {
  const { user } = useAuth();
  const { apiCall } = useApi();
  const [doctors, setDoctors] = useState([]);
  const [reviewsByDoctor, setReviewsByDoctor] = useState({});
  const [expandedCommentsByDoctor, setExpandedCommentsByDoctor] = useState({});
  const [reviewFormByDoctor, setReviewFormByDoctor] = useState({});
  const [submittingDoctorId, setSubmittingDoctorId] = useState(null);
  const [deletingReviewId, setDeletingReviewId] = useState(null);
  const [editingReviewId, setEditingReviewId] = useState(null);
  const [editCommentText, setEditCommentText] = useState('');
  const [savingReviewId, setSavingReviewId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [specialtyMessage, setSpecialtyMessage] = useState('');
  const [specialtyPdfFile, setSpecialtyPdfFile] = useState(null);
  const [specialtyMessages, setSpecialtyMessages] = useState(() => readStoredSpecialtyChat(user?.userId));
  const [specialtyLoading, setSpecialtyLoading] = useState(false);
  const [isSpecialtyChatOpen, setIsSpecialtyChatOpen] = useState(false);
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

  const getPatientRatingForDoctor = useCallback((doctorId, groupedReviews) => {
    const patientRating = (groupedReviews[Number(doctorId)] || []).find(
      (review) => String(review.patientId) === String(user?.userId) && review.rating !== null
    );

    return patientRating ? String(patientRating.rating) : '';
  }, [user?.userId]);

  const buildInitialForms = useCallback((doctorsList, groupedReviews) => {
    const forms = {};
    doctorsList.forEach((doctor) => {
      forms[Number(doctor.id)] = {
        ...emptyReviewForm,
        rating: getPatientRatingForDoctor(doctor.id, groupedReviews),
      };
    });
    return forms;
  }, [getPatientRatingForDoctor]);

  const reloadDoctorsAndReviews = useCallback(async () => {
    const [doctorRows, reviewRows] = await Promise.all([
      apiCall('/doctors'),
      apiCall('/doctor-reviews'),
    ]);

    const safeDoctors = Array.isArray(doctorRows) ? doctorRows : [];
    const groupedReviews = groupReviewsByDoctor(Array.isArray(reviewRows) ? reviewRows : []);
    const initialForms = buildInitialForms(safeDoctors, groupedReviews);
    setDoctors(safeDoctors);
    setReviewsByDoctor(groupedReviews);
    setReviewFormByDoctor((current) => ({
      ...initialForms,
      ...Object.fromEntries(
        Object.entries(current).map(([doctorId, form]) => [
          doctorId,
          {
            ...initialForms[doctorId],
            comment: form.comment,
          },
        ])
      ),
    }));
  }, [apiCall, buildInitialForms, groupReviewsByDoctor]);

  useEffect(() => {
    const loadDoctorsAndReviews = async () => {
      setLoading(true);
      setError('');
      try {
        await reloadDoctorsAndReviews();
      } catch (loadError) {
        setError(loadError.message || 'Could not load doctors list.');
      } finally {
        setLoading(false);
      }
    };

    loadDoctorsAndReviews();
  }, [reloadDoctorsAndReviews]);

  // Load the saved chat again when a different patient account is active.
  useEffect(() => {
    setSpecialtyMessages(readStoredSpecialtyChat(user?.userId));
  }, [user?.userId]);

  // Keep only the latest messages so localStorage stays small.
  useEffect(() => {
    localStorage.setItem(
      getSpecialtyChatStorageKey(user?.userId),
      JSON.stringify(specialtyMessages.slice(-30))
    );
  }, [specialtyMessages, user?.userId]);

  const handleReviewFieldChange = (doctorId, field, value) => {
    setReviewFormByDoctor((current) => ({
      ...current,
      [doctorId]: {
        ...(current[doctorId] || emptyReviewForm),
        [field]: value,
      },
    }));
  };

  const clearReviewField = (doctorId, field) => {
    setReviewFormByDoctor((current) => ({
      ...current,
      [doctorId]: {
        ...(current[doctorId] || emptyReviewForm),
        [field]: '',
      },
    }));
  };

  const toggleCommentsForDoctor = (doctorId) => {
    setExpandedCommentsByDoctor((current) => ({
      ...current,
      [doctorId]: !current[doctorId],
    }));
  };

  const submitReview = async (doctorId, payload) => {
    setSubmittingDoctorId(doctorId);
    setError('');
    try {
      await apiCall(`/doctors/${doctorId}/reviews`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      await reloadDoctorsAndReviews();
      return true;
    } catch (submitError) {
      setError(submitError.message || 'Could not submit review.');
      return false;
    } finally {
      setSubmittingDoctorId(null);
    }
  };

  const handleRatingSelect = async (doctorId, value) => {
    handleReviewFieldChange(doctorId, 'rating', value);
    await submitReview(doctorId, { rating: Number(value) });
  };

  const handleSubmitComment = async (doctorId) => {
    const doctorForm = reviewFormByDoctor[doctorId] || emptyReviewForm;
    const comment = String(doctorForm.comment || '').trim();

    if (!comment) {
      setError('Please write a comment before saving it.');
      return;
    }

    const ok = await submitReview(doctorId, { comment });
    if (ok) {
      clearReviewField(doctorId, 'comment');
    }
  };

  const handleStartEditComment = (review) => {
    setEditingReviewId(review.id);
    setEditCommentText(review.comment || '');
    setError('');
  };

  const handleCancelEditComment = () => {
    setEditingReviewId(null);
    setEditCommentText('');
  };

  const handleSaveEditedComment = async (reviewId) => {
    const comment = editCommentText.trim();

    if (!comment) {
      setError('Please write a comment before saving it.');
      return;
    }

    setSavingReviewId(reviewId);
    setError('');

    try {
      await apiCall(`/doctor-reviews/${reviewId}`, {
        method: 'PATCH',
        body: JSON.stringify({ comment }),
      });
      setEditingReviewId(null);
      setEditCommentText('');
      await reloadDoctorsAndReviews();
    } catch (saveError) {
      const message = saveError.message || '';
      setError(
        message.includes('404 Not Found')
          ? 'Comment edit is not available yet. Restart the API server and try again.'
          : message || 'Could not update comment.'
      );
    } finally {
      setSavingReviewId(null);
    }
  };

  const handleDeleteComment = async (reviewId) => {
    const shouldDelete = window.confirm('Delete this comment?');
    if (!shouldDelete) {
      return;
    }

    setDeletingReviewId(reviewId);
    setError('');

    try {
      await apiCall(`/doctor-reviews/${reviewId}`, { method: 'DELETE' });
      await reloadDoctorsAndReviews();
    } catch (deleteError) {
      setError(deleteError.message || 'Could not delete comment.');
    } finally {
      setDeletingReviewId(null);
    }
  };

  const handleSpecialtyAdviceSubmit = async (event) => {
    event.preventDefault();
    const diagnosis = specialtyMessage.trim();

    if (!diagnosis && !specialtyPdfFile) {
      setSpecialtyMessages((current) => [
        ...current,
        {
          id: `helper-empty-${Date.now()}`,
          sender: 'helper',
          text: 'Please describe your symptoms or attach a PDF medical record or lab result first.',
          isError: true,
        },
      ]);
      return;
    }

    if (specialtyPdfFile && specialtyPdfFile.size > 8 * 1024 * 1024) {
      setSpecialtyMessages((current) => [
        ...current,
        {
          id: `helper-pdf-size-${Date.now()}`,
          sender: 'helper',
          text: 'Please attach a PDF smaller than 8 MB.',
          isError: true,
        },
      ]);
      return;
    }

    setSpecialtyLoading(true);
    setSpecialtyMessage('');
    setSpecialtyPdfFile(null);

    // Show the patient's question immediately before waiting for the API response.
    setSpecialtyMessages((current) => [
      ...current,
      {
        id: `patient-${Date.now()}`,
        sender: 'patient',
        text: specialtyPdfFile
          ? `${diagnosis || 'Please explain this PDF in simple words.'}\nAttached PDF: ${specialtyPdfFile.name}`
          : diagnosis,
      },
    ]);

    try {
      if (specialtyPdfFile) {
        const fileData = await readFileAsDataUrl(specialtyPdfFile);
        const explanation = await apiCall('/patient-pdf-explanation', {
          method: 'POST',
          body: JSON.stringify({
            fileName: specialtyPdfFile.name,
            fileData,
            question: diagnosis,
          }),
        });

        setSpecialtyMessages((current) => [
          ...current,
          {
            id: `helper-pdf-${Date.now()}`,
            sender: 'helper',
            text: `${explanation.explanation}\n\n${explanation.disclaimer}`,
          },
        ]);
        return;
      }

      const advice = await apiCall('/patient-specialty-advice', {
        method: 'POST',
        body: JSON.stringify({ diagnosis }),
      });

      // Save the helper response in the same message list that is rendered in the chat body.
      setSpecialtyMessages((current) => [
        ...current,
        {
          id: `helper-${Date.now()}`,
          sender: 'helper',
          advice,
        },
      ]);
    } catch (adviceError) {
      const message = adviceError.message || 'Could not get a specialty recommendation.';
      setSpecialtyMessages((current) => [
        ...current,
        {
          id: `helper-error-${Date.now()}`,
          sender: 'helper',
          text: message,
          isError: true,
        },
      ]);
    } finally {
      setSpecialtyLoading(false);
    }
  };

  return (
        <div className="patient-overview">
      <div className="patient-overview-hero">
        <h2>All Doctors</h2>
        <p>Browse every available doctor in the clinic.</p>
      </div>

      <section className={`patient-specialty-chat${isSpecialtyChatOpen ? ' is-open' : ''}`} aria-labelledby="specialty-chat-title">
        {isSpecialtyChatOpen && (
          <div className="patient-specialty-chat-panel" role="dialog" aria-modal="false" aria-labelledby="specialty-chat-title">
            <div className="patient-specialty-chat-header">
              <div className="patient-specialty-avatar" aria-hidden="true">+</div>
              <div>
                <h3 id="specialty-chat-title">Specialty Helper</h3>
                <p>Usually replies instantly</p>
              </div>
              <button
                type="button"
                className="patient-specialty-close"
                onClick={() => setIsSpecialtyChatOpen(false)}
                aria-label="Close specialty helper chat"
              >
                x
              </button>
            </div>

            <div className="patient-specialty-chat-body">
              <div className="patient-specialty-message bot">
                Describe symptoms, or attach a PDF medical record/lab result and I can explain medical terms in simple words.
              </div>

              {specialtyMessages.map((message) => {
                if (message.sender === 'patient') {
                  return (
                    <div className="patient-specialty-message patient" key={message.id}>
                      {message.text}
                    </div>
                  );
                }

                if (message.advice) {
                  const { advice } = message;
                  return (
                    <div className="patient-specialty-result" key={message.id}>
                      {advice.isMedical === false ? (
                        <p className="patient-specialty-disclaimer">{advice.disclaimer}</p>
                      ) : advice.clinicCanTreat === false ? (
                        <>
                          <div>
                            <span className="patient-specialty-label">Needed specialty</span>
                            <strong>{advice.specialty}</strong>
                          </div>
                          <div>
                            <span className="patient-specialty-label">Urgency</span>
                            <strong>{advice.urgency}</strong>
                          </div>
                          <p>
                            Sorry, we do not have a doctor who can treat you in our clinic. Please go to a{' '}
                            {advice.specialty}.
                          </p>
                          {advice.advice && <p>{advice.advice}</p>}
                          <p className="patient-specialty-disclaimer">
                            {advice.disclaimer || 'This is not a medical diagnosis. Please ask a healthcare professional for medical advice.'}
                          </p>
                        </>
                      ) : (
                        <>
                          <div>
                            <span className="patient-specialty-label">Recommended specialty</span>
                            <strong>{advice.specialty}</strong>
                          </div>
                          <div>
                            <span className="patient-specialty-label">Urgency</span>
                            <strong>{advice.urgency}</strong>
                          </div>
                          <p>{advice.advice}</p>
                          {advice.appointmentReason && (
                            <p className="patient-specialty-reason">Appointment reason: {advice.appointmentReason}</p>
                          )}
                          <NavLink
                            to="/patient/appointments"
                            state={{
                              aiAppointment: {
                                specialty: advice.specialty,
                                reason: advice.appointmentReason || '',
                              },
                            }}
                            className="patient-specialty-book-link"
                          >
                            Book Appointment
                          </NavLink>
                        </>
                      )}
                    </div>
                  );
                }

                return (
                  <div
                    className={`patient-specialty-message bot${message.isError ? ' is-error' : ''}`}
                    key={message.id}
                  >
                    {message.text}
                  </div>
                );
              })}
            </div>

            <form className="patient-specialty-chat-form" onSubmit={handleSpecialtyAdviceSubmit}>
              <label htmlFor="patient-specialty-message">Symptoms or diagnosis</label>
              <textarea
                id="patient-specialty-message"
                rows="3"
                maxLength="1200"
                value={specialtyMessage}
                onChange={(event) => setSpecialtyMessage(event.target.value)}
                placeholder="Type symptoms or ask what your PDF means..."
              />
              <div className="patient-specialty-file-row">
                <label className="patient-specialty-file-button" htmlFor="patient-specialty-pdf">
                  Attach PDF
                </label>
                <input
                  id="patient-specialty-pdf"
                  type="file"
                  accept="application/pdf,.pdf"
                  onChange={(event) => {
                    const file = event.target.files?.[0] || null;
                    setSpecialtyPdfFile(file);
                    event.target.value = '';
                  }}
                  disabled={specialtyLoading}
                />
                <span>{specialtyPdfFile ? specialtyPdfFile.name : 'No PDF attached'}</span>
                {specialtyPdfFile && (
                  <button type="button" onClick={() => setSpecialtyPdfFile(null)} disabled={specialtyLoading}>
                    Remove
                  </button>
                )}
              </div>
              <div className="patient-specialty-chat-actions">
                <span>{specialtyMessage.length}/1200</span>
                <button type="submit" className="patient-specialty-send" disabled={specialtyLoading}>
                  {specialtyLoading ? 'Checking...' : specialtyPdfFile ? 'Explain PDF' : 'Send'}
                </button>
              </div>
            </form>
          </div>
        )}

        <button
          type="button"
          className="patient-specialty-launcher"
          onClick={() => setIsSpecialtyChatOpen((current) => !current)}
          aria-label={isSpecialtyChatOpen ? 'Close specialty helper chat' : 'Open specialty helper chat'}
          aria-expanded={isSpecialtyChatOpen}
        >
          {isSpecialtyChatOpen ? 'x' : (
            <span className="patient-specialty-launcher-icon" aria-hidden="true">
              <span />
              <span />
            </span>
          )}
        </button>
      </section>

      {loading && <div className="patient-doctor-state">Loading doctors...</div>}
      {!loading && error && <div className="patient-doctor-state patient-doctor-error">{error}</div>}
      {!loading && !error && !doctors.length && <div className="patient-doctor-state">No doctors found.</div>}

      {!loading && !error && doctors.length > 0 && (
        <div className="patient-doctor-grid">
          {doctors.map((doctor) => (
            <div className="patient-doctor-card" key={doctor.id}>
              {(() => {
                const doctorComments = (reviewsByDoctor[Number(doctor.id)] || []).filter(
                  (review) => String(review.comment || '').trim()
                );

                return (
                  <>
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
                {' '}({Number(doctor.reviewsCount || 0)} ratings)
              </div>
              <div className="patient-doctor-line"><strong>Fee:</strong> ${Number(doctor.fee || 0)}</div>
              <div className="patient-doctor-line"><strong>Phone:</strong> {doctor.phone || '-'}</div>
              <div className="patient-doctor-line"><strong>Clinic Status:</strong> {getDoctorClinicStatus(doctor)}</div>

              <button
                type="button"
                className="patient-view-comments-btn"
                onClick={() => toggleCommentsForDoctor(Number(doctor.id))}
              >
                {expandedCommentsByDoctor[Number(doctor.id)] ? 'Hide Feedback' : 'View Feedback'}
                {' '}
                ({doctorComments.length})
              </button>

              {expandedCommentsByDoctor[Number(doctor.id)] && (
                <div className="patient-doctor-reviews">
                  <h4>Patient Feedback</h4>
                  {doctorComments.length ? (
                    doctorComments.map((review) => (
                      <div className="patient-review-item" key={review.id}>
                        <div className="patient-review-head">
                          <strong>{review.patientName}</strong>
                          {String(review.patientId) === String(user?.userId) && (
                            <div className="patient-comment-actions">
                              <button
                                type="button"
                                className="patient-comment-edit"
                                disabled={editingReviewId === review.id}
                                onClick={() => handleStartEditComment(review)}
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                className="patient-comment-delete"
                                disabled={deletingReviewId === review.id}
                                onClick={() => handleDeleteComment(review.id)}
                              >
                                {deletingReviewId === review.id ? 'Deleting...' : 'Delete'}
                              </button>
                            </div>
                          )}
                        </div>
                        {editingReviewId === review.id ? (
                          <div className="patient-comment-edit-form">
                            <textarea
                              rows="3"
                              value={editCommentText}
                              onChange={(event) => setEditCommentText(event.target.value)}
                            />
                            <div className="patient-comment-edit-actions">
                              <button
                                type="button"
                                className="btn-primary"
                                disabled={savingReviewId === review.id}
                                onClick={() => handleSaveEditedComment(review.id)}
                              >
                                {savingReviewId === review.id ? 'Saving...' : 'Save'}
                              </button>
                              <button type="button" className="btn-secondary" onClick={handleCancelEditComment}>
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <p>{review.comment}</p>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="patient-review-empty">No feedback yet.</div>
                  )}
                </div>
              )}

              {user?.role === 'patient' && (
                <div className="patient-review-form">
                  <h4>Rate Or Comment</h4>
                  <label id={`rating-${doctor.id}`}>Rate only</label>
                  <StarRating
                    value={(reviewFormByDoctor[Number(doctor.id)] || emptyReviewForm).rating}
                    onChange={(value) => handleRatingSelect(Number(doctor.id), value)}
                    disabled={submittingDoctorId === Number(doctor.id)}
                    labelId={`rating-${doctor.id}`}
                  />

                  <label htmlFor={`comment-${doctor.id}`}>Comment only</label>
                  <textarea
                    id={`comment-${doctor.id}`}
                    rows="3"
                    value={(reviewFormByDoctor[Number(doctor.id)] || emptyReviewForm).comment}
                    onChange={(event) => handleReviewFieldChange(Number(doctor.id), 'comment', event.target.value)}
                    placeholder="Write a comment without rating if you want"
                  />

                  <button
                    type="button"
                    className="btn-primary"
                    disabled={submittingDoctorId === Number(doctor.id)}
                    onClick={() => handleSubmitComment(Number(doctor.id))}
                  >
                    {submittingDoctorId === Number(doctor.id) ? 'Saving...' : 'Add Comment'}
                  </button>
                </div>
              )}
                  </>
                );
              })()}
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
            to="/patient"
            end
            className={({ isActive }) => `patient-side-link ${isActive ? 'active' : ''}`}
          >
            Home
          </NavLink>
          <NavLink
            to="/patient/appointments"
            className={({ isActive }) => `patient-side-link ${isActive ? 'active' : ''}`}
          >
            Appointments
          </NavLink>
          <NavLink to="/patient/records" className={({ isActive }) => `patient-side-link ${isActive ? 'active' : ''}`}>
            Medical Records
          </NavLink>
          <NavLink to="/patient/location" className={({ isActive }) => `patient-side-link ${isActive ? 'active' : ''}`}>
            Clinic Location
          </NavLink>
          <NavLink to="/patient/contact" className={({ isActive }) => `patient-side-link ${isActive ? 'active' : ''}`}>
            Complaints
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
            <Route path="contact" element={<ContactUs />} />
            <Route path="location" element={<ClinicLocation />} />
            <Route path="*" element={<Navigate to="/patient" replace />} />
          </Routes>
        </div>
      </div>
    </div>
  );
};

export default PatientDashboard;
