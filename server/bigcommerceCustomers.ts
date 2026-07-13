/**
 * server/bigcommerceCustomers.ts
 * Talks to BigCommerce's Customer + Order APIs so shoppers can sign in, create
 * an account, and see their order history on our own site (instead of being
 * bounced to the BigCommerce-hosted login page).
 *
 * Needs a BigCommerce API token with:
 *   - Customers ............ modify   (login check, create account, read profile)
 *   - Orders ............... read-only (order history)
 * Set it as BIGCOMMERCE_CUSTOMER_TOKEN (see .env / Render env). If that token
 * lacks these scopes, BigCommerce returns 403 and these calls throw a friendly
 * error that the account router turns into a clear message.
 */
import { ENV } from "./_core/env";

const V3 = () => `https://api.bigcommerce.com/stores/${ENV.bcStoreHash}/v3`;
const V2 = () => `https://api.bigcommerce.com/stores/${ENV.bcStoreHash}/v2`;

function headers() {
  return {
    "X-Auth-Token": ENV.bcCustomerToken,
    Accept: "application/json",
    "Content-Type": "application/json",
  };
}

export function isCustomerApiConfigured(): boolean {
  return Boolean(ENV.bcStoreHash && ENV.bcCustomerToken);
}

/** A short, user-safe error we can show on the sign-in screen. */
export class AccountError extends Error {}

export type Customer = {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  company: string;
  phone: string;
  customerGroupId: number;
};

function mapCustomer(c: any): Customer {
  return {
    id: c.id,
    email: c.email ?? "",
    firstName: c.first_name ?? "",
    lastName: c.last_name ?? "",
    company: c.company ?? "",
    phone: c.phone ?? "",
    customerGroupId: c.customer_group_id ?? 0,
  };
}

/**
 * Check an email + password against BigCommerce.
 * Returns the customer id if valid, or null if the credentials are wrong.
 */
export async function validateCredentials(
  email: string,
  password: string,
): Promise<number | null> {
  if (!isCustomerApiConfigured()) {
    throw new AccountError("Accounts aren't set up on the server yet.");
  }
  let res: Response;
  try {
    res = await fetch(`${V3()}/customers/validate-credentials`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ email, password }),
    });
  } catch {
    throw new AccountError("Couldn't reach the store. Please try again.");
  }
  if (res.status === 403) {
    throw new AccountError(
      "The store's account permissions aren't enabled yet. (Customers scope missing.)",
    );
  }
  if (!res.ok) {
    throw new AccountError("Sign-in is temporarily unavailable. Please try again.");
  }
  // v3 validate-credentials returns { is_valid, customer_id } at the TOP level
  // (not wrapped in a `data` envelope like most v3 endpoints).
  const json = (await res.json()) as { is_valid?: boolean; customer_id?: number };
  if (json.is_valid && json.customer_id) return json.customer_id;
  return null;
}

/** Fetch a single customer's profile by id. */
export async function getCustomer(id: number): Promise<Customer | null> {
  if (!isCustomerApiConfigured()) return null;
  let res: Response;
  try {
    res = await fetch(`${V3()}/customers?id:in=${id}`, { headers: headers() });
  } catch {
    return null;
  }
  if (!res.ok) return null;
  const json = (await res.json()) as { data?: any[] };
  const row = json.data?.[0];
  return row ? mapCustomer(row) : null;
}

/**
 * Create a new customer. Throws AccountError with a friendly message if the
 * email is already taken or the store rejects it.
 */
export async function createCustomer(input: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  company?: string;
  phone?: string;
}): Promise<Customer> {
  if (!isCustomerApiConfigured()) {
    throw new AccountError("Accounts aren't set up on the server yet.");
  }
  let res: Response;
  try {
    res = await fetch(`${V3()}/customers`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify([
        {
          email: input.email,
          first_name: input.firstName,
          last_name: input.lastName,
          company: input.company ?? "",
          phone: input.phone ?? "",
          authentication: { new_password: input.password },
        },
      ]),
    });
  } catch {
    throw new AccountError("Couldn't reach the store. Please try again.");
  }
  if (res.status === 403) {
    throw new AccountError(
      "The store's account permissions aren't enabled yet. (Customers scope missing.)",
    );
  }
  if (res.status === 409 || res.status === 422) {
    const body = await res.text().catch(() => "");
    if (/email/i.test(body) && /(unique|exist|taken|duplicate)/i.test(body)) {
      throw new AccountError("An account with that email already exists. Try signing in.");
    }
    throw new AccountError("Please check your details and try again.");
  }
  if (!res.ok) {
    throw new AccountError("Couldn't create the account. Please try again.");
  }
  const json = (await res.json()) as { data?: any[] };
  const row = json.data?.[0];
  if (!row) throw new AccountError("Couldn't create the account. Please try again.");
  return mapCustomer(row);
}

export type Order = {
  id: number;
  status: string;
  dateCreated: string;
  total: string;
  itemsTotal: number;
  currency: string;
};

/** A customer's order history (most recent first). Uses the v2 Orders API. */
export async function getOrders(customerId: number, limit = 25): Promise<Order[]> {
  if (!isCustomerApiConfigured()) return [];
  let res: Response;
  try {
    res = await fetch(
      `${V2()}/orders?customer_id=${customerId}&limit=${limit}&sort=date_created:desc`,
      { headers: headers() },
    );
  } catch {
    return [];
  }
  // v2 returns 204 (no content) when a customer has no orders.
  if (res.status === 204) return [];
  if (res.status === 403) {
    throw new AccountError("Order history isn't enabled yet. (Orders scope missing.)");
  }
  if (!res.ok) return [];
  const rows = (await res.json()) as any[];
  return (Array.isArray(rows) ? rows : []).map((o) => ({
    id: o.id,
    status: o.status ?? "",
    dateCreated: o.date_created ?? "",
    total: o.total_inc_tax ?? "0",
    itemsTotal: o.items_total ?? 0,
    currency: o.currency_code ?? "USD",
  }));
}
