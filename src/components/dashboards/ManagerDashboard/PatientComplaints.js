import React, { useEffect, useMemo, useState } from 'react';
import { useApi } from '../../../hooks/useApi';
import './PatientComplaints.css';

const getDateOnly = (value) => {
  if (!value) {
    return '';
  }

  return String(value).slice(0, 10);
};

const getPatientInitials = (name) => String(name || 'P')
  .trim()
  .split(/\s+/)
  .slice(0, 2)
  .map((part) => part[0]?.toUpperCase() || '')
  .join('') || 'P';

const PatientComplaints = () => {
  const { apiCall } = useApi();
  const [complaints, setComplaints] = useState([]);
  const [dateFilter, setDateFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadComplaints = async () => {
      setLoading(true);
      setError('');

      try {
        const rows = await apiCall('/patient-complaints');
        setComplaints(Array.isArray(rows) ? rows : []);
      } catch (loadError) {
        setError(loadError.message || 'Could not load patient complaints.');
      } finally {
        setLoading(false);
      }
    };

    loadComplaints();
  }, [apiCall]);

  const filteredComplaints = useMemo(() => {
    if (!dateFilter) {
      return complaints;
    }

    return complaints.filter((complaint) => getDateOnly(complaint.createdAt) === dateFilter);
  }, [complaints, dateFilter]);

  return (
    <div className="manager-complaints-page fade-in-up">
      <div className="manager-complaints-header">
        <h3>Patient Complaints</h3>
        <p>Messages sent by patients from the Contact Us page.</p>
      </div>

      {!loading && !error && complaints.length > 0 && (
        <div className="manager-complaints-filter">
          <label htmlFor="complaint-date-filter">Filter by date</label>
          <input
            id="complaint-date-filter"
            type="date"
            value={dateFilter}
            onChange={(event) => setDateFilter(event.target.value)}
          />
          {dateFilter && (
            <button type="button" className="btn-secondary" onClick={() => setDateFilter('')}>
              Clear
            </button>
          )}
        </div>
      )}

      {loading && <div className="manager-complaints-state">Loading complaints...</div>}
      {!loading && error && <div className="manager-complaints-state manager-complaints-error">{error}</div>}
      {!loading && !error && !complaints.length && (
        <div className="manager-complaints-state">No patient complaints have been sent yet.</div>
      )}
      {!loading && !error && complaints.length > 0 && !filteredComplaints.length && (
        <div className="manager-complaints-state">No complaints match this date.</div>
      )}

      {!loading && !error && filteredComplaints.length > 0 && (
        <div className="manager-complaints-list">
          {filteredComplaints.map((complaint) => (
            <article className="manager-complaint-card" key={complaint.id}>
              <div className="manager-complaint-patient manager-complaint-field-wide">
                {complaint.patientProfileImage ? (
                  <img
                    src={complaint.patientProfileImage}
                    alt={`${complaint.patientName} profile`}
                    className="manager-complaint-photo"
                  />
                ) : (
                  <div className="manager-complaint-photo-fallback">
                    {getPatientInitials(complaint.patientName)}
                  </div>
                )}
                <div className="manager-complaint-field">
                  <span>Name</span>
                  <strong>{complaint.patientName}</strong>
                </div>
              </div>
              <div className="manager-complaint-field">
                <span>Subject</span>
                <strong>{complaint.subject}</strong>
              </div>
              <div className="manager-complaint-field manager-complaint-field-wide">
                <span>Message</span>
                <p>{complaint.message}</p>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};

export default PatientComplaints;
