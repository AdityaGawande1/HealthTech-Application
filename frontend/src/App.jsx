import { useState } from 'react';
import { Link, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { HeartPulse, ShieldCheck, Stethoscope, UserRound } from 'lucide-react';
import { api } from './api/client';
import { AuthProvider, useAuth } from './context/AuthContext';
import Workspace from './portal/Workspace';
import PortalLayout from './portal/PortalLayout';

const rolePath = { ADMIN: '/admin/dashboard', DOCTOR: '/doctor/dashboard', PATIENT: '/patient/dashboard' };

function AuthPage({ register = false }) {
  const [form, setForm] = useState({ name: '', email: '', password: '', age: 30, gender: 'Other', role: 'PATIENT' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState(register);
  const { user, signIn } = useAuth();
  const navigate = useNavigate();
  if (user) return <Navigate to={rolePath[user.role] || '/login'} replace />;
  const update = (key, value) => setForm((state) => ({ ...state, [key]: value }));
  const submit = async (event) => {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const response = mode
        ? await api.auth.register({ ...form, age: Number(form.age) })
        : await api.auth.login({ email: form.email, password: form.password, role: form.role || undefined });
      signIn(response.data); navigate(rolePath[response.data.user.role], { replace: true });
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };
  const demo = (role) => setForm({ ...form, email: `${role.toLowerCase()}@mrx.local`, password: 'MrxDemo123!', role });
  return (
    <div className="min-h-screen bg-[#f4f8f8] lg:grid lg:grid-cols-[1.05fr_.95fr]">
      <section className="relative hidden overflow-hidden bg-[#092e32] px-14 py-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -right-24 -top-20 h-96 w-96 rounded-full border border-white/10" /><div className="absolute -right-8 -top-4 h-64 w-64 rounded-full border border-white/10" />
        <Link to="/login" className="relative flex items-center gap-3"><div className="rounded-xl bg-teal-400 p-2.5 text-[#092e32]"><HeartPulse size={24} /></div><span className="text-lg font-bold tracking-tight">MRX <span className="font-normal text-teal-200">HealthTECH</span></span></Link>
        <div className="relative max-w-xl pb-12"><p className="mb-4 text-xs font-bold uppercase tracking-[.24em] text-teal-300">Care, connected</p><h1 className="text-5xl font-semibold leading-tight">Your health journey, all in one place.</h1><p className="mt-6 max-w-md text-lg leading-8 text-teal-50/70">Appointments, clinical records and care teams come together in a clear, connected experience.</p><div className="mt-10 flex gap-3"><span className="rounded-full border border-white/20 px-4 py-2 text-sm">Patient portal</span><span className="rounded-full border border-white/20 px-4 py-2 text-sm">Care team tools</span></div></div>
        <p className="relative text-xs text-white/50">Private demonstration environment · Fictional demo records</p>
      </section>
      <section className="flex min-h-screen items-center justify-center px-5 py-10 sm:px-10">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center gap-3 lg:hidden"><div className="rounded-xl bg-teal-700 p-2 text-white"><HeartPulse size={22} /></div><span className="font-bold">MRX HealthTECH</span></div>
          <p className="text-sm font-semibold text-teal-700">WELCOME TO MRX</p><h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">{mode ? 'Create your patient account' : 'Sign in to your workspace'}</h2><p className="mt-2 text-sm text-slate-500">{mode ? 'Set up your secure personal health portal.' : 'Use your account to continue to your care workspace.'}</p>
          <form onSubmit={submit} className="mt-8 space-y-4">
            {mode && <label className="block"><span className="label">Full name</span><input className="input" autoComplete="name" value={form.name} onChange={(e) => update('name', e.target.value)} required /></label>}
            <label className="block"><span className="label">Email address</span><input className="input" type="email" autoComplete="username" value={form.email} onChange={(e) => update('email', e.target.value)} required /></label>
            <label className="block"><span className="label">Password</span><input className="input" type="password" autoComplete={mode ? 'new-password' : 'current-password'} minLength={mode ? 8 : undefined} value={form.password} onChange={(e) => update('password', e.target.value)} required /></label>
            {mode ? <div className="grid grid-cols-2 gap-3"><label><span className="label">Age</span><input className="input" type="number" min="0" max="120" value={form.age} onChange={(e) => update('age', e.target.value)} required /></label><label><span className="label">Gender</span><select className="input" value={form.gender} onChange={(e) => update('gender', e.target.value)}><option>Female</option><option>Male</option><option>Other</option></select></label></div> : <label className="block"><span className="label">Workspace</span><select className="input" value={form.role} onChange={(e) => update('role', e.target.value)}><option value="PATIENT">Patient</option><option value="DOCTOR">Doctor</option><option value="ADMIN">Administrator</option></select></label>}
            {error && <p className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700" role="alert">{error}</p>}
            <button className="btn-primary w-full py-3" disabled={busy}>{busy ? 'Please wait…' : mode ? 'Create account' : 'Sign in'}</button>
          </form>
          {!mode && <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Demo access</p><div className="mt-3 grid grid-cols-3 gap-2">{[['PATIENT', UserRound], ['DOCTOR', Stethoscope], ['ADMIN', ShieldCheck]].map(([role, Icon]) => <button key={role} onClick={() => demo(role)} className="flex flex-col items-center gap-1 rounded-lg bg-slate-50 px-2 py-3 text-xs font-medium text-slate-700 hover:bg-teal-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-600"><Icon size={17} />{role[0] + role.slice(1).toLowerCase()}</button>)}</div><p className="mt-2 text-center text-xs text-slate-400">Password: MrxDemo123!</p></div>}
          <p className="mt-6 text-center text-sm text-slate-600">{mode ? 'Already have an account?' : 'New to MRX HealthTECH?'} <button className="font-semibold text-teal-700 hover:underline" onClick={() => { setMode(!mode); setError(''); }}> {mode ? 'Sign in' : 'Create an account'}</button></p>
          <p className="mt-8 text-center text-xs text-slate-400">For demonstration use only. Not for emergency care.</p>
        </div>
      </section>
    </div>
  );
}

function PrivatePortal() {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <div className="grid min-h-screen place-items-center text-sm text-slate-500">Loading your secure workspace…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (location.pathname === '/') return <Navigate to={rolePath[user.role]} replace />;
  const requestedRole = location.pathname.split('/')[1]?.toUpperCase();
  if (rolePath[requestedRole] && requestedRole !== user.role) return <Navigate to={rolePath[user.role]} replace />;
  return <PortalLayout><Workspace /></PortalLayout>;
}

export default function App() {
  return <AuthProvider><Routes><Route path="/login" element={<AuthPage />} /><Route path="/register" element={<AuthPage register />} /><Route path="/*" element={<PrivatePortal />} /></Routes></AuthProvider>;
}
