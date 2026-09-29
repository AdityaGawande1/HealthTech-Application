import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Activity, ArrowRight, CalendarDays, Check, Clock3, FileText, FlaskConical, Plus, Search, ShieldCheck, UserRound, Users } from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import TestResultForm from '../components/TestResultForm';
import { DoctorProfile as DoctorProfilePage, DoctorSearch as DoctorSearchPage } from './DoctorDiscovery';
import ResultTrend from './ResultTrend';

const TrendPanel = ({ results }) => <ResultTrend results={results} />;

const titleCase = (value = '') => value.charAt(0) + value.slice(1).toLowerCase();
const dateTime = (value) => new Date(value).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
const dateOnly = (value) => new Date(value).toLocaleDateString([], { dateStyle: 'medium' });
const localDateInput = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const Card = ({ children, className = '' }) => <section className={`rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_2px_8px_rgba(15,50,55,.03)] sm:p-6 ${className}`}>{children}</section>;
const PageIntro = ({ eyebrow, title, text, action }) => <div className="mb-6 flex flex-wrap items-end justify-between gap-4"><div><p className="mb-1 text-[10px] font-bold uppercase tracking-[.18em] text-teal-700">{eyebrow}</p><h2 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h2>{text && <p className="mt-1 text-sm text-slate-500">{text}</p>}</div>{action}</div>;
const Empty = ({ title, text }) => <div className="rounded-xl border border-dashed border-slate-200 px-5 py-10 text-center"><p className="text-sm font-semibold text-slate-700">{title}</p><p className="mt-1 text-xs text-slate-400">{text}</p></div>;
const Status = ({ value }) => <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${['CONFIRMED','ACTIVE','COMPLETED','PUBLISHED'].includes(value) ? 'bg-emerald-50 text-emerald-700' : ['REJECTED','CANCELLED','BLOCKED'].includes(value) ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'}`}>{value?.toLowerCase()}</span>;
const Button = ({ children, secondary = false, className = '', ...props }) => <button className={`${secondary ? 'btn-secondary' : 'btn-primary'} inline-flex items-center justify-center gap-2 ${className}`} {...props}>{children}</button>;
const Field = ({ label, className = '', ...props }) => <label className={`block ${className}`}><span className="label">{label}</span><input className="input" {...props} /></label>;

export default function Workspace() {
  const { user, updateUser } = useAuth();
  const location = useLocation();
  const pathParts = location.pathname.split('/').filter(Boolean);
  const page = pathParts.at(-1) || 'dashboard';
  const doctorId = user.role === 'PATIENT' && pathParts[1] === 'doctors' && pathParts.length > 2 ? pathParts[2] : '';
  const [loaded, setLoaded] = useState({ key: '', data: null });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [version, setVersion] = useState(0);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [selectedPatient, setSelectedPatient] = useState('');
  const [patientResults, setPatientResults] = useState([]);
  const [notice, setNotice] = useState('');
  const refresh = () => setVersion((v) => v + 1);

  useEffect(() => {
    const timer = window.setTimeout(() => setQuery(search.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [search]);

  // Each screen has its own key. Data is only shown when it was loaded for the screen currently open,
  // so opening a different page can never show old data from the previous page (this used to crash the page).
  const viewKey = `${user.role}|${page}|${doctorId}`;
  useEffect(() => { setError(''); setNotice(''); }, [viewKey]);
  useEffect(() => {
    let active = true;
    const load = async () => {
      if (page === 'dashboard') return api.dashboard();
      if (doctorId) return api.doctors.get(doctorId);
      if (page === 'doctors' && user.role === 'PATIENT') return { data: [] };
      if (page === 'doctors' && user.role === 'ADMIN') return api.admin.doctors();
      if (page === 'appointments') return api.appointments.list();
      if (page === 'records') return api.records();
      if (page === 'notifications') return api.notifications.list();
      if (page === 'patients' && user.role === 'ADMIN') return api.patients.list(query);
      if (page === 'patients') return api.clinical.patients(query);
      if (page === 'users') return api.admin.users();
      if (page === 'audit') return api.admin.audits();
      if (page === 'departments') return api.admin.departments();
      return { data: user };
    };
    load()
      .then((response) => { if (active) { setError(''); setLoaded({ key: viewKey, data: response.data }); } })
      .catch((err) => { if (active) setError(err.message); });
    return () => { active = false; };
  }, [viewKey, version, query]);
  const data = loaded.key === viewKey ? loaded.data : null;

  useEffect(() => {
    if (!selectedPatient) { setPatientResults([]); return; }
    let active = true;
    api.clinical.results(selectedPatient).then(({ data: rows }) => { if (active) setPatientResults(rows); }).catch((err) => { if (active) setError(err.message); });
    return () => { active = false; };
  }, [selectedPatient, version]);

  const action = async (fn, message = 'Saved successfully') => {
    setBusy(true); setError(''); setNotice('');
    try { const result = await fn(); setNotice(message); refresh(); return result; }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };
  const flash = <>{error && <p role="alert" className="mb-4 rounded-xl border border-rose-100 bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}{notice && <p role="status" className="mb-4 rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-sm text-emerald-700">{notice}</p>}</>;
  if (!data && error) return <>{flash}<div className="py-8 text-center"><Button secondary onClick={refresh}>Try again</Button></div></>;
  if (!data) return <div role="status" className="py-16 text-center text-sm text-slate-500">Loading your information...</div>;
  const pageTitle = page.replaceAll('-', ' ');

  if (page === 'dashboard') return <>{flash}<Dashboard user={user} data={data} /></>;
  if (doctorId) return <>{flash}<DoctorProfilePage doctor={data} action={action} busy={busy} /></>;
  if (page === 'doctors' && user.role === 'PATIENT') return <>{flash}<DoctorSearchPage /></>;
  if (page === 'appointments') return <>{flash}<Appointments data={data} role={user.role} action={action} busy={busy} /></>;
  if (page === 'records') return <>{flash}<Records data={data} role={user.role} downloadReport={(report) => action(async () => { const blob = await api.reports.pdf(report.id); const href = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = href; link.download = `mrx-report-${report.id}.pdf`; link.click(); URL.revokeObjectURL(href); }, 'Report download started')} /></>;
  if (page === 'notifications') return <>{flash}<Notifications data={data} action={action} /></>;
  if (page === 'patients' && user.role === 'DOCTOR') return <>{flash}<PatientWorkspace data={data} selected={selectedPatient} setSelected={setSelectedPatient} results={patientResults} action={action} busy={busy} /></>;
  if (page === 'patients' && user.role === 'ADMIN') return <>{flash}<AdminPatients data={data} search={search} setSearch={setSearch} action={action} busy={busy} onDataChanged={refresh} /></>;
  if (page === 'users' && user.role === 'ADMIN') return <>{flash}<UsersPage data={data} action={action} /></>;
  if (page === 'doctors' && user.role === 'ADMIN') return <>{flash}<AdminDoctors data={data} action={action} busy={busy} /></>;
  if (page === 'audit' && user.role === 'ADMIN') return <>{flash}<AuditPage data={data} /></>;
  if (page === 'departments' && user.role === 'ADMIN') return <>{flash}<Departments data={data} action={action} busy={busy} /></>;
  if (page === 'profile') return <>{flash}<Profile user={user} action={action} busy={busy} updateUser={updateUser} /></>;
  return <><PageIntro eyebrow="MRX HealthTECH" title={titleCase(pageTitle)} text="This area is not available for your account." /><Card><Empty title="Page unavailable" text="Use the navigation to open a workspace available to your role." /></Card></>;
}

function Dashboard({ user, data }) {
  if (user.role === 'PATIENT') {
    const next = data.appointments?.[0];
    const metrics = [['Upcoming visits', data.appointments?.length || 0, CalendarDays], ['Latest results', data.latestTests?.length || 0, Activity], ['Active prescriptions', data.prescriptions, FlaskConical], ['Published reports', data.reports, FileText]];
    return <>
      <PageIntro eyebrow="Patient overview" title={`Good ${new Date().getHours() < 12 ? 'morning' : 'afternoon'}, ${user.name.split(' ')[0]}`} text="Your appointments and health records, organized in one place." action={<Link className="btn-primary" to="/patient/doctors"><Search size={16} className="mr-2 inline" />Find a doctor</Link>} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{metrics.map(([label, value, Icon]) => <Card key={label} className="p-5"><div className="flex items-start justify-between"><span className="text-sm text-slate-500">{label}</span><span className="rounded-lg bg-teal-50 p-2 text-teal-700"><Icon size={17} /></span></div><p className="mt-4 text-3xl font-semibold text-slate-900">{value ?? 0}</p><p className="mt-1 text-xs text-slate-400">From your records</p></Card>)}</div>
      <div className="mt-5 grid gap-5 xl:grid-cols-[1.3fr_.7fr]">
        <Card><div className="mb-5 flex items-center justify-between"><div><h3 className="font-semibold text-slate-900">Upcoming appointments</h3><p className="mt-1 text-xs text-slate-400">Your confirmed and requested visits</p></div><Link to="/patient/appointments" className="text-xs font-semibold text-teal-700">View all <ArrowRight size={14} className="inline" /></Link></div>{next ? <div className="rounded-xl bg-[#f1f8f7] p-5 sm:flex sm:items-center sm:justify-between"><div className="flex items-center gap-4"><div className="grid h-12 w-12 place-items-center rounded-xl bg-white text-teal-700"><CalendarDays /></div><div><p className="font-semibold text-slate-900">{next.doctor.user.name}</p><p className="text-xs text-slate-500">{next.doctor.specialization} - {dateTime(next.startAt)}</p></div></div><Status value={next.status} /></div> : <Empty title="No upcoming appointments" text="Find a doctor to request a visit." />}</Card>
        <Card><h3 className="font-semibold text-slate-900">Recent test results</h3><p className="mt-1 text-xs text-slate-400">Latest doctor-entered measurements</p><div className="mt-4 space-y-3">{(data.latestTests || []).slice(0,4).map((row) => <div key={row.id} className="flex items-center justify-between border-b border-slate-100 pb-3 last:border-0"><div><p className="text-sm font-medium text-slate-700">{row.biomarkerName}</p><p className="text-xs text-slate-400">{dateOnly(row.testDate)}</p></div><p className="font-semibold text-slate-900">{row.value} <span className="text-xs font-normal text-slate-400">{row.unit}</span></p></div>)}{!data.latestTests?.length && <Empty title="No results recorded" text="New results from your care team will appear here." />}</div></Card>
      </div>
    </>;
  }
  if (user.role === 'DOCTOR') return <>
    <PageIntro eyebrow="Clinical overview" title={`Welcome, ${user.name}`} text="A quick view of your patient panel and schedule." />
    <div className="grid gap-4 sm:grid-cols-3">{[['Appointments today', data.todayAppointments?.length || 0, CalendarDays], ['Requests to review', data.pendingAppointments, Clock3], ['Assigned patients', data.patientCount, Users]].map(([label, value, Icon]) => <Card key={label}><div className="flex items-center justify-between text-sm text-slate-500"><span>{label}</span><span className="rounded-lg bg-teal-50 p-2 text-teal-700"><Icon size={18} /></span></div><p className="mt-4 text-3xl font-semibold">{value}</p></Card>)}</div>
    <Card className="mt-5"><h3 className="font-semibold">Today's schedule</h3><div className="mt-4 space-y-2">{data.todayAppointments?.length ? data.todayAppointments.map((apt) => <div key={apt.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 p-4"><div><p className="font-medium">{apt.patient.name}</p><p className="mt-1 text-xs text-slate-500">{dateTime(apt.startAt)}{apt.reason ? ` - ${apt.reason}` : ''}</p></div><Status value={apt.status} /></div>) : <Empty title="No appointments today" text="New appointment requests appear in your schedule." />}</div></Card>
  </>;
  return <>
    <PageIntro eyebrow="System overview" title="Platform dashboard" text="Current operational counts from the MRX database." />
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[['Patients', data.patients, Users], ['Doctors', data.doctors, UserRound], ['Appointments', data.appointments, CalendarDays], ['Reports', data.reports, FileText]].map(([label, value, Icon]) => <Card key={label}><div className="flex items-center justify-between text-sm text-slate-500"><span>{label}</span><span className="rounded-lg bg-teal-50 p-2 text-teal-700"><Icon size={18} /></span></div><p className="mt-4 text-3xl font-semibold">{value ?? 0}</p></Card>)}</div>
    <Card className="mt-5 flex flex-wrap items-center justify-between gap-4"><div><p className="font-semibold">Doctor approvals</p><p className="mt-1 text-sm text-slate-500">{data.pendingDoctors} doctor accounts need review.</p></div><Link to="/admin/doctors" className="btn-primary">Review doctors <ArrowRight size={16} /></Link></Card>
  </>;
}

function Appointments({ data, role, action, busy }) {
  const [rescheduling, setRescheduling] = useState('');
  const [startAt, setStartAt] = useState('');
  const [rescheduleDate, setRescheduleDate] = useState(() => localDateInput(new Date()));
  const [availableSlots, setAvailableSlots] = useState([]);
  const active = (status) => ['PENDING', 'CONFIRMED', 'RESCHEDULED'].includes(status);
  useEffect(() => {
    const appointment = data.find((item) => item.id === rescheduling);
    if (!appointment) { setAvailableSlots([]); return undefined; }
    let current = true;
    api.doctors.slots(appointment.doctorId, rescheduleDate).then(({ data: slots }) => { if (current) setAvailableSlots(slots.filter((slot) => slot.available)); }).catch(() => { if (current) setAvailableSlots([]); });
    return () => { current = false; };
  }, [data, rescheduling, rescheduleDate]);
  return <>
    <PageIntro eyebrow="Care schedule" title="Appointments" text={role === 'PATIENT' ? 'Review and manage your visit requests.' : 'Review requests, move visit times, and update appointment status.'} />
    <div className="space-y-3">{data.map((apt) => <Card key={apt.id} className="flex flex-wrap items-center justify-between gap-4 p-4 sm:p-5">
      <div className="flex min-w-[230px] flex-1 items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-xl bg-teal-50 text-teal-800"><CalendarDays size={19} /></span><div><p className="font-semibold">{role === 'PATIENT' ? apt.doctor.user.name : apt.patient.name}</p><p className="mt-1 text-xs text-slate-500">{role === 'PATIENT' ? apt.doctor.specialization : `Patient ID ${apt.patient.patientId}`} - {dateTime(apt.startAt)}</p>{apt.reason && <p className="mt-1 text-xs text-slate-400">{apt.reason}</p>}</div></div>
      <Status value={apt.status} />
      <div className="flex flex-wrap gap-2">
        {role === 'DOCTOR' && apt.status === 'PENDING' && <><Button disabled={busy} onClick={() => action(() => api.appointments.status(apt.id, 'CONFIRMED'), 'Appointment confirmed')}><Check size={14} />Confirm</Button><Button secondary disabled={busy} onClick={() => action(() => api.appointments.status(apt.id, 'REJECTED'), 'Appointment declined')}>Decline</Button></>}
        {role === 'DOCTOR' && ['CONFIRMED','RESCHEDULED'].includes(apt.status) && <Button secondary disabled={busy} onClick={() => action(() => api.appointments.status(apt.id, 'COMPLETED'), 'Appointment marked complete')}>Mark complete</Button>}
        {active(apt.status) && <Button secondary disabled={busy} onClick={() => { setRescheduling(apt.id); setStartAt(''); setRescheduleDate(localDateInput(new Date())); }}>Reschedule</Button>}
        {role !== 'ADMIN' && active(apt.status) && <Button secondary disabled={busy} onClick={() => action(() => api.appointments.cancel(apt.id), 'Appointment cancelled')}>Cancel</Button>}
        {role === 'ADMIN' && active(apt.status) && <Button secondary disabled={busy} onClick={() => action(() => api.appointments.status(apt.id, 'CANCELLED'), 'Appointment cancelled')}>Cancel</Button>}
      </div>
      {rescheduling === apt.id && <form className="flex w-full flex-wrap items-end gap-3 border-t border-slate-100 pt-4" onSubmit={async (event) => { event.preventDefault(); const result = await action(() => api.appointments.reschedule(apt.id, startAt), 'Appointment rescheduled'); if (result) setRescheduling(''); }}><Field label="New date" type="date" min={localDateInput(new Date())} value={rescheduleDate} onChange={(event) => setRescheduleDate(event.target.value)} required /><label><span className="label">Available time</span><select className="input" value={startAt} onChange={(event) => setStartAt(event.target.value)} required><option value="">Choose a time</option>{availableSlots.map((slot) => <option value={slot.startAt} key={slot.startAt}>{slot.startTime}</option>)}</select></label><Button disabled={busy || !startAt}>Save new time</Button><Button type="button" secondary onClick={() => setRescheduling('')}>Keep current time</Button></form>}
    </Card>)}{!data.length && <Card><Empty title="No appointments yet" text="New bookings and requests will appear here." /></Card>}</div>
  </>;
}

function PatientWorkspace({ data, selected, setSelected, results, action, busy }) {
  const patient = data.find((p) => p.id === selected);
  const [resultForm, setResultForm] = useState({ biomarkerName: '', value: '', unit: '', testDate: new Date().toISOString().slice(0,16), notes: '' });
  const [recordForm, setRecordForm] = useState({ medication: '', dosage: '', frequency: '', instructions: '' });
  const [reportForm, setReportForm] = useState({ title: '', summary: '', content: '', published: true });
  return <><PageIntro eyebrow="Care team" title="Assigned patients" text="Open a patient profile to review history and record care updates." />
    <div className="grid gap-5 xl:grid-cols-[320px_1fr]"><Card className="h-fit p-3"><div className="mb-2 flex items-center gap-2 px-2 pt-2 text-xs font-semibold uppercase tracking-wide text-slate-400"><Users size={15} /> Patient panel</div>{data.map((p) => <button key={p.id} onClick={() => setSelected(p.id)} className={`w-full rounded-xl p-3 text-left ${selected === p.id ? 'bg-teal-50 text-teal-900' : 'hover:bg-slate-50'}`}><span className="block text-sm font-semibold">{p.name}</span><span className="text-xs text-slate-500">{p.patientId} - {p.age} years</span></button>)}{!data.length && <p className="p-4 text-sm text-slate-500">No patients are assigned to your account.</p>}</Card>
      {patient ? <div className="space-y-5"><Card><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="text-xl font-semibold">{patient.name}</h3><p className="mt-1 text-xs text-slate-500">{patient.patientId} - {patient.age} years - {patient.gender}</p><p className="mt-4 whitespace-pre-wrap text-sm text-slate-600">{patient.medicalHistory || 'No medical history recorded.'}</p></div><div className="rounded-xl bg-slate-50 px-4 py-3 text-center"><p className="text-2xl font-semibold">{results.length}</p><p className="text-[10px] uppercase tracking-wide text-slate-400">test results</p></div></div><h4 className="mb-3 mt-6 font-semibold">Biomarker history</h4>{results.length ? <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="text-xs text-slate-400"><tr><th className="pb-2">Marker</th><th>Value</th><th>Date</th><th>Notes</th></tr></thead><tbody>{results.map((r) => <tr key={r.id} className="border-t border-slate-100"><td className="py-3 font-medium">{r.biomarkerName}</td><td>{r.value} {r.unit}</td><td>{dateOnly(r.testDate)}</td><td className="text-slate-500">{r.notes || '-'}</td></tr>)}</tbody></table></div> : <Empty title="No test results recorded" text="Add doctor-entered results below." />}</Card>
        <TrendPanel results={results} />
        <div className="grid gap-5 lg:grid-cols-2"><Card><h3 className="mb-4 font-semibold">Add biomarker result</h3><form className="grid gap-3 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); action(() => api.clinical.addResult(patient.id, { ...resultForm, value: Number(resultForm.value), testDate: new Date(resultForm.testDate).toISOString() }), 'Test result added'); setResultForm({ ...resultForm, biomarkerName: '', value: '', unit: '', notes: '' }); }}><Field label="Biomarker" value={resultForm.biomarkerName} onChange={(e) => setResultForm({ ...resultForm, biomarkerName: e.target.value })} required maxLength={100} /><Field label="Value" type="number" step="any" value={resultForm.value} onChange={(e) => setResultForm({ ...resultForm, value: e.target.value })} required /><Field label="Unit" value={resultForm.unit} onChange={(e) => setResultForm({ ...resultForm, unit: e.target.value })} required maxLength={30} /><Field label="Date" type="datetime-local" value={resultForm.testDate} onChange={(e) => setResultForm({ ...resultForm, testDate: e.target.value })} required /><Field label="Notes" className="sm:col-span-2" value={resultForm.notes} onChange={(e) => setResultForm({ ...resultForm, notes: e.target.value })} maxLength={1000} /><Button className="sm:col-span-2" disabled={busy}><Plus size={15} />Save result</Button></form></Card>
        <Card><h3 className="mb-4 font-semibold">Add prescription</h3><form className="grid gap-3 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); action(() => api.clinical.prescription({ patientId: patient.id, ...recordForm }), 'Prescription added to patient record'); setRecordForm({ medication: '', dosage: '', frequency: '', instructions: '' }); }}><Field label="Medication" value={recordForm.medication} onChange={(e) => setRecordForm({ ...recordForm, medication: e.target.value })} required /><Field label="Dosage" value={recordForm.dosage} onChange={(e) => setRecordForm({ ...recordForm, dosage: e.target.value })} required /><Field label="Frequency" value={recordForm.frequency} onChange={(e) => setRecordForm({ ...recordForm, frequency: e.target.value })} required /><Field label="Instructions" value={recordForm.instructions} onChange={(e) => setRecordForm({ ...recordForm, instructions: e.target.value })} /><Button className="sm:col-span-2" disabled={busy}><Plus size={15} />Add prescription</Button></form></Card>
        <Card className="lg:col-span-2"><h3 className="mb-4 font-semibold">Create medical report</h3><form className="grid gap-3 md:grid-cols-2" onSubmit={(e) => { e.preventDefault(); action(async () => { const created = await api.clinical.report({ patientId: patient.id, title: reportForm.title, summary: reportForm.summary, content: reportForm.content }); if (reportForm.published) await api.reports.publish(created.data.id); }, reportForm.published ? 'Report published to patient' : 'Report saved as draft'); setReportForm({ title: '', summary: '', content: '', published: true }); }}><Field label="Report title" value={reportForm.title} onChange={(e) => setReportForm({ ...reportForm, title: e.target.value })} required /><Field label="Summary" value={reportForm.summary} onChange={(e) => setReportForm({ ...reportForm, summary: e.target.value })} required /><label className="block md:col-span-2"><span className="label">Report details</span><textarea className="input min-h-24" maxLength={10000} value={reportForm.content} onChange={(e) => setReportForm({ ...reportForm, content: e.target.value })} /></label><label className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={reportForm.published} onChange={(e) => setReportForm({ ...reportForm, published: e.target.checked })} />Publish to patient portal</label><Button disabled={busy}><FileText size={15} />Save report</Button></form></Card></div>
      </div> : <Card><Empty title="Select a patient" text="Choose a patient from your assigned panel." /></Card>}
    </div>
  </>;
}

function Records({ data, role, downloadReport }) {
  const prescriptions = data.prescriptions || []; const reports = data.reports || []; const history = data.history || []; const results = data.results || [];
  return <><PageIntro eyebrow="Clinical records" title={role === 'PATIENT' ? 'My health records' : 'Clinical records'} text="Test results, doctor notes, prescriptions and published reports." />
    <TrendPanel results={results} />
    <div className="grid gap-5 xl:grid-cols-2"><Card><h3 className="mb-4 flex items-center gap-2 font-semibold"><Activity size={17} className="text-teal-700" />Test results</h3>{results.length ? <div className="space-y-2">{results.map((r) => <div key={r.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3"><div><p className="text-sm font-medium">{r.biomarkerName}</p><p className="mt-1 text-xs text-slate-400">{dateOnly(r.testDate)}</p></div><p className="font-semibold">{r.value} <span className="text-xs font-normal text-slate-500">{r.unit}</span></p></div>)}</div> : <Empty title="No results available" text="Recorded biomarker values will appear here." />}</Card>
    <Card><h3 className="mb-4 flex items-center gap-2 font-semibold"><FlaskConical size={17} className="text-teal-700" />Prescriptions</h3>{prescriptions.length ? <div className="space-y-3">{prescriptions.map((p) => <div key={p.id} className="rounded-xl border border-slate-100 p-4"><div className="flex items-start justify-between"><div><p className="font-semibold">{p.medication}</p><p className="mt-1 text-xs text-slate-500">{p.dosage} - {p.frequency}</p></div><Status value={p.status} /></div><p className="mt-3 text-xs text-slate-500">Doctor: {p.doctor?.user?.name || 'Care team'}{p.instructions ? ` - ${p.instructions}` : ''}</p></div>)}</div> : <Empty title="No prescriptions on file" text="Current prescriptions entered by your care team appear here." />}</Card>
    <Card><h3 className="mb-4 flex items-center gap-2 font-semibold"><FileText size={17} className="text-teal-700" />Medical reports</h3>{reports.length ? <div className="space-y-3">{reports.map((r) => <article key={r.id} className="rounded-xl border border-slate-100 p-4"><div className="flex items-start justify-between gap-2"><h4 className="font-semibold">{r.title}</h4><Status value={r.published ? 'PUBLISHED' : 'DRAFT'} /></div><p className="mt-2 text-sm leading-6 text-slate-600">{r.summary}</p>{r.content && <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-slate-500">{r.content}</p>}<div className="mt-3 flex items-center justify-between gap-2"><p className="text-xs text-slate-400">{dateOnly(r.createdAt)} - {r.doctor?.user?.name}</p>{(r.published || role !== 'PATIENT') && <button className="text-xs font-semibold text-teal-700 hover:underline" onClick={() => downloadReport(r)}>Download PDF</button>}</div></article>)}</div> : <Empty title="No reports available" text="Published doctor reports will appear here." />}</Card>
    <Card><h3 className="mb-4 font-semibold">Medical history</h3>{history.length ? <div className="space-y-3">{history.map((h) => <div key={h.id} className="border-l-2 border-teal-200 pl-4"><p className="font-medium">{h.title}</p><p className="mt-1 text-sm text-slate-600">{h.details}</p><p className="mt-1 text-xs text-slate-400">{h.occurredAt ? dateOnly(h.occurredAt) : dateOnly(h.createdAt)}</p></div>)}</div> : <Empty title="No history entries" text="Doctor-entered history will show up here." />}</Card></div>
  </>;
}

function Notifications({ data, action }) {
  const unread = data.filter((n) => !n.isRead && !n.readAt).length;
  return <><PageIntro eyebrow="Updates" title="Notifications" text="Appointment changes and updates to your clinical records." action={unread > 0 && <Button secondary onClick={() => action(() => api.notifications.readAll(), 'All notifications marked as read')}>Mark all read</Button>} /><div className="space-y-3">{data.map((n) => { const isUnread = !n.isRead && !n.readAt; return <Card key={n.id} className={`flex items-start justify-between gap-4 p-4 ${isUnread ? 'border-teal-200 bg-teal-50/30' : ''}`}><div><div className="flex items-center gap-2"><p className="font-semibold">{n.title}</p>{isUnread && <span className="h-2 w-2 rounded-full bg-teal-600" />}</div><p className="mt-1 text-sm text-slate-600">{n.message}</p><p className="mt-2 text-xs text-slate-400">{dateTime(n.createdAt)}</p></div>{isUnread && <Button secondary onClick={() => action(() => api.notifications.read(n.id), 'Marked as read')}>Mark read</Button>}</Card>; })}{!data.length && <Card><Empty title="You're all caught up" text="New care updates will appear here." /></Card>}</div></>;
}

function AdminPatients({ data, search, setSearch, action, busy, onDataChanged }) {
  const [selectedId, setSelectedId] = useState('');
  const [patient, setPatient] = useState(null);
  const [adding, setAdding] = useState(false);
  const [addingResult, setAddingResult] = useState(false);
  const [form, setForm] = useState({ patientId: '', name: '', age: '', gender: 'Other', medicalHistory: '' });
  useEffect(() => {
    let active = true;
    if (!selectedId) { setPatient(null); return undefined; }
    api.patients.get(selectedId).then(({ data: detail }) => { if (active) setPatient(detail); }).catch(() => { if (active) setPatient(null); });
    return () => { active = false; };
  }, [selectedId, data]);
  return <><PageIntro eyebrow="Patient registry" title="Patients" text="Manage patient records and review their recorded monitoring data." action={<Button onClick={() => setAdding(!adding)}><Plus size={15} />Add patient record</Button>} />
    {adding && <Card className="mb-5"><h3 className="mb-4 font-semibold">New patient record</h3><form className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" onSubmit={(e) => { e.preventDefault(); action(() => api.patients.create({ ...form, age: Number(form.age) }), 'Patient record created'); setAdding(false); setForm({ patientId: '', name: '', age: '', gender: 'Other', medicalHistory: '' }); }}><Field label="Patient ID" value={form.patientId} onChange={(e) => setForm({ ...form, patientId: e.target.value })} required /><Field label="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /><Field label="Age" type="number" min="0" max="120" value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} required /><label><span className="label">Gender</span><select className="input" value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}><option>Female</option><option>Male</option><option>Other</option></select></label><label className="sm:col-span-2 xl:col-span-3"><span className="label">Medical history</span><textarea className="input min-h-20" maxLength={5000} value={form.medicalHistory} onChange={(e) => setForm({ ...form, medicalHistory: e.target.value })} /></label><Button disabled={busy} className="sm:col-span-2 xl:col-span-3">Create patient record</Button></form></Card>}
    <div className="mb-5 flex max-w-lg items-center gap-2 rounded-xl border border-slate-200 bg-white px-3"><Search size={16} className="text-slate-400" /><input className="w-full border-0 py-3 text-sm outline-none" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search patient name or ID" /></div>
    <div className="grid gap-5 xl:grid-cols-[.8fr_1.2fr]"><Card className="h-fit p-3">{data.map((p) => <button key={p.id} onClick={() => setSelectedId(p.id)} className={`mb-1 w-full rounded-xl p-3 text-left ${selectedId === p.id ? 'bg-teal-50 text-teal-900' : 'hover:bg-slate-50'}`}><span className="block text-sm font-semibold">{p.name}</span><span className="text-xs text-slate-500">{p.patientId} - {p.age} years</span></button>)}{!data.length && <Empty title="No patient records" text="Add a record to get started." />}</Card>
      <Card>{patient ? <><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="text-xl font-semibold">{patient.name}</h3><p className="mt-1 text-xs text-slate-500">{patient.patientId} - {patient.age} years - {patient.gender}</p><p className="mt-4 whitespace-pre-wrap text-sm text-slate-600">{patient.medicalHistory || 'No medical history recorded.'}</p></div><div className="flex gap-3"><button className="text-xs font-semibold text-teal-700 hover:underline" onClick={() => setAddingResult(true)}>Add test result</button></div></div><h4 className="mb-3 mt-6 font-semibold">Test history</h4>{patient.testResults?.length ? <div className="space-y-2">{patient.testResults.map((row) => <div key={row.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3"><span><span className="block text-sm font-medium">{row.biomarkerName}</span><span className="text-xs text-slate-400">{dateOnly(row.testDate)}</span></span><strong className="text-sm">{row.value} <span className="font-normal text-slate-500">{row.unit}</span></strong></div>)}</div> : <Empty title="No test history" text="Test results will appear here when recorded." />}{addingResult && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"><div className="w-full max-w-lg rounded-2xl bg-white"><TestResultForm patientId={patient.id} onClose={() => setAddingResult(false)} onSuccess={() => { setAddingResult(false); onDataChanged(); }} /></div></div>}</> : <Empty title="Select a patient record" text="Patient details and monitoring history will appear here." />}</Card>
    </div>
  </>;
}

function UsersPage({ data, action }) {
  return <><PageIntro eyebrow="System access" title="Users" text="Review accounts and control active access." /><Card className="overflow-x-auto p-0"><table className="w-full min-w-[650px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-400"><tr><th className="px-5 py-4">Name</th><th>Email</th><th>Role</th><th>Created</th><th>Status</th><th className="pr-5">Action</th></tr></thead><tbody>{data.map((u) => <tr key={u.id} className="border-t border-slate-100"><td className="px-5 py-4 font-medium">{u.name}</td><td className="text-slate-500">{u.email}</td><td><span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold">{u.role}</span></td><td className="text-xs text-slate-500">{dateOnly(u.createdAt)}</td><td><Status value={u.status} /></td><td className="pr-5"><button className="text-xs font-semibold text-teal-700 hover:underline" onClick={() => action(() => api.admin.userStatus(u.id, u.status === 'ACTIVE' ? 'BLOCKED' : 'ACTIVE'), `User ${u.status === 'ACTIVE' ? 'blocked' : 'unblocked'}`)}>{u.status === 'ACTIVE' ? 'Block' : 'Unblock'}</button></td></tr>)}</tbody></table></Card></>;
}

function AdminDoctors({ data, action, busy }) {
  const [show, setShow] = useState(false); const [form, setForm] = useState({ name: '', email: '', password: '', specialization: '', departmentId: '', experienceYears: 0, location: '' }); const [departments, setDepartments] = useState([]);
  useEffect(() => { api.admin.departments().then(({ data: rows }) => setDepartments(rows)).catch(() => {}); }, []);
  return <><PageIntro eyebrow="Care network" title="Doctor management" text="Create doctor accounts and review approval status." action={<Button onClick={() => setShow(!show)}><Plus size={15} />Add doctor</Button>} />
    {show && <Card className="mb-5"><h3 className="mb-4 font-semibold">New doctor account</h3><form className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" onSubmit={(e) => { e.preventDefault(); action(() => api.admin.addDoctor({ ...form, departmentId: form.departmentId || undefined, experienceYears: Number(form.experienceYears) }), 'Doctor account created and marked pending approval'); setShow(false); setForm({ name: '', email: '', password: '', specialization: '', departmentId: '', experienceYears: 0, location: '' }); }}><Field label="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /><Field label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /><Field label="Temporary password" type="password" minLength="8" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required /><Field label="Specialization" value={form.specialization} onChange={(e) => setForm({ ...form, specialization: e.target.value })} required /><label><span className="label">Department</span><select className="input" value={form.departmentId} onChange={(e) => setForm({ ...form, departmentId: e.target.value })}><option value="">Select department</option>{departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select></label><Field label="Experience (years)" type="number" min="0" max="80" value={form.experienceYears} onChange={(e) => setForm({ ...form, experienceYears: e.target.value })} /><Field label="Location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /><Button className="sm:col-span-2 xl:col-span-3" disabled={busy}>Create pending account</Button></form></Card>}
    <div className="grid gap-4 lg:grid-cols-2">{data.map((d) => <Card key={d.id} className="flex flex-wrap items-center justify-between gap-4"><div><div className="flex items-center gap-2"><h3 className="font-semibold">{d.user.name}</h3><Status value={d.approved ? 'APPROVED' : 'PENDING'} /></div><p className="mt-1 text-sm text-teal-800">{d.specialization}</p><p className="mt-1 text-xs text-slate-500">{d.user.email} - {d.department?.name || 'No department'} - {d.experienceYears} yrs</p></div><Button secondary onClick={() => action(() => api.admin.approval(d.id, !d.approved), d.approved ? 'Approval removed' : 'Doctor approved')}>{d.approved ? 'Revoke approval' : 'Approve doctor'}</Button></Card>)}{!data.length && <Card><Empty title="No doctors yet" text="Create a doctor account to begin." /></Card>}</div>
  </>;
}

function AuditPage({ data }) {
  return <><PageIntro eyebrow="Security & governance" title="Audit log" text="Recent administrative and clinical actions recorded by MRX HealthTECH." /><div className="space-y-2">{data.map((log) => <Card key={log.id} className="flex flex-wrap items-center justify-between gap-3 p-4"><div><p className="text-sm font-semibold">{log.action.replaceAll('_', ' ')} <span className="font-normal text-slate-500">- {log.entityType}</span></p><p className="mt-1 text-xs text-slate-500">{log.user?.name || 'System'} {log.details ? `- ${log.details}` : ''}</p></div><p className="text-xs text-slate-400">{dateTime(log.createdAt)}</p></Card>)}{!data.length && <Card><Empty title="No audit events yet" text="Sign-ins and platform changes will be listed here." /></Card>}</div></>;
}

function Departments({ data, action, busy }) {
  const [name, setName] = useState('');
  return <><PageIntro eyebrow="Care network" title="Departments" text="Manage the clinical departments listed with doctor profiles." /><Card className="mb-5"><form className="flex flex-wrap items-end gap-3" onSubmit={(e) => { e.preventDefault(); action(() => api.admin.addDepartment(name), 'Department created'); setName(''); }}><Field className="min-w-[240px] flex-1" label="Department name" value={name} onChange={(e) => setName(e.target.value)} required maxLength={100} /><Button disabled={busy}><Plus size={15} />Add department</Button></form></Card><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{data.map((d) => <Card key={d.id}><div className="flex items-center justify-between"><p className="font-semibold">{d.name}</p><span className="rounded-lg bg-teal-50 px-3 py-2 text-sm font-semibold text-teal-800">{d._count.doctors}</span></div><p className="mt-1 text-xs text-slate-400">active doctor profiles</p></Card>)}</div></>;
}

function Profile({ user, action, busy, updateUser }) {
  const [slots, setSlots] = useState(user.doctor?.availability || []);
  const [patientForm, setPatientForm] = useState({ name: user.patient?.name || user.name, email: user.email, age: user.patient?.age || 0, gender: user.patient?.gender || 'Other', medicalHistory: user.patient?.medicalHistory || '' });
  const [doctorForm, setDoctorForm] = useState({ name: user.name, specialization: user.doctor?.specialization || '', qualifications: user.doctor?.qualifications || '', experienceYears: user.doctor?.experienceYears || 0, languages: user.doctor?.languages || '', clinicName: user.doctor?.clinicName || '', city: user.doctor?.city || '', consultationFee: user.doctor?.consultationFee || 0, bio: user.doctor?.bio || '' });
  const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  return <><PageIntro eyebrow="Account" title="Profile" text="Your access and linked clinical profile." /><div className="grid gap-5 lg:grid-cols-[.75fr_1.25fr]"><Card><div className="flex items-center gap-4"><span className="grid h-14 w-14 place-items-center rounded-2xl bg-teal-50 text-teal-800"><UserRound size={25} /></span><div><h3 className="font-semibold">{user.name}</h3><p className="text-sm text-slate-500">{user.email}</p></div></div><div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4"><span className="text-sm text-slate-500">Account role</span><Status value={user.role} /></div><div className="mt-4 flex items-center justify-between"><span className="text-sm text-slate-500">Account status</span><Status value={user.status} /></div></Card><Card><h3 className="font-semibold">{user.patient ? 'Patient details' : user.doctor ? 'Doctor details' : 'Administrator account'}</h3>{user.patient ? <><p className="mt-2 text-xs text-slate-500">Patient ID: {user.patient.patientId}</p><form className="mt-4 grid gap-3 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); action(async () => { const response = await api.profile({ ...patientForm, age: Number(patientForm.age) }); updateUser(response.data); }, 'Profile updated'); }}><Field label="Full name" value={patientForm.name} onChange={(e) => setPatientForm({ ...patientForm, name: e.target.value })} required /><Field label="Email" type="email" value={patientForm.email} onChange={(e) => setPatientForm({ ...patientForm, email: e.target.value })} required /><Field label="Age" type="number" min="0" max="120" value={patientForm.age} onChange={(e) => setPatientForm({ ...patientForm, age: e.target.value })} required /><label><span className="label">Gender</span><select className="input" value={patientForm.gender} onChange={(e) => setPatientForm({ ...patientForm, gender: e.target.value })}><option>Female</option><option>Male</option><option>Other</option></select></label><label className="sm:col-span-2"><span className="label">Medical history</span><textarea className="input min-h-24" maxLength={5000} value={patientForm.medicalHistory} onChange={(e) => setPatientForm({ ...patientForm, medicalHistory: e.target.value })} /></label><Button className="sm:col-span-2" disabled={busy}>Save profile</Button></form></> : user.doctor ? <><p className="mt-2 text-xs text-slate-500">{user.doctor.department?.name || 'Department not assigned'} - {user.doctor.approved ? 'Approved doctor' : 'Pending admin approval'}</p><form className="mt-4 grid gap-3 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); action(async () => { const response = await api.doctorProfile({ ...doctorForm, experienceYears: Number(doctorForm.experienceYears), consultationFee: Number(doctorForm.consultationFee) }); updateUser(response.data); }, 'Doctor profile updated'); }}><Field label="Display name" value={doctorForm.name} onChange={(e) => setDoctorForm({ ...doctorForm, name: e.target.value })} required /><Field label="Specialization" value={doctorForm.specialization} onChange={(e) => setDoctorForm({ ...doctorForm, specialization: e.target.value })} required /><Field label="Qualifications" value={doctorForm.qualifications} onChange={(e) => setDoctorForm({ ...doctorForm, qualifications: e.target.value })} /><Field label="Experience (years)" type="number" min="0" max="80" value={doctorForm.experienceYears} onChange={(e) => setDoctorForm({ ...doctorForm, experienceYears: e.target.value })} /><Field label="Languages" value={doctorForm.languages} onChange={(e) => setDoctorForm({ ...doctorForm, languages: e.target.value })} /><Field label="Clinic" value={doctorForm.clinicName} onChange={(e) => setDoctorForm({ ...doctorForm, clinicName: e.target.value })} /><Field label="City" value={doctorForm.city} onChange={(e) => setDoctorForm({ ...doctorForm, city: e.target.value })} /><Field label="Consultation fee (Rs.)" type="number" min="0" value={doctorForm.consultationFee} onChange={(e) => setDoctorForm({ ...doctorForm, consultationFee: e.target.value })} /><label className="sm:col-span-2"><span className="label">About</span><textarea className="input min-h-20" maxLength={2000} value={doctorForm.bio} onChange={(e) => setDoctorForm({ ...doctorForm, bio: e.target.value })} /></label><Button className="sm:col-span-2" disabled={busy}>Save doctor profile</Button></form><div className="mt-6 border-t border-slate-100 pt-5"><h4 className="font-semibold">Weekly availability</h4><p className="mb-4 mt-1 text-xs text-slate-500">Set the hours patients see when choosing a visit time.</p><div className="space-y-2">{slots.map((slot, index) => <div key={`${slot.dayOfWeek}-${index}`} className="grid grid-cols-[1fr_1fr_1fr_auto] items-end gap-2"><label className="text-xs text-slate-500">Day<select className="input mt-1 py-2" value={slot.dayOfWeek} onChange={(e) => setSlots(slots.map((s, i) => i === index ? { ...s, dayOfWeek: Number(e.target.value) } : s))}>{days.map((day, value) => <option value={value} key={day}>{day}</option>)}</select></label><Field label="From" type="time" value={slot.startTime} onChange={(e) => setSlots(slots.map((s, i) => i === index ? { ...s, startTime: e.target.value } : s))} /><Field label="Until" type="time" value={slot.endTime} onChange={(e) => setSlots(slots.map((s, i) => i === index ? { ...s, endTime: e.target.value } : s))} /><button type="button" aria-label="Remove availability" className="mb-1 rounded-lg px-2 py-2 text-rose-600 hover:bg-rose-50" onClick={() => setSlots(slots.filter((_, i) => i !== index))}>x</button></div>)}</div><div className="mt-4 flex flex-wrap gap-2"><Button secondary onClick={() => setSlots([...slots, { dayOfWeek: 1, startTime: '09:00', endTime: '17:00' }])}><Plus size={14} />Add hours</Button><Button disabled={busy} onClick={() => action(async () => { const response = await api.availability(slots); setSlots(response.data); }, 'Availability saved')}>Save availability</Button></div></div></> : <p className="mt-3 text-sm text-slate-500">System administrator access.</p>}</Card></div></>;
}
