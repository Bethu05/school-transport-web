import { apiRequest } from '../api/client';

/**
 * Trip lifecycle statuses supported by the backend.
 *
 * draft
 *   ↓
 * scheduled
 *   ↓
 * boarding
 *   ↓
 * in_progress
 *   ↓
 * completed
 *
 * draft / scheduled / boarding may also be cancelled
 * according to backend lifecycle rules.
 */
export type TripStatus =
  | 'draft'
  | 'scheduled'
  | 'boarding'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export type TripStopStatus =
  | 'pending'
  | 'arrived'
  | 'departed'
  | 'skipped';

/**
 * Views supported by the paginated Trips endpoint.
 *
 * current:
 * - draft
 * - scheduled
 * - boarding
 * - in_progress
 *
 * completed / cancelled:
 * historical views
 *
 * all:
 * all statuses
 */
export type TripListView =
  | 'current'
  | 'completed'
  | 'cancelled'
  | 'all';

/**
 * Frontend representation of a trip.
 *
 * Backend Date values arrive through JSON as ISO strings,
 * therefore the frontend intentionally uses string here.
 */
export interface Trip {
  id: string;

  tenantId: string;

  schoolId: string;

  routeId: string;

  vehicleId: string | null;

  driverId: string | null;

  serviceDate: string;

  scheduledStartAt: string;

  scheduledEndAt: string | null;

  actualStartAt: string | null;

  actualEndAt: string | null;

  status: TripStatus;

  notes: string | null;

  routeName: string;

  routeCode: string | null;

  vehicleRegistrationNumber:
    | string
    | null;

  driverName:
    | string
    | null;

  stopCount: number;

  createdAt: string;

  updatedAt: string;
}

/**
 * Snapshot of a route stop belonging to a dated trip.
 *
 * Trip stops are snapshots so future edits to the reusable
 * route do not rewrite historical transport operations.
 */
export interface TripStop {
  id: string;

  tenantId: string;

  tripId: string;

  stopId: string;

  stopOrder: number;

  stopName: string;

  stopCode: string | null;

  latitude: number;

  longitude: number;

  geofenceRadiusMeters: number;

  plannedOffsetMinutes:
    | number
    | null;

  scheduledArrivalAt:
    | string
    | null;

  actualArrivalAt:
    | string
    | null;

  actualDepartureAt:
    | string
    | null;

  status: TripStopStatus;

  createdAt: string;

  updatedAt: string;
}

/**
 * Standard server-side pagination response.
 */
export interface PaginatedTrips {
  items: Trip[];

  page: number;

  limit: number;

  total: number;

  totalPages: number;
}

/**
 * Supported Trip-list filters.
 */
export interface ListTripsQuery {
  page?: number;

  limit?: number;

  view?: TripListView;

  /**
   * YYYY-MM-DD
   */
  serviceDate?: string;

  schoolId?: string;
}

/**
 * Creating a trip creates a DRAFT.
 *
 * The route determines the school.
 *
 * tenantId, schoolId and status are deliberately
 * not supplied by the frontend.
 */
export interface CreateTripInput {
  routeId: string;

  vehicleId?: string;

  driverId?: string;

  /**
   * YYYY-MM-DD
   */
  serviceDate: string;

  /**
   * ISO 8601 including timezone.
   *
   * Example:
   * 2026-09-14T06:30:00+03:00
   */
  scheduledStartAt: string;

  scheduledEndAt?: string;

  notes?: string;
}

/**
 * Only draft/scheduled trips may be edited by the
 * normal trip update workflow.
 *
 * null explicitly removes an existing assignment.
 */
export interface UpdateTripInput {
  routeId?: string;
  vehicleId?:
    | string
    | null;

  driverId?:
    | string
    | null;

  serviceDate?: string;

  scheduledStartAt?: string;

  scheduledEndAt?:
    | string
    | null;

  notes?:
    | string
    | null;
}

/**
 * Build Trips query parameters in one location.
 *
 * This keeps pagination/filter behaviour consistent
 * throughout the frontend.
 */
function buildTripsQueryString(
  query: ListTripsQuery,
): string {
  const parameters =
    new URLSearchParams();

  if (query.page !== undefined) {
    parameters.set(
      'page',
      String(
        query.page,
      ),
    );
  }

  if (query.limit !== undefined) {
    parameters.set(
      'limit',
      String(
        query.limit,
      ),
    );
  }

  if (query.view) {
    parameters.set(
      'view',
      query.view,
    );
  }

  if (query.serviceDate) {
    parameters.set(
      'serviceDate',
      query.serviceDate,
    );
  }

  if (query.schoolId) {
    parameters.set(
      'schoolId',
      query.schoolId,
    );
  }

  const queryString =
    parameters.toString();

  return queryString
    ? `?${queryString}`
    : '';
}

