import ffmpeg
import os

class FFmpegProcessor:
    def process_segment(self, input_path: str, output_path: str, start_time: str, end_time: str):
        """
        Cuts a segment, crops to 9:16, and saves it.
        """
        try:
            print(f"Processing segment: {input_path} -> {output_path} ({start_time} to {end_time})")
            
            # Simplified filter: just crop, no audio norm for now to reduce failure points
            # crop=w:h:x:y
            # w = ih*(9/16)
            # h = ih
            # x = (iw - w)/2
            # y = 0
            
            stream = (
                ffmpeg
                .input(input_path, ss=start_time, to=end_time)
                .filter('crop', 'ih*(9/16)', 'ih', '(iw-ow)/2', 0)
                .output(output_path, vcodec='libx264', acodec='aac', strict='experimental')
            )
            
            # Print the command for debugging
            print(f"FFmpeg command: {ffmpeg.compile(stream)}")
            
            ffmpeg.run(stream, overwrite_output=True, capture_stdout=True, capture_stderr=True)
            
            return output_path
        except ffmpeg.Error as e:
            error_msg = e.stderr.decode('utf8') if e.stderr else 'Unknown error'
            print(f"FFmpeg error: {error_msg}")
            raise Exception(f"FFmpeg failed: {error_msg}")

ffmpeg_processor = FFmpegProcessor()
