import { useQuery } from "@tanstack/react-query";

import {
  getFleetReadinessSummary,
  type FleetReadinessSummary,
} from "./vehicles.api";

export type FleetSummary = FleetReadinessSummary;

/**
 * Fetch the minimum data required by the dashboard.
 *
 * We deliberately ask the backend for only one record per
 * status because the pagination response already includes
 * the authoritative total count.
 */
export function useFleetSummary(tenantId: string | undefined) {
  return useQuery({
    queryKey: ["fleet-summary", tenantId],

    enabled: Boolean(tenantId),

    queryFn: async (): Promise<FleetSummary> => {
      if (!tenantId) {
        throw new Error("No active tenant");
      }
      return getFleetReadinessSummary(tenantId);
    },
  });
}
