import axios from 'axios';

export const client = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('mrx-token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

client.interceptors.response.use(
  (response) => response.data,
  (error) => Promise.reject(new Error(error.response?.data?.message || error.response?.data?.errors?.[0]?.message || error.message || 'Request failed')),
);

export const api = {
  auth: {
    login: (data) => client.post('/auth/login', data),
    register: (data) => client.post('/auth/register', data),
    me: () => client.get('/auth/me'),
  },
  profile: (data) => client.patch('/profile', data),
  dashboard: () => client.get('/dashboard'),
  doctors: {
    list: (params) => client.get('/doctors', { params }),
    get: (id) => client.get(`/doctors/${id}`),
  },
  appointments: {
    list: () => client.get('/appointments'),
    create: (data) => client.post('/appointments', data),
    status: (id, status) => client.patch(`/appointments/${id}/status`, { status }),
    cancel: (id) => client.patch(`/appointments/${id}/cancel`),
    reschedule: (id, startAt) => client.patch(`/appointments/${id}/reschedule`, { startAt }),
  },
  records: () => client.get('/records'),
  reports: {
    pdf: (id) => client.get(`/reports/${id}/pdf`, { responseType: 'blob' }),
  },
  availability: (slots) => client.put('/availability', { slots }),
  notifications: {
    list: () => client.get('/notifications'),
    read: (id) => client.patch(`/notifications/${id}/read`),
  },
  clinical: {
    patients: (search) => client.get('/patients', { params: search ? { search } : {} }),
    results: (patientId) => client.get(`/patients/${patientId}/results`),
    addResult: (patientId, data) => client.post(`/patients/${patientId}/results`, data),
    prescription: (data) => client.post('/prescriptions', data),
    report: (data) => client.post('/reports', data),
  },
  admin: {
    users: () => client.get('/admin/users'),
    userStatus: (id, status) => client.patch(`/admin/users/${id}/status`, { status }),
    doctors: () => client.get('/admin/doctors'),
    addDoctor: (data) => client.post('/admin/doctors', data),
    approval: (id, approved) => client.patch(`/admin/doctors/${id}/approval`, { approved }),
    audits: () => client.get('/admin/audit-logs'),
    departments: () => client.get('/admin/departments'),
    addDepartment: (name) => client.post('/admin/departments', { name }),
  },
  patients: {
    list: (search) => client.get('/patients', { params: search ? { search } : {} }),
    get: (id) => client.get(`/patients/${id}`),
    create: (data) => client.post('/patients', data),
    update: (id, data) => client.put(`/patients/${id}`, data),
    delete: (id) => client.delete(`/patients/${id}`),
  },
  tests: {
    list: (patientId, biomarker) => client.get(`/patients/${patientId}/tests`, { params: biomarker ? { biomarker } : {} }),
    create: (patientId, data) => client.post(`/patients/${patientId}/tests`, data),
    delete: (testId) => client.delete(`/tests/${testId}`),
  },
};
