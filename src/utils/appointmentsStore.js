export const APPOINTMENTS_STORAGE_KEY = 'clinicAppointments';
export const APPOINTMENTS_SYNC_EVENT = 'clinicAppointmentsUpdated';
const MAX_IMAGE_DATA_URL_LENGTH = 350000;

const defaultAppointments = [
  {
    id: 1,
    patientId: '201',
    patient: 'John Doe',
    doctor: 'Dr. John Smith',
    specialty: 'Cardiology',
    date: '2026-04-06',
    time: '10:00 AM',
    status: 'confirmed',
    duration: '30min',
    reason: 'Follow-up consultation',
    preFeeImage: '',
    preFeeImageName: '',
  },
  {
    id: 2,
    patientId: '201',
    patient: 'John Doe',
    doctor: 'Dr. Sarah Johnson',
    specialty: 'Neurology',
    date: '2026-04-09',
    time: '02:30 PM',
    status: 'pending',
    duration: '45min',
    reason: 'Migraine review',
    preFeeImage: '',
    preFeeImageName: '',
  },
];

export const getAppointmentsFromStorage = () => {
  try {
    const raw = localStorage.getItem(APPOINTMENTS_STORAGE_KEY);

    if (!raw) {
      return [...defaultAppointments];
    }

    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return [...defaultAppointments];
    }

    return parsed.map((appointment) => {
      const image = typeof appointment?.preFeeImage === 'string' ? appointment.preFeeImage : '';

      if (image.length <= MAX_IMAGE_DATA_URL_LENGTH) {
        return appointment;
      }

      return {
        ...appointment,
        preFeeImage: '',
        preFeeImageName: '',
      };
    });
  } catch (error) {
    return [...defaultAppointments];
  }
};

export const saveAppointmentsToStorage = (appointments) => {
  try {
    localStorage.setItem(APPOINTMENTS_STORAGE_KEY, JSON.stringify(appointments));
    window.dispatchEvent(new CustomEvent(APPOINTMENTS_SYNC_EVENT));
    return { ok: true };
  } catch (error) {
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      return {
        ok: false,
        reason: 'quota',
        message: 'Storage is full. Use a smaller image.',
      };
    }

    return {
      ok: false,
      reason: 'unknown',
      message: 'Could not save appointment data.',
    };
  }
};

export const subscribeToAppointments = (callback) => {
  const syncAppointments = () => {
    callback(getAppointmentsFromStorage());
  };

  window.addEventListener('storage', syncAppointments);
  window.addEventListener(APPOINTMENTS_SYNC_EVENT, syncAppointments);

  return () => {
    window.removeEventListener('storage', syncAppointments);
    window.removeEventListener(APPOINTMENTS_SYNC_EVENT, syncAppointments);
  };
};
