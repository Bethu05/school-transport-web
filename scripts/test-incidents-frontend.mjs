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

const api =
  read(
    'src/incidents/incidents.api.ts',
  );

const page =
  read(
    'src/incidents/IncidentsPage.tsx',
  );

const form =
  read(
    'src/incidents/IncidentFormDialog.tsx',
  );

const permissions =
  read(
    'src/auth/frontend-permissions.ts',
  );

const app =
  read(
    'src/App.tsx',
  );

console.log();
console.log(
  'Incidents frontend checkpoint',
);
console.log(
  '-----------------------------',
);

assert(
  api.includes(
    "'Idempotency-Key'",
  ),
  'incident creation uses Idempotency-Key',
);

assert(
  api.includes(
    "method:\n        'POST'",
  ),
  'incident create API wired',
);

assert(
  api.includes(
    "method:\n        'PATCH'",
  ),
  'incident update API wired',
);

assert(
  api.includes(
    'nextCursor',
  ),
  'incident cursor pagination supported',
);

assert(
  permissions.includes(
    "'incidents.read'",
  ),
  'incidents.read permission present',
);

assert(
  permissions.includes(
    "'incidents.create'",
  ),
  'incidents.create permission present',
);

assert(
  permissions.includes(
    "'incidents.update'",
  ),
  'incidents.update permission present',
);

assert(
  page.includes(
    'FRONTEND_PERMISSIONS.INCIDENTS_READ',
  ),
  'read UI uses effective permission',
);

assert(
  page.includes(
    'FRONTEND_PERMISSIONS.INCIDENTS_CREATE',
  ),
  'create UI uses effective permission',
);

assert(
  page.includes(
    'FRONTEND_PERMISSIONS.INCIDENTS_UPDATE',
  ),
  'update UI uses effective permission',
);

assert(
  page.includes(
    'crypto.randomUUID()',
  ),
  'browser generates unique incident idempotency key',
);

assert(
  form.includes(
    "value=\"resolved\"",
  ) &&
  form.includes(
    "value=\"closed\"",
  ) &&
  form.includes(
    "value=\"open\"",
  ),
  'incident lifecycle supports resolve close and reopen',
);

assert(
  !page.includes(
    'deleteIncident(',
  ),
  'frontend does not invent unsupported hard delete',
);

assert(
  app.includes(
    '<IncidentsPage />',
  ),
  'Incidents page connected to router',
);

console.log();
console.log(
  'Incidents frontend checkpoint PASSED',
);