/**
 * NEW PAGINATED TRIPS API
 *
 * This is the function TripsPage will move to.
 *
 * Example:
 *
 * listTripsPage(
 *   tenantId,
 *   {
 *     page: 1,
 *     limit: 10,
 *     view: 'current',
 *   },
 * );
 */
export function listTripsPage(
  tenantId: string,
  query: ListTripsQuery = {},
): Promise<PaginatedTrips> {
  return apiRequest<PaginatedTrips>(
    `/trips${buildTripsQueryString(
      query,
    )}`,
    {
      tenantId,
    },
  );
}

/**
 * TEMPORARY BACKWARD-COMPATIBILITY WRAPPER.
 *
 * TripsPage currently expects:
 *
 * Promise<Trip[]>
 *
 * The backend now returns:
 *
 * Promise<PaginatedTrips>
 *
 * We retain the old listTrips() signature temporarily so
 * the existing TripsPage continues compiling while we move
 * it to server-side pagination in the next checkpoint.
 *
 * IMPORTANT:
 * This intentionally requests "all" because the current
 * TripsPage performs its own Current / Completed / Cancelled
 * filtering.
 *
 * This wrapper should be removed once TripsPage has been
 * migrated to listTripsPage().
 */
export async function listTrips(
  tenantId: string,
): Promise<Trip[]> {
  const response =
    await listTripsPage(
      tenantId,
      {
        page:
          1,

        limit:
          100,

        view:
          'all',
      },
    );

  return response.items;
}

/**
 * Return one trip.
 */
export function getTrip(
  tenantId: string,
  tripId: string,
): Promise<Trip> {
  return apiRequest<Trip>(
    `/trips/${tripId}`,
    {
      tenantId,
    },
  );
}

/**
 * Return the immutable stop snapshot belonging to
 * a dated trip.
 */
export function listTripStops(
  tenantId: string,
  tripId: string,
): Promise<TripStop[]> {
  return apiRequest<TripStop[]>(
    `/trips/${tripId}/stops`,
    {
      tenantId,
    },
  );
}

/**
 * Create a new draft trip.
 *
 * Scheduling is deliberately a separate lifecycle action.
 */
export function createTrip(
  tenantId: string,
  input: CreateTripInput,
): Promise<Trip> {
  return apiRequest<Trip>(
    '/trips',
    {
      method:
        'POST',

      tenantId,

      body:
        JSON.stringify(
          input,
        ),
    },
  );
}

/**
 * Edit a draft or scheduled trip.
 */
export function updateTrip(
  tenantId: string,
  tripId: string,
  input: UpdateTripInput,
): Promise<Trip> {
  return apiRequest<Trip>(
    `/trips/${tripId}`,
    {
      method:
        'PATCH',

      tenantId,

      body:
        JSON.stringify(
          input,
        ),
    },
  );
}

/**
 * Draft -> Scheduled
 *
 * Backend performs the authoritative checks for:
 *
 * - driver assigned
 * - vehicle assigned
 * - scheduled end time
 * - active driver
 * - active vehicle
 * - school compatibility
 * - driver overlap
 * - vehicle overlap
 */
export function scheduleTrip(
  tenantId: string,
  tripId: string,
): Promise<Trip> {
  return apiRequest<Trip>(
    `/trips/${tripId}/schedule`,
    {
      method:
        'POST',

      tenantId,
    },
  );
}

/**
 * Scheduled -> Boarding
 */
export function boardTrip(
  tenantId: string,
  tripId: string,
): Promise<Trip> {
  return apiRequest<Trip>(
    `/trips/${tripId}/board`,
    {
      method:
        'POST',

      tenantId,
    },
  );
}

/**
 * Boarding -> In Progress
 */
export function startTrip(
  tenantId: string,
  tripId: string,
): Promise<Trip> {
  return apiRequest<Trip>(
    `/trips/${tripId}/start`,
    {
      method:
        'POST',

      tenantId,
    },
  );
}

/**
 * In Progress -> Completed
 */
export function completeTrip(
  tenantId: string,
  tripId: string,
): Promise<Trip> {
  return apiRequest<Trip>(
    `/trips/${tripId}/complete`,
    {
      method:
        'POST',

      tenantId,
    },
  );
}

/**
 * Cancel a trip when permitted by the backend
 * lifecycle rules.
 */
export function cancelTrip(
  tenantId: string,
  tripId: string,
): Promise<Trip> {
  return apiRequest<Trip>(
    `/trips/${tripId}/cancel`,
    {
      method:
        'POST',

      tenantId,
    },
  );
}