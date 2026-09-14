import {
  readFileSync,
} from 'node:fs';

const page =
  readFileSync(
    'src/trips/TripsPage.tsx',
    'utf8',
  );

const permissions =
  readFileSync(
    'src/auth/frontend-permissions.ts',
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

const requiredPermissions = [
  'trips.read',
  'trips.create',
  'trips.update',
  'trips.schedule',
  'trips.board',
  'trips.start',
  'trips.complete',
  'trips.cancel',
];

for (
  const permission
  of requiredPermissions
) {
  assert(
    permissions.includes(
      `'${permission}'`,
    ),
    `Trip permission constant: ${permission}`,
  );
}

assert(
  page.includes(
    'permissions,',
  ),
  'TripsPage consumes backend permissions[]',
);

assert(
  page.includes(
    'hasFrontendPermission(',
  ),
  'TripsPage uses effective permissions',
);

assert(
  !page.includes(
    'canManageTrips',
  ),
  'legacy broad role-based Trip management removed',
);

assert(
  !page.includes(
    'const role =',
  ),
  'TripsPage no longer derives authorization from tenant role',
);

assert(
  page.includes(
    "trip.status ===\n                                'draft'",
  ),
  'Draft trips expose Schedule when permitted',
);

assert(
  page.includes(
    "action:\n                                                            'schedule'",
  ),
  'Schedule lifecycle action is wired',
);

assert(
  page.includes(
    'boardTrip(',
  ),
  'Board lifecycle API is wired',
);

assert(
  page.includes(
    'startTrip(',
  ),
  'Start lifecycle API is wired',
);

assert(
  page.includes(
    'completeTrip(',
  ),
  'Complete lifecycle API is wired',
);

assert(
  page.includes(
    "trip.status ===\n                                'scheduled'",
  ),
  'Board action is restricted to scheduled trips',
);

assert(
  page.includes(
    "trip.status ===\n                                'boarding'",
  ),
  'Start action is restricted to boarding trips',
);

assert(
  page.includes(
    "trip.status ===\n                                'in_progress'",
  ),
  'Complete action is restricted to in-progress trips',
);

assert(
  page.includes(
    'FRONTEND_PERMISSIONS.TRIPS_CANCEL',
  ),
  'Cancel action uses backend permission',
);

console.log('');
console.log(
  'Trips lifecycle UI checkpoint PASSED',
);
