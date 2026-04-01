export const DOCTOR_FEES_STORAGE_KEY = 'doctorFees';
export const DOCTOR_FEES_SYNC_EVENT = 'doctorFeesUpdated';

const defaultDoctorFees = {
  'Dr. John Smith': 120,
  'Dr. Sarah Johnson': 150,
  'Dr. Michael Brown': 140,
};

export const getDoctorFeesFromStorage = () => {
  try {
    const raw = localStorage.getItem(DOCTOR_FEES_STORAGE_KEY);

    if (!raw) {
      return { ...defaultDoctorFees };
    }

    const parsed = JSON.parse(raw);

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { ...defaultDoctorFees };
    }

    return {
      ...defaultDoctorFees,
      ...parsed,
    };
  } catch (error) {
    return { ...defaultDoctorFees };
  }
};

export const saveDoctorFeesToStorage = (fees) => {
  try {
    localStorage.setItem(DOCTOR_FEES_STORAGE_KEY, JSON.stringify(fees));
    window.dispatchEvent(new CustomEvent(DOCTOR_FEES_SYNC_EVENT));
    return { ok: true };
  } catch (error) {
    return { ok: false, message: 'Could not save doctor fees.' };
  }
};

export const updateDoctorFee = (doctorName, fee) => {
  const currentFees = getDoctorFeesFromStorage();
  const updatedFees = {
    ...currentFees,
    [doctorName]: fee,
  };

  return saveDoctorFeesToStorage(updatedFees);
};

export const subscribeToDoctorFees = (callback) => {
  const syncFees = () => {
    callback(getDoctorFeesFromStorage());
  };

  window.addEventListener('storage', syncFees);
  window.addEventListener(DOCTOR_FEES_SYNC_EVENT, syncFees);

  return () => {
    window.removeEventListener('storage', syncFees);
    window.removeEventListener(DOCTOR_FEES_SYNC_EVENT, syncFees);
  };
};
