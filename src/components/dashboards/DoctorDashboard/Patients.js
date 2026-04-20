import React, { useEffect, useMemo, useState } from 'react';
import { useApi } from '../../../hooks/useApi';
import './Patients.css';

const Patients = () => {
  const { apiCall } = useApi();
  const [patientList, setPatientList] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPatient, setSelectedPatient] = useState(null);

  useEffect(() => {
    const loadPatients = async () => {
      try {
        const rows = await apiCall('/patients');
        setPatientList(rows || []);
        setSelectedPatient((rows || [])[0] || null);
      } catch (error) {
        setPatientList([]);
        setSelectedPatient(null);
      }
    };

    loadPatients();
  }, [apiCall]);

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
        <h3>All Patients</h3>
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
