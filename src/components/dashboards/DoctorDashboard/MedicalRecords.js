import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { useApi } from '../../../hooks/useApi';
import './MedicalRecords.css';

const getTodayIsoDate = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
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

const defaultRecords = [
  { patient: 'Alice Johnson', date: '2024-01-15', diagnosis: 'Hypertension controlled' },
  { patient: 'Bob Wilson', date: '2024-01-10', diagnosis: 'Blood sugar stable' },
];

const MedicalRecords = () => {
  const { user } = useAuth();
  const { apiCall } = useApi();
  const [labResults, setLabResults] = useState([]);
  const [medicalRecords, setMedicalRecords] = useState([]);
  const [allPatients, setAllPatients] = useState([]);
  const [feedback, setFeedback] = useState('Add a new lab result for a patient.');
  const [recordFeedback, setRecordFeedback] = useState('Add a medical record for a patient.');
  const [searchTerm, setSearchTerm] = useState('');
  const [recordForm, setRecordForm] = useState({
    patient: '',
    diagnosis: '',
    prescription: '',
    notes: '',
    date: getTodayIsoDate(),
  });
  const [labForm, setLabForm] = useState({
    patient: '',
    testName: '',
    resultImage: '',
    resultImageName: '',
    notes: '',
    date: getTodayIsoDate(),
  });

  const loadData = async () => {
    try {
      const [recordsRows, labsRows, appointmentsRows, patientRows] = await Promise.all([
        apiCall(`/medical-records?doctorId=${user?.userId || ''}`),
        apiCall(`/lab-results?doctorId=${user?.userId || ''}`),
        apiCall(`/appointments?doctorId=${user?.userId || ''}`),
        apiCall('/patients'),
      ]);

      setMedicalRecords(recordsRows?.length ? recordsRows : defaultRecords);
      setLabResults(labsRows || []);
      setAllPatients(patientRows || []);

      const patientNames = Array.from(new Set((appointmentsRows || []).map((item) => item.patient).filter(Boolean)));
      setRecordForm((current) => ({ ...current, patient: current.patient || patientNames[0] || '' }));
      setLabForm((current) => ({ ...current, patient: current.patient || patientNames[0] || '' }));
    } catch (error) {
      setFeedback(error.message);
      setRecordFeedback(error.message);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.userId]);

  const patientOptions = useMemo(() => {
    const fromPatients = allPatients.map((item) => item.name);
    const fromRecords = medicalRecords.map((item) => item.patient);
    const fromLabs = labResults.map((item) => item.patient);
    return Array.from(new Set([...fromPatients, ...fromRecords, ...fromLabs].filter(Boolean)))
      .sort((a, b) => a.localeCompare(b));
  }, [allPatients, medicalRecords, labResults]);

  const normalizedSearch = searchTerm.trim().toLowerCase();

  const filteredMedicalRecords = useMemo(() => {
    if (!normalizedSearch) {
      return medicalRecords;
    }

    return medicalRecords.filter((record) =>
      String(record.patient || '').toLowerCase().includes(normalizedSearch)
    );
  }, [medicalRecords, normalizedSearch]);

  const filteredLabResults = useMemo(() => {
    if (!normalizedSearch) {
      return labResults;
    }

    return labResults.filter((result) =>
      String(result.patient || '').toLowerCase().includes(normalizedSearch)
    );
  }, [labResults, normalizedSearch]);

  const handleRecordChange = (field, value) => {
    setRecordForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleAddMedicalRecord = async (event) => {
    event.preventDefault();

    try {
      const created = await apiCall('/medical-records', {
        method: 'POST',
        body: JSON.stringify({
          patient: recordForm.patient.trim(),
          date: recordForm.date,
          diagnosis: recordForm.diagnosis.trim(),
          prescription: recordForm.prescription.trim(),
          notes: recordForm.notes.trim(),
          doctorId: Number(user?.userId),
        }),
      });

      setMedicalRecords((current) => [created, ...current]);
      setRecordFeedback(`Medical record added for ${created.patient}.`);
      setRecordForm({
        patient: '',
        diagnosis: '',
        prescription: '',
        notes: '',
        date: getTodayIsoDate(),
      });
    } catch (error) {
      setRecordFeedback(error.message);
    }
  };

  const handleChange = (field, value) => {
    setLabForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleAddLabResult = async (event) => {
    event.preventDefault();

    if (!labForm.resultImage) {
      setFeedback('Please upload a lab result image before saving.');
      return;
    }

    try {
      const created = await apiCall('/lab-results', {
        method: 'POST',
        body: JSON.stringify({
          patient: labForm.patient.trim(),
          testName: labForm.testName.trim(),
          resultImage: labForm.resultImage,
          resultImageName: labForm.resultImageName,
          notes: labForm.notes.trim(),
          date: labForm.date,
          doctorId: Number(user?.userId),
        }),
      });

      setLabResults((current) => [created, ...current]);
      setFeedback(`Lab result added for ${created.patient}.`);
      setLabForm({
        patient: '',
        testName: '',
        resultImage: '',
        resultImageName: '',
        notes: '',
        date: getTodayIsoDate(),
      });
    } catch (error) {
      setFeedback(error.message);
    }
  };

  const handleResultImageChange = async (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      handleChange('resultImage', '');
      handleChange('resultImageName', '');
      return;
    }

    if (!file.type.startsWith('image/')) {
      setFeedback('Please select an image file for lab result.');
      return;
    }

    try {
      const compressedDataUrl = await compressImageToDataUrl(file);
      setLabForm((current) => ({
        ...current,
        resultImage: compressedDataUrl,
        resultImageName: file.name,
      }));
      setFeedback('Lab result image attached successfully.');
    } catch (error) {
      setFeedback('Could not process image. Please try another file.');
    }
  };

  return (
    <div className="card fade-in-right">
      <div className="card-header">
        <h3>Lab Results & Records</h3>
      </div>

      <div className="lab-results-panel">
        <h4>Add Medical Record</h4>
        <div className="action-feedback">{recordFeedback}</div>

        <form className="lab-form" onSubmit={handleAddMedicalRecord}>
          <div className="lab-form-grid">
            <div className="lab-field">
              <label htmlFor="record-patient">Patient</label>
              <input
                id="record-patient"
                list="record-patient-options"
                value={recordForm.patient}
                onChange={(e) => handleRecordChange('patient', e.target.value)}
                placeholder="Patient full name"
                required
              />
              <datalist id="record-patient-options">
                {patientOptions.map((patient) => (
                  <option key={`record-${patient}`} value={patient} />
                ))}
              </datalist>
            </div>

            <div className="lab-field">
              <label htmlFor="record-date">Date</label>
              <input
                id="record-date"
                type="date"
                value={recordForm.date}
                onChange={(e) => handleRecordChange('date', e.target.value)}
                required
              />
            </div>
          </div>

          <div className="lab-field">
            <label htmlFor="record-diagnosis">Diagnosis</label>
            <input
              id="record-diagnosis"
              value={recordForm.diagnosis}
              onChange={(e) => handleRecordChange('diagnosis', e.target.value)}
              placeholder="Diagnosis summary"
              required
            />
          </div>

          <div className="lab-field">
            <label htmlFor="record-prescription">Prescription</label>
            <input
              id="record-prescription"
              value={recordForm.prescription}
              onChange={(e) => handleRecordChange('prescription', e.target.value)}
              placeholder="Prescription details"
            />
          </div>

          <div className="lab-field">
            <label htmlFor="record-notes">Notes</label>
            <textarea
              id="record-notes"
              rows="3"
              value={recordForm.notes}
              onChange={(e) => handleRecordChange('notes', e.target.value)}
              placeholder="Follow-up instructions or notes"
              required
            />
          </div>

          <button type="submit" className="btn-primary">
            Add Medical Record
          </button>
        </form>

        <h4>Add Lab Result</h4>
        <div className="action-feedback">{feedback}</div>

        <form className="lab-form" onSubmit={handleAddLabResult}>
          <div className="lab-form-grid">
            <div className="lab-field">
              <label htmlFor="lab-patient">Patient</label>
              <input
                id="lab-patient"
                list="lab-patient-options"
                value={labForm.patient}
                onChange={(e) => handleChange('patient', e.target.value)}
                placeholder="Patient full name"
                required
              />
              <datalist id="lab-patient-options">
                {patientOptions.map((patient) => (
                  <option key={patient} value={patient} />
                ))}
              </datalist>
            </div>

            <div className="lab-field">
              <label htmlFor="lab-test-name">Test Name</label>
              <input
                id="lab-test-name"
                value={labForm.testName}
                onChange={(e) => handleChange('testName', e.target.value)}
                placeholder="CBC, HbA1c, Cholesterol..."
                required
              />
            </div>

            <div className="lab-field">
              <label htmlFor="lab-result-image">Result Image</label>
              <input
                id="lab-result-image"
                type="file"
                accept="image/*"
                onChange={handleResultImageChange}
              />
              {labForm.resultImageName && (
                <div className="selected-result-image">Selected: {labForm.resultImageName}</div>
              )}
            </div>

            <div className="lab-field">
              <label htmlFor="lab-date">Date</label>
              <input
                id="lab-date"
                type="date"
                value={labForm.date}
                onChange={(e) => handleChange('date', e.target.value)}
                required
              />
            </div>
          </div>

          <div className="lab-field">
            <label htmlFor="lab-notes">Notes</label>
            <textarea
              id="lab-notes"
              rows="3"
              value={labForm.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              placeholder="Clinical interpretation or follow-up instructions"
              required
            />
          </div>

          <button type="submit" className="btn-primary">
            Add Lab Result
          </button>
        </form>

        <div className="results-head">
          <h4>Results</h4>
          <input
            type="search"
            className="records-search"
            placeholder="Search by patient name"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="results-output-section">
          <h5 className="output-title">Lab Results Output</h5>
          <div className="lab-results-list">
            {filteredLabResults.map((result) => (
              <div key={result.id} className="lab-result-item">
                <div className="lab-result-head">
                  <h5>{result.patient}</h5>
                  <span>{result.date}</span>
                </div>
                <p><strong>{result.testName}</strong></p>
                {result.resultImage && (
                  <img className="lab-result-image" src={result.resultImage} alt={`${result.testName} result`} />
                )}
                <p className="lab-notes">{result.notes}</p>
              </div>
            ))}
            {!filteredLabResults.length && <div className="empty-state">No lab results match this patient search.</div>}
          </div>
        </div>

        <div className="results-output-section">
          <h5 className="output-title">Medical Records Output</h5>
          <div className="records-list">
            {filteredMedicalRecords.map((record, index) => (
              <div key={record.id || index} className="record-item">
                <div>
                  <h5>{record.patient}</h5>
                  <span className="record-date">{record.date}</span>
                </div>
                <p>{record.diagnosis}</p>
                {record.prescription && <p><strong>Prescription:</strong> {record.prescription}</p>}
                {record.notes && <p>{record.notes}</p>}
              </div>
            ))}
            {!filteredMedicalRecords.length && <div className="empty-state">No medical records match this patient search.</div>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MedicalRecords;
