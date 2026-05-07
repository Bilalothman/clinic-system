import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import { useApi } from '../../../hooks/useApi';
import './MyAppointments.css';

const emptyForm = {
  doctor: '',
  specialty: '',
  date: '',
  time: '',
  reason: '',
  paymentMethod: '',
  preFeeImage: '',
  preFeeImageName: '',
};

const getTodayIso = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

const getWeekdayFromDate = (dateString) => {
  if (!dateString) {
    return '';
  }

  const date = new Date(`${dateString}T00:00:00`);
  return date.toLocaleDateString('en-US', { weekday: 'long' });
};

const requiredPatientProfileFields = [
  ['name', 'Full Name'],
  ['email', 'Email'],
  ['phone', 'Phone'],
  ['gender', 'Gender'],
  ['dob', 'Date Of Birth'],
  ['address', 'Address'],
];

const getMissingPatientProfileFields = (profile = {}) => {
  return requiredPatientProfileFields
    .filter(([field]) => {
      const value = String(profile[field] || '').trim();
      return !value || value === '-' || value.toLowerCase() === 'registered with google';
    })
    .map(([, label]) => label);
};

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

const formatClinicTimeRange = (times) => {
  if (!Array.isArray(times) || !times.length) {
    return 'Not set';
  }

  if (times.length === 1) {
    return times[0];
  }

  return `From: ${times[0]} to ${times[times.length - 1]}`;
};

