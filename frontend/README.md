# Video Transcription App

A Next.js app for transcribing audio/video files using Gladia AI.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create `.env.local`:
   ```
   GLADIA_API_KEY=your_api_key_here
   ```

3. Run the app:
   ```bash
   npm run dev
   ```

## Usage

- Upload files or paste URLs
- Get transcripts with timestamps, speakers, and AI analysis
- Download results

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run diagnose` - Check setup
- `npm run test:gladia-fix` - Test API connection