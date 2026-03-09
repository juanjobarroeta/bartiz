// API Configuration
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

export const getApiUrl = (endpoint) => {
  // Remove leading slash if present
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint
  return `${API_URL}/${cleanEndpoint}`
}

export default API_URL
