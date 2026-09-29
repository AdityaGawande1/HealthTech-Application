import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Activity, CalendarDays, ClipboardPlus, FileText, HeartPulse, LayoutDashboard, LogOut, Search, Settings, ShieldCheck, Stethoscope, UserRound, Users, Bell, Building2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const navigation = {
  PATIENT: [
    ['Dashboard', 'dashboard', LayoutDashboard], ['Find doctors', 'doctors', Search], ['Appointments', 'appointments', CalendarDays], ['My records', 'records', FileText], ['Notifications', 'notifications', Bell], ['Profile', 'profile', UserRound],
  ],
  DOCTOR: [
    ['Dashboard', 'dashboard', LayoutDashboard], ['My patients', 'patients', Users], ['Appointments', 'appointments', CalendarDays], ['Clinical records', 'records', ClipboardPlus], ['Notifications', 'notifications', Bell], ['Profile', 'profile', UserRound],
  ],
  ADMIN: [
    ['Dashboard', 'dashboard', LayoutDashboard], ['Users', 'users', Users], ['Patients', 'patients', UserRound], ['Clinicians', 'doctors', Stethoscope], ['Appointments', 'appointments', CalendarDays], ['Records & reports', 'records', FileText], ['Departments', 'departments', Building2], ['Audit log', 'audit', ShieldCheck],
  ],
};
const labels = { ADMIN: 'Administration', DOCTOR: 'Clinical workspace', PATIENT: 'Patient portal' };

export default function PortalLayout({ children }) {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const base = `/${user.role.toLowerCase()}`;
  const items = navigation[user.role] || [];
  const title = items.find(([, path]) => location.pathname.endsWith(`/${path}`))?.[0] || labels[user.role];
  const links = (mobile = false) => items.map(([label, path, Icon]) => <NavLink key={path} to={`${base}/${path}`} className={({ isActive }) => `${mobile ? 'flex min-w-[64px] flex-col items-center gap-1 px-2 py-2 text-[10px]' : 'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm'} ${isActive ? 'bg-teal-50 font-semibold text-teal-800' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}><Icon size={mobile ? 19 : 18} /><span>{label}</span></NavLink>);
  return <div className="min-h-screen bg-[#f5f8f8] lg:flex">
    <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-white lg:flex">
      <button onClick={() => navigate(`${base}/dashboard`)} className="flex h-[76px] items-center gap-3 border-b border-slate-100 px-6 text-left"><span className="rounded-xl bg-teal-700 p-2 text-white"><HeartPulse size={20} /></span><span><strong className="block text-sm tracking-tight text-slate-900">MRX <span className="font-normal text-teal-700">HealthTECH</span></strong><span className="text-[10px] text-slate-400">{labels[user.role]}</span></span></button>
      <nav className="flex-1 space-y-1 px-3 py-6">{links()}</nav>
      <div className="border-t border-slate-100 p-4"><div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3"><span className="grid h-9 w-9 place-items-center rounded-full bg-teal-100 text-sm font-semibold text-teal-800">{user.name.split(' ').map((n) => n[0]).slice(0,2).join('')}</span><span className="min-w-0 flex-1"><strong className="block truncate text-xs text-slate-800">{user.name}</strong><span className="text-[10px] uppercase tracking-wide text-slate-400">{user.role.toLowerCase()}</span></span><button title="Sign out" onClick={() => { signOut(); navigate('/login'); }} className="rounded-lg p-2 text-slate-400 hover:bg-white hover:text-rose-600"><LogOut size={16} /></button></div></div>
    </aside>
    <div className="min-w-0 flex-1">
      <header className="sticky top-0 z-20 flex h-[68px] items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-7"><div><p className="text-[10px] font-semibold uppercase tracking-[.17em] text-teal-700 lg:hidden">MRX HealthTECH</p><h1 className="text-lg font-semibold text-slate-900">{title}</h1></div><div className="flex items-center gap-3"><span className="hidden text-right sm:block"><strong className="block text-xs font-medium text-slate-800">{user.name}</strong><span className="text-[10px] text-slate-400">{labels[user.role]}</span></span><span className="grid h-9 w-9 place-items-center rounded-full bg-[#e1f3f0] text-xs font-semibold text-teal-800">{user.name.split(' ').map((n) => n[0]).slice(0,2).join('')}</span></div></header>
      <main className="mx-auto max-w-[1500px] px-4 pb-24 pt-6 sm:px-7 lg:pb-8 lg:pt-8">{children}</main>
      <nav className="fixed inset-x-0 bottom-0 z-30 flex justify-around border-t border-slate-200 bg-white/95 px-1 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">{links(true)}</nav>
    </div>
  </div>;
}
