import ffmpeg
import os

class FFmpegProcessor:
    def process_segment(self, input_path: str, output_path: str, start_time: str, end_time: str):
        """
        Cuts a segment, crops to 9:16, and saves it.
        """
        try:
            # Simple approach: use FFmpeg command line directly to avoid filter graph issues
            stream = (
                ffmpeg
                .input(input_path, ss=start_time, to=end_time)
                .filter('crop', 'ih*9/16', 'ih', '(iw-ow)/2', 0)
                .filter('loudnorm', I=-14, TP=-1)
                .output(output_path, vcodec='libx264', acodec='aac')
            )
            ffmpeg.run(stream, overwrite_output=True, capture_stdout=True, capture_stderr=True)
            
            return output_path
        except ffmpeg.Error as e:
            print(f"FFmpeg error: {e.stderr.decode('utf8') if e.stderr else 'Unknown error'}")
            raise e

ffmpeg_processor = FFmpegProcessor()
