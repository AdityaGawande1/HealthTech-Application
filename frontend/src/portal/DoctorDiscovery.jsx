import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, CalendarDays, Heart, MapPin, Search, ShieldCheck, Star } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client';

const dateInputValue = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const days = Array.from({ length: 14 }, (_, index) => {
  const date = new Date();
  date.setDate(date.getDate() + index);
  return dateInputValue(date);
});
const dateLabel = (value) => new Date(`${value}T12:00:00`).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
const avatar = (doctor) => doctor.user.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(doctor.user.name)}&background=0d9488&color=fff`;

const Card = ({ children, className = '' }) => <section className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}>{children}</section>;
const Field = ({ label, ...props }) => <label className="block"><span className="mb-1 block text-xs font-semibold text-slate-600">{label}</span><input className="input" {...props} /></label>;

export function DoctorSearch() {
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState({});
  const [doctors, setDoctors] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => { const timer = setTimeout(() => setQuery(search.trim()), 250); return () => clearTimeout(timer); }, [search]);
  useEffect(() => {
    let active = true;
    setLoading(true);
    api.doctors.list({ ...filters, ...(query ? { search: query } : {}) })
      .then(({ data }) => { if (active) { setDoctors(data); setError(''); } })
      .catch((err) => { if (active) setError(err.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [filters, query]);
  useEffect(() => { api.favorites.list().then(({ data }) => setFavorites(data.map((doctor) => doctor.id))).catch(() => {}); }, []);
  const filter = (key, value) => setFilters((current) => ({ ...current, [key]: value || undefined }));
  const toggleFavorite = async (doctor) => {
    const active = favorites.includes(doctor.id);
    try {
      if (active) await api.favorites.remove(doctor.id); else await api.favorites.add(doctor.id);
      setFavorites((current) => active ? current.filter((id) => id !== doctor.id) : [...current, doctor.id]);
    } catch (err) { setError(err.message); }
  };
  return <>
    <header className="mb-6"><p className="text-[10px] font-bold uppercase tracking-[.18em] text-teal-700">Care directory</p><h2 className="mt-1 text-2xl font-semibold text-slate-900">Find a doctor</h2><p className="mt-1 text-sm text-slate-500">Compare doctors, availability and consultation fees.</p></header>
    <Card className="mb-5"><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <label className="sm:col-span-2 xl:col-span-4"><span className="mb-1 block text-xs font-semibold text-slate-600">Doctor, specialty or clinic</span><div className="flex items-center gap-2 rounded-xl border border-slate-200 px-3"><Search size={17} className="text-slate-400" /><input className="w-full border-0 py-3 text-sm outline-none" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by name, department, condition or location" /></div></label>
      <Field label="Specialty" value={filters.specialization || ''} onChange={(event) => filter('specialization', event.target.value)} placeholder="Any specialty" />
      <Field label="City" value={filters.city || ''} onChange={(event) => filter('city', event.target.value)} placeholder="Any city" />
      <Field label="Minimum experience" type="number" min="0" value={filters.experienceMin || ''} onChange={(event) => filter('experienceMin', event.target.value)} placeholder="Any" />
      <label><span className="mb-1 block text-xs font-semibold text-slate-600">Gender</span><select className="input" value={filters.gender || ''} onChange={(event) => filter('gender', event.target.value)}><option value="">Any</option><option>Female</option><option>Male</option><option>Other</option></select></label>
      <Field label="Fee from" type="number" min="0" value={filters.feeMin || ''} onChange={(event) => filter('feeMin', event.target.value)} placeholder="Rs. " />
      <Field label="Fee to" type="number" min="0" value={filters.feeMax || ''} onChange={(event) => filter('feeMax', event.target.value)} placeholder="Rs. " />
      <Field label="Language" value={filters.language || ''} onChange={(event) => filter('language', event.target.value)} placeholder="Any language" />
      <label><span className="mb-1 block text-xs font-semibold text-slate-600">Availability</span><select className="input" value={filters.available || ''} onChange={(event) => filter('available', event.target.value)}><option value="">Any day</option><option value="today">Today</option><option value="tomorrow">Tomorrow</option></select></label>
      <label><span className="mb-1 block text-xs font-semibold text-slate-600">Sort by</span><select className="input" value={filters.sort || 'relevance'} onChange={(event) => filter('sort', event.target.value === 'relevance' ? '' : event.target.value)}><option value="relevance">Relevance</option><option value="rating">Rating</option><option value="fee">Lowest fee</option><option value="experience">Experience</option></select></label>
    </div></Card>
    {error && <p role="alert" className="mb-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
    {loading ? <p role="status" className="py-12 text-center text-sm text-slate-500">Finding available doctors...</p> : <div className="grid gap-4 lg:grid-cols-2">{doctors.map((doctor) => <article key={doctor.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"><div className="flex gap-4"><Link to={`/patient/doctors/${doctor.id}`} aria-label={`View ${doctor.user.name} profile`}><img className="h-16 w-16 rounded-2xl object-cover" src={avatar(doctor)} alt="" /></Link><div className="min-w-0 flex-1"><Link to={`/patient/doctors/${doctor.id}`} className="font-semibold text-slate-900 hover:text-teal-800">{doctor.user.name}</Link><p className="mt-1 text-sm text-teal-800">{doctor.specialization}</p><p className="mt-1 text-xs text-slate-500">{doctor.qualifications} - {doctor.experienceYears} years experience</p><p className="mt-2 flex items-center gap-1 text-xs text-slate-500"><MapPin size={13} />{doctor.clinicName}, {doctor.city || doctor.location}</p></div><button type="button" onClick={() => toggleFavorite(doctor)} className="h-fit rounded-lg p-2 text-rose-500 hover:bg-rose-50" aria-label={favorites.includes(doctor.id) ? 'Remove from favorites' : 'Add to favorites'}><Heart size={18} fill={favorites.includes(doctor.id) ? 'currentColor' : 'none'} /></button></div><div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4"><p className="text-sm font-semibold text-slate-800">Rs. {doctor.consultationFee}<span className="ml-1 text-xs font-normal text-slate-400">- {doctor._count?.reviews || 0} reviews</span></p><p className="text-sm text-amber-700"><Star size={14} className="mr-1 inline" fill="currentColor" />{doctor.ratingAvg.toFixed(1)}</p><Link className="btn-primary" to={`/patient/doctors/${doctor.id}`}>View profile <ArrowRight size={15} /></Link></div></article>)}{!doctors.length && <Card className="lg:col-span-2 text-center text-sm text-slate-500">No doctors match those filters. Try broadening your search.</Card>}</div>}
  </>;
}

export function DoctorProfile({ doctor, action, busy }) {
  const navigate = useNavigate();
  const [date, setDate] = useState(days[0]);
  const [slots, setSlots] = useState([]);
  const [selected, setSelected] = useState('');
  const [reason, setReason] = useState('');
  const [complete, setComplete] = useState(false);
  useEffect(() => {
    localStorage.setItem('mrx-recent-doctors', JSON.stringify([doctor.id, ...JSON.parse(localStorage.getItem('mrx-recent-doctors') || '[]').filter((id) => id !== doctor.id)].slice(0, 5)));
  }, [doctor.id]);
  useEffect(() => {
    let active = true;
    api.doctors.slots(doctor.id, date).then(({ data }) => { if (active) { setSlots(data); setSelected(''); } }).catch(() => { if (active) setSlots([]); });
    return () => { active = false; };
  }, [doctor.id, date]);
  const book = async () => {
    const result = await action(() => api.appointments.create({ doctorId: doctor.id, startAt: selected, reason }), 'Appointment request sent');
    if (result) setComplete(true);
  };
  return <>
    <button type="button" onClick={() => navigate('/patient/doctors')} className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-teal-800"><ArrowLeft size={16} />Back to doctors</button>
    <div className="grid gap-5 xl:grid-cols-[1fr_370px]"><div className="space-y-5">
      <Card><div className="flex flex-wrap gap-5"><img src={avatar(doctor)} alt="" className="h-24 w-24 rounded-2xl object-cover" /><div className="flex-1"><h2 className="flex items-center gap-2 text-xl font-semibold">{doctor.user.name}<ShieldCheck size={17} className="text-teal-700" aria-label="Approved doctor" /></h2><p className="mt-1 text-teal-800">{doctor.specialization}</p><p className="mt-2 text-sm text-slate-500">{doctor.qualifications} - {doctor.experienceYears} years - {doctor.languages}</p><p className="mt-2 text-sm text-slate-500">{doctor.clinicName}, {doctor.city || doctor.location}</p><p className="mt-2 text-sm text-amber-700">* {doctor.ratingAvg.toFixed(1)} <span className="text-slate-400">- {doctor._count.reviews} patient reviews</span></p></div></div><p className="mt-6 whitespace-pre-wrap text-sm leading-7 text-slate-600">{doctor.bio}</p></Card>
      <Card><h3 className="font-semibold">Weekly availability</h3><div className="mt-3 grid gap-2 sm:grid-cols-2">{doctor.availability.map((slot) => <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600" key={slot.id}>{['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][slot.dayOfWeek]} - {slot.startTime}-{slot.endTime}</p>)}</div></Card>
      <Card><h3 className="font-semibold">Patient reviews</h3><div className="mt-3 space-y-3">{doctor.reviews.map((review) => <div className="border-t border-slate-100 pt-3" key={review.id}><p className="font-medium text-amber-700">* {review.rating} <span className="text-sm font-normal text-slate-500">- {review.patient.name}</span></p><p className="mt-1 text-sm text-slate-600">{review.comment || 'No written comment.'}</p></div>)}{!doctor.reviews.length && <p className="text-sm text-slate-500">Reviews are available after a completed visit.</p>}</div></Card>
    </div><Card className="h-fit xl:sticky xl:top-24"><h3 className="text-lg font-semibold">Book a visit</h3><p className="mt-1 text-sm text-slate-500">Consultation fee Rs. {doctor.consultationFee}</p>{complete ? <div className="mt-5 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800" role="status">Your booking request is in. Track the appointment from your schedule.</div> : <><label className="mt-5 block"><span className="mb-1 block text-xs font-semibold text-slate-600">Choose one of the next 14 days</span><select className="input" value={date} onChange={(event) => setDate(event.target.value)}>{days.map((day) => <option key={day} value={day}>{dateLabel(day)}</option>)}</select></label><div className="mt-4"><p className="mb-1 block text-xs font-semibold text-slate-600">Available times</p><div className="grid grid-cols-3 gap-2">{slots.filter((slot) => slot.available).map((slot) => <button type="button" key={slot.startAt} onClick={() => setSelected(slot.startAt)} aria-pressed={selected === slot.startAt} className={`rounded-lg border px-2 py-2 text-xs ${selected === slot.startAt ? 'border-teal-700 bg-teal-50 text-teal-800' : 'border-slate-200 hover:border-teal-400'}`}>{slot.startTime}</button>)}{!slots.some((slot) => slot.available) && <p className="col-span-3 py-3 text-xs text-slate-400">No available times on this date.</p>}</div></div><label className="mt-4 block"><span className="mb-1 block text-xs font-semibold text-slate-600">Reason for visit</span><textarea className="input min-h-20" maxLength={500} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Optional" /></label><button type="button" className="btn-primary mt-4 w-full" disabled={busy || !selected} onClick={book}><CalendarDays size={16} className="mr-2 inline" />Confirm request</button></>}</Card></div>
  </>;
}
