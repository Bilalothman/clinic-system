import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { useApi } from '../../../hooks/useApi';
import './MyAppointments.css';

const emptyForm = {
  doctor: '',
  specialty: '',
  date: '',
  time: '',
  reason: '',
  preFeeImage: '',
  preFeeImageName: '',
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
  const { apiCall } = useApi();
  const [allAppointments, setAllAppointments] = useState([]);
  const [selectedDoctorAppointments, setSelectedDoctorAppointments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [feedback, setFeedback] = useState('Fill out the form to book a new appointment, or reschedule an existing one.');
  const [bookingForm, setBookingForm] = useState(emptyForm);

  const patientId = user?.userId || '';
  const patientName = user?.profile?.name || (patientId ? `Patient ${patientId}` : 'Patient');

  const loadDoctors = async () => {
    try {
      const doctorsResponse = await apiCall('/doctors');
      setDoctors(doctorsResponse || []);

      if (doctorsResponse?.length) {
        const firstDoctor = doctorsResponse[0];
        setBookingForm((current) => ({
          ...current,
          doctor: current.doctor || firstDoctor.name,
          specialty: current.specialty || firstDoctor.specialty,
          time: current.time || firstDoctor.availableTimes?.[0] || '',
        }));
      }
    } catch (error) {
      setFeedback(error.message);
    }
  };

  const loadAppointments = async () => {
    if (!patientId) {
      setAllAppointments([]);
      return;
    }

    try {
      const appointments = await apiCall(`/appointments?patientId=${patientId}`);
      setAllAppointments(appointments || []);
    } catch (error) {
      setFeedback(error.message);
    }
  };

  useEffect(() => {
    loadDoctors();
    loadAppointments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId]);

  const doctorOptions = useMemo(() => {
    return doctors.reduce((acc, doctor) => {
      acc[doctor.name] = doctor.specialty;
      return acc;
    }, {});
  }, [doctors]);

  const doctorFees = useMemo(() => {
    return doctors.reduce((acc, doctor) => {
      acc[doctor.name] = doctor.fee;
      return acc;
    }, {});
  }, [doctors]);

  const doctorAvailability = useMemo(() => {
    return doctors.reduce((acc, doctor) => {
      acc[doctor.name] = {
        days: doctor.availableDays || [],
        times: doctor.availableTimes || [],
      };
      return acc;
    }, {});
  }, [doctors]);

  const appointments = useMemo(
    () => allAppointments.filter((appointment) => String(appointment.patientId || '') === String(patientId)),
    [allAppointments, patientId]
  );

  const selectedDoctor = useMemo(
    () => doctors.find((doctor) => doctor.name === bookingForm.doctor) || null,
    [doctors, bookingForm.doctor]
  );

  const selectedDoctorFee = doctorFees[bookingForm.doctor] || 0;
  const selectedDoctorSchedule = doctorAvailability[bookingForm.doctor] || { days: [], times: [] };

  useEffect(() => {
    const loadSelectedDoctorAppointments = async () => {
      if (!selectedDoctor?.id || !bookingForm.date) {
        setSelectedDoctorAppointments([]);
        return;
      }

      try {
        const rows = await apiCall(`/appointments?doctorId=${selectedDoctor.id}`);
        setSelectedDoctorAppointments(rows || []);
      } catch (_error) {
        setSelectedDoctorAppointments([]);
      }
    };

    loadSelectedDoctorAppointments();
  }, [apiCall, bookingForm.date, selectedDoctor?.id]);

  const bookedTimes = useMemo(() => {
    if (!bookingForm.date) {
      return [];
    }

    return selectedDoctorAppointments
      .filter((appointment) =>
        appointment.date === bookingForm.date
        && appointment.status !== 'cancelled'
      )
      .map((appointment) => appointment.time);
  }, [bookingForm.date, selectedDoctorAppointments]);

  const isSelectedDateAvailable = useMemo(() => {
    if (!bookingForm.date) {
      return true;
    }

    const weekday = getWeekdayFromDate(bookingForm.date);
    return selectedDoctorSchedule.days.includes(weekday);
  }, [bookingForm.date, selectedDoctorSchedule.days]);

  const availableTimesForSelectedDate = useMemo(() => {
    if (!bookingForm.date || !isSelectedDateAvailable) {
      return [];
    }

    return (selectedDoctorSchedule.times || []).filter((timeOption) => !bookedTimes.includes(timeOption));
  }, [bookingForm.date, bookedTimes, isSelectedDateAvailable, selectedDoctorSchedule.times]);

  useEffect(() => {
    if (!bookingForm.date) {
      return;
    }

    if (!availableTimesForSelectedDate.includes(bookingForm.time)) {
      setBookingForm((current) => ({
        ...current,
        time: availableTimesForSelectedDate[0] || '',
      }));
    }
  }, [availableTimesForSelectedDate, bookingForm.date, bookingForm.time]);

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

  const handleBookAppointment = async (e) => {
    e.preventDefault();

    if (!isSelectedDateAvailable) {
      setFeedback('Selected day is not available for this doctor.');
      return;
    }

    if (!availableTimesForSelectedDate.includes(bookingForm.time)) {
      setFeedback('Selected time is not available for this doctor.');
      return;
    }

    const selectedDoctor = doctors.find((doctor) => doctor.name === bookingForm.doctor);

    try {
      const created = await apiCall('/appointments', {
        method: 'POST',
        body: JSON.stringify({
          patientId,
          patient: patientName,
          doctorId: selectedDoctor?.id,
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
        }),
      });

      setAllAppointments((current) => [created, ...current]);
      setFeedback(`Appointment request sent to ${created.doctor} for ${created.date} at ${created.time}.`);
      setBookingForm({
        ...emptyForm,
        doctor: bookingForm.doctor,
        specialty: doctorOptions[bookingForm.doctor],
        time: (doctorAvailability[bookingForm.doctor]?.times || [])[0] || '',
      });
    } catch (error) {
      setFeedback(error.message);
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
          </div>
        ))}
      </div>
    </div>
  );
};

export default MyAppointments;
