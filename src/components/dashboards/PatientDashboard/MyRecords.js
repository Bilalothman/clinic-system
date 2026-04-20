import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { useApi } from '../../../hooks/useApi';
import './MyRecords.css';

const defaultMedicalRecords = [
  { date: '2024-01-15', doctor: 'Dr. John Smith', diagnosis: 'Hypertension controlled', prescription: 'Amlodipine 5mg' },
  { date: '2024-01-10', doctor: 'Dr. Sarah Johnson', diagnosis: 'Routine checkup', prescription: 'None' },
];

const MyRecords = () => {
  const { user } = useAuth();
  const { apiCall } = useApi();
  const [records, setRecords] = useState(defaultMedicalRecords);
  const [labResults, setLabResults] = useState([]);

  const patientId = user?.userId || '201';

  useEffect(() => {
    const loadData = async () => {
      try {
        const [recordRows, labRows] = await Promise.all([
          apiCall(`/medical-records?patientId=${patientId}`),
          apiCall(`/lab-results?patientId=${patientId}`),
        ]);

        if (recordRows?.length) {
          setRecords([...recordRows].sort((a, b) => b.date.localeCompare(a.date)));
        } else {
          setRecords(defaultMedicalRecords);
        }

        setLabResults((labRows || []).sort((a, b) => b.date.localeCompare(a.date)));
      } catch (error) {
        setRecords(defaultMedicalRecords);
        setLabResults([]);
      }
    };

    loadData();
  }, [apiCall, patientId]);

  const myLabResults = useMemo(() => {
    return [...labResults].sort((a, b) => b.date.localeCompare(a.date));
  }, [labResults]);

  return (
    <div className="card fade-in-left">
      <div className="card-header">
        <h3>My Medical Records</h3>
      </div>

      <div className="records-timeline">
        {records.map((record, index) => (
          <div key={record.id || index} className="timeline-item">
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
