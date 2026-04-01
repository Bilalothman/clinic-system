import React from 'react';
import './MedicalRecords.css';

const MedicalRecords = () => {
  const records = [
    { patient: 'Alice Johnson', date: '2024-01-15', diagnosis: 'Hypertension controlled' },
    { patient: 'Bob Wilson', date: '2024-01-10', diagnosis: 'Blood sugar stable' },
  ];

  return (
    <div className="card fade-in-right">
      <div className="card-header">
        <h3>Recent Records</h3>
      </div>
      <div className="records-list">
        {records.map((record, index) => (
          <div key={index} className="record-item">
            <div>
              <h5>{record.patient}</h5>
              <span className="record-date">{record.date}</span>
            </div>
            <p>{record.diagnosis}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MedicalRecords;
