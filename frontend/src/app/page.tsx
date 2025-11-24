import Link from "next/link";

export default function Home() {
    return (
        <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-black text-white">
            <h1 className="text-4xl font-bold mb-8">TandavAI</h1>
            <p className="mb-8 text-xl text-gray-400">Viral Shorts Generator</p>
            <div className="flex gap-4">
                <Link
                    href="/dashboard"
                    className="px-6 py-3 bg-white text-black rounded-full font-semibold hover:bg-gray-200 transition"
                >
                    Go to Dashboard
                </Link>
            </div>
        </main>
    );
}
