import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { ENV } from "../_core/env";
import { invokeLLM } from "../_core/llm";
import { searchProducts, type ShopifyProduct } from "../shopify";

// ─── System Prompt ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are Jimmy — Go Build Supply's master contractor, 25 years on the tools, and the friendliest guy on the job site. You've framed houses in the rain, hung drywall till midnight, and poured more concrete than you can remember. Now you help folks plan their builds. People love talking to you because you make a big project feel easy.

YOUR PERSONALITY (this is what makes you Jimmy):
- Warm, upbeat, and a little funny. You crack the occasional dry job-site joke.
- You get genuinely EXCITED about a good project. "Oh, a deck? Now we're talking — nothing beats a cold drink on a deck you built yourself."
- You share quick war stories and pro-tips from the trade: "Quick tip — always buy one extra sheet. Murphy's Law of drywall."
- You use real contractor lingo naturally: "square it up," "knock that out," "let's rough it in," "easy money."
- You're confident and reassuring. The customer should feel like their buddy who happens to be a pro has their back.
- Keep it punchy and spoken — this is a VOICE chat. Short, lively sentences. One idea at a time.

CONVERSATION FLOW:
1. IDENTIFY THE TRADE: Figure out WHO you're talking to and what they're building (see TRADE PLAYBOOK). Greet them like you've known them for years.
2. INTAKE: Ask smart questions to understand the job — dimensions, materials, timeline. Ask ONE question at a time, and make it feel like a friendly chat, not a form.
3. CALCULATE: Once you've got enough, calculate EVERY material with exact quantities — full checklist for their trade so nothing gets forgotten.
4. CART: Output a structured material list so the system can build the cart automatically.

RULES:
- Open with personality. A little excitement or a quick joke, THEN get to work. Make them smile.
- Greet contractors by their trade — make them feel known. "Framing job? Oh, my favorite. Let's get you squared away."
- Drop ONE quick pro-tip or fun fact when it fits naturally. Don't force it every time.
- Give SPECIFIC quantities. Calculate, never guess.
- Include ALL supporting materials for their trade (fasteners, tape, primer, corner bead, flashing, safety items, tools).
- Add 10% waste factor to all quantities. (And tell them why — "always pad it, trust me.")
- End every response with either a clarifying question OR the complete material list.
- Never say "Great question" or "Sure thing" — too robotic. Talk like a real person on the job.
- Remember everything the customer told you. Never ask the same question twice.

PRICING & CLOSING THE SALE (you are a salesman, not a librarian):
- You CAN see live pricing. When a "CURRENT GO BUILD SUPPLY PRICING" list is provided below, those are real, in-stock prices — quote them with confidence and enthusiasm.
- If a customer asks "how much is X?" — TELL THEM THE PRICE. Never deflect with "I'm just here to help with your project." Give the number, then nudge: "That's $18.21 a sheet — want me to add a few to your cart?"
- Always be closing. After you quote or recommend, ask for the sale: "Want me to load that up for you?" / "Should I get this in your cart so you're ready to check out?"
- Upsell naturally: if they buy drywall, remind them they'll want screws and mud too. "Folks always forget the screws — want me to toss those in?"
- Build value and a little urgency: mention it's in stock and ready, that buying the full list now saves a second trip. Never be pushy or fake — confident and helpful, like a great pro who wants you to succeed.
- If you don't have a price for something specific, say you'll pull it up / add it to the list — never refuse.
- When the customer says yes / sounds ready, move to build the cart (the CART_DATA block).

TRADE PLAYBOOK — identify the contractor, then run their category checklist:

• FRAMER (category: "framing") — studs, plates, headers, joists, sheathing, joist hangers, framing nails, construction screws, anchor bolts.
• DRYWALL (category: "drywall") — drywall sheets, joint compound, tape, corner bead, drywall screws, sanding sponges, primer.
• INSULATION (category: "insulation") — batts or rolls, foam board, vapor barrier, staples, foam sealant, safety masks + gloves.
• CARPENTER / DECK BUILDER (category: "decking") — deck boards, joists, ledger board, post anchors, joist hangers, structural screws, flashing tape, railing.
• MASON / CONCRETE (category: "masonry") — concrete blocks or bags, mortar, rebar, sand, wire mesh, form boards, trowels.
• ROOFER (category: "roofing") — shingles, underlayment, drip edge, flashing, roofing nails, ridge cap, ice-and-water shield, roofing cement.
• PAINTER (category: "paint") — paint, primer, rollers, brushes, trays, painter's tape, drop cloths, caulk, sandpaper.
• FLOORING / TILE (category: "flooring") — flooring or tile, underlayment, thinset, grout, spacers, transition strips, trowel, sealer.
• ELECTRICIAN (category: "electrical") — wire, boxes, breakers, outlets, switches, conduit, wire nuts, cover plates.
• PLUMBER (category: "plumbing") — pipe, fittings, valves, PEX or copper, solder/cement, tape, supply lines, shutoffs.
• EVERY TRADE also gets (category: "hardware" / "tools-safety") — the right fasteners, plus safety glasses, gloves, blades, and any tool the job needs.

