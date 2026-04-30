import React, { useState } from 'react';
import { useApi } from '../../../hooks/useApi';
import './ContactUs.css';

const ContactUs = () => {
  const { apiCall } = useApi();
  const [form, setForm] = useState({ subject: '', message: '' });
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const subject = form.subject.trim();
    const message = form.message.trim();

    if (!subject || !message) {
      setFeedback('Please enter a subject and message.');
      return;
    }

    setIsSubmitting(true);
    setFeedback('');

    try {
      await apiCall('/patient-complaints', {
        method: 'POST',
        body: JSON.stringify({ subject, message }),
      });
      setForm({ subject: '', message: '' });
      setFeedback('Your complaint was sent to the manager.');
    } catch (error) {
      setFeedback(error.message || 'Could not send your complaint.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="contact-us-card fade-in-up">
      <div className="contact-us-header">
        <h3>Complaints</h3>
        <p>Send a complaint or concern directly to the clinic manager.</p>
      </div>

      <form className="contact-us-form" onSubmit={handleSubmit}>
        <label htmlFor="contact-subject">Subject</label>
        <input
          id="contact-subject"
          value={form.subject}
          maxLength={180}
          onChange={(event) => handleChange('subject', event.target.value)}
          placeholder="What is this about?"
        />

        <label htmlFor="contact-message">Message</label>
        <textarea
          id="contact-message"
          rows="7"
          value={form.message}
          onChange={(event) => handleChange('message', event.target.value)}
          placeholder="Write your complaint or concern"
        />

        <button type="submit" className="btn-primary contact-us-submit" disabled={isSubmitting}>
          {isSubmitting ? 'Sending...' : 'Submit Complaint'}
        </button>
      </form>

      {feedback && <div className="contact-us-feedback">{feedback}</div>}
    </div>
  );
};

export default ContactUs;
