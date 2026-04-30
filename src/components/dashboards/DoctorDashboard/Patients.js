import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { useApi } from '../../../hooks/useApi';
import './Patients.css';

const formatDisplayDate = (value) => {
  if (!value || value === 'TBD' || value === 'N/A') {
    return value || '-';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return String(value);
  }

  return parsed.toISOString().slice(0, 10);
};

const calculateAgeFromDob = (value) => {
  if (!value) {
    return null;
  }

  const dob = new Date(value);
  const today = new Date();

  if (Number.isNaN(dob.getTime()) || dob > today) {
    return null;
  }

  let age = today.getFullYear() - dob.getFullYear();
  const birthdayThisYear = new Date(today.getFullYear(), dob.getMonth(), dob.getDate());

  if (today < birthdayThisYear) {
    age -= 1;
  }

  return age;
};

const getInitials = (name) => String(name || 'P')
  .trim()
  .split(/\s+/)
  .slice(0, 2)
  .map((part) => part[0]?.toUpperCase() || '')
  .join('') || 'P';

const Patients = () => {
  const { user } = useAuth();
  const { apiCall } = useApi();
  const [patientList, setPatientList] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [feedback, setFeedback] = useState('');
  const [reportingPatientId, setReportingPatientId] = useState(null);

  useEffect(() => {
    const loadPatients = async () => {
      try {
        const doctorQuery = user?.userId ? `?doctorId=${user.userId}` : '';
        const rows = await apiCall(`/patients${doctorQuery}`);
        setPatientList(rows || []);
        setFeedback('');
      } catch (error) {
        setPatientList([]);
        setFeedback(error.message);
      }
    };

    loadPatients();
  }, [apiCall, user?.userId]);

  const filteredPatients = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    if (!query) {
      return patientList;
    }

    return patientList.filter((patient) =>
      [patient.name, patient.condition, patient.nextVisit].some((value) =>
        String(value || '').toLowerCase().includes(query)
      )
    );
  }, [patientList, searchTerm]);

  const handleReportPatient = async (patient) => {
    if (patient.currentDoctorReported || patient.status !== 'active') {
      return;
    }

    const confirmed = window.confirm(
      `Report ${patient.name}? If this patient receives reports from 3 different doctors, the account will be blocked automatically.`
    );

    if (!confirmed) {
      return;
    }

    setReportingPatientId(patient.id);
    setFeedback('');

    try {
      const result = await apiCall(`/patients/${patient.id}/reports`, {
        method: 'POST',
        body: JSON.stringify({ reason: 'Reported from doctor dashboard' }),
      });
      const updatedPatient = result.patient;

      setPatientList((current) =>
        current.map((item) => (item.id === patient.id ? updatedPatient : item))
      );
      setFeedback(result.message || `${patient.name} was reported.`);
    } catch (error) {
      setFeedback(error.message);
    } finally {
      setReportingPatientId(null);
    }
  };

  return (
    <div className="card fade-in-left">
      <div className="card-header">
        <h3>All Patients</h3>
      </div>
      {feedback && <div className="patient-report-feedback">{feedback}</div>}
      <input
        type="search"
        className="patient-search"
        placeholder="Search patients by name, condition, or next visit"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />
      <div className="patients-grid">
        {filteredPatients.map((patient) => (
          <div key={patient.id} className="patient-widget">
            <div className="patient-widget-photo-wrap">
              {patient.profileImage ? (
                <img src={patient.profileImage} alt={`${patient.name} profile`} className="patient-widget-photo" />
              ) : (
                <div className="patient-widget-photo-fallback">{getInitials(patient.name)}</div>
              )}
            </div>
            <h4>{patient.name}</h4>
            <p className="condition">{patient.condition}</p>
            <span className="next-visit">Next: {formatDisplayDate(patient.nextVisit)}</span>
            <div className="patient-report-status">
              <span className={patient.status === 'active' ? 'patient-status-active' : 'patient-status-blocked'}>
                {patient.status === 'active' ? 'Active' : 'Blocked'}
              </span>
              <span>{patient.reportCount || 0}/3 reports</span>
            </div>
            <div className="patient-widget-info">
              <span><strong>DOB:</strong> {formatDisplayDate(patient.dob)}</span>
              <span><strong>Age:</strong> {calculateAgeFromDob(patient.dob) ?? patient.age ?? '-'}</span>
              <span><strong>Gender:</strong> {patient.gender || '-'}</span>
              <span><strong>Phone:</strong> {patient.phone || '-'}</span>
              <span><strong>Email:</strong> {patient.email || '-'}</span>
              <span><strong>Address:</strong> {patient.address || '-'}</span>
            </div>
            <button
              type="button"
              className={patient.currentDoctorReported || patient.status !== 'active' ? 'btn-secondary btn-full' : 'btn-danger btn-full'}
              disabled={patient.currentDoctorReported || patient.status !== 'active' || reportingPatientId === patient.id}
              onClick={() => handleReportPatient(patient)}
            >
              {reportingPatientId === patient.id
                ? 'Reporting...'
                : patient.currentDoctorReported
                  ? 'Reported'
                  : patient.status !== 'active'
                    ? 'Patient Blocked'
                    : 'Report Patient'}
            </button>
          </div>
        ))}
      </div>

      {!filteredPatients.length && (
        <div className="empty-state">No patients matched your search.</div>
      )}

    </div>
  );
};

export default Patients;
