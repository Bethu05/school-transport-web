const apiUrl = (
  process.env.VITE_API_URL ??
  'http://localhost:3000'
).replace(/\/$/, '');

const email =
  process.env
    .VITE_DEV_ADMIN_EMAIL;

const password =
  process.env
    .VITE_DEV_PASSWORD;

const tenantId =
  process.env
    .VITE_DEV_TENANT_ID;

function required(
  name,
  value,
) {
  if (!value) {
    throw new Error(
      `${name} is required`,
    );
  }

  return value;
}

required(
  'VITE_DEV_ADMIN_EMAIL',
  email,
);

required(
  'VITE_DEV_PASSWORD',
  password,
);

required(
  'VITE_DEV_TENANT_ID',
  tenantId,
);

async function readJson(
  response,
) {
  const text =
    await response.text();

  if (!response.ok) {
    throw new Error(
      `${response.status} ${response.statusText}\n${text}`,
    );
  }

  return text
    ? JSON.parse(text)
    : undefined;
}

console.log(
  'Vehicles API checkpoint',
);

console.log(
  '-----------------------',
);

/**
 * 1. Authenticate using the permanent
 * development administrator.
 */
const loginResponse =
  await fetch(
    `${apiUrl}/auth/login`,
    {
      method: 'POST',

      headers: {
        'Content-Type':
          'application/json',
      },

      body: JSON.stringify({
        email,
        password,
      }),
    },
  );

const login =
  await readJson(
    loginResponse,
  );

if (
  !login ||
  typeof login.accessToken !==
    'string' ||
  !login.accessToken
) {
  throw new Error(
    'Login response did not contain accessToken',
  );
}

console.log(
  '✓ administrator login',
);

/**
 * 2. Fetch the real tenant-scoped
 * vehicles endpoint.
 */
const vehiclesResponse =
  await fetch(
    `${apiUrl}/vehicles?page=1&limit=100`,
    {
      headers: {
        Authorization:
          `Bearer ${login.accessToken}`,

        'x-tenant-id':
          tenantId,
      },
    },
  );

const vehicles =
  await readJson(
    vehiclesResponse,
  );

/**
 * 3. Verify the backend pagination
 * contract expected by the frontend.
 */
if (
  !vehicles ||
  !Array.isArray(
    vehicles.items,
  )
) {
  throw new Error(
    'Vehicles response items must be an array',
  );
}

for (
  const field of [
    'page',
    'limit',
    'total',
    'totalPages',
  ]
) {
  if (
    typeof vehicles[field] !==
    'number'
  ) {
    throw new Error(
      `Vehicles response ${field} must be a number`,
    );
  }
}

console.log(
  '✓ pagination contract',
);

/**
 * 4. Verify any returned record belongs
 * to the tenant supplied in the request.
 *
 * PostgreSQL RLS remains the actual
 * security boundary; this assertion
 * catches frontend/backend contract drift.
 */
for (
  const vehicle of
  vehicles.items
) {
  if (
    vehicle.tenantId !==
    tenantId
  ) {
    throw new Error(
      `Cross-tenant vehicle returned: ${vehicle.id}`,
    );
  }

  if (
    typeof vehicle.id !==
      'string' ||
    typeof vehicle.registrationNumber !==
      'string' ||
    typeof vehicle.seatCapacity !==
      'number' ||
    typeof vehicle.status !==
      'string'
  ) {
    throw new Error(
      `Vehicle ${vehicle.id ?? '<unknown>'} has an invalid response shape`,
    );
  }
}

console.log(
  '✓ tenant isolation response',
);

console.log(
  `✓ ${vehicles.items.length} vehicle(s) returned`,
);

console.log(
  `✓ ${vehicles.total} vehicle(s) total`,
);

console.log();
console.log(
  'Vehicles API checkpoint PASSED',
);
