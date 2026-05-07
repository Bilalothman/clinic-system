import React, { useEffect, useMemo, useState } from 'react';
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

  const handleEditPatient = (patient) => {
    setEditingPatientId(patient.id);
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

    const selectedDoctor = doctors.find((doctor) => doctor.name === patientForm.doctor);
    const normalizedPatient = {
      ...patientForm,
      name: patientForm.name.trim(),
      email: patientForm.email.trim(),
      notes: patientForm.notes.trim(),
      assignedDoctorId: selectedDoctor?.id || null,
    };

    try {
      if (editingPatientId) {
        const payload = {
          ...normalizedPatient,
          email: normalizedPatient.email || (patients.find((item) => item.id === editingPatientId)?.email || undefined),
        };

        if (!String(normalizedPatient.password || '').trim()) {
          delete payload.password;
        }

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
      } else {
        const created = await apiCall('/patients', {
          method: 'POST',
          body: JSON.stringify(normalizedPatient),
        });

        const withId = { ...created, id: created.id || nextPatientId, lastVisit: created.lastVisit || 'N/A' };
        setPatients((current) => [withId, ...current]);
        setFeedback(`${withId.name} was added to patient records.`);
        setSelectedPatient(withId);
      }

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

      <form className="patient-form" onSubmit={handleSavePatient} autoComplete="off">
        <div className="patient-form-grid">
          <input
            type="text"
            placeholder="Patient Name"
            value={patientForm.name}
            onChange={(e) => handleFormChange('name', e.target.value)}
            autoComplete="off"
            required
          />
          <input
            type="email"
            placeholder="Email"
            value={patientForm.email}
            onChange={(e) => handleFormChange('email', e.target.value)}
            autoComplete="new-password"
            required
          />
          <input
            type="password"
            placeholder={editingPatientId ? 'Password (leave blank to keep current)' : 'Password'}
            value={patientForm.password}
            onChange={(e) => handleFormChange('password', e.target.value)}
            autoComplete="new-password"
            required={!editingPatientId}
          />
          <input
            type="text"
            placeholder="Phone"
            value={patientForm.phone}
            onChange={(e) => handleFormChange('phone', e.target.value)}
            autoComplete="off"
            required
          />
          <input
            type="date"
            value={patientForm.dob}
            onChange={(e) => handleFormChange('dob', e.target.value)}
            autoComplete="off"
            required
          />
          <input
            type="text"
            placeholder="Doctor"
            value={patientForm.doctor}
            onChange={(e) => handleFormChange('doctor', e.target.value)}
            autoComplete="off"
            required
          />
          <input
            type="text"
            placeholder="Notes"
            value={patientForm.notes}
            onChange={(e) => handleFormChange('notes', e.target.value)}
            autoComplete="off"
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
              <div className="patient-detail-scroll">
                <div className="detail-grid">
                  <span><strong>Doctor:</strong> {selectedPatient.doctor}</span>
                  <span><strong>Date of birth:</strong> {selectedPatient.dob || '-'}</span>
                  <span><strong>Phone:</strong> {selectedPatient.phone}</span>
                  <span><strong>Age:</strong> {calculateAgeFromDob(selectedPatient.dob) ?? selectedPatient.age ?? '-'}</span>
                  <span><strong>Doctor reports:</strong> {selectedPatient.reportCount || 0}/3</span>
                </div>
                <p className="patient-notes">{selectedPatient.notes}</p>
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
