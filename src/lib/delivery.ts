// Headers for shipping-company API calls.
// Their WAF blocks non-browser clients (no User-Agent -> HTTP 403),
// so every outbound call must look like a regular browser.
export function deliveryHeaders(extra: Record<string, string> = {}): Record<string, string> {
  return {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    Accept: "application/json",
    "Accept-Language": "en-US,en;q=0.9",
    ...extra,
  };
}
