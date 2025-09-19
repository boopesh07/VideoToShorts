from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import uvicorn
import os
import logging
import json
import time
import asyncio
import random
from dotenv import load_dotenv
from apify_client import ApifyClient
from video_processing import process_transcript_to_viral_script
from video_downloader import VideoDownloader, download_and_stitch_segments, get_video_information

load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),  # Console output
        logging.FileHandler('backend.log')  # File output
    ]
)

logger = logging.getLogger(__name__)

app = FastAPI(title="VideoToShorts Backend", version="1.0.0")

# Add request and response logging middleware
@app.middleware("http")
async def log_requests_and_responses(request, call_next):
    import json
    import time
    from fastapi.responses import JSONResponse
    from starlette.responses import Response, StreamingResponse

    start_time = time.time()

    # Log incoming request
    logger.info(f"=== INCOMING REQUEST ===")
    logger.info(f"Method: {request.method}")
    logger.info(f"URL: {request.url}")
    logger.info(f"Path: {request.url.path}")
    logger.info(f"Query Params: {dict(request.query_params)}")
    logger.info(f"Headers: {dict(request.headers)}")

    # Read request body if present
    if request.method in ["POST", "PUT", "PATCH"]:
        try:
            body = await request.body()
            if body:
                try:
                    body_json = json.loads(body.decode())
                    logger.info(f"Request Body: {json.dumps(body_json, indent=2)}")
                except:
                    logger.info(f"Request Body (raw): {body.decode()[:500]}...")
        except:
            logger.info("Could not read request body")

    response = await call_next(request)
    process_time = time.time() - start_time

    # Log response details
    logger.info(f"=== RESPONSE ===")
    logger.info(f"Status Code: {response.status_code}")
    logger.info(f"Process Time: {process_time:.4f}s")
    logger.info(f"Response Headers: {dict(response.headers)}")

    # For JSON responses, intercept and log the body
    if (response.headers.get("content-type", "").startswith("application/json") or
        isinstance(response, JSONResponse)):

        # Read response body
        response_body = b""
        async for chunk in response.body_iterator:
            response_body += chunk

        try:
            response_text = response_body.decode()
            response_json = json.loads(response_text)
            logger.info(f"Response Body: {json.dumps(response_json, indent=2)}")
        except Exception as e:
            logger.info(f"Response Body (raw): {response_body.decode()[:500]}...")

        # Create new response with the same content
        from starlette.responses import Response as StarletteResponse
        response = StarletteResponse(
            content=response_body,
            status_code=response.status_code,
            headers=dict(response.headers),
            media_type=response.media_type
        )

    logger.info(f"=== REQUEST COMPLETED ===")

    return response

# Configure CORS to allow frontend connections
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],  # Next.js default port
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"],
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

class MinimaxRequest(BaseModel):
    prompt: str
    model: str = "abab6.5s-chat"
    temperature: float = 0.7
    max_tokens: int = 1000
    top_p: float = 0.95

