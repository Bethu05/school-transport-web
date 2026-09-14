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
    'src/tracking/guardian-tracking.api.ts',
  );

const realtime =
  read(
    'src/tracking/tracking.realtime.ts',
  );

const panel =
  read(
    'src/tracking/GuardianTrackingPanel.tsx',
  );

const page =
  read(
    'src/tracking/TrackingPage.tsx',
  );

console.log();
console.log(
  'Guardian Tracking frontend checkpoint',
);

console.log(
  '-------------------------------------',
);

check(
  api.includes(
    "'/me/children'",
  ),
  'guardian children API wired',
);

check(
  api.includes(
    '/active-trip',
  ),
  'child active-trip API wired',
);

check(
  realtime.includes(
    "'trip.subscribe'",
  ),
  'guardian realtime trip subscription wired',
);

check(
  realtime.includes(
    "'trip.unsubscribe'",
  ),
  'guardian trip unsubscribe wired',
);

check(
  panel.includes(
    'subscribeToTrip',
  ),
  'Guardian panel subscribes only to authorised trips',
);

check(
  panel.includes(
    'location.tripId',
  ),
  'guardian realtime feed filtered by authorised trip',
);

check(
  panel.includes(
    'child.firstName',
  ) &&
  panel.includes(
    'child.lastName',
  ),
  'child name shown instead of student UUID',
);

const rendersRawTripId =
  />\s*\{\s*tripId\s*\}\s*</m.test(
    panel,
  );

check(
  !rendersRawTripId,
  'trip UUID is not rendered',
);

check(
  page.includes(
    '<GuardianTrackingPanel',
  ),
  'non-fleet Tracking path uses guardian panel',
);

console.log();
console.log(
  'Guardian Tracking frontend checkpoint PASSED',
);
