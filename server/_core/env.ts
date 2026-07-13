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
  // Customer accounts (see server/routers/account.ts). A BigCommerce API token
  // with "Customers: modify" + "Orders: read-only" scopes. Falls back to the
  // main token if unset (which only works once those scopes are added to it).
  bcCustomerToken:
    process.env.BIGCOMMERCE_CUSTOMER_TOKEN || process.env.BIGCOMMERCE_ACCESS_TOKEN || "",
  // Secret used to sign the login session cookie. MUST be set in production.
  sessionSecret: process.env.SESSION_SECRET ?? "",
};
