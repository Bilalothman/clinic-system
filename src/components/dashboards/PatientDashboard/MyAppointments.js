import React, { useMemo, useState } from 'react';
import './MyAppointments.css';

const initialAppointments = [
  {
    id: 1,
    doctor: 'Dr. John Smith',
    specialty: 'Cardiology',
    date: '2024-01-20',
    time: '10:00 AM',
    status: 'confirmed',
    reason: 'Follow-up consultation',
  },
  {
    id: 2,
    doctor: 'Dr. Sarah Johnson',
    specialty: 'Neurology',
    date: '2024-01-25',
    time: '02:30 PM',
    status: 'pending',
    reason: 'Migraine review',
  },
];

const emptyForm = {
  doctor: 'Dr. John Smith',
  specialty: 'Cardiology',
  date: '',
  time: '09:00 AM',
  reason: '',
};

const doctorOptions = {
  'Dr. John Smith': 'Cardiology',
  'Dr. Sarah Johnson': 'Neurology',
  'Dr. Michael Brown': 'Orthopedics',
};

const addDays = (dateString, days) => {
  const date = new Date(dateString);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
};

const MyAppointments = () => {
  const [appointments, setAppointments] = useState(initialAppointments);
  const [feedback, setFeedback] = useState('Fill out the form to book a new appointment, or reschedule an existing one.');
  const [bookingForm, setBookingForm] = useState(emptyForm);

  const nextId = useMemo(
    () => appointments.reduce((maxId, appointment) => Math.max(maxId, appointment.id), 0) + 1,
    [appointments]
  );

  const handleDoctorChange = (doctor) => {
    setBookingForm((current) => ({
      ...current,
      doctor,
      specialty: doctorOptions[doctor],
    }));
  };

  const handleFormChange = (field, value) => {
    setBookingForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleBookAppointment = (e) => {
    e.preventDefault();

    const newAppointment = {
      id: nextId,
      doctor: bookingForm.doctor,
      specialty: bookingForm.specialty,
      date: bookingForm.date,
      time: bookingForm.time,
      reason: bookingForm.reason,
      status: 'pending',
    };

    setAppointments((current) => [newAppointment, ...current]);
    setFeedback(
      `Appointment request sent to ${newAppointment.doctor} for ${newAppointment.date} at ${newAppointment.time}.`
    );
    setBookingForm({
      ...emptyForm,
      doctor: bookingForm.doctor,
      specialty: doctorOptions[bookingForm.doctor],
    });
  };

  const handleReschedule = (appointmentId) => {
    let updatedAppointment = null;

    setAppointments((current) =>
      current.map((appointment) => {
        if (appointment.id !== appointmentId) {
          return appointment;
        }

        updatedAppointment = {
          ...appointment,
          date: addDays(appointment.date, 7),
          time: appointment.time === '10:00 AM' ? '01:00 PM' : '03:00 PM',
          status: 'confirmed',
        };

        return updatedAppointment;
      })
    );

    if (updatedAppointment) {
      setFeedback(
        `${updatedAppointment.doctor} appointment moved to ${updatedAppointment.date} at ${updatedAppointment.time}.`
      );
    }
  };

  return (
    <div className="card fade-in-up">
      <div className="card-header">
        <h3>My Appointments</h3>
      </div>

      <div className="action-feedback">{feedback}</div>

      <form className="booking-form" onSubmit={handleBookAppointment}>
        <div className="booking-grid">
          <div className="booking-field">
            <label htmlFor="doctor">Doctor</label>
            <select
              id="doctor"
              value={bookingForm.doctor}
              onChange={(e) => handleDoctorChange(e.target.value)}
            >
              {Object.keys(doctorOptions).map((doctor) => (
                <option key={doctor} value={doctor}>
                  {doctor}
                </option>
              ))}
            </select>
          </div>

          <div className="booking-field">
            <label htmlFor="specialty">Specialty</label>
            <input id="specialty" type="text" value={bookingForm.specialty} readOnly />
          </div>

          <div className="booking-field">
            <label htmlFor="appointment-date">Date</label>
            <input
              id="appointment-date"
              type="date"
              value={bookingForm.date}
              onChange={(e) => handleFormChange('date', e.target.value)}
              required
            />
          </div>

          <div className="booking-field">
            <label htmlFor="appointment-time">Time</label>
            <select
              id="appointment-time"
              value={bookingForm.time}
              onChange={(e) => handleFormChange('time', e.target.value)}
            >
              <option value="09:00 AM">09:00 AM</option>
              <option value="10:30 AM">10:30 AM</option>
              <option value="01:00 PM">01:00 PM</option>
              <option value="03:00 PM">03:00 PM</option>
            </select>
          </div>
        </div>

        <div className="booking-field">
          <label htmlFor="appointment-reason">Reason for Visit</label>
          <textarea
            id="appointment-reason"
            rows="3"
            value={bookingForm.reason}
            onChange={(e) => handleFormChange('reason', e.target.value)}
            placeholder="Describe your symptoms or the reason for your appointment"
            required
          />
        </div>

        <button type="submit" className="btn-primary">
          Book Appointment
        </button>
      </form>

      <div className="appointments-grid">
        {appointments.map((appointment) => (
          <div key={appointment.id} className="appointment-card patient-appointment">
            <div className="appointment-header">
              <h4>{appointment.doctor}</h4>
              <span className={`status-badge ${appointment.status}`}>{appointment.status}</span>
            </div>
            <div className="appointment-subtitle">{appointment.specialty}</div>
            <div className="appointment-date-time">
              <div>{appointment.date}</div>
              <div>{appointment.time}</div>
            </div>
            <p className="appointment-reason">{appointment.reason}</p>
            <button type="button" className="btn-secondary" onClick={() => handleReschedule(appointment.id)}>
              Reschedule
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MyAppointments;
