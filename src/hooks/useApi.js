export const useApi = () => {
  const apiCall = async (endpoint, options = {}) => {
    const token = localStorage.getItem('token');
    
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(`http://localhost:3001/api${endpoint}`, config);
      return await response.json();
    } catch (error) {
      throw new Error(error.message);
    }
  };

  return { apiCall };
};