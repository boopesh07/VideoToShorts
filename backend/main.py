from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any
import uvicorn
import os
from dotenv import load_dotenv
from apify_client import ApifyClient

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