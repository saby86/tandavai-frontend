"use client";
import { UserButton } from "@clerk/nextjs";
import { UploadDropzone } from "@/components/upload-dropzone";
import { VideoGrid } from "@/components/video-grid";
import { BackgroundBeams } from "@/components/ui/background-beams";

export default function DashboardPage() {
    return (
        <div className="min-h-screen w-full bg-neutral-950 relative flex flex-col items-center antialiased">
            <div className="max-w-7xl w-full p-4 md:p-8 z-10">
                <header className="flex justify-between items-center mb-12">
                    <h1 className="text-4xl md:text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-neutral-200 to-neutral-600 font-sans">
                        TandavAI
                    </h1>
                    <UserButton afterSignOutUrl="/" />
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2">
                        <h2 className="text-2xl font-semibold text-neutral-200 mb-4">Your Projects</h2>
                        <VideoGrid />
                    </div>
                    <div className="lg:col-span-1">
                        <h2 className="text-2xl font-semibold text-neutral-200 mb-4">New Project</h2>
                        <UploadDropzone />
                    </div>
                </div>
            </div>
            <BackgroundBeams />
        </div>
    );
}
