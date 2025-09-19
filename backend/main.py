from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn

app = FastAPI(title="VideoToShorts Backend", version="1.0.0")

# Configure CORS to allow frontend connections
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Next.js default port
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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