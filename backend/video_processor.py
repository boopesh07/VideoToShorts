import os
import tempfile
import uuid
from typing import List, Dict, Tuple, Optional
import subprocess
import json
import yt_dlp
import logging
from pathlib import Path

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class VideoProcessor:
    def __init__(self, temp_dir: Optional[str] = None):
        self.temp_dir = temp_dir or tempfile.gettempdir()
        self.downloads_dir = os.path.join(self.temp_dir, "video_downloads")
        self.shorts_dir = os.path.join(self.temp_dir, "video_shorts")

        # Create directories if they don't exist
        os.makedirs(self.downloads_dir, exist_ok=True)
        os.makedirs(self.shorts_dir, exist_ok=True)

    def check_ffmpeg(self) -> bool:
        """Check if ffmpeg is available in the system."""
        try:
            subprocess.run(['ffmpeg', '-version'],
                         capture_output=True,
                         check=True)
            return True
        except (subprocess.CalledProcessError, FileNotFoundError):
            logger.error("FFmpeg not found. Please install FFmpeg to use video processing features.")
            return False

    def download_youtube_video(self, url: str) -> str:
        """
        Download YouTube video and return the path to the downloaded file.
        """
        try:
            unique_id = str(uuid.uuid4())[:8]
            output_filename = f"video_{unique_id}.%(ext)s"
            output_path = os.path.join(self.downloads_dir, output_filename)

            ydl_opts = {
                'outtmpl': output_path,
                'format': 'best[height<=1080][ext=mp4]/best[ext=mp4]/best',
                'noplaylist': True,
                'extractaudio': False,
            }

            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                logger.info(f"Downloading video from: {url}")
                info = ydl.extract_info(url, download=True)

                # Get the actual filename after download
                downloaded_file = ydl.prepare_filename(info)

                logger.info(f"Video downloaded successfully: {downloaded_file}")
                return downloaded_file

        except Exception as e:
            logger.error(f"Error downloading YouTube video: {str(e)}")
            raise Exception(f"Failed to download video: {str(e)}")

    def get_video_duration(self, video_path: str) -> float:
        """
        Get the duration of a video file in seconds using ffprobe.
        """
        try:
            cmd = [
                'ffprobe', '-v', 'quiet', '-print_format', 'json',
                '-show_format', video_path
            ]
            result = subprocess.run(cmd, capture_output=True, text=True, check=True)
            data = json.loads(result.stdout)
            duration = float(data['format']['duration'])
            return duration
        except Exception as e:
            logger.error(f"Error getting video duration: {str(e)}")
            raise Exception(f"Failed to get video duration: {str(e)}")

    def create_video_segment(self, video_path: str, start_time: float, end_time: float, output_path: str) -> str:
        """
        Create a video segment from start_time to end_time using ffmpeg.
        Times should be in seconds.
        """
        try:
            # Check if ffmpeg is available
            if not self.check_ffmpeg():
                raise Exception("FFmpeg is required but not found")

            # Ensure the output directory exists
            os.makedirs(os.path.dirname(output_path), exist_ok=True)

            # Calculate duration
            duration = end_time - start_time

            # FFmpeg command to extract segment
            cmd = [
                'ffmpeg', '-y',  # -y to overwrite output files
                '-i', video_path,
                '-ss', str(start_time),
                '-t', str(duration),
                '-vf', 'crop=ih*9/16:ih',
                '-c:v', 'libx264',  # video codec
                '-c:a', 'aac',      # audio codec
                '-avoid_negative_ts', 'make_zero',
                '-preset', 'fast',  # encoding speed
                output_path
            ]

            logger.info(f"Running ffmpeg command: {' '.join(cmd)}")
            result = subprocess.run(cmd, capture_output=True, text=True, check=True)

            if os.path.exists(output_path):
                logger.info(f"Created video segment: {output_path} ({start_time}s - {end_time}s)")
                return output_path
            else:
                raise Exception("Output file was not created")

        except subprocess.CalledProcessError as e:
            logger.error(f"FFmpeg error: {e.stderr}")
            raise Exception(f"Failed to create video segment: {e.stderr}")
        except Exception as e:
            logger.error(f"Error creating video segment: {str(e)}")
            raise Exception(f"Failed to create video segment: {str(e)}")

    def generate_shorts_from_segments(self, video_path: str, segments: List[Dict]) -> List[Dict]:
        """
        Generate multiple shorts from a video based on transcript segments.

        Args:
            video_path: Path to the downloaded video file
            segments: List of segment dictionaries with 'start', 'end', 'text', and optionally 'title'

        Returns:
            List of dictionaries containing short video information
        """
        try:
            video_duration = self.get_video_duration(video_path)
            logger.info(f"Processing video with duration: {video_duration}s")

            generated_shorts = []

            for i, segment in enumerate(segments):
                start_time = float(segment.get('start', 0))
                end_time = float(segment.get('end', start_time + 30))  # Default 30 seconds if no end time
                text = segment.get('text', f'Short {i+1}')
                title = segment.get('title', f'Short_{i+1}')

                # Validate times
                if start_time >= video_duration:
                    logger.warning(f"Start time {start_time}s exceeds video duration {video_duration}s")
                    continue

                if end_time > video_duration:
                    end_time = video_duration
                    logger.warning(f"End time adjusted to video duration: {end_time}s")

                if end_time <= start_time:
                    logger.warning(f"Invalid time range: {start_time}s - {end_time}s")
                    continue

                # Ensure shorts are reasonable length (between 15 seconds and 60 seconds)
                duration = end_time - start_time
                if duration < 15:
                    logger.warning(f"Segment too short ({duration}s), extending to 15s")
                    end_time = min(start_time + 15, video_duration)
                elif duration > 60:
                    logger.warning(f"Segment too long ({duration}s), truncating to 60s")
                    end_time = start_time + 60

                # Generate unique filename
                short_id = str(uuid.uuid4())[:8]
                output_filename = f"{title}_{short_id}.mp4"
                output_path = os.path.join(self.shorts_dir, output_filename)

                # Create the video segment
                try:
                    segment_path = self.create_video_segment(video_path, start_time, end_time, output_path)

                    short_info = {
                        'id': short_id,
                        'title': title,
                        'text': text,
                        'start_time': start_time,
                        'end_time': end_time,
                        'duration': end_time - start_time,
                        'file_path': segment_path,
                        'filename': output_filename,
                    }

                    generated_shorts.append(short_info)
                    logger.info(f"Generated short: {title} ({start_time}s - {end_time}s)")

                except Exception as e:
                    logger.error(f"Failed to create segment {i+1}: {str(e)}")
                    continue

            logger.info(f"Successfully generated {len(generated_shorts)} shorts")
            return generated_shorts

        except Exception as e:
            logger.error(f"Error generating shorts: {str(e)}")
            raise Exception(f"Failed to generate shorts: {str(e)}")

    def analyze_transcript_for_highlights(self, transcript_data: Dict, max_shorts: int = 5) -> List[Dict]:
        """
        Analyze transcript to automatically identify potential highlight segments for shorts.
        This is a basic implementation that can be enhanced with AI/ML models.

        Args:
            transcript_data: Gladia transcript result
            max_shorts: Maximum number of shorts to generate

        Returns:
            List of segment dictionaries suitable for shorts generation
        """
        try:
            utterances = transcript_data.get('result', {}).get('transcription', {}).get('utterances', [])

            if not utterances:
                raise Exception("No utterances found in transcript")

            # Basic highlight detection logic
            highlights = []

            # Strategy 1: Look for high-energy segments (exclamations, questions)
            for i, utterance in enumerate(utterances):
                text = utterance.get('text', '').strip()
                start_time = float(utterance.get('start', 0))
                end_time = float(utterance.get('end', start_time + 1))

                # Score based on content characteristics
                score = 0

                # Higher score for questions and exclamations
                if '?' in text or '!' in text:
                    score += 3

                # Higher score for certain keywords that indicate interesting content
                highlight_keywords = ['amazing', 'incredible', 'important', 'secret', 'tip', 'trick', 'hack',
                                    'surprising', 'shocking', 'must', 'need to know', 'game changer', 'wow',
                                    'unbelievable', 'crazy', 'insane', 'perfect', 'awesome', 'fantastic']
                for keyword in highlight_keywords:
                    if keyword.lower() in text.lower():
                        score += 2

                # Higher score for longer segments with good content
                if len(text) > 100:
                    score += 1

                # Higher score for segments with higher confidence
                confidence = float(utterance.get('confidence', 0))
                if confidence > 0.8:
                    score += 1

                if score > 0:
                    highlights.append({
                        'start': start_time,
                        'end': end_time,
                        'text': text,
                        'score': score,
                        'title': f"Highlight_{len(highlights)+1}"
                    })

            # Sort by score and take top segments
            highlights.sort(key=lambda x: x['score'], reverse=True)

            # Extend segments to be at least 20 seconds
            extended_highlights = []
            for highlight in highlights[:max_shorts]:
                start_time = highlight['start']
                end_time = highlight['end']

                # Try to extend the segment by looking at surrounding utterances
                target_duration = 25  # Target 25 seconds
                current_duration = end_time - start_time

                if current_duration < target_duration:
                    extension_needed = target_duration - current_duration

                    # Try to extend both ways
                    new_start = max(0, start_time - extension_needed / 2)
                    new_end = end_time + extension_needed / 2

                    # Collect text from extended range
                    extended_text_parts = []
                    for utt in utterances:
                        utt_start = float(utt.get('start', 0))
                        utt_end = float(utt.get('end', 0))
                        if utt_start >= new_start and utt_end <= new_end:
                            extended_text_parts.append(utt.get('text', ''))

                    extended_text = ' '.join(extended_text_parts) if extended_text_parts else highlight['text']

                    extended_highlights.append({
                        'start': new_start,
                        'end': new_end,
                        'text': extended_text,
                        'title': highlight['title']
                    })
                else:
                    extended_highlights.append(highlight)

            # If no highlights found, create segments from the beginning
            if not extended_highlights and utterances:
                # Create segments of ~30 seconds from different parts of the video
                total_duration = max([float(u.get('end', 0)) for u in utterances])
                segment_duration = 30

                # Create segments at different intervals
                intervals = [0, total_duration * 0.25, total_duration * 0.5, total_duration * 0.75]

                for i, start_offset in enumerate(intervals[:max_shorts]):
                    segment_utterances = []
                    segment_start = start_offset
                    segment_end = min(segment_start + segment_duration, total_duration)

                    # Collect utterances in this time range
                    for utterance in utterances:
                        utt_start = float(utterance.get('start', 0))
                        if segment_start <= utt_start < segment_end:
                            segment_utterances.append(utterance)

                    if segment_utterances:
                        segment_text = ' '.join([utt.get('text', '') for utt in segment_utterances])

                        extended_highlights.append({
                            'start': segment_start,
                            'end': segment_end,
                            'text': segment_text,
                            'title': f"Segment_{i+1}"
                        })

            logger.info(f"Identified {len(extended_highlights)} potential highlight segments")
            return extended_highlights

        except Exception as e:
            logger.error(f"Error analyzing transcript for highlights: {str(e)}")
            raise Exception(f"Failed to analyze transcript: {str(e)}")

    def cleanup_temp_files(self, file_paths: List[str]):
        """
        Clean up temporary files.
        """
        for file_path in file_paths:
            try:
                if os.path.exists(file_path):
                    os.remove(file_path)
                    logger.info(f"Cleaned up temporary file: {file_path}")
            except Exception as e:
                logger.warning(f"Failed to clean up file {file_path}: {str(e)}")

    def process_youtube_url_to_shorts(self, youtube_url: str, transcript_data: Dict,
                                    custom_segments: Optional[List[Dict]] = None,
                                    max_shorts: int = 5) -> Dict:
        """
        Complete workflow: Download YouTube video, analyze transcript, and generate shorts.

        Args:
            youtube_url: YouTube video URL
            transcript_data: Gladia transcript result
            custom_segments: Optional custom segments, if None will auto-analyze transcript
            max_shorts: Maximum number of shorts to generate

        Returns:
            Dictionary with shorts information and file paths
        """
        downloaded_video_path = None
        try:
            # Check if ffmpeg is available
            if not self.check_ffmpeg():
                raise Exception("FFmpeg is required but not available. Please install FFmpeg.")

            # Step 1: Download YouTube video
            logger.info(f"Starting shorts generation for: {youtube_url}")
            downloaded_video_path = self.download_youtube_video(youtube_url)

            # Step 2: Determine segments for shorts
            if custom_segments:
                segments = custom_segments
                logger.info(f"Using {len(custom_segments)} custom segments")
            else:
                segments = self.analyze_transcript_for_highlights(transcript_data, max_shorts)
                logger.info(f"Auto-identified {len(segments)} segments")

            # Step 3: Generate shorts
            shorts = self.generate_shorts_from_segments(downloaded_video_path, segments)

            result = {
                'success': True,
                'youtube_url': youtube_url,
                'original_video_path': downloaded_video_path,
                'shorts_generated': len(shorts),
                'shorts': shorts,
                'segments_analyzed': len(segments)
            }

            logger.info(f"Successfully processed YouTube URL to {len(shorts)} shorts")
            return result

        except Exception as e:
            logger.error(f"Error processing YouTube URL to shorts: {str(e)}")
            # Clean up downloaded file if there was an error
            if downloaded_video_path and os.path.exists(downloaded_video_path):
                try:
                    os.remove(downloaded_video_path)
                except:
                    pass
            raise Exception(f"Failed to process YouTube URL: {str(e)}")

# Create a singleton instance
video_processor = VideoProcessor()
