import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import {
  getAppointmentsFromStorage,
  saveAppointmentsToStorage,
  subscribeToAppointments,
} from '../../../utils/appointmentsStore';
import {
  getDoctorFeesFromStorage,
  subscribeToDoctorFees,
} from '../../../utils/doctorFeesStore';
import {
  getDoctorAvailabilityFromStorage,
  subscribeToDoctorAvailability,
} from '../../../utils/doctorAvailabilityStore';
import './MyAppointments.css';

const emptyForm = {
  doctor: 'Dr. John Smith',
  specialty: 'Cardiology',
  date: '',
  time: '09:00 AM',
  reason: '',
  preFeeImage: '',
  preFeeImageName: '',
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

const getWeekdayFromDate = (dateString) => {
  if (!dateString) {
    return '';
  }

  const date = new Date(`${dateString}T00:00:00`);
  return date.toLocaleDateString('en-US', { weekday: 'long' });
};

const compressImageToDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const image = new Image();

      image.onload = () => {
        const maxWidth = 960;
        const scale = image.width > maxWidth ? maxWidth / image.width : 1;
        const width = Math.max(1, Math.round(image.width * scale));
        const height = Math.max(1, Math.round(image.height * scale));

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const context = canvas.getContext('2d');

        if (!context) {
          reject(new Error('Could not prepare image canvas'));
          return;
        }

        context.drawImage(image, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.65));
      };

      image.onerror = () => reject(new Error('Could not load selected image'));
      image.src = String(reader.result || '');
    };

    reader.onerror = () => reject(new Error('Could not read selected image'));
    reader.readAsDataURL(file);
  });

