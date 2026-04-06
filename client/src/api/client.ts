import axios from 'axios';

const apiClient = axios.create({
  baseURL: 'http://localhost:3000/api', // Match backend dev URL
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request Interceptor: Attach JWT Token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('shop_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Unwrap array/data securely & Auto Logout
apiClient.interceptors.response.use(
  (response) => {
    // Luôn luôn unwrap axios layer, trả về payload thật sự từ Backend
    return response.data;
  },
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('shop_token');
      localStorage.removeItem('shop_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default apiClient;
