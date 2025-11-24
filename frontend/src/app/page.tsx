"use client";
import React from "react";
import { BackgroundBeams } from "@/components/ui/background-beams";
import Link from "next/link";

export default function LandingPage() {
    return (
        <div className="h-screen w-full rounded-md bg-neutral-950 relative flex flex-col items-center justify-center antialiased">
            <div className="max-w-2xl mx-auto p-4">
                <h1 className="relative z-10 text-lg md:text-7xl  bg-clip-text text-transparent bg-gradient-to-b from-neutral-200 to-neutral-600  text-center font-sans font-bold">
                    TandavAI
                </h1>
                <p className="text-neutral-500 max-w-lg mx-auto my-2 text-sm text-center relative z-10">
                    Repurpose your long-form videos into viral shorts with the power of Gemini 3 Pro.
                </p>
                <div className="flex justify-center mt-8 relative z-10">
                    <Link href="/dashboard" className="bg-white text-black px-6 py-3 rounded-full font-semibold hover:bg-neutral-200 transition">
                        Get Started
                    </Link>
                </div>
            </div>
            <BackgroundBeams />
        </div>
    );
}
