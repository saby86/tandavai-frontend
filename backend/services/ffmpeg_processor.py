import ffmpeg
import os

class FFmpegProcessor:
    def get_style_string(self, style_name: str) -> str:
        """
        Returns the FFmpeg force_style string for the given style name.
        Colors are in &HBBGGRR format (Hex).
        """
        styles = {
            "Hormozi": "Fontname=Liberation Sans,FontSize=24,PrimaryColour=&H0000FFFF,OutlineColour=&H00000000,BorderStyle=1,Outline=2,Shadow=0,MarginV=25,Bold=1,Alignment=2",  # Yellow Text, Black Outline
            "Classic": "Fontname=Liberation Sans,FontSize=24,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,BorderStyle=1,Outline=1,Shadow=0,MarginV=20,Alignment=2",      # White Text, Black Outline
            "Minimal": "Fontname=Liberation Sans,FontSize=16,PrimaryColour=&H00DDDDDD,OutlineColour=&H80000000,BorderStyle=1,Outline=0,Shadow=0,MarginV=15,Alignment=2",      # Grey Text, Subtle
            "Neon":    "Fontname=Liberation Sans,FontSize=26,PrimaryColour=&H00FFFF00,OutlineColour=&H00FF00FF,BorderStyle=1,Outline=2,Shadow=0,MarginV=25,Bold=1,Alignment=2",  # Cyan Text, Pink Outline
            "Boxed":   "Fontname=Liberation Sans,FontSize=24,PrimaryColour=&H00FFFFFF,BackColour=&H80000000,BorderStyle=3,Outline=0,Shadow=0,MarginV=20,Alignment=2",          # White Text, Black Box
        }
        return styles.get(style_name, styles["Hormozi"])

    def process_segment(self, input_path: str, output_path: str, start_time: str, end_time: str, srt_content: str = None, style_name: str = "Hormozi"):
        """
        Cuts, crops (9:16), and optionally burns subtitles into a video segment.
        """
        try:
            print(f"Processing segment: {input_path} -> {output_path} ({start_time} to {end_time}) [Style: {style_name}]")
            
            # Create stream
            stream = ffmpeg.input(input_path, ss=start_time, to=end_time)
            
            # Video processing: Crop to 9:16
            # Assuming 1080p input (1920x1080), crop to 608x1080 centered
            # crop=w:h:x:y
            stream = ffmpeg.filter(stream, 'crop', 'ih*(9/16)', 'ih', '(iw-ow)/2', 0)
            
            # Subtitle burning
            temp_srt_path = None
            if srt_content:
                import uuid
                # Manually create temp file to avoid tempfile.NamedTemporaryFile issues
                temp_srt_path = f"/tmp/{uuid.uuid4()}.srt"
                
                try:
                    with open(temp_srt_path, "w", encoding="utf-8") as f:
                        f.write(srt_content)
                    
                    # Verify file exists and has content
                    if not os.path.exists(temp_srt_path):
                        print(f"ERROR: SRT file was not created at {temp_srt_path}")
                    else:
                        print(f"Created SRT file at {temp_srt_path} (Size: {os.path.getsize(temp_srt_path)} bytes)")

                    # Get Style String
                    style = self.get_style_string(style_name)
                    
                    # Escape path for FFmpeg
                    # On Linux/Docker, forward slashes are standard.
                    # We just need to escape the colon if it was a Windows absolute path (C:), but in /tmp it's fine.
                    # However, the filter string syntax might require escaping of the path itself if it contained special chars.
                    # For a UUID path in /tmp, it is safe.
                    temp_srt_path_escaped = temp_srt_path.replace('\\', '/').replace(':', '\\:')
                    
                    stream = ffmpeg.filter(stream, 'subtitles', temp_srt_path_escaped, force_style=style)
                except Exception as e:
                    print(f"Error creating SRT file: {e}")
                    # If we can't create the SRT, we should probably fail or skip subtitles
                    # For now, let's re-raise to see the error
                    raise e

            # Output
            stream = ffmpeg.output(stream, output_path, vcodec='libx264', acodec='aac', strict='experimental')
            
            # Run
            print(f"FFmpeg command: {ffmpeg.compile(stream)}")
            ffmpeg.run(stream, overwrite_output=True, capture_stdout=True, capture_stderr=True)
            
            # Cleanup temp SRT
            if temp_srt_path and os.path.exists(temp_srt_path):
                try:
                    os.remove(temp_srt_path)
                except:
                    pass
            
            return output_path
        except ffmpeg.Error as e:
            error_msg = e.stderr.decode('utf8') if e.stderr else 'Unknown error'
            print(f"FFmpeg error: {error_msg}")
            raise Exception(f"FFmpeg failed: {error_msg}")

ffmpeg_processor = FFmpegProcessor()
