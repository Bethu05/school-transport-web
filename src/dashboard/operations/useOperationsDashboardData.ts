import { useQuery } from "@tanstack/react-query";

import { listDriversPage } from "../../drivers/drivers.api";

import { listRoutesPage } from "../../routes/routes.api";

import { listSchools, type School } from "../../schools/schools.api";

import { listStudentsPage } from "../../students/students.api";

import { listTripsPage, type Trip } from "../../trips/trips.api";

export interface OperationsDashboardData {
  currentTripsTotal: number;

  activeDriversTotal: number;

  activeStudentsTotal: number;

  activeRoutesTotal: number;

  schools: School[];

  currentTrips: Trip[];
}

/**
 * Live operational data used by the administrator /
 * transport operations dashboard.
 *
 * IMPORTANT:
 *
 * Every number shown on the dashboard comes from an
 * authoritative tenant-scoped backend endpoint.
 *
 * No invented / preview business data belongs here.
 */
export function useOperationsDashboardData(tenantId: string | undefined) {
  return useQuery({
    queryKey: ["operations-dashboard", tenantId],

    enabled: Boolean(tenantId),

    queryFn: async (): Promise<OperationsDashboardData> => {
      if (!tenantId) {
        throw new Error("No active tenant");
      }

      const [trips, drivers, students, routes, schools] = await Promise.all([
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

          // Students API supports
          // 10 / 25 / 50 / 100.
          // We only need the total.
          limit: 10,

          status: "active",
        }),

        listRoutesPage(tenantId, {
          page: 1,

          limit: 1,

          status: "active",
        }),

        listSchools(tenantId),
      ]);

      return {
        currentTripsTotal: trips.total,

        activeDriversTotal: drivers.total,

        activeStudentsTotal: students.total,

        activeRoutesTotal: routes.total,

        schools,

        currentTrips: trips.items,
      };
    },
  });
}
