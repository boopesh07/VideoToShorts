'use client';

import React, { useState } from 'react';
import { VideoProcessingAPI, ProcessVideoResponse } from '../lib/videoProcessingApi';
import LocalVideoPlayer from './LocalVideoPlayer';

export default function TestVideoProcessor() {
  const [videoUrl, setVideoUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ProcessVideoResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Sample Gladia result for testing
  const sampleGladiaResult = {
    "result": {
      "transcription": {
        "utterances": [
          {
            "text": "Welcome everyone to today's amazing tutorial!",
            "start": 5.0,
            "end": 8.5,
            "speaker": 0,
            "confidence": 0.95,
            "words": []
          },
          {
            "text": "In the next few minutes, I'm going to show you something that will completely change your perspective.",
            "start": 8.5,
            "end": 15.0,
            "speaker": 0,
            "confidence": 0.92,
            "words": []
          },
          {
            "text": "This technique has helped thousands of people achieve incredible results.",
            "start": 15.0,
            "end": 20.0,
            "speaker": 0,
            "confidence": 0.88,
            "words": []
          },
          {
            "text": "But first, let me ask you a question that might surprise you.",
            "start": 20.0,
            "end": 24.0,
            "speaker": 0,
            "confidence": 0.90,
            "words": []
          },
          {
            "text": "What if I told you that everything you think you know about this topic is wrong?",
            "start": 24.0,
            "end": 30.0,
            "speaker": 0,
            "confidence": 0.94,
            "words": []
          },
          {
            "text": "Here's the secret that industry experts don't want you to know.",
            "start": 45.0,
            "end": 50.0,
            "speaker": 0,
            "confidence": 0.96,
            "words": []
          },
          {
            "text": "The most successful people use this one simple trick every single day.",
            "start": 50.0,
            "end": 55.0,
            "speaker": 0,
            "confidence": 0.93,
            "words": []
          },
          {
            "text": "And the best part? You can start implementing this right now!",
            "start": 55.0,
            "end": 60.0,
            "speaker": 0,
            "confidence": 0.91,
            "words": []
          },
          {
            "text": "Now, here's what you need to do first...",
            "start": 75.0,
            "end": 78.0,
            "speaker": 0,
            "confidence": 0.89,
            "words": []
          },
          {
            "text": "This is the game-changing moment that will transform everything!",
            "start": 78.0,
            "end": 83.0,
            "speaker": 0,
            "confidence": 0.95,
            "words": []
          }
        ],
        "full_transcript": "Welcome everyone to today's amazing tutorial! In the next few minutes, I'm going to show you something that will completely change your perspective. This technique has helped thousands of people achieve incredible results. But first, let me ask you a question that might surprise you. What if I told you that everything you think you know about this topic is wrong? Here's the secret that industry experts don't want you to know. The most successful people use this one simple trick every single day. And the best part? You can start implementing this right now! Now, here's what you need to do first... This is the game-changing moment that will transform everything!"
      },
      "metadata": {
        "audio_duration": 120.0
      },
      "summarization": {
        "results": "This video reveals a secret technique that challenges conventional wisdom and promises transformative results."
      },
      "chapterization": {
        "results": []
      },
      "named_entity_recognition": {
        "results": []
      },
      "sentiment_analysis": {
        "results": []
      }
    },
    "file": {
      "source": "",
      "filename": "test_video.mp4"
    }
  };

  const handleProcessVideo = async () => {
    if (!videoUrl.trim()) {
      setError('Please enter a video URL');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // Update the sample Gladia result with the actual video URL
      const gladiaResultWithUrl = {
        ...sampleGladiaResult,
        file: {
          ...sampleGladiaResult.file,
          source: videoUrl
        }
      };

      console.log('Processing video with URL:', videoUrl);

      const response = await VideoProcessingAPI.extractSegmentAndProcess(
        videoUrl,
        gladiaResultWithUrl,
        30
      );

      console.log('Processing result:', response);

      if (response.success) {
        setResult(response);
      } else {
        setError(response.error || 'Failed to process video');
      }
    } catch (err) {
      console.error('Processing error:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setError(null);
    setVideoUrl('');
  };

  if (result && result.success) {
    return (
      <div className="space-y-6">
        <LocalVideoPlayer
          videoData={result}
          onPlayAgain={handleReset}
        />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          🎬 Test Video Processor
        </h2>
        <p className="text-gray-600">
          Enter a YouTube URL to extract viral segments and create a compilation video
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label htmlFor="video-url" className="block text-sm font-medium text-gray-700 mb-2">
            YouTube Video URL
          </label>
          <input
            id="video-url"
            type="url"
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading}
          />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <div className="text-red-600 text-xl mr-2">⚠️</div>
              <div>
                <h3 className="text-sm font-medium text-red-900">Error</h3>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        <button
          onClick={handleProcessVideo}
          disabled={loading || !videoUrl.trim()}
          className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
        >
          {loading ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              Processing Video...
            </div>
          ) : (
            '🚀 Process & Download Viral Segments'
          )}
        </button>

        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-semibold text-gray-900 mb-2">How it works:</h3>
          <ol className="text-sm text-gray-700 space-y-1 list-decimal list-inside">
            <li>AI analyzes the video transcript to find the most engaging moments</li>
            <li>Downloads only the specific viral segments using yt-dlp</li>
            <li>Stitches segments together with ffmpeg into a compilation</li>
            <li>Serves the final video for local playback</li>
          </ol>
        </div>

        <div className="bg-blue-50 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">💡 Sample URLs to try:</h3>
          <div className="space-y-1 text-sm">
            <button
              onClick={() => setVideoUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')}
              className="block text-blue-700 hover:text-blue-900 underline"
            >
              Rick Astley - Never Gonna Give You Up
            </button>
            <button
              onClick={() => setVideoUrl('https://www.youtube.com/watch?v=9bZkp7q19f0')}
              className="block text-blue-700 hover:text-blue-900 underline"
            >
              Gangnam Style
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}