import React, { useEffect, useMemo, useState } from 'react';
import {
  getAppointmentsFromStorage,
  subscribeToAppointments,
} from '../../../utils/appointmentsStore';
import './AppointmentsOverview.css';

const getWeekdayFromDate = (dateString) => {
  if (!dateString) {
    return '-';
  }

  const date = new Date(`${dateString}T00:00:00`);
  return date.toLocaleDateString('en-US', { weekday: 'long' });
};

const AppointmentsOverview = () => {
  const [appointments, setAppointments] = useState(() => getAppointmentsFromStorage());
  const [doctorFilter, setDoctorFilter] = useState('all');

  useEffect(() => {
    const unsubscribe = subscribeToAppointments(setAppointments);
    return unsubscribe;
  }, []);

  const doctorOptions = useMemo(() => {
    return ['all', ...Array.from(new Set(appointments.map((appointment) => appointment.doctor)))];
  }, [appointments]);

  const visibleAppointments = useMemo(() => {
    if (doctorFilter === 'all') {
      return appointments;
    }

    return appointments.filter((appointment) => appointment.doctor === doctorFilter);
  }, [appointments, doctorFilter]);

  const sortedAppointments = useMemo(() => {
    return [...visibleAppointments].sort((a, b) => {
      if (a.date === b.date) {
        return a.time.localeCompare(b.time);
      }

      return a.date.localeCompare(b.date);
    });
  }, [visibleAppointments]);

  return (
    <div className="card fade-in-up">
      <div className="card-header">
        <h3>All Doctors Appointments</h3>
      </div>

      <div className="appointments-overview-filter">
        <label htmlFor="manager-doctor-filter">Filter by doctor</label>
        <select
          id="manager-doctor-filter"
          value={doctorFilter}
          onChange={(e) => setDoctorFilter(e.target.value)}
        >
          {doctorOptions.map((doctor) => (
            <option key={doctor} value={doctor}>
              {doctor === 'all' ? 'All Doctors' : doctor}
            </option>
          ))}
        </select>
      </div>

      <div className="table-container">
        <table className="management-table">
          <thead>
            <tr>
              <th>Doctor</th>
              <th>Patient</th>
              <th>Date</th>
              <th>Day</th>
              <th>Time</th>
              <th>Status</th>
              <th>Fee</th>
            </tr>
          </thead>
          <tbody>
            {sortedAppointments.map((appointment) => (
              <tr key={appointment.id} className="table-row">
                <td>{appointment.doctor}</td>
                <td>{appointment.patient}</td>
                <td>{appointment.date}</td>
                <td>{getWeekdayFromDate(appointment.date)}</td>
                <td>{appointment.time}</td>
                <td>
                  <span className={`status-badge ${appointment.status}`}>{appointment.status}</span>
                </td>
                <td>{appointment.doctorFee ? `$${appointment.doctorFee}` : '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!sortedAppointments.length && (
        <div className="empty-state">No appointments found for this doctor filter.</div>
      )}
    </div>
  );
};

export default AppointmentsOverview;
