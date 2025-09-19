#!/usr/bin/env python3
"""
Test script for the /suggest_segments endpoint
"""

import json
import requests
import sys

# Sample transcript data for testing
SAMPLE_TRANSCRIPT_DATA = {
    "result": {
        "transcription": {
            "utterances": [
                {
                    "text": "Welcome to today's video about artificial intelligence!",
                    "start": 0.0,
                    "end": 4.5,
                    "speaker": 0,
                    "confidence": 0.95,
                    "words": []
                },
                {
                    "text": "Did you know that AI can now create videos that look completely real?",
                    "start": 4.5,
                    "end": 9.2,
                    "speaker": 0,
                    "confidence": 0.92,
                    "words": []
                },
                {
                    "text": "This is actually pretty scary when you think about it.",
                    "start": 9.2,
                    "end": 12.8,
                    "speaker": 0,
                    "confidence": 0.94,
                    "words": []
                },
                {
                    "text": "But let me show you how this technology can help content creators.",
                    "start": 12.8,
                    "end": 17.5,
                    "speaker": 0,
                    "confidence": 0.96,
                    "words": []
                },
                {
                    "text": "First, you can automatically generate shorts from long videos.",
                    "start": 17.5,
                    "end": 22.2,
                    "speaker": 0,
                    "confidence": 0.93,
                    "words": []
                },
                {
                    "text": "The AI finds the most engaging moments for you.",
                    "start": 22.2,
                    "end": 26.1,
                    "speaker": 0,
                    "confidence": 0.95,
                    "words": []
                }
            ],
            "full_transcript": "Welcome to today's video about artificial intelligence! Did you know that AI can now create videos that look completely real? This is actually pretty scary when you think about it. But let me show you how this technology can help content creators. First, you can automatically generate shorts from long videos. The AI finds the most engaging moments for you."
        },
        "metadata": {
            "audio_duration": 26.1
        },
        "summarization": {
            "results": "Video about AI video creation technology for content creators."
        }
    }
}

def test_suggest_segments_endpoint():
    """Test the /suggest_segments endpoint"""
    print("🧪 Testing /suggest_segments endpoint")
    print("=" * 50)

    url = "http://localhost:8080/suggest_segments"

    payload = {
        "transcript_data": SAMPLE_TRANSCRIPT_DATA,
        "target_duration": 30,
        "max_segments": 3
    }

    try:
        print(f"📡 Making POST request to: {url}")
        print(f"📦 Payload size: {len(json.dumps(payload))} characters")

        response = requests.post(
            url,
            headers={"Content-Type": "application/json"},
            json=payload,
            timeout=30
        )

        print(f"📊 Response status code: {response.status_code}")
        print(f"📋 Response headers: {dict(response.headers)}")

        if response.status_code == 200:
            print("✅ Request successful!")
            data = response.json()

            print(f"🎯 Success: {data.get('success', False)}")
            print(f"📊 Total suggestions: {data.get('total_suggestions', 0)}")
            print(f"🔧 Analysis method: {data.get('analysis_method', 'unknown')}")

            if data.get('suggested_segments'):
                print(f"\n📋 Suggested segments:")
                for i, segment in enumerate(data['suggested_segments'], 1):
                    print(f"  {i}. {segment.get('title', 'Untitled')}")
                    print(f"     ⏱️  {segment.get('start_time', 0):.1f}s - {segment.get('end_time', 0):.1f}s")
                    print(f"     📊 Score: {segment.get('engagement_score', 0)}")
                    print(f"     🚀 Potential: {segment.get('viral_potential', 'Unknown')}")

        else:
            print("❌ Request failed!")
            print(f"🔍 Response text: {response.text}")

            try:
                error_data = response.json()
                print(f"📋 Error details: {error_data}")
            except:
                print("📋 Could not parse error response as JSON")

    except requests.exceptions.ConnectionError:
        print("❌ Connection error - is the backend server running?")
        print("💡 Try: cd backend && python main.py")

    except requests.exceptions.Timeout:
        print("❌ Request timeout - server might be processing")

    except Exception as e:
        print(f"❌ Unexpected error: {e}")

def test_backend_health():
    """Test if backend is running"""
    print("🔍 Testing backend health")
    print("-" * 30)

    try:
        response = requests.get("http://localhost:8080/health", timeout=5)
        if response.status_code == 200:
            print("✅ Backend is running")
            data = response.json()
            print(f"📊 Status: {data.get('status')}")
            print(f"💬 Message: {data.get('message')}")
            return True
        else:
            print(f"❌ Backend health check failed: {response.status_code}")
            return False

    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to backend - is it running on port 8080?")
        return False
    except Exception as e:
        print(f"❌ Health check error: {e}")
        return False

def check_environment():
    """Check environment setup"""
    print("🔧 Checking environment")
    print("-" * 30)

    try:
        import google.generativeai as genai
        print("✅ google-generativeai library installed")
    except ImportError:
        print("❌ google-generativeai library not found")
        print("💡 Install with: pip install google-generativeai")
        return False

    import os
    if os.getenv('GEMINI_API_KEY'):
        print("✅ GEMINI_API_KEY environment variable set")
    else:
        print("⚠️  GEMINI_API_KEY not set - will use fallback method")
        print("💡 Get key at: https://aistudio.google.com/app/apikey")

    return True

if __name__ == "__main__":
    print("🚀 VideoToShorts Endpoint Test")
    print("=" * 60)

    # Step 1: Check environment
    if not check_environment():
        sys.exit(1)

    print()

    # Step 2: Check backend health
    if not test_backend_health():
        sys.exit(1)

    print()

    # Step 3: Test the endpoint
    test_suggest_segments_endpoint()

    print("\n" + "=" * 60)
    print("🏁 Test completed!")
