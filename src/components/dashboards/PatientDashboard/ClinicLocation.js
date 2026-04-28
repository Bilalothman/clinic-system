import React from 'react';
import './ClinicLocation.css';

const clinicName = 'Vera Clinic | Hair Transplant Clinic in Turkey';
const clinicAddress = 'Kordonboyu, Turgut Özal Blv. No: 47, 34860 Kartal/İstanbul, Türkiye';
const encodedDestination = encodeURIComponent(`${clinicName}, ${clinicAddress}`);
const mapUrl = `https://www.google.com/maps?q=${encodedDestination}&output=embed`;
const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodedDestination}`;

const ClinicLocation = () => {
  return (
    <div className="clinic-location-page fade-in-up">
      <div className="clinic-location-header">
        <h3>Clinic Location</h3>
        <p>{clinicName}</p>
      </div>

      <div className="clinic-location-map">
        <iframe
          title="Clinic location on Google Maps"
          src={mapUrl}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>

      <div className="clinic-location-details">
        <div>
          <span>Address</span>
          <strong>{clinicAddress}</strong>
        </div>
        <a className="btn-primary clinic-location-directions" href={directionsUrl} target="_blank" rel="noreferrer">
          Get Directions
        </a>
      </div>
    </div>
  );
};

export default ClinicLocation;
