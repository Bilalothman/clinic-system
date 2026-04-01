import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import {
  getAppointmentsFromStorage,
  saveAppointmentsToStorage,
  subscribeToAppointments,
} from '../../../utils/appointmentsStore';
import {
  getDoctorAvailabilityFromStorage,
  subscribeToDoctorAvailability,
} from '../../../utils/doctorAvailabilityStore';
import './Appointments.css';

const getLocalIsoDate = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getWeekdayFromDate = (dateString) => {
  if (!dateString) {
    return '-';
  }

  const date = new Date(`${dateString}T00:00:00`);
  return date.toLocaleDateString('en-US', { weekday: 'long' });
};

const Appointments = () => {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState(() => getAppointmentsFromStorage());
  const [doctorAvailability, setDoctorAvailability] = useState(() => getDoctorAvailabilityFromStorage());
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [filterDate, setFilterDate] = useState(() => user?.loginDate || getLocalIsoDate());
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [newAppointmentForm, setNewAppointmentForm] = useState({
    patientId: '',
    patient: '',
    date: user?.loginDate || getLocalIsoDate(),
    time: '09:00 AM',
    duration: '30min',
    specialty: 'General',
    reason: '',
    status: 'confirmed',
  });

  useEffect(() => {
    const unsubscribe = subscribeToAppointments(setAppointments);
    return unsubscribe;
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToDoctorAvailability(setDoctorAvailability);
    return unsubscribe;
  }, []);

  const filteredAppointments = useMemo(() => {
    if (!filterDate) {
      return appointments;
    }

    return appointments.filter((appointment) => appointment.date === filterDate);
  }, [appointments, filterDate]);

  useEffect(() => {
    if (!filteredAppointments.length) {
      setSelectedAppointment(null);
      return;
    }

    if (
      !selectedAppointment ||
      !filteredAppointments.some((appointment) => appointment.id === selectedAppointment.id)
    ) {
      setSelectedAppointment(filteredAppointments[0]);
      return;
    }

    setSelectedAppointment(
      filteredAppointments.find((appointment) => appointment.id === selectedAppointment.id) || filteredAppointments[0]
    );
  }, [filteredAppointments, selectedAppointment]);

  const nextId = useMemo(
    () => appointments.reduce((maxId, appointment) => Math.max(maxId, appointment.id), 0) + 1,
    [appointments]
  );

  const getAvailabilityState = (appointment) => {
    const doctorName = appointment?.doctor || user?.profile?.name || 'Dr. John Smith';
    const schedule = doctorAvailability[doctorName] || { days: [], times: [] };
    const weekday = getWeekdayFromDate(appointment?.date);
    const inDay = schedule.days.includes(weekday);
    const inTime = schedule.times.includes(appointment?.time);

    return {
      isAvailable: inDay && inTime,
      text: inDay && inTime
        ? `Available in clinic hours (${weekday}, ${appointment?.time}).`
        : `Outside clinic availability (${weekday}, ${appointment?.time}).`,
    };
  };

  const handleFormChange = (field, value) => {
    setNewAppointmentForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const resetCreateForm = () => {
    setNewAppointmentForm({
      patientId: '',
      patient: '',
      date: filterDate || user?.loginDate || getLocalIsoDate(),
      time: '09:00 AM',
      duration: '30min',
      specialty: 'General',
      reason: '',
      status: 'confirmed',
    });
  };

  const handleNewAppointment = (event) => {
    event.preventDefault();

    const doctorName = user?.profile?.name || 'Dr. Smith';
    const patientName = newAppointmentForm.patient.trim();
    const patientId = newAppointmentForm.patientId.trim() || String(1000 + nextId);

    const newAppointment = {
      id: nextId,
      patientId,
      patient: patientName,
      doctor: doctorName,
      specialty: newAppointmentForm.specialty,
      date: newAppointmentForm.date,
      time: newAppointmentForm.time,
      status: newAppointmentForm.status,
      duration: newAppointmentForm.duration,
      reason: newAppointmentForm.reason.trim(),
      preFeeImage: '',
      preFeeImageName: '',
    };

    const updatedAppointments = [newAppointment, ...appointments];
    const saveResult = saveAppointmentsToStorage(updatedAppointments);

    if (!saveResult.ok) {
      setFeedback(saveResult.message);
      return;
    }

    setAppointments(updatedAppointments);
    setSelectedAppointment(newAppointment);
    setFilterDate(newAppointment.date);
    setShowCreateForm(false);
    resetCreateForm();
    setFeedback(`Appointment added for ${newAppointment.patient} on ${newAppointment.date} at ${newAppointment.time}.`);
  };

  const handleStatusChange = (appointmentId, status) => {
    let updatedSelected = null;

    const updatedAppointments = appointments.map((appointment) => {
      if (appointment.id !== appointmentId) {
        return appointment;
      }

      updatedSelected = { ...appointment, status };
      return updatedSelected;
    });

    const saveResult = saveAppointmentsToStorage(updatedAppointments);

    if (!saveResult.ok) {
      setFeedback(saveResult.message);
      return;
    }

    setAppointments(updatedAppointments);
    setSelectedAppointment(updatedSelected || selectedAppointment);
    setFeedback(`Appointment status updated to ${status}.`);
  };

  return (
    <div className="card fade-in-up">
      <div className="card-header">
        <h3>Today's Appointments</h3>
        <button type="button" className="btn-primary" onClick={() => setShowCreateForm((current) => !current)}>
          {showCreateForm ? 'Close Form' : '+ New Appointment'}
        </button>
      </div>

      {showCreateForm && (
        <form className="create-appointment-form" onSubmit={handleNewAppointment}>
          <div className="create-grid">
            <div className="create-field">
              <label htmlFor="patient-name">Patient Name</label>
              <input
                id="patient-name"
                type="text"
                value={newAppointmentForm.patient}
                onChange={(e) => handleFormChange('patient', e.target.value)}
                placeholder="Enter patient full name"
                required
              />
            </div>

            <div className="create-field">
              <label htmlFor="patient-id">Patient Account ID</label>
              <input
                id="patient-id"
                type="text"
                value={newAppointmentForm.patientId}
                onChange={(e) => handleFormChange('patientId', e.target.value)}
                placeholder="Optional account ID"
              />
            </div>

            <div className="create-field">
              <label htmlFor="appointment-date">Date</label>
              <input
                id="appointment-date"
                type="date"
                value={newAppointmentForm.date}
                onChange={(e) => handleFormChange('date', e.target.value)}
                required
              />
            </div>

            <div className="create-field">
              <label htmlFor="appointment-time">Time</label>
              <select
                id="appointment-time"
                value={newAppointmentForm.time}
                onChange={(e) => handleFormChange('time', e.target.value)}
              >
                <option value="09:00 AM">09:00 AM</option>
                <option value="10:30 AM">10:30 AM</option>
                <option value="01:00 PM">01:00 PM</option>
                <option value="03:00 PM">03:00 PM</option>
                <option value="04:30 PM">04:30 PM</option>
              </select>
            </div>

            <div className="create-field">
              <label htmlFor="appointment-duration">Duration</label>
              <select
                id="appointment-duration"
                value={newAppointmentForm.duration}
                onChange={(e) => handleFormChange('duration', e.target.value)}
              >
                <option value="15min">15min</option>
                <option value="30min">30min</option>
                <option value="45min">45min</option>
                <option value="60min">60min</option>
              </select>
            </div>

            <div className="create-field">
              <label htmlFor="appointment-specialty">Specialty</label>
              <input
                id="appointment-specialty"
                type="text"
                value={newAppointmentForm.specialty}
                onChange={(e) => handleFormChange('specialty', e.target.value)}
                required
              />
            </div>

            <div className="create-field">
              <label htmlFor="appointment-status">Status</label>
              <select
                id="appointment-status"
                value={newAppointmentForm.status}
                onChange={(e) => handleFormChange('status', e.target.value)}
              >
                <option value="confirmed">confirmed</option>
                <option value="pending">pending</option>
              </select>
            </div>
          </div>

          <div className="create-field">
            <label htmlFor="appointment-reason">Reason</label>
            <textarea
              id="appointment-reason"
              rows="3"
              value={newAppointmentForm.reason}
              onChange={(e) => handleFormChange('reason', e.target.value)}
              placeholder="Reason for the visit"
              required
            />
          </div>

          <button type="submit" className="btn-primary">
            Save Appointment
          </button>
        </form>
      )}

      <div className="appointments-filter">
        <label htmlFor="appointments-date-filter">Filter by calendar date</label>
        <input
          id="appointments-date-filter"
          type="date"
          value={filterDate}
          onChange={(e) => setFilterDate(e.target.value)}
        />
        {filterDate && (
          <button type="button" className="btn-secondary" onClick={() => setFilterDate('')}>
            Clear
          </button>
        )}
      </div>

      <div className="action-feedback">
        {feedback || (selectedAppointment
          ? `${selectedAppointment.patient} is selected. Status: ${selectedAppointment.status}.`
          : 'Select an appointment to inspect the details.')}
      </div>

      <div className="appointments-list">
        {filteredAppointments.map((appointment) => (
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
              <div className="appointment-meta">
                {appointment.date} ({getWeekdayFromDate(appointment.date)}) | {appointment.specialty}
              </div>
            </div>
            <div className="appointment-status">
              <span className={`status-badge ${appointment.status}`}>{appointment.status}</span>
            </div>
          </div>
        ))}
      </div>

      {!filteredAppointments.length && (
        <div className="empty-state">No appointments found for this date.</div>
      )}

      {selectedAppointment && (
        <div className="detail-panel">
          <h4>Appointment Details</h4>
          <div className="detail-grid">
            <span><strong>Patient:</strong> {selectedAppointment.patient}</span>
            <span><strong>Doctor:</strong> {selectedAppointment.doctor}</span>
            <span><strong>Date:</strong> {selectedAppointment.date}</span>
            <span><strong>Day:</strong> {getWeekdayFromDate(selectedAppointment.date)}</span>
            <span><strong>Time:</strong> {selectedAppointment.time}</span>
            <span><strong>Duration:</strong> {selectedAppointment.duration}</span>
            <span><strong>Status:</strong> {selectedAppointment.status}</span>
          </div>
          <p className="appointment-reason"><strong>Reason:</strong> {selectedAppointment.reason}</p>
          <div className={`availability-status ${getAvailabilityState(selectedAppointment).isAvailable ? 'available' : 'unavailable'}`}>
            {getAvailabilityState(selectedAppointment).text}
          </div>

          {selectedAppointment.status === 'pending' && (
            <div className="detail-actions">
              <button
                type="button"
                className="btn-primary"
                onClick={() => handleStatusChange(selectedAppointment.id, 'confirmed')}
              >
                Accept Appointment
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => handleStatusChange(selectedAppointment.id, 'cancelled')}
              >
                Reject Appointment
              </button>
            </div>
          )}

          {selectedAppointment.preFeeImage && (
            <div className="pre-fee-preview">
              <h5>Pre-fee Image</h5>
              <img src={selectedAppointment.preFeeImage} alt="Pre-fee proof" />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Appointments;
