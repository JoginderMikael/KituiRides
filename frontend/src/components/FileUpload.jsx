/**
 * @fileoverview UI component module for file upload.
 */
import React, { useState } from 'react';
import { apiClient } from '../lib/apiClient';

export default function FileUpload({ label, onUpload, value, required = false }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await apiClient.post('/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      const data = response.data.data;
      onUpload(data.fileUrl);
    } catch (err) {
      console.error('Upload error:', err);
      if (err.response?.status === 413) {
        setError('File is too large. Please upload a file smaller than 15 MB.');
      } else {
        setError(err.response?.data?.message || 'Failed to upload file');
      }
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="flex items-center space-x-2">
        <input
          type="file"
          onChange={handleFileChange}
          className="hidden"
          id={`file-upload-${label.replace(/\s+/g, '-').toLowerCase()}`}
          disabled={uploading}
          accept="image/*,.pdf"
        />
        <label
          htmlFor={`file-upload-${label.replace(/\s+/g, '-').toLowerCase()}`}
          className={`px-4 py-2 border rounded-lg cursor-pointer flex items-center justify-center transition-colors ${
            uploading ? 'bg-gray-100 text-gray-400 border-gray-200' : 'bg-white text-teal-600 border-teal-600 hover:bg-teal-50'
          }`}
        >
          {uploading ? 'Uploading...' : value ? 'Change File' : 'Choose File'}
        </label>
        {value && (
          <div className="flex items-center space-x-2">
            <span className="text-xs text-green-600 font-medium">✓ Uploaded</span>
            <a href={value} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 underline">View</a>
          </div>
        )}
      </div>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
      <p className="text-xs text-slate-500 mt-1">Accepted formats: images or PDF, up to 15 MB.</p>
    </div>
  );
}
