import { useState, useRef, useCallback, useEffect } from "react";
import {
  Mic, Volume2, VolumeX, ExternalLink, RotateCcw, AlertCircle,
  ShoppingCart, CheckCircle2, Loader2, Share2, Package, ChevronDown, ChevronUp, X, HardHat, Send
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Streamdown } from "streamdown";
import { linkifyResponse } from "@/lib/productLinks";

// ─── Types ────────────────────────────────────────────────────────────────────

type ProductPreview = {
  title: string;
  price: string;
  image: string | null;
  url: string;
  available: boolean;
};

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  products?: ProductPreview[];
};

type ConvState =
  | "idle"
  | "ready"
  | "recording"
  | "processing"
  | "responding"
  | "error";

type CartItem = {
  materialName: string;
  materialUnit: string;
  quantity: number;
  product: {
    id: number;
    title: string;
    handle: string;
    price: string;
    image: string | null;
    url: string;
    variantId: number | null;
    sku: string | null;
    available: boolean;
  };
};

type CartState =
  | { status: "idle" }
  | { status: "building" }
  | { status: "ready"; items: CartItem[]; unmatched: Array<{ name: string; quantity: number; unit: string }>; cartUrl: string; estimatedTotal: string; projectSummary: string };

const SESSION_KEY = "gbs_conversation";
const MIN_HOLD_MS = 50;
const TIMEOUT_MS  = 12000;

// ─── Logging ─────────────────────────────────────────────────────────────────

const log = {
  session:   (m: string) => console.log(`[Jimmy][Session] ${m}`),
  mic:       (m: string) => console.log(`[Jimmy][Mic] ${m}`),
  speech:    (m: string) => console.log(`[Jimmy][Speech] ${m}`),
  ai:        (m: string) => console.log(`[Jimmy][AI] ${m}`),
  audio:     (m: string) => console.log(`[Jimmy][Audio] ${m}`),
  reconnect: (m: string) => console.log(`[Jimmy][Reconnect] ${m}`),
  error:     (m: string) => console.error(`[Jimmy][Error] ${m}`),
};

function uid() { return Math.random().toString(36).slice(2, 10); }

// ─── WaveVisualizer ───────────────────────────────────────────────────────────

function WaveVisualizer({ active }: { active: boolean }) {
  return (
    <div className="flex items-center justify-center gap-[4px] h-8">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className={`rounded-full bg-white ${active ? "animate-bounce" : ""}`}
          style={{ width: 3, height: active ? `${40 + Math.sin(i * 1.2) * 30}%` : "15%",
            opacity: active ? 0.9 : 0.3, animationDelay: `${i * 80}ms`, animationDuration: "600ms" }} />
      ))}
    </div>
  );
}

// ─── StatusPill ───────────────────────────────────────────────────────────────

function StatusPill({ state }: { state: ConvState }) {
  const config: Record<ConvState, { text: string; color: string }> = {
    idle:       { text: "Tap to start",               color: "text-zinc-400" },
    ready:      { text: "Hold to speak",              color: "text-[#FF5A1F]" },
    recording:  { text: "Recording… release to send", color: "text-red-400" },
    processing: { text: "Thinking…",                  color: "text-amber-400" },
    responding: { text: "Speaking…",                  color: "text-violet-400" },
    error:      { text: "Tap to restart",             color: "text-red-400" },
  };
  const { text, color } = config[state];
  return (
    <div className="text-center min-h-[2.5rem]">
      <p className={`text-sm font-medium transition-colors duration-300 ${color}`}>{text}</p>
    </div>
  );
}

// ─── ChatMessage ──────────────────────────────────────────────────────────────

