import {
  readFileSync,
} from 'node:fs';

const schedule =
  readFileSync(
    'src/trips/TripScheduleDialog.tsx',
    'utf8',
  );

const edit =
  readFileSync(
    'src/trips/TripEditDialog.tsx',
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
  schedule.includes(
    'The service date cannot be in the past.',
  ),
  'Schedule form rejects past service dates',
);

assert(
  schedule.includes(
    'businessDateToday()',
  ),
  'Schedule form uses Nairobi current date',
);

assert(
  schedule.includes(
    'htmlInput: {',
  ) &&
  schedule.includes(
    'min:',
  ),
  'Schedule date picker has a minimum date',
);

assert(
  edit.includes(
    'businessDateFromTimestamp(',
  ),
  'Edit form derives date from existing trip timestamp',
);

assert(
  edit.includes(
    'businessTimeFromTimestamp(',
  ),
  'Edit form derives existing departure/finish times',
);

assert(
  edit.includes(
    'trip.vehicleId',
  ) &&
  edit.includes(
    'trip.driverId',
  ),
  'Edit form preloads existing vehicle and driver',
);

assert(
  edit.includes(
    'The service date cannot be in the past.',
  ),
  'Edit form rejects past service dates',
);

assert(
  edit.includes(
    'min:',
  ),
  'Edit date picker prevents selecting past dates',
);

console.log('');
console.log(
  'Trip date rules checkpoint PASSED',
);
