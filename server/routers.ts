import { router } from "./_core/trpc";
import { systemRouter } from "./_core/systemRouter";
import { voiceRouter } from "./routers/voice";
import { cartRouter } from "./routers/cart";
import { catalogRouter } from "./routers/catalog";
import { adsRouter } from "./routers/ads";

export const appRouter = router({
  system: systemRouter,
  voice: voiceRouter,
  cart: cartRouter,
  catalog: catalogRouter,
  ads: adsRouter,
});

export type AppRouter = typeof appRouter;