const MyAppointments = () => {
  const { user } = useAuth();
  const [allAppointments, setAllAppointments] = useState(() => getAppointmentsFromStorage());
  const [doctorFees, setDoctorFees] = useState(() => getDoctorFeesFromStorage());
  const [doctorAvailability, setDoctorAvailability] = useState(() => getDoctorAvailabilityFromStorage());
  const [feedback, setFeedback] = useState('Fill out the form to book a new appointment, or reschedule an existing one.');
  const [bookingForm, setBookingForm] = useState(emptyForm);

  useEffect(() => {
    const unsubscribe = subscribeToAppointments(setAllAppointments);
    return unsubscribe;
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToDoctorFees(setDoctorFees);
    return unsubscribe;
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToDoctorAvailability(setDoctorAvailability);
    return unsubscribe;
  }, []);

  const patientId = user?.userId || '201';
  const patientName = patientId === '201' ? 'John Doe' : `Patient ${patientId}`;

  const appointments = useMemo(
    () => allAppointments.filter((appointment) => String(appointment.patientId || '201') === String(patientId)),
    [allAppointments, patientId]
  );

  const nextId = useMemo(
    () => allAppointments.reduce((maxId, appointment) => Math.max(maxId, appointment.id), 0) + 1,
    [allAppointments]
  );
  const selectedDoctorFee = doctorFees[bookingForm.doctor] || 0;
  const selectedDoctorSchedule = doctorAvailability[bookingForm.doctor] || { days: [], times: [] };

  const isSelectedDateAvailable = useMemo(() => {
    if (!bookingForm.date) {
      return true;
    }

    const weekday = getWeekdayFromDate(bookingForm.date);
    return selectedDoctorSchedule.days.includes(weekday);
  }, [bookingForm.date, selectedDoctorSchedule.days]);

  const availableTimesForSelectedDate = useMemo(() => {
    if (!bookingForm.date) {
      return [];
    }

    if (!isSelectedDateAvailable) {
      return [];
    }

    return selectedDoctorSchedule.times || [];
  }, [bookingForm.date, isSelectedDateAvailable, selectedDoctorSchedule.times]);

  const handleDoctorChange = (doctor) => {
    const doctorSchedule = doctorAvailability[doctor] || { days: [], times: [] };
    const dateIsAvailable =
      !bookingForm.date || doctorSchedule.days.includes(getWeekdayFromDate(bookingForm.date));
    const fallbackTimes = dateIsAvailable ? doctorSchedule.times || [] : [];

    setBookingForm((current) => ({
      ...current,
      doctor,
      specialty: doctorOptions[doctor],
      time: fallbackTimes.includes(current.time) ? current.time : (fallbackTimes[0] || ''),
    }));
  };

  const handleFormChange = (field, value) => {
    setBookingForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleDateChange = (date) => {
    const weekday = getWeekdayFromDate(date);
    const doctorSchedule = doctorAvailability[bookingForm.doctor] || { days: [], times: [] };
    const dateIsAvailable = doctorSchedule.days.includes(weekday);
    const fallbackTimes = dateIsAvailable ? doctorSchedule.times || [] : [];

    setBookingForm((current) => ({
      ...current,
      date,
      time: fallbackTimes.includes(current.time) ? current.time : (fallbackTimes[0] || ''),
    }));

    if (date && !dateIsAvailable) {
      setFeedback(`${bookingForm.doctor} is not in clinic on ${weekday}. Please pick another day.`);
    }
  };

  const handlePreFeeImageChange = async (event) => {
    const selectedFile = event.target.files?.[0];

    if (!selectedFile) {
      handleFormChange('preFeeImage', '');
      handleFormChange('preFeeImageName', '');
      return;
    }

    if (!selectedFile.type.startsWith('image/')) {
      setFeedback('Please choose an image file for the pre-fee proof.');
      return;
    }

    try {
      const compressedDataUrl = await compressImageToDataUrl(selectedFile);
      setBookingForm((current) => ({
        ...current,
        preFeeImage: compressedDataUrl,
        preFeeImageName: selectedFile.name,
      }));
      setFeedback('Pre-fee image attached successfully.');
    } catch (error) {
      setFeedback('Could not process image. Please choose another file.');
    }
  };

  const handleBookAppointment = (e) => {
    e.preventDefault();

    if (!isSelectedDateAvailable) {
      setFeedback('Selected day is not available for this doctor.');
      return;
    }

    if (!availableTimesForSelectedDate.includes(bookingForm.time)) {
      setFeedback('Selected time is not available for this doctor.');
      return;
    }

    const newAppointment = {
      id: nextId,
      patientId,
      patient: patientName,
      doctor: bookingForm.doctor,
      specialty: bookingForm.specialty,
      date: bookingForm.date,
      time: bookingForm.time,
      reason: bookingForm.reason,
      status: 'pending',
      duration: '30min',
      doctorFee: selectedDoctorFee,
      preFeeImage: bookingForm.preFeeImage,
      preFeeImageName: bookingForm.preFeeImageName,
    };

    const updatedAppointments = [newAppointment, ...allAppointments];
    const saveResult = saveAppointmentsToStorage(updatedAppointments);

    if (!saveResult.ok) {
      setFeedback('Could not save this appointment because storage is full. Please use a smaller image.');
      return;
    }

    setAllAppointments(updatedAppointments);

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

    const updatedAppointments = allAppointments.map((appointment) => {
      if (appointment.id !== appointmentId) {
        return appointment;
      }

      updatedAppointment = {
        ...appointment,
        date: addDays(appointment.date, 7),
        time: appointment.time === '10:00 AM' ? '01:00 PM' : '03:00 PM',
        status: 'pending',
      };

      return updatedAppointment;
    });

    const saveResult = saveAppointmentsToStorage(updatedAppointments);

    if (!saveResult.ok) {
      setFeedback('Could not reschedule right now because appointment storage is full.');
      return;
    }

    setAllAppointments(updatedAppointments);

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
              onChange={(e) => handleDateChange(e.target.value)}
              required
            />
          </div>

          <div className="booking-field">
            <label htmlFor="appointment-time">Time</label>
            <select
              id="appointment-time"
              value={bookingForm.time}
              onChange={(e) => handleFormChange('time', e.target.value)}
              disabled={!bookingForm.date || !availableTimesForSelectedDate.length}
              required
            >
              {!availableTimesForSelectedDate.length && (
                <option value="">No available time slots</option>
              )}
              {availableTimesForSelectedDate.map((timeOption) => (
                <option key={timeOption} value={timeOption}>
                  {timeOption}
                </option>
              ))}
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

        <div className="booking-field">
          <label htmlFor="pre-fee-image">Pre-fee Image (optional)</label>
          <input id="pre-fee-image" type="file" accept="image/*" onChange={handlePreFeeImageChange} />
          {bookingForm.preFeeImageName && (
            <div className="selected-file">Selected: {bookingForm.preFeeImageName}</div>
          )}
        </div>

        <div className="doctor-fee-note">
          Doctor Fee: <strong>${selectedDoctorFee}</strong>
        </div>

        <div className="doctor-availability-note">
          Available Days: <strong>{selectedDoctorSchedule.days.length ? selectedDoctorSchedule.days.join(', ') : 'Not set'}</strong>
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
            {appointment.preFeeImage && <div className="attachment-note">Pre-fee image attached</div>}
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
