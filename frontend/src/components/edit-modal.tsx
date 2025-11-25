"use client";
import React, { useState } from "react";
import { X, Type, Scissors, Check, Wand2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface EditModalProps {
    isOpen: boolean;
    onClose: () => void;
    clip: {
        id: string;
        transcript: string | null;
    };
}

export const EditModal = ({ isOpen, onClose, clip }: EditModalProps) => {
    const [activeTab, setActiveTab] = useState<"caption" | "style">("caption");
    const [caption, setCaption] = useState(clip.transcript || "");

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
                                <p className="text-white font-bold text-sm drop-shadow-md">{caption}</p>
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
                                    <p className="text-xs text-neutral-500">
                                        AI generated captions. Edit to correct any mistakes.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-4 animate-fade-in">
                                    <div className="p-4 border border-dashed border-white/10 rounded-xl text-center py-12">
                                        <p className="text-neutral-500">Style & Trim controls coming soon.</p>
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
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-white text-black rounded-lg text-sm font-bold hover:bg-neutral-200 transition-colors flex items-center gap-2"
                    >
                        <Check className="w-4 h-4" />
                        Save Changes
                    </button>
                </div>
            </div>
        </div>
    );
};
