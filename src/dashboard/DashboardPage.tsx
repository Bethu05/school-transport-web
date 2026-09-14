import {
  useAuth,
} from '../auth/AuthProvider';

import {
  DriverDashboard,
} from './driver/DriverDashboard';

import {
  GuardianDashboard,
} from './guardian/GuardianDashboard';

import {
  OperationsDashboard,
} from './operations/OperationsDashboard';

/**
 * Dashboard router.
 *
 * Each user type has its own dedicated dashboard component.
 *
 * IMPORTANT:
 * Do not define DriverDashboard or GuardianDashboard locally
 * in this file. Their real implementations live in their
 * dedicated folders and use the appropriate backend APIs.
 */
export function DashboardPage() {
  const {
    tenant,
  } = useAuth();

  switch (
    tenant?.role
  ) {
    case 'driver':
      return (
        <DriverDashboard />
      );

    case 'guardian':
      return (
        <GuardianDashboard />
      );

    case 'transport_manager':
      return (
        <OperationsDashboard
          managerMode
        />
      );

    case 'owner':

    case 'admin':

    default:
      return (
        <OperationsDashboard />
      );
  }
}
