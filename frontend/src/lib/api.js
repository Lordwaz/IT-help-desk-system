import axios from "axios";

const API_BASE = `${process.env.REACT_APP_BACKEND_URL}/api`;

const api = axios.create({ baseURL: API_BASE, withCredentials: true });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export { API_BASE };
export default api;
