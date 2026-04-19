import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';

/**
 * WalletView Component - Driver earnings and wallet management
 * Shows:
 * - Current balance
 * - Total earnings
 * - Total withdrawn
 * - Withdrawal history
 * - Request withdrawal
 */
const WalletView = () => {
  const { token } = useAuth();
  const [wallet, setWallet] = useState(null);
  const [withdrawalAmount, setWithdrawalAmount] = useState('');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const API_URL = 'http://localhost:8080/api/wallet';

  useEffect(() => {
    fetchWalletDetails();
    // Refresh every 30 seconds
    const interval = setInterval(fetchWalletDetails, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchWalletDetails = async () => {
    try {
      const response = await fetch(`${API_URL}/my-wallet`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setWallet(data);
        setLoading(false);
      }
    } catch (error) {
      console.error('Error fetching wallet:', error);
      setErrorMessage('Failed to load wallet');
    }
  };

  const handleWithdrawal = async (e) => {
    e.preventDefault();
    
    if (!withdrawalAmount || parseFloat(withdrawalAmount) <= 0) {
      setErrorMessage('Please enter a valid amount');
      return;
    }

    if (wallet && parseFloat(withdrawalAmount) > parseFloat(wallet.balance)) {
      setErrorMessage('Insufficient balance');
      return;
    }

    setProcessing(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const response = await fetch(`${API_URL}/withdrawal`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ amount: parseFloat(withdrawalAmount) })
      });

      if (response.ok) {
        const data = await response.json();
        setSuccessMessage(data.message);
        setWithdrawalAmount('');
        fetchWalletDetails();
      } else {
        const error = await response.json();
        setErrorMessage(error.message || 'Withdrawal failed');
      }
    } catch (error) {
      console.error('Error processing withdrawal:', error);
      setErrorMessage('Failed to process withdrawal');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-96">Loading wallet...</div>;
  }

  if (!wallet) {
    return <div className="text-center text-gray-500">Failed to load wallet</div>;
  }

  const balance = parseFloat(wallet.balance);
  const totalEarned = parseFloat(wallet.totalEarned);
  const totalWithdrawn = parseFloat(wallet.totalWithdrawn);

  return (
    <div className="w-full max-w-2xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900">Earnings Wallet</h2>
        <p className="text-gray-600 mt-2">Manage your ride earnings and withdrawals</p>
      </div>

      {/* Status Messages */}
      {successMessage && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 text-green-800 rounded-lg">
          {successMessage}
        </div>
      )}
      {errorMessage && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-800 rounded-lg">
          {errorMessage}
        </div>
      )}

      {/* Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {/* Current Balance */}
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-6 text-white shadow-lg">
          <p className="text-sm opacity-90">Current Balance</p>
          <p className="text-4xl font-bold mt-2">KES {balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
          <p className="text-xs opacity-75 mt-4">Available for withdrawal</p>
        </div>

        {/* Total Earned */}
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-6 text-white shadow-lg">
          <p className="text-sm opacity-90">Total Earned</p>
          <p className="text-4xl font-bold mt-2">KES {totalEarned.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
          <p className="text-xs opacity-75 mt-4">All time earnings</p>
        </div>

        {/* Total Withdrawn */}
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-6 text-white shadow-lg">
          <p className="text-sm opacity-90">Total Withdrawn</p>
          <p className="text-4xl font-bold mt-2">KES {totalWithdrawn.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
          <p className="text-xs opacity-75 mt-4">Withdrawn to account</p>
        </div>
      </div>

      {/* Withdrawal Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8 shadow-sm">
        <h3 className="text-xl font-semibold mb-4">Request Withdrawal</h3>
        
        <form onSubmit={handleWithdrawal} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Withdrawal Amount (KES)
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                step="100"
                min="100"
                max={balance}
                value={withdrawalAmount}
                onChange={(e) => setWithdrawalAmount(e.target.value)}
                placeholder="Enter amount"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={() => setWithdrawalAmount(balance.toString())}
                className="px-4 py-2 text-blue-600 border border-blue-300 rounded-lg hover:bg-blue-50 transition"
              >
                Max
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">Minimum: 100 KES | Available: KES {balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
          </div>

          <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
            <p className="text-sm text-gray-700">
              <strong>Processing time:</strong> 1-2 business days
            </p>
            <p className="text-sm text-gray-700 mt-1">
              <strong>Withdrawal method:</strong> M-Pesa
            </p>
          </div>

          <button
            type="submit"
            disabled={processing || !withdrawalAmount || balance === 0}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 px-4 rounded-lg transition"
          >
            {processing ? 'Processing...' : 'Request Withdrawal'}
          </button>
        </form>
      </div>

      {/* Info Card */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <p className="text-sm text-gray-700">
          <strong className="text-amber-900">Note:</strong> Withdrawals are processed every weekday. Your earnings include commissions after deducting the 20% company fee.
        </p>
      </div>
    </div>
  );
};

export default WalletView;
