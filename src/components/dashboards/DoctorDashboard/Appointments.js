import React, { useMemo, useState } from 'react';
import './Appointments.css';

const initialAppointments = [
  { id: 1, patient: 'Alice Johnson', time: '09:00 AM', status: 'confirmed', duration: '30min' },
  { id: 2, patient: 'Bob Wilson', time: '10:30 AM', status: 'pending', duration: '45min' },
  { id: 3, patient: 'Carol Davis', time: '02:00 PM', status: 'confirmed', duration: '30min' },
  { id: 4, patient: 'David Lee', time: '03:30 PM', status: 'cancelled', duration: '30min' },
];

const Appointments = () => {
  const [appointments, setAppointments] = useState(initialAppointments);
  const [selectedAppointment, setSelectedAppointment] = useState(initialAppointments[0]);

  const nextId = useMemo(
    () => appointments.reduce((maxId, appointment) => Math.max(maxId, appointment.id), 0) + 1,
    [appointments]
  );

  const handleNewAppointment = () => {
    const newAppointment = {
      id: nextId,
      patient: `New Patient ${nextId}`,
      time: '04:30 PM',
      status: 'pending',
      duration: '30min',
    };

    setAppointments((current) => [newAppointment, ...current]);
    setSelectedAppointment(newAppointment);
  };

  return (
    <div className="card fade-in-up">
      <div className="card-header">
        <h3>Today's Appointments</h3>
        <button type="button" className="btn-primary" onClick={handleNewAppointment}>
          + New Appointment
        </button>
      </div>

      <div className="action-feedback">
        {selectedAppointment
          ? `${selectedAppointment.patient} is selected. Status: ${selectedAppointment.status}.`
          : 'Select an appointment to inspect the details.'}
      </div>

      <div className="appointments-list">
        {appointments.map((appointment) => (
          <div
            key={appointment.id}
            className={`appointment-card ${appointment.status} ${selectedAppointment?.id === appointment.id ? 'selected' : ''}`}
            onClick={() => setSelectedAppointment(appointment)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                setSelectedAppointment(appointment);
              }
            }}
          >
            <div className="appointment-time">{appointment.time}</div>
            <div className="appointment-details">
              <h4>{appointment.patient}</h4>
              <span className="duration">{appointment.duration}</span>
            </div>
            <div className="appointment-status">
              <span className={`status-badge ${appointment.status}`}>{appointment.status}</span>
            </div>
          </div>
        ))}
      </div>

      {selectedAppointment && (
        <div className="detail-panel">
          <h4>Appointment Details</h4>
          <div className="detail-grid">
            <span><strong>Patient:</strong> {selectedAppointment.patient}</span>
            <span><strong>Time:</strong> {selectedAppointment.time}</span>
            <span><strong>Duration:</strong> {selectedAppointment.duration}</span>
            <span><strong>Status:</strong> {selectedAppointment.status}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default Appointments;
