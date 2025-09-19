"""
VideoToShorts - Video Processing Module
Generates viral 30-second scripts from video transcripts using Google's Gemini API
"""

import os
import json
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass
from google import genai
from google.genai import types
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
class ViralScript:
    """Represents a generated viral script"""
    title: str
    script_segments: List[Dict[str, Any]]
    total_duration: float
    hook: str
    call_to_action: str
    key_moments: List[Dict[str, Any]]
    viral_score: float
    reasoning: str

class VideoProcessor:
    """Main class for processing video transcripts and generating viral scripts"""
    
    def __init__(self, gemini_api_key: str):
        """Initialize the VideoProcessor with Gemini API key"""
        self.gemini_api_key = gemini_api_key
        self.client = genai.Client(api_key=gemini_api_key)
        
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
    
    def create_segment_extraction_prompt(self, insights: Dict[str, Any], segments: List[TranscriptSegment], target_duration: int = 30) -> str:
        """Create prompt for finding the best segment from existing transcript"""

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
You are working with a Gladia API response that contains video transcription data. The frontend will send this data to our backend, and you need to analyze it to find the best 30-second segment.

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
Find the TOP 3 best {target_duration}-second continuous windows from this transcript that would make the most engaging standalone short videos. You are looking for existing content, not creating new content. Each segment should be distinct and non-overlapping.

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
4. Choose the TOP 3 segments with the highest overall engagement scores, ensuring they don't overlap

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
        }},
        {{
            "rank": 3,
            "start_time": 456.7,
            "end_time": 486.7,
            "duration": 30.0,
            "text": "The complete transcript text for the third-best segment",
            "segments_included": [25, 26, 27],
            "reasoning": "Third-best alternative segment with good viral potential",
            "engagement_score": 7.2,
            "viral_potential": "Medium-High - practical advice segment",
            "key_moment": {{
                "timestamp": 470.1,
                "description": "Key actionable insight"
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
"""

        return prompt
    
    def extract_best_segment(self, gladia_result: Dict[str, Any], target_duration: int = 30) -> Dict[str, Any]:
        """Extract the best segment from the transcript using Gemini API"""
        try:
            # Parse transcript segments
            segments = self.parse_gladia_transcript(gladia_result)
            insights = self.extract_video_insights(gladia_result)

            # Create the segment extraction prompt
            prompt = self.create_segment_extraction_prompt(insights, segments, target_duration)

            # Analyze segments using Gemini
            logger.info("Analyzing transcript segments with Gemini API...")

            response = self.client.models.generate_content(
                model="gemini-2.0-flash",
                contents=prompt,
                config=types.GenerateContentConfig(
                    temperature=0.3,  # Lower temperature for more analytical response
                    top_p=0.8,
                    max_output_tokens=1024,
                    thinking_config=types.ThinkingConfig(thinking_budget=0)
                )
            )

            # Parse the JSON response
            response_text = response.text.strip()

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
                # Convert new format to legacy format for backward compatibility
                if "viral_segments" in segment_data and len(segment_data["viral_segments"]) > 0:
                    best_segment = segment_data["viral_segments"][0]  # Get the top-ranked segment
                    segment_data = {
                        "selected_segment": {
                            "start_time": best_segment["start_time"],
                            "end_time": best_segment["end_time"],
                            "duration": best_segment["duration"],
                            "text": best_segment["text"],
                            "segments_included": best_segment["segments_included"],
                            "reasoning": best_segment["reasoning"]
                        },
                        "engagement_score": best_segment["engagement_score"],
                        "viral_potential": best_segment["viral_potential"],
                        "key_moment": best_segment.get("key_moment", {}),
                        "alternative_segments": [
                            {
                                "start_time": seg["start_time"],
                                "end_time": seg["end_time"],
                                "reasoning": seg["reasoning"]
                            } for seg in segment_data["viral_segments"][1:]  # Other segments as alternatives
                        ],
                        "all_viral_segments": segment_data["viral_segments"]  # Store all 3 segments
                    }
            except json.JSONDecodeError:
                logger.warning("Failed to parse JSON, using fallback segment selection")
                segment_data = self._fallback_segment_selection(segments, target_duration)

            logger.info(f"Successfully extracted segment: {segment_data.get('selected_segment', {}).get('start_time', 0)}-{segment_data.get('selected_segment', {}).get('end_time', 0)}")
            return segment_data

        except Exception as e:
            logger.error(f"Error extracting best segment: {e}")
            raise RuntimeError(f"Failed to extract best segment: {e}")

    def generate_viral_script(self, gladia_result: Dict[str, Any], target_duration: int = 30) -> ViralScript:
        """Generate a viral script by extracting the best segment from transcript"""
        try:
            # Extract the best segment
            segment_data = self.extract_best_segment(gladia_result, target_duration)
            selected_segment = segment_data.get('selected_segment', {})

            # Create ViralScript object from extracted segment
            viral_script = ViralScript(
                title=f"Best {target_duration}s Segment",
                script_segments=[{
                    "text": selected_segment.get('text', ''),
                    "start_time": selected_segment.get('start_time', 0),
                    "end_time": selected_segment.get('end_time', target_duration),
                    "purpose": "extracted_segment",
                    "segments_included": selected_segment.get('segments_included', [])
                }],
                total_duration=selected_segment.get('duration', target_duration),
                hook=selected_segment.get('text', '')[:100] + '...' if len(selected_segment.get('text', '')) > 100 else selected_segment.get('text', ''),
                call_to_action="",
                key_moments=[{
                    "timestamp": segment_data.get('key_moment', {}).get('timestamp', 0),
                    "description": segment_data.get('key_moment', {}).get('description', 'Key moment in segment')
                }] if segment_data.get('key_moment') else [],
                viral_score=segment_data.get('engagement_score', 7.0),
                reasoning=selected_segment.get('reasoning', 'AI-selected best segment from transcript')
            )

            # Add segment-specific metadata
            viral_script.extracted_segment = selected_segment
            viral_script.viral_potential = segment_data.get('viral_potential', 'Medium')
            viral_script.alternative_segments = segment_data.get('alternative_segments', [])

            logger.info(f"Successfully created viral script from extracted segment")
            return viral_script

        except Exception as e:
            logger.error(f"Error generating viral script: {e}")
            raise RuntimeError(f"Failed to generate viral script: {e}")
    
    def _fallback_segment_selection(self, segments: List[TranscriptSegment], target_duration: int) -> Dict[str, Any]:
        """Fallback method to select best segment when AI parsing fails"""
        if not segments:
            return {
                "selected_segment": {
                    "start_time": 0,
                    "end_time": target_duration,
                    "duration": target_duration,
                    "text": "No transcript available",
                    "segments_included": [],
                    "reasoning": "Fallback selection - no segments available"
                },
                "engagement_score": 5.0
            }

        # Simple heuristic: find segment with longest continuous text that fits duration
        best_segment = None
        best_score = 0

        for i in range(len(segments)):

            current_duration = 0
            combined_text = ""
            segments_included = []

            for j in range(i, len(segments)):
                segment_duration = segments[j].end - segments[j].start
                if current_duration + segment_duration <= target_duration + 2:  # 2 second tolerance
                    current_duration += segment_duration
                    combined_text += " " + segments[j].text
                    segments_included.append(j)
                else:
                    break

            # Score based on text length and duration utilization
            score = len(combined_text.split()) * (current_duration / target_duration)

            if score > best_score:
                best_score = score
                best_segment = {
                    "start_time": segments[i].start,
                    "end_time": segments[i].start + current_duration,
                    "duration": current_duration,
                    "text": combined_text.strip(),
                    "segments_included": segments_included,
                    "reasoning": f"Fallback selection - highest text density with {len(combined_text.split())} words"
                }

        return {
            "selected_segment": best_segment or {
                "start_time": segments[0].start,
                "end_time": min(segments[0].start + target_duration, segments[-1].end),
                "duration": target_duration,
                "text": segments[0].text,
                "segments_included": [0],
                "reasoning": "Fallback selection - first segment"
            },
            "engagement_score": 6.0,
            "viral_potential": "Medium - fallback selection"
        }

    def _extract_json_from_text(self, text: str) -> Dict[str, Any]:
        """Fallback method to extract JSON-like data from text"""
        # This is a simple fallback - in production, you'd want more robust parsing
        fallback_script = {
            "title": "Viral Content Script",
            "hook": "Get ready for something amazing!",
            "script_segments": [
                {
                    "text": "Get ready for something amazing!",
                    "start_time": 0,
                    "end_time": 3,
                    "purpose": "hook",
                    "emphasis": "amazing"
                },
                {
                    "text": "Here's what you need to know...",
                    "start_time": 3,
                    "end_time": 25,
                    "purpose": "content",
                    "emphasis": "need to know"
                },
                {
                    "text": "Don't forget to follow for more!",
                    "start_time": 25,
                    "end_time": 30,
                    "purpose": "cta",
                    "emphasis": "follow"
                }
            ],
            "call_to_action": "Don't forget to follow for more!",
            "key_moments": [],
            "viral_score": 7.0,
            "reasoning": "Fallback script generated",
            "hashtags": ["#viral", "#content"],
            "target_audience": "General",
            "engagement_hooks": ["Strong hook", "Clear CTA"]
        }
        
        return fallback_script
    
    def optimize_script_timing(self, script_segments: List[Dict[str, Any]], target_duration: int) -> List[Dict[str, Any]]:
        """Optimize script timing to fit exactly within target duration"""
        total_text_length = sum(len(segment['text']) for segment in script_segments)
        words_per_second = 2.5  # Average speaking pace
        
        optimized_segments = []
        current_time = 0
        
        for segment in script_segments:
            text_length = len(segment['text'])
            duration = (text_length / total_text_length) * target_duration
            
            optimized_segment = segment.copy()
            optimized_segment['start_time'] = current_time
            optimized_segment['end_time'] = current_time + duration
            
            optimized_segments.append(optimized_segment)
            current_time += duration
        
        return optimized_segments
    
    def get_script_analytics(self, viral_script: ViralScript) -> Dict[str, Any]:
        """Generate analytics and insights for the viral script"""
        analytics = {
            "word_count": sum(len(segment['text'].split()) for segment in viral_script.script_segments),
            "estimated_speaking_time": viral_script.total_duration,
            "hook_strength": len(viral_script.hook.split()) / 10,  # Simple metric
            "cta_clarity": 1.0 if viral_script.call_to_action else 0.0,
            "viral_potential": viral_script.viral_score,
            "key_moments_count": len(viral_script.key_moments),
            "segments_count": len(viral_script.script_segments)
        }
        
        return analytics
    
    def create_alternative_versions(self, gladia_result: Dict[str, Any], count: int = 3) -> List[ViralScript]:
        """Generate multiple versions of viral scripts for A/B testing"""
        alternatives = []
        
        for i in range(count):
            # Vary the approach for each version
            target_durations = [30, 25, 35]
            duration = target_durations[i % len(target_durations)]
            
            script = self.generate_viral_script(gladia_result, duration)
            script.version = f"v{i+1}"
            alternatives.append(script)
        
        return alternatives

# Utility functions for integration with FastAPI

def create_video_processor() -> VideoProcessor:
    """Factory function to create VideoProcessor instance"""
    api_key = os.getenv('GEMINI_API_KEY')
    if not api_key:
        raise ValueError("GEMINI_API_KEY environment variable is required")
    
    return VideoProcessor(api_key)

def process_transcript_to_viral_script(gladia_result: Dict[str, Any], target_duration: int = 30) -> Dict[str, Any]:
    """Main function to process transcript and return extracted segment data"""
    try:
        processor = create_video_processor()

        # Extract the best segment instead of generating new content
        segment_data = processor.extract_best_segment(gladia_result, target_duration)
        selected_segment = segment_data.get('selected_segment', {})

        # Extract video metadata from Gladia response
        file_info = gladia_result.get('file', {})
        video_url = file_info.get('source', '')
        video_title = file_info.get('filename', 'Extracted Video Segment')

        return {
            "success": True,
            "video_info": {
                "url": video_url,
                "title": video_title,
                "total_duration": gladia_result.get('result', {}).get('metadata', {}).get('audio_duration', 0)
            },
            "extracted_segment": {
                "start_time": selected_segment.get('start_time', 0),
                "end_time": selected_segment.get('end_time', target_duration),
                "duration": selected_segment.get('duration', target_duration),
                "text": selected_segment.get('text', ''),
                "segments_included": selected_segment.get('segments_included', []),
                "reasoning": selected_segment.get('reasoning', '')
            },
            "analysis": {
                "engagement_score": segment_data.get('engagement_score', 7.0),
                "viral_potential": segment_data.get('viral_potential', 'Medium'),
                "key_moment": segment_data.get('key_moment', {}),
                "alternative_segments": segment_data.get('alternative_segments', [])
            },
            "playback_config": {
                "start_seconds": selected_segment.get('start_time', 0),
                "end_seconds": selected_segment.get('end_time', target_duration),
                "autoplay": True,
                "controls": True,
                "loop": False
            },
            "target_duration": target_duration
        }

    except Exception as e:
        logger.error(f"Error in process_transcript_to_viral_script: {e}")
        return {
            "success": False,
            "error": str(e)
        }

# Example usage and testing
if __name__ == "__main__":
    # Example test data (mimicking Gladia API response)
    sample_gladia_result = {
        "result": {
            "transcription": {
                "utterances": [
                    {
                        "text": "Welcome to today's video about artificial intelligence.",
                        "start": 0.0,
                        "end": 3.5,
                        "speaker": 0,
                        "confidence": 0.95,
                        "words": []
                    }
                ],
                "full_transcript": "Welcome to today's video about artificial intelligence. AI is changing the world in ways we never imagined..."
            },
            "metadata": {
                "audio_duration": 180.0
            },
            "summarization": {
                "results": "This video discusses the impact of AI on modern society."
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
    
    # Test the processor
    try:
        result = process_transcript_to_viral_script(sample_gladia_result)
        print(json.dumps(result, indent=2))
    except Exception as e:
        print(f"Test failed: {e}")
