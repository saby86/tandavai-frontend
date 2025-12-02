"use client";

import React, { useState, useRef } from "react";
import { Play, Pause, Download, Copy, Check, Wand2, Share2, MoreVertical, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { EditModal } from "./edit-modal";
import { updateClip } from "@/lib/api";

interface ClipCardProps {
    clip: {
        id: string;
        s3_url: string;
        virality_score: number | null;
        transcript: string | null;
        start_time: number | null;
        end_time: number | null;
        created_at: string;
    };
    index: number;
}

export const ClipCard = ({ clip, index }: ClipCardProps) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [isCopied, setIsCopied] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [showControls, setShowControls] = useState(false);

    const videoRef = useRef<HTMLVideoElement>(null);

    const togglePlay = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        if (videoRef.current) {
            if (isPlaying) {
                videoRef.current.pause();
            } else {
                videoRef.current.play();
            }
            setIsPlaying(!isPlaying);
        }
    };

    const handleDownload = async (e: React.MouseEvent) => {
        e.stopPropagation();
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
            window.open(clip.s3_url, "_blank");
        } finally {
            setIsDownloading(false);
        }
    };

    const copyLink = (e: React.MouseEvent) => {
        e.stopPropagation();
        navigator.clipboard.writeText(clip.s3_url);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    };

    const getScoreColor = (score: number) => {
        if (score >= 90) return "text-emerald-400 border-emerald-500/50 shadow-[0_0_15px_rgba(52,211,153,0.3)]";
        if (score >= 80) return "text-blue-400 border-blue-500/50 shadow-[0_0_15px_rgba(96,165,250,0.3)]";
        if (score >= 70) return "text-yellow-400 border-yellow-500/50 shadow-[0_0_15px_rgba(250,204,21,0.3)]";
        return "text-neutral-400 border-neutral-500/50";
    };

    return (
        <>
            <div
                className="group relative bg-[#0A0A0A] border border-white/5 rounded-3xl overflow-hidden transition-all duration-500 hover:border-white/10 hover:shadow-2xl hover:shadow-purple-500/10"
                onMouseEnter={() => setShowControls(true)}
                onMouseLeave={() => setShowControls(false)}
            >
                {/* Video Player Area - 9:16 Aspect Ratio */}
                <div className="relative aspect-[9/16] bg-black cursor-pointer overflow-hidden" onClick={togglePlay}>
                    <video
                        ref={videoRef}
                        src={clip.s3_url}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        loop
                        playsInline
                        onPlay={() => setIsPlaying(true)}
                        onPause={() => setIsPlaying(false)}
                    />

                    {/* Gradient Overlays */}
                    <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/80 pointer-events-none" />

                    {/* Play Button Overlay */}
                    <div className={cn(
                        "absolute inset-0 flex items-center justify-center transition-all duration-300",
                        isPlaying ? "opacity-0 scale-110" : "opacity-100 scale-100"
                    )}>
                        <div className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-xl">
                            <Play className="w-6 h-6 text-white fill-white ml-1" />
                        </div>
                    </div>

                    {/* Top Bar */}
                    <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-start z-10">
                        {clip.virality_score && (
                            <div className={cn(
                                "px-3 py-1.5 rounded-full border bg-black/40 backdrop-blur-md font-bold text-xs tracking-wide uppercase flex items-center gap-2",
                                getScoreColor(clip.virality_score)
                            )}>
                                <span className="relative flex h-2 w-2">
                                    <span className={cn("animate-ping absolute inline-flex h-full w-full rounded-full opacity-75", clip.virality_score >= 80 ? "bg-current" : "hidden")}></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-current"></span>
                                </span>
                                Viral Score: {clip.virality_score}
                            </div>
                        )}

                        <button className="p-2 rounded-full bg-black/20 backdrop-blur-md hover:bg-black/40 text-white/80 hover:text-white transition-colors">
                            <MoreVertical className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Bottom Controls */}
                    <div className="absolute bottom-0 left-0 right-0 p-5 z-10 space-y-4">
                        {/* Caption Preview (Editable) */}
                        <div className="relative group/edit" onClick={(e) => e.stopPropagation()}>
                            <textarea
                                defaultValue={clip.transcript || ""}
                                onBlur={(e) => {
                                    const newText = e.target.value;
                                    if (newText !== clip.transcript) {
                                        updateClip(clip.id, { transcript: newText });
                                    }
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        e.currentTarget.blur();
                                    }
                                }}
                                className="w-full bg-transparent text-white/90 text-sm font-medium leading-relaxed resize-none focus:outline-none focus:bg-black/40 rounded p-1 transition-colors border border-transparent focus:border-white/20"
                                rows={2}
                            />
                            <div className="absolute top-0 right-0 opacity-0 group-hover/edit:opacity-100 transition-opacity pointer-events-none">
                                <span className="text-[10px] text-neutral-400 bg-black/60 px-1 rounded">Click to Edit</span>
                            </div>
                        </div>



                        {/* Action Buttons */}
                        <div className="flex items-center gap-2">
                            <button
                                onClick={(e) => { e.stopPropagation(); setIsEditModalOpen(true); }}
                                className="flex-1 flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white px-4 py-2.5 rounded-xl font-medium text-sm transition-all border border-white/10 hover:border-white/20"
                            >
                                <Wand2 className="w-4 h-4 text-purple-400" />
                                Edit
                            </button>

                            <button
                                onClick={handleDownload}
                                disabled={isDownloading}
                                className="flex-1 flex items-center justify-center gap-2 bg-white text-black hover:bg-neutral-200 px-4 py-2.5 rounded-xl font-bold text-sm transition-colors disabled:opacity-50 shadow-lg shadow-white/5"
                            >
                                {isDownloading ? (
                                    <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                                ) : (
                                    <Download className="w-4 h-4" />
                                )}
                                Download
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <EditModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                clip={clip}
            />
        </>
    );
};
