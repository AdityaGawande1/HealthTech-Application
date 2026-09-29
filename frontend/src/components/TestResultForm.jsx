import { useState, useEffect } from 'react';
import { api } from '../api/client';

export default function TestResultForm({ patientId, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    biomarkerName: '',
    value: '',
    unit: '',
    testDate: new Date().toISOString().split('T')[0],
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [biomarkers, setBiomarkers] = useState([]);

  // Fetch existing biomarkers for this patient for autocomplete
  useEffect(() => {
    api.tests.list(patientId)
      .then(data => {
        const uniqueBiomarkers = [...new Set(data.data.map(t => t.biomarkerName))];
        setBiomarkers(uniqueBiomarkers);
      })
      .catch(console.error);
  }, [patientId]);

  const validate = () => {
    const newErrors = {};
    if (!formData.biomarkerName.trim()) newErrors.biomarkerName = 'Biomarker name is required';
    if (formData.value === '' || !Number.isFinite(Number(formData.value))) newErrors.value = 'Value must be a finite number';
    if (!formData.unit.trim()) newErrors.unit = 'Unit is required';
    if (!formData.testDate) newErrors.testDate = 'Test date is required';
    else if (new Date(formData.testDate) > new Date()) newErrors.testDate = 'Test date cannot be in the future';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      await api.tests.create(patientId, {
        biomarkerName: formData.biomarkerName.trim(),
        value: parseFloat(formData.value),
        unit: formData.unit.trim(),
        testDate: new Date(formData.testDate).toISOString(),
      });
      onSuccess();
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Add Test Result</h3>
        <button
          type="button"
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 text-xl leading-none"
        >
          x
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <label htmlFor="biomarkerName" className="label">Biomarker Name</label>
          <div className="relative">
            <input
              type="text"
              id="biomarkerName"
              name="biomarkerName"
              value={formData.biomarkerName}
              onChange={handleChange}
              list="biomarkers"
              className={`input ${errors.biomarkerName ? 'border-red-500 focus:ring-red-500' : ''}`}
              placeholder="e.g., Glucose, HbA1c, Blood Pressure"
            />
            <datalist id="biomarkers">
              {biomarkers.map(b => <option key={b} value={b} />)}
            </datalist>
          </div>
          {errors.biomarkerName && <p className="mt-1 text-sm text-red-500">{errors.biomarkerName}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="value" className="label">Value</label>
            <input
              type="number"
              id="value"
              name="value"
              value={formData.value}
              onChange={handleChange}
              className={`input ${errors.value ? 'border-red-500 focus:ring-red-500' : ''}`}
              step="any"
              placeholder="e.g., 145"
            />
            {errors.value && <p className="mt-1 text-sm text-red-500">{errors.value}</p>}
          </div>

          <div>
            <label htmlFor="unit" className="label">Unit</label>
            <input
              type="text"
              id="unit"
              name="unit"
              value={formData.unit}
              onChange={handleChange}
              className={`input ${errors.unit ? 'border-red-500 focus:ring-red-500' : ''}`}
              placeholder="e.g., mg/dL"
            />
            {errors.unit && <p className="mt-1 text-sm text-red-500">{errors.unit}</p>}
          </div>
        </div>

        <div>
          <label htmlFor="testDate" className="label">Test Date</label>
          <input
            type="date"
            id="testDate"
            name="testDate"
            value={formData.testDate}
            onChange={handleChange}
            className={`input ${errors.testDate ? 'border-red-500 focus:ring-red-500' : ''}`}
            max={new Date().toISOString().split('T')[0]}
          />
          {errors.testDate && <p className="mt-1 text-sm text-red-500">{errors.testDate}</p>}
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={submitting || !formData.biomarkerName.trim() || formData.value === '' || !Number.isFinite(Number(formData.value)) || !formData.unit.trim() || !formData.testDate || new Date(`${formData.testDate}T00:00:00`) > new Date(new Date().toDateString())}>
            {submitting ? 'Adding...' : 'Add Test Result'}
          </button>
        </div>
      </div>
    </form>
  );
}
