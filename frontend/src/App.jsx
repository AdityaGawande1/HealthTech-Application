import { Component, useState } from 'react';
import { Link, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { Activity, ArrowRight, HeartPulse, ShieldCheck, Stethoscope, UserRound } from 'lucide-react';
import { api } from './api/client';
import { AuthProvider, useAuth } from './context/AuthContext';
import Workspace from './portal/Workspace';
import PortalLayout from './portal/PortalLayout';

const rolePath = { ADMIN: '/admin/dashboard', DOCTOR: '/doctor/dashboard', PATIENT: '/patient/dashboard' };

function AuthPage({ register = false }) {
  const [form, setForm] = useState({ name: '', email: '', password: '', age: 30, gender: 'Other', role: register ? 'PATIENT' : 'AUTO', phone: '', specialization: '', qualifications: '', experienceYears: 0, licenseNumber: '', city: '' });
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
      let response;
      if (mode) {
        const isDoctor = form.role === 'DOCTOR';
        const base = { name: form.name.trim(), email: form.email.trim(), password: form.password, role: isDoctor ? 'DOCTOR' : 'PATIENT' };
        const extra = isDoctor
          ? { specialization: form.specialization.trim(), qualifications: form.qualifications.trim(), experienceYears: Number(form.experienceYears) || 0, licenseNumber: form.licenseNumber.trim(), ...(form.city.trim() ? { city: form.city.trim() } : {}) }
          : { age: Number(form.age) || 0, gender: form.gender, ...(form.phone.trim() ? { phone: form.phone.trim() } : {}) };
        response = await api.auth.register({ ...base, ...extra });
      } else {
        response = await api.auth.login({ email: form.email.trim(), password: form.password });
      }
      if (response.data.pendingApproval) { setMode(false); setError('Your doctor account was created. The admin must approve it before you can sign in.'); return; }
      signIn(response.data); navigate(rolePath[response.data.user.role], { replace: true });
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };
  const demo = async (role) => {
    const email = { ADMIN: 'admin@mrx.local', DOCTOR: 'doctor1@mrx.local', PATIENT: 'patient1@mrx.local' }[role];
    setBusy(true); setError('');
    try { const response = await api.auth.login({ email, password: 'MrxDemo123!', role }); signIn(response.data); navigate(rolePath[role], { replace: true }); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };
  return (
    <div className="min-h-screen bg-[#f4f8f8] lg:grid lg:grid-cols-[1.05fr_.95fr]">
      <section className="relative hidden overflow-hidden bg-[#092e32] px-14 py-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -right-24 -top-20 h-96 w-96 rounded-full border border-white/10" /><div className="absolute -right-8 -top-4 h-64 w-64 rounded-full border border-white/10" />
        <Link to="/login" className="relative flex items-center gap-3"><div className="rounded-xl bg-teal-400 p-2.5 text-[#092e32]"><HeartPulse size={24} /></div><span className="text-lg font-bold tracking-tight">MRX <span className="font-normal text-teal-200">HealthTECH</span></span></Link>
        <div className="relative max-w-xl pb-12"><p className="mb-4 text-xs font-bold uppercase tracking-[.24em] text-teal-300">Care, connected</p><h1 className="text-5xl font-semibold leading-tight">Your health journey, all in one place.</h1><p className="mt-6 max-w-md text-lg leading-8 text-teal-50/70">Appointments, clinical records and care teams come together in a clear, connected experience.</p><div className="mt-10 flex gap-3"><span className="rounded-full border border-white/20 px-4 py-2 text-sm">Patient portal</span><span className="rounded-full border border-white/20 px-4 py-2 text-sm">Care team tools</span></div></div>
        <p className="relative text-xs text-white/50">Private demonstration environment - Fictional demo records</p>
      </section>
      <section className="flex min-h-screen items-center justify-center px-5 py-10 sm:px-10">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center gap-3 lg:hidden"><div className="rounded-xl bg-teal-700 p-2 text-white"><HeartPulse size={22} /></div><span className="font-bold">MRX HealthTECH</span></div>
          <p className="text-sm font-semibold text-teal-700">WELCOME TO MRX</p><h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">{mode ? 'Create your patient account' : 'Sign in to your workspace'}</h2><p className="mt-2 text-sm text-slate-500">{mode ? 'Set up your secure personal health portal.' : 'Use your account to continue to your care workspace.'}</p>
          <form onSubmit={submit} className="mt-8 space-y-4">
            {mode && <><label className="block"><span className="label">Account type</span><select className="input" value={form.role === 'AUTO' ? 'PATIENT' : form.role} onChange={(e) => update('role', e.target.value)}><option value="PATIENT">Patient</option><option value="DOCTOR">Doctor</option></select></label><label className="block"><span className="label">Full name</span><input className="input" autoComplete="name" value={form.name} onChange={(e) => update('name', e.target.value)} required /></label></>}
            <label className="block"><span className="label">Email address</span><input className="input" type="email" autoComplete="username" value={form.email} onChange={(e) => update('email', e.target.value)} required /></label>
            <label className="block"><span className="label">Password</span><input className="input" type="password" autoComplete={mode ? 'new-password' : 'current-password'} minLength={mode ? 8 : undefined} value={form.password} onChange={(e) => update('password', e.target.value)} required />{mode && <span className="mt-1 block text-xs text-slate-400">Use at least 8 characters.</span>}</label>
            {mode ? form.role === 'DOCTOR' ? <div className="grid grid-cols-2 gap-3"><label><span className="label">Specialty</span><input className="input" value={form.specialization} onChange={(e) => update('specialization', e.target.value)} required /></label><label><span className="label">Qualifications</span><input className="input" value={form.qualifications} onChange={(e) => update('qualifications', e.target.value)} required /></label><label><span className="label">Experience (years)</span><input className="input" type="number" min="0" max="80" value={form.experienceYears} onChange={(e) => update('experienceYears', e.target.value)} required /></label><label><span className="label">Registration number</span><input className="input" value={form.licenseNumber} onChange={(e) => update('licenseNumber', e.target.value)} required /></label><label className="col-span-2"><span className="label">City</span><input className="input" value={form.city} onChange={(e) => update('city', e.target.value)} /></label></div> : <div className="grid grid-cols-2 gap-3"><label className="col-span-2"><span className="label">Phone (optional)</span><input className="input" type="tel" autoComplete="tel" value={form.phone} onChange={(e) => update('phone', e.target.value)} maxLength={30} /></label><label><span className="label">Age</span><input className="input" type="number" min="0" max="120" value={form.age} onChange={(e) => update('age', e.target.value)} required /></label><label><span className="label">Gender</span><select className="input" value={form.gender} onChange={(e) => update('gender', e.target.value)}><option>Female</option><option>Male</option><option>Other</option></select></label></div> : null}
            {error && <p className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700" role="alert">{error}</p>}
            <button className="btn-primary w-full py-3" disabled={busy}>{busy ? 'Please wait...' : mode ? 'Create account' : 'Sign in'}</button>
          </form>
          {!mode && <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Demo access</p><div className="mt-3 grid grid-cols-3 gap-2">{[['PATIENT', UserRound], ['DOCTOR', Stethoscope], ['ADMIN', ShieldCheck]].map(([role, Icon]) => <button key={role} onClick={() => demo(role)} className="flex flex-col items-center gap-1 rounded-lg bg-slate-50 px-2 py-3 text-xs font-medium text-slate-700 hover:bg-teal-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-600"><Icon size={17} />{role[0] + role.slice(1).toLowerCase()}</button>)}</div><p className="mt-2 text-center text-xs text-slate-400">Password: MrxDemo123!</p></div>}
          <p className="mt-6 text-center text-sm text-slate-600">{mode ? 'Already have an account?' : 'New to MRX HealthTECH?'} <button className="font-semibold text-teal-700 hover:underline" onClick={() => { const nextMode = !mode; setMode(nextMode); update('role', nextMode ? 'PATIENT' : 'AUTO'); setError(''); }}> {mode ? 'Sign in' : 'Create an account'}</button></p>
          {!mode && <p className="mt-3 text-center text-sm"><Link className="font-medium text-teal-700 hover:underline" to="/forgot-password">Forgot your password?</Link></p>}
          <p className="mt-8 text-center text-xs text-slate-400">For demonstration use only. Not for emergency care.</p>
        </div>
      </section>
    </div>
  );
}

function Landing() {
  const { user } = useAuth();
  if (user) return <Navigate to={rolePath[user.role]} replace />;
  return <main className="min-h-screen bg-[#f4f8f8] text-slate-900"><header className="mx-auto flex max-w-7xl items-center justify-between px-5 py-6"><Link to="/" className="flex items-center gap-3"><span className="rounded-xl bg-teal-700 p-2 text-white"><HeartPulse size={22} /></span><span className="font-bold">MRX <span className="font-normal text-teal-700">HealthTECH</span></span></Link><div className="flex gap-3"><Link className="btn-secondary" to="/login">Sign in</Link><Link className="btn-primary" to="/register">Create account</Link></div></header><section className="mx-auto grid max-w-7xl items-center gap-12 px-5 py-16 lg:grid-cols-[1.05fr_.95fr] lg:py-24"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-teal-700">Connected care, made clear</p><h1 className="mt-4 max-w-2xl text-4xl font-semibold leading-tight tracking-tight sm:text-6xl">Your health, appointments and care team in one place.</h1><p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">A simple, secure demonstration platform for discovering doctors, organizing appointments and keeping track of doctor-entered health records.</p><div className="mt-8 flex flex-wrap gap-3"><Link to="/register" className="btn-primary px-5 py-3">Get started <ArrowRight size={16} /></Link><Link to="/login" className="btn-secondary px-5 py-3">Explore demo access</Link></div><p className="mt-5 text-xs text-slate-400">Fictional demonstration data - Not for emergency care</p></div><div className="rounded-[2rem] border border-teal-100 bg-white p-6 shadow-xl shadow-teal-900/5 sm:p-9"><div className="flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-wide text-teal-700">MRX care workspace</p><p className="mt-1 text-xl font-semibold">One connected view</p></div><span className="rounded-2xl bg-teal-50 p-4 text-teal-700"><Activity size={28} /></span></div><div className="mt-7 grid gap-3 sm:grid-cols-2">{[['Appointments', 'Find care and manage visit requests'], ['Health records', 'Review results and trends over time'], ['Care teams', 'Keep doctor and patient workflows connected'], ['Reports', 'Access doctor-published summaries']].map(([title, text]) => <article key={title} className="rounded-2xl border border-slate-100 p-4"><p className="font-semibold">{title}</p><p className="mt-1 text-sm leading-6 text-slate-500">{text}</p></article>)}</div><p className="mt-5 rounded-xl bg-[#f1f8f7] p-4 text-xs leading-5 text-slate-500">MRX HealthTECH organizes clinical information. It does not provide automated diagnoses or replace care from a licensed doctor.</p></div></section></main>;
}

function RecoveryPage() {
  return <main className="grid min-h-screen place-items-center bg-[#f4f8f8] p-5"><section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-7 shadow-sm"><HeartPulse className="text-teal-700" size={26} /><h1 className="mt-4 text-2xl font-semibold">Password recovery</h1><p className="mt-3 text-sm leading-6 text-slate-600">Email delivery and password reset tokens are not configured in this local demonstration. Ask your administrator to restore account access.</p><Link className="btn-primary mt-6" to="/login">Return to sign in</Link></section></main>;
}

class PageErrorBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidUpdate(previous) { if (this.state.failed && previous.resetKey !== this.props.resetKey) this.setState({ failed: false }); }
  render() {
    if (!this.state.failed) return this.props.children;
    return <div className="grid min-h-[50vh] place-items-center p-6 text-center"><div><p className="text-lg font-semibold text-slate-800">This page could not be shown.</p><p className="mt-1 text-sm text-slate-500">Please try again.</p><button className="btn-primary mt-4" onClick={() => this.setState({ failed: false })}>Try again</button></div></div>;
  }
}

function PrivatePortal() {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <div className="grid min-h-screen place-items-center text-sm text-slate-500">Loading your secure workspace...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (location.pathname === '/') return <Navigate to={rolePath[user.role]} replace />;
  const requestedRole = location.pathname.split('/')[1]?.toUpperCase();
  if (rolePath[requestedRole] && requestedRole !== user.role) return <Navigate to={rolePath[user.role]} replace />;
  return <PortalLayout><PageErrorBoundary resetKey={location.pathname}><Workspace key={location.pathname} /></PageErrorBoundary></PortalLayout>;
}

export default function App() {
  return <AuthProvider><Routes><Route path="/" element={<Landing />} /><Route path="/login" element={<AuthPage />} /><Route path="/register" element={<AuthPage register />} /><Route path="/forgot-password" element={<RecoveryPage />} /><Route path="/*" element={<PrivatePortal />} /></Routes></AuthProvider>;
}
