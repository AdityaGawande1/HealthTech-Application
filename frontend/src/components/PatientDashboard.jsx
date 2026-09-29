import { useState } from 'react';
import { api } from '../api/client';

export default function PatientDashboard({ patient, onBack, onAddTest, onViewReport }) {
  const [testResults, setTestResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddTestForm, setShowAddTestForm] = useState(false);

  const fetchTests = async () => {
    try {
      setLoading(true);
      const data = await api.tests.list(patient.id);
      setTestResults(data.data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTestAdded = () => {
    setShowAddTestForm(false);
    fetchTests();
  };

  const handleTestDeleted = (testId) => {
    setTestResults((prev) => prev.filter((t) => t.id !== testId));
  };

  const biomarkers = [...new Set(testResults.map((t) => t.biomarkerName))].sort();

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <button onClick={onBack} className="text-gray-500 hover:text-gray-700 text-sm mb-2 inline-flex items-center">
              Back to patients
            </button>
            <h1 className="text-2xl font-bold text-gray-900">{patient.name}</h1>
            <p className="text-gray-500">ID: {patient.patientId} | Age: {patient.age} | {patient.gender}</p>
          </div>
          <div className="flex gap-3">
            <button onClick={onViewReport} className="btn-secondary">
              View Report
            </button>
            <button onClick={() => setShowAddTestForm(true)} className="btn-primary">
              Add Test Result
            </button>
          </div>
        </div>

        {/* Patient Info Card */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Patient Information</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Patient ID</p>
              <p className="font-medium text-gray-900">{patient.patientId}</p>
            </div>
            <div>
              <p className="text-gray-500">Name</p>
              <p className="font-medium text-gray-900">{patient.name}</p>
            </div>
            <div>
              <p className="text-gray-500">Age</p>
              <p className="font-medium text-gray-900">{patient.age}</p>
            </div>
            <div>
              <p className="text-gray-500">Gender</p>
              <p className="font-medium text-gray-900">{patient.gender}</p>
            </div>
            <div className="col-span-2 md:col-span-4">
              <p className="text-gray-500">Medical History</p>
              <p className="font-medium text-gray-900">{patient.medicalHistory || 'None recorded'}</p>
            </div>
          </div>
        </div>

        {/* Latest Result */}
        {testResults.length > 0 && (
          <div className="card border-l-4 border-primary-500">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Latest Test Result</h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div>
                <p className="text-gray-500 text-sm">Biomarker</p>
                <p className="font-medium text-gray-900">{testResults[0].biomarkerName}</p>
              </div>
              <div>
                <p className="text-gray-500 text-sm">Value</p>
                <p className="font-medium text-gray-900 text-xl">{testResults[0].value}</p>
              </div>
              <div>
                <p className="text-gray-500 text-sm">Unit</p>
                <p className="font-medium text-gray-900">{testResults[0].unit}</p>
              </div>
              <div>
                <p className="text-gray-500 text-sm">Date</p>
                <p className="font-medium text-gray-900">{new Date(testResults[0].testDate).toLocaleDateString()}</p>
              </div>
            </div>
          </div>
        )}

        {/* Trend Chart */}
        <TrendChart testResults={testResults} />

        {/* Test History Table */}
        <TestHistoryTable
          patientId={patient.id}
          testResults={testResults}
          onDelete={handleTestDeleted}
          biomarkers={biomarkers}
        />

        {/* Add Test Form Modal */}
        {showAddTestForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
              <TestResultForm
                patientId={patient.id}
                onClose={() => setShowAddTestForm(false)}
                onSuccess={handleTestAdded}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Import components
import TrendChart from './TrendChart';
import TestHistoryTable from './TestHistoryTable';
import TestResultForm from './TestResultForm';