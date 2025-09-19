'use client';

import { useState } from 'react';
import ViralSegmentPlayer from './ViralSegmentPlayer';
import { testWithLocalData } from '@/lib/videoProcessing';

export default function TestViralSegment() {
  const [segmentData, setSegmentData] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleTest = async () => {
    setLoading(true);
    try {
      const data = await testWithLocalData();
      setSegmentData(data);
    } catch (error) {
      console.error('Test failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSegmentData(null);
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-zinc-100 mb-4">
          🧪 Test Viral Segment Player
        </h2>
        {!segmentData && (
          <button
            onClick={handleTest}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-3 text-sm font-medium text-white transition-all duration-200 hover:from-purple-700 hover:to-pink-700 hover:scale-105 shadow-lg disabled:opacity-50"
          >
            {loading ? '🔍 Loading...' : '🎯 Test with Sam Altman Video'}
          </button>
        )}
      </div>

      {segmentData && (
        <ViralSegmentPlayer
          segmentData={segmentData}
          onPlayAgain={handleReset}
        />
      )}
    </div>
  );
}