import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    images: {
        remotePatterns: [
            {
                protocol: "https",
                // Allows images from Google (Clerk avatars) and Cloudflare R2
                hostname: "**",
            },
        ],
    },
    // Ensure the config only contains valid Next.js keys.
    output: "standalone",
};

export default nextConfig;
