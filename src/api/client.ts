const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

const LEGACY_ACCESS_TOKEN_KEY = "school_transport_access_token";

let accessToken: string | null = null;
let legacyTokenRemoved = false;
let webRefreshPromise: Promise<string | null> | null = null;
let accessTokenRefreshTimer: number | null = null;

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

export const AUTH_SESSION_EXPIRED_EVENT = "school-transport:session-expired";

export class ApiRequestError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
  }
}

function removeLegacyAccessToken(): void {
  if (!legacyTokenRemoved && typeof window !== "undefined") {
    window.localStorage.removeItem(LEGACY_ACCESS_TOKEN_KEY);
    legacyTokenRemoved = true;
  }
}

export function getAccessToken(): string | null {
  removeLegacyAccessToken();
  return accessToken;
}

export function setAccessToken(token: string, expiresInSeconds = 900): void {
  removeLegacyAccessToken();
  accessToken = token;

  if (typeof window !== "undefined") {
    if (accessTokenRefreshTimer !== null) {
      window.clearTimeout(accessTokenRefreshTimer);
    }

    const refreshDelayMs = Math.max(
      1_000,
      (expiresInSeconds - 60) * 1_000,
    );

    accessTokenRefreshTimer = window.setTimeout(() => {
      void refreshWebAccessToken().catch((error: unknown) => {
        console.error("Could not refresh the web auth session.", error);
      });
    }, refreshDelayMs);
  }
}

export function clearAccessToken(): void {
  removeLegacyAccessToken();
  accessToken = null;

  if (typeof window !== "undefined" && accessTokenRefreshTimer !== null) {
    window.clearTimeout(accessTokenRefreshTimer);
    accessTokenRefreshTimer = null;
  }
}

function notifySessionExpired(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(AUTH_SESSION_EXPIRED_EVENT));
  }
}

export async function getWebCsrfToken(): Promise<string | null> {
  const response = await apiRequest<{ csrfToken: string | null }>(
    "/auth/web/csrf",
    {
      auth: false,
      credentials: "include",
    },
  );

  return response.csrfToken;
}

async function refreshWebAccessTokenUnlocked(): Promise<string | null> {
  const csrfToken = await getWebCsrfToken();

  if (!csrfToken) {
    return null;
  }

  const response = await apiRequest<{
    accessToken: string;
    accessTokenExpiresInSeconds: number;
  }>(
    "/auth/web/refresh",
    {
      method: "POST",
      auth: false,
      credentials: "include",
      headers: {
        "X-CSRF-Token": csrfToken,
      },
    },
  );

  setAccessToken(
    response.accessToken,
    response.accessTokenExpiresInSeconds,
  );

  return response.accessToken;
}

export function refreshWebAccessToken(): Promise<string | null> {
  removeLegacyAccessToken();

  if (!webRefreshPromise) {
    const refresh = async (): Promise<string | null> => {
      if (typeof navigator !== "undefined" && navigator.locks) {
        return navigator.locks.request(
          "school-transport-web-auth-refresh",
          refreshWebAccessTokenUnlocked,
        );
      }

      return refreshWebAccessTokenUnlocked();
    };

    webRefreshPromise = refresh()
      .then((token) => {
        if (!token && accessToken) {
          clearAccessToken();
          notifySessionExpired();
        }

        return token;
      })
      .catch((error: unknown) => {
        if (
          error instanceof ApiRequestError &&
          (error.status === 401 || error.status === 403)
        ) {
          const wasAuthenticated = accessToken !== null;
          clearAccessToken();

          if (wasAuthenticated) {
            notifySessionExpired();
          }
        }

        throw error;
      })
      .finally(() => {
        webRefreshPromise = null;
      });
  }

  return webRefreshPromise;
}

interface ApiRequestOptions extends Omit<RequestInit, "headers"> {
  tenantId?: string;

  /**
   * Authentication is enabled by default.
   *
   * Login explicitly sets auth: false.
   */
  auth?: boolean;

  retryAuth?: boolean;

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
    retryAuth = true,
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

  if (response.status === 401 && auth && retryAuth) {
    const token = await refreshWebAccessToken();

    if (token) {
      return apiRequest<T>(path, {
        ...options,
        retryAuth: false,
      });
    }
  }

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

    throw new ApiRequestError(apiErrorMessage(body, fallback), response.status);
  }

  return body as T;
}