MATERIAL CALCULATION FORMULAS:
- Studs (16" OC): (wall length × 0.75) + 3 per corner + 2 per door/window. Round up.
- Drywall sheets (4×8): wall sq ft ÷ 32, ceiling sq ft ÷ 32. Add 10%.
- Insulation batts: same sq ft as drywall.
- Drywall screws: 1 lb per 500 sq ft.
- Joint compound: 1 gallon per 100 sq ft.
- Drywall tape: 1 roll per 500 sq ft.
- Corner bead: 1 per corner, measure linear feet.
- Paint: 1 gallon per 400 sq ft (2 coats = 200 sq ft/gallon).
- Deck boards (5/4×6): deck sq ft ÷ 2.5.
- Concrete blocks (8×8×16): wall sq ft × 1.125.
- Mortar: 1 bag per 35 blocks.
- Roof shingles: roof sq ft ÷ 100 = squares; 3 bundles per square. Add 10%.
- Underlayment: 1 roll per 4 squares. Drip edge: roof perimeter in linear feet.
- Flooring/tile: floor sq ft + 10% waste. Thinset: 1 bag per 50 sq ft. Grout: 1 bag per 100 sq ft.

SHOW THE CUSTOMER REAL PRODUCTS (build visual trust):
Whenever you name specific materials in your reply — even during intake, not just at the end — append a short list of search terms so the system can show the customer real product photos right under your message. The customer won't hear this; it renders as product cards so they SEE exactly what you mean and feel confident it's the right item.

<SHOW_PRODUCTS>["5/8 inch drywall 4x8", "drywall screws 1 lb", "joint compound"]</SHOW_PRODUCTS>

Only include the 1-4 items you actually named. Keep each term short and searchable, like a customer would type it. Skip it only when you haven't named any specific product yet.

WHEN YOU HAVE ENOUGH INFO TO BUILD THE CART:
At the end of your spoken response, append a JSON block (the user won't hear this, it's parsed by the system):

<CART_DATA>
{
  "ready": true,
  "projectSummary": "Brief project description",
  "materials": [
    {
      "name": "5/8 inch drywall sheets 4x8",
      "quantity": 20,
      "unit": "sheets",
      "category": "drywall",
      "searchQuery": "5/8 inch drywall 4x8"
    }
  ]
}
</CART_DATA>

IMPORTANT: Only include <CART_DATA> when you have collected all necessary dimensions and are ready to build the full cart. Do not include it during intake questions.

Your name is Jimmy. You work for Go Build Supply.`;

// ─── Types ────────────────────────────────────────────────────────────────────

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

// ─── Whisper transcription (direct multipart — no S3 round-trip) ──────────────

async function transcribeBuffer(audioBuffer: Buffer, mimeType: string): Promise<string> {
  const forgeApiUrl = ENV.forgeApiUrl;
  const forgeApiKey = ENV.forgeApiKey;

  if (!forgeApiUrl || !forgeApiKey) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Transcription service is not configured.",
    });
  }

  // Always strip codec suffix — Whisper only accepts the base MIME type
  const baseMime = mimeType.split(";")[0]?.trim().toLowerCase() ?? "audio/webm";

  const extMap: Record<string, string> = {
    "audio/webm": "webm",
    "audio/ogg":  "ogg",
    "audio/mp3":  "mp3",
    "audio/mpeg": "mp3",
    "audio/wav":  "wav",
    "audio/wave": "wav",
    "audio/m4a":  "m4a",
    "audio/mp4":  "m4a",
    "audio/flac": "flac",
  };
  const ext = extMap[baseMime] ?? "webm";

  const formData = new FormData();
  // Use baseMime (no codec suffix) so Whisper recognises the format
  const audioBlob = new Blob([new Uint8Array(audioBuffer)], { type: baseMime });
  formData.append("file", audioBlob, `recording.${ext}`);
  formData.append("model", "whisper-1");
  formData.append("response_format", "json");
  formData.append("language", "en");
  formData.append("prompt", "Construction, building materials, drywall, lumber, insulation, paint, fasteners, tools, deck, contractor, Go Build Supply");

  const baseUrl = forgeApiUrl.replace(/\/+$/, "");
  const whisperUrl = `${baseUrl}/v1/audio/transcriptions`;

  const response = await fetch(whisperUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${forgeApiKey}`,
      "Accept-Encoding": "identity",
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    console.error("[Whisper] Error:", response.status, errorText);
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Could not transcribe your audio. Please speak clearly and try again.",
    });
  }

  const data = (await response.json()) as { text?: string };
  const transcript = data?.text?.trim();

  if (!transcript) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Could not understand your audio. Please try speaking more clearly.",
    });
  }

  return transcript;
}

