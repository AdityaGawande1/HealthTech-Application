import { useState, useEffect, useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

export default function TrendChart({ testResults }) {
  const [selectedBiomarker, setSelectedBiomarker] = useState('');

  const biomarkers = useMemo(() => {
    const unique = [...new Set(testResults.map(t => t.biomarkerName))];
    return unique.sort();
  }, [testResults]);

  useEffect(() => {
    if (biomarkers.length > 0 && !selectedBiomarker) {
      setSelectedBiomarker(biomarkers[0]);
    }
  }, [biomarkers, selectedBiomarker]);

  const chartData = useMemo(() => {
    if (!selectedBiomarker) return [];
    return testResults
      .filter(t => t.biomarkerName === selectedBiomarker)
      .map(t => ({
        date: new Date(t.testDate).toLocaleDateString(),
        value: t.value,
        unit: t.unit,
        rawDate: t.testDate,
      }))
      .sort((a, b) => new Date(a.rawDate) - new Date(b.rawDate));
  }, [testResults, selectedBiomarker]);

  if (testResults.length === 0) {
    return (
      <div className="card">
        <p className="text-center text-gray-500 py-8">No test results available for chart.</p>
      </div>
    );
  }

  if (biomarkers.length === 0) {
    return (
      <div className="card">
        <p className="text-center text-gray-500 py-8">No biomarkers to display.</p>
      </div>
    );
  }

  const unit = chartData[0]?.unit || '';

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Trend Chart</h3>
        <select
          value={selectedBiomarker}
          onChange={(e) => setSelectedBiomarker(e.target.value)}
          className="input w-auto"
        >
          {biomarkers.map(b => <option key={b} value={b}>{b}</option>)}
        </select>
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12, fill: '#6b7280' }}
              axisLine={{ stroke: '#e5e7eb' }}
              tickLine={{ stroke: '#e5e7eb' }}
            />
            <YAxis
              tick={{ fontSize: 12, fill: '#6b7280' }}
              axisLine={{ stroke: '#e5e7eb' }}
              tickLine={{ stroke: '#e5e7eb' }}
              label={{ value: unit, angle: -90, position: 'insideLeft', offset: 10, fill: '#6b7280', fontSize: 12 }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              }}
              labelStyle={{ color: '#374151', fontWeight: 600 }}
              itemStyle={{ color: '#0d9488' }}
              formatter={(value) => [value, selectedBiomarker]}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#0d9488"
              strokeWidth={2}
              dot={{ r: 4, fill: '#0d9488', strokeWidth: 2 }}
              activeDot={{ r: 6, fill: '#0d9488' }}
              name={selectedBiomarker}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {chartData.length > 0 && (
        <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-gray-500">Latest</p>
            <p className="font-semibold text-gray-900">{chartData[chartData.length - 1].value} {unit}</p>
            <p className="text-gray-500">{chartData[chartData.length - 1].date}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-gray-500">Min</p>
            <p className="font-semibold text-gray-900">{Math.min(...chartData.map(d => d.value))} {unit}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-gray-500">Max</p>
            <p className="font-semibold text-gray-900">{Math.max(...chartData.map(d => d.value))} {unit}</p>
          </div>
        </div>
      )}
    </div>
  );
}