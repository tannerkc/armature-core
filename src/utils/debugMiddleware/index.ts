import type { Context } from "elysia";

export function createDebuggingMiddleware() {
    return async (context: Context, next: () => Promise<void>) => {
      const request = context.request;
      console.log(`[DEBUG] Incoming request: ${request.method} ${request.url}`);
    };
}
