"use client";
import React, { useState } from "react";
import { X, Type, Scissors, Check, Wand2, Play, Pause, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { burnClip, updateClip } from "@/lib/api";

interface EditModalProps {
    isOpen: boolean;
    onClose: () => void;
    clip: {
        id: string;
        transcript: string | null;
        start_time?: number | null;
        end_time?: number | null;
    };
}

const STYLES = [
    { name: "Hormozi", label: "Hormozi", color: "bg-yellow-400" },
    { name: "Classic", label: "Classic", color: "bg-white" },
    { name: "Minimal", label: "Minimal", color: "bg-neutral-400" },
    { name: "Neon", label: "Neon", color: "bg-cyan-400" },
    { name: "Boxed", label: "Boxed", color: "bg-black border border-white" },
];

export const EditModal = ({ isOpen, onClose, clip }: EditModalProps) => {
    const [caption, setCaption] = useState(clip.transcript || "");
    const [selectedStyle, setSelectedStyle] = useState("Hormozi");
    const [startTime, setStartTime] = useState(clip.start_time || 0);
    const [endTime, setEndTime] = useState(clip.end_time || 30);
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        try {
            setIsSaving(true);
            if (caption !== clip.transcript) {
                await updateClip(clip.id, { transcript: caption });
            }
            await burnClip(clip.id, {
                start_time: startTime,
                end_time: endTime,
                style_name: selectedStyle
            });
            alert("Processing started! Your video is being updated in the background.");
            onClose();
            window.location.reload();
        } catch (error) {
            console.error("Failed to save clip:", error);
            alert("Failed to save changes. Please try again.");
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in">
            <div className="w-full max-w-5xl bg-[#0A0A0A] border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row h-[85vh]">

                {/* LEFT: Preview Area */}
                <div className="w-full md:w-1/2 bg-black/50 relative flex items-center justify-center p-8 border-b md:border-b-0 md:border-r border-white/5">
                    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20" />

                    <div className="relative z-10 w-full max-w-[300px] aspect-[9/16] bg-neutral-900 rounded-2xl border border-white/10 shadow-2xl overflow-hidden group">
                        {/* Mock Video Preview */}
                        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/80" />
                        <div className="absolute inset-0 flex items-center justify-center">
                            <Play className="w-12 h-12 text-white/50" />
                        </div>

                        {/* Live Caption Preview */}
                        <div className="absolute bottom-12 left-6 right-6 text-center">
                            <p className={cn(
                                "font-bold text-lg leading-tight transition-all duration-300",
                                selectedStyle === "Hormozi" ? "text-yellow-400 uppercase drop-shadow-md font-extrabold" :
                                    selectedStyle === "Neon" ? "text-cyan-400 drop-shadow-[0_0_10px_rgba(34,211,238,0.8)] font-bold" :
                                        selectedStyle === "Classic" ? "text-white font-serif italic" :
                                            selectedStyle === "Minimal" ? "text-neutral-300 font-light tracking-wide bg-black/50 px-2 py-1 rounded" :
                                                "text-white bg-black px-2 font-bold" // Boxed
                            )}>
                                {caption.slice(0, 60) || "Your caption here..."}
                            </p>
                        </div>
                    </div>
                </div>

                {/* RIGHT: Controls */}
                <div className="w-full md:w-1/2 flex flex-col bg-[#0F0F0F]">
                    {/* Header */}
                    <div className="p-6 border-b border-white/5 flex justify-between items-center">
                        <div>
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                <Wand2 className="w-5 h-5 text-purple-500" />
                                Studio Editor
                            </h2>
                            <p className="text-xs text-neutral-500 mt-1">Customize your viral clip</p>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors">
                            <X className="w-5 h-5 text-neutral-400" />
                        </button>
                    </div>

                    {/* Scrollable Content */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-8">

                        {/* Section 1: Captions */}
                        <div className="space-y-3">
                            <label className="flex items-center gap-2 text-sm font-medium text-neutral-300">
                                <Type className="w-4 h-4 text-purple-400" />
                                Caption Text
                            </label>
                            <textarea
                                value={caption}
                                onChange={(e) => setCaption(e.target.value)}
                                className="w-full h-32 bg-black/30 border border-white/10 rounded-xl p-4 text-white text-sm focus:outline-none focus:border-purple-500/50 transition-colors resize-none leading-relaxed"
                                placeholder="Edit the transcript here..."
                            />
                        </div>

                        {/* Section 2: Style */}
                        <div className="space-y-3">
                            <label className="flex items-center gap-2 text-sm font-medium text-neutral-300">
                                <Sparkles className="w-4 h-4 text-blue-400" />
                                Visual Style
                            </label>
                            <div className="grid grid-cols-2 gap-3">
                                {STYLES.map((style) => (
                                    <button
                                        key={style.name}
                                        onClick={() => setSelectedStyle(style.name)}
                                        className={cn(
                                            "px-4 py-3 rounded-xl text-sm font-medium border transition-all flex items-center gap-3 group relative overflow-hidden",
                                            selectedStyle === style.name
                                                ? "bg-white/10 border-purple-500 text-white shadow-[0_0_15px_rgba(168,85,247,0.15)]"
                                                : "bg-black/20 border-white/5 text-neutral-400 hover:bg-white/5 hover:border-white/10"
                                        )}
                                    >
                                        <div className={cn("w-2 h-2 rounded-full shadow-sm", style.color)} />
                                        {style.label}
                                        {selectedStyle === style.name && (
                                            <Check className="w-3 h-3 ml-auto text-purple-400" />
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Section 3: Trim */}
                        <div className="space-y-3">
                            <label className="flex items-center gap-2 text-sm font-medium text-neutral-300">
                                <Scissors className="w-4 h-4 text-yellow-400" />
                                Trim Segment
                            </label>
                            <div className="bg-black/20 rounded-xl p-4 border border-white/5 flex items-center gap-4">
                                <div className="flex-1">
                                    <span className="text-[10px] uppercase tracking-wider text-neutral-500 mb-1 block">Start Time</span>
                                    <input
                                        type="number"
                                        value={startTime}
                                        onChange={(e) => setStartTime(Number(e.target.value))}
                                        className="w-full bg-transparent border-b border-white/10 py-1 text-white font-mono text-lg focus:outline-none focus:border-purple-500 transition-colors"
                                    />
                                </div>
                                <div className="text-neutral-600">→</div>
                                <div className="flex-1">
                                    <span className="text-[10px] uppercase tracking-wider text-neutral-500 mb-1 block">End Time</span>
                                    <input
                                        type="number"
                                        value={endTime}
                                        onChange={(e) => setEndTime(Number(e.target.value))}
                                        className="w-full bg-transparent border-b border-white/10 py-1 text-white font-mono text-lg focus:outline-none focus:border-purple-500 transition-colors"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="p-6 border-t border-white/5 bg-black/20 flex justify-between items-center">
                        <span className="text-xs text-neutral-500">
                            Changes will re-process the video.
                        </span>
                        <div className="flex gap-3">
                            <button
                                onClick={onClose}
                                className="px-5 py-2.5 text-sm font-medium text-neutral-400 hover:text-white transition-colors"
                                disabled={isSaving}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={isSaving}
                                className="px-6 py-2.5 bg-white text-black rounded-xl text-sm font-bold hover:bg-neutral-200 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-white/5"
                            >
                                {isSaving ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                                        Processing...
                                    </>
                                ) : (
                                    <>
                                        <Wand2 className="w-4 h-4" />
                                        Burn & Save
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
