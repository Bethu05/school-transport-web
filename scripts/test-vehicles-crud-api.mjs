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

const registrationNumber =
  'WEB-CRUD-CHECKPOINT';

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
  'Vehicles CRUD API checkpoint',
);

console.log(
  '----------------------------',
);

/**
 * ========================================================
 * LOGIN
 * ========================================================
 */
const loginResponse =
  await fetch(
    `${apiUrl}/auth/login`,
    {
      method: 'POST',

      headers: {
        'Content-Type':
          'application/json',

        Accept:
          'application/json',
      },

      body:
        JSON.stringify({
          email,
          password,
        }),
    },
  );

const login =
  await readJson(
    loginResponse,
  );

const token =
  login?.accessToken;

required(
  'accessToken',
  token,
);

console.log(
  '✓ administrator login',
);

/**
 * Headers used by bodyless requests.
 *
 * IMPORTANT:
 * Do NOT add Content-Type here.
 */
const baseHeaders = {
  Authorization:
    `Bearer ${token}`,

  'x-tenant-id':
    tenantId,

  Accept:
    'application/json',
};

/**
 * Headers used only when sending JSON.
 */
const jsonHeaders = {
  ...baseHeaders,

  'Content-Type':
    'application/json',
};

/**
 * ========================================================
 * FIND EXISTING CHECKPOINT VEHICLE
 * ========================================================
 */
const listResponse =
  await fetch(
    `${apiUrl}/vehicles?page=1&limit=100&search=${encodeURIComponent(
      registrationNumber,
    )}`,
    {
      headers:
        baseHeaders,
    },
  );

const list =
  await readJson(
    listResponse,
  );

if (
  !list ||
  !Array.isArray(
    list.items,
  )
) {
  throw new Error(
    'Vehicles list response is invalid',
  );
}

let vehicle =
  list.items.find(
    (item) =>
      item.registrationNumber ===
      registrationNumber,
  );

/**
 * ========================================================
 * CREATE
 * ========================================================
 */
if (!vehicle) {
  const createResponse =
    await fetch(
      `${apiUrl}/vehicles`,
      {
        method:
          'POST',

        headers:
          jsonHeaders,

        body:
          JSON.stringify({
            registrationNumber,

            fleetNumber:
              'WEB-CHECK',

            make:
              'Checkpoint',

            model:
              'Vehicle',

            manufactureYear:
              2026,

            seatCapacity:
              30,

            status:
              'active',
          }),
      },
    );

  vehicle =
    await readJson(
      createResponse,
    );

  console.log(
    '✓ vehicle created',
  );
} else {
  console.log(
    '✓ existing checkpoint vehicle found',
  );
}

if (
  !vehicle ||
  typeof vehicle.id !==
    'string'
) {
  throw new Error(
    'Checkpoint vehicle is invalid',
  );
}

if (
  vehicle.tenantId !==
  tenantId
) {
  throw new Error(
    'Created/found vehicle belongs to another tenant',
  );
}

/**
 * ========================================================
 * RESET TO ACTIVE
 *
 * Makes this checkpoint reusable even after a previous
 * successful run retired the same test vehicle.
 * ========================================================
 */
const activateResponse =
  await fetch(
    `${apiUrl}/vehicles/${vehicle.id}`,
    {
      method:
        'PATCH',

      headers:
        jsonHeaders,

      body:
        JSON.stringify({
          status:
            'active',

          fleetNumber:
            'WEB-CHECK',

          seatCapacity:
            30,
        }),
    },
  );

const activated =
  await readJson(
    activateResponse,
  );

if (
  activated.status !==
  'active'
) {
  throw new Error(
    'Checkpoint vehicle could not be reset to active',
  );
}

console.log(
  '✓ vehicle activated/reset',
);

/**
 * ========================================================
 * UPDATE
 * ========================================================
 */
const updateResponse =
  await fetch(
    `${apiUrl}/vehicles/${vehicle.id}`,
    {
      method:
        'PATCH',

      headers:
        jsonHeaders,

      body:
        JSON.stringify({
          fleetNumber:
            'WEB-CHECK-UPDATED',

          seatCapacity:
            31,
        }),
    },
  );

const updated =
  await readJson(
    updateResponse,
  );

if (
  updated.fleetNumber !==
    'WEB-CHECK-UPDATED' ||
  updated.seatCapacity !==
    31
) {
  throw new Error(
    'Vehicle update was not persisted',
  );
}

console.log(
  '✓ vehicle updated',
);

/**
 * ========================================================
 * READ BY ID
 * ========================================================
 */
const readResponse =
  await fetch(
    `${apiUrl}/vehicles/${vehicle.id}`,
    {
      headers:
        baseHeaders,
    },
  );

const reread =
  await readJson(
    readResponse,
  );

if (
  reread.id !==
  vehicle.id
) {
  throw new Error(
    'GET /vehicles/:id returned wrong vehicle',
  );
}

if (
  reread.fleetNumber !==
  'WEB-CHECK-UPDATED'
) {
  throw new Error(
    'GET /vehicles/:id did not return updated data',
  );
}

console.log(
  '✓ vehicle read by id',
);

/**
 * ========================================================
 * RETIRE
 *
 * DELETE has NO request body.
 *
 * Therefore Content-Type must NOT be supplied.
 * ========================================================
 */
const retireResponse =
  await fetch(
    `${apiUrl}/vehicles/${vehicle.id}`,
    {
      method:
        'DELETE',

      headers:
        baseHeaders,
    },
  );

const retired =
  await readJson(
    retireResponse,
  );

if (
  retired.status !==
  'retired'
) {
  throw new Error(
    'Vehicle was not retired',
  );
}

console.log(
  '✓ vehicle retired',
);

/**
 * ========================================================
 * VERIFY RETIREMENT WAS PERSISTED
 * ========================================================
 */
const verifyResponse =
  await fetch(
    `${apiUrl}/vehicles/${vehicle.id}`,
    {
      headers:
        baseHeaders,
    },
  );

const verified =
  await readJson(
    verifyResponse,
  );

if (
  verified.status !==
  'retired'
) {
  throw new Error(
    'Retired status was not persisted',
  );
}

console.log(
  '✓ retirement persisted',
);

console.log();

console.log(
  'Vehicles CRUD API checkpoint PASSED',
);
