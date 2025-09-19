from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import uvicorn
import os
from dotenv import load_dotenv
from apify_client import ApifyClient
from video_processing import process_transcript_to_viral_script
from video_downloader import VideoDownloader, download_and_stitch_segments, get_video_information

load_dotenv()

app = FastAPI(title="VideoToShorts Backend", version="1.0.0")

# Configure CORS to allow frontend connections
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Next.js default port
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create videos directory if it doesn't exist
videos_dir = os.path.join(os.path.dirname(__file__), "videos")
os.makedirs(videos_dir, exist_ok=True)

# Mount static files for serving downloaded videos
app.mount("/videos", StaticFiles(directory=videos_dir), name="videos")

# Initialize Apify Client
apify_client = ApifyClient(os.getenv("APIFY_TOKEN"))

class VideoRequest(BaseModel):
    keyword: str

class Video(BaseModel):
    caption: str
    url: str
    views: int

class HealthResponse(BaseModel):
    status: str
    message: str

class ViralScriptRequest(BaseModel):
    gladia_result: dict
    target_duration: int = 30

class ViralScriptResponse(BaseModel):
    success: bool
    script: dict = None
    analytics: dict = None
    total_duration: float = None
    error: str = None

class ExtractSegmentRequest(BaseModel):
    gladia_result: dict
    target_duration: int = 30

class ProcessVideoRequest(BaseModel):
    video_url: str
    gladia_result: dict
    target_duration: int = 30

class DirectProcessVideoRequest(BaseModel):
    video_url: str
    segments: list
    target_duration: int = 30

class ProcessVideoResponse(BaseModel):
    success: bool
    video_file_path: str = None
    segments_info: dict = None
    processing_details: dict = None
    error: str = None

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

        # Get the top 5 videos
        top_videos = sorted_videos[:3]

        if not top_videos:
            raise HTTPException(status_code=404, detail="Could not retrieve top videos. The actor might not have returned view counts.")

        # Format the response
        response_data = [
            Video(
                caption=video.get("text", ""),
                url=video.get("webVideoUrl", ""),
                views=video.get("playCount", 0)
            )
            for video in top_videos
        ]

        return response_data

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/generate_viral_script", response_model=ViralScriptResponse)
async def generate_viral_script(request: ViralScriptRequest):
    """
    Generate a viral 30-second script from video transcript using Gemini AI.
    
    This endpoint takes the Gladia API transcription result and generates
    an optimized script designed to go viral on social media platforms.
    """
    try:
        # Validate the request
        if not request.gladia_result:
            raise HTTPException(status_code=400, detail="gladia_result is required")
        
        # Check if GEMINI_API_KEY is set
        if not os.getenv("GEMINI_API_KEY"):
            raise HTTPException(status_code=500, detail="GEMINI_API_KEY environment variable is not set")
        
        # Process the transcript to generate viral script
        result = process_transcript_to_viral_script(
            request.gladia_result, 
            request.target_duration
        )
        
        if result["success"]:
            return ViralScriptResponse(
                success=True,
                script=result["script"],
                analytics=result["analytics"],
                total_duration=result["total_duration"]
            )
        else:
            raise HTTPException(status_code=500, detail=result["error"])
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@app.post("/test_viral_script")
async def test_viral_script_simple():
    """Simple test endpoint for viral script generation"""
    return {
        "success": True,
        "message": "Viral script endpoint is working!",
        "script": {
            "title": "Test Viral Script",
            "hook": "This is a test hook!"
        }
    }

