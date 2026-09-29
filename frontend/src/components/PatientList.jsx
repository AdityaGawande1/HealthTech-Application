import { useState, useEffect } from 'react';
import { api } from '../api/client';
import PatientForm from './PatientForm';

export default function PatientList({ onSelectPatient, selectedPatientId, refreshKey, onPatientDeleted }) {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);

  const fetchPatients = async () => {
    try {
      setLoading(true);
      const data = await api.patients.list(search);
      setPatients(data.data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, [search, refreshKey]);

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this patient? This will also delete all their test results.')) {
      return;
    }
    try {
      await api.patients.delete(id);
      await fetchPatients();
      if (selectedPatientId === id) onPatientDeleted?.();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900">Patients</h2>
        <button
          onClick={() => setShowForm(true)}
          className="btn-primary text-sm"
        >
          Add Patient
        </button>
      </div>

      {/* Search */}
      <div className="p-4 border-b border-gray-100">
        <input
          type="text"
          placeholder="Search patients..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input"
        />
      </div>

      {/* Patient List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading patients...</div>
        ) : error ? (
          <div className="p-8 text-center text-red-500">Error: {error}</div>
        ) : patients.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No patients found. Click "Add Patient" to create one.
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {patients.map((patient) => (
              <li
                key={patient.id}
                onClick={() => onSelectPatient(patient)}
                className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                  selectedPatientId === patient.id ? 'bg-primary-50 border-l-4 border-primary-500' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{patient.name}</p>
                    <p className="text-sm text-gray-500">ID: {patient.patientId} • Age: {patient.age} • {patient.gender}</p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(patient.id);
                    }}
                    className="text-red-500 hover:text-red-700 text-sm"
                  >
                    Delete
                  </button>
                </div>
                {patient.testResults.length > 0 && (
                  <p className="mt-1 text-sm text-gray-500">
                    Latest: {patient.testResults[0].biomarkerName} - {patient.testResults[0].value} {patient.testResults[0].unit} on {new Date(patient.testResults[0].testDate).toLocaleDateString()}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Add Patient Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <PatientForm
              onClose={() => setShowForm(false)}
              onSuccess={() => {
                setShowForm(false);
                fetchPatients();
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
