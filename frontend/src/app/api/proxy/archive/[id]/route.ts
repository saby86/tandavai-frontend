import { NextRequest, NextResponse } from "next/server";

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";

    // Ensure API URL is formatted correctly
    let baseUrl = apiUrl;
    if (baseUrl && !baseUrl.startsWith("http")) {
        baseUrl = `https://${baseUrl}`;
    }
    if (baseUrl.endsWith("/")) {
        baseUrl = baseUrl.slice(0, -1);
    }

    const targetUrl = `${baseUrl}/api/projects/${id}/archive`;

    console.log(`[PROXY] Forwarding archive request for ${id} to ${targetUrl}`);

    try {
        const response = await fetch(targetUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({}),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[PROXY] Backend error: ${response.status} ${errorText}`);
            return NextResponse.json(
                { message: `Backend error: ${response.status}`, details: errorText },
                { status: response.status }
            );
        }

        const data = await response.json();
        return NextResponse.json(data);

    } catch (error: any) {
        console.error("[PROXY] Network error:", error);
        return NextResponse.json(
            { message: "Proxy failed to reach backend", details: error.message },
            { status: 500 }
        );
    }
}
