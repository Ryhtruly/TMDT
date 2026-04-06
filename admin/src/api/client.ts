import axios from 'axios';

const apiClient = axios.create({
  baseURL: 'http://localhost:3000/api', // Tích hợp với Server của hệ thống
  headers: {
    'Content-Type': 'application/json'
  }
});

// Intercept requests để nhúng Token vào mọi call
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Intercept responses để văng ra màn hình Login nếu token lỗi/hết hạn
apiClient.interceptors.response.use((response) => {
  return response.data; // Trả thẳng data, lược bỏ wrapper axios
}, (error) => {
  if (error.response && error.response.status === 401) {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    window.location.href = '/login';
  }
  return Promise.reject(error);
});

export default apiClient;
