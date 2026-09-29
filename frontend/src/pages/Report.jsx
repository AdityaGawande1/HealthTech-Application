import { useEffect, useState } from 'react';
import { api } from '../api/client';
import ReportView from '../components/ReportView';

export default function Report({ patient, onBack }) {
  const [results, setResults] = useState(patient.testResults || []);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    api.tests.list(patient.id).then(({ data }) => { if (active) setResults(data); }).catch((err) => { if (active) setError(err.message); });
    return () => { active = false; };
  }, [patient.id]);
  return <>{error && <p role="alert" className="mx-auto mt-4 max-w-4xl rounded-lg bg-red-50 p-3 text-red-700">Could not refresh test history: {error}</p>}<ReportView patient={patient} testResults={results} onBack={onBack} /></>;
}
