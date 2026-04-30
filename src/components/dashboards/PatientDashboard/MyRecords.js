import React, { useEffect, useMemo, useState } from 'react';
import { jsPDF } from 'jspdf';
import { useAuth } from '../../../hooks/useAuth';
import { useApi } from '../../../hooks/useApi';
import './MyRecords.css';

const getReportFileName = (result) => {
  const safeTestName = (result.testName || 'lab-result')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  const safeDate = (result.date || new Date().toISOString().slice(0, 10)).replace(/[^0-9-]/g, '');

  return `${safeTestName || 'lab-result'}-${safeDate || 'report'}.pdf`;
};

const getImageFormat = (imageSource) => {
  const source = String(imageSource || '').toLowerCase();

  if (source.startsWith('data:image/png') || source.endsWith('.png')) {
    return 'PNG';
  }

  return 'JPEG';
};

const loadImageSize = (imageSource) => new Promise((resolve, reject) => {
  const image = new Image();

  image.onload = () => resolve({
    width: image.naturalWidth || image.width,
    height: image.naturalHeight || image.height,
  });
  image.onerror = reject;
  image.src = imageSource;
});

const exportLabResultPdf = async (result) => {
  const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const margin = 48;
  const contentWidth = pageWidth - margin * 2;
  let y = 52;

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(18);
  pdf.text('Lab Result', margin, y);

  y += 34;
  pdf.setFontSize(12);
  pdf.text(`Test Name: ${result.testName || 'Lab Test'}`, margin, y);

  y += 22;
  pdf.text(`Date: ${result.date || 'N/A'}`, margin, y);

  y += 30;
  if (result.resultImage) {
    try {
      const size = await loadImageSize(result.resultImage);
      const imageWidth = contentWidth;
      const imageHeight = Math.min((size.height / size.width) * imageWidth, 420);

      pdf.addImage(result.resultImage, getImageFormat(result.resultImage), margin, y, imageWidth, imageHeight);
      y += imageHeight + 30;
    } catch (error) {
      pdf.setFont('helvetica', 'normal');
      pdf.text('Result image could not be added to the PDF.', margin, y);
      y += 28;
    }
  }

  pdf.setFont('helvetica', 'bold');
  pdf.text('Notes:', margin, y);
  y += 18;

  pdf.setFont('helvetica', 'normal');
  const noteLines = pdf.splitTextToSize(result.notes || 'No notes provided', contentWidth);
  pdf.text(noteLines, margin, y);
  pdf.save(getReportFileName(result));
};

const getRecordFileName = (record) => {
  const safeDoctor = (record.doctor || 'medical-record')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  const safeDate = (record.date || new Date().toISOString().slice(0, 10)).replace(/[^0-9-]/g, '');

  return `${safeDoctor || 'medical-record'}-${safeDate || 'record'}.txt`;
};

const exportMedicalRecord = (record) => {
  const lines = [
    'Medical Record',
    '',
    `Date: ${record.date || 'N/A'}`,
    `Doctor: ${record.doctor || 'Doctor'}`,
    '',
    `Diagnosis: ${record.diagnosis || 'No diagnosis provided'}`,
    '',
    `Prescription: ${record.prescription || 'No prescription provided'}`,
    '',
    `Notes: ${record.notes || 'No notes provided'}`,
  ];
  const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = getRecordFileName(record);
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

const MyRecords = () => {
  const { user } = useAuth();
  const { apiCall } = useApi();
  const [records, setRecords] = useState([]);
  const [labResults, setLabResults] = useState([]);

  const patientId = user?.userId || '';

  useEffect(() => {
    const loadData = async () => {
      if (!patientId) {
        setRecords([]);
        setLabResults([]);
        return;
      }

      try {
        const [recordRows, labRows] = await Promise.all([
          apiCall(`/medical-records?patientId=${patientId}`),
          apiCall(`/lab-results?patientId=${patientId}`),
        ]);

        setRecords((recordRows || []).sort((a, b) => b.date.localeCompare(a.date)));
        setLabResults((labRows || []).sort((a, b) => b.date.localeCompare(a.date)));
      } catch (error) {
        setRecords([]);
        setLabResults([]);
      }
    };

    loadData();
  }, [apiCall, patientId]);

  const myLabResults = useMemo(() => {
    return [...labResults].sort((a, b) => b.date.localeCompare(a.date));
  }, [labResults]);

  return (
    <div className="card fade-in-left">
      <div className="card-header">
        <h3>My Medical Records</h3>
      </div>

      <div className="records-timeline">
        {records.map((record, index) => (
          <div key={record.id || index} className="timeline-item">
            <div className="timeline-date">{record.date}</div>
            <div className="timeline-content">
              <div className="record-header">
                <h5>{record.doctor || 'Doctor'}</h5>
                <div className="record-header-actions">
                  <span className="diagnosis-tag">Medical Record</span>
                  <button
                    type="button"
                    className="record-export"
                    onClick={() => exportMedicalRecord(record)}
                  >
                    Export
                  </button>
                </div>
              </div>
              <div className="record-field">
                <strong>Diagnosis:</strong> {record.diagnosis || 'No diagnosis provided'}
              </div>
              <div className="record-field prescription">
                <strong>Prescription:</strong> {record.prescription || 'No prescription provided'}
              </div>
              <div className="record-field notes">
                <strong>Notes:</strong> {record.notes || 'No notes provided'}
              </div>
            </div>
          </div>
        ))}
        {!records.length && (
          <div className="empty-state">No medical records added for your account yet.</div>
        )}
      </div>

      <div className="lab-results-section">
        <h4>My Lab Results</h4>
        <div className="lab-results-list">
          {myLabResults.map((result) => (
            <div key={result.id} className="lab-result-card">
              <div className="lab-result-head">
                <div>
                  <h5>{result.testName}</h5>
                  <span>{result.date}</span>
                </div>
                {result.resultImage && (
                  <button
                    type="button"
                    className="lab-result-export"
                    onClick={() => exportLabResultPdf(result)}
                  >
                    Export
                  </button>
                )}
              </div>
              {result.resultImage && (
                <img className="lab-result-image" src={result.resultImage} alt={`${result.testName} result`} />
              )}
              <p className="lab-result-notes">{result.notes}</p>
            </div>
          ))}
          {!myLabResults.length && (
            <div className="empty-state">No lab results added for your account yet.</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MyRecords;
