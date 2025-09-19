#!/usr/bin/env python3
"""
Test script for AI-powered segment extraction functionality.

This script tests the segment extraction feature with sample data to ensure
the integration is working correctly before connecting the full pipeline.
"""

import os
import json
import sys
from typing import Dict, Any

# Add the current directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def create_sample_transcript() -> Dict[str, Any]:
    """Create a sample Gladia transcript result for testing"""
    return {
        "result": {
            "transcription": {
                "utterances": [
                    {
                        "text": "Welcome to today's video about artificial intelligence and machine learning!",
                        "start": 0.0,
                        "end": 4.5,
                        "speaker": 0,
                        "confidence": 0.95,
                        "words": []
                    },
                    {
                        "text": "Did you know that AI can now create videos that are almost indistinguishable from reality?",
                        "start": 4.5,
                        "end": 10.2,
                        "speaker": 0,
                        "confidence": 0.92,
                        "words": []
                    },
                    {
                        "text": "This is actually pretty scary when you think about it.",
                        "start": 10.2,
                        "end": 13.8,
                        "speaker": 0,
                        "confidence": 0.94,
                        "words": []
                    },
                    {
                        "text": "But let me show you the incredible benefits this technology brings to content creators.",
                        "start": 13.8,
                        "end": 19.5,
                        "speaker": 0,
                        "confidence": 0.96,
                        "words": []
                    },
                    {
                        "text": "First, you can generate shorts automatically from long-form content.",
                        "start": 19.5,
                        "end": 24.2,
                        "speaker": 0,
                        "confidence": 0.93,
                        "words": []
                    },
                    {
                        "text": "The AI analyzes your transcript and finds the most engaging moments.",
                        "start": 24.2,
                        "end": 29.1,
                        "speaker": 0,
                        "confidence": 0.95,
                        "words": []
                    },
                    {
                        "text": "What's amazing is that it can identify hooks, emotional peaks, and viral potential.",
                        "start": 29.1,
                        "end": 35.4,
                        "speaker": 0,
                        "confidence": 0.97,
                        "words": []
                    },
                    {
                        "text": "Let me share the secret technique that YouTubers don't want you to know.",
                        "start": 35.4,
                        "end": 41.2,
                        "speaker": 0,
                        "confidence": 0.94,
                        "words": []
                    },
                    {
                        "text": "The key is understanding your audience's attention span and psychology.",
                        "start": 41.2,
                        "end": 46.8,
                        "speaker": 0,
                        "confidence": 0.96,
                        "words": []
                    },
                    {
                        "text": "Most people scroll within the first 3 seconds if they're not hooked.",
                        "start": 46.8,
                        "end": 52.1,
                        "speaker": 0,
                        "confidence": 0.95,
                        "words": []
                    },
                    {
                        "text": "That's why your opening line is absolutely critical for viral success.",
                        "start": 52.1,
                        "end": 57.5,
                        "speaker": 0,
                        "confidence": 0.93,
                        "words": []
                    },
                    {
                        "text": "Now, here's something that will blow your mind about AI video generation.",
                        "start": 57.5,
                        "end": 63.2,
                        "speaker": 0,
                        "confidence": 0.92,
                        "words": []
                    },
                    {
                        "text": "The technology can now analyze emotions in real-time during processing.",
                        "start": 63.2,
                        "end": 68.9,
                        "speaker": 0,
                        "confidence": 0.94,
                        "words": []
                    },
                    {
                        "text": "This means it knows exactly when viewers are most engaged.",
                        "start": 68.9,
                        "end": 73.5,
                        "speaker": 0,
                        "confidence": 0.96,
                        "words": []
                    },
                    {
                        "text": "And that's how you create content that goes viral consistently.",
                        "start": 73.5,
                        "end": 78.2,
                        "speaker": 0,
                        "confidence": 0.95,
                        "words": []
                    }
                ],
                "full_transcript": "Welcome to today's video about artificial intelligence and machine learning! Did you know that AI can now create videos that are almost indistinguishable from reality? This is actually pretty scary when you think about it. But let me show you the incredible benefits this technology brings to content creators. First, you can generate shorts automatically from long-form content. The AI analyzes your transcript and finds the most engaging moments. What's amazing is that it can identify hooks, emotional peaks, and viral potential. Let me share the secret technique that YouTubers don't want you to know. The key is understanding your audience's attention span and psychology. Most people scroll within the first 3 seconds if they're not hooked. That's why your opening line is absolutely critical for viral success. Now, here's something that will blow your mind about AI video generation. The technology can now analyze emotions in real-time during processing. This means it knows exactly when viewers are most engaged. And that's how you create content that goes viral consistently."
            },
            "metadata": {
                "audio_duration": 78.2
            },
            "summarization": {
                "results": "This video discusses AI-powered video creation and content optimization techniques for creators, focusing on automatic shorts generation and viral content strategies."
            },
            "chapterization": {
                "results": []
            },
            "named_entity_recognition": {
                "results": []
            },
            "sentiment_analysis": {
                "results": []
            }
        }
    }

