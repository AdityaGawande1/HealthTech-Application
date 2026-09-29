import { useMemo, useState } from 'react';
import TrendChart from '../components/TrendChart';
import TestHistoryTable from '../components/TestHistoryTable';
import TestResultForm from '../components/TestResultForm';

const date = (value) => new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });

export default function Dashboard({ patient, onDataChanged, onShowReport }) {
  const [showForm, setShowForm] = useState(false);
  const results = useMemo(() => [...(patient.testResults || [])].sort((a, b) => new Date(b.testDate) - new Date(a.testDate)), [patient.testResults]);
  const latest = results[0];

  return <div className="mx-auto max-w-6xl space-y-6 p-5 md:p-8">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm font-medium text-primary-700">Patient overview</p><h2 className="mt-1 text-2xl font-bold text-gray-900">{patient.name}</h2><p className="mt-1 text-sm text-gray-500">Patient ID {patient.patientId} - Updated from recorded test history</p></div><div className="flex gap-2"><button className="btn-secondary" onClick={onShowReport}>View report</button><button className="btn-primary" onClick={() => setShowForm(true)}>Add test result</button></div></div>
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <div className="card"><p className="text-sm text-gray-500">Age</p><p className="mt-2 text-xl font-semibold">{patient.age} years</p></div>
      <div className="card"><p className="text-sm text-gray-500">Gender</p><p className="mt-2 text-xl font-semibold">{patient.gender}</p></div>
      <div className="card"><p className="text-sm text-gray-500">Test records</p><p className="mt-2 text-xl font-semibold">{results.length}</p></div>
      <div className="card"><p className="text-sm text-gray-500">Latest result</p><p className="mt-2 text-xl font-semibold">{latest ? `${latest.value} ${latest.unit}` : 'No results'}</p><p className="text-sm text-gray-500">{latest ? `${latest.biomarkerName} - ${date(latest.testDate)}` : 'Add a test to begin tracking'}</p></div>
    </section>
    <section className="card"><h3 className="mb-2 text-lg font-semibold">Medical history</h3><p className="whitespace-pre-wrap text-gray-600">{patient.medicalHistory || 'No medical history recorded.'}</p></section>
    <TrendChart testResults={results} />
    <TestHistoryTable testResults={results} biomarkers={[...new Set(results.map((r) => r.biomarkerName))].sort()} onDelete={onDataChanged} />
    {showForm && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"><div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white"><TestResultForm patientId={patient.id} onClose={() => setShowForm(false)} onSuccess={() => { setShowForm(false); onDataChanged(); }} /></div></div>}
  </div>;
}
