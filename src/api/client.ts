const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

const ACCESS_TOKEN_KEY = "school_transport_access_token";

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
    const fallback =
      typeof body === "string"
        ? body
        : `${response.status} ${response.statusText}`;

    throw new Error(apiErrorMessage(body, fallback));
  }

  return body as T;
}