@app.post("/extract-viral-segment")
async def extract_viral_segment(request: ExtractSegmentRequest):
    """
    Extract the best viral segment from video transcript using AI analysis.

    This endpoint takes the Gladia API transcription result and finds
    the most engaging 30-second segment with exact timestamps.
    """
    try:
        # Validate the request
        if not request.gladia_result:
            raise HTTPException(status_code=400, detail="gladia_result is required")

        # Check if GEMINI_API_KEY is set
        if not os.getenv("GEMINI_API_KEY"):
            raise HTTPException(status_code=500, detail="GEMINI_API_KEY environment variable is not set")

        # Process the transcript to extract the best segment
        result = process_transcript_to_viral_script(
            request.gladia_result,
            request.target_duration
        )

        if result["success"]:
            return result
        else:
            raise HTTPException(status_code=500, detail=result["error"])

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@app.post("/process-video-segments", response_model=ProcessVideoResponse)
async def process_video_segments(request: ProcessVideoRequest):
    """
    Process video by downloading specific segments and stitching them together.

    This endpoint takes a video URL and Gladia transcript result, extracts the best
    viral segments, downloads only those segments using yt-dlp, and stitches them
    together into a single video file.
    """
    try:
        # Validate the request
        if not request.video_url:
            raise HTTPException(status_code=400, detail="video_url is required")
        if not request.gladia_result:
            raise HTTPException(status_code=400, detail="gladia_result is required")

        # Check if GEMINI_API_KEY is set
        if not os.getenv("GEMINI_API_KEY"):
            raise HTTPException(status_code=500, detail="GEMINI_API_KEY environment variable is not set")

        # If we have actual Gladia result data, extract segments from transcript
        if request.gladia_result.get("result", {}).get("transcription", {}).get("utterances"):
            from video_processing import process_transcript_to_viral_script
            segment_analysis = process_transcript_to_viral_script(
                request.gladia_result,
                request.target_duration
            )

            if not segment_analysis["success"]:
                raise HTTPException(status_code=500, detail=segment_analysis["error"])

            # Get segments from analysis
            extracted_segment = segment_analysis["extracted_segment"]
            alternative_segments = segment_analysis.get("analysis", {}).get("alternative_segments", [])

            # Prepare segments for download (top 3)
            segments_to_download = [
                {
                    "start_time": extracted_segment["start_time"],
                    "end_time": extracted_segment["end_time"],
                    "reasoning": extracted_segment["reasoning"]
                }
            ]

            # Add up to 2 alternative segments
            for alt_segment in alternative_segments[:2]:
                segments_to_download.append({
                    "start_time": alt_segment["start_time"],
                    "end_time": alt_segment["end_time"],
                    "reasoning": alt_segment.get("reasoning", "Alternative viral segment")
                })
        else:
            # Fallback: create sample segments if no transcript data available
            # This would typically come from a different API call or user selection
            total_duration = request.gladia_result.get("result", {}).get("metadata", {}).get("audio_duration", 300)
            segment_duration = request.target_duration

            # Create 3 evenly spaced segments as fallback
            segments_to_download = []
            for i in range(3):
                start_offset = (total_duration // 4) * (i + 1)  # Spread segments across the video
                start_time = max(0, start_offset - segment_duration // 2)
                end_time = min(total_duration, start_time + segment_duration)

                segments_to_download.append({
                    "start_time": start_time,
                    "end_time": end_time,
                    "reasoning": f"Sample segment {i+1} from video"
                })

        # Download and stitch segments
        processing_result = download_and_stitch_segments(request.video_url, segments_to_download, videos_dir)

        if not processing_result["success"]:
            raise HTTPException(status_code=500, detail=processing_result["error"])

        # Generate URL for the video file
        output_filename = os.path.basename(processing_result["output_file"])
        video_url = f"/videos/{output_filename}"

        return ProcessVideoResponse(
            success=True,
            video_file_path=video_url,
            segments_info={
                "segments_count": len(segments_to_download),
                "segments": segments_to_download,
                "total_duration": sum(s["end_time"] - s["start_time"] for s in segments_to_download)
            },
            processing_details={
                "file_size_mb": processing_result["file_size_mb"],
                "segments_downloaded": processing_result["segments_downloaded"],
                "analysis_score": segment_analysis.get("analysis", {}).get("engagement_score", 0) if 'segment_analysis' in locals() else 7.0,
                "local_file_path": processing_result["output_file"]
            }
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@app.post("/process-video-segments-direct", response_model=ProcessVideoResponse)
async def process_video_segments_direct(request: DirectProcessVideoRequest):
    """
    Process video by downloading specific segments directly (without AI analysis).

    This endpoint takes a video URL and predefined segments, downloads them using yt-dlp,
    and stitches them together into a single video file.
    """
    try:
        # Validate the request
        if not request.video_url:
            raise HTTPException(status_code=400, detail="video_url is required")
        if not request.segments:
            raise HTTPException(status_code=400, detail="segments are required")

        # Use the segments directly
        segments_to_download = request.segments

        # Download and stitch segments
        processing_result = download_and_stitch_segments(request.video_url, segments_to_download, videos_dir)

        if not processing_result["success"]:
            raise HTTPException(status_code=500, detail=processing_result["error"])

        # Generate URL for the video file
        output_filename = os.path.basename(processing_result["output_file"])
        video_url = f"/videos/{output_filename}"

        return ProcessVideoResponse(
            success=True,
            video_file_path=video_url,
            segments_info={
                "segments_count": len(segments_to_download),
                "segments": segments_to_download,
                "total_duration": sum(s["end_time"] - s["start_time"] for s in segments_to_download)
            },
            processing_details={
                "file_size_mb": processing_result["file_size_mb"],
                "segments_downloaded": processing_result["segments_downloaded"],
                "local_file_path": processing_result["output_file"]
            }
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@app.get("/video-info/{video_id}")
async def get_video_info(video_id: str):
    """Get video information without downloading"""
    try:
        # Construct YouTube URL
        video_url = f"https://www.youtube.com/watch?v={video_id}"

        video_info = get_video_information(video_url)

        if "error" in video_info:
            raise HTTPException(status_code=400, detail=video_info["error"])

        return video_info

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get video info: {str(e)}")

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