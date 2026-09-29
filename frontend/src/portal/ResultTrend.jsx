import { useMemo, useState } from 'react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export default function ResultTrend({ results = [] }) {
  const markers = useMemo(() => [...new Set(results.map((result) => result.biomarkerName))], [results]);
  const [marker, setMarker] = useState('');
  const activeMarker = markers.includes(marker) ? marker : markers[0] || '';
  const rows = results.filter((result) => result.biomarkerName === activeMarker).slice().sort((a, b) => new Date(a.testDate) - new Date(b.testDate));
  const unit = rows[0]?.unit || '';
  return <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_2px_8px_rgba(15,50,55,.03)] sm:p-6"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-semibold text-slate-900">Biomarker trend</h3><p className="mt-1 text-xs text-slate-400">Recorded values over time · informational, not diagnostic</p></div>{markers.length > 1 && <label className="text-xs text-slate-500">Biomarker <select aria-label="Choose biomarker" className="ml-2 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-700" value={activeMarker} onChange={(event) => setMarker(event.target.value)}>{markers.map((value) => <option key={value}>{value}</option>)}</select></label>}</div>
    {rows.length > 1 ? <div className="mt-5 h-64 w-full"><ResponsiveContainer width="100%" height="100%"><LineChart data={rows} margin={{ top: 8, right: 14, bottom: 4, left: 0 }}><CartesianGrid stroke="#e8eeee" strokeDasharray="4 4" vertical={false} /><XAxis dataKey="testDate" tickFormatter={(value) => new Date(value).toLocaleDateString([], { month: 'short', day: 'numeric' })} tick={{ fontSize: 11, fill: '#7b8b8d' }} axisLine={false} tickLine={false} /><YAxis width={48} tick={{ fontSize: 11, fill: '#7b8b8d' }} axisLine={false} tickLine={false} /><Tooltip labelFormatter={(value) => new Date(value).toLocaleDateString()} formatter={(value) => [`${value} ${unit}`, activeMarker]} contentStyle={{ borderRadius: 12, borderColor: '#dce8e7', fontSize: 12 }} /><Line type="monotone" dataKey="value" stroke="#12877e" strokeWidth={2.5} dot={{ r: 4, fill: '#12877e', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} /></LineChart></ResponsiveContainer></div> : <div className="grid h-48 place-items-center text-center text-sm text-slate-400"><p>{rows.length ? 'One reading recorded. Add another measurement to show a trend.' : 'No measurements available to chart.'}</p></div>}
  </section>;
}
