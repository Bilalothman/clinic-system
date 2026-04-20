import React, { useEffect, useMemo, useState } from 'react';
import LoadingSpinner from '../../common/LoadingSpinner';
import { useApi } from '../../../hooks/useApi';
import './DoctorsManagement.css';

const emptyDoctor = { name: '', specialty: '', phone: '', email: '', password: '', fee: '' };

const DoctorsManagement = () => {
  const { apiCall } = useApi();
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newDoctor, setNewDoctor] = useState(emptyDoctor);
  const [editingDoctorId, setEditingDoctorId] = useState(null);
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

  const handleRefresh = async () => {
    await loadDoctors();
    setNewDoctor(emptyDoctor);
    setEditingDoctorId(null);
    setFeedback('Doctor list refreshed.');
  };

  const handleEditDoctor = (doctor) => {
    setEditingDoctorId(doctor.id);
    setNewDoctor({
      name: doctor.name,
      specialty: doctor.specialty,
      phone: doctor.phone,
      email: doctor.email,
      password: doctor.password,
      fee: String(doctor.fee || ''),
    });
    setFeedback(`Editing ${doctor.name}. Update the form and save your changes.`);
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
    setFeedback('Edit cancelled. The add doctor form is ready again.');
  };

  const handleAddDoctor = async (e) => {
    e.preventDefault();
    setLoading(true);

    const payload = {
      ...newDoctor,
      fee: Number(newDoctor.fee || 0),
    };

    try {
      if (editingDoctorId) {
        const updated = await apiCall(`/doctors/${editingDoctorId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });

        setDoctors((current) => current.map((doctor) => (doctor.id === editingDoctorId ? updated : doctor)));
        setFeedback(`${updated.name} was updated successfully.`);
      } else {
        const created = await apiCall('/doctors', {
          method: 'POST',
          body: JSON.stringify(payload),
        });

        setDoctors((current) => [
          ...current,
          { ...created, id: created.id || nextDoctorId },
        ]);
        setFeedback(`${payload.name} was added to the doctor roster.`);
      }

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

      <form onSubmit={handleAddDoctor} className="add-doctor-form">
        <div className="form-grid">
          <input placeholder="Doctor Name" value={newDoctor.name} onChange={(e) => handleChange('name', e.target.value)} required />
          <input placeholder="Specialty" value={newDoctor.specialty} onChange={(e) => handleChange('specialty', e.target.value)} required />
          <input placeholder="Phone" value={newDoctor.phone} onChange={(e) => handleChange('phone', e.target.value)} required />
          <input type="email" placeholder="Email" value={newDoctor.email} onChange={(e) => handleChange('email', e.target.value)} required />
          <input type="password" placeholder="Password" value={newDoctor.password} onChange={(e) => handleChange('password', e.target.value)} required />
          <input type="number" min="1" placeholder="Consultation Fee" value={newDoctor.fee} onChange={(e) => handleChange('fee', e.target.value)} required />
        </div>

        <div className="form-actions">
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? <LoadingSpinner /> : editingDoctorId ? 'Save Doctor' : '+ Add Doctor'}
          </button>
          {editingDoctorId && (
            <button type="button" className="btn-secondary" onClick={handleCancelEdit}>
              Cancel Edit
            </button>
          )}
        </div>
      </form>

      <div className="table-container">
        <table className="management-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Specialty</th>
              <th>Phone</th>
              <th>Fee</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {doctors.map((doctor) => (
              <tr key={doctor.id} className="table-row">
                <td>{doctor.name}</td>
                <td><span className="specialty-badge">{doctor.specialty}</span></td>
                <td>{doctor.phone}</td>
                <td><span className="fee-badge">${doctor.fee || 0}</span></td>
                <td><span className={`status-badge ${doctor.status}`}>{doctor.status}</span></td>
                <td>
                  <button type="button" className="btn-secondary btn-sm" onClick={() => handleEditDoctor(doctor)}>
                    Edit
                  </button>
                  <button type="button" className="btn-danger btn-sm" onClick={() => handleDeleteDoctor(doctor.id)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DoctorsManagement;
