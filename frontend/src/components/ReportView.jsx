import { useMemo, useState } from 'react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const formatDate = (value, options) => new Date(value).toLocaleDateString(undefined, options);

export default function ReportView({ patient, testResults, onBack }) {
  const biomarkers = useMemo(() => [...new Set(testResults.map((test) => test.biomarkerName))].sort(), [testResults]);
  const [selectedBiomarker, setSelectedBiomarker] = useState('');
  const activeBiomarker = biomarkers.includes(selectedBiomarker) ? selectedBiomarker : biomarkers[0] || '';
  const chartData = useMemo(() => testResults
    .filter((test) => test.biomarkerName === activeBiomarker)
    .map((test) => ({ ...test, chartDate: formatDate(test.testDate, { month: 'short', day: 'numeric', year: '2-digit' }) }))
    .sort((a, b) => new Date(a.testDate) - new Date(b.testDate)), [testResults, activeBiomarker]);
  const sortedResults = [...testResults].sort((a, b) => new Date(b.testDate) - new Date(a.testDate));

  return <div className="mx-auto max-w-4xl p-5 md:p-8">
    <div className="mb-6 flex justify-between print:hidden"><button className="btn-secondary" onClick={onBack}>Back</button><button className="btn-primary" onClick={() => window.print()}>Print / Save as PDF</button></div>
    <article className="bg-white text-gray-900">
      <header className="mb-7 border-b-2 border-primary-600 pb-5"><p className="text-sm font-semibold uppercase tracking-widest text-primary-700">MIX HealthTECH</p><h1 className="mt-2 text-3xl font-bold">Patient Monitoring Report</h1><p className="mt-2 text-sm text-gray-500">Generated {formatDate(new Date(), { year: 'numeric', month: 'long', day: 'numeric' })}</p></header>
      <section className="mb-8"><h2 className="mb-4 border-b pb-2 text-xl font-semibold">Patient Information</h2><dl className="grid grid-cols-2 gap-4 text-sm"><div><dt className="text-gray-500">Patient ID</dt><dd className="font-medium">{patient.patientId}</dd></div><div><dt className="text-gray-500">Name</dt><dd className="font-medium">{patient.name}</dd></div><div><dt className="text-gray-500">Age</dt><dd className="font-medium">{patient.age}</dd></div><div><dt className="text-gray-500">Gender</dt><dd className="font-medium">{patient.gender}</dd></div><div className="col-span-2"><dt className="text-gray-500">Medical history</dt><dd className="whitespace-pre-wrap font-medium">{patient.medicalHistory || 'None recorded'}</dd></div><div><dt className="text-gray-500">Record created</dt><dd className="font-medium">{formatDate(patient.createdAt, { year: 'numeric', month: 'long', day: 'numeric' })}</dd></div></dl></section>
      <section className="mb-8"><h2 className="mb-4 border-b pb-2 text-xl font-semibold">Latest Results</h2>{biomarkers.length ? <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b text-gray-500"><th className="p-2">Biomarker</th><th className="p-2">Value</th><th className="p-2">Unit</th><th className="p-2">Date</th></tr></thead><tbody>{biomarkers.map((name) => { const latest = [...testResults].filter((test) => test.biomarkerName === name).sort((a, b) => new Date(b.testDate) - new Date(a.testDate))[0]; return <tr className="border-b" key={name}><td className="p-2 font-medium">{name}</td><td className="p-2">{latest.value}</td><td className="p-2">{latest.unit}</td><td className="p-2">{formatDate(latest.testDate)}</td></tr>; })}</tbody></table></div> : <p className="text-gray-500">No test results recorded.</p>}</section>
      {biomarkers.length > 0 && <section className="mb-8"><div className="mb-3 flex items-center justify-between"><h2 className="text-xl font-semibold">Trend: {activeBiomarker}</h2><select aria-label="Report biomarker" className="input w-auto print:hidden" value={activeBiomarker} onChange={(event) => setSelectedBiomarker(event.target.value)}>{biomarkers.map((name) => <option key={name}>{name}</option>)}</select></div><div className="h-72"><ResponsiveContainer width="100%" height="100%"><LineChart data={chartData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="chartDate" /><YAxis unit={chartData[0]?.unit ? ` ${chartData[0].unit}` : ''} /><Tooltip /><Line dataKey="value" name={activeBiomarker} stroke="#0d9488" strokeWidth={2} dot={{ r: 4 }} /></LineChart></ResponsiveContainer></div></section>}
      <section className="mb-8"><h2 className="mb-4 border-b pb-2 text-xl font-semibold">Complete Test History</h2>{sortedResults.length ? <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b text-gray-500"><th className="p-2">Biomarker</th><th className="p-2">Value</th><th className="p-2">Unit</th><th className="p-2">Date</th></tr></thead><tbody>{sortedResults.map((test) => <tr key={test.id} className="border-b"><td className="p-2 font-medium">{test.biomarkerName}</td><td className="p-2">{test.value}</td><td className="p-2">{test.unit}</td><td className="p-2">{formatDate(test.testDate)}</td></tr>)}</tbody></table></div> : <p className="text-gray-500">No test results recorded.</p>}</section>
      <footer className="border-t pt-4 text-center text-xs text-gray-500">Patient Monitoring Dashboard - Generated from recorded patient data</footer>
    </article>
  </div>;
}
