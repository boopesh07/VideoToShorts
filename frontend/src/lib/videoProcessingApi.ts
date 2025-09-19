interface ProcessVideoRequest {
  video_url: string;
  gladia_result: any;
  target_duration?: number;
}

interface ProcessVideoResponse {
  success: boolean;
  video_file_path?: string;
  segments_info?: {
    segments_count: number;
    segments: Array<{
      start_time: number;
      end_time: number;
      reasoning: string;
    }>;
    total_duration: number;
  };
  processing_details?: {
    file_size_mb: number;
    segments_downloaded: number;
    analysis_score: number;
    local_file_path?: string;
  };
  error?: string;
}

interface VideoInfo {
  title: string;
  duration: number;
  uploader: string;
  view_count: number;
  format_info: string;
}

const API_BASE = 'http://localhost:8080';

export class VideoProcessingAPI {
  static async processVideoSegments(request: ProcessVideoRequest): Promise<ProcessVideoResponse> {
    try {
      const response = await fetch(`${API_BASE}/process-video-segments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to process video segments');
      }

      return await response.json();
    } catch (error) {
      console.error('Error processing video segments:', error);
      throw error;
    }
  }

  static async getVideoInfo(videoId: string): Promise<VideoInfo> {
    try {
      const response = await fetch(`${API_BASE}/video-info/${videoId}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to get video info');
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting video info:', error);
      throw error;
    }
  }

  static extractVideoId(url: string): string | null {
    // YouTube URL patterns
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /youtube\.com\/watch\?.*v=([^&\n?#]+)/
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return match[1];
      }
    }

    return null;
  }

  static constructYouTubeUrl(videoId: string): string {
    return `https://www.youtube.com/watch?v=${videoId}`;
  }

  static async extractSegmentAndProcess(
    videoUrl: string,
    gladiaResult: any,
    targetDuration: number = 30
  ): Promise<ProcessVideoResponse> {
    const request: ProcessVideoRequest = {
      video_url: videoUrl,
      gladia_result: gladiaResult,
      target_duration: targetDuration,
    };

    return this.processVideoSegments(request);
  }
}

// Type exports for use in components
export type {
  ProcessVideoRequest,
  ProcessVideoResponse,
  VideoInfo
};