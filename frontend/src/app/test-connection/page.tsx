'use client';

import { useState } from 'react';
import { apiClient } from '@/lib/api';

export default function TestConnectionPage() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const testConnection = async () => {
    setStatus('loading');
    setError(null);
    setResult(null);

    try {
      const response = await apiClient.testConnection();
      setResult(response);
      setStatus('success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      setStatus('error');
    }
  };

  const testHealthCheck = async () => {
    setStatus('loading');
    setError(null);
    setResult(null);

    try {
      const response = await apiClient.healthCheck();
      setResult(response);
      setStatus('success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      setStatus('error');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6 text-center">
          Frontend-Backend Connection Test
        </h1>

        <div className="space-y-4">
          <button
            onClick={testHealthCheck}
            disabled={status === 'loading'}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-medium py-2 px-4 rounded-md transition-colors"
          >
            {status === 'loading' ? 'Testing...' : 'Test Health Check'}
          </button>

          <button
            onClick={testConnection}
            disabled={status === 'loading'}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white font-medium py-2 px-4 rounded-md transition-colors"
          >
            {status === 'loading' ? 'Testing...' : 'Test API Connection'}
          </button>
        </div>

        {status === 'loading' && (
          <div className="mt-6 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-600">Connecting to backend...</p>
          </div>
        )}

        {status === 'success' && result && (
          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-md">
            <h3 className="text-lg font-medium text-green-800 mb-2">Success!</h3>
            <pre className="text-sm text-green-700 bg-green-100 p-2 rounded overflow-auto">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}

        {status === 'error' && error && (
          <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-md">
            <h3 className="text-lg font-medium text-red-800 mb-2">Error</h3>
            <p className="text-sm text-red-700">{error}</p>
            <p className="text-xs text-red-600 mt-2">
              Make sure the backend is running on port 8080
            </p>
          </div>
        )}

        <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-md">
          <h3 className="text-sm font-medium text-gray-800 mb-2">Connection Info</h3>
          <p className="text-xs text-gray-600">
            Frontend: http://localhost:3000
          </p>
          <p className="text-xs text-gray-600">
            Backend: http://localhost:8080
          </p>
        </div>
      </div>
    </div>
  );
}