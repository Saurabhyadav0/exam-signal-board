import { NextRequest, NextResponse } from "next/server";

// Meta calls this once, at "Verify and save" time and whenever you change
// the Callback URL, to prove you control this endpoint.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 });
  }
  return new NextResponse("Forbidden", { status: 403 });
}

// Meta posts here for every message status update (sent/delivered/read/failed)
// and every inbound message (e.g. a user replying STOP). For now this just
// logs and acknowledges — actual STOP-handling / status tracking comes later.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  console.log("WhatsApp webhook event:", JSON.stringify(body));
  return NextResponse.json({ received: true });
}
