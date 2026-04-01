import React, { useMemo } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import './MyRecords.css';

const LAB_RESULTS_STORAGE_KEY = 'doctorLabResults';
const MEDICAL_RECORDS_STORAGE_KEY = 'doctorMedicalRecords';
const defaultMedicalRecords = [
  { date: '2024-01-15', doctor: 'Dr. John Smith', diagnosis: 'Hypertension controlled', prescription: 'Amlodipine 5mg' },
  { date: '2024-01-10', doctor: 'Dr. Sarah Johnson', diagnosis: 'Routine checkup', prescription: 'None' },
];

const getStoredLabResults = () => {
  try {
    const raw = localStorage.getItem(LAB_RESULTS_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
};

const getStoredMedicalRecords = () => {
  try {
    const raw = localStorage.getItem(MEDICAL_RECORDS_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
};

const normalize = (value) => String(value || '').trim().toLowerCase();

const MyRecords = () => {
  const { user } = useAuth();
  const patientName = user?.profile?.name || (user?.userId === '201' ? 'John Doe' : `Patient ${user?.userId || ''}`);

  const records = useMemo(() => {
    const stored = getStoredMedicalRecords();
    const mine = stored.filter((record) => normalize(record.patient) === normalize(patientName));

    if (!mine.length) {
      return defaultMedicalRecords;
    }

    return mine.sort((a, b) => b.date.localeCompare(a.date));
  }, [patientName]);

  const myLabResults = useMemo(() => {
    const allResults = getStoredLabResults();
    const mine = allResults.filter((result) => normalize(result.patient) === normalize(patientName));
    return mine.sort((a, b) => b.date.localeCompare(a.date));
  }, [patientName]);

  return (
    <div className="card fade-in-left">
      <div className="card-header">
        <h3>My Medical Records</h3>
      </div>
      
      <div className="records-timeline">
        {records.map((record, index) => (
          <div key={index} className="timeline-item">
            <div className="timeline-date">{record.date}</div>
            <div className="timeline-content">
              <div className="record-header">
                <h5>{record.doctor || 'Doctor'}</h5>
                <span className="diagnosis-tag">{record.diagnosis}</span>
              </div>
              {record.prescription && (
                <div className="prescription">
                  <strong>Prescription:</strong> {record.prescription}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="lab-results-section">
        <h4>My Lab Results</h4>
        <div className="lab-results-list">
          {myLabResults.map((result) => (
            <div key={result.id} className="lab-result-card">
              <div className="lab-result-head">
                <h5>{result.testName}</h5>
                <span>{result.date}</span>
              </div>
              {result.resultImage && (
                <img className="lab-result-image" src={result.resultImage} alt={`${result.testName} result`} />
              )}
              <p className="lab-result-notes">{result.notes}</p>
            </div>
          ))}
          {!myLabResults.length && (
            <div className="empty-state">No lab results added for your account yet.</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MyRecords;
