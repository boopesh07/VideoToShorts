import os
import json
from typing import Dict, List, Any, Optional
from dataclasses import dataclass
import google.generativeai as genai
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class TranscriptSegment:
    """Represents a segment of the transcript with timing information"""
    text: str
    start: float
    end: float
    speaker: int
    confidence: float
    words: List[Dict[str, Any]]

@dataclass
class SuggestedSegment:
    """Represents an AI-suggested segment for shorts generation"""
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

class IntelligentSegmentExtractor:
    """AI-powered segment extraction using Gemini API"""

    def __init__(self, gemini_api_key: str):
        """Initialize the segment extractor with Gemini API key"""
        self.gemini_api_key = gemini_api_key
        genai.configure(api_key=gemini_api_key)
        self.model = genai.GenerativeModel('gemini-1.5-flash')

    def parse_gladia_transcript(self, gladia_result: Dict[str, Any]) -> List[TranscriptSegment]:
        """Parse Gladia API transcript result into structured segments"""
        try:
            transcription = gladia_result.get('result', {}).get('transcription', {})
            utterances = transcription.get('utterances', [])

            segments = []
            for utterance in utterances:
                segment = TranscriptSegment(
                    text=utterance.get('text', ''),
                    start=utterance.get('start', 0),
                    end=utterance.get('end', 0),
                    speaker=utterance.get('speaker', 0),
                    confidence=utterance.get('confidence', 0),
                    words=utterance.get('words', [])
                )
                segments.append(segment)

            return segments

        except Exception as e:
            logger.error(f"Error parsing Gladia transcript: {e}")
            raise ValueError(f"Invalid transcript format: {e}")

    def extract_video_insights(self, gladia_result: Dict[str, Any]) -> Dict[str, Any]:
        """Extract insights from the full Gladia result"""
        result = gladia_result.get('result', {})

        insights = {
            'summary': result.get('summarization', {}).get('results', ''),
            'chapters': result.get('chapterization', {}).get('results', []),
            'entities': result.get('named_entity_recognition', {}).get('results', []),
            'sentiment': result.get('sentiment_analysis', {}).get('results', []),
            'duration': result.get('metadata', {}).get('audio_duration', 0),
            'full_transcript': result.get('transcription', {}).get('full_transcript', '')
        }

        return insights

    def create_segment_extraction_prompt(self, insights: Dict[str, Any], segments: List[TranscriptSegment], target_duration: int = 30, max_segments: int = 5) -> str:
        """Create prompt for finding the best segments from existing transcript"""

        # Create a condensed view of all segments for analysis
        segment_summary = []
        for i, segment in enumerate(segments):
            segment_summary.append({
                "index": i,
                "text": segment.text,
                "start": segment.start,
                "end": segment.end,
                "duration": segment.end - segment.start,
                "speaker": segment.speaker
            })

        prompt = f"""
You are an expert content strategist specializing in identifying the most engaging segments from video transcripts for short-form content creation.

UNDERSTANDING THE DATA STRUCTURE:
You are working with a Gladia API response that contains video transcription data. You need to analyze it to find the best {target_duration}-second segments.

The data structure is:
- Original video duration: {insights['duration']} seconds (about {insights['duration']/60:.1f} minutes)
- Video summary: {insights['summary']}
- The video has been transcribed into {len(segments)} individual utterances/segments
- Each segment has precise timestamps (start/end times) from the original video
- Speakers are identified by numbers (0, 1, 2, etc.)

TRANSCRIPT SEGMENTS TO ANALYZE:
{json.dumps(segment_summary[:50], indent=2)}
{'...(showing first 50 segments - there are ' + str(len(segments)) + ' total segments)' if len(segments) > 50 else ''}

YOUR MISSION:
Find the TOP {max_segments} best {target_duration}-second continuous windows from this transcript that would make the most engaging standalone short videos. You are looking for existing content, not creating new content. Each segment should be distinct and non-overlapping.

EVALUATION CRITERIA:

1. HOOK STRENGTH (High Priority):
   - Look for segments that start with attention-grabbing statements
   - Questions that make viewers curious
   - Surprising facts or counterintuitive claims
   - Strong emotional moments or revelations

2. CONTENT COMPLETENESS:
   - The segment should tell a complete mini-story or make a complete point
   - Avoid cutting off mid-sentence or mid-thought
   - Should be understandable without needing context from earlier in the video
   - Look for natural beginning and ending points

3. ENGAGEMENT POTENTIAL:
   - Moments that would make viewers want to comment or share
   - Practical advice or actionable insights
   - Relatable situations or problems
   - Quotable moments or memorable phrases

4. TECHNICAL REQUIREMENTS:
   - Must be continuous (no gaps in the timeline)
   - Duration should be {target_duration} seconds (±3 seconds is acceptable)
   - Combine multiple adjacent segments if needed to reach the target duration
   - Respect natural speech patterns and pauses

ANALYSIS PROCESS:
1. Scan through all segments looking for strong opening hooks
2. For each potential starting point, calculate how many continuous segments would fit in {target_duration} seconds
3. Evaluate the content quality and engagement potential of each possible {target_duration}-second window
4. Choose the TOP {max_segments} segments with the highest overall engagement scores, ensuring they don't overlap

REQUIRED JSON RESPONSE FORMAT:
{{
    "viral_segments": [
        {{
            "rank": 1,
            "start_time": 123.45,
            "end_time": 153.45,
            "duration": 30.0,
            "text": "The complete, exact transcript text from all included segments combined",
            "segments_included": [5, 6, 7, 8, 9],
            "reasoning": "Detailed explanation of why this specific segment was chosen - mention the hook, content quality, and engagement factors",
            "engagement_score": 8.7,
            "viral_potential": "High - contains surprising insight that challenges common assumptions",
            "key_moment": {{
                "timestamp": 135.2,
                "description": "The most impactful moment in this segment that drives engagement"
            }}
        }},
        {{
            "rank": 2,
            "start_time": 234.1,
            "end_time": 264.1,
            "duration": 30.0,
            "text": "The complete transcript text for the second-best segment",
            "segments_included": [12, 13, 14],
            "reasoning": "Why this was the second-best option",
            "engagement_score": 7.9,
            "viral_potential": "High - strong emotional hook",
            "key_moment": {{
                "timestamp": 245.3,
                "description": "Peak emotional moment"
            }}
        }}
    ]
}}

CRITICAL REMINDERS:
- You are extracting existing content, not generating new content
- The text must be exactly what was said in the video (from the transcript)
- Timestamps must correspond to the actual video timeline
- The selected segment must flow naturally and be coherent
- Prioritize segments that work as standalone content without requiring context
- Return EXACTLY {max_segments} segments, ranked by engagement potential
"""

        return prompt

    def extract_suggested_segments(self, gladia_result: Dict[str, Any], target_duration: int = 30, max_segments: int = 5) -> List[SuggestedSegment]:
        """Extract the best segments from the transcript using Gemini API"""
        try:
            # Parse transcript segments
            segments = self.parse_gladia_transcript(gladia_result)
            insights = self.extract_video_insights(gladia_result)

            if not segments:
                raise ValueError("No transcript segments found")

            # Create the segment extraction prompt
            prompt = self.create_segment_extraction_prompt(insights, segments, target_duration, max_segments)

            # Analyze segments using Gemini
            logger.info(f"Analyzing transcript segments with Gemini API for {max_segments} suggestions...")

            try:
                response = self.model.generate_content(prompt)
                response_text = response.text.strip()
            except Exception as e:
                logger.error(f"Gemini API error: {e}")
                return self._fallback_segment_selection(segments, target_duration, max_segments)

            # Parse the JSON response
            # Clean up the response to extract JSON
            if "```json" in response_text:
                json_start = response_text.find("```json") + 7
                json_end = response_text.find("```", json_start)
                response_text = response_text[json_start:json_end].strip()
            elif "```" in response_text:
                json_start = response_text.find("```") + 3
                json_end = response_text.find("```", json_start)
                response_text = response_text[json_start:json_end].strip()

            try:
                segment_data = json.loads(response_text)

                if "viral_segments" not in segment_data:
                    raise ValueError("Invalid response format")

                suggested_segments = []
                for seg_data in segment_data["viral_segments"]:
                    suggested_segment = SuggestedSegment(
                        rank=seg_data.get("rank", 0),
                        start_time=seg_data.get("start_time", 0),
                        end_time=seg_data.get("end_time", target_duration),
                        duration=seg_data.get("duration", target_duration),
                        text=seg_data.get("text", ""),
                        segments_included=seg_data.get("segments_included", []),
                        reasoning=seg_data.get("reasoning", ""),
                        engagement_score=seg_data.get("engagement_score", 7.0),
                        viral_potential=seg_data.get("viral_potential", "Medium"),
                        key_moment=seg_data.get("key_moment", {})
                    )
                    suggested_segments.append(suggested_segment)

                logger.info(f"Successfully extracted {len(suggested_segments)} AI-suggested segments")
                return suggested_segments

            except json.JSONDecodeError as e:
                logger.warning(f"Failed to parse JSON response: {e}")
                return self._fallback_segment_selection(segments, target_duration, max_segments)

        except Exception as e:
            logger.error(f"Error extracting suggested segments: {e}")
            return self._fallback_segment_selection(segments, target_duration, max_segments)

    def _fallback_segment_selection(self, segments: List[TranscriptSegment], target_duration: int, max_segments: int) -> List[SuggestedSegment]:
        """Fallback method to select segments when AI parsing fails"""
        if not segments:
            return []

        fallback_segments = []

        # Simple heuristic: find segments with good text content spread across the video
        total_duration = max([seg.end for seg in segments]) if segments else target_duration

        # Create segments at different intervals
        intervals = []
        if max_segments == 1:
            intervals = [0]
        elif max_segments == 2:
            intervals = [0, total_duration * 0.5]
        else:
            step = total_duration / max_segments
            intervals = [i * step for i in range(max_segments)]

        for i, start_offset in enumerate(intervals):
            if i >= max_segments:
                break

            # Find segments that fit in this time window
            segment_start = start_offset
            segment_end = min(segment_start + target_duration, total_duration)

            combined_text = ""
            segments_included = []

            for j, segment in enumerate(segments):
                if segment_start <= segment.start < segment_end:
                    combined_text += " " + segment.text
                    segments_included.append(j)

            if combined_text.strip():
                suggested_segment = SuggestedSegment(
                    rank=i + 1,
                    start_time=segment_start,
                    end_time=segment_end,
                    duration=segment_end - segment_start,
                    text=combined_text.strip(),
                    segments_included=segments_included,
                    reasoning=f"Fallback selection - segment {i+1} with {len(combined_text.split())} words",
                    engagement_score=6.0,
                    viral_potential="Medium - fallback selection",
                    key_moment={"timestamp": segment_start + (segment_end - segment_start) / 2, "description": "Mid-segment"}
                )
                fallback_segments.append(suggested_segment)

        logger.info(f"Generated {len(fallback_segments)} fallback segments")
        return fallback_segments

