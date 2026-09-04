import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sha256, generateEventId } from "@/lib/facebook";

const GRAPH_API = "https://graph.facebook.com/v19.0";

interface CAPIEvent {
  event_name: string;
  event_time: number;
  event_id?: string;
  event_source_url?: string;
  action_source: string;
  user_data: Record<string, any>;
  custom_data?: Record<string, any>;
  products?: { id: string; quantity: number; item_price: number }[];
}

async function sendCAPI(pixelId: string, accessToken: string, event: CAPIEvent, testEventCode?: string) {
  const payload: any = {
    data: [event],
  };
  if (testEventCode) payload.test_event_code = testEventCode;

  const res = await fetch(`${GRAPH_API}/${pixelId}/events?access_token=${accessToken}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  return { ok: res.ok, status: res.status, data };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { eventName, eventId, eventData, userIp, userAgent, fbp, fbc } = body;

    const settings: Record<string, string> = {};
    const dbSettings = await prisma.settings.findMany({
      where: { key: { in: ["fb_pixel_id", "fb_access_token", "fb_test_event_code", "fb_capi_enabled"] } },
    });
    dbSettings.forEach((s) => { settings[s.key] = s.value; });

    if (settings.fb_capi_enabled !== "true") {
      return NextResponse.json({ error: "CAPI disabled" }, { status: 400 });
    }

    const pixelId = settings.fb_pixel_id;
    const accessToken = settings.fb_access_token;
    if (!pixelId || !accessToken) {
      return NextResponse.json({ error: "Missing Pixel ID or Access Token" }, { status: 400 });
    }

    const finalEventId = eventId || generateEventId();
    const eventTime = Math.floor(Date.now() / 1000);

    const userData: Record<string, any> = {
      action_source: "website",
      event_source_url: eventData?.event_source_url || "",
    };

    const client_data: Record<string, any> = {};
    if (userIp) client_data.client_ip_address = userIp;
    if (userAgent) client_data.client_user_agent = userAgent;
    if (fbp) client_data.fbp = fbp;
    if (fbc) client_data.fbc = fbc;

    if (eventData?.email) client_data.em = sha256(eventData.email);
    if (eventData?.phone) client_data.ph = sha256(eventData.phone);
    if (eventData?.first_name) client_data.fn = sha256(eventData.first_name);
    if (eventData?.last_name) client_data.ln = sha256(eventData.last_name);
    if (eventData?.city) client_data.ct = sha256(eventData.city);
    if (eventData?.state) client_data.st = sha256(eventData.state);
    if (eventData?.country) client_data.country = eventData.country;
    if (eventData?.zip) client_data.zp = eventData.zip;
    if (eventData?.external_id) client_data.external_id = sha256(eventData.external_id);

    userData.client_data = client_data;

    const customData: Record<string, any> = {};
    if (eventData?.value) customData.value = eventData.value;
    if (eventData?.currency) customData.currency = eventData.currency;
    if (eventData?.content_ids) customData.content_ids = eventData.content_ids;
    if (eventData?.content_name) customData.content_name = eventData.content_name;
    if (eventData?.content_category) customData.content_category = eventData.content_category;
    if (eventData?.contents) customData.contents = eventData.contents;
    if (eventData?.num_items) customData.num_items = eventData.num_items;

    const capiEvent: CAPIEvent = {
      event_name: eventName,
      event_time: eventTime,
      event_id: finalEventId,
      event_source_url: eventData?.event_source_url || "",
      action_source: "website",
      user_data: userData,
      custom_data: Object.keys(customData).length > 0 ? customData : undefined,
    };

    const result = await sendCAPI(pixelId, accessToken, capiEvent, settings.fb_test_event_code);

    await prisma.facebookEvent.create({
      data: {
        eventName,
        eventId: finalEventId,
        eventData: JSON.stringify({ ...eventData, userIp, fbp, fbc }),
        source: "capi",
        status: result.ok ? "success" : "error",
        error: result.ok ? null : JSON.stringify(result.data),
        response: JSON.stringify(result.data),
      },
    });

    return NextResponse.json({ ok: result.ok, eventId: finalEventId, data: result.data });
  } catch (error: any) {
    console.error("CAPI Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