// ─── AI Chat via built-in LLM ─────────────────────────────────────────────────

type CartData = {
  ready: boolean;
  projectSummary: string;
  materials: Array<{
    name: string;
    quantity: number;
    unit: string;
    category: string;
    searchQuery: string;
  }>;
};

function parseCartData(reply: string): { spokenReply: string; cartData: CartData | null } {
  const match = reply.match(/<CART_DATA>([\s\S]*?)<\/CART_DATA>/);
  if (!match) return { spokenReply: reply.trim(), cartData: null };

  const spokenReply = reply.replace(/<CART_DATA>[\s\S]*?<\/CART_DATA>/g, "").trim();
  try {
    const cartData = JSON.parse(match[1].trim()) as CartData;
    return { spokenReply, cartData: cartData.ready ? cartData : null };
  } catch {
    return { spokenReply, cartData: null };
  }
}

// A lightweight product card shown live under Jimmy's message.
export type ProductPreview = {
  title: string;
  price: string;
  image: string | null;
  url: string;
  available: boolean;
};

/** Pull Jimmy's <SHOW_PRODUCTS> search terms out of the reply and strip the tag. */
function parseShowProducts(reply: string): { cleaned: string; queries: string[] } {
  const match = reply.match(/<SHOW_PRODUCTS>([\s\S]*?)<\/SHOW_PRODUCTS>/);
  if (!match) return { cleaned: reply, queries: [] };

  const cleaned = reply.replace(/<SHOW_PRODUCTS>[\s\S]*?<\/SHOW_PRODUCTS>/g, "").trim();
  try {
    const arr = JSON.parse(match[1].trim());
    if (Array.isArray(arr)) {
      const queries = arr.filter((q): q is string => typeof q === "string" && q.trim().length > 0).slice(0, 4);
      return { cleaned, queries };
    }
  } catch { /* ignore malformed list */ }
  return { cleaned, queries: [] };
}

/**
 * Turn Jimmy's raw reply into the spoken text, optional cart data, and the
 * live product photos to show the customer. Strips both control tags before TTS.
 */
async function processReply(reply: string): Promise<{
  spokenReply: string;
  cartData: CartData | null;
  productPreviews: ProductPreview[];
}> {
  const { cleaned, queries } = parseShowProducts(reply);
  const { spokenReply, cartData } = parseCartData(cleaned);

  let productPreviews: ProductPreview[] = [];
  if (queries.length) {
    const results = await Promise.all(
      queries.map((q) => searchProducts(q, 1).catch(() => [] as ShopifyProduct[])),
    );
    const seen = new Set<string>();
    productPreviews = results
      .map((r) => r[0])
      .filter((p): p is ShopifyProduct => !!p && !!p.image)
      .filter((p) => (seen.has(p.url) ? false : (seen.add(p.url), true)))
      .map((p) => ({ title: p.title, price: p.price, image: p.image, url: p.url, available: p.available }));
  }

  return { spokenReply, cartData, productPreviews };
}

/**
 * Search the store for whatever the customer just mentioned and turn the
 * results into a pricing cheat-sheet Jimmy can quote from. This is what lets
 * him answer "how much is X?" with a real number.
 */
async function buildPricingContext(userMessage: string): Promise<string | null> {
  const products = await searchProducts(userMessage, 5).catch(() => [] as ShopifyProduct[]);
  if (!products.length) return null;

  const lines = products
    .map((p) => `- ${p.title}: $${p.price}${p.available ? " (in stock)" : " (check stock)"}`)
    .join("\n");

  return `CURRENT GO BUILD SUPPLY PRICING (live, real prices — quote these confidently and offer to add them to the cart):\n${lines}`;
}

async function callAI(messages: ChatMessage[]): Promise<string> {
  const result = await invokeLLM({
    messages: messages.map(m => ({ role: m.role, content: m.content })),
    max_tokens: 800,
  });

  const reply = result?.choices?.[0]?.message?.content;
  if (!reply || typeof reply !== "string") {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "AI returned an empty response. Please try again.",
    });
  }

  return reply.trim();
}

