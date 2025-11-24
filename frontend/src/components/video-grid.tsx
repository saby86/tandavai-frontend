"use client";
import React from "react";
import { BentoGrid, BentoGridItem } from "@/components/ui/bento-grid";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Loader2, Play, Clock, AlertCircle, Download } from "lucide-react";

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
            <div className="flex justify-center p-12">
                <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
            </div>
        );
    }

    if (!projects || projects.length === 0) {
        return (
            <div className="text-center p-12 text-neutral-500 border border-dashed border-neutral-800 rounded-xl">
                No projects yet. Upload a video to get started.
            </div>
        );
    }

    return (
        <BentoGrid className="max-w-4xl mx-auto md:auto-rows-[20rem]">
            {projects.map((project) => (
                <BentoGridItem
                    key={project.id}
                    title={project.status === "COMPLETED" ? "Viral Clips Ready" : "Processing..."}
                    description={new Date(project.created_at).toLocaleDateString()}
                    header={<ProjectHeader project={project} />}
                    className={project.status === "COMPLETED" ? "md:col-span-2" : ""}
                    icon={<StatusIcon status={project.status} />}
                />
            ))}
        </BentoGrid>
    );
};

const ProjectHeader = ({ project }: { project: Project }) => {
    // Fetch clips if project is completed
    const { data: clips } = useQuery<Clip[]>({
        queryKey: ["clips", project.id],
        queryFn: async () => {
            const res = await api.get(`/projects/${project.id}/clips`);
            return res.data;
        },
        enabled: project.status === "COMPLETED",
    });

    if (project.status === "COMPLETED" && clips && clips.length > 0) {
        return (
            <div className="flex flex-col gap-2 w-full">
                {clips.map((clip) => (
                    <div key={clip.id} className="group relative rounded-lg overflow-hidden bg-neutral-900 border border-neutral-800 hover:border-neutral-700 transition">
                        <div className="flex items-center justify-between p-3">
                            <div className="flex items-center gap-3 flex-1">
                                <Play className="h-5 w-5 text-green-500" />
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-neutral-200">
                                        Clip {clips.indexOf(clip) + 1}
                                    </p>
                                    {clip.virality_score && (
                                        <p className="text-xs text-neutral-500">
                                            Virality Score: {clip.virality_score}/100
                                        </p>
                                    )}
                                </div>
                            </div>
                            <a
                                href={clip.s3_url}
                                download
                                className="flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-md text-xs text-neutral-200 transition"
                            >
                                <Download className="h-4 w-4" />
                                Download
                            </a>
                        </div>
                        {clip.transcript && (
                            <div className="px-3 pb-3">
                                <p className="text-xs text-neutral-500 line-clamp-2">
                                    {clip.transcript}
                                </p>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        );
    }

    if (project.status === "COMPLETED") {
        return (
            <div className="flex flex-1 w-full h-full min-h-[6rem] rounded-xl bg-gradient-to-br from-neutral-900 to-neutral-800 items-center justify-center">
                <Play className="h-12 w-12 text-white opacity-50" />
            </div>
        );
    }

    return (
        <div className="flex flex-1 w-full h-full min-h-[6rem] rounded-xl bg-neutral-900 animate-pulse"></div>
    );
};

const StatusIcon = ({ status }: { status: string }) => {
    switch (status) {
        case "COMPLETED": return <Play className="h-4 w-4 text-green-500" />;
        case "PROCESSING": return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
        case "PENDING": return <Clock className="h-4 w-4 text-yellow-500" />;
        case "FAILED": return <AlertCircle className="h-4 w-4 text-red-500" />;
        default: return <Clock className="h-4 w-4 text-neutral-500" />;
    }
}
