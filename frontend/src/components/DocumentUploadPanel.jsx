import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';

/**
 * DocumentUploadPanel - For drivers to upload required documents
 * Documents:
 * - Passport photo
 * - National ID (front/back)
 * - Driver license (front/back)
 * - Vehicle documents
 */
const DocumentUploadPanel = () => {
  const { user, token } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [verificationStatus, setVerificationStatus] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedDocType, setSelectedDocType] = useState('PASSPORT_PHOTO');

  const API_URL = 'http://localhost:8080/api/documents';
  const UPLOAD_URL = 'http://localhost:8080/api/upload'; // Assuming file upload endpoint

  const documentTypes = [
    { value: 'PASSPORT_PHOTO', label: 'Passport Photo' },
    { value: 'ID_FRONT', label: 'National ID - Front' },
    { value: 'ID_BACK', label: 'National ID - Back' },
    { value: 'DRIVER_LICENSE_FRONT', label: 'Driver License - Front' },
    { value: 'DRIVER_LICENSE_BACK', label: 'Driver License - Back' },
    { value: 'CAR_FRONT', label: 'Vehicle - Front Photo' },
    { value: 'CAR_BACK', label: 'Vehicle - Back Photo' },
    { value: 'CAR_INTERIOR', label: 'Vehicle - Interior Photo' },
    { value: 'INSURANCE_STICKER', label: 'Insurance Sticker' },
    { value: 'CHASSIS_NUMBER', label: 'Chassis Number Plate' }
  ];

  useEffect(() => {
    fetchMyDocuments();
    fetchVerificationStatus();
  }, []);

  const fetchMyDocuments = async () => {
    try {
      const response = await fetch(`${API_URL}/my-documents`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setDocuments(data);
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
    }
  };

  const fetchVerificationStatus = async () => {
    try {
      const response = await fetch(`${API_URL}/driver/${user.id}/verification-status`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setVerificationStatus(data);
      }
    } catch (error) {
      console.error('Error fetching verification status:', error);
    }
  };

  const handleFileSelect = (e) => {
    setSelectedFile(e.target.files[0]);
  };

  const handleUpload = async () => {
    if (!selectedFile || !selectedDocType) {
      alert('Please select a file and document type');
      return;
    }

    setUploading(true);

    try {
      // First, upload file to get URL
      const formData = new FormData();
      formData.append('file', selectedFile);

      const uploadResponse = await fetch(UPLOAD_URL, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      if (!uploadResponse.ok) throw new Error('File upload failed');

      const uploadData = await uploadResponse.json();
      const fileUrl = uploadData.fileUrl;
      const filePath = uploadData.filePath;

      // Then, register document in database
      const docResponse = await fetch(`${API_URL}/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          documentType: selectedDocType,
          filePath,
          fileUrl
        })
      });

      if (docResponse.ok) {
        alert('Document uploaded successfully!');
        setSelectedFile(null);
        setSelectedDocType('PASSPORT_PHOTO');
        fetchMyDocuments();
        fetchVerificationStatus();
      } else {
        alert('Failed to register document');
      }
    } catch (error) {
      console.error('Error uploading document:', error);
      alert('Upload failed: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const getStatusBadge = (status) => {
    const colors = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      APPROVED: 'bg-green-100 text-green-800',
      REJECTED: 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6">Document Verification</h2>

      {/* Verification Status */}
      {verificationStatus && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-semibold mb-2">Verification Status</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span>Personal Documents:</span>
              <span className={`px-3 py-1 rounded ${verificationStatus.hasAllPersonalDocuments ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'}`}>
                {verificationStatus.hasAllPersonalDocuments ? '✓ Complete' : '✗ Incomplete'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Vehicle Documents:</span>
              <span className={`px-3 py-1 rounded ${verificationStatus.hasVehicleDocuments ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'}`}>
                {verificationStatus.hasVehicleDocuments ? '✓ Complete' : '✗ Incomplete'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Upload Section */}
      <div className="mb-8 p-6 bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg">
        <h3 className="text-lg font-semibold mb-4">Upload Document</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Document Type
            </label>
            <select
              value={selectedDocType}
              onChange={(e) => setSelectedDocType(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {documentTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select File
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="w-full"
            />
            {selectedFile && (
              <p className="text-sm text-gray-600 mt-2">Selected: {selectedFile.name}</p>
            )}
          </div>

          <button
            onClick={handleUpload}
            disabled={uploading || !selectedFile}
            className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded-lg transition"
          >
            {uploading ? 'Uploading...' : 'Upload Document'}
          </button>
        </div>
      </div>

      {/* Uploaded Documents */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Your Documents</h3>
        
        {documents.length === 0 ? (
          <p className="text-gray-500">No documents uploaded yet.</p>
        ) : (
          <div className="space-y-3">
            {documents.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div>
                  <p className="font-medium">{doc.documentType}</p>
                  <p className="text-sm text-gray-500">
                    Uploaded: {new Date(doc.uploadDate).toLocaleDateString()}
                  </p>
                  {doc.rejectionReason && (
                    <p className="text-sm text-red-600 mt-2">Reason: {doc.rejectionReason}</p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusBadge(doc.status)}`}>
                    {doc.status}
                  </span>
                  {doc.status === 'REJECTED' && (
                    <button
                      onClick={() => {
                        setSelectedDocType(doc.documentType);
                        document.querySelector('input[type="file"]')?.click();
                      }}
                      className="text-blue-500 hover:text-blue-700 text-sm"
                    >
                      Reupload
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentUploadPanel;
