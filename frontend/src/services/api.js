import axios from 'axios';
import { auth } from './firebase';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

// Attach Firebase ID token to every request automatically
api.interceptors.request.use(async (config) => {
  try {
    if (auth.currentUser) {
      const token = await auth.currentUser.getIdToken();
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (e) {
    console.warn('Could not get Firebase token:', e.message);
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      auth.signOut().catch(() => {});
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  getProfile: () => api.get('/auth/profile'),
  updateProfile: (data) => api.put('/auth/profile', data),
  syncProfile: (uid, extra = {}) => api.post('/auth/sync-profile', { uid, ...extra }),
  googleLogin: (idToken) => api.post('/auth/google-login', { idToken }),
  sendOTP: (type, contact) => api.post('/auth/send-otp', { type, contact }),
  verifyOTP: (contact, otp, uid) => api.post('/auth/verify-otp', { contact, otp, uid }),
  getGuardians: () => api.get('/auth/guardians'),
  addGuardian: (email) => api.post('/auth/guardians', { email }),
  removeGuardian: (guardianId) => api.delete(`/auth/guardians/${guardianId}`),
  getWards: () => api.get('/auth/wards')
};

export const sosAPI = {
  create: (data) => api.post('/sos', data),
  getActive: () => api.get('/sos/active'),
  getPending: () => api.get('/sos/pending'),
  getHistory: () => api.get('/sos/history'),
  getById: (sosId) => api.get(`/sos/${sosId}`),
  resolve: (sosId) => api.put(`/sos/${sosId}/resolve`),
  rate: (sosId, responderId, data) => api.post(`/sos/${sosId}/rate/${responderId}`, data),
  flag: (sosId) => api.post(`/sos/${sosId}/flag`),
  getWelfareChecks: () => api.get('/sos/welfare-checks'),
  respondToWelfareCheck: (sosId, response) => api.post(`/sos/${sosId}/welfare-check`, { response })
};

export const civicAPI = {
  create: (formData) => api.post('/civic', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  getAll: (params) => api.get('/civic', { params }),
  getNearby: (longitude, latitude, maxDistance) => api.get('/civic/nearby', { params: { longitude, latitude, maxDistance } }),
  getStats: () => api.get('/civic/stats'),
  getById: (issueId) => api.get(`/civic/${issueId}`),
  update: (issueId, data) => api.patch(`/civic/${issueId}`, data),
  upvote: (issueId) => api.post(`/civic/${issueId}/upvote`),
  addComment: (issueId, text) => api.post(`/civic/${issueId}/comment`, { text }),
  delete: (issueId) => api.delete(`/civic/${issueId}`)
};

export const resourceAPI = {
  add: (data) => api.post('/resources', data),
  getNearby: (longitude, latitude, radius) =>
    api.get('/resources/nearby', { params: { longitude, latitude, radius } }),
  getAll: () => api.get('/resources'),
  seed: (longitude, latitude) => api.post('/resources/seed', { longitude, latitude })
};

export const adminAPI = {
  getStats: () => api.get('/admin/stats'),
  getAllSOS: (params) => api.get('/admin/sos', { params }),
  getLocalityAnalytics: () => api.get('/admin/locality-analytics'),
  getUsers: () => api.get('/admin/users'),
  suspendUser: (userId) => api.put(`/admin/users/${userId}/suspend`),
  unsuspendUser: (userId) => api.put(`/admin/users/${userId}/unsuspend`),
  getCivicStats: () => api.get('/civic/stats'),
  getAllCivicIssues: (params) => api.get('/civic', { params }),
  updateCivicIssue: (issueId, data) => api.patch(`/civic/${issueId}`, data),
};

export const chatbotAPI = {
  chat: (data) => api.post('/ai/chat', data)
};

export const whatsappAPI = {
  getLogs: (params) => api.get('/whatsapp/logs', { params }),
  broadcast: (data) => api.post('/whatsapp/broadcast', data),
  notifyStatus: (data) => api.post('/whatsapp/notify-status', data)
};

export default api;
