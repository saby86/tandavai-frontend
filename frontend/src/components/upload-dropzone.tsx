"use client";
import React, { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone"; // Need to install this: npm install react-dropzone
import { UploadCloud, Loader2 } from "lucide-react";
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
            className={`
        border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors
        ${isDragActive ? "border-blue-500 bg-blue-500/10" : "border-neutral-700 hover:border-neutral-500"}
        ${uploading ? "opacity-50 cursor-not-allowed" : ""}
      `}
        >
            <input {...getInputProps()} />
            <div className="flex flex-col items-center justify-center gap-4">
                {uploading ? (
                    <Loader2 className="h-10 w-10 animate-spin text-neutral-400" />
                ) : (
                    <UploadCloud className="h-10 w-10 text-neutral-400" />
                )}
                <div className="text-neutral-200 font-medium">
                    {uploading ? "Uploading..." : "Click or drag video to upload"}
                </div>
                <div className="text-neutral-500 text-sm">
                    MP4, MOV, AVI (Max 500MB)
                </div>
            </div>
        </div>
    );
};
