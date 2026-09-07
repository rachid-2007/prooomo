// Retry helper for transient DB failures (cold starts, brief network blips).
// A single failed read currently renders as "not found" pages, so retry before giving up.

const TRANSIENT_CODES = new Set(["P1001", "P1002", "P1017", "P2024"]);

function isTransient(error: unknown): boolean {
  const code = (error as { code?: string })?.code;
  if (code && TRANSIENT_CODES.has(code)) return true;
  const msg = String((error as { message?: string })?.message || error || "");
  return (
    msg.includes("Can't reach database server") ||
    msg.includes("Connection timed out") ||
    msg.includes("Connection terminated") ||
    msg.includes("ECONNREFUSED") ||
    msg.includes("ETIMEDOUT") ||
    msg.includes("timeout")
  );
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function withDbRetry<T>(fn: () => Promise<T>, retries = 3): Promise<T> {
  let lastError: unknown = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt >= retries || !isTransient(error)) throw error;
      // Backoff: 0.5s, 1.5s, 3s - gives a cold DB time to wake up
      const delays = [500, 1500, 3000];
      await sleep(delays[Math.min(attempt, delays.length - 1)]);
    }
  }
  throw lastError;
}
