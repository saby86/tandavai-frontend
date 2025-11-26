import { NextRequest, NextResponse } from "next/server";

async function proxyRequest(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
    const { path } = await params;
    const pathString = path.join("/");

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";
    let baseUrl = apiUrl;
    if (baseUrl && !baseUrl.startsWith("http")) {
        baseUrl = `https://${baseUrl}`;
    }
    if (baseUrl.endsWith("/")) {
        baseUrl = baseUrl.slice(0, -1);
    }

    // Construct target URL
    // Frontend: /api/proxy/upload-url -> Backend: /api/upload-url
    // Frontend: /api/proxy/projects -> Backend: /api/projects
    const url = new URL(request.url);
    const queryString = url.search; // Includes '?'
    const targetUrl = `${baseUrl}/api/${pathString}${queryString}`;

    console.log(`[PROXY] Forwarding ${request.method} request to ${targetUrl}`);

    try {
        // Prepare headers
        const headers = new Headers(request.headers);
        headers.delete("host"); // Let fetch set the host
        headers.delete("connection");

        // Prepare body
        let body = null;
        if (request.method !== "GET" && request.method !== "HEAD") {
            const contentType = headers.get("content-type");
            if (contentType?.includes("application/json")) {
                body = JSON.stringify(await request.json());
            } else {
                // For now, only support JSON or empty body. 
                // If we need multipart (file upload), we need to read arrayBuffer.
                // But upload-url is GET, and create-project is JSON.
                // Let's try to read text if not json?
                try {
                    body = await request.text();
                } catch {
                    body = null;
                }
            }
        }

        const response = await fetch(targetUrl, {
            method: request.method,
            headers: headers,
            body: body,
            cache: "no-store",
        });

        // Forward response
        const responseBody = await response.arrayBuffer();

        const responseHeaders = new Headers(response.headers);
        // Clean up CORS headers from backend since we are the origin now (mostly)
        // Actually, we should just pass them or let Next.js handle it.

        return new NextResponse(responseBody, {
            status: response.status,
            statusText: response.statusText,
            headers: responseHeaders,
        });

    } catch (error: any) {
        console.error("[PROXY] Network error:", error);
        return NextResponse.json(
            { message: "Proxy failed to reach backend", details: error.message },
            { status: 500 }
        );
    }
}

export async function GET(request: NextRequest, ctx: any) {
    return proxyRequest(request, ctx);
}

export async function POST(request: NextRequest, ctx: any) {
    return proxyRequest(request, ctx);
}

export async function PUT(request: NextRequest, ctx: any) {
    return proxyRequest(request, ctx);
}

export async function PATCH(request: NextRequest, ctx: any) {
    return proxyRequest(request, ctx);
}

export async function DELETE(request: NextRequest, ctx: any) {
    return proxyRequest(request, ctx);
}
