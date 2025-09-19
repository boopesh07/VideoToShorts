export interface ViralSegmentResponse {
  success: boolean;
  video_info: {
    url: string;
    title: string;
    total_duration: number;
  };
  extracted_segment: {
    start_time: number;
    end_time: number;
    duration: number;
    text: string;
    segments_included: number[];
    reasoning: string;
  };
  analysis: {
    engagement_score: number;
    viral_potential: string;
    key_moment?: {
      timestamp: number;
      description: string;
    };
    alternative_segments: Array<{
      start_time: number;
      end_time: number;
      reasoning: string;
    }>;
  };
  playback_config: {
    start_seconds: number;
    end_seconds: number;
    autoplay: boolean;
    controls: boolean;
    loop: boolean;
  };
  target_duration: number;
  error?: string;
}

export const extractViralSegment = async (
  gladiaResponse: any,
  targetDuration: number = 30
): Promise<ViralSegmentResponse> => {
  try {
    const response = await fetch('/api/extract-segment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        gladia_data: gladiaResponse,
        target_duration: targetDuration,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || 'Failed to extract viral segment');
    }

    return data;
  } catch (error) {
    console.error('Error extracting viral segment:', error);
    throw error;
  }
};

export const testWithLocalData = async (): Promise<ViralSegmentResponse> => {
  // For testing purposes - mock the API call with local data
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        success: true,
        video_info: {
          url: "https://www.youtube.com/watch?v=DB9mjd-65gw",
          title: "Sam Altman on AGI, GPT-5, and what's next",
          total_duration: 2423.22
        },
        extracted_segment: {
          start_time: 50.9,
          end_time: 80.3,
          duration: 29.4,
          text: "One of my friends is a new parent and is using ChatGPT a lot to ask questions. It's become a very good resource. And you are a new parent. How much has ChachiBT been helping you with that? A lot. I mean, clearly people have been able to take care of babies without ChachiBT for a long time. I don't know how I would have done that. Those first few weeks, it was like every, I mean, constantly. Now I kind of ask questions about like developmental stages more because I can do the basics.",
          segments_included: [21, 22, 23, 24, 25, 26, 27, 28, 29],
          reasoning: "This segment starts with a relatable hook about using ChatGPT for parenting, which is a timely and engaging topic. It then transitions into Sam Altman discussing his own experiences as a new parent using ChatGPT, adding credibility and personal insight."
        },
        analysis: {
          engagement_score: 9.2,
          viral_potential: "High - Combines the popular topic of AI with the universally relatable experience of parenting",
          key_moment: {
            timestamp: 69.1,
            description: "I don't know how I would have done that - A vulnerable and relatable statement from the CEO of OpenAI"
          },
          alternative_segments: [
            {
              start_time: 14.9,
              end_time: 45.1,
              reasoning: "Strong introduction but less emotional impact"
            }
          ]
        },
        playback_config: {
          start_seconds: 50.9,
          end_seconds: 80.3,
          autoplay: true,
          controls: true,
          loop: false
        },
        target_duration: 30
      });
    }, 1500); // Simulate API delay
  });
};