const normalizeText = (value) => String(value || '').trim().toLowerCase();
const blockedPatientMessage = 'Your account cannot book appointments right now. Please contact us at 03216269 for assistance.';

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
  const { user, updateProfile } = useAuth();
  const { apiCall } = useApi();
  const location = useLocation();
  const appliedAiAppointmentRef = useRef('');
  const [allAppointments, setAllAppointments] = useState([]);
  const [selectedDoctorAppointments, setSelectedDoctorAppointments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [feedback, setFeedback] = useState('Fill out the form to book a new appointment, or reschedule an existing one.');
  const [bookingForm, setBookingForm] = useState(emptyForm);
  const [dateFilter, setDateFilter] = useState('');
  const [implementationFilter, setImplementationFilter] = useState('all');
  const [currentDateTime, setCurrentDateTime] = useState(() => new Date());
  const [bookingBlockReason, setBookingBlockReason] = useState('');
  const [patientAccountStatus, setPatientAccountStatus] = useState(user?.profile?.status || 'active');

  const patientId = user?.userId || '';
  const patientName = user?.profile?.name || (patientId ? `Patient ${patientId}` : 'Patient');
  const todayIso = getTodayIso();

  const loadDoctors = async () => {
    try {
      const doctorsResponse = await apiCall('/doctors');
      setDoctors(doctorsResponse || []);
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

  useEffect(() => {
    const loadCurrentPatientStatus = async () => {
      if (user?.role !== 'patient') {
        return;
      }

      try {
        const response = await apiCall('/auth/me');
        const nextProfile = response?.profile || {};
        const nextStatus = nextProfile.status || 'active';

        updateProfile(nextProfile);
        setPatientAccountStatus(nextStatus);

        if (nextStatus !== 'active') {
          setBookingBlockReason(blockedPatientMessage);
          setFeedback(blockedPatientMessage);
        }
      } catch (_error) {
        setPatientAccountStatus(user?.profile?.status || 'active');
      }
    };

    loadCurrentPatientStatus();
  }, [apiCall, updateProfile, user?.profile?.status, user?.role]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setCurrentDateTime(new Date());
    }, 60000);

    return () => window.clearInterval(intervalId);
  }, []);

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

  useEffect(() => {
    const aiAppointment = location.state?.aiAppointment;
    const recommendedSpecialty = normalizeText(aiAppointment?.specialty);

    if (!recommendedSpecialty || !doctors.length) {
      return;
    }

    const applyKey = `${location.key}:${recommendedSpecialty}:${aiAppointment?.reason || ''}`;
    if (appliedAiAppointmentRef.current === applyKey) {
      return;
    }

    const recommendedDoctor = doctors.find((doctor) =>
      normalizeText(doctor.specialty) === recommendedSpecialty
    );

    if (!recommendedDoctor) {
      setBookingForm(emptyForm);
      setFeedback(`AI recommended ${aiAppointment.specialty}, but no doctor is available for that specialty right now.`);
      appliedAiAppointmentRef.current = applyKey;
      return;
    }

    setBookingForm((current) => ({
      ...current,
      doctor: recommendedDoctor.name,
      specialty: recommendedDoctor.specialty,
      reason: current.reason || aiAppointment.reason || '',
      time: recommendedDoctor.availableTimes?.[0] || '',
    }));
    setFeedback(`AI recommended ${recommendedDoctor.specialty}. ${recommendedDoctor.name} was selected for you.`);
    appliedAiAppointmentRef.current = applyKey;
  }, [doctors, location.key, location.state]);

  const appointments = useMemo(
    () => allAppointments.filter((appointment) => String(appointment.patientId || '') === String(patientId)),
    [allAppointments, patientId]
  );

  const filteredAppointments = useMemo(() => {
    return appointments.filter((appointment) => {
      const appointmentImplemented = isAppointmentImplemented(appointment, currentDateTime);
      const matchesDate = !dateFilter || appointment.date === dateFilter;
      const matchesImplementation =
        implementationFilter === 'all'
        || (implementationFilter === 'implemented' && appointmentImplemented)
        || (implementationFilter === 'not-implemented' && !appointmentImplemented);

      return matchesDate && matchesImplementation;
    });
  }, [appointments, currentDateTime, dateFilter, implementationFilter]);

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
    if (!bookingForm.date || !bookingForm.doctor) {
      return true;
    }

    const weekday = getWeekdayFromDate(bookingForm.date);
    return selectedDoctorSchedule.days.includes(weekday);
  }, [bookingForm.date, bookingForm.doctor, selectedDoctorSchedule.days]);

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
    if (!doctor) {
      setBookingForm((current) => ({
        ...current,
        doctor: '',
        specialty: '',
        time: '',
      }));
      return;
    }

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
    if (field === 'paymentMethod' && value === 'cash') {
      setBookingForm((current) => ({
        ...current,
        paymentMethod: value,
        preFeeImage: '',
        preFeeImageName: '',
      }));
      return;
    }

    setBookingForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleDateChange = (date) => {
    if (date && date < todayIso) {
      setBookingForm((current) => ({
        ...current,
        date: '',
        time: '',
      }));
      setFeedback('Please choose today or a future date. Old dates are not allowed.');
      return;
    }

    if (!bookingForm.doctor) {
      setBookingForm((current) => ({
        ...current,
        date,
        time: '',
      }));
      return;
    }

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

    if (patientAccountStatus !== 'active') {
      setBookingBlockReason(blockedPatientMessage);
      setFeedback(blockedPatientMessage);
      return;
    }

    const missingProfileFields = getMissingPatientProfileFields(user?.profile || {});

    if (missingProfileFields.length) {
      const reason = `Please complete your profile before booking an appointment. Missing: ${missingProfileFields.join(', ')}.`;
      setBookingBlockReason(reason);
      setFeedback(reason);
      return;
    }

    setBookingBlockReason('');

    if (bookingForm.date && bookingForm.date < todayIso) {
      setFeedback('Please choose today or a future date. Old dates are not allowed.');
      return;
    }

    if (!isSelectedDateAvailable) {
      setFeedback('Selected day is not available for this doctor.');
      return;
    }

    if (!availableTimesForSelectedDate.includes(bookingForm.time)) {
      setFeedback('Selected time is not available for this doctor.');
      return;
    }

    if (!bookingForm.paymentMethod) {
      setFeedback('Please choose a payment method.');
      return;
    }

    if (bookingForm.paymentMethod === 'whish' && !bookingForm.preFeeImage) {
      setFeedback('Please upload the Whish pre-fee payment image.');
      return;
    }

    const selectedDoctor = doctors.find((doctor) => doctor.name === bookingForm.doctor);
    if (!selectedDoctor) {
      setFeedback('Please choose a doctor before booking an appointment.');
      return;
    }

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
          duration: '15min',
          doctorFee: selectedDoctorFee,
          paymentMethod: bookingForm.paymentMethod,
          preFeeImage: bookingForm.preFeeImage,
          preFeeImageName: bookingForm.preFeeImageName,
        }),
      });

      setAllAppointments((current) => [created, ...current]);
      setFeedback(`Appointment request sent to ${created.doctor} for ${created.date} at ${created.time}.`);
      setBookingForm(emptyForm);
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
              required
            >
              <option value="">Select a doctor</option>
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
              min={todayIso}
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
          <label htmlFor="payment-method">Payment Method</label>
          <select
            id="payment-method"
            value={bookingForm.paymentMethod}
            onChange={(e) => handleFormChange('paymentMethod', e.target.value)}
            required
          >
            <option value="">Select payment method</option>
            <option value="cash">Cash</option>
            <option value="whish">Whish</option>
          </select>
        </div>

        {bookingForm.paymentMethod === 'whish' && (
          <div className="booking-field">
            <label htmlFor="pre-fee-image">Whish Pre-fee Image</label>
            <input id="pre-fee-image" type="file" accept="image/*" onChange={handlePreFeeImageChange} required />
            {bookingForm.preFeeImageName && (
              <div className="selected-file">Selected: {bookingForm.preFeeImageName}</div>
            )}
          </div>
        )}

        <div className="doctor-fee-note">
          Doctor Fee: <strong>${selectedDoctorFee}</strong>
        </div>

        <div className="doctor-availability-note">
          Available Days: <strong>{selectedDoctorSchedule.days.length ? selectedDoctorSchedule.days.join(', ') : 'Not set'}</strong>
        </div>

        <div className="doctor-availability-note">
          Clinic Times: <strong>{formatClinicTimeRange(selectedDoctorSchedule.times)}</strong>
        </div>

        <button type="submit" className="btn-primary">
          Book Appointment
        </button>

        {bookingBlockReason && (
          <div className="booking-block-reason" role="alert">
            {bookingBlockReason}
          </div>
        )}
      </form>

      <div className="patient-appointments-filter">
        <div className="patient-appointments-filter-field">
          <label htmlFor="patient-appointments-date-filter">Filter appointments by date</label>
          <input
            id="patient-appointments-date-filter"
            type="date"
            value={dateFilter}
            onChange={(event) => setDateFilter(event.target.value)}
          />
        </div>

        <div className="patient-appointments-filter-field">
          <label htmlFor="patient-appointments-implementation-filter">Filter by implementation</label>
          <select
            id="patient-appointments-implementation-filter"
            value={implementationFilter}
            onChange={(event) => setImplementationFilter(event.target.value)}
          >
            <option value="all">All appointments</option>
            <option value="implemented">Implemented</option>
            <option value="not-implemented">Not implemented</option>
          </select>
        </div>

        <div className="patient-appointments-filter-actions">
          {dateFilter && (
            <button type="button" className="btn-secondary" onClick={() => setDateFilter('')}>
              Clear Date
            </button>
          )}
          {implementationFilter !== 'all' && (
            <button type="button" className="btn-secondary" onClick={() => setImplementationFilter('all')}>
              Clear Status
            </button>
          )}
        </div>
      </div>

      <div className="appointments-grid">
        {filteredAppointments.map((appointment) => {
          const appointmentImplemented = isAppointmentImplemented(appointment, currentDateTime);

          return (
            <div key={appointment.id} className="appointment-card patient-appointment">
              <div className="appointment-header">
                <h4>{appointment.doctor}</h4>
                <div className="patient-appointment-badges">
                  <span className={`status-badge ${appointment.status}`}>{appointment.status}</span>
                  <span className={`implementation-badge ${appointmentImplemented ? 'implemented' : 'not-implemented'}`}>
                    {appointmentImplemented ? 'Implemented' : 'Not implemented'}
                  </span>
                </div>
              </div>
              <div className="appointment-subtitle">{appointment.specialty}</div>
              <div className="appointment-date-time">
                <div>{appointment.date}</div>
                <div>{appointment.time}</div>
              </div>
              <p className="appointment-reason">{appointment.reason}</p>
              {appointment.paymentMethod && (
                <div className="attachment-note">
                  Payment method: {appointment.paymentMethod === 'whish' ? 'Whish' : 'Cash'}
                </div>
              )}
              {appointment.preFeeImage && <div className="attachment-note">Pre-fee image attached</div>}
            </div>
          );
        })}
      </div>

      {appointments.length > 0 && filteredAppointments.length === 0 && (
        <div className="empty-state">No appointments match these filters.</div>
      )}
    </div>
  );
};

export default MyAppointments;
