import {
  readFileSync,
} from 'node:fs';


const permissions =
  readFileSync(
    'src/auth/frontend-permissions.ts',
    'utf8',
  );

const dashboard =
  readFileSync(
    'src/dashboard/driver/DriverDashboard.tsx',
    'utf8',
  );

const card =
  readFileSync(
    'src/dashboard/driver/DriverSafetyReportCard.tsx',
    'utf8',
  );

const api =
  readFileSync(
    'src/dashboard/driver/driver-me.api.ts',
    'utf8',
  );


function assert(
  condition,
  message,
) {
  if (!condition) {
    throw new Error(
      `✗ ${message}`,
    );
  }

  console.log(
    `✓ ${message}`,
  );
}


assert(
  permissions.includes(
    "'incidents.report_assigned_trip'",
  ),
  'scoped Driver incident permission exists',
);


assert(
  dashboard.includes(
    'INCIDENTS_REPORT_ASSIGNED_TRIP',
  ),
  'Driver Dashboard uses backend scoped permission',
);


assert(
  dashboard.includes(
    'hasFrontendPermission(',
  ),
  'Driver Dashboard checks effective backend permissions',
);


assert(
  dashboard.includes(
    'trip &&'
  ),
  'Safety action requires an active assigned trip',
);


assert(
  card.includes(
    '<IncidentFormDialog',
  ),
  'Driver reuses the established incident form',
);


assert(
  card.includes(
    'crypto.randomUUID()',
  ),
  'Driver incident requests use idempotency keys',
);


assert(
  api.includes(
    "'/me/driver/incidents'",
  ),
  'Driver uses relationship-scoped incident endpoint',
);


assert(
  !api.includes(
    "apiRequest<DriverReportedIncident>(\n    '/incidents'",
  ),
  'Driver API does not use generic incident create endpoint',
);


const inputStart =
  api.indexOf(
    'export interface ReportDriverIncidentInput',
  );

const inputEnd =
  api.indexOf(
    'export interface DriverReportedIncident',
    inputStart,
  );

const inputBlock =
  api.slice(
    inputStart,
    inputEnd,
  );


assert(
  !inputBlock.includes(
    'tripId:'
  ) &&
  !inputBlock.includes(
    'vehicleId:'
  ) &&
  !inputBlock.includes(
    'schoolId:'
  ) &&
  !inputBlock.includes(
    'studentId:'
  ),
  'Driver incident input contains no relationship IDs',
);


assert(
  !card.includes(
    'tripId:'
  ) &&
  !card.includes(
    'vehicleId:'
  ) &&
  !card.includes(
    'schoolId:'
  ),
  'Driver Safety UI does not construct relationship IDs',
);


assert(
  !dashboard.includes(
    "tenant?.role === 'driver'"
  ),
  'Driver Safety action is not hard-coded by role',
);


console.log('');
console.log(
  'Driver Safety frontend checkpoint PASSED',
);
