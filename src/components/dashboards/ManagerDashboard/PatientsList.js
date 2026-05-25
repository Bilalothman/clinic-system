import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useApi } from '../../../hooks/useApi';
import './PatientsList.css';

const emptyPatient = {
  name: '',
  email: '',
  password: '',
  dob: '',
  phone: '',
  doctor: '',
  notes: '',
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

const PatientsList = () => {
  const { apiCall } = useApi();
  const patientDetailRefs = useRef(new Map());
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [showAll, setShowAll] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [patientForm, setPatientForm] = useState(emptyPatient);
  const [editingPatientId, setEditingPatientId] = useState(null);
  const [feedback, setFeedback] = useState('Manage patients, edit records, and remove entries when needed.');

  const loadData = async () => {
    try {
      const [patientRows, doctorRows] = await Promise.all([apiCall('/patients'), apiCall('/doctors')]);
      setPatients(patientRows || []);
      setDoctors(doctorRows || []);
    } catch (error) {
      setFeedback(error.message);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        String(value || '').toLowerCase().includes(query)
      )
    );
  }, [scopedPatients, searchTerm]);

  const handleToggleView = () => {
    setShowAll((current) => !current);
  };

  const handleFormChange = (field, value) => {
    setPatientForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const setPatientDetailRef = (patientId, node) => {
    if (node) {
      patientDetailRefs.current.set(patientId, node);
      return;
    }

    patientDetailRefs.current.delete(patientId);
  };

  const handleEditPatient = (patient) => {
    setEditingPatientId(patient.id);
    setSelectedPatient(patient);
    setPatientForm({
      name: patient.name,
      email: patient.email || '',
      password: '',
      dob: patient.dob || '',
      phone: patient.phone,
      doctor: patient.doctor,
      notes: patient.notes,
    });
    setFeedback(`Editing ${patient.name}. Update details and save changes.`);
    window.requestAnimationFrame(() => {
      const detailPanel = patientDetailRefs.current.get(patient.id);
      detailPanel?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      detailPanel?.querySelector('input, select, textarea')?.focus({ preventScroll: true });
    });
  };

  const handleDeletePatient = async (patientId) => {
    const patientToDelete = patients.find((patient) => patient.id === patientId);

    try {
      await apiCall(`/patients/${patientId}`, { method: 'DELETE' });
      const updatedPatients = patients.filter((patient) => patient.id !== patientId);
        setPatients(updatedPatients);
        setFeedback(`${patientToDelete?.name || 'Patient'} was removed from the list.`);

      if (selectedPatient?.id === patientId) {
        setSelectedPatient(null);
      }

      if (editingPatientId === patientId) {
        setEditingPatientId(null);
        setPatientForm(emptyPatient);
      }
    } catch (error) {
      setFeedback(error.message);
    }
  };

  const handleTogglePatientStatus = async (patient) => {
    const nextStatus = patient.status === 'active' ? 'inactive' : 'active';

    try {
      const updated = await apiCall(`/patients/${patient.id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: nextStatus }),
      });

      setPatients((current) =>
        current.map((item) => (item.id === patient.id ? updated : item))
      );
      setSelectedPatient((current) => (current?.id === patient.id ? updated : current));
      setFeedback(
        nextStatus === 'inactive'
          ? `${updated.name} cannot book appointments.`
          : `${updated.name} can book appointments again. Report count reset to 0.`
      );
    } catch (error) {
      setFeedback(error.message);
    }
  };

  const handleCancelEdit = () => {
    setEditingPatientId(null);
    setPatientForm(emptyPatient);
    setFeedback('Edit cancelled. Patient form reset.');
  };

  const handleSavePatient = async (event) => {
    event.preventDefault();

    if (!editingPatientId) {
      setFeedback('Managers can edit existing patients, but cannot add patient accounts.');
      return;
    }

    const currentPatient = patients.find((item) => item.id === editingPatientId);

    if (!currentPatient) {
      setFeedback('Patient not found. Refresh the list and try again.');
      return;
    }

    const payload = {};
    const nextName = patientForm.name.trim();
    const nextPhone = patientForm.phone.trim();
    const nextDoctor = patientForm.doctor.trim();
    const nextNotes = patientForm.notes.trim();

    if (nextName && nextName !== (currentPatient.name || '')) {
      payload.name = nextName;
    }

    if (nextPhone && nextPhone !== (currentPatient.phone || '')) {
      payload.phone = nextPhone;
    }

    if (patientForm.dob !== (currentPatient.dob || '')) {
      payload.dob = patientForm.dob || null;
    }

    if (nextDoctor !== (currentPatient.doctor || '')) {
      const selectedDoctor = doctors.find((doctor) => doctor.name === nextDoctor);
      payload.assignedDoctorId = selectedDoctor?.id || null;
    }

    if (nextNotes !== (currentPatient.notes || '')) {
      payload.notes = nextNotes;
    }

    if (String(patientForm.password || '').trim()) {
      payload.password = patientForm.password;
    }

    if (!Object.keys(payload).length) {
      setFeedback('No patient changes to save.');
      return;
    }

    try {
      const updated = await apiCall(`/patients/${editingPatientId}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });

      const updatedPatients = patients.map((patient) =>
        patient.id === editingPatientId ? updated : patient
      );
      setPatients(updatedPatients);
      setFeedback(`${updated.name} was updated successfully.`);
      setSelectedPatient(updated);

      setEditingPatientId(null);
      setPatientForm(emptyPatient);
    } catch (error) {
      setFeedback(error.message);
    }
  };

  return (
    <div className="card fade-in-up">
      <div className="card-header">
        <h3>{showAll ? 'All Patients' : 'Recent Patients'}</h3>
        <button type="button" className="btn-primary" onClick={handleToggleView}>
          {showAll ? 'Show Recent' : 'View All'}
        </button>
      </div>

      <div className="action-feedback">{feedback}</div>

      <input
        type="search"
        className="patient-search"
        placeholder="Search patients by name, phone, or doctor"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />

      <div className="patients-list">
        {visiblePatients.map((patient) => (
          <div key={patient.id} className="patient-card-shell">
            <div
              className="patient-card"
              onClick={() => setSelectedPatient((current) => (current?.id === patient.id ? null : patient))}
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  setSelectedPatient((current) => (current?.id === patient.id ? null : patient));
                }
              }}
            >
              <div className="patient-info">
                <div className="patient-avatar">P</div>
                <div>
                  <h4>{patient.name}</h4>
                  <p>
                    {calculateAgeFromDob(patient.dob) ?? patient.age ?? '-'} years | {patient.phone}
                  </p>
                  <div className="patient-report-meta">
                    <span>{patient.reportCount || 0}/3 doctor reports</span>
                  </div>
                </div>
              </div>
              <div className="patient-meta">
                <div className="patient-actions">
                  <button
                    type="button"
                    className="btn-secondary btn-sm"
                    onClick={(event) => {
                      event.stopPropagation();
                      setSelectedPatient((current) => (current?.id === patient.id ? null : patient));
                    }}
                  >
                    {selectedPatient?.id === patient.id ? 'Hide' : 'View'}
                  </button>
                  <button
                    type="button"
                    className="btn-secondary btn-sm"
                    onClick={(event) => {
                      event.stopPropagation();
                      handleEditPatient(patient);
                    }}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className={patient.status === 'active' ? 'btn-danger btn-sm' : 'btn-secondary btn-sm'}
                    onClick={(event) => {
                      event.stopPropagation();
                      handleTogglePatientStatus(patient);
                    }}
                  >
                    {patient.status === 'active' ? 'Restrict' : 'Restore Access'}
                  </button>
                  <button
                    type="button"
                    className="btn-danger btn-sm"
                    onClick={(event) => {
                      event.stopPropagation();
                      handleDeletePatient(patient.id);
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
            {selectedPatient?.id === patient.id && (
              <div
                className={`patient-detail-scroll${editingPatientId === patient.id ? ' patient-detail-scroll-editing' : ''}`}
                ref={(node) => setPatientDetailRef(patient.id, node)}
              >
                {editingPatientId === patient.id ? (
                  <form className="patient-detail-edit-form" onSubmit={handleSavePatient} autoComplete="off">
                    <div className="patient-form-grid">
                      <input
                        type="text"
                        placeholder="Patient Name"
                        value={patientForm.name}
                        onChange={(e) => handleFormChange('name', e.target.value)}
                        autoComplete="off"
                      />
                      <input
                        type="email"
                        placeholder="Email"
                        value={patientForm.email}
                        autoComplete="new-password"
                        disabled
                        readOnly
                      />
                      <input
                        type="password"
                        placeholder="Password (leave blank to keep current)"
                        value={patientForm.password}
                        onChange={(e) => handleFormChange('password', e.target.value)}
                        autoComplete="new-password"
                      />
                      <input
                        type="text"
                        placeholder="Phone"
                        value={patientForm.phone}
                        onChange={(e) => handleFormChange('phone', e.target.value)}
                        autoComplete="off"
                      />
                      <input
                        type="date"
                        value={patientForm.dob}
                        onChange={(e) => handleFormChange('dob', e.target.value)}
                        autoComplete="off"
                      />
                      <input
                        type="text"
                        placeholder="Doctor"
                        value={patientForm.doctor}
                        onChange={(e) => handleFormChange('doctor', e.target.value)}
                        autoComplete="off"
                      />
                      <input
                        type="text"
                        placeholder="Notes"
                        value={patientForm.notes}
                        onChange={(e) => handleFormChange('notes', e.target.value)}
                        autoComplete="off"
                      />
                    </div>
                    <div className="patient-form-actions">
                      <button type="submit" className="btn-primary">
                        Save Patient
                      </button>
                      <button type="button" className="btn-secondary" onClick={handleCancelEdit}>
                        Cancel Edit
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    <div className="detail-grid">
                      <span><strong>Doctor:</strong> {selectedPatient.doctor}</span>
                      <span><strong>Date of birth:</strong> {selectedPatient.dob || '-'}</span>
                      <span><strong>Phone:</strong> {selectedPatient.phone}</span>
                      <span><strong>Age:</strong> {calculateAgeFromDob(selectedPatient.dob) ?? selectedPatient.age ?? '-'}</span>
                      <span><strong>Doctor reports:</strong> {selectedPatient.reportCount || 0}/3</span>
                    </div>
                    <p className="patient-notes">{selectedPatient.notes}</p>
                  </>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {!visiblePatients.length && (
        <div className="empty-state">No patients matched your search.</div>
      )}

    </div>
  );
};

export default PatientsList;
