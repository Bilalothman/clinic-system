import { useCallback } from 'react';

export const useApi = () => {
  const apiCall = useCallback(async (endpoint, options = {}) => {
    const token = localStorage.getItem('token');
    const baseUrl = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001/api';
    
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(`${baseUrl}${endpoint}`, config);
      const contentType = response.headers.get('content-type') || '';
      const isJsonResponse = contentType.includes('application/json');
      const data = isJsonResponse ? await response.json().catch(() => ({})) : {};

      if (!response.ok) {
        const message = data?.message || `Request failed (${response.status} ${response.statusText}).`;
        throw new Error(message);
      }

      return data;
    } catch (error) {
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        throw new Error('Could not connect to the API server. Please start the backend on http://localhost:3001 and try again.');
      }

      throw new Error(error.message);
    }
  }, []);

  return { apiCall };
};
