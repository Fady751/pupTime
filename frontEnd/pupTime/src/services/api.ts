import axios from 'axios';
import { getData } from '../utils/authStorage';
import { API_URL } from '@env';

const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use(async config => {
  const data = await getData();
  if (data?.token) {
    config.headers.Authorization = `token ${data.token}`;
  }
  return config;
});

export default api;