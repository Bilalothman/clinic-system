import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { useApi } from '../../../hooks/useApi';
import { DOCTOR_TIME_SLOTS } from '../../../constants/timeSlots';
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

const Appointments = ({ showPendingOnly = false }) => {
  const { user } = useAuth();
  const { apiCall } = useApi();
  const [appointments, setAppointments] = useState([]);
  const [doctorProfile, setDoctorProfile] = useState(null);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [filterDate, setFilterDate] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [newAppointmentForm, setNewAppointmentForm] = useState({
    patientId: '',
    patient: '',
    date: user?.loginDate || getLocalIsoDate(),
    time: DOCTOR_TIME_SLOTS[0],
    duration: '30min',
    specialty: 'General',
    reason: '',
    status: 'confirmed',
  });

  const loadData = async () => {
    try {
      const [doctorRows, appointmentRows] = await Promise.all([
        apiCall('/doctors'),
        apiCall(`/appointments?doctorId=${user?.userId || ''}`),
      ]);

      const me = (doctorRows || []).find((doctor) => String(doctor.id) === String(user?.userId));
      setDoctorProfile(me || null);
      setAppointments(appointmentRows || []);
    } catch (error) {
      setFeedback(error.message);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.userId]);

  const filteredAppointments = useMemo(() => {
    const scopedAppointments = showPendingOnly
      ? appointments.filter((appointment) => appointment.status === 'pending')
      : appointments;

    if (!filterDate) {
      return scopedAppointments;
    }

    return scopedAppointments.filter((appointment) => appointment.date === filterDate || appointment.status === 'pending');
  }, [appointments, filterDate, showPendingOnly]);

  useEffect(() => {
    if (!filteredAppointments.length) {
      setSelectedAppointment(null);
      return;
    }

    if (!selectedAppointment || !filteredAppointments.some((appointment) => appointment.id === selectedAppointment.id)) {
      setSelectedAppointment(filteredAppointments[0]);
      return;
    }

    setSelectedAppointment(
      filteredAppointments.find((appointment) => appointment.id === selectedAppointment.id) || filteredAppointments[0]
    );
  }, [filteredAppointments, selectedAppointment]);

  const getAvailabilityState = (appointment) => {
    const days = doctorProfile?.availableDays || [];
    const times = doctorProfile?.availableTimes || [];
    const weekday = getWeekdayFromDate(appointment?.date);
    const inDay = days.includes(weekday);
    const inTime = times.includes(appointment?.time);

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
      time: DOCTOR_TIME_SLOTS[0],
      duration: '30min',
      specialty: doctorProfile?.specialty || 'General',
      reason: '',
      status: 'confirmed',
    });
  };

  const handleNewAppointment = async (event) => {
    event.preventDefault();

    try {
      const created = await apiCall('/appointments', {
        method: 'POST',
        body: JSON.stringify({
          patientId: newAppointmentForm.patientId.trim() || null,
          patient: newAppointmentForm.patient.trim(),
          doctorId: Number(user?.userId),
          specialty: newAppointmentForm.specialty,
          date: newAppointmentForm.date,
          time: newAppointmentForm.time,
          status: newAppointmentForm.status,
          duration: newAppointmentForm.duration,
          reason: newAppointmentForm.reason.trim(),
        }),
      });

      setAppointments((current) => [created, ...current]);
      setSelectedAppointment(created);
      setFilterDate(created.date);
      setShowCreateForm(false);
      resetCreateForm();
      setFeedback(`Appointment added for ${created.patient} on ${created.date} at ${created.time}.`);
    } catch (error) {
      setFeedback(error.message);
    }
  };

  const handleStatusChange = async (appointmentId, status) => {
    const current = appointments.find((appointment) => appointment.id === appointmentId);
    if (current && (current.status === 'confirmed' || current.status === 'cancelled')) {
      setFeedback(`This appointment is already ${current.status}. Decision is locked.`);
      return;
    }

    try {
      const updated = await apiCall(`/appointments/${appointmentId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });

      setAppointments((current) => current.map((appointment) => (appointment.id === appointmentId ? updated : appointment)));
      setSelectedAppointment(updated);
      setFeedback(`Appointment status updated to ${status}.`);
    } catch (error) {
      setFeedback(error.message);
    }
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
                {DOCTOR_TIME_SLOTS.map((timeSlot) => (
                  <option key={timeSlot} value={timeSlot}>
                    {timeSlot}
                  </option>
                ))}
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
            <div className="appointment-side">
              <span className={`status-badge ${appointment.status}`}>{appointment.status}</span>
              <div className="appointment-actions">
                <button
                  type="button"
                  className="btn-primary btn-sm"
                  disabled={appointment.status !== 'pending'}
                  onClick={(event) => {
                    event.stopPropagation();
                    if (appointment.status === 'pending') {
                      handleStatusChange(appointment.id, 'confirmed');
                    }
                  }}
                >
                  Accept
                </button>
                <button
                  type="button"
                  className="btn-secondary btn-sm"
                  disabled={appointment.status !== 'pending'}
                  onClick={(event) => {
                    event.stopPropagation();
                    if (appointment.status === 'pending') {
                      handleStatusChange(appointment.id, 'cancelled');
                    }
                  }}
                >
                  Reject
                </button>
              </div>
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

          <div className="action-feedback">
            {selectedAppointment.status === 'pending'
              ? 'Use the Accept/Reject buttons on this appointment card.'
              : selectedAppointment.status === 'confirmed'
                ? 'Appointment accepted. Decision is locked.'
                : 'Appointment rejected. Decision is locked.'}
          </div>

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
