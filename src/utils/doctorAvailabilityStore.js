export const DOCTOR_AVAILABILITY_STORAGE_KEY = 'doctorAvailability';
export const DOCTOR_AVAILABILITY_SYNC_EVENT = 'doctorAvailabilityUpdated';

const defaultAvailability = {
  'Dr. John Smith': {
    days: ['Monday', 'Tuesday', 'Thursday'],
    times: ['09:00 AM', '10:30 AM', '01:00 PM'],
  },
  'Dr. Sarah Johnson': {
    days: ['Monday', 'Wednesday', 'Friday'],
    times: ['10:30 AM', '01:00 PM', '03:00 PM'],
  },
  'Dr. Michael Brown': {
    days: ['Tuesday', 'Thursday', 'Saturday'],
    times: ['09:00 AM', '01:00 PM', '03:00 PM'],
  },
};

export const getDoctorAvailabilityFromStorage = () => {
  try {
    const raw = localStorage.getItem(DOCTOR_AVAILABILITY_STORAGE_KEY);

    if (!raw) {
      return { ...defaultAvailability };
    }

    const parsed = JSON.parse(raw);

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { ...defaultAvailability };
    }

    return {
      ...defaultAvailability,
      ...parsed,
    };
  } catch (error) {
    return { ...defaultAvailability };
  }
};

export const saveDoctorAvailabilityToStorage = (availability) => {
  try {
    localStorage.setItem(DOCTOR_AVAILABILITY_STORAGE_KEY, JSON.stringify(availability));
    window.dispatchEvent(new CustomEvent(DOCTOR_AVAILABILITY_SYNC_EVENT));
    return { ok: true };
  } catch (error) {
    return { ok: false, message: 'Could not save doctor availability.' };
  }
};

export const updateDoctorAvailability = (doctorName, days, times) => {
  const current = getDoctorAvailabilityFromStorage();
  const updated = {
    ...current,
    [doctorName]: {
      days,
      times,
    },
  };

  return saveDoctorAvailabilityToStorage(updated);
};

export const subscribeToDoctorAvailability = (callback) => {
  const syncAvailability = () => {
    callback(getDoctorAvailabilityFromStorage());
  };

  window.addEventListener('storage', syncAvailability);
  window.addEventListener(DOCTOR_AVAILABILITY_SYNC_EVENT, syncAvailability);

  return () => {
    window.removeEventListener('storage', syncAvailability);
    window.removeEventListener(DOCTOR_AVAILABILITY_SYNC_EVENT, syncAvailability);
  };
};
