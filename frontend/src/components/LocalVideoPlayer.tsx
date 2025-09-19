'use client';

import React, { useState, useRef, useEffect } from 'react';

interface ProcessedVideoData {
  success: boolean;
  video_file_path: string;
  segments_info: {
    segments_count: number;
    segments: Array<{
      start_time: number;
      end_time: number;
      reasoning: string;
    }>;
    total_duration: number;
  };
  processing_details: {
    file_size_mb: number;
    segments_downloaded: number;
    analysis_score: number;
  };
}

interface LocalVideoPlayerProps {
  videoData: ProcessedVideoData;
  onPlayAgain?: () => void;
}

export default function LocalVideoPlayer({ videoData, onPlayAgain }: LocalVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { segments_info, processing_details } = videoData;

  // Construct full video URL
  const videoUrl = `http://localhost:8080${videoData.video_file_path}`;

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => {
      setDuration(video.duration);
      setLoading(false);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      setProgress((video.currentTime / video.duration) * 100);
    };

    const handleError = () => {
      setError('Failed to load video. Please try again.');
      setLoading(false);
    };

    const handleCanPlay = () => {
      setLoading(false);
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('error', handleError);
    video.addEventListener('canplay', handleCanPlay);

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('error', handleError);
      video.removeEventListener('canplay', handleCanPlay);
    };
  }, []);

  const handlePlayPause = () => {
    const video = videoRef.current;
    if (!video) return;

    if (playing) {
      video.pause();
    } else {
      video.play();
    }
    setPlaying(!playing);
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const video = videoRef.current;
    if (!video) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    const seekTime = percent * duration;
    video.currentTime = seekTime;
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getEngagementColor = (score: number) => {
    if (score >= 8) return 'text-green-600';
    if (score >= 6) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center mb-4">
          <div className="text-red-600 text-xl">⚠️</div>
          <h3 className="text-lg font-semibold text-red-900 ml-2">Video Loading Error</h3>
        </div>
        <p className="text-red-700 mb-4">{error}</p>
        <button
          onClick={onPlayAgain}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="local-video-player bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Video Player */}
      <div className="relative bg-black">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black">
            <div className="text-white text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mb-4 mx-auto"></div>
              <p>Processing your viral video...</p>
            </div>
          </div>
        )}

        <video
          ref={videoRef}
          className="w-full h-[400px] object-contain"
          controls={false}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
        >
          <source src={videoUrl} type="video/mp4" />
          Your browser does not support the video tag.
        </video>

        {/* Custom Controls Overlay */}
        {!loading && (
          <div className="absolute bottom-4 left-4 right-4">
            <div className="bg-black bg-opacity-75 rounded-lg p-3 text-white">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">🔥 Viral Compilation</span>
                <span className="text-sm">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
              </div>

              {/* Progress Bar */}
              <div
                className="w-full bg-gray-600 rounded-full h-2 cursor-pointer"
                onClick={handleSeek}
              >
                <div
                  className="bg-red-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>

              {/* Control Buttons */}
              <div className="flex items-center justify-center mt-3 space-x-4">
                <button
                  onClick={handlePlayPause}
                  className="bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full p-2 transition-all"
                >
                  {playing ? '⏸️' : '▶️'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Video Information Panel */}
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-gray-900">
            🎯 Your Viral Video ({segments_info.segments_count} segments, {segments_info.total_duration.toFixed(1)}s total)
          </h3>
          <div className="flex gap-2">
            <button
              onClick={handlePlayPause}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              disabled={loading}
            >
              {playing ? '⏸️ Pause' : '▶️ Play'}
            </button>
          </div>
        </div>

        {/* Video Stats - Two Column Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Column - Processing Details */}
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-2">📊 Processing Info</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-700">File Size:</span>
                  <span className="font-medium">{processing_details.file_size_mb} MB</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700">Segments Downloaded:</span>
                  <span className="font-medium">{processing_details.segments_downloaded}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700">AI Score:</span>
                  <span className={`font-bold ${getEngagementColor(processing_details.analysis_score)}`}>
                    {processing_details.analysis_score}/10
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
              <h4 className="font-semibold text-green-900 mb-2">✨ What Makes This Viral</h4>
              <ul className="text-green-800 text-sm space-y-1">
                <li>• AI-selected top engaging moments</li>
                <li>• Optimized for social media platforms</li>
                <li>• Perfect length for maximum retention</li>
                <li>• High-energy segment compilation</li>
              </ul>
            </div>
          </div>

          {/* Right Column - Segments Breakdown */}
          <div className="space-y-4">
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <h4 className="font-semibold text-blue-900 mb-3">🎬 Included Segments</h4>
              <div className="space-y-3 max-h-48 overflow-y-auto">
                {segments_info.segments.map((segment, index) => (
                  <div key={index} className="bg-white rounded-lg p-3 border">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-medium text-blue-900">Segment {index + 1}</span>
                      <span className="text-sm text-gray-600">
                        {formatTime(segment.start_time)} - {formatTime(segment.end_time)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-700">{segment.reasoning}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex flex-wrap gap-3">
          <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
            📱 Share Video
          </button>
          <button className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors">
            ⬇️ Download Video
          </button>
          <button
            onClick={onPlayAgain}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            🔄 Process Another Video
          </button>
        </div>
      </div>
    </div>
  );
}