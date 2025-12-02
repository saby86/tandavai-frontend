import google.generativeai as genai
from config import settings
import json
import typing_extensions

# Configure Gemini
if settings.GOOGLE_API_KEY:
    genai.configure(api_key=settings.GOOGLE_API_KEY)

class ViralSegment(typing_extensions.TypedDict):
    start_time: str
    end_time: str
    virality_score: int
    explanation: str
    suggested_caption: str

class GeminiService:
    def __init__(self):
        # Use gemini-2.5-flash (confirmed available in API key)
        self.model = genai.GenerativeModel('gemini-2.5-flash')

    async def analyze_video(self, video_path: str, duration_preference: str = "auto") -> list[ViralSegment]:
        """
        Analyzes a video file and returns a list of viral segments.
        """
        print(f"Uploading video to Gemini: {video_path}")
        # Upload the video file
        video_file = genai.upload_file(path=video_path)
        
        # Wait for processing
        # Wait for processing
        import time
        max_retries = 30 # 60 seconds total
        retries = 0
        
        while video_file.state.name == "PROCESSING":
            print('.', end='')
            time.sleep(2)
            video_file = genai.get_file(video_file.name)
            retries += 1
            if retries > max_retries:
                raise TimeoutError("Gemini video processing timed out after 60 seconds")

        if video_file.state.name == "FAILED":
            raise ValueError(f"Gemini video processing failed: {video_file.state.name}")

        print(f"Video processing complete. Generating content...")

        duration_prompt = ""
        if duration_preference == "30s":
            duration_prompt = "Identify segments strictly between 15-30 seconds."
        elif duration_preference == "60s":
            duration_prompt = "Identify segments strictly between 45-60 seconds."

        prompt = f"""
        You are a viral content strategist. Analyze this video. 
        Identify 3 distinct segments that act as standalone viral shorts.
        {duration_prompt}
        
        Trend Match: Extract keywords (e.g., 'Crypto', 'AI') and check if they match high-volume trends.
        
        Output strictly in JSON format with this schema:
        [
            {{
                "start_time": "MM:SS",
                "end_time": "MM:SS",
                "virality_score": 85,
                "explanation": "Why this is viral...",
                "suggested_caption": " engaging caption...",
                "srt_content": "1\\n00:00:00,000 --> 00:00:02,000\\nHello world... (Full SRT content for this segment)"
            }}
        ]
        """

        response = self.model.generate_content(
            [video_file, prompt],
            generation_config={"response_mime_type": "application/json"}
        )
        
        try:
            segments = json.loads(response.text)
            return segments
        except json.JSONDecodeError:
            print("Failed to decode JSON from Gemini response")
            return []

gemini_service = GeminiService()
