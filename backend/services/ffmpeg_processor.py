import ffmpeg
import os

class FFmpegProcessor:
    def process_segment(self, input_path: str, output_path: str, start_time: str, end_time: str):
        """
        Cuts a segment, crops to 9:16, and saves it.
        """
        try:
            # Convert timestamps MM:SS to seconds if needed, but ffmpeg handles MM:SS
            
            stream = ffmpeg.input(input_path, ss=start_time, to=end_time)
            
            # Crop to 9:16 (Vertical)
            # Assuming 1080p input (1920x1080), we want 608x1080 centered
            # Or just crop center
            stream = ffmpeg.crop(stream, '(iw-ih*9/16)/2', 0, 'ih*9/16', 'ih')
            
            # Scale to standard vertical resolution if needed (e.g. 1080x1920) - skipping for MVP simplicity
            
            # Audio Normalization (Loudnorm)
            audio = stream.audio.filter('loudnorm', I=-14, TP=-1)
            
            stream = ffmpeg.output(stream, audio, output_path)
            ffmpeg.run(stream, overwrite_output=True)
            
            return output_path
        except ffmpeg.Error as e:
            print(f"FFmpeg error: {e.stderr.decode('utf8')}")
            raise e

ffmpeg_processor = FFmpegProcessor()
