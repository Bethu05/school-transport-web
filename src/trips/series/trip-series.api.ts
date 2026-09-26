import { apiRequest } from "../../api/client";

export type TripSeriesStatus = "active" | "inactive";

export interface TripSeries {
  id: string;

  tenantId: string;

  schoolId: string;

  name: string;

  code: string | null;

  routeId: string;

  defaultVehicleId: string | null;

  defaultDriverId: string | null;

  startTime: string;

  endTime: string | null;

  operatingDays: number[];

  effectiveFrom: string;

  effectiveTo: string | null;

  status: TripSeriesStatus;

  routeName: string;

  routeCode: string | null;

  vehicleRegistrationNumber: string | null;

  driverName: string | null;

  studentCount: number;

  createdAt: string;

  updatedAt: string;
}

export interface TripSeriesStudent {
  id: string;

  tripSeriesId: string;

  studentId: string;

  studentExternalRef: string | null;

  studentFirstName: string;

  studentLastName: string;

  stopId: string;

  stopName: string;

  stopCode: string | null;

  operatingDays: number[] | null;

  effectiveFrom: string | null;

  effectiveTo: string | null;

  status: TripSeriesStatus;

  createdAt: string;

  updatedAt: string;
}

export interface CreateTripSeriesInput {
  name: string;

  code?: string;

  routeId: string;

  defaultVehicleId?: string;

  defaultDriverId?: string;

  startTime: string;

  endTime?: string;

  operatingDays?: number[];

  effectiveFrom?: string;

  effectiveTo?: string;

  status?: TripSeriesStatus;
}

export interface UpdateTripSeriesInput {
  name?: string;

  code?: string | null;

  routeId?: string;

  defaultVehicleId?: string | null;

  defaultDriverId?: string | null;

  startTime?: string;

  endTime?: string | null;

  operatingDays?: number[];

  effectiveFrom?: string;

  effectiveTo?: string | null;

  status?: TripSeriesStatus;
}

export interface SetTripSeriesStudentInput {
  studentId: string;

  stopId: string;

  operatingDays?: number[];

  effectiveFrom?: string;

  effectiveTo?: string;

  status?: TripSeriesStatus;
}

export interface GeneratedTripSeriesOccurrence {
  tripSeriesId: string;

  tripSeriesName: string;

  tripId: string;

  serviceDate: string;

  tripStatus: string;

  routeId: string;

  routeName: string;

  vehicleId: string | null;

  vehicleRegistrationNumber: string | null;

  driverId: string | null;

  driverName: string | null;

  scheduledStartAt: string;

  scheduledEndAt: string | null;

  capacity: number | null;

  passengerCount: number;

  availableSeats: number | null;

  reused: boolean;
}

export function listTripSeries(tenantId: string): Promise<TripSeries[]> {
  return apiRequest<TripSeries[]>("/trip-series", {
    tenantId,
  });
}

export function getTripSeries(
  tenantId: string,
  seriesId: string,
): Promise<TripSeries> {
  return apiRequest<TripSeries>(`/trip-series/${seriesId}`, {
    tenantId,
  });
}

export function createTripSeries(
  tenantId: string,
  input: CreateTripSeriesInput,
): Promise<TripSeries> {
  return apiRequest<TripSeries>("/trip-series", {
    method: "POST",

    tenantId,

    body: JSON.stringify(input),
  });
}

export function updateTripSeries(
  tenantId: string,
  seriesId: string,
  input: UpdateTripSeriesInput,
): Promise<TripSeries> {
  return apiRequest<TripSeries>(`/trip-series/${seriesId}`, {
    method: "PATCH",

    tenantId,

    body: JSON.stringify(input),
  });
}

export function listTripSeriesStudents(
  tenantId: string,
  seriesId: string,
): Promise<TripSeriesStudent[]> {
  return apiRequest<TripSeriesStudent[]>(`/trip-series/${seriesId}/students`, {
    tenantId,
  });
}

export function setTripSeriesStudent(
  tenantId: string,
  seriesId: string,
  input: SetTripSeriesStudentInput,
): Promise<TripSeriesStudent> {
  return apiRequest<TripSeriesStudent>(`/trip-series/${seriesId}/students`, {
    method: "POST",

    tenantId,

    body: JSON.stringify(input),
  });
}

export function removeTripSeriesStudent(
  tenantId: string,
  seriesId: string,
  studentId: string,
): Promise<void> {
  return apiRequest<void>(`/trip-series/${seriesId}/students/${studentId}`, {
    method: "DELETE",

    tenantId,
  });
}

export function generateTripSeriesOccurrence(
  tenantId: string,
  seriesId: string,
  serviceDate: string,
): Promise<GeneratedTripSeriesOccurrence> {
  return apiRequest<GeneratedTripSeriesOccurrence>(
    `/trip-series/${seriesId}/generate`,
    {
      method: "POST",

      tenantId,

      body: JSON.stringify({
        serviceDate,
      }),
    },
  );
}
