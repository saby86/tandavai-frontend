"use client";
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Loader2, Clock, AlertCircle, ChevronRight, Sparkles } from "lucide-react";
import { ClipCard } from "./clip-card";
import { cn } from "@/lib/utils";

interface Project {
    id: string;
    status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
    source_url: string;
    created_at: string;
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
            <div className="text-center p-16 border border-dashed border-neutral-800 rounded-3xl bg-neutral-900/30">
                <div className="w-16 h-16 bg-neutral-800 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Sparkles className="h-8 w-8 text-neutral-400" />
                </div>
                <h3 className="text-xl font-semibold text-neutral-200 mb-2">No projects yet</h3>
                <p className="text-neutral-500">Upload a video to start generating viral clips.</p>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {projects.map((project) => (
                <ProjectSection key={project.id} project={project} />
            ))}
        </div>
    );
};

const ProjectSection = ({ project }: { project: Project }) => {
    const { data: clips, isLoading } = useQuery<Clip[]>({
        queryKey: ["clips", project.id],
        queryFn: async () => {
            const res = await api.get(`/projects/${project.id}/clips`);
            return res.data;
        },
        enabled: project.status === "COMPLETED",
    });

    return (
        <div className="bg-neutral-950/50 border border-neutral-800 rounded-3xl p-6 md:p-8 transition-all hover:border-neutral-700">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <StatusBadge status={project.status} />
                    <div>
                        <h3 className="text-lg font-semibold text-neutral-200">
                            Project {project.id.slice(0, 8)}
                        </h3>
                        <p className="text-sm text-neutral-500">
                            {new Date(project.created_at).toLocaleDateString(undefined, {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                            })}
                        </p>
                    </div>
                </div>
            </div>

            {project.status === "COMPLETED" && clips && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {clips.map((clip, index) => (
                        <ClipCard key={clip.id} clip={clip} index={index} />
                    ))}
                </div>
            )}

            {project.status === "PROCESSING" && (
                <div className="h-64 flex flex-col items-center justify-center text-center border border-dashed border-neutral-800 rounded-2xl bg-neutral-900/20">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-500 mb-4" />
                    <p className="text-neutral-300 font-medium">AI is analyzing your video...</p>
                    <p className="text-sm text-neutral-500 mt-2">This usually takes 2-3 minutes.</p>
                </div>
            )}

            {project.status === "FAILED" && (
                <div className="h-32 flex items-center justify-center text-center border border-dashed border-red-900/30 rounded-2xl bg-red-900/10">
                    <div className="flex items-center gap-2 text-red-400">
                        <AlertCircle className="h-5 w-5" />
                        <span className="font-medium">Processing failed. Please try again.</span>
                    </div>
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
