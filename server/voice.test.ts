import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function createPublicContext(): TrpcContext {
  return {
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

function makeFakeAudioBase64(sizeBytes = 2000): string {
  return Buffer.alloc(sizeBytes, 0x1a).toString("base64");
}

// ─── transcribeAndChat ────────────────────────────────────────────────────────

describe("voice.transcribeAndChat", () => {
  let originalKey: string | undefined;

  beforeEach(() => { originalKey = process.env.THINKING_MACHINES_API_KEY; });
  afterEach(() => {
    if (originalKey !== undefined) process.env.THINKING_MACHINES_API_KEY = originalKey;
    else delete process.env.THINKING_MACHINES_API_KEY;
    vi.restoreAllMocks();
  });

  it("throws BAD_REQUEST when audio is too short (< 100 bytes)", async () => {
    process.env.THINKING_MACHINES_API_KEY = "test-key";
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.voice.transcribeAndChat({
        audioBase64: Buffer.alloc(50, 0x1a).toString("base64"),
        mimeType: "audio/webm",
        history: [],
      }),
    ).rejects.toMatchObject({ message: expect.stringContaining("too short") });
  });

  it("throws BAD_REQUEST when audio exceeds 16 MB", async () => {
    process.env.THINKING_MACHINES_API_KEY = "test-key";
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.voice.transcribeAndChat({
        audioBase64: Buffer.alloc(17 * 1024 * 1024, 0x1a).toString("base64"),
        mimeType: "audio/webm",
        history: [],
      }),
    ).rejects.toMatchObject({ message: expect.stringContaining("too large") });
  });

  it("calls the AI and returns a reply when forge API key is configured", async () => {
    // The voice.chat endpoint uses the built-in LLM (invokeLLM), not THINKING_MACHINES_API_KEY.
    // When the forge API key is present (as it is in the test environment), the call should succeed.
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    // This makes a real LLM call in the test environment — skip if no forge key
    if (!process.env.BUILT_IN_FORGE_API_KEY) {
      console.log("Skipping live LLM test — BUILT_IN_FORGE_API_KEY not set");
      return;
    }
    const result = await caller.voice.chat({ message: "What drywall should I use for a bathroom?", history: [] });
    expect(result).toHaveProperty("reply");
    expect(typeof result.reply).toBe("string");
    expect(result.reply.length).toBeGreaterThan(0);
  }, 20000); // 20s — real LLM + ElevenLabs TTS call

  it("rejects empty audioBase64 via schema validation", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.voice.transcribeAndChat({ audioBase64: "", mimeType: "audio/webm", history: [] }),
    ).rejects.toThrow();
  });

  it("rejects history longer than 30 items", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const longHistory = Array.from({ length: 31 }, (_, i) => ({
      role: (i % 2 === 0 ? "user" : "assistant") as "user" | "assistant",
      content: `msg ${i}`,
    }));
    await expect(
      caller.voice.transcribeAndChat({
        audioBase64: makeFakeAudioBase64(),
        mimeType: "audio/webm",
        history: longHistory,
      }),
    ).rejects.toThrow();
  });
});

// ─── chat (text-only) ─────────────────────────────────────────────────────────

describe("voice.chat", () => {
  let originalKey: string | undefined;

  beforeEach(() => { originalKey = process.env.THINKING_MACHINES_API_KEY; });
  afterEach(() => {
    if (originalKey !== undefined) process.env.THINKING_MACHINES_API_KEY = originalKey;
    else delete process.env.THINKING_MACHINES_API_KEY;
    vi.restoreAllMocks();
  });

  it("returns a reply for a valid construction question", async () => {
    // The chat endpoint uses the built-in LLM — skip if forge key not available
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    if (!process.env.BUILT_IN_FORGE_API_KEY) {
      console.log("Skipping live LLM test — BUILT_IN_FORGE_API_KEY not set");
      return;
    }
    const result = await caller.voice.chat({ message: "What paint should I use for an exterior deck?", history: [] });
    expect(result).toHaveProperty("reply");
    expect(typeof result.reply).toBe("string");
    expect(result.reply.length).toBeGreaterThan(0);
  }, 15000); // 15s timeout — makes a real LLM network call

  it("rejects empty message", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.voice.chat({ message: "", history: [] }),
    ).rejects.toThrow();
  });

  it("rejects message over 2000 chars", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.voice.chat({ message: "x".repeat(2001), history: [] }),
    ).rejects.toThrow();
  });

  it("ELEVENLABS_API_KEY is present in environment (secret configured)", () => {
    expect(process.env.ELEVENLABS_API_KEY).toBeDefined();
    expect(typeof process.env.ELEVENLABS_API_KEY).toBe("string");
    expect((process.env.ELEVENLABS_API_KEY ?? "").length).toBeGreaterThan(0);
  });
});

