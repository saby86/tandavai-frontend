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
        self.model = genai.GenerativeModel('gemini-1.5-pro-latest') # Using 1.5 Pro as 3 is not public in SDK yet or use 'gemini-pro-vision'

    async def analyze_video(self, video_path: str) -> list[ViralSegment]:
        """
        Analyzes a video file and returns a list of viral segments.
        """
        print(f"Uploading video to Gemini: {video_path}")
        # Upload the video file
        video_file = genai.upload_file(path=video_path)
        
        # Wait for processing
        while video_file.state.name == "PROCESSING":
            print('.', end='')
            import time
            time.sleep(2)
            video_file = genai.get_file(video_file.name)

        if video_file.state.name == "FAILED":
            raise ValueError(f"Gemini video processing failed: {video_file.state.name}")

        print(f"Video processing complete. Generating content...")

        prompt = """
        You are a viral content strategist. Analyze this video. 
        Identify 3 distinct segments (30-60s) that act as standalone viral shorts.
        
        Trend Match: Extract keywords (e.g., 'Crypto', 'AI') and check if they match high-volume trends.
        
        Output strictly in JSON format with this schema:
        [
            {
                "start_time": "MM:SS",
                "end_time": "MM:SS",
                "virality_score": 85,
                "explanation": "Why this is viral...",
                "suggested_caption": " engaging caption..."
            }
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
