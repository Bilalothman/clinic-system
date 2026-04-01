import React, { useMemo, useState } from 'react';
import LoadingSpinner from '../../common/LoadingSpinner';
import {
  getDoctorFeesFromStorage,
  saveDoctorFeesToStorage,
  subscribeToDoctorFees,
} from '../../../utils/doctorFeesStore';
import './DoctorsManagement.css';

const initialDoctors = [
  { id: 1, name: 'Dr. John Smith', specialty: 'Cardiology', phone: '+1-234-567-8901', email: 'john.smith@doctor.com', password: 'doctor123', status: 'active' },
  { id: 2, name: 'Dr. Sarah Johnson', specialty: 'Neurology', phone: '+1-234-567-8902', email: 'sarah.johnson@doctor.com', password: 'doctor123', status: 'active' },
  { id: 3, name: 'Dr. Michael Brown', specialty: 'Orthopedics', phone: '+1-234-567-8903', email: 'michael.brown@doctor.com', password: 'doctor123', status: 'inactive' },
];

const emptyDoctor = { name: '', specialty: '', phone: '', email: '', password: '', fee: '' };

const DoctorsManagement = () => {
  const [doctors, setDoctors] = useState(initialDoctors);
  const [doctorFees, setDoctorFees] = useState(() => getDoctorFeesFromStorage());
  const [loading, setLoading] = useState(false);
  const [newDoctor, setNewDoctor] = useState(emptyDoctor);
  const [editingDoctorId, setEditingDoctorId] = useState(null);
  const [feedback, setFeedback] = useState('Manage doctors, update records, or refresh the demo list.');

  React.useEffect(() => {
    const unsubscribe = subscribeToDoctorFees(setDoctorFees);
    return unsubscribe;
  }, []);

  const nextDoctorId = useMemo(
    () => doctors.reduce((maxId, doctor) => Math.max(maxId, doctor.id), 0) + 1,
    [doctors]
  );

  const handleChange = (field, value) => {
    setNewDoctor((current) => ({ ...current, [field]: value }));
  };

  const handleRefresh = () => {
    setDoctors(initialDoctors);
    setNewDoctor(emptyDoctor);
    setEditingDoctorId(null);
    setDoctorFees(getDoctorFeesFromStorage());
    setFeedback('Doctor list refreshed to the default hospital roster.');
  };

  const handleEditDoctor = (doctor) => {
    setEditingDoctorId(doctor.id);
    setNewDoctor({
      name: doctor.name,
      specialty: doctor.specialty,
      phone: doctor.phone,
      email: doctor.email,
      password: doctor.password,
      fee: String(doctorFees[doctor.name] || ''),
    });
    setFeedback(`Editing ${doctor.name}. Update the form and save your changes.`);
  };

  const handleDeleteDoctor = (doctorId) => {
    const doctorToDelete = doctors.find((doctor) => doctor.id === doctorId);
    setDoctors((current) => current.filter((doctor) => doctor.id !== doctorId));

    if (doctorToDelete?.name) {
      const updatedFees = { ...doctorFees };
      delete updatedFees[doctorToDelete.name];
      saveDoctorFeesToStorage(updatedFees);
    }

    setFeedback(`${doctorToDelete?.name || 'Doctor'} was removed from the roster.`);

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

  const handleAddDoctor = (e) => {
    e.preventDefault();
    setLoading(true);

    setTimeout(() => {
      const parsedFee = Number(newDoctor.fee);
      const normalizedFee = Number.isFinite(parsedFee) && parsedFee > 0 ? Math.round(parsedFee) : 0;

      if (editingDoctorId) {
        const editedDoctor = doctors.find((doctor) => doctor.id === editingDoctorId);

        setDoctors((current) =>
          current.map((doctor) =>
            doctor.id === editingDoctorId ? { ...doctor, ...newDoctor } : doctor
          )
        );

        const updatedFees = { ...doctorFees };

        if (editedDoctor?.name && editedDoctor.name !== newDoctor.name) {
          delete updatedFees[editedDoctor.name];
        }

        updatedFees[newDoctor.name] = normalizedFee;
        saveDoctorFeesToStorage(updatedFees);

        setFeedback(`${newDoctor.name} was updated successfully.`);
      } else {
        setDoctors((current) => [
          ...current,
          { ...newDoctor, id: nextDoctorId, status: 'active' },
        ]);
        saveDoctorFeesToStorage({
          ...doctorFees,
          [newDoctor.name]: normalizedFee,
        });
        setFeedback(`${newDoctor.name} was added to the doctor roster.`);
      }

      setNewDoctor(emptyDoctor);
      setEditingDoctorId(null);
      setLoading(false);
    }, 900);
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
                <td><span className="fee-badge">${doctorFees[doctor.name] || 0}</span></td>
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
