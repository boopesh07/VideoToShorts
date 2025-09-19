"""
Video Downloader Module
Handles downloading video segments using yt-dlp and processing with ffmpeg
"""

import os
import subprocess
import tempfile
import shutil
import time
from typing import List, Dict, Any, Optional, Tuple
import logging
from pathlib import Path
import ffmpeg

logger = logging.getLogger(__name__)

class VideoDownloader:
    """Handles video downloading and segment processing"""

    def __init__(self, temp_dir: Optional[str] = None, output_dir: Optional[str] = None):
        """Initialize VideoDownloader with temporary directory"""
        self.temp_dir = temp_dir or tempfile.mkdtemp(prefix="video_shorts_")
        self.downloads_dir = os.path.join(self.temp_dir, "downloads")
        self.segments_dir = os.path.join(self.temp_dir, "segments")

        # Use persistent output directory for serving files
        if output_dir:
            self.output_dir = output_dir
        else:
            # Default to videos directory in backend
            backend_dir = os.path.dirname(os.path.abspath(__file__))
            self.output_dir = os.path.join(backend_dir, "videos")

        os.makedirs(self.output_dir, exist_ok=True)

        # Create directories
        os.makedirs(self.downloads_dir, exist_ok=True)
        os.makedirs(self.segments_dir, exist_ok=True)
        os.makedirs(self.output_dir, exist_ok=True)

        logger.info(f"VideoDownloader initialized with temp dir: {self.temp_dir}")

    def format_time(self, seconds: float) -> str:
        """Convert seconds to MM:SS format for yt-dlp"""
        minutes = int(seconds // 60)
        secs = int(seconds % 60)
        return f"{minutes:02d}:{secs:02d}"

    def download_video_segments(self, video_url: str, segments: List[Dict[str, Any]]) -> List[str]:
        """
        Download specific segments from a video using yt-dlp

        Args:
            video_url: URL of the video to download
            segments: List of segment dictionaries with start_time and end_time

        Returns:
            List of paths to downloaded segment files
        """
        downloaded_files = []

        try:
            # Get video info first
            info_cmd = ["yt-dlp", "--dump-json", "--no-warnings", video_url]
            result = subprocess.run(info_cmd, capture_output=True, text=True, check=True)
            video_info = result.stdout.strip()

            logger.info(f"Downloading {len(segments)} segments from {video_url}")

            for i, segment in enumerate(segments):
                start_time = segment.get('start_time', 0)
                end_time = segment.get('end_time', 30)

                # Format timestamps for yt-dlp
                start_formatted = self.format_time(start_time)
                end_formatted = self.format_time(end_time)
                section_spec = f"*{start_formatted}-{end_formatted}"

                # Output filename with segment index
                output_template = os.path.join(
                    self.segments_dir,
                    f"segment_{i+1:02d}_%(title)s.%(ext)s"
                )

                # yt-dlp command with section download
                cmd = [
                    "yt-dlp",
                    "--download-sections", section_spec,
                    "--force-keyframes-at-cuts",
                    "--format", "best[height<=720]",  # Limit to 720p for faster processing
                    "--output", output_template,
                    "--no-warnings",
                    video_url
                ]

                logger.info(f"Downloading segment {i+1}: {start_formatted}-{end_formatted}")
                logger.debug(f"Command: {' '.join(cmd)}")

                # Execute download
                result = subprocess.run(cmd, capture_output=True, text=True)

                if result.returncode == 0:
                    # Find the downloaded file
                    segment_files = list(Path(self.segments_dir).glob(f"segment_{i+1:02d}_*"))
                    if segment_files:
                        downloaded_file = str(segment_files[0])
                        downloaded_files.append(downloaded_file)
                        logger.info(f"Successfully downloaded segment {i+1}: {downloaded_file}")
                    else:
                        logger.error(f"Could not find downloaded file for segment {i+1}")
                else:
                    logger.error(f"Failed to download segment {i+1}: {result.stderr}")

        except subprocess.CalledProcessError as e:
            logger.error(f"yt-dlp command failed: {e}")
            raise RuntimeError(f"Failed to download video segments: {e}")
        except Exception as e:
            logger.error(f"Unexpected error downloading segments: {e}")
            raise RuntimeError(f"Unexpected error: {e}")

        return downloaded_files

    def stitch_segments(self, segment_files: List[str], output_filename: str = "viral_compilation.mp4") -> str:
        """
        Stitch multiple video segments together using ffmpeg

        Args:
            segment_files: List of paths to video segment files
            output_filename: Name of the output file

        Returns:
            Path to the stitched video file
        """
        if not segment_files:
            raise ValueError("No segment files provided for stitching")

        output_path = os.path.join(self.output_dir, output_filename)

        try:
            logger.info(f"Stitching {len(segment_files)} segments into {output_filename}")

            if len(segment_files) == 1:
                # Single segment, just copy/convert
                logger.info("Single segment, copying file")
                shutil.copy2(segment_files[0], output_path)
                return output_path

            # Multiple segments, concatenate with ffmpeg
            # Create a temporary file list for ffmpeg concat
            concat_file = os.path.join(self.temp_dir, "concat_list.txt")

            with open(concat_file, 'w') as f:
                for segment_file in segment_files:
                    # Escape the path for ffmpeg
                    escaped_path = segment_file.replace("'", r"\'")
                    f.write(f"file '{escaped_path}'\n")

            # Use ffmpeg to concatenate
            (
                ffmpeg
                .input(concat_file, format='concat', safe=0)
                .output(output_path, c='copy')  # Copy streams without re-encoding for speed
                .overwrite_output()
                .run(quiet=True)
            )

            logger.info(f"Successfully stitched segments into: {output_path}")
            return output_path

        except Exception as e:
            logger.error(f"Error stitching segments: {e}")
            raise RuntimeError(f"Failed to stitch segments: {e}")
        finally:
            # Clean up concat file
            if 'concat_file' in locals() and os.path.exists(concat_file):
                os.remove(concat_file)

    def process_video_segments(self, video_url: str, segments: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Complete pipeline to download segments and stitch them together

        Args:
            video_url: URL of the source video
            segments: List of segment dictionaries with timing information

        Returns:
            Dictionary with processing results and file paths
        """
        try:
            logger.info(f"Starting video processing pipeline for {len(segments)} segments")

            # Download individual segments
            segment_files = self.download_video_segments(video_url, segments)

            if not segment_files:
                raise RuntimeError("No segments were successfully downloaded")

            # Stitch segments together
            output_file = self.stitch_segments(segment_files)

            # Get file info
            file_size = os.path.getsize(output_file)

            result = {
                "success": True,
                "output_file": output_file,
                "segments_downloaded": len(segment_files),
                "segment_files": segment_files,
                "file_size_bytes": file_size,
                "file_size_mb": round(file_size / (1024 * 1024), 2),
                "temp_directory": self.temp_dir
            }

            logger.info(f"Video processing completed successfully: {output_file}")
            return result

        except Exception as e:
            logger.error(f"Video processing pipeline failed: {e}")
            return {
                "success": False,
                "error": str(e),
                "temp_directory": self.temp_dir
            }

    def get_video_info(self, video_url: str) -> Dict[str, Any]:
        """Get video information using yt-dlp"""
        try:
            cmd = ["yt-dlp", "--dump-json", "--no-warnings", video_url]
            result = subprocess.run(cmd, capture_output=True, text=True, check=True)

            import json
            video_info = json.loads(result.stdout)

            return {
                "title": video_info.get("title", "Unknown"),
                "duration": video_info.get("duration", 0),
                "uploader": video_info.get("uploader", "Unknown"),
                "view_count": video_info.get("view_count", 0),
                "format_info": video_info.get("format", "Unknown")
            }

        except Exception as e:
            logger.error(f"Failed to get video info: {e}")
            return {"error": str(e)}

    def download_full_video(self, video_url: str) -> str:
        """
        Download the complete video using yt-dlp

        Args:
            video_url: URL of the video to download

        Returns:
            Path to the downloaded video file
        """
        try:
            logger.info(f"Downloading full video from: {video_url}")

            # Output template for the full video
            output_template = os.path.join(
                self.downloads_dir,
                "full_video_%(title)s.%(ext)s"
            )

            # yt-dlp command to download full video
            cmd = [
                "yt-dlp",
                "--format", "best[height<=720]",  # Limit to 720p for faster processing
                "--output", output_template,
                "--no-warnings",
                video_url
            ]

            logger.info(f"Running command: {' '.join(cmd)}")

            # Execute download
            result = subprocess.run(cmd, capture_output=True, text=True)

            if result.returncode == 0:
                # Find the downloaded file
                video_files = list(Path(self.downloads_dir).glob("full_video_*"))
                if video_files:
                    downloaded_file = str(video_files[0])
                    logger.info(f"Successfully downloaded full video: {downloaded_file}")
                    return downloaded_file
                else:
                    raise RuntimeError("Could not find downloaded video file")
            else:
                logger.error(f"yt-dlp stderr: {result.stderr}")
                raise RuntimeError(f"Failed to download video: {result.stderr}")

        except Exception as e:
            logger.error(f"Error downloading full video: {e}")
            raise RuntimeError(f"Failed to download full video: {e}")

    def trim_video_segment(self, video_path: str, start_time: float, end_time: float, output_filename: str) -> str:
        """
        Trim a segment from a video file using ffmpeg

        Args:
            video_path: Path to the source video file
            start_time: Start time in seconds
            end_time: End time in seconds
            output_filename: Name for the output segment file

        Returns:
            Path to the trimmed segment file
        """
        try:
            output_path = os.path.join(self.segments_dir, output_filename)
            duration = end_time - start_time

            logger.info(f"Trimming segment from {start_time}s to {end_time}s (duration: {duration}s)")

            # Use ffmpeg to trim the segment
            (
                ffmpeg
                .input(video_path, ss=start_time, t=duration)
                .output(output_path, c='copy')  # Copy streams without re-encoding for speed
                .overwrite_output()
                .run(quiet=True)
            )

            if os.path.exists(output_path):
                logger.info(f"Successfully trimmed segment: {output_path}")
                return output_path
            else:
                raise RuntimeError(f"Output file was not created: {output_path}")

        except Exception as e:
            logger.error(f"Error trimming segment: {e}")
            return None

    def cleanup(self):
        """Clean up temporary files and directories"""
        try:
            if os.path.exists(self.temp_dir):
                shutil.rmtree(self.temp_dir)
                logger.info(f"Cleaned up temporary directory: {self.temp_dir}")
        except Exception as e:
            logger.warning(f"Failed to clean up temp directory: {e}")

    def __enter__(self):
        """Context manager entry"""
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit with cleanup"""
        self.cleanup()

# Utility functions for integration

def download_and_stitch_segments(video_url: str, segments: List[Dict[str, Any]], output_dir: Optional[str] = None) -> Dict[str, Any]:
    """
    Convenience function to download and stitch video segments

    Args:
        video_url: URL of the source video
        segments: List of segments with start_time and end_time
        output_dir: Directory to save the final video

    Returns:
        Processing result dictionary
    """
    with VideoDownloader(output_dir=output_dir) as downloader:
        return downloader.process_video_segments(video_url, segments)

def get_video_information(video_url: str) -> Dict[str, Any]:
    """Get video information without downloading"""
    downloader = VideoDownloader()
    try:
        return downloader.get_video_info(video_url)
    finally:
        downloader.cleanup()

def download_full_video_and_trim_segments(video_url: str, segments: List[Dict[str, Any]], output_dir: Optional[str] = None) -> Dict[str, Any]:
    """
    Download full video then trim segments locally using ffmpeg

    Args:
        video_url: URL of the source video
        segments: List of segments with start_time and end_time
        output_dir: Directory to save the final video

    Returns:
        Processing result dictionary
    """
    import logging
    logger = logging.getLogger(__name__)

    logger.info(f"=== STARTING FULL VIDEO DOWNLOAD AND TRIM ===")
    logger.info(f"Video URL: {video_url}")
    logger.info(f"Segments to process: {len(segments)}")
    logger.info(f"Output directory: {output_dir}")

    with VideoDownloader(output_dir=output_dir) as downloader:
        try:
            # Step 1: Download the full video
            logger.info("Step 1: Downloading full video...")
            full_video_path = downloader.download_full_video(video_url)
            logger.info(f"Full video downloaded to: {full_video_path}")

            # Step 2: Trim segments from the full video
            logger.info("Step 2: Trimming segments...")
            segment_files = []

            for i, segment in enumerate(segments):
                start_time = segment.get('start_time', 0)
                end_time = segment.get('end_time', 30)

                logger.info(f"Trimming segment {i+1}: {start_time}s - {end_time}s")
                segment_file = downloader.trim_video_segment(
                    full_video_path,
                    start_time,
                    end_time,
                    f"segment_{i+1:02d}.mp4"
                )

                if segment_file:
                    segment_files.append(segment_file)
                    logger.info(f"Segment {i+1} trimmed successfully: {segment_file}")
                else:
                    logger.error(f"Failed to trim segment {i+1}")

            if not segment_files:
                raise RuntimeError("No segments were successfully trimmed")

            # Step 3: Stitch segments together if multiple, or copy single segment to output dir
            logger.info("Step 3: Finalizing output...")
            if len(segment_files) == 1:
                # Single segment, copy to output directory with proper name
                output_filename = f"viral_segment_{int(time.time())}.mp4"
                output_file = os.path.join(downloader.output_dir, output_filename)
                shutil.copy2(segment_files[0], output_file)
                logger.info(f"Single segment copied to final output: {output_file}")
            else:
                # Multiple segments, stitch together
                output_file = downloader.stitch_segments(segment_files)
                logger.info(f"Multiple segments stitched together: {output_file}")

            # Get file info
            file_size = os.path.getsize(output_file)

            result = {
                "success": True,
                "output_file": output_file,
                "segments_downloaded": len(segment_files),
                "segment_files": segment_files,
                "file_size_bytes": file_size,
                "file_size_mb": round(file_size / (1024 * 1024), 2),
                "full_video_path": full_video_path,
                "temp_directory": downloader.temp_dir
            }

            logger.info(f"=== PROCESSING COMPLETED SUCCESSFULLY ===")
            logger.info(f"Final output: {output_file}")
            logger.info(f"File size: {result['file_size_mb']} MB")
            return result

        except Exception as e:
            logger.error(f"Error in download_full_video_and_trim_segments: {e}")
            logger.exception("Full traceback:")
            return {
                "success": False,
                "error": str(e),
                "temp_directory": downloader.temp_dir if 'downloader' in locals() else None
            }

if __name__ == "__main__":
    # Test the downloader
    test_url = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"  # Rick Astley example
    test_segments = [
        {"start_time": 10, "end_time": 40},  # 30 second segment
        {"start_time": 60, "end_time": 90},  # Another 30 second segment
    ]

    print("Testing VideoDownloader...")
    result = download_and_stitch_segments(test_url, test_segments)
    print(f"Test result: {result}")