# VideoToShorts

An intelligent video creation assistant that transforms long-form videos into optimized, trend-driven short-form content using AI-powered analysis and automation.

## Overview

VideoToShorts streamlines the video creation workflow by automatically analyzing trending content, generating optimized scripts, and assembling new videos from existing footage. The platform leverages AI to help content creators produce engaging videos with greater efficiency and data-driven confidence.

## Key Features

- **Video Upload & Transcription**: Upload videos and automatically generate word-by-word transcripts with precise timestamps
- **Trend Analysis**: AI-powered analysis of trending topics and keywords from platforms like YouTube and TikTok
- **Smart Script Generation**: Generate optimized scripts based on original content and trending data
- **Automated Video Assembly**: Automatically clip and stitch video segments based on new scripts using ffmpeg
- **B-Roll Integration**: Generate and insert custom B-roll footage using AI video generation APIs
- **Multi-format Support**: Compatible with common video formats (MP4, MOV, AVI)

## Target Users

- **Content Creators**: YouTubers and social media creators looking to produce more content efficiently
- **Social Media Managers**: Professionals managing multiple accounts who need high-volume content creation
- **Small Business Owners**: Entrepreneurs wanting to leverage video marketing without technical expertise

## Architecture

### Frontend (Next.js)
- React-based user interface
- File upload and URL processing
- Real-time transcription display
- Script editing and review interface

### Backend (FastAPI/Python)
- Video processing and transcription
- Trend analysis and keyword extraction
- AI-powered script generation
- Automated video assembly
- B-roll generation integration

## Getting Started

### Prerequisites
- Node.js (for frontend)
- Python 3.8+ (for backend)
- ffmpeg (for video processing)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/VideoToShorts.git
   cd VideoToShorts
   ```

2. **Setup Backend**
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt

   # Create .env file with required API keys
   cp .env.example .env
   # Edit .env with your API keys
   ```

3. **Setup Frontend**
   ```bash
   cd frontend
   npm install

   # Create environment file
   cp .env.example .env.local
   # Edit .env.local with your configuration
   ```

### Running the Application

1. **Start the Backend**
   ```bash
   cd backend
   source venv/bin/activate
   uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```

2. **Start the Frontend**
   ```bash
   cd frontend
   npm run dev
   ```

The application will be available at `http://localhost:3000`

## API Keys Required

- **Gladia API**: For video transcription with word-level timestamps
- **Apify Client**: For trend analysis and social media data gathering
- **Google GenAI**: For AI-powered script generation
- **MiniMax API**: For B-roll video generation (optional)

## User Workflow

1. **Upload**: Upload a long-form video or provide a URL
2. **Transcription**: System automatically transcribes with word-level timestamps
3. **Analysis**: AI analyzes content and identifies trending keywords
4. **Script Generation**: AI generates optimized script based on trends
5. **Review & Edit**: User reviews and refines the generated script
6. **Video Assembly**: System automatically clips and assembles new video
7. **B-Roll Integration**: Add custom B-roll footage at specified points
8. **Preview & Download**: Preview final video and download

## Technology Stack

- **Frontend**: Next.js, React, TypeScript
- **Backend**: FastAPI, Python
- **Video Processing**: ffmpeg, yt-dlp
- **AI/ML**: Google GenAI, Gladia AI
- **Data Sources**: Apify (social media trends)

## Development Scripts

### Frontend
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run diagnose` - Check setup and configuration
- `npm run test:gladia-fix` - Test API connections

### Backend
- `uvicorn main:app --reload` - Start development server
- `python -m pytest` - Run tests (when available)

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## Future Roadmap (V2.0)

- Multi-platform optimization (YouTube Shorts, TikTok, Instagram Reels)
- Automated title and description generation
- Advanced video editing features (transitions, text overlays)
- Performance analytics for published videos
- Batch processing capabilities

## Success Metrics

- User adoption and retention rates
- Video processing efficiency and accuracy
- User satisfaction scores
- Content performance improvements

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support, please open an issue on GitHub or contact the development team.