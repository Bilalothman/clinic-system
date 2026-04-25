import React, { useEffect, useMemo, useState } from 'react';
import { useApi } from '../../../hooks/useApi';
import './ManagerDoctorReviews.css';

const getInitials = (name) => String(name || 'D')
  .trim()
  .split(/\s+/)
  .slice(0, 2)
  .map((part) => part[0]?.toUpperCase() || '')
  .join('') || 'D';

const getPatientInitials = (name) => String(name || 'P')
  .trim()
  .split(/\s+/)
  .slice(0, 2)
  .map((part) => part[0]?.toUpperCase() || '')
  .join('') || 'P';

const ManagerDoctorReviews = () => {
  const { apiCall } = useApi();
  const [doctors, setDoctors] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [expandedCommentsByDoctor, setExpandedCommentsByDoctor] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadDoctorsAndReviews = async () => {
      setLoading(true);
      setError('');
      try {
        const [doctorRows, reviewRows] = await Promise.all([
          apiCall('/doctors'),
          apiCall('/doctor-reviews'),
        ]);
        setDoctors(Array.isArray(doctorRows) ? doctorRows : []);
        setReviews(Array.isArray(reviewRows) ? reviewRows : []);
      } catch (loadError) {
        setError(loadError.message || 'Could not load doctor feedback.');
      } finally {
        setLoading(false);
      }
    };

    loadDoctorsAndReviews();
  }, [apiCall]);

  const reviewsByDoctor = useMemo(() => {
    const grouped = {};
    reviews.forEach((review) => {
      const doctorId = Number(review.doctorId);
      if (!grouped[doctorId]) {
        grouped[doctorId] = [];
      }
      grouped[doctorId].push(review);
    });
    return grouped;
  }, [reviews]);

  const toggleCommentsForDoctor = (doctorId) => {
    setExpandedCommentsByDoctor((current) => ({
      ...current,
      [doctorId]: !current[doctorId],
    }));
  };

  return (
    <section className="manager-review-panel fade-in-up">
      <div className="manager-review-header">
        <div>
          <h3>Doctors Feedback</h3>
          <p>Ratings and patient comments for each doctor.</p>
        </div>
      </div>

      {loading && <div className="manager-review-state">Loading doctors and feedback...</div>}
      {!loading && error && <div className="manager-review-state manager-review-error">{error}</div>}
      {!loading && !error && !doctors.length && (
        <div className="manager-review-state">No doctors found.</div>
      )}

      {!loading && !error && doctors.length > 0 && (
        <div className="manager-review-grid">
          {doctors.map((doctor) => {
            const doctorComments = (reviewsByDoctor[Number(doctor.id)] || []).filter(
              (review) => String(review.comment || '').trim()
            );

            return (
              <article className="manager-review-card" key={doctor.id}>
                <div className="manager-review-card-top">
                  {doctor.profileImage ? (
                    <img src={doctor.profileImage} alt={`${doctor.name} profile`} className="manager-review-photo" />
                  ) : (
                    <div className="manager-review-photo-fallback">{getInitials(doctor.name)}</div>
                  )}

                  <div className="manager-review-meta">
                    <h4>{doctor.name}</h4>
                    <p>{doctor.specialty || '-'}</p>
                    <div className="manager-review-rating">
                      <span>{Number(doctor.avgRating || 0).toFixed(1)} / 5</span>
                      <span>({Number(doctor.reviewsCount || 0)} ratings)</span>
                    </div>
                  </div>
                </div>

                <div className="manager-review-comments">
                  <button
                    type="button"
                    className="manager-view-comments-btn"
                    onClick={() => toggleCommentsForDoctor(Number(doctor.id))}
                  >
                    {expandedCommentsByDoctor[Number(doctor.id)] ? 'Hide Comments' : 'View Comments'}
                    {' '}
                    ({doctorComments.length})
                  </button>

                  {expandedCommentsByDoctor[Number(doctor.id)] && (
                    <>
                      <h5>Comments</h5>
                      {doctorComments.length ? (
                        doctorComments.map((review) => (
                          <div className="manager-review-comment" key={review.id}>
                            <div className="manager-review-comment-head">
                              {review.patientProfileImage ? (
                                <img
                                  src={review.patientProfileImage}
                                  alt={`${review.patientName} profile`}
                                  className="manager-review-comment-photo"
                                />
                              ) : (
                                <div className="manager-review-comment-photo-fallback">
                                  {getPatientInitials(review.patientName)}
                                </div>
                              )}
                              <strong>{review.patientName}</strong>
                            </div>
                            <p>{review.comment}</p>
                          </div>
                        ))
                      ) : (
                        <div className="manager-review-empty">No comments yet.</div>
                      )}
                    </>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
};

export default ManagerDoctorReviews;
