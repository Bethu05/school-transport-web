import {
  readFileSync,
} from 'node:fs';


const progress =
  readFileSync(
    'src/dashboard/driver/DriverJourneyProgressCard.tsx',
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
  progress.includes(
    'createTrackingSocket(',
  ),
  'Driver Journey reuses the existing tracking socket client',
);


assert(
  progress.includes(
    'subscribeToTrip(',
  ),
  'Driver Journey explicitly subscribes to its assigned trip',
);


assert(
  progress.includes(
    'assignedTripId'
  ) &&
  progress.includes(
    'progressQuery.data'
  ),
  'realtime trip ID comes from relationship-scoped Driver progress',
);


assert(
  progress.includes(
    "'trip.stop.arrived'"
  ),
  'Driver Journey listens for stop arrival events',
);


assert(
  progress.includes(
    "'trip.stop.departed'"
  ),
  'Driver Journey listens for stop departure events',
);


assert(
  progress.includes(
    "'my-driver-journey-progress'"
  ) &&
  progress.includes(
    'invalidateQueries'
  ),
  'stop lifecycle events invalidate Driver Journey Progress',
);


assert(
  progress.includes(
    "'vehicle.location.updated'"
  ),
  'Driver Journey listens for live vehicle GPS packets',
);


const gpsHandlerStart =
  progress.indexOf(
    'function handleVehicleLocation',
  );

const gpsHandlerEnd =
  progress.indexOf(
    'function handleStopEvent',
    gpsHandlerStart,
  );

const gpsHandler =
  progress.slice(
    gpsHandlerStart,
    gpsHandlerEnd,
  );


assert(
  gpsHandlerStart >=
    0 &&
  !gpsHandler.includes(
    'invalidateQueries'
  ),
  'GPS packets update local state without HTTP refetch',
);


assert(
  progress.includes(
    '<TrackingProgressPanel'
  ),
  'Driver Journey renders realtime next-stop ETA',
);


assert(
  progress.includes(
    '<LiveTrackingMap'
  ),
  'Driver Journey renders realtime vehicle map',
);


assert(
  progress.includes(
    'activeLiveLocation'
  ),
  'Driver Journey protects against stale telemetry from an old trip',
);


assert(
  progress.includes(
    'unsubscribeFromTrip('
  ),
  'Driver leaves the trip room during cleanup',
);


assert(
  progress.includes(
    'socket.disconnect()'
  ),
  'Driver realtime socket disconnects during cleanup',
);


assert(
  progress.includes(
    'refetchInterval'
  ),
  '15-second HTTP polling remains available as fallback',
);


assert(
  progress.includes(
    "'Live updates'"
  ),
  'Driver can see realtime connection status',
);


console.log('');
console.log(
  'Driver Journey realtime frontend checkpoint PASSED',
);
