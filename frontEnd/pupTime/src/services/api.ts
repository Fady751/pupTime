import axios from 'axios';
import { AppMetaRepository } from '../DB/Repositories/AppMetaRepository';
import { API_URL } from '@env';

const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
});

api.interceptors.request.use(async config => {
  const tokenMeta = await AppMetaRepository.get('authToken');
  if (tokenMeta?.value) {
    config.headers.Authorization = `token ${tokenMeta.value}`;
  }
  return config;
});

export default api;