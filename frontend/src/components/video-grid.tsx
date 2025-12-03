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

    return (
        <div className="space-y-12">
            {/* Global Actions */}
            <div className="flex justify-between items-center px-4">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    <Sparkles className="w-6 h-6 text-purple-500" />
                    Your Projects
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
                    Cleanup Old
                </button>
            </div>

            {/* Project List */}
            {projects.map((project) => (
                <ProjectSection key={project.id} project={project} />
            ))}
        </div>
    );
};

const ProjectSection = ({ project }: { project: Project }) => {
    const queryClient = useQueryClient();

    const handleDelete = async () => {
        if (confirm("Are you sure you want to delete this project? This cannot be undone.")) {
            try {
                await deleteProject(project.id);
                queryClient.invalidateQueries({ queryKey: ["projects"] });
            } catch (error: any) {
                console.error("Failed to delete project:", error);
                alert("Failed to delete project. Please try again.");
            }
        }
    };

    return (
        <div className="bg-[#0A0A0A] border border-white/5 rounded-[2rem] p-6 md:p-8 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/5 blur-[100px] rounded-full pointer-events-none" />

            {/* Project Header */}
            <div className="flex items-center justify-between mb-6 relative z-10">
                <div className="flex items-center gap-4">
                    <StatusBadge status={project.status} />
                    <div className="flex flex-col">
                        <span className="text-sm font-bold text-white tracking-tight">
                            Project {project.id.slice(0, 8)}
                        </span>
                        <span className="text-xs text-neutral-500">
                            {new Date(project.created_at).toLocaleDateString()}
                        </span>
                    </div>
                </div>

                <button
                    onClick={handleDelete}
                    className="p-2 rounded-full bg-white/5 hover:bg-red-500/10 text-neutral-400 hover:text-red-400 transition-colors"
                    title="Delete Project"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>

            {/* Content */}
            {project.status === "COMPLETED" && project.clips && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {project.clips.map((clip, index) => (
                        <ClipCard key={clip.id} clip={clip} index={index} />
                    ))}
                </div>
            )}

            {(project.status === "PROCESSING" || project.status === "PENDING") && (
                <div className="h-64 flex flex-col items-center justify-center text-center border border-dashed border-white/10 rounded-2xl bg-white/[0.02] relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-blue-500/5 animate-pulse" />
                    <div className="relative z-10">
                        <ThunderLoader className="scale-100 mb-4" />
                        <h3 className="text-base font-bold text-white mb-1">
                            {project.status === "PENDING" ? "Waiting for GPU..." : "Forging Viral Clips..."}
                        </h3>
                        <p className="text-xs text-neutral-500">
                            This usually takes about 60-90 seconds.
                        </p>
                    </div>
                </div>
            )}

            {project.status === "FAILED" && (
                <div className="h-32 flex flex-col items-center justify-center text-center border border-dashed border-red-900/30 rounded-2xl bg-red-900/5">
                    <div className="flex items-center gap-2 text-red-400 mb-1">
                        <AlertCircle className="h-5 w-5" />
                        <span className="font-medium text-sm">Processing Failed</span>
                    </div>
                    <p className="text-xs text-red-400/60 max-w-xs mx-auto">
                        {project.error_message || "Unknown error"}
                    </p>
                </div>
            )}
        </div>
    );
};

const StatusBadge = ({ status }: { status: string }) => {
    const styles = {
        COMPLETED: "bg-green-500/10 text-green-400 border-green-500/20",
        PROCESSING: "bg-blue-500/10 text-blue-400 border-blue-500/20",
        PENDING: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
        FAILED: "bg-red-500/10 text-red-400 border-red-500/20",
    };

    return (
        <div className={cn(
            "px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider",
            styles[status as keyof typeof styles] || styles.PENDING
        )}>
            {status}
        </div>
    );
};
