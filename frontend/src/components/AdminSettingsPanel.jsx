import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';

/**
 * AdminSettingsPanel Component
 * Allows admins to configure:
 * - Base fare
 * - Fuel cost
 * - Driver markup
 * - Commission rate
 */
const AdminSettingsPanel = () => {
  const { token } = useAuth();
  const [settings, setSettings] = useState({});
  const [editingKey, setEditingKey] = useState(null);
  const [editingValue, setEditingValue] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const API_URL = 'http://localhost:8080/api/admin/settings';

  const settingDescriptions = {
    BASE_FARE: 'Base fare charged for every ride (in KES)',
    FUEL_COST_PER_LITER: 'Current market fuel cost per liter (in KES)',
    DRIVER_MARKUP: 'Driver margin multiplier (e.g., 1.5 = 150%)',
    COMPANY_COMMISSION_RATE: 'Commission rate on each ride (e.g., 0.20 = 20%)',
    MOTORCYCLE_FUEL_ECONOMY: 'Fuel economy for motorcycles (in km/liter)'
  };

  const settingUnits = {
    BASE_FARE: 'KES',
    FUEL_COST_PER_LITER: 'KES/L',
    DRIVER_MARKUP: 'x',
    COMPANY_COMMISSION_RATE: '%',
    MOTORCYCLE_FUEL_ECONOMY: 'km/L'
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch(`${API_URL}/pricing/summary`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
        setLoading(false);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      setErrorMessage('Failed to load settings');
    }
  };

  const handleEdit = (key, value) => {
    setEditingKey(key);
    setEditingValue(value);
  };

  const handleSave = async (key) => {
    setSaving(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const response = await fetch(`${API_URL}/${key}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ value: editingValue })
      });

      if (response.ok) {
        setSuccessMessage(`✓ ${key} updated successfully`);
        setSettings({ ...settings, [key]: editingValue });
        setEditingKey(null);
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        setErrorMessage('Failed to save setting');
      }
    } catch (error) {
      console.error('Error saving setting:', error);
      setErrorMessage('Error updating setting');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async (key) => {
    if (!window.confirm(`Reset ${key} to default value?`)) return;

    setSaving(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const response = await fetch(`${API_URL}/${key}/reset`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setSuccessMessage(`✓ ${key} reset to default`);
        setSettings({ ...settings, [key]: data.configValue });
        setEditingKey(null);
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        setErrorMessage('Failed to reset setting');
      }
    } catch (error) {
      console.error('Error resetting setting:', error);
      setErrorMessage('Error resetting setting');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-96">Loading settings...</div>;
  }

  return (
    <div className="w-full max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900">Configuration Settings</h2>
        <p className="text-gray-600 mt-2">Manage pricing and platform configuration</p>
      </div>

      {/* Status Messages */}
      {successMessage && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 text-green-800 rounded-lg animate-pulse">
          {successMessage}
        </div>
      )}
      {errorMessage && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-800 rounded-lg">
          {errorMessage}
        </div>
      )}

      {/* Settings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {Object.entries(settings).map(([key, value]) => (
          <div key={key} className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm hover:shadow-md transition">
            <div className="mb-4">
              <h3 className="font-semibold text-gray-900 text-lg">{key}</h3>
              <p className="text-sm text-gray-600 mt-1">{settingDescriptions[key]}</p>
            </div>

            {editingKey === key ? (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <input
                    type="number"
                    step="0.01"
                    value={editingValue}
                    onChange={(e) => setEditingValue(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="flex items-center px-3 bg-gray-100 text-gray-700 rounded-lg font-medium">
                    {settingUnits[key]}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleSave(key)}
                    disabled={saving}
                    className="flex-1 bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white font-medium py-2 px-3 rounded-lg transition"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditingKey(null)}
                    className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-900 font-medium py-2 px-3 rounded-lg transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-gray-600">Current Value</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {value} <span className="text-base text-gray-600 font-normal">{settingUnits[key]}</span>
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(key, value)}
                    className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-3 rounded-lg transition"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleReset(key)}
                    className="px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                  >
                    Reset
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Info Section */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h4 className="font-semibold text-blue-900 mb-3">Price Calculation Formula</h4>
        <p className="text-sm text-blue-900 font-mono bg-white p-3 rounded border border-blue-200 mb-3">
          P = (BASE_FARE + (Distance/FuelEconomy × FuelCost × (1 + DriverMarkup))) / (1 - CommissionRate)
        </p>
        <p className="text-sm text-blue-900">
          <strong>Impact:</strong> Changes to these settings immediately affect all new ride price calculations.
        </p>
      </div>

      {/* Warning */}
      <div className="mt-6 bg-amber-50 border border-amber-200 rounded-lg p-4">
        <p className="text-sm text-amber-900">
          <strong>⚠️ Warning:</strong> Be careful when modifying these settings as they directly impact pricing for all rides. Changes take effect immediately.
        </p>
      </div>
    </div>
  );
};

export default AdminSettingsPanel;
