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

const dashboard =
  read(
    'src/dashboard/guardian/GuardianDashboard.tsx',
  );

const dashboardRouter =
  read(
    'src/dashboard/DashboardPage.tsx',
  );

console.log();
console.log(
  'Parent dashboard frontend checkpoint',
);

console.log(
  '------------------------------------',
);

check(
  dashboard.includes(
    'listMyTrackableChildren',
  ),
  'parent dashboard uses relationship-derived children',
);

check(
  dashboard.includes(
    'listMyNotifications',
  ),
  'parent dashboard uses real notification inbox',
);

check(
  dashboard.includes(
    "navigate(\n                                  '/tracking'",
  ) ||
  dashboard.includes(
    "navigate(\n                                  '/tracking',",
  ),
  'active journey links directly to live tracking',
);

check(
  dashboard.includes(
    "navigate(\n                '/notifications'",
  ),
  'journey alerts link to notification inbox',
);

check(
  dashboard.includes(
    'child.firstName'
  ) &&
  dashboard.includes(
    'child.lastName'
  ),
  'parent sees child names',
);

check(
  dashboard.includes(
    'child.schoolName',
  ),
  'parent sees linked school',
);

check(
  dashboard.includes(
    'Primary guardian',
  ),
  'guardian relationship context displayed',
);

check(
  dashboard.includes(
    'Journey active',
  ) &&
  dashboard.includes(
    'No active journey',
  ),
  'journey lifecycle state presented',
);

check(
  !dashboard.includes(
    'Bus 12'
  ) &&
  !dashboard.includes(
    'North Route A'
  ) &&
  !dashboard.includes(
    '7:14 AM'
  ),
  'old hard-coded parent journey data removed',
);

check(
  !dashboard.includes(
    '{child.studentId}'
  ) &&
  !dashboard.includes(
    '{notification.studentId}'
  ) &&
  !dashboard.includes(
    '{notification.tripId}'
  ),
  'raw parent-facing UUIDs are not rendered',
);

check(
  dashboardRouter.includes(
    "from './guardian/GuardianDashboard'",
  ),
  'Dashboard router imports dedicated GuardianDashboard',
);

check(
  dashboardRouter.includes(
    '<GuardianDashboard />',
  ),
  'guardian role renders real parent dashboard',
);

console.log();
console.log(
  'Parent dashboard frontend checkpoint PASSED',
);
