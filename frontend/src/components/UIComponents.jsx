/**
 * Reusable UI Components for KituiRides
 * Toast, Modal, Loading States, Badges, Cards
 */

import React, { useState, useEffect } from 'react';

// Toast Notification Component
export function Toast({ message, type = 'info', duration = 3000, onClose }) {
  useEffect(() => {
    if (duration) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const bgColor = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    info: 'bg-blue-500',
    warning: 'bg-yellow-500',
  }[type];

  return (
    <div
      className={`${bgColor} text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2`}
      role="alert"
    >
      <span className="text-lg">
        {type === 'success' && '✓'}
        {type === 'error' && '✕'}
        {type === 'warning' && '⚠'}
        {type === 'info' && 'ℹ'}
      </span>
      {message}
    </div>
  );
}

// Toast Container - for showing multiple toasts
export function ToastContainer({ toasts, removeToast }) {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          duration={toast.duration}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </div>
  );
}

// Loading Spinner Component
export function LoadingSpinner({ size = 'md' }) {
  const sizeClass = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  }[size];

  return (
    <div className="flex justify-center items-center">
      <div
        className={`${sizeClass} border-4 border-teal-100 border-t-teal-600 rounded-full animate-spin`}
      />
    </div>
  );
}

// Skeleton Loader Component
export function Skeleton({ count = 1, className = '' }) {
  return (
    <div className="space-y-4">
      {[...Array(count)].map((_, i) => (
        <div
          key={i}
          className={`bg-gray-200 animate-pulse rounded ${className}`}
          style={{ height: '20px' }}
        />
      ))}
    </div>
  );
}

// Modal Component
export function Modal({ isOpen, title, children, onClose, footer, size = 'md' }) {
  if (!isOpen) return null;

  const maxWidth = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
  }[size];

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black bg-opacity-50">
      <div className={`${maxWidth} w-full mx-4 bg-white rounded-lg shadow-2xl`}>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-xl font-semibold text-gray-800">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
            aria-label="Close modal"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4">{children}</div>

        {/* Footer */}
        {footer && <div className="border-t border-gray-200 px-6 py-4">{footer}</div>}
      </div>
    </div>
  );
}

// Badge Component
export function Badge({ label, variant = 'default', size = 'md' }) {
  const bgColor = {
    default: 'bg-gray-100 text-gray-800',
    success: 'bg-green-100 text-green-800',
    error: 'bg-red-100 text-red-800',
    warning: 'bg-yellow-100 text-yellow-800',
    info: 'bg-blue-100 text-blue-800',
    teal: 'bg-teal-100 text-teal-800',
    orange: 'bg-orange-100 text-orange-800',
  }[variant];

  const sizeClass = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-2 text-base',
  }[size];

  return (
    <span className={`${bgColor} ${sizeClass} rounded-full font-medium inline-block`}>
      {label}
    </span>
  );
}

// Card Component
export function Card({ children, className = '', onClick }) {
  return (
    <div
      className={`bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6 ${className}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {children}
    </div>
  );
}

// User Avatar Component
export function Avatar({ name, size = 'md', className = '' }) {
  const initials = name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase() || 'U';

  const sizeClass = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-lg',
  }[size];

  return (
    <div
      className={`${sizeClass} bg-gradient-to-br from-teal-500 to-teal-700 text-white rounded-full flex items-center justify-center font-bold ${className}`}
    >
      {initials}
    </div>
  );
}

// Button Component
export function Button({
  children,
  variant = 'primary',
  size = 'md',
  type,
  onClick,
  disabled = false,
  loading = false,
  className = '',
}) {
  const baseClass = 'font-semibold rounded-lg transition-colors duration-200 flex items-center gap-2 justify-center';

  const variantClass = {
    primary: 'bg-teal-600 text-white hover:bg-teal-700 disabled:bg-teal-300',
    secondary: 'bg-gray-200 text-gray-800 hover:bg-gray-300 disabled:bg-gray-100',
    danger: 'bg-red-600 text-white hover:bg-red-700 disabled:bg-red-300',
    success: 'bg-green-600 text-white hover:bg-green-700 disabled:bg-green-300',
    orange: 'bg-orange-500 text-white hover:bg-orange-600 disabled:bg-orange-300',
    outline: 'border-2 border-teal-600 text-teal-600 hover:bg-teal-50 disabled:border-teal-300',
  }[variant];

  const sizeClass = {
    sm: 'px-3 py-1 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  }[size];

  return (
    <button
      type={type}
      className={`${baseClass} ${variantClass} ${sizeClass} disabled:cursor-not-allowed ${className}`}
      onClick={onClick}
      disabled={disabled || loading}
    >
      {loading && <LoadingSpinner size="sm" />}
      {children}
    </button>
  );
}

// Input Component
export function Input({
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  error,
  disabled = false,
  required = false,
}) {
  return (
    <div className="mb-4">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600 disabled:bg-gray-100 ${
          error ? 'border-red-500' : 'border-gray-300'
        }`}
      />
      {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
    </div>
  );
}

// Empty State Component
export function EmptyState({ icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="text-6xl mb-4">{icon}</div>
      <h3 className="text-xl font-semibold text-gray-800 mb-2">{title}</h3>
      <p className="text-gray-600 mb-6 max-w-md">{description}</p>
      {action && action}
    </div>
  );
}

// Stat Card Component
export function StatCard({ label, value, icon, trend }) {
  return (
    <Card className="text-center">
      <div className="text-3xl mb-2">{icon}</div>
      <p className="text-gray-600 text-sm mb-2">{label}</p>
      <p className="text-2xl font-bold text-gray-800">{value}</p>
      {trend && <p className={`text-sm mt-2 ${trend.positive ? 'text-green-600' : 'text-red-600'}`}>{trend.text}</p>}
    </Card>
  );
}

// Profile Header Component
export function ProfileHeader({ user }) {
  return (
    <Card className="bg-gradient-to-r from-teal-600 to-teal-700 text-white mb-6">
      <div className="flex items-center gap-4">
        <Avatar name={`${user.firstName} ${user.lastName}`} size="xl" className="border-4 border-white" />
        <div>
          <h1 className="text-3xl font-bold">
            {user.firstName} {user.lastName}
          </h1>
          <p className="text-teal-100">{user.email}</p>
          <Badge label={user.role} variant="info" size="sm" className="mt-2" />
        </div>
      </div>
    </Card>
  );
}
