import React, { useEffect, useMemo, useState } from 'react';
import './PatientsList.css';

const initialPatientRoster = [
  { id: 1, name: 'Alice Johnson', age: 28, dob: '1997-04-11', phone: '+1-234-567-8901', lastVisit: '2024-01-15', doctor: 'Dr. John Smith', notes: 'Follow-up for blood pressure review.' },
  { id: 2, name: 'Bob Wilson', age: 45, dob: '1980-09-24', phone: '+1-234-567-8902', lastVisit: '2024-01-10', doctor: 'Dr. Sarah Johnson', notes: 'Monitoring diabetes medication response.' },
  { id: 3, name: 'Carol Davis', age: 32, dob: '1993-02-07', phone: '+1-234-567-8903', lastVisit: '2024-01-12', doctor: 'Dr. Michael Brown', notes: 'Migraine care plan updated this week.' },
  { id: 4, name: 'Daniel Green', age: 39, dob: '1986-06-30', phone: '+1-234-567-8910', lastVisit: '2024-01-09', doctor: 'Dr. Sarah Johnson', notes: 'Awaiting lab results before next consultation.' },
  { id: 5, name: 'Emma White', age: 51, dob: '1974-01-15', phone: '+1-234-567-8911', lastVisit: '2024-01-05', doctor: 'Dr. John Smith', notes: 'Recovering well after cardiology review.' },
];

const emptyPatient = {
  name: '',
  age: '',
  dob: '',
  phone: '',
  doctor: '',
  notes: '',
};

const PatientsList = () => {
  const [patients, setPatients] = useState(initialPatientRoster);
  const [showAll, setShowAll] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPatient, setSelectedPatient] = useState(initialPatientRoster[0]);
  const [patientForm, setPatientForm] = useState(emptyPatient);
  const [editingPatientId, setEditingPatientId] = useState(null);
  const [feedback, setFeedback] = useState('Manage patients, edit records, and remove entries when needed.');

  const nextPatientId = useMemo(
    () => patients.reduce((maxId, patient) => Math.max(maxId, patient.id), 0) + 1,
    [patients]
  );

  const scopedPatients = useMemo(
    () => (showAll ? patients : patients.slice(0, 3)),
    [showAll, patients]
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

  const handleFormChange = (field, value) => {
    setPatientForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleEditPatient = (patient) => {
    setEditingPatientId(patient.id);
    setPatientForm({
      name: patient.name,
      age: String(patient.age),
      dob: patient.dob || '',
      phone: patient.phone,
      doctor: patient.doctor,
      notes: patient.notes,
    });
    setFeedback(`Editing ${patient.name}. Update details and save changes.`);
  };

  const handleDeletePatient = (patientId) => {
    const patientToDelete = patients.find((patient) => patient.id === patientId);
    const updatedPatients = patients.filter((patient) => patient.id !== patientId);
    setPatients(updatedPatients);
    setFeedback(`${patientToDelete?.name || 'Patient'} was removed from the list.`);

    if (selectedPatient?.id === patientId) {
      setSelectedPatient(updatedPatients[0] || null);
    }

    if (editingPatientId === patientId) {
      setEditingPatientId(null);
      setPatientForm(emptyPatient);
    }
  };

  const handleCancelEdit = () => {
    setEditingPatientId(null);
    setPatientForm(emptyPatient);
    setFeedback('Edit cancelled. Patient form reset.');
  };

  const handleSavePatient = (event) => {
    event.preventDefault();

    const normalizedPatient = {
      ...patientForm,
      age: Number(patientForm.age),
      notes: patientForm.notes.trim(),
    };

    if (editingPatientId) {
      const updatedPatients = patients.map((patient) =>
        patient.id === editingPatientId ? { ...patient, ...normalizedPatient } : patient
      );
      setPatients(updatedPatients);
      setFeedback(`${normalizedPatient.name} was updated successfully.`);
      setSelectedPatient(
        updatedPatients.find((patient) => patient.id === editingPatientId) || selectedPatient
      );
    } else {
      const newPatient = { ...normalizedPatient, id: nextPatientId, lastVisit: 'N/A' };
      setPatients((current) => [newPatient, ...current]);
      setFeedback(`${newPatient.name} was added to patient records.`);
      setSelectedPatient(newPatient);
    }

    setEditingPatientId(null);
    setPatientForm(emptyPatient);
  };

  return (
    <div className="card fade-in-up">
      <div className="card-header">
        <h3>Recent Patients</h3>
        <button type="button" className="btn-primary" onClick={handleToggleView}>
          {showAll ? 'Show Recent' : 'View All'}
        </button>
      </div>

      <div className="action-feedback">{feedback}</div>

      <form className="patient-form" onSubmit={handleSavePatient}>
        <div className="patient-form-grid">
          <input
            type="text"
            placeholder="Patient Name"
            value={patientForm.name}
            onChange={(e) => handleFormChange('name', e.target.value)}
            required
          />
          <input
            type="number"
            min="0"
            placeholder="Age"
            value={patientForm.age}
            onChange={(e) => handleFormChange('age', e.target.value)}
            required
          />
          <input
            type="text"
            placeholder="Phone"
            value={patientForm.phone}
            onChange={(e) => handleFormChange('phone', e.target.value)}
            required
          />
          <input
            type="date"
            value={patientForm.dob}
            onChange={(e) => handleFormChange('dob', e.target.value)}
            required
          />
          <input
            type="text"
            placeholder="Doctor"
            value={patientForm.doctor}
            onChange={(e) => handleFormChange('doctor', e.target.value)}
            required
          />
          <input
            type="text"
            placeholder="Notes"
            value={patientForm.notes}
            onChange={(e) => handleFormChange('notes', e.target.value)}
            required
          />
        </div>
        <div className="patient-form-actions">
          <button type="submit" className="btn-primary">
            {editingPatientId ? 'Save Patient' : '+ Add Patient'}
          </button>
          {editingPatientId && (
            <button type="button" className="btn-secondary" onClick={handleCancelEdit}>
              Cancel Edit
            </button>
          )}
        </div>
      </form>

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
                <p>{patient.age} years | {patient.phone}</p>
              </div>
            </div>
            <div className="patient-meta">
              <span className="last-visit">Last visit: {patient.lastVisit}</span>
              <div className="patient-actions">
                <button type="button" className="btn-secondary btn-sm" onClick={() => setSelectedPatient(patient)}>
                  View
                </button>
                <button type="button" className="btn-secondary btn-sm" onClick={() => handleEditPatient(patient)}>
                  Edit
                </button>
                <button type="button" className="btn-danger btn-sm" onClick={() => handleDeletePatient(patient.id)}>
                  Delete
                </button>
              </div>
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
            <span><strong>Date of birth:</strong> {selectedPatient.dob || '-'}</span>
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
