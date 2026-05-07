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

const escapeExcelValue = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const getAppointmentDateTime = (dateString, timeString) => {
  if (!dateString || !timeString) {
    return null;
  }

  const dateParts = dateString.split('-').map(Number);
  const timeMatch = String(timeString).trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);

  if (dateParts.length !== 3 || dateParts.some((part) => !Number.isFinite(part)) || !timeMatch) {
    return null;
  }

  let hours = Number(timeMatch[1]);
  const minutes = Number(timeMatch[2]);
  const meridiem = timeMatch[3]?.toUpperCase();

  if (meridiem === 'PM' && hours < 12) {
    hours += 12;
  }

  if (meridiem === 'AM' && hours === 12) {
    hours = 0;
  }

  return new Date(dateParts[0], dateParts[1] - 1, dateParts[2], hours, minutes);
};

const isAppointmentImplemented = (appointment, currentDateTime) => {
  const appointmentDateTime = getAppointmentDateTime(appointment.date, appointment.time);
  return appointment.status === 'confirmed' && appointmentDateTime && appointmentDateTime <= currentDateTime;
};

const Appointments = ({ showPendingOnly = false }) => {
  const { user } = useAuth();
  const { apiCall } = useApi();
  const [appointments, setAppointments] = useState([]);
  const [doctorProfile, setDoctorProfile] = useState(null);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [filterDate, setFilterDate] = useState('');
  const [implementationFilter, setImplementationFilter] = useState('all');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [currentDateTime, setCurrentDateTime] = useState(() => new Date());
  const [newAppointmentForm, setNewAppointmentForm] = useState({
    patientId: '',
    patient: '',
    date: user?.loginDate || getLocalIsoDate(),
    time: DOCTOR_TIME_SLOTS[0],
    duration: '15min',
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

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setCurrentDateTime(new Date());
    }, 60000);

    return () => window.clearInterval(intervalId);
  }, []);

  const filteredAppointments = useMemo(() => {
    const scopedAppointments = showPendingOnly
      ? appointments.filter((appointment) => appointment.status === 'pending')
      : appointments;

    return scopedAppointments.filter((appointment) => {
      const appointmentImplemented = isAppointmentImplemented(appointment, currentDateTime);
      const matchesDate = !filterDate || appointment.date === filterDate || appointment.status === 'pending';
      const matchesImplementation =
        implementationFilter === 'all'
        || (implementationFilter === 'implemented' && appointmentImplemented)
        || (implementationFilter === 'not-implemented' && !appointmentImplemented);

      return matchesDate && matchesImplementation;
    });
  }, [appointments, currentDateTime, filterDate, implementationFilter, showPendingOnly]);

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
      duration: '15min',
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

  const handleDownloadTodaySchedule = () => {
    const todayDate = getLocalIsoDate();
    const todayAppointments = appointments
      .filter((appointment) => appointment.date === todayDate)
      .sort((first, second) => {
        const firstDateTime = getAppointmentDateTime(first.date, first.time);
        const secondDateTime = getAppointmentDateTime(second.date, second.time);

        return (firstDateTime?.getTime() || 0) - (secondDateTime?.getTime() || 0);
      });

    const headers = ['Time', 'Patient', 'Doctor', 'Specialty', 'Duration', 'Status', 'Payment', 'Reason'];
    const rows = todayAppointments.length
      ? todayAppointments.map((appointment) => [
          appointment.time,
          appointment.patient,
          appointment.doctor || doctorProfile?.name || user?.profile?.name || 'Doctor',
          appointment.specialty,
          appointment.duration,
          appointment.status,
          appointment.paymentMethod === 'whish' ? 'Whish' : appointment.paymentMethod === 'cash' ? 'Cash' : '-',
          appointment.reason,
        ])
      : [['No appointments scheduled for today.', '', '', '', '', '', '', '']];

    const tableRows = [
      `<tr>${headers.map((header) => `<th>${escapeExcelValue(header)}</th>`).join('')}</tr>`,
      ...rows.map((row) => `<tr>${row.map((cell) => `<td>${escapeExcelValue(cell)}</td>`).join('')}</tr>`),
    ].join('');
    const doctorName = doctorProfile?.name || user?.profile?.name || 'Doctor';
    const worksheet = `
      <html>
        <head>
          <meta charset="UTF-8" />
          <style>
            table { border-collapse: collapse; }
            th, td { border: 1px solid #94a3b8; padding: 8px; text-align: left; }
            th { background: #e2e8f0; font-weight: bold; }
          </style>
        </head>
        <body>
          <h2>Today Schedule</h2>
          <p>Doctor: ${escapeExcelValue(doctorName)}</p>
          <p>Date: ${escapeExcelValue(todayDate)} (${escapeExcelValue(getWeekdayFromDate(todayDate))})</p>
          <table>${tableRows}</table>
        </body>
      </html>
    `;

    const blob = new Blob([worksheet], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const downloadUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `doctor-today-schedule-${todayDate}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(downloadUrl);
    setFeedback(`Today's schedule for ${todayDate} was downloaded.`);
  };

  return (
    <div className="card fade-in-up">
      <div className="card-header">
        <h3>Today's Appointments</h3>
        <div className="appointments-header-actions">
          <button type="button" className="btn-secondary" onClick={handleDownloadTodaySchedule}>
            Download Today Schedule
          </button>
          <button type="button" className="btn-primary" onClick={() => setShowCreateForm((current) => !current)}>
            {showCreateForm ? 'Close Form' : '+ New Appointment'}
          </button>
        </div>
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
              <input
                id="appointment-duration"
                type="text"
                value="15min"
                readOnly
              />
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
        <div className="appointments-filter-field">
          <label htmlFor="appointments-date-filter">Filter by calendar date</label>
          <input
            id="appointments-date-filter"
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
          />
        </div>

        <div className="appointments-filter-field">
          <label htmlFor="appointments-implementation-filter">Filter by implementation</label>
          <select
            id="appointments-implementation-filter"
            value={implementationFilter}
            onChange={(e) => setImplementationFilter(e.target.value)}
          >
            <option value="not-implemented">Not implemented</option>
            <option value="implemented">Implemented</option>
            <option value="all">All appointments</option>
          </select>
        </div>

        <div className="appointments-filter-actions">
          {filterDate && (
            <button type="button" className="btn-secondary" onClick={() => setFilterDate('')}>
              Clear Date
            </button>
          )}
          {implementationFilter !== 'not-implemented' && (
            <button type="button" className="btn-secondary" onClick={() => setImplementationFilter('not-implemented')}>
              Show Active
            </button>
          )}
        </div>
      </div>

      <div className="action-feedback">
        {feedback || (selectedAppointment
          ? `${selectedAppointment.patient} is selected. Status: ${selectedAppointment.status}.`
          : 'Select an appointment to inspect the details.')}
      </div>

      <div className="appointments-list">
        {filteredAppointments.map((appointment) => {
          const appointmentImplemented = isAppointmentImplemented(appointment, currentDateTime);

          return (
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
                <div className="doctor-appointment-badges">
                  <span className={`status-badge ${appointment.status}`}>{appointment.status}</span>
                  <span className={`implementation-badge ${appointmentImplemented ? 'implemented' : 'not-implemented'}`}>
                    {appointmentImplemented ? 'Implemented' : 'Not implemented'}
                  </span>
                </div>
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

              {selectedAppointment?.id === appointment.id && (
                <div className="appointment-inline-details">
                  <h4>Appointment Details</h4>
                  <div className="detail-grid">
                    <span><strong>Patient:</strong> {appointment.patient}</span>
                    <span><strong>Doctor:</strong> {appointment.doctor}</span>
                    <span><strong>Date:</strong> {appointment.date}</span>
                    <span><strong>Day:</strong> {getWeekdayFromDate(appointment.date)}</span>
                    <span><strong>Time:</strong> {appointment.time}</span>
                    <span><strong>Duration:</strong> {appointment.duration}</span>
                    <span><strong>Status:</strong> {appointment.status}</span>
                    <span><strong>Payment:</strong> {appointment.paymentMethod === 'whish' ? 'Whish' : appointment.paymentMethod === 'cash' ? 'Cash' : '-'}</span>
                  </div>
                  <p className="appointment-reason"><strong>Reason:</strong> {appointment.reason}</p>

                  <div className="action-feedback">
                    {appointment.status === 'pending'
                      ? 'Use the Accept/Reject buttons on this appointment card.'
                      : appointment.status === 'confirmed'
                        ? 'Appointment accepted. Decision is locked.'
                        : 'Appointment rejected. Decision is locked.'}
                  </div>

                  {appointment.preFeeImage && (
                    <div className="pre-fee-preview">
                      <h5>Pre-fee Image</h5>
                      <img src={appointment.preFeeImage} alt="Pre-fee proof" />
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {!filteredAppointments.length && (
        <div className="empty-state">No appointments match these filters.</div>
      )}

    </div>
  );
};

export default Appointments;
