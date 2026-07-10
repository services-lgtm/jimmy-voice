/**
 * Jimmy AI chat — screen 07, rebuilt in the GBS design system.
 * Text + voice input, spoken replies (ElevenLabs), live product cards,
 * and one-tap "Add all to cart" material lists.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearch } from "wouter";
import { Mic, Send, Sparkles, Square, Volume2 } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { JIMMY_CHIPS } from "@/lib/gbs";
import { useCart, type CartProduct } from "@/contexts/CartContext";

type ProductPreview = {
  title: string;
  price: string;
  image: string | null;
  url: string;
  available: boolean;
};

type MaterialLine = {
  materialName: string;
  materialUnit: string;
  quantity: number;
  product: {
    id: number;
    title: string;
    price: string;
    image: string | null;
    url: string;
    sku: string | null;
  };
};

type Message = {
  role: "user" | "assistant";
  content: string;
  productPreviews?: ProductPreview[];
  materials?: MaterialLine[] | null;
  estimatedTotal?: string;
};

export default function JimmyPage() {
  const search = useSearch();
  const initialQ = useMemo(() => new URLSearchParams(search).get("q") ?? "", [search]);
  const { add } = useCart();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [recording, setRecording] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const sentInitial = useRef(false);

  const chat = trpc.voice.chat.useMutation();
  const transcribeAndChat = trpc.voice.transcribeAndChat.useMutation();
  const buildCart = trpc.cart.buildCart.useMutation();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);

  function playAudio(base64: string | null) {
    if (!base64) return;
    try {
      audioRef.current?.pause();
      const audio = new Audio(`data:audio/mpeg;base64,${base64}`);
      audioRef.current = audio;
      void audio.play().catch(() => {});
    } catch {
      /* autoplay blocked — text is still shown */
    }
  }

  async function resolveMaterials(cartData: {
    materials: Array<{ name: string; quantity: number; unit: string; category: string; searchQuery: string }>;
  }): Promise<{ materials: MaterialLine[]; estimatedTotal: string } | null> {
    try {
      const res = await buildCart.mutateAsync({ materials: cartData.materials });
      return { materials: res.cartItems as MaterialLine[], estimatedTotal: res.estimatedTotal };
    } catch {
      return null;
    }
  }

  async function handleReply(
    userText: string,
    reply: string,
    audioBase64: string | null,
    productPreviews: ProductPreview[],
    cartData: { materials: any[] } | null,
  ) {
    playAudio(audioBase64);
    let materials: MaterialLine[] | null = null;
    let estimatedTotal: string | undefined;
    if (cartData?.materials?.length) {
      const resolved = await resolveMaterials(cartData as any);
      if (resolved) {
        materials = resolved.materials;
        estimatedTotal = resolved.estimatedTotal;
      }
    }
    setMessages((prev) => [
      ...prev,
      { role: "assistant", content: reply, productPreviews, materials, estimatedTotal },
    ]);
  }

  async function sendText(text: string) {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    setInput("");
    const history = messages.map((m) => ({ role: m.role, content: m.content }));
    setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
    try {
      const res = await chat.mutateAsync({ message: trimmed, history });
      await handleReply(trimmed, res.reply, res.audioBase64, res.productPreviews, res.cartData);
    } catch {
      toast.error("Jimmy couldn't answer that one. Try again.");
      setMessages((prev) => prev.slice(0, -1));
      setInput(trimmed);
    } finally {
      setBusy(false);
    }
  }

  // Auto-send a quick-tap chip passed via ?q=
  useEffect(() => {
    if (initialQ && !sentInitial.current) {
      sentInitial.current = true;
      void sendText(initialQ);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQ]);

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "";
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        if (blob.size < 1000) return;
        setBusy(true);
        try {
          const buf = await blob.arrayBuffer();
          let binary = "";
          const bytes = new Uint8Array(buf);
          for (let i = 0; i < bytes.length; i += 0x8000) {
            binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + 0x8000)));
          }
          const audioBase64 = btoa(binary);
          const history = messages.map((m) => ({ role: m.role, content: m.content }));
          const res = await transcribeAndChat.mutateAsync({
            audioBase64,
            mimeType: recorder.mimeType || "audio/webm",
            history,
          });
          setMessages((prev) => [...prev, { role: "user", content: res.transcript }]);
          await handleReply(res.transcript, res.reply, res.audioBase64, res.productPreviews, res.cartData);
        } catch {
          toast.error("Couldn't hear that. Try again or type instead.");
        } finally {
          setBusy(false);
        }
      };
      recorder.start();
      recorderRef.current = recorder;
      setRecording(true);
    } catch {
      toast.error("Microphone not available. Check browser permissions.");
    }
  }

  function stopRecording() {
    recorderRef.current?.stop();
    recorderRef.current = null;
    setRecording(false);
  }

  function addAllToCart(materials: MaterialLine[]) {
    for (const line of materials) {
      const p: CartProduct = {
        id: line.product.id,
        title: line.product.title,
        price: line.product.price,
        image: line.product.image,
        url: line.product.url,
        sku: line.product.sku,
      };
      add(p, line.quantity);
    }
    toast.success(`Added ${materials.length} items to your cart`);
  }

  return (
    <div className="container max-w-3xl py-6 flex flex-col min-h-[calc(100dvh-8rem)]">
      {/* Header row */}
      <div className="flex items-center gap-2">
        <h1 className="font-condensed font-bold text-2xl text-gbs-black">Jimmy AI</h1>
        <Sparkles className="size-5 text-gbs-red" />
        {busy && <Volume2 className="size-4 text-gbs-gray-500 animate-pulse ml-1" />}
      </div>

      {/* Chat area */}
      <div className="flex-1 mt-4 space-y-4 pb-4">
        {/* Intro card */}
        <div className="bg-gbs-charcoal rounded-2xl p-6 border-l-[3px] border-gbs-red">
          <div className="flex items-center gap-1.5">
            <span className="font-condensed font-bold text-[11px] uppercase tracking-[0.12em] text-gbs-red">
              Jimmy AI
            </span>
            <Sparkles className="size-3.5 text-gbs-red" />
          </div>
          <h2 className="mt-2 font-condensed font-bold text-2xl text-white">Hi, I'm Jimmy.</h2>
          <p className="mt-1.5 text-sm text-gbs-gray-500">
            Tell me what you're building and I'll spec the full material list — quantities, prices,
            ready to order. Talk or type.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {JIMMY_CHIPS.map((chip) => (
              <button
                key={chip}
                onClick={() => sendText(chip)}
                disabled={busy}
                className="rounded-full border-[1.5px] border-gbs-red text-white text-[13px] font-medium px-3.5 py-1.5 hover:bg-gbs-red/15 disabled:opacity-50 transition"
              >
                {chip}
              </button>
            ))}
          </div>
        </div>

        {messages.map((m, i) =>
          m.role === "user" ? (
            <div key={i} className="flex justify-end">
              <div className="max-w-[85%] bg-gbs-red text-white rounded-2xl rounded-br-md px-4 py-2.5 text-[15px]">
                {m.content}
              </div>
            </div>
          ) : (
            <div key={i} className="flex justify-start">
              <div className="max-w-[92%] w-full space-y-3">
                <div className="bg-white border border-gbs-gray-100 border-l-[3px] border-l-gbs-red rounded-2xl rounded-bl-md px-4 py-3 text-[15px] text-gbs-black shadow-sm whitespace-pre-wrap">
                  {m.content}
                </div>

                {/* Live product cards */}
                {!!m.productPreviews?.length && (
                  <div className="flex gap-3 overflow-x-auto pb-1">
                    {m.productPreviews.map((p, j) => (
                      <a
                        key={j}
                        href={p.url}
                        target="_blank"
                        rel="noreferrer"
                        className="shrink-0 w-36 bg-white rounded-xl border border-gbs-gray-100 shadow-sm overflow-hidden hover:border-gbs-red transition"
                      >
                        <div className="aspect-square bg-gbs-gray-100">
                          {p.image && (
                            <img src={p.image} alt={p.title} className="w-full h-full object-contain" />
                          )}
                        </div>
                        <div className="p-2">
                          <div className="text-xs font-medium text-gbs-black line-clamp-2 min-h-8">
                            {p.title}
                          </div>
                          <div className="mt-1 font-condensed font-bold text-sm text-gbs-black">
                            ${p.price}
                          </div>
                        </div>
                      </a>
                    ))}
                  </div>
                )}

                {/* Material list */}
                {!!m.materials?.length && (
                  <div className="bg-white border border-gbs-gray-100 rounded-2xl shadow-sm overflow-hidden">
                    <div className="px-4 pt-3 font-condensed font-bold text-[11px] uppercase tracking-[0.12em] text-gbs-gray-500">
                      Your material list
                    </div>
                    <div className="divide-y divide-gbs-gray-100">
                      {m.materials.map((line, j) => (
                        <div key={j} className="flex items-center gap-3 px-4 py-2.5">
                          <div className="size-10 rounded bg-gbs-gray-100 shrink-0 overflow-hidden">
                            {line.product.image && (
                              <img
                                src={line.product.image}
                                alt=""
                                className="w-full h-full object-contain"
                              />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-[13px] font-medium text-gbs-black truncate">
                              {line.product.title}
                            </div>
                            <div className="text-xs text-gbs-gray-500">
                              {line.quantity} {line.materialUnit}
                            </div>
                          </div>
                          <div className="font-condensed font-bold text-sm text-gbs-black">
                            ${(parseFloat(line.product.price) * line.quantity).toFixed(2)}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="px-4 py-3 flex items-center justify-between border-t border-gbs-gray-100">
                      <div className="text-sm text-gbs-black">
                        Estimated total:{" "}
                        <span className="font-condensed font-bold text-lg">
                          ${m.estimatedTotal}
                        </span>
                      </div>
                      <button
                        onClick={() => addAllToCart(m.materials!)}
                        className="h-10 px-4 rounded-md bg-gbs-red hover:bg-gbs-red-dark text-white font-condensed font-bold uppercase tracking-[0.08em] text-sm shadow-red active:scale-[0.97] transition"
                      >
                        Add all to cart
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ),
        )}

        {busy && (
          <div className="flex items-center gap-2 text-sm text-gbs-gray-500">
            <span className="size-2 rounded-full bg-gbs-red animate-pulse" />
            Jimmy is thinking...
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div className="sticky bottom-16 md:bottom-4 bg-white border border-gbs-gray-300 rounded-full shadow-lg flex items-center gap-1 p-1.5">
        <button
          aria-label={recording ? "Stop recording" : "Talk to Jimmy"}
          onClick={recording ? stopRecording : startRecording}
          disabled={busy}
          className={`size-10 rounded-full flex items-center justify-center transition ${
            recording
              ? "bg-gbs-red text-white animate-pulse"
              : "bg-gbs-gray-100 text-gbs-black hover:bg-gbs-red-tint hover:text-gbs-red"
          } disabled:opacity-50`}
        >
          {recording ? <Square className="size-4" /> : <Mic className="size-5" />}
        </button>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendText(input)}
          placeholder={recording ? "Listening... tap ■ when done" : "Ask Jimmy anything..."}
          disabled={busy || recording}
          className="flex-1 bg-transparent px-2 text-[15px] text-gbs-black placeholder:text-gbs-gray-500 focus:outline-none disabled:opacity-60"
        />
        <button
          aria-label="Send"
          onClick={() => sendText(input)}
          disabled={busy || !input.trim()}
          className="size-10 rounded-full bg-gbs-red hover:bg-gbs-red-dark text-white flex items-center justify-center shadow-red disabled:opacity-40 active:scale-95 transition"
        >
          <Send className="size-4" />
        </button>
      </div>
    </div>
  );
}
