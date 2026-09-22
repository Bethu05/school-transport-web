const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

const ACCESS_TOKEN_KEY = "school_transport_access_token";

/**
 * Raised when the backend tells an already-authenticated browser
 * that tenant operational access is no longer active.
 *
 * AuthProvider listens for this and refreshes /auth/context so the
 * route layer can move the user to /account-status.
 */
export const TENANT_ACCESS_INACTIVE_EVENT =
  "school-transport:tenant-access-inactive";

/**
 * Raised when the backend detects that the authenticated user's
 * global identity is now in forced-password-change state.
 *
 * This can happen while the browser is already open if a tenant
 * administrator resets the user's password.
 */
export const PASSWORD_CHANGE_REQUIRED_EVENT =
  "school-transport:password-change-required";

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function setAccessToken(token: string): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, token);
}

export function clearAccessToken(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
}

interface ApiRequestOptions extends Omit<RequestInit, "headers"> {
  tenantId?: string;

  /**
   * Authentication is enabled by default.
   *
   * Login explicitly sets auth: false.
   */
  auth?: boolean;

  headers?: HeadersInit;
}

/**
 * Convert API error responses into one useful
 * browser Error message.
 */
function apiErrorMessage(body: unknown, fallback: string): string {
  if (typeof body === "object" && body !== null && "message" in body) {
    const message = (
      body as {
        message?: unknown;
      }
    ).message;

    if (typeof message === "string") {
      return message;
    }

    if (Array.isArray(message)) {
      return message.map(String).join(", ");
    }
  }

  return fallback;
}

/**
 * Shared authenticated API request helper.
 *
 * IMPORTANT:
 *
 * Content-Type: application/json is ONLY attached when
 * the request actually contains a body.
 *
 * Sending that header on a bodyless DELETE makes Fastify
 * correctly expect JSON and reject the request with:
 *
 * "Body cannot be empty when content-type is set to
 * application/json"
 */
export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const {
    tenantId,
    auth = true,
    headers: suppliedHeaders,
    ...requestOptions
  } = options;

  const headers = new Headers(suppliedHeaders);

  headers.set("Accept", "application/json");

  /**
   * Only advertise JSON when there is actually
   * a request body.
   *
   * This is particularly important for DELETE
   * endpoints such as:
   *
   * DELETE /vehicles/:id
   */
  if (
    requestOptions.body !== undefined &&
    requestOptions.body !== null &&
    !headers.has("Content-Type")
  ) {
    const isFormData =
      typeof FormData !== "undefined" &&
      requestOptions.body instanceof FormData;

    if (!isFormData) {
      headers.set("Content-Type", "application/json");
    }
  }

  if (auth) {
    const token = getAccessToken();

    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  if (tenantId) {
    headers.set("x-tenant-id", tenantId);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...requestOptions,

    headers,
  });

  /**
   * Some REST actions legitimately return no body.
   */
  if (response.status === 204) {
    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`);
    }

    return undefined as T;
  }

  const contentType = response.headers.get("content-type");

  let body: unknown;

  if (contentType?.includes("application/json")) {
    body = await response.json();
  } else {
    const text = await response.text();

    body = text || undefined;
  }

  if (!response.ok) {
    /**
     * Commercial access may change while the browser session is
     * already open.
     *
     * Do not log the user out. Tell AuthProvider to refresh the
     * verified tenant context instead.
     */
    if (
      typeof window !== "undefined" &&
      typeof body === "object" &&
      body !== null &&
      "code" in body &&
      (
        body as {
          code?: unknown;
        }
      ).code === "TENANT_ACCESS_INACTIVE"
    ) {
      window.dispatchEvent(new CustomEvent(TENANT_ACCESS_INACTIVE_EVENT));
    }

    /**
     * A password may be reset while an existing short-lived JWT
     * is still present in the browser.
     *
     * The backend reads live must_change_password state and returns
     * PASSWORD_CHANGE_REQUIRED. Notify AuthProvider immediately so
     * the route layer can move the user into credential recovery.
     */
    if (
      typeof window !== "undefined" &&
      typeof body === "object" &&
      body !== null &&
      "code" in body &&
      (
        body as {
          code?: unknown;
        }
      ).code === "PASSWORD_CHANGE_REQUIRED"
    ) {
      window.dispatchEvent(new CustomEvent(PASSWORD_CHANGE_REQUIRED_EVENT));
    }

    const fallback =
      typeof body === "string"
        ? body
        : `${response.status} ${response.statusText}`;

    throw new Error(apiErrorMessage(body, fallback));
  }

  return body as T;
}
