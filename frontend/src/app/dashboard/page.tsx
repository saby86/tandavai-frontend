"use client";
import { UserButton } from "@clerk/nextjs";
import { UploadDropzone } from "@/components/upload-dropzone";
import { VideoGrid } from "@/components/video-grid";
import { BackgroundBeams } from "@/components/ui/background-beams";

export default function DashboardPage() {
    return (
        <div className="min-h-screen w-full bg-neutral-950 relative flex flex-col items-center antialiased selection:bg-blue-500/30">
            <div className="max-w-7xl w-full p-6 md:p-12 z-10 space-y-12">
                <header className="flex justify-between items-center">
                    <div className="space-y-1">
                        <h1 className="text-3xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-neutral-500 font-sans tracking-tight">
                            TandavAI
                        </h1>
                        <p className="text-neutral-500 text-sm md:text-base">
                            Turn long videos into viral shorts in seconds.
                        </p>
                    </div>
                    <UserButton afterSignOutUrl="/" />
                </header>

                <main className="space-y-16">
                    {/* Upload Section */}
                    <section className="max-w-3xl mx-auto w-full space-y-6">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-neutral-800 to-transparent" />
                            <h2 className="text-sm font-medium text-neutral-500 uppercase tracking-wider">Create New Project</h2>
                            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-neutral-800 to-transparent" />
                        </div>
                        <UploadDropzone />
                    </section>

                    {/* Projects Section */}
                    <section className="space-y-6">
                        <div className="flex items-center justify-between">
                            <h2 className="text-2xl font-semibold text-neutral-200">Your Projects</h2>
                            <div className="text-sm text-neutral-500">
                                Auto-refreshing
                            </div>
                        </div>
                        <VideoGrid />
                    </section>
                </main>
            </div>
            <BackgroundBeams />
        </div>
    );
}
