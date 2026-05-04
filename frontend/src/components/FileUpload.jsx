/**
 * @fileoverview UI component module for file upload.
 */
import React, { useState } from 'react';
import { apiClient } from '../lib/apiClient';

export default function FileUpload({ label, onUpload, value, required = false, compact = false }) {
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
    <div className={compact ? "" : "mb-4"}>
      {!compact && (
        <label className="mb-1 block text-sm font-medium text-gray-700">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <div className={compact ? "flex flex-wrap items-center gap-2" : "flex items-center space-x-2"}>
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
          className={`flex h-10 cursor-pointer items-center justify-center rounded-lg border px-4 text-sm font-semibold transition-colors ${
            uploading ? 'border-gray-200 bg-gray-100 text-gray-400' : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
          }`}
        >
          {uploading ? 'Uploading...' : value ? 'Change File' : 'Choose File'}
        </label>
        {value && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-emerald-600">Uploaded</span>
            <a href={value} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-slate-500 underline">View</a>
          </div>
        )}
      </div>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
      {!compact && <p className="mt-1 text-xs text-slate-500">Accepted formats: images or PDF, up to 15 MB.</p>}
    </div>
  );
}
