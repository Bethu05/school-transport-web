import {
  readFileSync,
} from 'node:fs';

function read(
  path,
) {
  return readFileSync(
    path,
    'utf8',
  );
}

function check(
  condition,
  label,
) {
  if (!condition) {
    throw new Error(
      `✗ ${label}`,
    );
  }

  console.log(
    `✓ ${label}`,
  );
}

const api =
  read(
    'src/dashboard/driver/driver-me.api.ts',
  );

const dashboard =
  read(
    'src/dashboard/driver/DriverDashboard.tsx',
  );

const router =
  read(
    'src/dashboard/DashboardPage.tsx',
  );

console.log();
console.log(
  'Driver dashboard frontend checkpoint',
);

console.log(
  '------------------------------------',
);

check(
  api.includes(
    "'/me/driver/trip'",
  ),
  'assigned driver trip endpoint wired',
);

check(
  api.includes(
    "'/me/driver/trip/board'",
  ),
  'driver boarding endpoint wired',
);

check(
  api.includes(
    "'/me/driver/trip/start'",
  ),
  'driver start endpoint wired',
);

check(
  api.includes(
    "'/me/driver/trip/complete'",
  ),
  'driver complete endpoint wired',
);

check(
  dashboard.includes(
    'trip.driverName',
  ),
  'driver name is rendered',
);

check(
  dashboard.includes(
    'trip.routeName',
  ),
  'assigned route is rendered',
);

check(
  dashboard.includes(
    'trip.vehicleRegistrationNumber',
  ),
  'assigned vehicle is rendered',
);

check(
  dashboard.includes(
    'trip.stopCount',
  ),
  'route stop count is rendered',
);

check(
  dashboard.includes(
    'Begin boarding',
  ) &&
  dashboard.includes(
    'Start trip',
  ) &&
  dashboard.includes(
    'Complete trip',
  ),
  'driver lifecycle actions are exposed',
);

check(
  !dashboard.includes(
    'Bus 12'
  ) &&
  !dashboard.includes(
    'North Route A'
  ),
  'old hard-coded driver trip removed',
);

check(
  !dashboard.includes(
    '{trip.id}'
  ),
  'raw trip UUID is not rendered',
);

check(
  router.includes(
    '<DriverDashboard />',
  ),
  'driver role routes to DriverDashboard',
);

console.log();
console.log(
  'Driver dashboard frontend checkpoint PASSED',
);
