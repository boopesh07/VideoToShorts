# VideoToShorts Backend

This backend service provides intelligent video-to-shorts generation using AI-powered segment extraction.

## Features

- **AI-Powered Segment Analysis**: Uses Google's Gemini API to analyze video transcripts and identify the most engaging segments
- **YouTube Video Processing**: Downloads and processes YouTube videos for shorts generation
- **Multiple Segment Suggestions**: Provides ranked suggestions with engagement scores and viral potential
- **Custom Segment Support**: Allows manual segment specification as fallback
- **Video Preview & Download**: Streams generated shorts for preview and download

## Setup

### Prerequisites

- Python 3.8+
- FFmpeg (for video processing)
- Google Gemini API key
- Apify API key (for viral video analysis)

### Installation

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Install FFmpeg:
   - **macOS**: `brew install ffmpeg`
   - **Ubuntu**: `sudo apt install ffmpeg`
   - **Windows**: Download from https://ffmpeg.org/

3. Set up environment variables:
```bash
# Create .env file in backend directory
GEMINI_API_KEY=your_gemini_api_key_here
APIFY_TOKEN=your_apify_token_here
```

### Getting API Keys

1. **Gemini API Key**:
   - Go to [Google AI Studio](https://makersuite.google.com/)
   - Create a new project or select existing one
   - Generate an API key
   - Copy the key to your `.env` file

2. **Apify Token** (for viral video analysis):
   - Sign up at [Apify](https://apify.com/)
   - Go to Settings → Integrations → API tokens
   - Copy your token to `.env` file

### Running the Server

```bash
python main.py
```

The server will start on http://localhost:8080

## API Endpoints

### Core Endpoints

- `POST /suggest_segments` - Get AI-suggested video segments
- `POST /generate_shorts` - Generate shorts from segments  
- `GET /download_short/{filename}` - Download generated short
- `GET /preview_short/{filename}` - Stream short for preview

### Segment Suggestion

The AI segment extraction analyzes your transcript using these criteria:

1. **Hook Strength**: Attention-grabbing openings, questions, surprising facts
2. **Content Completeness**: Self-contained segments that tell a complete story
3. **Engagement Potential**: Shareable moments, practical advice, quotable content
4. **Technical Quality**: Proper duration, natural speech flow

### Example Request

```json
{
  "transcript_data": {
    "result": {
      "transcription": {
        "utterances": [
          {
            "text": "Today I'll show you an incredible AI trick...",
            "start": 0.0,
            "end": 3.5,
            "speaker": 0,
            "confidence": 0.95
          }
        ]
      },
      "metadata": {
        "audio_duration": 300.0
      }
    }
  },
  "target_duration": 30,
  "max_segments": 5
}
```

### Example Response

```json
{
  "success": true,
  "suggested_segments": [
    {
      "rank": 1,
      "start_time": 45.2,
      "end_time": 75.8,
      "duration": 30.6,
      "text": "The complete transcript text for this segment...",
      "reasoning": "Strong hook with surprising claim that challenges assumptions...",
      "engagement_score": 8.7,
      "viral_potential": "High",
      "key_moment": {
        "timestamp": 58.3,
        "description": "Peak moment of revelation"
      }
    }
  ],
  "total_suggestions": 5,
  "analysis_method": "ai_powered"
}
```

## Architecture

- **main.py**: FastAPI application with all endpoints
- **segment_extractor.py**: AI-powered segment analysis using Gemini
- **video_processor.py**: Video downloading and shorts generation
- **requirements.txt**: Python dependencies

## Troubleshooting

### Common Issues

1. **FFmpeg not found**: Install FFmpeg and ensure it's in your PATH
2. **Gemini API errors**: Check your API key and quota limits
3. **Video download fails**: Ensure yt-dlp is up to date
4. **Segment extraction fails**: Fallback logic will provide basic segments

### Logs

Check console output for detailed error messages and processing steps. The application logs all major operations including:
- Transcript parsing
- AI analysis requests
- Video processing steps
- Error conditions

## Development

To extend the segment extraction:

1. Modify the prompt in `segment_extractor.py` to adjust AI analysis criteria
2. Update scoring algorithms for different content types
3. Add new engagement metrics or viral indicators
4. Implement caching for repeated transcript analysis

## Performance Notes

- Initial video download may take 30-60 seconds depending on video length
- AI analysis typically takes 5-10 seconds per transcript
- Short generation is fast once video is downloaded (~2-5 seconds per short)
- Gemini API has rate limits - consider implementing retry logic for production use