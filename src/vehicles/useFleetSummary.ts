import {
  useQuery,
} from '@tanstack/react-query';

import {
  listVehicles,
} from './vehicles.api';

export interface FleetSummary {
  total: number;
  active: number;
  maintenance: number;
  inactive: number;
  retired: number;
  availabilityPercent: number;
}

/**
 * Fetch the minimum data required by the dashboard.
 *
 * We deliberately ask the backend for only one record per
 * status because the pagination response already includes
 * the authoritative total count.
 */
export function useFleetSummary(
  tenantId:
    | string
    | undefined,
) {
  return useQuery({
    queryKey: [
      'fleet-summary',
      tenantId,
    ],

    enabled:
      Boolean(
        tenantId,
      ),

    queryFn:
      async (): Promise<FleetSummary> => {
        if (!tenantId) {
          throw new Error(
            'No active tenant',
          );
        }

        const [
          total,
          active,
          maintenance,
          inactive,
          retired,
        ] =
          await Promise.all([
            listVehicles(
              tenantId,
              {
                page: 1,
                limit: 1,
              },
            ),

            listVehicles(
              tenantId,
              {
                page: 1,
                limit: 1,
                status:
                  'active',
              },
            ),

            listVehicles(
              tenantId,
              {
                page: 1,
                limit: 1,
                status:
                  'maintenance',
              },
            ),

            listVehicles(
              tenantId,
              {
                page: 1,
                limit: 1,
                status:
                  'inactive',
              },
            ),

            listVehicles(
              tenantId,
              {
                page: 1,
                limit: 1,
                status:
                  'retired',
              },
            ),
          ]);

        const operationalTotal =
          total.total;

        const availabilityPercent =
          operationalTotal === 0
            ? 0
            : Math.round(
                (
                  active.total /
                  operationalTotal
                ) *
                  100,
              );

        return {
          total:
            total.total,

          active:
            active.total,

          maintenance:
            maintenance.total,

          inactive:
            inactive.total,

          retired:
            retired.total,

          availabilityPercent,
        };
      },
  });
}
