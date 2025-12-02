"use client";
import React, { useState } from "react";
import { X, Type, Scissors, Check, Wand2, Play, Pause } from "lucide-react";
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
    const [activeTab, setActiveTab] = useState<"caption" | "style">("caption");
    const [caption, setCaption] = useState(clip.transcript || "");
    const [selectedStyle, setSelectedStyle] = useState("Hormozi");

    // Trim State (Mocking defaults if missing)
    const [startTime, setStartTime] = useState(clip.start_time || 0);
    const [endTime, setEndTime] = useState(clip.end_time || 30);

    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        try {
            setIsSaving(true);

            // 1. Update Transcript in DB
            if (caption !== clip.transcript) {
                await updateClip(clip.id, { transcript: caption });
            }

            // 2. Trigger Burn (Re-process video)
            // This handles Style and Trim changes
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
            <div className="w-full max-w-2xl bg-[#0A0A0A] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-white/5">
                    <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                        <Wand2 className="w-5 h-5 text-purple-500" />
                        Edit Clip
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/5 rounded-full transition-colors"
                    >
                        <X className="w-5 h-5 text-neutral-400" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    <div className="flex gap-6 mb-6">
                        {/* Preview Area (Placeholder) */}
                        <div className="w-1/3 aspect-[9/16] bg-neutral-900 rounded-lg border border-white/5 flex items-center justify-center relative overflow-hidden group">
                            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/60" />
                            <p className="text-neutral-500 text-sm">Preview</p>
                            <div className="absolute bottom-8 left-4 right-4 text-center">
                                <p className={cn(
                                    "font-bold text-sm drop-shadow-md",
                                    selectedStyle === "Hormozi" ? "text-yellow-400 uppercase" :
                                        selectedStyle === "Neon" ? "text-cyan-400 drop-shadow-[0_0_5px_rgba(34,211,238,0.8)]" :
                                            "text-white"
                                )}>{caption.slice(0, 50)}...</p>
                            </div>
                        </div>

                        {/* Controls */}
                        <div className="flex-1 space-y-6">
                            {/* Tabs */}
                            <div className="flex gap-2 p-1 bg-white/5 rounded-lg">
                                <button
                                    onClick={() => setActiveTab("caption")}
                                    className={cn(
                                        "flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all",
                                        activeTab === "caption" ? "bg-purple-600 text-white shadow-lg" : "text-neutral-400 hover:text-white"
                                    )}
                                >
                                    <div className="flex items-center justify-center gap-2">
                                        <Type className="w-4 h-4" />
                                        Captions
                                    </div>
                                </button>
                                <button
                                    onClick={() => setActiveTab("style")}
                                    className={cn(
                                        "flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all",
                                        activeTab === "style" ? "bg-blue-600 text-white shadow-lg" : "text-neutral-400 hover:text-white"
                                    )}
                                >
                                    <div className="flex items-center justify-center gap-2">
                                        <Scissors className="w-4 h-4" />
                                        Trim & Style
                                    </div>
                                </button>
                            </div>

                            {activeTab === "caption" ? (
                                <div className="space-y-4 animate-fade-in">
                                    <label className="block text-sm font-medium text-neutral-400">
                                        Edit Caption Text
                                    </label>
                                    <textarea
                                        value={caption}
                                        onChange={(e) => setCaption(e.target.value)}
                                        className="w-full h-40 bg-black/50 border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:border-purple-500/50 transition-colors resize-none"
                                        placeholder="Enter caption text..."
                                    />
                                </div>
                            ) : (
                                <div className="space-y-6 animate-fade-in">
                                    {/* Style Selector */}
                                    <div>
                                        <label className="block text-sm font-medium text-neutral-400 mb-3">Subtitle Style</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            {STYLES.map((style) => (
                                                <button
                                                    key={style.name}
                                                    onClick={() => setSelectedStyle(style.name)}
                                                    className={cn(
                                                        "px-3 py-2 rounded-lg text-sm font-medium border transition-all flex items-center gap-2",
                                                        selectedStyle === style.name
                                                            ? "bg-white/10 border-purple-500 text-white"
                                                            : "bg-black/40 border-white/5 text-neutral-400 hover:bg-white/5"
                                                    )}
                                                >
                                                    <div className={cn("w-3 h-3 rounded-full", style.color)} />
                                                    {style.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Trim Controls */}
                                    <div>
                                        <label className="block text-sm font-medium text-neutral-400 mb-3">Trim Video (Seconds)</label>
                                        <div className="flex gap-4">
                                            <div>
                                                <span className="text-xs text-neutral-500 block mb-1">Start</span>
                                                <input
                                                    type="number"
                                                    value={startTime}
                                                    onChange={(e) => setStartTime(Number(e.target.value))}
                                                    className="w-24 bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
                                                />
                                            </div>
                                            <div>
                                                <span className="text-xs text-neutral-500 block mb-1">End</span>
                                                <input
                                                    type="number"
                                                    value={endTime}
                                                    onChange={(e) => setEndTime(Number(e.target.value))}
                                                    className="w-24 bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-white/5 bg-black/20 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-neutral-400 hover:text-white transition-colors"
                        disabled={isSaving}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="px-6 py-2 bg-white text-black rounded-lg text-sm font-bold hover:bg-neutral-200 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
    );
};
