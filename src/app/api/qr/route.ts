/* ============================== app/api/qr/route.ts ============================== */
import QRCode from "qrcode";

export async function GET(req: Request) {
    const url = new URL(req.url);
    const payload = url.searchParams.get("payload");
    if (!payload) {
        return new Response("Missing ?payload", { status: 400 });
    }
    // Render SVG QR for the provided payload
    const svg = await QRCode.toString(payload, { type: "svg", errorCorrectionLevel: "M", margin: 1 });
    return new Response(svg, { headers: { "content-type": "image/svg+xml" } });
}