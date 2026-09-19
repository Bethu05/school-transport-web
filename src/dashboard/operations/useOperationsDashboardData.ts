import { useQuery } from "@tanstack/react-query";

import { listDriversPage } from "../../drivers/drivers.api";
import { listStudentsPage } from "../../students/students.api";
import { listTripsPage, type Trip } from "../../trips/trips.api";

export interface OperationsDashboardData {
  currentTripsTotal: number;
  activeDriversTotal: number;
  activeStudentsTotal: number;
  currentTrips: Trip[];
}

/**
 * Live operational data used by the Transport Manager dashboard.
 *
 * No preview / invented values belong here.
 *
 * The paginated APIs expose authoritative totals, so we only
 * request the records the dashboard actually needs.
 */
export function useOperationsDashboardData(tenantId: string | undefined) {
  return useQuery({
    queryKey: ["operations-dashboard", tenantId],

    enabled: Boolean(tenantId),

    queryFn: async (): Promise<OperationsDashboardData> => {
      if (!tenantId) {
        throw new Error("No active tenant");
      }

      const [trips, drivers, students] = await Promise.all([
        listTripsPage(tenantId, {
          page: 1,
          limit: 5,
          view: "current",
        }),

        listDriversPage(tenantId, {
          page: 1,
          limit: 1,
          status: "active",
        }),

        listStudentsPage(tenantId, {
          page: 1,

          // Students API supports 10 / 25 / 50 / 100 only.
          // We need the authoritative pagination total, not one row.
          limit: 10,

          status: "active",
        }),
      ]);

      return {
        currentTripsTotal: trips.total,
        activeDriversTotal: drivers.total,
        activeStudentsTotal: students.total,
        currentTrips: trips.items,
      };
    },
  });
}