function ChatMessage({ msg }: { msg: Message }) {
  const isUser = msg.role === "user";
  const displayContent = isUser ? msg.content : linkifyResponse(msg.content);
  const aiContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isUser || !aiContentRef.current) return;
    aiContentRef.current.querySelectorAll("a").forEach(a => {
      a.setAttribute("target", "_blank");
      a.setAttribute("rel", "noopener noreferrer");
    });
  });

  return (
    <div className={`flex w-full ${isUser ? "justify-end" : "justify-start"} animate-fade-in-up`}>
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-[#FF5A1F] flex items-center justify-center flex-shrink-0 mt-0.5 mr-2.5 text-white" title="Jimmy">
          <HardHat className="w-4 h-4" strokeWidth={2} />
        </div>
      )}
      <div className={`flex flex-col ${isUser ? "items-end" : "items-start"} max-w-[82%] sm:max-w-[72%] min-w-0`}>
        <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
          isUser ? "bg-zinc-900 text-white rounded-br-sm" : "bg-white border border-zinc-100 text-zinc-800 rounded-bl-sm shadow-sm"
        }`}>
          {isUser ? <p>{msg.content}</p> : (
            <div ref={aiContentRef} className="prose prose-sm prose-zinc max-w-none [&_a]:text-blue-600 [&_a]:underline [&_a]:font-medium [&_a]:transition-colors">
              <Streamdown>{displayContent}</Streamdown>
            </div>
          )}
        </div>
        {!isUser && msg.products && msg.products.length > 0 && (
          <ProductStrip products={msg.products} />
        )}
      </div>
      {isUser && (
        <div className="w-7 h-7 rounded-full bg-zinc-200 flex items-center justify-center flex-shrink-0 mt-0.5 ml-2.5 text-zinc-600 text-[10px] font-bold">You</div>
      )}
    </div>
  );
}

// ─── ProductStrip — live product photos under Jimmy's message ─────────────────

function ProductStrip({ products }: { products: ProductPreview[] }) {
  return (
    <div className="mt-2 flex gap-2.5 overflow-x-auto pb-1 -mx-1 px-1 max-w-full snap-x">
      {products.map((p, i) => (
        <a
          key={i}
          href={p.url}
          target="_blank"
          rel="noopener noreferrer"
          className="group flex-shrink-0 w-32 snap-start bg-white border border-zinc-200 rounded-xl overflow-hidden hover:border-[#FF5A1F] transition-colors shadow-sm"
        >
          <div className="aspect-square bg-[#FCEDD9] flex items-center justify-center overflow-hidden">
            {p.image ? (
              <img src={p.image} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200" />
            ) : (
              <Package className="w-7 h-7 text-zinc-300" />
            )}
          </div>
          <div className="p-2">
            <p className="text-[11px] font-medium text-zinc-800 leading-tight line-clamp-2 min-h-[28px]">{p.title}</p>
            <div className="flex items-center justify-between mt-1.5">
              <span className="text-xs font-bold text-zinc-900">${p.price}</span>
              {p.available && (
                <span className="inline-flex items-center gap-0.5 text-[9px] text-green-600 font-medium">
                  <CheckCircle2 className="w-2.5 h-2.5" /> stock
                </span>
              )}
            </div>
          </div>
        </a>
      ))}
    </div>
  );
}

// ─── CartBuildingBanner ───────────────────────────────────────────────────────

function CartBuildingBanner() {
  return (
    <div className="w-full max-w-2xl mx-auto mt-6 animate-fade-in-up">
      <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 flex items-center gap-3">
        <Loader2 className="w-5 h-5 text-amber-500 animate-spin flex-shrink-0" />
        <div>
          <p className="text-sm font-semibold text-amber-800">Building your cart…</p>
          <p className="text-xs text-amber-600 mt-0.5">Searching Go Build Supply for your materials</p>
        </div>
      </div>
    </div>
  );
}

// ─── CartReviewScreen ─────────────────────────────────────────────────────────

function CartReviewScreen({
  cart,
  onDismiss,
  onReset,
}: {
  cart: Extract<CartState, { status: "ready" }>;
  onDismiss: () => void;
  onReset: () => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const text = `My project cart from Go Build Supply:\n${cart.cartUrl}`;
    if (navigator.share) {
      await navigator.share({ title: "My Go Build Supply Cart", url: cart.cartUrl, text }).catch(() => {});
    } else {
      await navigator.clipboard.writeText(cart.cartUrl).catch(() => {});
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto mt-8 animate-fade-in-up">
      {/* Header */}
      <div className="bg-zinc-900 text-white rounded-t-2xl px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <ShoppingCart className="w-5 h-5 text-green-400" />
          <div>
            <p className="text-sm font-bold">Project Cart Ready</p>
            <p className="text-xs text-zinc-400 mt-0.5">{cart.projectSummary}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setExpanded(v => !v)}
            className="p-1.5 rounded-lg hover:bg-zinc-800 transition-colors text-zinc-400 hover:text-white">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          <button onClick={onDismiss}
            className="p-1.5 rounded-lg hover:bg-zinc-800 transition-colors text-zinc-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {expanded && (
        <>
          {/* Item gallery — big product photos so the customer sees exactly what they're getting */}
          <div className="bg-white border-x border-zinc-200 px-4 py-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {cart.items.map((item, i) => (
                <a
                  key={i}
                  href={item.product.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex flex-col bg-white border border-zinc-200 rounded-xl overflow-hidden hover:border-[#FF5A1F] hover:shadow-md transition-all"
                >
                  <div className="relative aspect-square bg-[#FCEDD9] flex items-center justify-center overflow-hidden">
                    {item.product.image ? (
                      <img src={item.product.image} alt={item.product.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200" />
                    ) : (
                      <Package className="w-9 h-9 text-zinc-300" />
                    )}
                    <span className="absolute top-2 right-2 bg-zinc-900/90 text-white text-xs font-bold px-2 py-0.5 rounded-full">×{item.quantity}</span>
                    {item.product.available ? (
                      <span className="absolute bottom-2 left-2 inline-flex items-center gap-0.5 bg-green-500 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded-full">
                        <CheckCircle2 className="w-2.5 h-2.5" /> In stock
                      </span>
                    ) : (
                      <span className="absolute bottom-2 left-2 bg-amber-500 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded-full">Check stock</span>
                    )}
                  </div>
                  <div className="p-2.5 flex flex-col flex-1">
                    <p className="text-[10px] font-semibold text-[#FF5A1F] uppercase tracking-wide line-clamp-1">{item.materialName}</p>
                    <p className="text-xs font-medium text-zinc-900 leading-snug line-clamp-2 mt-0.5 flex-1">{item.product.title}</p>
                    <div className="flex items-baseline justify-between mt-1.5">
                      <span className="text-sm font-bold text-zinc-900">${(parseFloat(item.product.price) * item.quantity).toFixed(2)}</span>
                      <span className="text-[10px] text-zinc-400">${item.product.price} ea</span>
                    </div>
                  </div>
                </a>
              ))}
            </div>

            {/* Unmatched items */}
            {cart.unmatched.length > 0 && (
              <div className="mt-4 px-3 py-3 bg-amber-50 rounded-xl">
                <p className="text-xs font-semibold text-amber-700 mb-1.5">Also ask your rep about:</p>
                <div className="flex flex-wrap gap-1.5">
                  {cart.unmatched.map((u, i) => (
                    <span key={i} className="text-xs bg-amber-100 text-amber-800 rounded-full px-2.5 py-0.5">
                      {u.quantity} {u.unit} {u.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Total + CTA */}
          <div className="bg-zinc-50 border border-zinc-200 rounded-b-2xl px-5 py-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs text-zinc-500">Estimated subtotal</p>
                <p className="text-2xl font-bold text-zinc-900">${cart.estimatedTotal}</p>
              </div>
              <p className="text-xs text-zinc-400 text-right max-w-[140px]">
                {cart.items.length} item{cart.items.length !== 1 ? "s" : ""} matched<br />
                Prices from gobuildsupply.com
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5">
              <a
                href={cart.cartUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 bg-zinc-900 hover:bg-zinc-700 text-white text-sm font-semibold px-5 py-3.5 rounded-xl transition-all duration-200 active:scale-95 shadow-sm"
              >
                <ShoppingCart className="w-4 h-4" />
                Checkout Now
              </a>
              <button
                onClick={handleShare}
                className="flex-1 flex items-center justify-center gap-2 bg-white hover:bg-zinc-100 text-zinc-800 text-sm font-semibold px-5 py-3.5 rounded-xl border border-zinc-200 transition-all duration-200 active:scale-95"
              >
                <Share2 className="w-4 h-4" />
                {copied ? "Link Copied!" : "Share Cart"}
              </button>
            </div>

            <button
              onClick={onReset}
              className="w-full mt-2.5 text-xs text-zinc-400 hover:text-zinc-600 transition-colors py-1.5"
            >
              Start a new project
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Home() {
  const [convState, setConvState] = useState<ConvState>("idle");
  const [messages, setMessages]   = useState<Message[]>(() => {
    try { return JSON.parse(sessionStorage.getItem(SESSION_KEY) ?? "[]"); } catch { return []; }
  });
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [isPending, setIsPending]   = useState(false);
  const [cartState, setCartState]   = useState<CartState>({ status: "idle" });

  // ── ALL state mirrored in refs so callbacks never go stale ────────────────
  const convStateRef  = useRef<ConvState>("idle");
  const messagesRef   = useRef<Message[]>([]);
  const ttsEnabledRef = useRef(true);
  useEffect(() => { convStateRef.current  = convState;  }, [convState]);
  useEffect(() => { messagesRef.current   = messages;   }, [messages]);
  useEffect(() => { ttsEnabledRef.current = ttsEnabled; }, [ttsEnabled]);

  useEffect(() => {
    try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(messages)); } catch { /* ignore */ }
  }, [messages]);

  // ── Recording refs ────────────────────────────────────────────────────────
  const streamRef    = useRef<MediaStream | null>(null);
  const mediaRecRef  = useRef<MediaRecorder | null>(null);
  const chunksRef    = useRef<Blob[]>([]);
  const mimeTypeRef  = useRef("audio/webm");
  const holdStartRef = useRef<number>(0);
  const isHoldingRef = useRef(false);
  const sessionIdRef = useRef<string>(uid());

  // ── Audio playback refs ───────────────────────────────────────────────────
  const audioElRef       = useRef<HTMLAudioElement | null>(null);
  const audioUnlockedRef = useRef(false);
  const voiceRef         = useRef<SpeechSynthesisVoice | null>(null);

  // ── Timeout refs ──────────────────────────────────────────────────────────
  const timeoutRef     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectRef   = useRef(false);

  // ── tRPC — stable mutate refs ─────────────────────────────────────────────
  const transcribeAndChat = trpc.voice.transcribeAndChat.useMutation();
  const textChat          = trpc.voice.chat.useMutation();
  const buildCartMutation = trpc.cart.buildCart.useMutation();
  const mutateRef     = useRef(transcribeAndChat.mutateAsync);
  const textChatRef   = useRef(textChat.mutateAsync);
  const buildCartRef  = useRef(buildCartMutation.mutateAsync);
  useEffect(() => { mutateRef.current    = transcribeAndChat.mutateAsync; }, [transcribeAndChat.mutateAsync]);
  useEffect(() => { textChatRef.current  = textChat.mutateAsync; }, [textChat.mutateAsync]);
  useEffect(() => { buildCartRef.current = buildCartMutation.mutateAsync; }, [buildCartMutation.mutateAsync]);

  // ── Typed text input (for noisy/quiet places — type instead of speak) ───────
  const [textInput, setTextInput] = useState("");

  // ── Scroll ────────────────────────────────────────────────────────────────
  const chatEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }), 80);
    }
  }, [messages]);

  // ── Voice selection ───────────────────────────────────────────────────────
  const pickVoice = useCallback(() => {
    const voices = window.speechSynthesis?.getVoices() ?? [];
    if (!voices.length) return;
    const priority = ["Google US English", "Microsoft Guy Online", "Microsoft David Online", "Microsoft David", "Alex", "Fred"];
    for (const name of priority) {
      const v = voices.find(v => v.name === name);
      if (v) { voiceRef.current = v; return; }
    }
    const en = voices.find(v => v.lang.startsWith("en-US")) || voices.find(v => v.lang.startsWith("en"));
    if (en) voiceRef.current = en;
  }, []);

  useEffect(() => {
    if (!window.speechSynthesis) return;
    pickVoice();
    window.speechSynthesis.addEventListener("voiceschanged", pickVoice);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", pickVoice);
  }, [pickVoice]);

  // ── Force-stop recording ──────────────────────────────────────────────────
  const forceStopRecording = useCallback((reason: string) => {
    if (!isHoldingRef.current) return;
    isHoldingRef.current = false;
    log.mic(`Force-stop recording: ${reason}`);
    const rec = mediaRecRef.current;
    if (rec && rec.state !== "inactive") {
      rec.ondataavailable = null;
      rec.onstop = null;
      try { rec.stop(); } catch { /* ignore */ }
    }
    mediaRecRef.current = null;
  }, []);

  // ── Global safety net ─────────────────────────────────────────────────────
  useEffect(() => {
    const onPointerUp = () => {
      if (isHoldingRef.current) {
        log.mic("Global pointerup — force-stopping recording");
        forceStopRecording("global pointerup");
        if (convStateRef.current === "recording") setConvState("ready");
      }
    };
    const onVisibilityChange = () => {
      if (document.hidden && isHoldingRef.current) {
        log.mic("Page hidden — force-stopping recording");
        forceStopRecording("visibility hidden");
        if (convStateRef.current === "recording") setConvState("ready");
      }
    };
    const onBlur = () => {
      if (isHoldingRef.current) {
        log.mic("Window blur — force-stopping recording");
        forceStopRecording("window blur");
        if (convStateRef.current === "recording") setConvState("ready");
      }
    };
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("blur", onBlur);
    };
  }, [forceStopRecording]);

  // ── TTS: stop ────────────────────────────────────────────────────────────
  const stopSpeaking = useCallback(() => {
    const audio = audioElRef.current;
    if (audio) { audio.pause(); audio.onended = null; audio.onerror = null; }
    window.speechSynthesis?.cancel();
  }, []);

  // ── TTS: unlock audio ─────────────────────────────────────────────────────
  const unlockAudio = useCallback(() => {
    if (audioUnlockedRef.current) return;
    audioUnlockedRef.current = true;
    const audio = new Audio();
    audio.src = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=";
    audio.volume = 0;
    audio.play().catch(() => {});
    audioElRef.current = audio;
    log.audio("Audio context unlocked");
    if (window.speechSynthesis) {
      if (!voiceRef.current) pickVoice();
      const u = new SpeechSynthesisUtterance(""); u.volume = 0;
      window.speechSynthesis.speak(u);
      window.speechSynthesis.cancel();
    }
  }, [pickVoice]);

  // ── TTS: play ElevenLabs ─────────────────────────────────────────────────
  const playElevenLabsAudio = useCallback((base64: string, onEnd: () => void): boolean => {
    try {
      let audio = audioElRef.current;
      if (!audio) { audio = new Audio(); audioElRef.current = audio; }
      audio.pause(); audio.onended = null; audio.onerror = null;
      audio.src = `data:audio/mpeg;base64,${base64}`;
      audio.volume = 1.0;
      audio.onended = () => { log.audio("Playback ended"); onEnd(); };
      audio.onerror = () => { log.error("Audio playback error"); onEnd(); };
      const p = audio.play();
      if (p) p.catch(() => { log.error("Autoplay blocked"); onEnd(); });
      log.audio("Playback started (ElevenLabs)");
      return true;
    } catch { return false; }
  }, []);

  // ── TTS: browser fallback ─────────────────────────────────────────────────
  const speakFallback = useCallback((text: string, onEnd: () => void) => {
    if (!window.speechSynthesis) { onEnd(); return; }
    if (!voiceRef.current) pickVoice();
    window.speechSynthesis.cancel();
    const clean = text
      .replace(/\*\*(.*?)\*\*/g, "$1").replace(/\*(.*?)\*/g, "$1")
      .replace(/`([^`]+)`/g, "$1").replace(/#{1,6}\s/g, "")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/\n{2,}/g, ". ").replace(/\n/g, " ").trim();
    const utt = new SpeechSynthesisUtterance(clean);
    utt.rate = 1.08; utt.pitch = 0.88; utt.volume = 1.0;
    if (voiceRef.current) utt.voice = voiceRef.current;
    utt.onend  = () => { log.audio("Playback ended (fallback)"); onEnd(); };
    utt.onerror = () => { log.error("SpeechSynthesis error"); onEnd(); };
    window.speechSynthesis.speak(utt);
    log.audio("Playback started (browser TTS)");
  }, [pickVoice]);

  // ── TTS: main speak ───────────────────────────────────────────────────────
  const speak = useCallback((text: string, onEnd: () => void, elevenBase64?: string | null) => {
    if (!ttsEnabledRef.current) { onEnd(); return; }
    if (elevenBase64) {
      const started = playElevenLabsAudio(elevenBase64, onEnd);
      if (started) return;
    }
    speakFallback(text, onEnd);
  }, [playElevenLabsAudio, speakFallback]);

  const speakRef = useRef(speak);
  useEffect(() => { speakRef.current = speak; }, [speak]);

  // ── Clear timeout ─────────────────────────────────────────────────────────
  const clearTout = useCallback(() => {
    if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }
  }, []);

  // ── Build cart from material list ─────────────────────────────────────────
  const triggerBuildCart = useCallback(async (cartData: {
    projectSummary: string;
    materials: Array<{ name: string; quantity: number; unit: string; category: string; searchQuery: string }>;
  }) => {
    log.session("Building cart from material list…");
    setCartState({ status: "building" });
    try {
      const result = await buildCartRef.current({ materials: cartData.materials });
      log.session(`Cart built: ${result.itemCount} items, $${result.estimatedTotal}`);
      setCartState({
        status: "ready",
        items: result.cartItems,
        unmatched: result.unmatched,
        cartUrl: result.cartUrl,
        estimatedTotal: result.estimatedTotal,
        projectSummary: cartData.projectSummary,
      });
    } catch (err) {
      log.error(`Cart build failed: ${err}`);
      setCartState({ status: "idle" });
    }
  }, []);

  // ── Send audio to backend ─────────────────────────────────────────────────
  const sendAudio = useCallback(async (blob: Blob) => {
    if (blob.size < 100) { setConvState("ready"); return; }

    const thisSession = sessionIdRef.current;
    log.speech(`Speech detected — ${blob.size} bytes, session ${thisSession}`);

    setConvState("processing");
    setIsPending(true);
    setError(null);
    reconnectRef.current = false;

    clearTout();
    timeoutRef.current = setTimeout(() => {
      if (sessionIdRef.current !== thisSession) return;
      if (convStateRef.current !== "processing" && convStateRef.current !== "responding") return;
      log.error("Timeout — showing error");
      setError("Connection issue — tap to restart");
      setConvState("error");
      setIsPending(false);
      clearTout();
    }, TIMEOUT_MS);

    try {
      const arrayBuffer = await blob.arrayBuffer();
      const uint8 = new Uint8Array(arrayBuffer);
      let binary = "";
      for (let i = 0; i < uint8.length; i += 8192) {
        binary += String.fromCharCode(...Array.from(uint8.subarray(i, i + 8192)));
      }
      const base64 = btoa(binary);
      const history = messagesRef.current.map(m => ({ role: m.role, content: m.content }));

      const result = await mutateRef.current({ audioBase64: base64, mimeType: mimeTypeRef.current, history });

      if (sessionIdRef.current !== thisSession) {
        log.session("Discarding stale response (session rotated)");
        return;
      }

      clearTout();
      log.ai(`Response: "${result.reply.slice(0, 80)}…"`);

      const userMsg: Message = { id: uid(), role: "user",      content: result.transcript };
      const aiMsg:   Message = { id: uid(), role: "assistant", content: result.reply, products: result.productPreviews ?? [] };
      setMessages(prev => [...prev, userMsg, aiMsg]);
      setConvState("responding");

      // If Jimmy returned cart data, build the cart in the background
      if (result.cartData?.ready && result.cartData.materials?.length > 0) {
        log.session("Cart data received — triggering background cart build");
        triggerBuildCart(result.cartData);
      }

      const ttsTimeout = setTimeout(() => {
        if (sessionIdRef.current === thisSession && convStateRef.current === "responding") {
          log.error("TTS timeout — forcing ready");
          setConvState("ready");
        }
      }, 30000);

      speakRef.current(result.reply, () => {
        clearTimeout(ttsTimeout);
        if (sessionIdRef.current !== thisSession) return;
        log.session("Response complete — ready for next question");
        setConvState("ready");
      }, result.audioBase64 ?? null);

    } catch (err: any) {
      if (sessionIdRef.current !== thisSession) return;
      clearTout();
      log.error(`API error: ${err?.message}`);
      const msg = err?.data?.message || err?.message || "Something went wrong. Please try again.";
      setError(msg);
      setConvState("error");
      setTimeout(() => {
        if (sessionIdRef.current === thisSession && convStateRef.current === "error") {
          setError(null);
          setConvState("ready");
        }
      }, 3000);
    } finally {
      if (sessionIdRef.current === thisSession) setIsPending(false);
    }
  }, [clearTout, triggerBuildCart]);

  // ── Send TYPED text (no mic needed — for noisy or quiet places) ─────────────
  const sendText = useCallback(async (raw: string) => {
    const text = raw.trim();
    if (!text || convStateRef.current === "processing") return;
    unlockAudio();
    setTextInput("");

    const thisSession = sessionIdRef.current;
    setConvState("processing");
    setIsPending(true);
    setError(null);

    // Show the customer's typed message right away.
    const history = messagesRef.current.map(m => ({ role: m.role, content: m.content }));
    setMessages(prev => [...prev, { id: uid(), role: "user", content: text }]);

    try {
      const result = await textChatRef.current({ message: text, history });
      if (sessionIdRef.current !== thisSession) return;

      const aiMsg: Message = { id: uid(), role: "assistant", content: result.reply, products: result.productPreviews ?? [] };
      setMessages(prev => [...prev, aiMsg]);
      setConvState("responding");

      if (result.cartData?.ready && result.cartData.materials?.length > 0) {
        triggerBuildCart(result.cartData);
      }

      const ttsTimeout = setTimeout(() => {
        if (convStateRef.current === "responding") setConvState("ready");
      }, 30000);
      speakRef.current(result.reply, () => {
        clearTimeout(ttsTimeout);
        if (sessionIdRef.current === thisSession) setConvState("ready");
      }, result.audioBase64 ?? null);
    } catch (err: any) {
      if (sessionIdRef.current !== thisSession) return;
      const msg = err?.data?.message || err?.message || "Something went wrong. Please try again.";
      setError(msg);
      setConvState("error");
      setTimeout(() => {
        if (convStateRef.current === "error") { setError(null); setConvState("ready"); }
      }, 3000);
    } finally {
      if (sessionIdRef.current === thisSession) setIsPending(false);
    }
  }, [unlockAudio, triggerBuildCart]);

  // ── Init mic ──────────────────────────────────────────────────────────────
  const initMic = useCallback(async () => {
    log.session(`Starting new session (${sessionIdRef.current})`);

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    forceStopRecording("new session");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, sampleRate: 16000 },
      });
      streamRef.current = stream;
      log.mic(`Connected: ${stream.getTracks().map(t => t.label).join(", ")}`);

      mimeTypeRef.current = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/ogg";

      setConvState("ready");
      setError(null);

      if (messagesRef.current.length === 0) {
        const greeting = "Hey! I'm Jimmy — your Go Build Supply contractor. Tell me about your project and I'll calculate exactly what you need and build your cart automatically. What are you building today?";
        setConvState("responding");
        setMessages([{ id: uid(), role: "assistant", content: greeting }]);

        const greetTimeout = setTimeout(() => {
          if (convStateRef.current === "responding") {
            log.error("Greeting TTS timeout — forcing ready");
            setConvState("ready");
          }
        }, 20000);

        speakRef.current(greeting, () => {
          clearTimeout(greetTimeout);
          setConvState("ready");
        });
      }
    } catch (e) {
      log.error(`Mic access denied: ${e}`);
      setError("Microphone access denied. Please allow microphone access and tap to retry.");
      setConvState("error");
    }
  }, [forceStopRecording]);

  const initMicRef = useRef(initMic);
  useEffect(() => { initMicRef.current = initMic; }, [initMic]);

  // ── Push-to-talk: pointer DOWN ────────────────────────────────────────────
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    unlockAudio();

    const currentState = convStateRef.current;
    log.mic(`Pointer down — state: ${currentState}`);

    if (currentState === "idle" || currentState === "error") {
      sessionIdRef.current = uid();
      reconnectRef.current = false;
      initMicRef.current();
      return;
    }

    if (currentState === "responding") stopSpeaking();
    if (currentState === "processing") return;

    if (!streamRef.current) {
      log.mic("Stream lost — reinitialising");
      sessionIdRef.current = uid();
      initMicRef.current();
      return;
    }

    const oldRec = mediaRecRef.current;
    if (oldRec) {
      oldRec.ondataavailable = null;
      oldRec.onstop = null;
      if (oldRec.state !== "inactive") { try { oldRec.stop(); } catch { /* ignore */ } }
      mediaRecRef.current = null;
    }

    // Check if the stream tracks are still live — they can end silently
    // when the browser routes audio through the speaker for TTS playback
    const tracks = streamRef.current?.getAudioTracks() ?? [];
    const tracksLive = tracks.length > 0 && tracks.every(t => t.readyState === "live");
    if (!tracksLive) {
      log.mic("Stream tracks ended — re-acquiring mic");
      sessionIdRef.current = uid();
      initMicRef.current();
      return;
    }

    isHoldingRef.current = true;
    holdStartRef.current = Date.now();
    chunksRef.current = [];

    try {
      const rec = new MediaRecorder(streamRef.current!, { mimeType: mimeTypeRef.current });
      mediaRecRef.current = rec;
      rec.ondataavailable = (ev) => {
        if (ev.data.size > 0) {
          chunksRef.current.push(ev.data);
          log.mic(`Chunk: ${ev.data.size} bytes (total chunks: ${chunksRef.current.length})`);
        }
      };
      rec.start(100);
      setConvState("recording");
      log.mic("Recording started");
    } catch (err) {
      log.error(`Failed to start recorder: ${err}`);
      isHoldingRef.current = false;
      streamRef.current = null;
      setConvState("idle");
    }
  }, [unlockAudio, stopSpeaking]);

  // ── Push-to-talk: pointer UP ──────────────────────────────────────────────
  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    log.mic(`Pointer up — isHolding: ${isHoldingRef.current}`);

    if (!isHoldingRef.current) return;
    isHoldingRef.current = false;

    const rec = mediaRecRef.current;
    if (!rec || rec.state === "inactive") {
      setConvState(prev => prev === "recording" ? "ready" : prev);
      return;
    }

    const holdDuration = Date.now() - holdStartRef.current;
    log.mic(`Held ${holdDuration}ms`);

    rec.stop();
    rec.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mimeTypeRef.current });
      if (holdDuration < MIN_HOLD_MS || blob.size < 100) {
        log.mic("Too short — discarding");
        setConvState("ready");
        return;
      }
      sendAudio(blob);
    };
  }, [sendAudio]);

  // ── Reset conversation ────────────────────────────────────────────────────
  const resetConversation = useCallback(() => {
    log.session("Manual reset");
    clearTout();
    forceStopRecording("manual reset");
    stopSpeaking();
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    audioUnlockedRef.current = false;
    audioElRef.current = null;
    sessionIdRef.current = uid();
    reconnectRef.current = false;
    setConvState("idle");
    setMessages([]);
    setError(null);
    setIsPending(false);
    setCartState({ status: "idle" });
    try { sessionStorage.removeItem(SESSION_KEY); } catch { /* ignore */ }
    log.session("Reset complete");
  }, [clearTout, forceStopRecording, stopSpeaking]);

  // ── Cleanup on unmount ────────────────────────────────────────────────────
  useEffect(() => () => {
    clearTout();
    stopSpeaking();
    streamRef.current?.getTracks().forEach(t => t.stop());
  }, [clearTout, stopSpeaking]);

  // ── Derived ───────────────────────────────────────────────────────────────
  const isRecording  = convState === "recording";
  const isResponding = convState === "responding";
  const hasMessages  = messages.length > 0;
  const isIdle       = convState === "idle";

  const micButtonClass = (() => {
    const base = `relative w-24 h-24 sm:w-28 sm:h-28 rounded-full flex items-center justify-center transition-all duration-200 ease-out focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-400/40 cursor-pointer select-none`;
    if (isRecording)               return `${base} bg-red-500 scale-110 shadow-[0_0_0_12px_rgba(239,68,68,0.15)]`;
    if (isResponding)              return `${base} bg-violet-500`;
    if (convState === "processing") return `${base} bg-amber-500`;
    if (convState === "ready")      return `${base} bg-[#FF5A1F] hover:bg-[#E04510] active:scale-95`;
    if (convState === "error")      return `${base} bg-red-400 hover:bg-red-500 active:scale-95`;
    return `${base} bg-zinc-900 hover:bg-zinc-700 active:scale-95`;
  })();

  // ── Embed mode ──────────────────────────────────────────────────────────────
  // When loaded inside the BigCommerce storefront (?embed=1) hide the page's own
  // header/footer so Jimmy sits cleanly inside the store's existing chrome.
  const isEmbed = typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("embed") === "1";

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className={`${isEmbed ? "min-h-[560px]" : "min-h-screen"} bg-[#FFF7EE] flex flex-col`}>

      {/* Nav */}
      {!isEmbed && (
      <header className="w-full px-6 py-5 flex items-center justify-between max-w-5xl mx-auto">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-[#FF5A1F] flex items-center justify-center text-white">
            <HardHat className="w-4 h-4" strokeWidth={2} />
          </div>
          <span className="text-sm font-bold tracking-tight text-zinc-900">Jimmy <span className="text-zinc-400 font-normal">· Go Build Supply</span></span>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => { setTtsEnabled(v => !v); if (ttsEnabled) stopSpeaking(); }}
            className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-700 transition-colors"
            title={ttsEnabled ? "Mute AI voice" : "Unmute AI voice"}
          >
            {ttsEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            <span className="hidden sm:inline">{ttsEnabled ? "AI voice on" : "AI voice off"}</span>
          </button>
          <a href="https://www.gobuildsupply.com" target="_blank" rel="noopener noreferrer"
            className="text-xs text-zinc-400 hover:text-zinc-900 transition-colors flex items-center gap-1">
            gobuildsupply.com <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </header>
      )}

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center px-6 pt-10 pb-24 sm:pt-16">
        <div className="w-full max-w-2xl mx-auto text-center">

          <div className="animate-fade-in-up flex flex-col items-center">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-[#FF5A1F] flex items-center justify-center text-white shadow-[0_0_0_8px_rgba(255,90,31,0.12)]">
              <HardHat className="w-10 h-10 sm:w-12 sm:h-12" strokeWidth={1.5} />
            </div>
            <span className="mt-3 text-xs font-semibold tracking-widest uppercase text-[#FF5A1F]">Your build buddy</span>
          </div>
          <div className="animate-fade-in-up mt-4" style={{ animationDelay: "60ms" }}>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-zinc-900 leading-[1.1]">
              Hey, I'm Jimmy.
            </h1>
          </div>
          <div className="animate-fade-in-up mt-2" style={{ animationDelay: "120ms" }}>
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-light tracking-tight text-zinc-400 leading-[1.1]">
              What are we building?
            </h2>
          </div>
          <div className="animate-fade-in-up mt-5" style={{ animationDelay: "180ms" }}>
            <p className="text-base sm:text-lg text-zinc-500 max-w-md mx-auto leading-relaxed">
              Tell me your project. I'll calculate every material and build your cart — automatically.
            </p>
          </div>

          {/* Mic button */}
          <div className="animate-fade-in-up mt-12 flex flex-col items-center gap-5" style={{ animationDelay: "180ms" }}>
            <button
              className={micButtonClass}
              style={{ touchAction: "none" }}
              aria-label={isIdle ? "Tap to start" : isRecording ? "Recording — release to send" : "Hold to speak"}
              onPointerDown={handlePointerDown}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
            >
              {isRecording || isResponding ? (
                <WaveVisualizer active={true} />
              ) : (
                <Mic className="w-9 h-9 sm:w-10 sm:h-10 text-white" strokeWidth={1.5} />
              )}
              {isRecording && (
                <span className="absolute inset-0 rounded-full animate-ping bg-red-400 opacity-30 pointer-events-none" />
              )}
            </button>

            <StatusPill state={convState} />

            {/* Type instead of talk — for noisy or quiet places */}
            <div className="w-full max-w-md mt-1">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex-1 h-px bg-zinc-200" />
                <span className="text-[11px] text-zinc-400 tracking-wide uppercase">or type it</span>
                <div className="flex-1 h-px bg-zinc-200" />
              </div>
              <form
                onSubmit={(e) => { e.preventDefault(); sendText(textInput); }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder="Type your project…  e.g. drywall for a 10×12 room"
                  disabled={convState === "processing"}
                  className="flex-1 h-12 rounded-full border border-zinc-200 bg-white px-5 text-sm text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:border-[#FF5A1F] transition-colors disabled:opacity-60"
                />
                <button
                  type="submit"
                  disabled={!textInput.trim() || convState === "processing"}
                  aria-label="Send"
                  className="w-12 h-12 flex-shrink-0 rounded-full bg-[#FF5A1F] hover:bg-[#E04510] disabled:opacity-40 disabled:hover:bg-[#FF5A1F] text-white flex items-center justify-center transition-all active:scale-95"
                >
                  <Send className="w-5 h-5" strokeWidth={2} />
                </button>
              </form>
            </div>

            {error && (
              <div className="animate-fade-in flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-600 max-w-sm text-center">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {(hasMessages || convState !== "idle") && (
              <button onClick={resetConversation}
                className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-600 transition-colors mt-1 px-3 py-1.5 rounded-lg hover:bg-zinc-100">
                <RotateCcw className="w-3.5 h-3.5" />
                Restart Conversation
              </button>
            )}
          </div>

          {/* How it works */}
          {!hasMessages && isIdle && (
            <div className="animate-fade-in-up mt-14" style={{ animationDelay: "260ms" }}>
              <div className="grid grid-cols-3 gap-4 max-w-sm mx-auto text-center">
                {[
                  { icon: "👇", label: "Hold to speak" },
                  { icon: "📐", label: "Jimmy calculates" },
                  { icon: "🛒", label: "Cart auto-builds" },
                ].map(item => (
                  <div key={item.label} className="flex flex-col items-center gap-2">
                    <span className="text-2xl">{item.icon}</span>
                    <span className="text-xs text-zinc-400">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CTA */}
          <div className="animate-fade-in-up mt-10" style={{ animationDelay: "300ms" }}>
            <a href="https://www.gobuildsupply.com" target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-zinc-900 hover:bg-zinc-700 text-white text-sm font-medium px-6 py-3 rounded-full transition-all duration-200 active:scale-95 shadow-sm hover:shadow-md">
              Visit Go Build Supply <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {/* Cart building banner */}
        {cartState.status === "building" && <CartBuildingBanner />}

        {/* Cart review screen */}
        {cartState.status === "ready" && (
          <CartReviewScreen
            cart={cartState}
            onDismiss={() => setCartState({ status: "idle" })}
            onReset={resetConversation}
          />
        )}

        {/* Chat history */}
        {hasMessages && (
          <div className="w-full max-w-2xl mx-auto mt-14 animate-fade-in-up">
            <div className="flex items-center gap-3 mb-7">
              <div className="flex-1 h-px bg-zinc-200" />
              <span className="text-xs text-zinc-400 tracking-widest uppercase">Conversation</span>
              <div className="flex-1 h-px bg-zinc-200" />
            </div>
            <div className="flex flex-col gap-4">
              {messages.map(msg => <ChatMessage key={msg.id} msg={msg} />)}
              {isPending && (
                <div className="flex justify-start animate-fade-in">
                  <div className="w-7 h-7 rounded-full bg-[#FF5A1F] flex items-center justify-center flex-shrink-0 mt-0.5 mr-2.5 text-white">
                    <HardHat className="w-4 h-4" strokeWidth={2} />
                  </div>
                  <div className="bg-white border border-zinc-100 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
                    <div className="flex gap-1.5 items-center h-4">
                      {[0, 1, 2].map(i => (
                        <div key={i} className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce"
                          style={{ animationDelay: `${i * 150}ms`, animationDuration: "800ms" }} />
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
          </div>
        )}
      </main>

      {!isEmbed && (
      <footer className="text-center py-6 text-xs text-zinc-300">
        © 2026 Go Build Supply. AI assistant for informational purposes only.
      </footer>
      )}
    </div>
  );
}
