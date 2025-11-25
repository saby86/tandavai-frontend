"use client";

import React, { useState } from "react";
import { Play, Pause, Download, Copy, Check, Share2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ClipCardProps {
    clip: {
        id: string;
        s3_url: string;
        virality_score: number | null;
        transcript: string | null;
        created_at: string;
    };
    index: number;
}

export const ClipCard = ({ clip, index }: ClipCardProps) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [isCopied, setIsCopied] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);

    const videoRef = React.useRef<HTMLVideoElement>(null);

    const togglePlay = () => {
        if (videoRef.current) {
            if (isPlaying) {
                videoRef.current.pause();
            } else {
                videoRef.current.play();
            }
            setIsPlaying(!isPlaying);
        }
    };

    const handleDownload = async () => {
        try {
            setIsDownloading(true);
            const response = await fetch(clip.s3_url);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.style.display = "none";
            a.href = url;
            a.download = `tandav_clip_${index + 1}.mp4`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            console.error("Download failed:", error);
            // Fallback to direct link
            window.open(clip.s3_url, "_blank");
        } finally {
            setIsDownloading(false);
        }
    };

    const copyLink = () => {
        navigator.clipboard.writeText(clip.s3_url);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    };

    const getScoreColor = (score: number) => {
        if (score >= 90) return "text-emerald-400 bg-emerald-400/10 border-emerald-400/20";
        if (score >= 80) return "text-blue-400 bg-blue-400/10 border-blue-400/20";
        if (score >= 70) return "text-yellow-400 bg-yellow-400/10 border-yellow-400/20";
        return "text-neutral-400 bg-neutral-400/10 border-neutral-400/20";
    };

    return (
        <div className="group relative bg-neutral-900/50 border border-neutral-800 hover:border-neutral-700 rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/10">
            {/* Video Player Area */}
            <div className="relative aspect-[9/16] bg-black cursor-pointer" onClick={togglePlay}>
                <video
                    ref={videoRef}
                    src={clip.s3_url}
                    className="w-full h-full object-cover"
                    loop
                    playsInline
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                />

                {/* Overlay Controls */}
                <div className={cn(
                    "absolute inset-0 flex items-center justify-center bg-black/40 transition-opacity duration-300",
                    isPlaying ? "opacity-0 group-hover:opacity-100" : "opacity-100"
                )}>
                    <div className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/20 transition-transform group-hover:scale-110">
                        {isPlaying ? (
                            <Pause className="w-8 h-8 text-white fill-white" />
                        ) : (
                            <Play className="w-8 h-8 text-white fill-white ml-1" />
                        )}
                    </div>
                </div>

                {/* Virality Badge */}
                {clip.virality_score && (
                    <div className={cn(
                        "absolute top-4 right-4 px-3 py-1.5 rounded-full border backdrop-blur-md font-bold text-sm shadow-lg",
                        getScoreColor(clip.virality_score)
                    )}>
                        Score: {clip.virality_score}
                    </div>
                )}
            </div>

            {/* Content Area */}
            <div className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-neutral-200">Clip {index + 1}</h3>
                    <span className="text-xs text-neutral-500 font-mono">
                        {new Date(clip.created_at).toLocaleDateString()}
                    </span>
                </div>

                {clip.transcript && (
                    <p className="text-sm text-neutral-400 line-clamp-3 leading-relaxed">
                        {clip.transcript}
                    </p>
                )}

                {/* Action Bar */}
                <div className="flex items-center gap-2 pt-2">
                    <button
                        onClick={handleDownload}
                        disabled={isDownloading}
                        className="flex-1 flex items-center justify-center gap-2 bg-white text-black hover:bg-neutral-200 px-4 py-2.5 rounded-xl font-medium text-sm transition-colors disabled:opacity-50"
                    >
                        {isDownloading ? (
                            <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                        ) : (
                            <Download className="w-4 h-4" />
                        )}
                        Download
                    </button>

                    <button
                        onClick={copyLink}
                        className="p-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-xl transition-colors border border-neutral-700"
                        title="Copy Link"
                    >
                        {isCopied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                </div>
            </div>
        </div>
    );
};
