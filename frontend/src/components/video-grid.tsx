"use client";
import React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, deleteProject, deleteOldProjects } from "@/lib/api";
import { Loader2, Clock, AlertCircle, ChevronRight, Sparkles, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { ClipCard } from "./clip-card";

interface Project {
    id: string;
    status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
    source_url: string;
    created_at: string;
    error_message?: string;
}

interface Clip {
    id: string;
    project_id: string;
    s3_url: string;
    virality_score: number | null;
    transcript: string | null;
    created_at: string;
}

export const VideoGrid = () => {
    const queryClient = useQueryClient();
    const { data: projects, isLoading } = useQuery<Project[]>({
        queryKey: ["projects"],
        queryFn: async () => {
            const res = await api.get("/projects");
            return res.data;
        },
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
            {/* Header Actions */}
            <div className="flex justify-end mb-4">
                <button
                    onClick={async () => {
                        if (confirm("Delete projects older than 7 days?")) {
                            try {
                                const res = await deleteOldProjects(7);
                                alert(res.message);
                                queryClient.invalidateQueries({ queryKey: ["projects"] });
                            } catch (e: any) {
                                console.error(e);
                                alert(`Failed to cleanup: ${e.message || "Unknown error"}`);
                            }
                        }
                    }}
                    className="text-xs text-neutral-500 hover:text-red-400 transition-colors flex items-center gap-1"
                >
                    <Trash2 className="w-3 h-3" />
                    Cleanup Old Projects (&gt;7 days)
                </button>
            </div>

            {projects.map((project) => (
                <ProjectSection key={project.id} project={project} />
            ))}
        </div>
    );
};

const ProjectSection = ({ project }: { project: Project }) => {
    const queryClient = useQueryClient();
    const { data: clips, isLoading } = useQuery<Clip[]>({
        queryKey: ["clips", project.id],
        queryFn: async () => {
            const res = await api.get(`/projects/${project.id}/clips`);
            return res.data;
        },
        enabled: project.status === "COMPLETED",
    });

    const handleDelete = async () => {
        if (confirm("Are you sure you want to delete this project? This cannot be undone.")) {
            try {
                await deleteProject(project.id);
                queryClient.invalidateQueries({ queryKey: ["projects"] });
            } catch (error: any) {
                console.error("Failed to delete project:", error);
                alert(`Failed to delete project: ${error.message || "Unknown error"}`);
            }
        }
    };

    return (
        <div className="bg-[#0A0A0A] border border-white/5 rounded-[2rem] p-8 md:p-10 transition-all hover:border-white/10 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/5 blur-[100px] rounded-full pointer-events-none" />

            <div className="flex items-center justify-between mb-10 relative z-10">
                <div className="flex items-center gap-6">
                    <StatusBadge status={project.status} />
                    <div>
                        <h3 className="text-xl font-bold text-white tracking-tight">
                            Project {project.id.slice(0, 8)}
                        </h3>
                        <p className="text-sm text-neutral-500 font-medium mt-1 flex items-center gap-2">
                            <Clock className="w-3 h-3" />
                            {new Date(project.created_at).toLocaleDateString(undefined, {
                                weekday: 'short',
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: 'numeric',
                                minute: 'numeric'
                            })}
                        </p>
                    </div>
                </div>

                <button
                    onClick={handleDelete}
                    className="flex items-center gap-2 px-3 py-2 rounded-full bg-white/5 hover:bg-red-500/10 text-neutral-400 hover:text-red-400 transition-colors"
                    title="Delete Project"
                >
                    <Trash2 className="w-4 h-4" />
                    <span className="text-xs font-medium">Delete Project</span>
                </button>
            </div>

            {project.status === "COMPLETED" && clips && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {clips.map((clip, index) => (
                        <ClipCard key={clip.id} clip={clip} index={index} />
                    ))}
                </div>
            )}

            {project.status === "PROCESSING" && (
                <div className="h-80 flex flex-col items-center justify-center text-center border border-dashed border-white/10 rounded-3xl bg-white/[0.02]">
                    <div className="relative mb-6">
                        <div className="absolute inset-0 bg-blue-500/20 blur-xl rounded-full animate-pulse" />
                        <Loader2 className="h-10 w-10 animate-spin text-blue-400 relative z-10" />
                    </div>
                    <p className="text-white font-semibold text-lg">AI is analyzing your video...</p>
                    <p className="text-sm text-neutral-500 mt-2 max-w-xs">
                        We are identifying the most viral moments. This usually takes 2-3 minutes.
                    </p>
                </div>
            )}

            {project.status === "FAILED" && (
                <div className="h-40 flex flex-col items-center justify-center text-center border border-dashed border-red-900/30 rounded-3xl bg-red-900/5 p-4">
                    <div className="flex items-center gap-3 text-red-400 mb-2">
                        <AlertCircle className="h-6 w-6" />
                        <span className="font-medium text-lg">Processing Failed</span>
                    </div>
                    {project.error_message && (
                        <p className="text-xs text-red-400/70 max-w-xs break-words bg-black/20 p-2 rounded">
                            {project.error_message}
                        </p>
                    )}
                    {!project.error_message && (
                        <p className="text-sm text-red-400/70">Please try again.</p>
                    )}
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

    const labels = {
        COMPLETED: "Completed",
        PROCESSING: "Processing",
        PENDING: "Queued",
        FAILED: "Failed",
    };

    return (
        <div className={cn(
            "px-3 py-1 rounded-full text-xs font-medium border flex items-center gap-2",
            styles[status as keyof typeof styles] || styles.PENDING
        )}>
            <div className={cn(
                "w-1.5 h-1.5 rounded-full",
                status === "PROCESSING" && "animate-pulse",
                status === "COMPLETED" ? "bg-green-400" :
                    status === "PROCESSING" ? "bg-blue-400" :
                        status === "FAILED" ? "bg-red-400" : "bg-yellow-400"
            )} />
            {labels[status as keyof typeof labels] || status}
        </div>
    );
};
