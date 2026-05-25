import React, { useEffect, useMemo, useRef, useState } from 'react';
import LoadingSpinner from '../../common/LoadingSpinner';
import { useApi } from '../../../hooks/useApi';
import './DoctorsManagement.css';

const emptyDoctor = { name: '', specialty: '', phone: '', email: '', password: '', fee: '' };

const DoctorsManagement = () => {
  const { apiCall } = useApi();
  const doctorEditRefs = useRef(new Map());
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newDoctor, setNewDoctor] = useState(emptyDoctor);
  const [editingDoctorId, setEditingDoctorId] = useState(null);
  const [doctorVerification, setDoctorVerification] = useState(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [feedback, setFeedback] = useState('Manage doctors, update records, or refresh the list.');

  const loadDoctors = async () => {
    try {
      const rows = await apiCall('/doctors');
      setDoctors(rows || []);
    } catch (error) {
      setFeedback(error.message);
    }
  };

  useEffect(() => {
    loadDoctors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const nextDoctorId = useMemo(
    () => doctors.reduce((maxId, doctor) => Math.max(maxId, doctor.id), 0) + 1,
    [doctors]
  );

  const handleChange = (field, value) => {
    setNewDoctor((current) => ({ ...current, [field]: value }));
  };

  const setDoctorEditRef = (doctorId, node) => {
    if (node) {
      doctorEditRefs.current.set(doctorId, node);
      return;
    }

    doctorEditRefs.current.delete(doctorId);
  };

  const handleRefresh = async () => {
    await loadDoctors();
    setNewDoctor(emptyDoctor);
    setEditingDoctorId(null);
    setDoctorVerification(null);
    setVerificationCode('');
    setFeedback('Doctor list refreshed.');
  };

  const handleEditDoctor = (doctor) => {
    setEditingDoctorId(doctor.id);
    setDoctorVerification(null);
    setVerificationCode('');
    setNewDoctor({
      name: doctor.name,
      specialty: doctor.specialty,
      phone: doctor.phone,
      email: doctor.email,
      password: '',
      fee: String(doctor.fee || ''),
    });
    setFeedback(`Editing ${doctor.name}. Update the form and save your changes.`);
    window.requestAnimationFrame(() => {
      const editPanel = doctorEditRefs.current.get(doctor.id);
      editPanel?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      editPanel?.querySelector('input')?.focus({ preventScroll: true });
    });
  };

  const handleDeleteDoctor = async (doctorId) => {
    const doctorToDelete = doctors.find((doctor) => doctor.id === doctorId);

    try {
      await apiCall(`/doctors/${doctorId}`, { method: 'DELETE' });
      setDoctors((current) => current.filter((doctor) => doctor.id !== doctorId));
      setFeedback(`${doctorToDelete?.name || 'Doctor'} was removed from the roster.`);
    } catch (error) {
      setFeedback(error.message);
    }

    if (editingDoctorId === doctorId) {
      setEditingDoctorId(null);
      setNewDoctor(emptyDoctor);
    }
  };

  const handleCancelEdit = () => {
    setEditingDoctorId(null);
    setNewDoctor(emptyDoctor);
    setDoctorVerification(null);
    setVerificationCode('');
    setFeedback('Edit cancelled. The add doctor form is ready again.');
  };

  const handleCancelVerification = () => {
    setDoctorVerification(null);
    setVerificationCode('');
    setFeedback('Doctor verification cancelled. No doctor account was created.');
  };

  const handleAddDoctor = async (e) => {
    e.preventDefault();
    setLoading(true);

    const payload = {
      ...newDoctor,
      fee: Number(newDoctor.fee || 0),
    };

    try {
      const result = await apiCall('/doctors', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      setDoctorVerification({
        token: result.verificationToken,
        email: result.email,
        name: payload.name,
      });
      setVerificationCode('');
      setFeedback(result.message || `Verification code sent to ${result.email}.`);
    } catch (error) {
      setFeedback(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDoctorEdit = async (event) => {
    event.preventDefault();

    const currentDoctor = doctors.find((doctor) => doctor.id === editingDoctorId);
    if (!currentDoctor) {
      setFeedback('Doctor not found. Refresh the list and try again.');
      return;
    }

    const payload = {};
    const nextName = newDoctor.name.trim();
    const nextSpecialty = newDoctor.specialty.trim();
    const nextPhone = newDoctor.phone.trim();
    const nextFee = Number(newDoctor.fee);

    if (nextName && nextName !== (currentDoctor.name || '')) {
      payload.name = nextName;
    }

    if (nextSpecialty && nextSpecialty !== (currentDoctor.specialty || '')) {
      payload.specialty = nextSpecialty;
    }

    if (nextPhone && nextPhone !== (currentDoctor.phone || '')) {
      payload.phone = nextPhone;
    }

    if (Number.isFinite(nextFee) && nextFee !== Number(currentDoctor.fee || 0)) {
      payload.fee = nextFee;
    }

    if (String(newDoctor.password || '').trim()) {
      payload.password = newDoctor.password;
    }

    if (!Object.keys(payload).length) {
      setFeedback('No doctor changes to save.');
      return;
    }

    setLoading(true);

    try {
      const updated = await apiCall(`/doctors/${editingDoctorId}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });

      setDoctors((current) => current.map((doctor) => (doctor.id === editingDoctorId ? updated : doctor)));
      setFeedback(`${updated.name} was updated successfully.`);
      setNewDoctor(emptyDoctor);
      setEditingDoctorId(null);
    } catch (error) {
      setFeedback(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyDoctor = async (event) => {
    event.preventDefault();

    if (!doctorVerification?.token) {
      setFeedback('Please request a doctor verification code first.');
      return;
    }

    setLoading(true);

    try {
      const created = await apiCall('/doctors/verify', {
        method: 'POST',
        body: JSON.stringify({
          verificationToken: doctorVerification.token,
          code: verificationCode,
        }),
      });

      setDoctors((current) => [
        ...current,
        { ...created, id: created.id || nextDoctorId },
      ]);
      setFeedback(`${created.name} was verified and added to the doctor roster.`);
      setDoctorVerification(null);
      setVerificationCode('');
      setNewDoctor(emptyDoctor);
      setEditingDoctorId(null);
    } catch (error) {
      setFeedback(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card fade-in-left">
      <div className="card-header">
        <h3>Doctors Management</h3>
        <button type="button" className="btn-primary" onClick={handleRefresh}>
          Refresh
        </button>
      </div>

      <div className="action-feedback">{feedback}</div>

      {!editingDoctorId && (
        <form onSubmit={handleAddDoctor} className="add-doctor-form" autoComplete="off">
          <div className="form-grid">
            <input autoComplete="off" placeholder="Doctor Name" value={newDoctor.name} onChange={(e) => handleChange('name', e.target.value)} required />
            <input autoComplete="off" placeholder="Specialty" value={newDoctor.specialty} onChange={(e) => handleChange('specialty', e.target.value)} required />
            <input autoComplete="off" placeholder="Phone" value={newDoctor.phone} onChange={(e) => handleChange('phone', e.target.value)} required />
            <input autoComplete="new-password" type="email" placeholder="Email" value={newDoctor.email} onChange={(e) => handleChange('email', e.target.value)} required />
            <input autoComplete="new-password" type="password" placeholder="Password" value={newDoctor.password} onChange={(e) => handleChange('password', e.target.value)} required />
            <input autoComplete="off" type="number" min="1" placeholder="Consultation Fee" value={newDoctor.fee} onChange={(e) => handleChange('fee', e.target.value)} required />
          </div>

          <div className="form-actions">
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? <LoadingSpinner /> : 'Send Verification Code'}
            </button>
          </div>
        </form>
      )}

      {doctorVerification && (
        <form className="doctor-verification-form" onSubmit={handleVerifyDoctor} autoComplete="off">
          <div>
            <h4>Verify Doctor Email</h4>
            <p>Enter the 6-digit code sent to {doctorVerification.email}.</p>
          </div>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]{6}"
            maxLength="6"
            placeholder="Verification Code"
            value={verificationCode}
            onChange={(event) => setVerificationCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
            required
          />
          <div className="form-actions">
            <button type="submit" className="btn-primary" disabled={loading || verificationCode.length !== 6}>
              {loading ? <LoadingSpinner /> : 'Verify And Add Doctor'}
            </button>
            <button type="button" className="btn-secondary" onClick={handleCancelVerification}>
              Cancel Verification
            </button>
          </div>
        </form>
      )}

      <div className="table-container">
        <table className="management-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Specialty</th>
              <th>Phone</th>
              <th>Fee</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {doctors.map((doctor) => (
              <React.Fragment key={doctor.id}>
                <tr className="table-row">
                  <td>{doctor.name}</td>
                  <td><span className="specialty-badge">{doctor.specialty}</span></td>
                  <td>{doctor.phone}</td>
                  <td><span className="fee-badge">${doctor.fee || 0}</span></td>
                  <td>
                    <button type="button" className="btn-secondary btn-sm" onClick={() => handleEditDoctor(doctor)}>
                      Edit
                    </button>
                    <button type="button" className="btn-danger btn-sm" onClick={() => handleDeleteDoctor(doctor.id)}>
                      Delete
                    </button>
                  </td>
                </tr>
                {editingDoctorId === doctor.id && (
                  <tr className="doctor-edit-row">
                    <td colSpan="5">
                      <form
                        className="doctor-inline-edit-form"
                        onSubmit={handleSaveDoctorEdit}
                        autoComplete="off"
                        ref={(node) => setDoctorEditRef(doctor.id, node)}
                      >
                        <div className="form-grid">
                          <input autoComplete="off" placeholder="Doctor Name" value={newDoctor.name} onChange={(e) => handleChange('name', e.target.value)} />
                          <input autoComplete="off" placeholder="Specialty" value={newDoctor.specialty} onChange={(e) => handleChange('specialty', e.target.value)} />
                          <input autoComplete="off" placeholder="Phone" value={newDoctor.phone} onChange={(e) => handleChange('phone', e.target.value)} />
                          <input autoComplete="new-password" type="email" placeholder="Email" value={newDoctor.email} disabled readOnly />
                          <input autoComplete="new-password" type="password" placeholder="Password (leave blank to keep current)" value={newDoctor.password} onChange={(e) => handleChange('password', e.target.value)} />
                          <input autoComplete="off" type="number" min="0" placeholder="Consultation Fee" value={newDoctor.fee} onChange={(e) => handleChange('fee', e.target.value)} />
                        </div>
                        <div className="form-actions">
                          <button type="submit" className="btn-primary" disabled={loading}>
                            {loading ? <LoadingSpinner /> : 'Save Doctor'}
                          </button>
                          <button type="button" className="btn-secondary" onClick={handleCancelEdit}>
                            Cancel Edit
                          </button>
                        </div>
                      </form>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DoctorsManagement;