def test_segment_extraction_with_api():
    """Test segment extraction using the API"""
    print("🧪 Testing AI-Powered Segment Extraction")
    print("=" * 50)

    # Check if Gemini API key is available
    if not os.getenv('GEMINI_API_KEY'):
        print("❌ GEMINI_API_KEY environment variable not set")
        print("💡 Please set your Gemini API key to test the AI functionality")
        print("   export GEMINI_API_KEY='your_api_key_here'")
        return False

    try:
        from segment_extractor import get_ai_suggested_segments

        # Create sample transcript data
        sample_data = create_sample_transcript()
        print(f"📊 Sample transcript duration: {sample_data['result']['metadata']['audio_duration']} seconds")
        print(f"📝 Number of utterances: {len(sample_data['result']['transcription']['utterances'])}")

        # Test segment extraction
        print("\n🤖 Running AI analysis...")
        result = get_ai_suggested_segments(
            gladia_result=sample_data,
            target_duration=30,
            max_segments=3
        )

        if result["success"]:
            print("✅ AI analysis completed successfully!")
            print(f"📈 Analysis method: {result['analysis_method']}")
            print(f"🎯 Total suggestions: {result['total_suggestions']}")

            print("\n📋 Suggested Segments:")
            print("-" * 40)

            for i, segment in enumerate(result["suggested_segments"], 1):
                print(f"\n{i}. {segment['title']}")
                print(f"   ⏱️  Time: {segment['start_time']:.1f}s - {segment['end_time']:.1f}s ({segment['duration']:.1f}s)")
                print(f"   📊 Score: {segment['engagement_score']}/10")
                print(f"   🚀 Viral Potential: {segment['viral_potential']}")
                print(f"   💡 Reasoning: {segment['reasoning'][:100]}...")
                if segment.get('key_moment'):
                    print(f"   ⭐ Key Moment: {segment['key_moment'].get('description', 'N/A')}")
                print(f"   📄 Preview: {segment['text'][:150]}...")

        else:
            print("❌ AI analysis failed:")
            print(f"   Error: {result.get('error', 'Unknown error')}")
            return False

    except ImportError as e:
        print(f"❌ Import error: {e}")
        print("💡 Make sure all dependencies are installed: pip install -r requirements.txt")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False

    return True

def test_segment_extraction_fallback():
    """Test segment extraction fallback functionality"""
    print("\n🔄 Testing Fallback Functionality")
    print("=" * 50)

    try:
        from segment_extractor import IntelligentSegmentExtractor

        # Test without API key (should trigger fallback)
        extractor = IntelligentSegmentExtractor("fake_api_key")
        sample_data = create_sample_transcript()

        print("🤖 Running analysis with invalid API key (testing fallback)...")
        segments = extractor.extract_suggested_segments(sample_data, 30, 3)

        if segments:
            print("✅ Fallback functionality works!")
            print(f"📊 Generated {len(segments)} fallback segments")

            for i, segment in enumerate(segments, 1):
                print(f"\n{i}. Fallback Segment {segment.rank}")
                print(f"   ⏱️  Time: {segment.start_time:.1f}s - {segment.end_time:.1f}s")
                print(f"   📊 Score: {segment.engagement_score}")
                print(f"   💡 Reasoning: {segment.reasoning}")
        else:
            print("❌ Fallback failed to generate segments")
            return False

    except Exception as e:
        print(f"❌ Fallback test error: {e}")
        return False

    return True

def test_transcript_parsing():
    """Test transcript parsing functionality"""
    print("\n📄 Testing Transcript Parsing")
    print("=" * 50)

    try:
        from segment_extractor import IntelligentSegmentExtractor

        extractor = IntelligentSegmentExtractor("fake_api_key")
        sample_data = create_sample_transcript()

        # Test parsing
        segments = extractor.parse_gladia_transcript(sample_data)

        print(f"✅ Parsed {len(segments)} transcript segments")
        print(f"📊 Total duration: {max(seg.end for seg in segments):.1f} seconds")

        # Show first few segments
        for i, segment in enumerate(segments[:3]):
            print(f"\nSegment {i+1}:")
            print(f"   ⏱️  {segment.start:.1f}s - {segment.end:.1f}s")
            print(f"   🎤 Speaker: {segment.speaker}")
            print(f"   📊 Confidence: {segment.confidence:.2f}")
            print(f"   📝 Text: {segment.text[:100]}...")

        # Test insights extraction
        insights = extractor.extract_video_insights(sample_data)
        print(f"\n📈 Extracted insights:")
        print(f"   📝 Summary: {insights['summary'][:100]}...")
        print(f"   ⏱️  Duration: {insights['duration']} seconds")

        return True

    except Exception as e:
        print(f"❌ Parsing test error: {e}")
        return False

def main():
    """Run all tests"""
    print("🚀 VideoToShorts AI Segment Extraction Test Suite")
    print("=" * 60)

    tests_passed = 0
    total_tests = 3

    # Test 1: Transcript Parsing
    if test_transcript_parsing():
        tests_passed += 1

    # Test 2: Fallback Functionality
    if test_segment_extraction_fallback():
        tests_passed += 1

    # Test 3: AI Analysis (requires API key)
    if test_segment_extraction_with_api():
        tests_passed += 1

    # Results
    print("\n" + "=" * 60)
    print(f"📊 Test Results: {tests_passed}/{total_tests} tests passed")

    if tests_passed == total_tests:
        print("🎉 All tests passed! The AI segment extraction is ready to use.")
    elif tests_passed >= 2:
        print("✅ Core functionality works. Set GEMINI_API_KEY for full AI features.")
    else:
        print("❌ Some tests failed. Please check the error messages above.")

    print("\n💡 Next steps:")
    print("   1. Set your GEMINI_API_KEY environment variable")
    print("   2. Start the backend server: python main.py")
    print("   3. Test the /suggest_segments API endpoint")
    print("   4. Connect your frontend to the new AI features")

if __name__ == "__main__":
    main()
