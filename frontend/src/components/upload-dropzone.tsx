"use client";
import React, { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone"; // Need to install this: npm install react-dropzone
import { UploadCloud, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
                    filename: file.name,
                    content_type: file.type,
                },
            });

            // 2. Upload to R2
            await fetch(presignedData.upload_url, {
                method: "PUT",
                body: file,
                headers: {
                    "Content-Type": file.type,
                },
            });

            // 3. Trigger Processing
            await api.post("/process-video", {
                source_url: presignedData.s3_key, // Using key as source_url for now
            });

            // 4. Optimistic Update (Ghost Card) - Handled by Query Invalidation for now
            queryClient.invalidateQueries({ queryKey: ["projects"] });

        } catch (error) {
            console.error("Upload failed:", error);
            alert("Upload failed. Please try again.");
        } finally {
            setUploading(false);
        }
    }, [queryClient]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            "video/*": [".mp4", ".mov", ".avi", ".mkv"],
        },
        maxFiles: 1,
        disabled: uploading,
    });

    return (
        <div
            {...getRootProps()}
            className={cn(
                "relative group overflow-hidden rounded-3xl border-2 border-dashed p-10 text-center cursor-pointer transition-all duration-300",
                isDragActive
                    ? "border-blue-500 bg-blue-500/10 scale-[1.02]"
                    : "border-neutral-800 hover:border-neutral-600 hover:bg-neutral-900/50",
                uploading && "opacity-50 cursor-not-allowed pointer-events-none"
            )}
        >
            <input {...getInputProps()} />

            {/* Background Glow Effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />

            <div className="relative z-10 flex flex-col items-center justify-center gap-6">
                <div className={cn(
                    "w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300",
                    isDragActive ? "bg-blue-500/20" : "bg-neutral-800 group-hover:bg-neutral-700"
                )}>
                    {uploading ? (
                        <Loader2 className="h-10 w-10 animate-spin text-blue-400" />
                    ) : (
                        <UploadCloud className={cn(
                            "h-10 w-10 transition-colors",
                            isDragActive ? "text-blue-400" : "text-neutral-400 group-hover:text-neutral-200"
                        )} />
                    )}
                </div>

                <div className="space-y-2">
                    <p className="text-lg font-semibold text-neutral-200">
                        {uploading ? "Uploading your video..." : "Upload Video"}
                    </p>
                    <p className="text-sm text-neutral-500 max-w-[240px] mx-auto">
                        {uploading
                            ? "Please wait while we send your file to the secure cloud."
                            : "Drag & drop or click to browse. Supports MP4, MOV, AVI."}
                    </p>
                </div>

                {!uploading && (
                    <div className="px-4 py-2 rounded-full bg-neutral-800 text-xs font-medium text-neutral-400 border border-neutral-700">
                        Max file size: 500MB
                    </div>
                )}
            </div>
        </div>
    );
};