# Utility functions
def create_segment_extractor() -> IntelligentSegmentExtractor:
    """Factory function to create IntelligentSegmentExtractor instance"""
    api_key = os.getenv('GEMINI_API_KEY')
    if not api_key:
        raise ValueError("GEMINI_API_KEY environment variable is required")

    return IntelligentSegmentExtractor(api_key)

def get_ai_suggested_segments(gladia_result: Dict[str, Any], target_duration: int = 30, max_segments: int = 5) -> Dict[str, Any]:
    """Main function to get AI-suggested segments from transcript"""
    try:
        extractor = create_segment_extractor()
        suggested_segments = extractor.extract_suggested_segments(gladia_result, target_duration, max_segments)

        # Convert to API response format
        segments_data = []
        for segment in suggested_segments:
            segments_data.append({
                "rank": segment.rank,
                "start_time": segment.start_time,
                "end_time": segment.end_time,
                "duration": segment.duration,
                "text": segment.text,
                "segments_included": segment.segments_included,
                "reasoning": segment.reasoning,
                "engagement_score": segment.engagement_score,
                "viral_potential": segment.viral_potential,
                "key_moment": segment.key_moment,
                "title": f"AI Suggested Segment {segment.rank}"
            })

        return {
            "success": True,
            "suggested_segments": segments_data,
            "total_suggestions": len(segments_data),
            "target_duration": target_duration,
            "analysis_method": "ai_powered" if len(segments_data) > 0 else "fallback"
        }

    except Exception as e:
        logger.error(f"Error in get_ai_suggested_segments: {e}")
        return {
            "success": False,
            "error": str(e),
            "suggested_segments": [],
            "total_suggestions": 0
        }
