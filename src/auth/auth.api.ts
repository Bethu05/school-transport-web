import { apiRequest, setAccessToken } from "../api/client";

export interface LoginRequest {
  email: string;
  password: string;
}

interface LoginResponse {
  accessToken: string;
  tokenType?: string;
}

export interface AuthenticatedUser {
  userId: string;
  email: string;
}

export interface ActiveTenant {
  tenantId: string;
  role: string;
}

interface CurrentUserResponse {
  user: AuthenticatedUser;
}

export interface AuthContextResponse {
  user: AuthenticatedUser;
  tenant: ActiveTenant;

  /**
   * Effective permissions calculated by the backend.
   *
   * This is the frontend authorization source of truth.
   */
  permissions: string[];
}

/**
 * Authenticate the user and store the JWT.
 */
export async function login(credentials: LoginRequest): Promise<LoginResponse> {
  const response = await apiRequest<LoginResponse>("/auth/login", {
    method: "POST",
    auth: false,

    body: JSON.stringify(credentials),
  });

  setAccessToken(response.accessToken);

  return response;
}

/**
 * JWT identity only.
 *
 * This endpoint does not require
 * x-tenant-id.
 */
export function getCurrentUser(): Promise<CurrentUserResponse> {
  return apiRequest<CurrentUserResponse>("/auth/me");
}

/**
 * Fully verified tenant context.
 *
 * Backend checks membership before
 * returning the tenant role.
 */
export function getAuthContext(tenantId: string): Promise<AuthContextResponse> {
  return apiRequest<AuthContextResponse>("/auth/context", {
    tenantId,
  });
}
