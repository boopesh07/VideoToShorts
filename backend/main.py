from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import uvicorn
import os
from dotenv import load_dotenv
from apify_client import ApifyClient
from video_processor import video_processor
from segment_extractor import get_ai_suggested_segments
import logging

load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="VideoToShorts Backend", version="1.0.0")

# Configure CORS to allow frontend connections
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Next.js default port
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Apify Client
apify_client = ApifyClient(os.getenv("APIFY_TOKEN"))

class VideoRequest(BaseModel):
    keyword: str

class Video(BaseModel):
    caption: str
    url: str
    views: int
    video_url: str
    comment_count: int
    subtitles: List[Dict[str, Any]]

class HealthResponse(BaseModel):
    status: str
    message: str

class ShortsRequest(BaseModel):
    youtube_url: str
    transcript_data: Dict[str, Any]
    custom_segments: Optional[List[Dict[str, Any]]] = None
    max_shorts: int = 5

class ShortInfo(BaseModel):
    id: str
    title: str
    text: str
    start_time: float
    end_time: float
    duration: float
    filename: str

class SuggestedSegment(BaseModel):
    rank: int
    start_time: float
    end_time: float
    duration: float
    text: str
    segments_included: List[int]
    reasoning: str
    engagement_score: float
    viral_potential: str
    key_moment: Dict[str, Any]
    title: str

class SuggestedSegmentsRequest(BaseModel):
    transcript_data: Dict[str, Any]
    target_duration: int = 30
    max_segments: int = 5

class SuggestedSegmentsResponse(BaseModel):
    success: bool
    suggested_segments: List[SuggestedSegment]
    total_suggestions: int
    target_duration: int
    analysis_method: str

class ShortsResponse(BaseModel):
    success: bool
    youtube_url: str
    shorts_generated: int
    shorts: List[ShortInfo]
    segments_analyzed: int

@app.get("/")
async def root():
    return {"message": "VideoToShorts Backend API"}

@app.get("/health", response_model=HealthResponse)
async def health_check():
    return HealthResponse(
        status="healthy",
        message="Backend is running successfully"
    )

