import { router } from "./_core/trpc";
import { systemRouter } from "./_core/systemRouter";
import { voiceRouter } from "./routers/voice";
import { cartRouter } from "./routers/cart";

export const appRouter = router({
  system: systemRouter,
  voice: voiceRouter,
  cart: cartRouter,
});

export type AppRouter = typeof appRouter;