class MinimaxResponse(BaseModel):
    success: bool
    data: dict = None
    usage: dict = None
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
    import logging
    logger = logging.getLogger(__name__)

    logger.info(f"=== STARTING VIDEO PROCESSING ===")
    logger.info(f"Request received: video_url={request.video_url}")
    logger.info(f"Segments: {request.segments}")
    logger.info(f"Target duration: {request.target_duration}")

    try:
        # Validate the request
        if not request.video_url:
            logger.error("video_url is missing from request")
            raise HTTPException(status_code=400, detail="video_url is required")
        if not request.segments:
            logger.error("segments are missing from request")
            raise HTTPException(status_code=400, detail="segments are required")

        logger.info(f"Request validation passed")

        # Use the segments directly
        segments_to_download = request.segments
        logger.info(f"Processing {len(segments_to_download)} segments")

        # Download and stitch segments
        logger.info("Starting video download and processing...")
        from video_downloader import download_full_video_and_trim_segments
        processing_result = download_full_video_and_trim_segments(request.video_url, segments_to_download, videos_dir)

        logger.info(f"Processing result: {processing_result}")

        if not processing_result["success"]:
            logger.error(f"Video processing failed: {processing_result.get('error', 'Unknown error')}")
            raise HTTPException(status_code=500, detail=processing_result["error"])

        # Generate URL for the video file
        output_filename = os.path.basename(processing_result["output_file"])
        video_url = f"/videos/{output_filename}"

        logger.info(f"Video processing completed successfully")
        logger.info(f"Output file: {processing_result['output_file']}")
        logger.info(f"Video URL: {video_url}")

        response_data = ProcessVideoResponse(
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

        logger.info(f"=== VIDEO PROCESSING COMPLETED SUCCESSFULLY ===")
        return response_data

    except HTTPException as he:
        logger.error(f"HTTP Exception: {he.detail}")
        raise
    except Exception as e:
        logger.error(f"Unexpected error in video processing: {str(e)}")
        logger.exception("Full traceback:")
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
    logger.info("Test endpoint called")
    return {
        "success": True,
        "message": "Frontend-Backend connection successful!",
        "data": {
            "timestamp": "2025-09-19",
            "service": "VideoToShorts API"
        }
    }

@app.post("/api/test-download")
async def test_download_endpoint(request: DirectProcessVideoRequest):
    """Simple test endpoint for download functionality"""
    logger.info("=== TEST DOWNLOAD ENDPOINT CALLED ===")
    logger.info(f"Received data: {request}")

    try:
        return {
            "success": True,
            "message": "Test download endpoint working!",
            "received_data": {
                "video_url": request.video_url,
                "segments_count": len(request.segments),
                "segments": request.segments
            }
        }
    except Exception as e:
        logger.error(f"Error in test endpoint: {e}")
        return {
            "success": False,
            "error": str(e)
        }

@app.post("/minimax/chat", response_model=MinimaxResponse)
async def minimax_chat_completion(request: MinimaxRequest):
    """
    Fake Minimax API endpoint for chat completions.
    
    This is a mock implementation that simulates the Minimax API behavior.
    In a real implementation, this would make actual API calls to Minimax services.
    """
    logger.info(f"=== MINIMAX API CALL ===")
    logger.info(f"Model: {request.model}")
    logger.info(f"Prompt: {request.prompt[:100]}...")
    logger.info(f"Temperature: {request.temperature}")
    logger.info(f"Max tokens: {request.max_tokens}")
    
    try:
        # Simulate API processing time
        await asyncio.sleep(random.uniform(0.5, 2.0))
        
        # Generate fake response based on prompt content
        fake_responses = {
            "video": "Based on the video content analysis, I can see this contains engaging moments with high viral potential. The key segments show strong emotional hooks and clear narrative structure.",
            "script": "Here's an optimized viral script: Hook: 'You won't believe what happens next!' Body: Build tension with quick cuts and dramatic pauses. Call-to-action: 'Follow for more amazing content!'",
            "analyze": "Analysis complete: Engagement score: 8.5/10. Viral potential: High. Key factors: Strong opening hook, emotional peaks at 15s and 45s, clear narrative arc.",
            "generate": "Generated content successfully. The output includes optimized timing, engaging transitions, and platform-specific formatting for maximum reach.",
            "default": "I understand your request. Here's a comprehensive response addressing your needs with actionable insights and recommendations."
        }
        
        # Select response based on prompt keywords
        response_text = fake_responses["default"]
        for keyword, response in fake_responses.items():
            if keyword.lower() in request.prompt.lower():
                response_text = response
                break
        
        # Simulate token usage
        prompt_tokens = len(request.prompt.split()) * 1.3  # Rough token estimation
        completion_tokens = len(response_text.split()) * 1.3
        total_tokens = prompt_tokens + completion_tokens
        
        # Create fake Minimax-style response
        fake_response = {
            "id": f"minimax_{int(time.time())}_{random.randint(1000, 9999)}",
            "object": "chat.completion",
            "created": int(time.time()),
            "model": request.model,
            "choices": [
                {
                    "index": 0,
                    "message": {
                        "role": "assistant",
                        "content": response_text
                    },
                    "finish_reason": "stop"
                }
            ],
            "usage": {
                "prompt_tokens": int(prompt_tokens),
                "completion_tokens": int(completion_tokens),
                "total_tokens": int(total_tokens)
            }
        }
        
        logger.info(f"Minimax API response generated successfully")
        logger.info(f"Total tokens used: {int(total_tokens)}")
        
        return MinimaxResponse(
            success=True,
            data=fake_response,
            usage=fake_response["usage"]
        )
        
    except Exception as e:
        logger.error(f"Error in Minimax API endpoint: {str(e)}")
        return MinimaxResponse(
            success=False,
            error=f"Minimax API error: {str(e)}"
        )

@app.post("/minimax/video-analysis")
async def minimax_video_analysis(video_data: dict):
    """
    Fake Minimax API endpoint for video analysis.
    
    This endpoint simulates video content analysis capabilities that Minimax might offer.
    """
    import asyncio
    import random
    import time
    
    logger.info(f"=== MINIMAX VIDEO ANALYSIS ===")
    logger.info(f"Video analysis request received")
    
    try:
        # Simulate processing time for video analysis
        await asyncio.sleep(random.uniform(1.0, 3.0))
        
        # Generate fake video analysis results
        fake_analysis = {
            "video_id": f"minimax_vid_{int(time.time())}",
            "analysis_timestamp": int(time.time()),
            "content_analysis": {
                "engagement_score": round(random.uniform(6.0, 9.5), 1),
                "viral_potential": random.choice(["High", "Medium", "Low"]),
                "emotion_detection": {
                    "dominant_emotions": random.sample(["excitement", "joy", "surprise", "curiosity", "inspiration"], 3),
                    "emotional_intensity": round(random.uniform(0.6, 0.95), 2)
                },
                "content_categories": random.sample(["entertainment", "educational", "lifestyle", "tech", "comedy"], 2),
                "key_moments": [
                    {
                        "timestamp": round(random.uniform(5, 15), 1),
                        "type": "hook",
                        "description": "Strong opening that captures attention",
                        "engagement_score": round(random.uniform(7.0, 9.0), 1)
                    },
                    {
                        "timestamp": round(random.uniform(20, 35), 1),
                        "type": "peak",
                        "description": "Emotional peak with high engagement potential",
                        "engagement_score": round(random.uniform(8.0, 9.5), 1)
                    },
                    {
                        "timestamp": round(random.uniform(45, 60), 1),
                        "type": "call_to_action",
                        "description": "Natural point for viewer action",
                        "engagement_score": round(random.uniform(6.5, 8.5), 1)
                    }
                ]
            },
            "optimization_suggestions": [
                "Consider trimming the opening to 3 seconds for better retention",
                "Add text overlay during the emotional peak moment",
                "Include trending audio for increased discoverability",
                "Optimize for vertical format (9:16 aspect ratio)"
            ],
            "processing_details": {
                "analysis_duration_seconds": round(random.uniform(1.5, 4.0), 2),
                "confidence_score": round(random.uniform(0.85, 0.98), 2),
                "model_version": "minimax-video-v2.1"
            }
        }
        
        logger.info(f"Video analysis completed successfully")
        logger.info(f"Engagement score: {fake_analysis['content_analysis']['engagement_score']}")
        
        return {
            "success": True,
            "analysis": fake_analysis,
            "message": "Video analysis completed successfully"
        }
        
    except Exception as e:
        logger.error(f"Error in Minimax video analysis: {str(e)}")
        return {
            "success": False,
            "error": f"Video analysis failed: {str(e)}"
        }

@app.get("/minimax/models")
async def minimax_list_models():
    """
    Fake Minimax API endpoint to list available models.
    """
    logger.info("Minimax models list requested")
    
    fake_models = {
        "data": [
            {
                "id": "abab6.5s-chat",
                "object": "model",
                "created": 1677610602,
                "owned_by": "minimax",
                "description": "Advanced conversational AI model optimized for chat applications"
            },
            {
                "id": "abab6.5g-chat",
                "object": "model", 
                "created": 1677610602,
                "owned_by": "minimax",
                "description": "General purpose chat model with balanced performance"
            },
            {
                "id": "minimax-video-v2",
                "object": "model",
                "created": 1677610602,
                "owned_by": "minimax",
                "description": "Video content analysis and processing model"
            },
            {
                "id": "minimax-text-embedding",
                "object": "model",
                "created": 1677610602,
                "owned_by": "minimax",
                "description": "Text embedding model for semantic similarity"
            }
        ],
        "object": "list"
    }
    
    return fake_models

@app.on_event("startup")
async def startup_event():
    logger.info("=== VIDEOTOSHORTS BACKEND STARTING UP ===")
    logger.info(f"Videos directory: {videos_dir}")
    logger.info(f"Environment variables:")
    logger.info(f"  GEMINI_API_KEY: {'Set' if os.getenv('GEMINI_API_KEY') else 'Not set'}")
    logger.info(f"  APIFY_TOKEN: {'Set' if os.getenv('APIFY_TOKEN') else 'Not set'}")
    logger.info("=== Fake Minimax API endpoints available ===")
    logger.info("  POST /minimax/chat - Chat completions")
    logger.info("  POST /minimax/video-analysis - Video content analysis") 
    logger.info("  GET /minimax/models - List available models")
    logger.info("=== STARTUP COMPLETE ===")

if __name__ == "__main__":
    logger.info("Starting VideoToShorts backend server...")
    uvicorn.run(app, host="0.0.0.0", port=8080, log_level="info")