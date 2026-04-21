import axios from 'axios';

const apiClient = axios.create({
  baseURL: 'http://localhost:3000/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Read persistent token first, fallback to older sessionStorage sessions.
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('stockkeeper_token') || sessionStorage.getItem('stockkeeper_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Tự động đăng xuất nếu token lỗi/hết hạn (401)
apiClient.interceptors.response.use((response) => {
  return response.data;
}, (error) => {
  if (error.response && error.response.status === 401) {
    localStorage.removeItem('stockkeeper_token');
    localStorage.removeItem('stockkeeper_user');
    sessionStorage.removeItem('stockkeeper_token');
    sessionStorage.removeItem('stockkeeper_user');
    window.location.href = '/login';
  }
  return Promise.reject(error);
});

export default apiClient;
