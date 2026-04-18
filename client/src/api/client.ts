import axios from 'axios';

const apiClient = axios.create({
  baseURL: 'http://localhost:3000/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Đọc token từ sessionStorage thay vì localStorage
apiClient.interceptors.request.use(
  (config) => {
    const token = sessionStorage.getItem('shop_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Tự động đăng xuất nếu token lỗi/hết hạn (401)
apiClient.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    if (error.response && error.response.status === 401) {
      sessionStorage.removeItem('shop_token');
      sessionStorage.removeItem('shop_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default apiClient;
