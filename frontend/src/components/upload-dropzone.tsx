"use client";
import React, { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { UploadCloud, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

export const UploadDropzone = () => {
    const [uploading, setUploading] = useState(false);
    const queryClient = useQueryClient();
    const router = useRouter();

    const onDrop = useCallback(async (acceptedFiles: File[]) => {
        const file = acceptedFiles[0];
        if (!file) return;

        setUploading(true);

        try {
            // 1. Get Presigned URL
            const { data: presignedData } = await api.get("/upload-url", {
                params: {
            < input { ...getInputProps() } />

            {/* Animated Background Mesh */ }
            < div className = "absolute inset-0 opacity-20 group-hover:opacity-30 transition-opacity duration-700 pointer-events-none" >
                <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(139,92,246,0.2),transparent_70%)]" />
                <div className="absolute bottom-0 right-0 w-1/2 h-1/2 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.2),transparent_70%)]" />
            </div >

    <div className="relative z-10 flex flex-col items-center justify-center gap-8">
        {/* Icon Container with Pulse */}
        <div className="relative">
            <div className={cn(
                "absolute inset-0 rounded-full blur-xl transition-all duration-500",
                isDragActive ? "bg-blue-500/40" : "bg-purple-500/20 group-hover:bg-purple-500/40"
            )} />
            <div className={cn(
                "relative w-24 h-24 rounded-full flex items-center justify-center border border-white/10 backdrop-blur-xl transition-all duration-500 shadow-2xl",
                isDragActive ? "bg-blue-500/20 border-blue-500/50" : "bg-black/40 group-hover:bg-black/60 group-hover:scale-110"
            )}>
                {uploading ? (
                    <Loader2 className="h-10 w-10 animate-spin text-blue-400" />
                ) : (
                    <UploadCloud className={cn(
                        "h-10 w-10 transition-all duration-500",
                        isDragActive ? "text-blue-400 scale-110" : "text-neutral-400 group-hover:text-white"
                    )} />
                )}
            </div>
        </div>

        <div className="space-y-3">
            <h3 className="text-2xl font-bold text-white tracking-tight group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-blue-400 group-hover:to-purple-400 transition-all duration-300">
                {uploading ? "Uploading Magic..." : "Upload Your Video"}
            </h3>
            <p className="text-neutral-400 text-base max-w-[280px] mx-auto leading-relaxed">
                {uploading
                    ? "Sending your masterpiece to the cloud."
                    : "Drag & drop or click to browse. Supports MP4, MOV, AVI."}
            </p>
        </div>

        {!uploading && (
            <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-white/5 border border-white/5 text-xs font-medium text-neutral-500 group-hover:border-white/10 transition-colors">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                Max file size: 500MB
            </div>
        )}
    </div>
        </div >
    );
};
