import React, { useEffect, useMemo, useState } from 'react';
import './PatientsList.css';

const patientRoster = [
  { id: 1, name: 'Alice Johnson', age: 28, phone: '+1-234-567-8901', lastVisit: '2024-01-15', doctor: 'Dr. John Smith', notes: 'Follow-up for blood pressure review.' },
  { id: 2, name: 'Bob Wilson', age: 45, phone: '+1-234-567-8902', lastVisit: '2024-01-10', doctor: 'Dr. Sarah Johnson', notes: 'Monitoring diabetes medication response.' },
  { id: 3, name: 'Carol Davis', age: 32, phone: '+1-234-567-8903', lastVisit: '2024-01-12', doctor: 'Dr. Michael Brown', notes: 'Migraine care plan updated this week.' },
  { id: 4, name: 'Daniel Green', age: 39, phone: '+1-234-567-8910', lastVisit: '2024-01-09', doctor: 'Dr. Sarah Johnson', notes: 'Awaiting lab results before next consultation.' },
  { id: 5, name: 'Emma White', age: 51, phone: '+1-234-567-8911', lastVisit: '2024-01-05', doctor: 'Dr. John Smith', notes: 'Recovering well after cardiology review.' },
];

const PatientsList = () => {
  const [showAll, setShowAll] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPatient, setSelectedPatient] = useState(patientRoster[0]);

  const scopedPatients = useMemo(
    () => (showAll ? patientRoster : patientRoster.slice(0, 3)),
    [showAll]
  );

  const visiblePatients = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    if (!query) {
      return scopedPatients;
    }

    return scopedPatients.filter((patient) =>
      [patient.name, patient.phone, patient.doctor].some((value) =>
        value.toLowerCase().includes(query)
      )
    );
  }, [scopedPatients, searchTerm]);

  useEffect(() => {
    if (!visiblePatients.length) {
      setSelectedPatient(null);
      return;
    }

    if (!selectedPatient || !visiblePatients.some((patient) => patient.id === selectedPatient.id)) {
      setSelectedPatient(visiblePatients[0]);
    }
  }, [visiblePatients, selectedPatient]);

  const handleToggleView = () => {
    setShowAll((current) => !current);
  };

  return (
    <div className="card fade-in-up">
      <div className="card-header">
        <h3>Recent Patients</h3>
        <button type="button" className="btn-primary" onClick={handleToggleView}>
          {showAll ? 'Show Recent' : 'View All'}
        </button>
      </div>

      <div className="action-feedback">
        {showAll
          ? 'Showing the full patient roster for the current demo data.'
          : 'Showing the most recent patients. Use View All to expand the list.'}
      </div>

      <input
        type="search"
        className="patient-search"
        placeholder="Search patients by name, phone, or doctor"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />

      <div className="patients-list">
        {visiblePatients.map((patient) => (
          <div key={patient.id} className="patient-card">
            <div className="patient-info">
              <div className="patient-avatar">P</div>
              <div>
                <h4>{patient.name}</h4>
                <p>{patient.age} years • {patient.phone}</p>
              </div>
            </div>
            <div className="patient-meta">
              <span className="last-visit">Last visit: {patient.lastVisit}</span>
              <button type="button" className="btn-secondary btn-sm" onClick={() => setSelectedPatient(patient)}>
                View Records
              </button>
            </div>
          </div>
        ))}
      </div>

      {!visiblePatients.length && (
        <div className="empty-state">No patients matched your search.</div>
      )}

      {selectedPatient && (
        <div className="detail-panel">
          <h4>{selectedPatient.name}</h4>
          <div className="detail-grid">
            <span><strong>Doctor:</strong> {selectedPatient.doctor}</span>
            <span><strong>Last visit:</strong> {selectedPatient.lastVisit}</span>
            <span><strong>Phone:</strong> {selectedPatient.phone}</span>
            <span><strong>Age:</strong> {selectedPatient.age}</span>
          </div>
          <p className="patient-notes">{selectedPatient.notes}</p>
        </div>
      )}
    </div>
  );
};

export default PatientsList;
