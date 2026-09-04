import crypto from "crypto";

export function sha256(value: string): string {
  return crypto.createHash("sha256").update(value.trim().toLowerCase()).digest("hex");
}

export function generateEventId(): string {
  return `evt_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function getFacebookSettings(settings: Record<string, string>) {
  return {
    pixelId: settings.fb_pixel_id || "",
    accessToken: settings.fb_access_token || "",
    testEventCode: settings.fb_test_event_code || "",
    pixelEnabled: settings.fb_pixel_enabled === "true",
    capiEnabled: settings.fb_capi_enabled === "true",
  };
}
