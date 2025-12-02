"use client";
import React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, deleteProject, deleteOldProjects } from "@/lib/api";
import { Loader2, Sparkles, Trash2, AlertCircle } from "lucide-react";
import { ClipCard } from "./clip-card";
import { ThunderLoader } from "@/components/ui/thunder-loader";
import { BentoGrid, BentoGridItem } from "@/components/ui/bento-grid";
import { cn } from "@/lib/utils";

interface Clip {
    id: string;
    project_id: string;
    s3_url: string;
    virality_score: number | null;
    transcript: string | null;
    start_time: number | null;
    end_time: number | null;
    created_at: string;
}

interface Project {
    id: string;
    status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
    source_url: string;
    created_at: string;
    error_message?: string;
    clips: Clip[];
}

export const VideoGrid = () => {
    const queryClient = useQueryClient();
    const { data: projects, isLoading } = useQuery<Project[]>({
        queryKey: ["projects"],
        queryFn: async () => {
            const res = await api.get("/projects");
            return res.data;
        },
        refetchInterval: 5000, // Auto-refresh every 5s to check processing status
    });

    if (isLoading) {
        return (
            <div className="flex justify-center p-24">
                <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
            </div>
        );
    }

    if (!projects || projects.length === 0) {
        return (
            <div className="text-center py-24 px-6 border border-white/5 rounded-[2rem] bg-[#0A0A0A] relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-b from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                <div className="relative z-10 flex flex-col items-center">
                    <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6 shadow-xl border border-white/5 group-hover:scale-110 transition-transform duration-500">
                        <Sparkles className="h-8 w-8 text-purple-400" />
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-3">Start Your First Project</h3>
                    <p className="text-neutral-400 max-w-md mx-auto leading-relaxed">
                        Upload a video above to let our AI magic generate viral clips for you automatically.
                    </p>
                </div>
            </div>
        );
    }

    // Flatten Data:
    // 1. Processing/Failed Projects -> Show as Cards
    // 2. Completed Projects -> Extract Clips -> Show as Cards
    const items: React.ReactNode[] = [];

    projects.forEach((project) => {
        if (project.status === "PROCESSING" || project.status === "PENDING") {
            items.push(
                <div key={project.id} className="row-span-1 md:col-span-1 rounded-3xl border border-white/10 bg-[#0A0A0A] overflow-hidden relative group h-[400px] flex flex-col items-center justify-center text-center p-6">
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-blue-500/5 animate-pulse" />
                    <div className="relative z-10">
                        <ThunderLoader className="scale-125 mb-6" />
                        <h3 className="text-lg font-bold text-white mb-2">
                            {project.status === "PENDING" ? "Waiting for GPU..." : "Forging Viral Clips..."}
                        </h3>
                        <p className="text-xs text-neutral-400 max-w-[200px] mx-auto">
                            Project {project.id.slice(0, 8)} is being processed.
                        </p>
                    </div>
                </div>
            );
        } else if (project.status === "FAILED") {
            items.push(
                <div key={project.id} className="row-span-1 md:col-span-1 rounded-3xl border border-red-900/30 bg-red-900/5 overflow-hidden relative h-[200px] flex flex-col items-center justify-center text-center p-6">
                    <AlertCircle className="h-8 w-8 text-red-500 mb-3" />
                    <h3 className="text-sm font-bold text-red-400 mb-1">Processing Failed</h3>
                    <p className="text-xs text-red-400/60 max-w-[200px] mx-auto break-words">
                        {project.error_message || "Unknown error"}
                    </p>
                    <button
                        onClick={() => deleteProject(project.id).then(() => queryClient.invalidateQueries({ queryKey: ["projects"] }))}
                        className="mt-4 text-xs text-red-400 hover:text-red-300 underline"
                    >
                        Dismiss
                    </button>
                </div>
            );
        } else if (project.status === "COMPLETED" && project.clips) {
            project.clips.forEach((clip, index) => {
                items.push(
                    <ClipCard key={clip.id} clip={clip} index={index} />
                );
            });
        }
    });

    return (
        <div className="space-y-8">
            {/* Header Actions */}
            <div className="flex justify-between items-center px-4">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    <Sparkles className="w-6 h-6 text-purple-500" />
                    Your Viral Feed
                </h2>
                <button
                    onClick={async () => {
                        if (confirm("Delete projects older than 7 days?")) {
                            await deleteOldProjects(7);
                            queryClient.invalidateQueries({ queryKey: ["projects"] });
                        }
                    }}
                    className="text-xs text-neutral-500 hover:text-red-400 transition-colors flex items-center gap-1"
                >
                    <Trash2 className="w-3 h-3" />
                    Cleanup
                </button>
            </div>

            {/* Bento Grid of Clips & Status Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-auto">
                {items}
            </div>
        </div>
    );
};
