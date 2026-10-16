import { apiRequest } from "../api/client";

export type VehicleStatus = "active" | "maintenance" | "inactive" | "retired";

export interface Vehicle {
  id: string;
  tenantId: string;
  schoolId: string | null;
  registrationNumber: string;
  fleetNumber: string | null;
  make: string | null;
  model: string | null;
  manufactureYear: number | null;
  seatCapacity: number;
  gpsDeviceId: string | null;
  gpsProtocol?: string | null;
  trackerType?: string | null;
  listenerPort?: number | null;
  status: VehicleStatus;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedVehicles {
  items: Vehicle[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ListVehiclesQuery {
  page?: number;
  limit?: number;
  search?: string;
  schoolId?: string;
  includeShared?: boolean;
  status?: VehicleStatus;
}

export interface CreateVehicleInput {
  schoolId?: string;
  registrationNumber: string;
  fleetNumber?: string;
  make?: string;
  model?: string;
  manufactureYear?: number;
  seatCapacity: number;
  gpsDeviceId?: string;
  gpsProtocol?: string;
  trackerType?: string;
  listenerPort?: number;
  status?: VehicleStatus;
}

export interface UpdateVehicleInput {
  schoolId?: string;
  registrationNumber?: string;
  fleetNumber?: string;
  make?: string;
  model?: string;
  manufactureYear?: number;
  seatCapacity?: number;
  gpsDeviceId?: string;
  gpsProtocol?: string;
  trackerType?: string;
  listenerPort?: number;
  status?: VehicleStatus;
}

export type TrackingHealthStatus =
  | "unconfigured"
  | "configured_no_telemetry"
  | "online"
  | "delayed"
  | "stale"
  | "offline"
  | "change_pending";

export type TrackingMode = "hardware" | "mobile" | "unconfigured";

export interface VehicleTrackingReadiness {
  vehicleId: string;
  vehicleSaved: boolean;
  schoolAssigned: boolean;
  trackingMode: TrackingMode;
  identityAssigned: boolean;
  credentialValid: boolean;
  telemetryEverSeen: boolean;
  telemetryFresh: boolean;
  lastTelemetryAt: string | null;
  hasPendingChangeRequest: boolean;
  healthStatus: TrackingHealthStatus;
  details: {
    registrationNumber: string;
    gpsProtocol: string | null;
    gpsDeviceId: string | null;
    trackerType?: string | null;
    listenerPort?: number | null;
    status: string;
  };
}

export interface FleetReadinessSummary {
  total: number;
  active: number;
  maintenance: number;
  inactive: number;
  retired: number;
  availabilityPercent: number;
  ready: number;
  missingSchoolAssignment: number;
  unconfiguredTracker: number;
  pendingTrackerChange: number;
  onlineTelemetry: number;
  delayedTelemetry: number;
  staleTelemetry: number;
  noRecentTelemetry: number;
}

export interface RequestTrackerChangeInput {
  proposedGpsProtocol?: string;
  proposedGpsDeviceId: string;
  reason: string;
  emergencyOverride?: boolean;
  emergencyReason?: string;
}

export interface VehicleTrackerChangeRequest {
  id: string;
  tenantId: string;
  vehicleId: string;
  currentGpsProtocol: string | null;
  currentGpsDeviceId: string | null;
  proposedGpsProtocol: string | null;
  proposedGpsDeviceId: string;
  reason: string;
  status: "pending" | "approved" | "rejected";
  requestedByUserId: string;
  requestedAt: string;
  notBefore: string;
  emergencyOverride: boolean;
  emergencyReason: string | null;
}

function buildQueryString(query: ListVehiclesQuery): string {
  const parameters = new URLSearchParams();

  if (query.page) {
    parameters.set("page", String(query.page));
  }

  if (query.limit) {
    parameters.set("limit", String(query.limit));
  }

  if (query.search?.trim()) {
    parameters.set("search", query.search.trim());
  }

  if (query.schoolId) {
    parameters.set("schoolId", query.schoolId);
  }

  if (query.includeShared !== undefined) {
    parameters.set("includeShared", String(query.includeShared));
  }

  if (query.status) {
    parameters.set("status", query.status);
  }

  const value = parameters.toString();

  return value ? `?${value}` : "";
}

export function listVehicles(
  tenantId: string,
  query: ListVehiclesQuery = {},
): Promise<PaginatedVehicles> {
  return apiRequest<PaginatedVehicles>(`/vehicles${buildQueryString(query)}`, {
    tenantId,
  });
}

export function getVehicle(
  tenantId: string,
  vehicleId: string,
): Promise<Vehicle> {
  return apiRequest<Vehicle>(`/vehicles/${vehicleId}`, {
    tenantId,
  });
}

export function createVehicle(
  tenantId: string,
  input: CreateVehicleInput,
): Promise<Vehicle> {
  return apiRequest<Vehicle>("/vehicles", {
    method: "POST",
    tenantId,
    body: JSON.stringify(input),
  });
}

export function updateVehicle(
  tenantId: string,
  vehicleId: string,
  input: UpdateVehicleInput,
): Promise<Vehicle> {
  return apiRequest<Vehicle>(`/vehicles/${vehicleId}`, {
    method: "PATCH",
    tenantId,
    body: JSON.stringify(input),
  });
}

export function retireVehicle(
  tenantId: string,
  vehicleId: string,
): Promise<Vehicle> {
  return apiRequest<Vehicle>(`/vehicles/${vehicleId}`, {
    method: "DELETE",
    tenantId,
  });
}

export interface ImportVehicleRowInput {
  registrationNumber: string;
  fleetNumber?: string;
  make?: string;
  model?: string;
  manufactureYear?: number;
  seatCapacity: number;
  gpsDeviceId?: string;
  gpsProtocol?: string;
  trackerType?: string;
  listenerPort?: number;
  status?: VehicleStatus;
}

export interface ImportVehiclesInput {
  schoolId: string;
  rows: ImportVehicleRowInput[];
}

export interface ImportVehicleRowResult {
  rowNumber: number;
  registrationNumber: string;
  status: "imported" | "rejected";
  vehicleId?: string;
  message?: string;
}

export interface ImportVehiclesResult {
  total: number;
  imported: number;
  rejected: number;
  results: ImportVehicleRowResult[];
}

export function importVehicles(
  tenantId: string,
  input: ImportVehiclesInput,
): Promise<ImportVehiclesResult> {
  return apiRequest<ImportVehiclesResult>("/vehicles/import", {
    method: "POST",
    tenantId,
    body: JSON.stringify(input),
  });
}

export function getTrackingReadiness(
  tenantId: string,
  vehicleId: string,
): Promise<VehicleTrackingReadiness> {
  return apiRequest<VehicleTrackingReadiness>(
    `/vehicles/${vehicleId}/tracking-readiness`,
    {
      tenantId,
    },
  );
}

export function getFleetReadinessSummary(
  tenantId: string,
): Promise<FleetReadinessSummary> {
  return apiRequest<FleetReadinessSummary>("/vehicles/readiness-summary", {
    tenantId,
  });
}

export function requestTrackerChange(
  tenantId: string,
  vehicleId: string,
  input: RequestTrackerChangeInput,
): Promise<VehicleTrackerChangeRequest> {
  return apiRequest<VehicleTrackerChangeRequest>(
    `/vehicles/${vehicleId}/tracker-change-requests`,
    {
      method: "POST",
      tenantId,
      body: JSON.stringify(input),
    },
  );
}
