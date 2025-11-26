import React from "react";
import { cn } from "@/lib/utils";

export const ThunderLoader = ({ className }: { className?: string }) => {
    return (
        <div className={cn("relative flex items-center justify-center", className)}>
            {/* Core Energy Ball */}
            <div className="absolute w-16 h-16 bg-blue-500 rounded-full blur-xl animate-pulse opacity-50" />
            <div className="absolute w-12 h-12 bg-purple-500 rounded-full blur-lg animate-ping opacity-30" />

            {/* Lightning Bolts (SVG) */}
            <svg
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="w-12 h-12 text-yellow-400 animate-[spin_3s_linear_infinite] drop-shadow-[0_0_10px_rgba(250,204,21,0.8)]"
            >
                <path
                    d="M13 2L3 14H12L11 22L21 10H12L13 2Z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="animate-[pulse_0.5s_ease-in-out_infinite]"
                />
            </svg>

            {/* Orbital Rings */}
            <div className="absolute w-20 h-20 border-2 border-blue-500/30 rounded-full animate-[spin_4s_linear_infinite]" />
            <div className="absolute w-24 h-24 border border-purple-500/20 rounded-full animate-[spin_6s_linear_infinite_reverse]" />
        </div>
    );
};
