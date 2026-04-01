import React, { useEffect, useMemo, useState } from 'react';
import './Patients.css';

const patientList = [
  { id: 1, name: 'Alice Johnson', condition: 'Hypertension', nextVisit: '2024-02-01', notes: 'Blood pressure has improved after medication adjustment.' },
  { id: 2, name: 'Bob Wilson', condition: 'Diabetes Type 2', nextVisit: '2024-01-25', notes: 'Needs updated fasting glucose numbers before the next visit.' },
  { id: 3, name: 'Carol Davis', condition: 'Migraine', nextVisit: '2024-02-05', notes: 'Tracking trigger patterns and response to treatment.' },
];

const Patients = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPatient, setSelectedPatient] = useState(patientList[0]);

  const filteredPatients = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    if (!query) {
      return patientList;
    }

    return patientList.filter((patient) =>
      [patient.name, patient.condition, patient.nextVisit].some((value) =>
        value.toLowerCase().includes(query)
      )
    );
  }, [searchTerm]);

  useEffect(() => {
    if (!filteredPatients.length) {
      setSelectedPatient(null);
      return;
    }

    if (!selectedPatient || !filteredPatients.some((patient) => patient.id === selectedPatient.id)) {
      setSelectedPatient(filteredPatients[0]);
    }
  }, [filteredPatients, selectedPatient]);

  return (
    <div className="card fade-in-left">
      <div className="card-header">
        <h3>Active Patients</h3>
      </div>
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
            <h4>{patient.name}</h4>
            <p className="condition">{patient.condition}</p>
            <span className="next-visit">Next: {patient.nextVisit}</span>
            <button type="button" className="btn-primary btn-full" onClick={() => setSelectedPatient(patient)}>
              View Records
            </button>
          </div>
        ))}
      </div>

      {!filteredPatients.length && (
        <div className="empty-state">No patients matched your search.</div>
      )}

      {selectedPatient && (
        <div className="detail-panel">
          <h4>{selectedPatient.name}</h4>
          <div className="detail-grid">
            <span><strong>Condition:</strong> {selectedPatient.condition}</span>
            <span><strong>Next visit:</strong> {selectedPatient.nextVisit}</span>
          </div>
          <p className="patient-summary">{selectedPatient.notes}</p>
        </div>
      )}
    </div>
  );
};

export default Patients;
