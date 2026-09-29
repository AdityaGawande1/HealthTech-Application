import { useState } from 'react';
import { api } from '../api/client';

export default function TestHistoryTable({ patientId, testResults, onDelete, biomarkers }) {
  const [filterBiomarker, setFilterBiomarker] = useState('');

  const filteredResults = filterBiomarker
    ? testResults.filter(t => t.biomarkerName === filterBiomarker)
    : testResults;

  const handleDelete = async (testId) => {
    if (!window.confirm('Delete this test result?')) return;
    try {
      await api.tests.delete(testId);
      onDelete(testId);
    } catch (err) {
      alert(err.message);
    }
  };

  if (testResults.length === 0) {
    return (
      <div className="card">
        <p className="text-center text-gray-500 py-8">No test results recorded yet.</p>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Test History</h3>
        {biomarkers.length > 1 && (
          <select
            value={filterBiomarker}
            onChange={(e) => setFilterBiomarker(e.target.value)}
            className="input w-auto"
          >
            <option value="">All Biomarkers</option>
            {biomarkers.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b border-gray-100">
              <th className="pb-3 font-medium">Biomarker</th>
              <th className="pb-3 font-medium">Value</th>
              <th className="pb-3 font-medium">Unit</th>
              <th className="pb-3 font-medium">Date</th>
              <th className="pb-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredResults.map((test) => (
              <tr key={test.id} className="hover:bg-gray-50">
                <td className="py-3 font-medium text-gray-900">{test.biomarkerName}</td>
                <td className="py-3 text-gray-700">{test.value}</td>
                <td className="py-3 text-gray-700">{test.unit}</td>
                <td className="py-3 text-gray-700">{new Date(test.testDate).toLocaleDateString()}</td>
                <td className="py-3">
                  <button
                    onClick={() => handleDelete(test.id)}
                    className="text-red-500 hover:text-red-700 text-sm"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredResults.length === 0 && filterBiomarker && (
        <p className="text-center text-gray-500 py-4">No results for {filterBiomarker}</p>
      )}
    </div> 
  );
}