import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { useApi } from '../../../hooks/useApi';
import './Patients.css';

const formatDisplayDate = (value) => {
  if (!value || value === 'TBD' || value === 'N/A') {
    return value || '-';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return String(value);
  }

  return parsed.toISOString().slice(0, 10);
};

const getInitials = (name) => String(name || 'P')
  .trim()
  .split(/\s+/)
  .slice(0, 2)
  .map((part) => part[0]?.toUpperCase() || '')
  .join('') || 'P';

const Patients = () => {
  const { user } = useAuth();
  const { apiCall } = useApi();
  const [patientList, setPatientList] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const loadPatients = async () => {
      try {
        const doctorQuery = user?.userId ? `?doctorId=${user.userId}` : '';
        const rows = await apiCall(`/patients${doctorQuery}`);
        setPatientList(rows || []);
      } catch (error) {
        setPatientList([]);
      }
    };

    loadPatients();
  }, [apiCall, user?.userId]);

  const filteredPatients = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    if (!query) {
      return patientList;
    }

    return patientList.filter((patient) =>
      [patient.name, patient.condition, patient.nextVisit].some((value) =>
        String(value || '').toLowerCase().includes(query)
      )
    );
  }, [patientList, searchTerm]);

  return (
    <div className="card fade-in-left">
      <div className="card-header">
        <h3>All Patients</h3>
      </div>
      <input
        type="search"
        className="patient-search"
        placeholder="Search patients by name, condition, or next visit"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />
      <div className="patients-grid">
        {filteredPatients.map((patient) => (
          <div key={patient.id} className="patient-widget">
            <div className="patient-widget-photo-wrap">
              {patient.profileImage ? (
                <img src={patient.profileImage} alt={`${patient.name} profile`} className="patient-widget-photo" />
              ) : (
                <div className="patient-widget-photo-fallback">{getInitials(patient.name)}</div>
              )}
            </div>
            <h4>{patient.name}</h4>
            <p className="condition">{patient.condition}</p>
            <span className="next-visit">Next: {formatDisplayDate(patient.nextVisit)}</span>
            <div className="patient-widget-info">
              <span><strong>DOB:</strong> {formatDisplayDate(patient.dob)}</span>
              <span><strong>Age:</strong> {patient.age || '-'}</span>
              <span><strong>Gender:</strong> {patient.gender || '-'}</span>
              <span><strong>Phone:</strong> {patient.phone || '-'}</span>
              <span><strong>Email:</strong> {patient.email || '-'}</span>
              <span><strong>Address:</strong> {patient.address || '-'}</span>
            </div>
          </div>
        ))}
      </div>

      {!filteredPatients.length && (
        <div className="empty-state">No patients matched your search.</div>
      )}

    </div>
  );
};

export default Patients;