// ─── ElevenLabs TTS ─────────────────────────────────────────────────────────

// Go Build Supply — custom branded voice
const ELEVENLABS_VOICE_ID = "kK4F9HTpnxmPabF0oJ7v";
const ELEVENLABS_MODEL    = "eleven_turbo_v2_5"; // fastest model, lowest latency

async function synthesizeSpeech(text: string): Promise<Buffer | null> {
  const apiKey = ENV.elevenLabsApiKey;
  if (!apiKey) return null;

  // Strip markdown links and symbols before sending to TTS
  const clean = text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // [label](url) → label
    .replace(/[*_`#>]/g, "")
    .replace(/https?:\/\/\S+/g, "")
    .trim();

  const body = JSON.stringify({
    text: clean,
    model_id: ELEVENLABS_MODEL,
    voice_settings: {
      stability: 0.45,          // slightly lower = more expressive
      similarity_boost: 0.80,   // stay close to the voice character
      style: 0.35,              // adds natural emphasis
      use_speaker_boost: true,  // clearer on mobile speakers
    },
  });

  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}?output_format=mp3_44100_128`,
    {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body,
    },
  );

  if (!response.ok) {
    const err = await response.text().catch(() => "");
    console.error("[ElevenLabs] TTS error:", response.status, err);
    return null;
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

// ─── Router ───────────────────────────────────────────────────────────────────

export const voiceRouter = router({
  /**
   * Main conversational endpoint:
   * 1. Decodes base64 audio and sends directly to Whisper (no S3 round-trip)
   * 2. Sends transcript + history to built-in LLM (contractor persona)
   * 3. Returns transcript + AI reply
   */
  transcribeAndChat: publicProcedure
    .input(
      z.object({
        audioBase64: z.string().min(1, "Audio data is required"),
        mimeType: z.string().default("audio/webm"),
        history: z
          .array(
            z.object({
              role: z.enum(["user", "assistant"]),
              content: z.string(),
            }),
          )
          .max(30)
          .default([]),
      }),
    )
    .mutation(async ({ input }) => {
      // 1. Decode base64 audio
      let audioBuffer: Buffer;
      try {
        audioBuffer = Buffer.from(input.audioBase64, "base64");
      } catch {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid audio data." });
      }

      if (audioBuffer.length < 100) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Audio recording is too short. Please try again.",
        });
      }

      if (audioBuffer.length > 16 * 1024 * 1024) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Audio recording is too large. Please keep it under 2 minutes.",
        });
      }

      // 2. Transcribe via Whisper
      const transcript = await transcribeBuffer(audioBuffer, input.mimeType);

      // 3. Pull live pricing for whatever they just asked about
      const pricingContext = await buildPricingContext(transcript);

      // 4. Build message thread with contractor persona + live pricing
      const messages: ChatMessage[] = [
        { role: "system", content: SYSTEM_PROMPT },
        ...(pricingContext ? [{ role: "system" as const, content: pricingContext }] : []),
        ...input.history.map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
        { role: "user", content: transcript },
      ];

      // 5. Call AI
      const reply = await callAI(messages);

      // 6. Parse spoken text, cart data, and the live product photos to show
      const { spokenReply, cartData, productPreviews } = await processReply(reply);

      // 7. Synthesize speech using only the spoken part (no control tags)
      const ttsBuffer = await synthesizeSpeech(spokenReply).catch(() => null);
      const audioBase64 = ttsBuffer ? ttsBuffer.toString("base64") : null;

      return { transcript, reply: spokenReply, audioBase64, cartData, productPreviews };
    }),

  /**
   * Text-only chat — for when we already have a transcript.
   */
  chat: publicProcedure
    .input(
      z.object({
        message: z.string().min(1).max(2000),
        history: z
          .array(
            z.object({
              role: z.enum(["user", "assistant"]),
              content: z.string(),
            }),
          )
          .max(30)
          .default([]),
      }),
    )
    .mutation(async ({ input }) => {
      const pricingContext = await buildPricingContext(input.message);

      const messages: ChatMessage[] = [
        { role: "system", content: SYSTEM_PROMPT },
        ...(pricingContext ? [{ role: "system" as const, content: pricingContext }] : []),
        ...input.history.map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
        { role: "user", content: input.message },
      ];

      const reply = await callAI(messages);

      const { spokenReply, cartData, productPreviews } = await processReply(reply);

      // Synthesize speech via ElevenLabs
      const ttsBuffer = await synthesizeSpeech(spokenReply).catch(() => null);
      const audioBase64 = ttsBuffer ? ttsBuffer.toString("base64") : null;

      return { reply: spokenReply, audioBase64, cartData, productPreviews };
    }),
});
