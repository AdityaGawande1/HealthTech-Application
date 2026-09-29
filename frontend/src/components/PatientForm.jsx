import { useEffect, useState } from 'react';
import { api } from '../api/client';

export default function PatientForm({ initialData, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    patientId: '',
    name: '',
    age: '',
    gender: 'Male',
    medicalHistory: '',
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (initialData) {
    setFormData({
      patientId: initialData.patientId,
      name: initialData.name,
      age: String(initialData.age),
      gender: initialData.gender,
      medicalHistory: initialData.medicalHistory || '',
    });
    }
  }, [initialData]);

  const validate = () => {
    const newErrors = {};
    if (!formData.patientId.trim()) newErrors.patientId = 'Patient ID is required';
    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (formData.age === '' || !Number.isInteger(Number(formData.age)) || Number(formData.age) < 0 || Number(formData.age) > 120) {
      newErrors.age = 'Age must be a whole number between 0 and 120';
    }
    if (!formData.gender) newErrors.gender = 'Gender is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      const payload = {
        patientId: formData.patientId.trim(),
        name: formData.name.trim(),
        age: parseInt(formData.age, 10),
        gender: formData.gender,
        medicalHistory: formData.medicalHistory.trim() || null,
      };

      if (initialData) {
        await api.patients.update(initialData.id, payload);
      } else {
        await api.patients.create(payload);
      }
      onSuccess();
    } catch (err) {
      if (err.message.includes('already exists')) {
        setErrors({ patientId: err.message });
      } else {
        alert(err.message);
      }
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
        <h3 className="text-lg font-semibold text-gray-900">{initialData ? 'Edit Patient' : 'Add Patient'}</h3>
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
          <label htmlFor="patientId" className="label">Patient ID</label>
          <input
            type="text"
            id="patientId"
            name="patientId"
            value={formData.patientId}
            onChange={handleChange}
            className={`input ${errors.patientId ? 'border-red-500 focus:ring-red-500' : ''}`}
            disabled={!!initialData}
          />
          {errors.patientId && <p className="mt-1 text-sm text-red-500">{errors.patientId}</p>}
        </div>

        <div>
          <label htmlFor="name" className="label">Name</label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className={`input ${errors.name ? 'border-red-500 focus:ring-red-500' : ''}`}
            maxLength={100}
          />
          {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="age" className="label">Age</label>
            <input
              type="number"
              id="age"
              name="age"
              value={formData.age}
              onChange={handleChange}
              className={`input ${errors.age ? 'border-red-500 focus:ring-red-500' : ''}`}
              min="0"
              max="120"
            />
            {errors.age && <p className="mt-1 text-sm text-red-500">{errors.age}</p>}
          </div>

          <div>
            <label htmlFor="gender" className="label">Gender</label>
            <select
              id="gender"
              name="gender"
              value={formData.gender}
              onChange={handleChange}
              className={`input ${errors.gender ? 'border-red-500 focus:ring-red-500' : ''}`}
            >
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
            {errors.gender && <p className="mt-1 text-sm text-red-500">{errors.gender}</p>}
          </div>
        </div>

        <div>
          <label htmlFor="medicalHistory" className="label">Medical History (optional)</label>
          <textarea
            id="medicalHistory"
            name="medicalHistory"
            value={formData.medicalHistory}
            onChange={handleChange}
            className="input"
            rows={3}
            maxLength={5000}
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={submitting || !formData.patientId.trim() || !formData.name.trim() || formData.age === '' || !Number.isInteger(Number(formData.age)) || Number(formData.age) < 0 || Number(formData.age) > 120}>
            {submitting ? 'Saving...' : (initialData ? 'Update' : 'Create')}
          </button>
        </div>
      </div>
    </form>
  );
}
