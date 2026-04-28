import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { useApi } from '../../../hooks/useApi';
import './MyRecords.css';

const getReportFileName = (result) => {
  if (result.resultImageName) {
    return result.resultImageName;
  }

  const safeTestName = (result.testName || 'lab-result')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  const safeDate = (result.date || new Date().toISOString().slice(0, 10)).replace(/[^0-9-]/g, '');

  return `${safeTestName || 'lab-result'}-${safeDate || 'report'}.png`;
};

const MyRecords = () => {
  const { user } = useAuth();
  const { apiCall } = useApi();
  const [records, setRecords] = useState([]);
  const [labResults, setLabResults] = useState([]);

  const patientId = user?.userId || '';

  useEffect(() => {
    const loadData = async () => {
      if (!patientId) {
        setRecords([]);
        setLabResults([]);
        return;
      }

      try {
        const [recordRows, labRows] = await Promise.all([
          apiCall(`/medical-records?patientId=${patientId}`),
          apiCall(`/lab-results?patientId=${patientId}`),
        ]);

        setRecords((recordRows || []).sort((a, b) => b.date.localeCompare(a.date)));
        setLabResults((labRows || []).sort((a, b) => b.date.localeCompare(a.date)));
      } catch (error) {
        setRecords([]);
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
                <span className="diagnosis-tag">Medical Record</span>
              </div>
              <div className="record-field">
                <strong>Diagnosis:</strong> {record.diagnosis || 'No diagnosis provided'}
              </div>
              <div className="record-field prescription">
                <strong>Prescription:</strong> {record.prescription || 'No prescription provided'}
              </div>
              <div className="record-field notes">
                <strong>Notes:</strong> {record.notes || 'No notes provided'}
              </div>
            </div>
          </div>
        ))}
        {!records.length && (
          <div className="empty-state">No medical records added for your account yet.</div>
        )}
      </div>

      <div className="lab-results-section">
        <h4>My Lab Results</h4>
        <div className="lab-results-list">
          {myLabResults.map((result) => (
            <div key={result.id} className="lab-result-card">
              <div className="lab-result-head">
                <div>
                  <h5>{result.testName}</h5>
                  <span>{result.date}</span>
                </div>
                {result.resultImage && (
                  <a
                    className="lab-result-export"
                    href={result.resultImage}
                    download={getReportFileName(result)}
                  >
                    Export
                  </a>
                )}
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
