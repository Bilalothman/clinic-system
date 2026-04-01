import React from 'react';
import './MyRecords.css';

const MyRecords = () => {
  const records = [
    { date: '2024-01-15', doctor: 'Dr. John Smith', diagnosis: 'Hypertension controlled', prescription: 'Amlodipine 5mg' },
    { date: '2024-01-10', doctor: 'Dr. Sarah Johnson', diagnosis: 'Routine checkup', prescription: 'None' },
  ];

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
                <h5>{record.doctor}</h5>
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
    </div>
  );
};

export default MyRecords;