@app.post("/get_viral_videos", response_model=list[Video])
async def get_viral_videos(request: VideoRequest):
    """
    Fetches viral TikTok videos based on a keyword.
    """
    try:
        # Start the Apify TikTok Scraper Actor
        actor_run = apify_client.actor("clockworks/tiktok-scraper").call(
            run_input={
                "hashtags": [request.keyword.replace("#", "")],
                "resultsPerPage": 50, # Fetch more to ensure we get enough videos with view counts
                "shouldDownloadVideos": False,
                "shouldDownloadCovers": False,
                "shouldDownloadSubtitles": True,
            }
        )

        # Fetch the results from the actor run
        dataset_items = apify_client.dataset(actor_run["defaultDatasetId"]).list_items().items

        if not dataset_items:
            raise HTTPException(status_code=404, detail="No videos found for this keyword.")

        # Define a virality score and sort videos
        def calculate_virality(video):
            # Prioritize shares, as they are a stronger engagement signal
            return video.get("playCount", 0) + video.get("shareCount", 0) * 10

        sorted_videos = sorted(
            [item for item in dataset_items if item.get("playCount") and item.get("shareCount")],
            key=calculate_virality,
            reverse=True
        )

        # Get the top 3 videos
        top_videos = sorted_videos[:3]

        if not top_videos:
            raise HTTPException(status_code=404, detail="Could not retrieve top videos. The actor might not have returned view counts.")

        # Format the response
        response_data = [
            Video(
                caption=video.get("text", ""),
                url=video.get("webVideoUrl", ""),
                views=video.get("playCount", 0),
                video_url=video.get("webVideoUrl", ""),
                comment_count=video.get("commentCount", 0),
                subtitles=video.get("videoMeta", {}).get("subtitleLinks", [])
            )
            for video in top_videos
        ]

        return response_data

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/suggest_segments", response_model=SuggestedSegmentsResponse)
async def suggest_segments(request: SuggestedSegmentsRequest):
    """
    Get AI-suggested segments from transcript data for optimal shorts generation.
    """
    try:
        # Check if Gemini API key is available
        if not os.getenv('GEMINI_API_KEY'):
            raise HTTPException(
                status_code=400,
                detail="GEMINI_API_KEY environment variable is required for AI-powered segment analysis. Please set your API key and restart the server."
            )

        # Use the intelligent segment extractor to get AI suggestions
        result = get_ai_suggested_segments(
            request.transcript_data,
            request.target_duration,
            request.max_segments
        )

        if not result["success"]:
            raise HTTPException(status_code=500, detail=result.get("error", "Failed to analyze segments"))

        # Convert to response format
        suggested_segments = [
            SuggestedSegment(
                rank=seg["rank"],
                start_time=seg["start_time"],
                end_time=seg["end_time"],
                duration=seg["duration"],
                text=seg["text"],
                segments_included=seg["segments_included"],
                reasoning=seg["reasoning"],
                engagement_score=seg["engagement_score"],
                viral_potential=seg["viral_potential"],
                key_moment=seg["key_moment"],
                title=seg["title"]
            )
            for seg in result["suggested_segments"]
        ]

        return SuggestedSegmentsResponse(
            success=result["success"],
            suggested_segments=suggested_segments,
            total_suggestions=result["total_suggestions"],
            target_duration=result["target_duration"],
            analysis_method=result["analysis_method"]
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error suggesting segments: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@app.post("/generate_shorts", response_model=ShortsResponse)
async def generate_shorts(request: ShortsRequest):
    """
    Generate YouTube Shorts from a YouTube URL and transcript data.
    """
    try:
        # Process the YouTube URL to generate shorts
        result = video_processor.process_youtube_url_to_shorts(
            youtube_url=request.youtube_url,
            transcript_data=request.transcript_data,
            custom_segments=request.custom_segments,
            max_shorts=request.max_shorts
        )

        # Convert to response format
        shorts_info = [
            ShortInfo(
                id=short['id'],
                title=short['title'],
                text=short['text'],
                start_time=short['start_time'],
                end_time=short['end_time'],
                duration=short['duration'],
                filename=short['filename']
            )
            for short in result['shorts']
        ]

        return ShortsResponse(
            success=result['success'],
            youtube_url=result['youtube_url'],
            shorts_generated=result['shorts_generated'],
            shorts=shorts_info,
            segments_analyzed=result['segments_analyzed']
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/download_short/{filename}")
async def download_short(filename: str):
    """
    Download a generated short video file.
    """
    try:
        # Get the shorts directory from video processor
        shorts_dir = video_processor.shorts_dir
        file_path = os.path.join(shorts_dir, filename)

        # Check if file exists
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="Short video file not found")

        # Return the file
        return FileResponse(
            path=file_path,
            filename=filename,
            media_type="video/mp4"
        )

    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Short video file not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/preview_short/{filename}")
async def preview_short(filename: str, request: Request):
    """
    Stream a generated short video file for preview with range support.
    """
    try:
        # Get the shorts directory from video processor
        shorts_dir = video_processor.shorts_dir
        file_path = os.path.join(shorts_dir, filename)

        # Check if file exists
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="Short video file not found")

        # Get file size
        file_size = os.path.getsize(file_path)

        # Handle range requests for video streaming
        range_header = request.headers.get("range")
        if range_header:
            # Parse range header (e.g., "bytes=0-1023")
            start = 0
            end = file_size - 1

            range_match = range_header.replace("bytes=", "").split("-")
            if len(range_match) == 2:
                if range_match[0]:
                    start = int(range_match[0])
                if range_match[1]:
                    end = int(range_match[1])

            # Ensure valid range
            start = max(0, start)
            end = min(file_size - 1, end)
            content_length = end - start + 1

            def iterfile():
                with open(file_path, 'rb') as file_like:
                    file_like.seek(start)
                    remaining = content_length
                    while remaining:
                        chunk_size = min(8192, remaining)
                        chunk = file_like.read(chunk_size)
                        if not chunk:
                            break
                        remaining -= len(chunk)
                        yield chunk

            headers = {
                'Content-Range': f'bytes {start}-{end}/{file_size}',
                'Accept-Ranges': 'bytes',
                'Content-Length': str(content_length),
                'Content-Type': 'video/mp4',
            }

            return StreamingResponse(
                iterfile(),
                status_code=206,
                headers=headers
            )

        # If no range header, return full file
        def iterfile():
            with open(file_path, 'rb') as file_like:
                while chunk := file_like.read(8192):
                    yield chunk

        headers = {
            'Accept-Ranges': 'bytes',
            'Content-Length': str(file_size),
            'Content-Type': 'video/mp4',
        }

        return StreamingResponse(
            iterfile(),
            headers=headers
        )

    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Short video file not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/demo/sample_shorts")
async def get_sample_shorts():
    """
    Return sample shorts data for testing the video preview functionality.
    """
    sample_shorts = [
        {
            "id": "demo_short_1",
            "title": "Sample Highlight 1",
            "text": "This is a sample highlight from a demo video. It shows the most engaging part of the content.",
            "start_time": 15.5,
            "end_time": 45.2,
            "duration": 29.7,
            "filename": "demo_short_1.mp4"
        },
        {
            "id": "demo_short_2",
            "title": "Sample Highlight 2",
            "text": "Another interesting segment that would make a great short video clip.",
            "start_time": 120.0,
            "end_time": 150.5,
            "duration": 30.5,
            "filename": "demo_short_2.mp4"
        }
    ]

    return {
        "success": True,
        "youtube_url": "https://www.youtube.com/watch?v=demo",
        "shorts_generated": len(sample_shorts),
        "shorts": sample_shorts,
        "segments_analyzed": 10
    }

@app.get("/api/test")
async def test_endpoint():
    return {
        "success": True,
        "message": "Frontend-Backend connection successful!",
        "data": {
            "timestamp": "2025-09-19",
            "service": "VideoToShorts API"
        }
    }

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8080)
