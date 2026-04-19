import React, { useState } from 'react';

/**
 * PaymentMethodSelector Component
 * Allows customers to choose payment method: M-Pesa or Cash
 * Integrated into ride request flow
 */
const PaymentMethodSelector = ({ onSelect, estimatedFare = 0 }) => {
  const [selectedMethod, setSelectedMethod] = useState('MPESA');
  const [showDetails, setShowDetails] = useState(false);

  const handleSelect = (method) => {
    setSelectedMethod(method);
    onSelect?.(method);
  };

  return (
    <div className="w-full bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold mb-4 text-gray-900">Payment Method</h3>

      {/* Payment Options */}
      <div className="space-y-3 mb-6">
        {/* M-Pesa Option */}
        <div
          onClick={() => handleSelect('MPESA')}
          className={`p-4 border-2 rounded-lg cursor-pointer transition ${
            selectedMethod === 'MPESA'
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-200 hover:border-gray-300 bg-white'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* M-Pesa Icon */}
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                <span className="text-lg font-bold text-orange-600">M</span>
              </div>
              <div>
                <p className="font-semibold text-gray-900">M-Pesa</p>
                <p className="text-sm text-gray-500">Instant payment via M-Pesa</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                selectedMethod === 'MPESA'
                  ? 'border-blue-500 bg-blue-500'
                  : 'border-gray-300'
              }`}>
                {selectedMethod === 'MPESA' && (
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              <span className="text-xs font-medium text-gray-500">
                {selectedMethod === 'MPESA' ? 'Selected' : 'Select'}
              </span>
            </div>
          </div>
          
          {selectedMethod === 'MPESA' && (
            <div className="mt-3 bg-blue-100 border-l-4 border-blue-500 p-3 rounded">
              <p className="text-sm text-gray-700">
                <strong>How it works:</strong> You'll receive an M-Pesa prompt to enter your PIN. Payment completes instantly.
              </p>
            </div>
          )}
        </div>

        {/* Cash Option */}
        <div
          onClick={() => handleSelect('CASH')}
          className={`p-4 border-2 rounded-lg cursor-pointer transition ${
            selectedMethod === 'CASH'
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-200 hover:border-gray-300 bg-white'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Cash Icon */}
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <span className="text-lg">💵</span>
              </div>
              <div>
                <p className="font-semibold text-gray-900">Cash</p>
                <p className="text-sm text-gray-500">Pay with cash to the driver</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                selectedMethod === 'CASH'
                  ? 'border-blue-500 bg-blue-500'
                  : 'border-gray-300'
              }`}>
                {selectedMethod === 'CASH' && (
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              <span className="text-xs font-medium text-gray-500">
                {selectedMethod === 'CASH' ? 'Selected' : 'Select'}
              </span>
            </div>
          </div>

          {selectedMethod === 'CASH' && (
            <div className="mt-3 bg-blue-100 border-l-4 border-blue-500 p-3 rounded">
              <p className="text-sm text-gray-700">
                <strong>How it works:</strong> Pay the exact fare (KES {estimatedFare.toLocaleString()}) to the driver when you arrive. Driver confirms payment completion.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Fare Breakdown */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="flex justify-between items-center mb-3">
          <span className="text-gray-700">Estimated Fare</span>
          <span className="font-semibold text-gray-900">KES {estimatedFare.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
        </div>
        
        {selectedMethod === 'MPESA' && (
          <>
            <div className="flex justify-between items-center text-sm text-gray-600 mb-2">
              <span>Service Fee</span>
              <span>KES 0.00</span>
            </div>
            <div className="border-t border-gray-300 pt-3 flex justify-between items-center">
              <span className="font-medium">Total</span>
              <span className="font-semibold text-lg text-gray-900">KES {estimatedFare.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
            </div>
          </>
        )}

        {selectedMethod === 'CASH' && (
          <div className="text-sm text-gray-600 mt-2">
            <p>Pay exact amount to driver</p>
          </div>
        )}
      </div>

      {/* Info Messages */}
      {selectedMethod === 'MPESA' && (
        <div className="mt-4 bg-blue-50 border-l-4 border-blue-500 p-3 rounded">
          <p className="text-xs text-blue-900">
            ✓ <strong>Recommended:</strong> Safer and provides automatic receipt
          </p>
        </div>
      )}

      {selectedMethod === 'CASH' && (
        <div className="mt-4 bg-amber-50 border-l-4 border-amber-500 p-3 rounded">
          <p className="text-xs text-amber-900">
            ⚠️ Driver must confirm payment before ride completion
          </p>
        </div>
      )}

      {/* Toggle Details */}
      <button
        onClick={() => setShowDetails(!showDetails)}
        className="mt-4 text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
      >
        {showDetails ? '▼' : '▶'} Payment details
      </button>

      {showDetails && (
        <div className="mt-4 p-4 bg-gray-100 rounded-lg text-sm text-gray-700 space-y-2">
          <p><strong>What's included in the fare:</strong></p>
          <ul className="list-disc list-inside space-y-1 text-xs">
            <li>Base fare (150 KES)</li>
            <li>Distance charge (calculated per km based on vehicle type and fuel consumption)</li>
            <li>Surge pricing (if applicable)</li>
            <li>Driver commission deducted automatically</li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default PaymentMethodSelector;
