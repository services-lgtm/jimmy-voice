export const ENV = {
  databaseUrl: process.env.DATABASE_URL ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  elevenLabsApiKey: process.env.ELEVENLABS_API_KEY ?? "",
  // BigCommerce — real products + live pricing (see server/bigcommerce.ts)
  bcStoreHash: process.env.BIGCOMMERCE_STORE_HASH ?? "",
  bcAccessToken: process.env.BIGCOMMERCE_ACCESS_TOKEN ?? "",
  bcStoreUrl: process.env.BIGCOMMERCE_STORE_URL ?? "",
};
