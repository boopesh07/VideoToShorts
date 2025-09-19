'use client';

import { useEffect, useRef, useState } from 'react';
import ReactPlayer from 'react-player';

interface SegmentData {
  success: boolean;
  video_info: {
    url: string;
    title: string;
    total_duration: number;
  };
  extracted_segment: {
    start_time: number;
    end_time: number;
    duration: number;
    text: string;
    reasoning: string;
  };
  analysis: {
    engagement_score: number;
    viral_potential: string;
    key_moment?: {
      timestamp: number;
      description: string;
    };
  };
  playback_config: {
    start_seconds: number;
    end_seconds: number;
    autoplay: boolean;
    controls: boolean;
    loop: boolean;
  };
}

interface ViralSegmentPlayerProps {
  segmentData: SegmentData;
  onPlayAgain?: () => void;
}

export default function ViralSegmentPlayer({ segmentData, onPlayAgain }: ViralSegmentPlayerProps) {
  const playerRef = useRef<ReactPlayer>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState('');

  const { video_info, extracted_segment, analysis, playback_config } = segmentData;

  // Auto-start at the specified timestamp
  useEffect(() => {
    if (playerRef.current && playback_config.start_seconds && !hasStarted) {
      const timer = setTimeout(() => {
        // Check if the player and seekTo method are available
        if (playerRef.current && typeof playerRef.current.seekTo === 'function') {
          console.log(`Seeking to: ${playback_config.start_seconds} seconds`);
          playerRef.current.seekTo(playback_config.start_seconds, 'seconds');
          setPlaying(playback_config.autoplay);
          setHasStarted(true);
        } else {
          console.log('Player not ready yet, retrying...');
          // Retry after a short delay if player isn't ready
          setTimeout(() => {
            if (playerRef.current && typeof playerRef.current.seekTo === 'function') {
              playerRef.current.seekTo(playback_config.start_seconds, 'seconds');
              setPlaying(playback_config.autoplay);
              setHasStarted(true);
            }
          }, 1000);
        }
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [segmentData, hasStarted]);

  // Handle progress and auto-stop at end time
  const handleProgress = ({ playedSeconds }: { playedSeconds: number }) => {
    setCurrentTime(playedSeconds);

    // Calculate progress within the segment
    const segmentProgress =
      ((playedSeconds - playback_config.start_seconds) /
        (playback_config.end_seconds - playback_config.start_seconds)) * 100;

    setProgress(Math.max(0, Math.min(100, segmentProgress)));

    // Stop at end time
    if (playedSeconds >= playback_config.end_seconds) {
      setPlaying(false);

      // Optionally loop back to start
      if (playback_config.loop) {
        setTimeout(() => {
          playerRef.current?.seekTo(playback_config.start_seconds, 'seconds');
          setPlaying(true);
        }, 500);
      }
    }
  };

  const handlePlayPause = () => {
    if (!playing && currentTime >= playback_config.end_seconds) {
      // If ended, restart from beginning
      playerRef.current?.seekTo(playback_config.start_seconds, 'seconds');
    }
    setPlaying(!playing);
  };

  const handleReplay = () => {
    playerRef.current?.seekTo(playback_config.start_seconds, 'seconds');
    setPlaying(true);
    setProgress(0);
  };

  const handlePlayerReady = () => {
    console.log('Player ready, seeking to start time...');
    if (playback_config.start_seconds > 0) {
      setTimeout(() => {
        if (playerRef.current && typeof playerRef.current.seekTo === 'function') {
          playerRef.current.seekTo(playback_config.start_seconds, 'seconds');
          setPlaying(playback_config.autoplay);
          setHasStarted(true);
        }
      }, 500);
    }
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

  const getViralPotentialColor = (potential: string) => {
    if (potential.toLowerCase().includes('high')) return 'bg-green-100 text-green-800';
    if (potential.toLowerCase().includes('medium')) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const handleDownloadVideo = async () => {
    setIsDownloading(true);
    setDownloadProgress('Preparing download...');

    try {
      // First, test the connection
      setDownloadProgress('Testing backend connection...');
      console.log('Testing backend connection...');

      const testResponse = await fetch('http://localhost:8080/api/test', {
        method: 'GET',
      });

      console.log('Test response status:', testResponse.status);

      if (!testResponse.ok) {
        throw new Error(`Backend connection failed: ${testResponse.status}`);
      }

      const testData = await testResponse.json();
      console.log('Backend connection successful:', testData);

      // Create segments array with the current segment data
      const segments = [
        {
          start_time: extracted_segment.start_time,
          end_time: extracted_segment.end_time,
          reasoning: extracted_segment.reasoning || 'Selected viral segment'
        }
      ];

      // Create the request payload for processing video segments
      const requestData = {
        video_url: video_info.url,
        segments: segments,
        target_duration: extracted_segment.duration
      };

      console.log('Request data:', requestData);

      // First test with the test endpoint
      setDownloadProgress('Testing download endpoint...');

      const testDownloadResponse = await fetch('http://localhost:8080/api/test-download', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      console.log('Test download response status:', testDownloadResponse.status);

      if (!testDownloadResponse.ok) {
        const errorData = await testDownloadResponse.text();
        console.error('Test download failed:', errorData);
        throw new Error(`Test download failed: ${testDownloadResponse.status} - ${errorData}`);
      }

      const testDownloadData = await testDownloadResponse.json();
      console.log('Test download successful:', testDownloadData);

      // Now try the actual download
      setDownloadProgress('Starting video processing...');

      const response = await fetch('http://localhost:8080/process-video-segments-direct', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      console.log('Actual download response status:', response.status);

      if (!response.ok) {
        const errorData = await response.text();
        console.error('Download failed:', errorData);
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorData}`);
      }

      const result = await response.json();
      console.log('Download result:', result);

      if (result.success && result.video_file_path) {
        setDownloadProgress('Processing complete! Starting download...');

        // Trigger download of the processed video
        const downloadUrl = `http://localhost:8080${result.video_file_path}`;
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = `viral_segment_${Date.now()}.mp4`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        setDownloadProgress('Download complete!');
        setTimeout(() => {
          setDownloadProgress('');
          setIsDownloading(false);
        }, 2000);
      } else {
        throw new Error(result.error || 'Failed to process video');
      }
    } catch (error) {
      console.error('Download error:', error);
      setDownloadProgress(`Download failed: ${error.message}`);
      setTimeout(() => {
        setDownloadProgress('');
        setIsDownloading(false);
      }, 5000);
    }
  };

  return (
    <div className="viral-segment-player bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Video Player */}
      <div className="relative bg-black">
        <ReactPlayer
          ref={playerRef}
          url={video_info.url}
          playing={playing}
          controls={playback_config.controls}
          onProgress={handleProgress}
          onReady={handlePlayerReady}
          width="100%"
          height="400px"
          config={{
            youtube: {
              playerVars: {
                start: Math.floor(playback_config.start_seconds),
                end: Math.floor(playback_config.end_seconds),
                showinfo: 0,
                modestbranding: 1,
                rel: 0,
              }
            }
          }}
        />

        {/* Segment Progress Overlay */}
        <div className="absolute bottom-4 left-4 right-4">
          <div className="bg-black bg-opacity-75 rounded-lg p-3 text-white">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">🎯 Viral Segment</span>
              <span className="text-sm">
                {formatTime(currentTime)} / {formatTime(playback_config.end_seconds)}
              </span>
            </div>
            <div className="w-full bg-gray-600 rounded-full h-2">
              <div
                className="bg-red-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Control Panel */}
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-gray-900">
            🔥 Your Viral Moment ({extracted_segment.duration.toFixed(1)}s)
          </h3>
          <div className="flex gap-2">
            <button
              onClick={handlePlayPause}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              {playing ? '⏸️ Pause' : '▶️ Play'}
            </button>
            <button
              onClick={handleReplay}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              🔄 Replay
            </button>
          </div>
        </div>

        {/* Segment Info - Two Column Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Column - Segment Details */}
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-2">⏰ Timing</h4>
              <p className="text-gray-700">
                {formatTime(playback_config.start_seconds)} - {formatTime(playback_config.end_seconds)}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                From original {formatTime(video_info.total_duration)} video
              </p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-2">📊 Analysis</h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">Engagement Score:</span>
                  <span className={`font-bold ${getEngagementColor(analysis.engagement_score)}`}>
                    {analysis.engagement_score}/10
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">Viral Potential:</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getViralPotentialColor(analysis.viral_potential)}`}>
                    {analysis.viral_potential}
                  </span>
                </div>
              </div>
            </div>

            {analysis.key_moment && (
              <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                <h4 className="font-semibold text-yellow-900 mb-2">⭐ Key Moment</h4>
                <p className="text-sm text-yellow-800 mb-1">
                  At {formatTime(analysis.key_moment.timestamp)}:
                </p>
                <p className="text-yellow-900">{analysis.key_moment.description}</p>
              </div>
            )}
          </div>

          {/* Right Column - Transcript */}
          <div className="space-y-4">
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <h4 className="font-semibold text-blue-900 mb-3">📝 Transcript</h4>
              <div className="bg-white rounded-lg p-3 border max-h-48 overflow-y-auto">
                <p className="text-gray-800 leading-relaxed">{extracted_segment.text}</p>
              </div>
            </div>

            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
              <h4 className="font-semibold text-green-900 mb-2">🧠 Why This Segment?</h4>
              <p className="text-green-800 text-sm leading-relaxed">
                {extracted_segment.reasoning}
              </p>
            </div>
          </div>
        </div>

        {/* Download Progress */}
        {isDownloading && downloadProgress && (
          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span className="text-blue-800 font-medium">{downloadProgress}</span>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-6 flex flex-wrap gap-3">
          <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
            📱 Share Segment
          </button>
          <button
            onClick={handleDownloadVideo}
            disabled={isDownloading}
            className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {isDownloading ? '🔄 Processing...' : '⬇️ Download Video'}
          </button>
          <button
            onClick={onPlayAgain}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            🔄 Try Another Video
          </button>
        </div>
      </div>
    </div>
  );
}
'use client';


interface SegmentData {
  success: boolean;
  video_info: {
    url: string;
    title: string;
    total_duration: number;
  };
  extracted_segment: {
    start_time: number;
    end_time: number;
    duration: number;
    text: string;
    reasoning: string;
  };
  analysis: {
    engagement_score: number;
    viral_potential: string;
    key_moment?: {
      timestamp: number;
      description: string;
    };
  };
  playback_config: {
    start_seconds: number;
    end_seconds: number;
    autoplay: boolean;
    controls: boolean;
    loop: boolean;
  };
}

interface ViralSegmentPlayerProps {
  segmentData: SegmentData;
  onPlayAgain?: () => void;
}

export default function ViralSegmentPlayer({ segmentData, onPlayAgain }: ViralSegmentPlayerProps) {
  const playerRef = useRef<ReactPlayer>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState('');

  const { video_info, extracted_segment, analysis, playback_config } = segmentData;

  // Auto-start at the specified timestamp
  useEffect(() => {
    if (playerRef.current && playback_config.start_seconds && !hasStarted) {
      const timer = setTimeout(() => {
        // Check if the player and seekTo method are available
        if (playerRef.current && typeof playerRef.current.seekTo === 'function') {
          console.log(`Seeking to: ${playback_config.start_seconds} seconds`);
          playerRef.current.seekTo(playback_config.start_seconds, 'seconds');
          setPlaying(playback_config.autoplay);
          setHasStarted(true);
        } else {
          console.log('Player not ready yet, retrying...');
          // Retry after a short delay if player isn't ready
          setTimeout(() => {
            if (playerRef.current && typeof playerRef.current.seekTo === 'function') {
              playerRef.current.seekTo(playback_config.start_seconds, 'seconds');
              setPlaying(playback_config.autoplay);
              setHasStarted(true);
            }
          }, 1000);
        }
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [segmentData, hasStarted]);

  // Handle progress and auto-stop at end time
  const handleProgress = ({ playedSeconds }: { playedSeconds: number }) => {
    setCurrentTime(playedSeconds);

    // Calculate progress within the segment
    const segmentProgress =
      ((playedSeconds - playback_config.start_seconds) /
        (playback_config.end_seconds - playback_config.start_seconds)) * 100;

    setProgress(Math.max(0, Math.min(100, segmentProgress)));

    // Stop at end time
    if (playedSeconds >= playback_config.end_seconds) {
      setPlaying(false);

      // Optionally loop back to start
      if (playback_config.loop) {
        setTimeout(() => {
          playerRef.current?.seekTo(playback_config.start_seconds, 'seconds');
          setPlaying(true);
        }, 500);
      }
    }
  };

  const handlePlayPause = () => {
    if (!playing && currentTime >= playback_config.end_seconds) {
      // If ended, restart from beginning
      playerRef.current?.seekTo(playback_config.start_seconds, 'seconds');
    }
    setPlaying(!playing);
  };

  const handleReplay = () => {
    playerRef.current?.seekTo(playback_config.start_seconds, 'seconds');
    setPlaying(true);
    setProgress(0);
  };

  const handlePlayerReady = () => {
    console.log('Player ready, seeking to start time...');
    if (playback_config.start_seconds > 0) {
      setTimeout(() => {
        if (playerRef.current && typeof playerRef.current.seekTo === 'function') {
          playerRef.current.seekTo(playback_config.start_seconds, 'seconds');
          setPlaying(playback_config.autoplay);
          setHasStarted(true);
        }
      }, 500);
    }
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

  const getViralPotentialColor = (potential: string) => {
    if (potential.toLowerCase().includes('high')) return 'bg-green-100 text-green-800';
    if (potential.toLowerCase().includes('medium')) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const handleDownloadVideo = async () => {
    setIsDownloading(true);
    setDownloadProgress('Preparing download...');

    try {
      // First, test the connection
      setDownloadProgress('Testing backend connection...');
      console.log('Testing backend connection...');

      const testResponse = await fetch('http://localhost:8080/api/test', {
        method: 'GET',
      });

      console.log('Test response status:', testResponse.status);

      if (!testResponse.ok) {
        throw new Error(`Backend connection failed: ${testResponse.status}`);
      }

      const testData = await testResponse.json();
      console.log('Backend connection successful:', testData);

      // Create segments array with the current segment data
      const segments = [
        {
          start_time: extracted_segment.start_time,
          end_time: extracted_segment.end_time,
          reasoning: extracted_segment.reasoning || 'Selected viral segment'
        }
      ];

      // Create the request payload for processing video segments
      const requestData = {
        video_url: video_info.url,
        segments: segments,
        target_duration: extracted_segment.duration
      };

      console.log('Request data:', requestData);

      // First test with the test endpoint
      setDownloadProgress('Testing download endpoint...');

      const testDownloadResponse = await fetch('http://localhost:8080/api/test-download', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      console.log('Test download response status:', testDownloadResponse.status);

      if (!testDownloadResponse.ok) {
        const errorData = await testDownloadResponse.text();
        console.error('Test download failed:', errorData);
        throw new Error(`Test download failed: ${testDownloadResponse.status} - ${errorData}`);
      }

      const testDownloadData = await testDownloadResponse.json();
      console.log('Test download successful:', testDownloadData);

      // Now try the actual download
      setDownloadProgress('Starting video processing...');

      const response = await fetch('http://localhost:8080/process-video-segments-direct', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      console.log('Actual download response status:', response.status);

      if (!response.ok) {
        const errorData = await response.text();
        console.error('Download failed:', errorData);
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorData}`);
      }

      const result = await response.json();
      console.log('Download result:', result);

      if (result.success && result.video_file_path) {
        setDownloadProgress('Processing complete! Starting download...');

        // Trigger download of the processed video
        const downloadUrl = `http://localhost:8080${result.video_file_path}`;
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = `viral_segment_${Date.now()}.mp4`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        setDownloadProgress('Download complete!');
        setTimeout(() => {
          setDownloadProgress('');
          setIsDownloading(false);
        }, 2000);
      } else {
        throw new Error(result.error || 'Failed to process video');
      }
    } catch (error) {
      console.error('Download error:', error);
      setDownloadProgress(`Download failed: ${error.message}`);
      setTimeout(() => {
        setDownloadProgress('');
        setIsDownloading(false);
      }, 5000);
    }
  };

  return (
    <div className="viral-segment-player bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Video Player */}
      <div className="relative bg-black">
        <ReactPlayer
          ref={playerRef}
          url={video_info.url}
          playing={playing}
          controls={playback_config.controls}
          onProgress={handleProgress}
          onReady={handlePlayerReady}
          width="100%"
          height="400px"
          config={{
            youtube: {
              playerVars: {
                start: Math.floor(playback_config.start_seconds),
                end: Math.floor(playback_config.end_seconds),
                showinfo: 0,
                modestbranding: 1,
                rel: 0,
              }
            }
          }}
        />

        {/* Segment Progress Overlay */}
        <div className="absolute bottom-4 left-4 right-4">
          <div className="bg-black bg-opacity-75 rounded-lg p-3 text-white">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">🎯 Viral Segment</span>
              <span className="text-sm">
                {formatTime(currentTime)} / {formatTime(playback_config.end_seconds)}
              </span>
            </div>
            <div className="w-full bg-gray-600 rounded-full h-2">
              <div
                className="bg-red-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Control Panel */}
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-gray-900">
            🔥 Your Viral Moment ({extracted_segment.duration.toFixed(1)}s)
          </h3>
          <div className="flex gap-2">
            <button
              onClick={handlePlayPause}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              {playing ? '⏸️ Pause' : '▶️ Play'}
            </button>
            <button
              onClick={handleReplay}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              🔄 Replay
            </button>
          </div>
        </div>

        {/* Segment Info - Two Column Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Column - Segment Details */}
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-2">⏰ Timing</h4>
              <p className="text-gray-700">
                {formatTime(playback_config.start_seconds)} - {formatTime(playback_config.end_seconds)}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                From original {formatTime(video_info.total_duration)} video
              </p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-2">📊 Analysis</h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">Engagement Score:</span>
                  <span className={`font-bold ${getEngagementColor(analysis.engagement_score)}`}>
                    {analysis.engagement_score}/10
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">Viral Potential:</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getViralPotentialColor(analysis.viral_potential)}`}>
                    {analysis.viral_potential}
                  </span>
                </div>
              </div>
            </div>

            {analysis.key_moment && (
              <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                <h4 className="font-semibold text-yellow-900 mb-2">⭐ Key Moment</h4>
                <p className="text-sm text-yellow-800 mb-1">
                  At {formatTime(analysis.key_moment.timestamp)}:
                </p>
                <p className="text-yellow-900">{analysis.key_moment.description}</p>
              </div>
            )}
          </div>

          {/* Right Column - Transcript */}
          <div className="space-y-4">
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <h4 className="font-semibold text-blue-900 mb-3">📝 Transcript</h4>
              <div className="bg-white rounded-lg p-3 border max-h-48 overflow-y-auto">
                <p className="text-gray-800 leading-relaxed">{extracted_segment.text}</p>
              </div>
            </div>

            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
              <h4 className="font-semibold text-green-900 mb-2">🧠 Why This Segment?</h4>
              <p className="text-green-800 text-sm leading-relaxed">
                {extracted_segment.reasoning}
              </p>
            </div>
          </div>
        </div>

        {/* Download Progress */}
        {isDownloading && downloadProgress && (
          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span className="text-blue-800 font-medium">{downloadProgress}</span>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-6 flex flex-wrap gap-3">
          <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
            📱 Share Segment
          </button>
          <button
            onClick={handleDownloadVideo}
            disabled={isDownloading}
            className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {isDownloading ? '🔄 Processing...' : '⬇️ Download Video'}
          </button>
          <button
            onClick={onPlayAgain}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            🔄 Try Another Video
          </button>
        </div>
      </div>
    </div>
  );
}