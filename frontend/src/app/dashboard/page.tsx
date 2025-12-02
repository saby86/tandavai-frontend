"use client";
import { UserButton } from "@clerk/nextjs";
import { UploadDropzone } from "@/components/upload-dropzone";
import { VideoGrid } from "@/components/video-grid";

export default function DashboardPage() {
    return (
        <div className="min-h-screen w-full bg-[#000000] relative flex flex-col items-center antialiased selection:bg-purple-500/30">
            {/* Ambient Background */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-900/10 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-900/10 rounded-full blur-[120px]" />
            </div>

            <div className="max-w-[1600px] w-full p-6 md:p-12 z-10 space-y-16">
                {/* Header */}
                <header className="flex justify-between items-center py-4 sticky top-0 z-50 bg-black/50 backdrop-blur-xl border-b border-white/5 -mx-6 px-6 md:-mx-12 md:px-12">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/20">
                            <span className="text-white font-bold text-xl">T</span>
                        </div>
                        <h1 className="text-2xl font-bold text-white tracking-tight">
                            TandavAI <span className="text-neutral-500 font-normal ml-2 text-sm">Studio</span>
                        </h1>
                    </div>
                    <div className="flex items-center gap-6">
                        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/5 text-xs font-medium text-neutral-400">

                            <main className="space-y-20">
                                {/* Hero Upload Section */}
                                <section className="max-w-4xl mx-auto w-full space-y-8 animate-slide-up">
                                    <div className="text-center space-y-4">
                                        <h2 className="text-4xl md:text-5xl font-bold text-white tracking-tight">
                                            Create Viral Magic
                                        </h2>
                                        <p className="text-lg text-neutral-400 max-w-xl mx-auto">
                                            Upload your long-form videos and let our AI craft engaging, viral-ready shorts in minutes.
                                        </p>
                                    </div>
                                    <UploadDropzone />
                                </section>

                                {/* Projects Grid */}
                                <section className="space-y-8 animate-slide-up" style={{ animationDelay: "0.2s" }}>
                                    <div className="flex items-center justify-between border-b border-white/5 pb-6">
                                        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                                            Your Projects
                                            <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-xs font-medium text-white/60">
                                                Auto-Sync
                                            </span>
                                        </h2>
                                    </div>
                                    <VideoGrid />
                                </section>
                            </main>
                        </div>
                    </div>
                    );
}
