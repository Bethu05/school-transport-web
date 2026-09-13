const apiUrl = (
  process.env.VITE_API_URL ??
  'http://localhost:3000'
).replace(/\/$/, '');

const email =
  process.env.VITE_DEV_ADMIN_EMAIL;

const password =
  process.env.VITE_DEV_PASSWORD;

const tenantId =
  process.env.VITE_DEV_TENANT_ID;

const licenseNumber =
  'WEB-DRIVER-CRUD-CHECKPOINT';

const initialLicenseExpiryDate =
  '2030-12-31';

const updatedLicenseExpiryDate =
  '2031-12-31';

const BUSINESS_TIME_ZONE =
  'Africa/Nairobi';

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

/**
 * Driver licence expiry is conceptually a calendar date,
 * not an instant in time.
 *
 * PostgreSQL / node-postgres may return:
 *
 * 2031-12-31
 *
 * as:
 *
 * 2031-12-30T21:00:00.000Z
 *
 * because midnight Nairobi is 21:00 UTC on the
 * previous calendar day.
 *
 * Therefore always compare licence dates using the
 * business timezone.
 */
function calendarDateInTimeZone(
  value,
  timeZone =
    BUSINESS_TIME_ZONE,
) {
  if (!value) {
    return null;
  }

  /**
   * If the API already returns an ordinary YYYY-MM-DD
   * date, there is nothing to convert.
   */
  if (
    typeof value ===
      'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(
      value,
    )
  ) {
    return value;
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return null;
  }

  const parts =
    new Intl.DateTimeFormat(
      'en-GB',
      {
        timeZone,

        year:
          'numeric',

        month:
          '2-digit',

        day:
          '2-digit',
      },
    ).formatToParts(
      date,
    );

  const year =
    parts.find(
      (part) =>
        part.type ===
        'year',
    )?.value;

  const month =
    parts.find(
      (part) =>
        part.type ===
        'month',
    )?.value;

  const day =
    parts.find(
      (part) =>
        part.type ===
        'day',
    )?.value;

  if (
    !year ||
    !month ||
    !day
  ) {
    return null;
  }

  return `${year}-${month}-${day}`;
}

/**
 * Current API contract exposes licenseExpiryDate.
 *
 * Keeping this helper makes the checkpoint easy to
 * adapt if the backend representation changes later.
 */
function getLicenseExpiry(
  driver,
) {
  return (
    driver
      ?.licenseExpiryDate ??
    driver
      ?.licenseExpiry ??
    null
  );
}

function assertLicenseExpiry(
  driver,
  expected,
  context,
) {
  const raw =
    getLicenseExpiry(
      driver,
    );

  const actual =
    calendarDateInTimeZone(
      raw,
    );

  if (
    actual !==
    expected
  ) {
    throw new Error(
      `${context}: expected ${expected}, received ${String(
        raw,
      )} -> ${String(
        actual,
      )}`,
    );
  }

  return {
    raw,
    actual,
  };
}

console.log(
  'Drivers CRUD API checkpoint',
);

console.log(
  '---------------------------',
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
      method:
        'POST',

      headers: {
        Accept:
          'application/json',

        'Content-Type':
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
  login
    ?.accessToken;

required(
  'accessToken',
  token,
);

console.log(
  '✓ administrator login',
);

/**
 * Bodyless requests.
 *
 * No Content-Type header.
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
 * POST / PATCH requests.
 */
const jsonHeaders = {
  ...baseHeaders,

  'Content-Type':
    'application/json',
};

/**
 * ========================================================
 * LOAD DRIVERS
 * ========================================================
 */
async function loadDrivers() {
  const response =
    await fetch(
      `${apiUrl}/drivers`,
      {
        headers:
          baseHeaders,
      },
    );

  const result =
    await readJson(
      response,
    );

  if (
    !Array.isArray(
      result,
    )
  ) {
    throw new Error(
      'GET /drivers must return an array',
    );
  }

  return result;
}

let drivers =
  await loadDrivers();

console.log(
  '✓ drivers list loaded',
);

/**
 * ========================================================
 * FIND REUSABLE FIXTURE
 * ========================================================
 */
let driver =
  drivers.find(
    (item) =>
      item.licenseNumber ===
      licenseNumber,
  );

/**
 * ========================================================
 * CREATE
 * ========================================================
 */
if (!driver) {
  const createResponse =
    await fetch(
      `${apiUrl}/drivers`,
      {
        method:
          'POST',

        headers:
          jsonHeaders,

        body:
          JSON.stringify({
            firstName:
              'Web',

            lastName:
              'Checkpoint',

            licenseNumber,

            licenseExpiryDate:
              initialLicenseExpiryDate,

            status:
              'active',
          }),
      },
    );

  driver =
    await readJson(
      createResponse,
    );

  console.log(
    '✓ driver created',
  );
} else {
  console.log(
    '✓ existing checkpoint driver found',
  );
}

if (
  !driver ||
  typeof driver.id !==
    'string'
) {
  throw new Error(
    'Checkpoint driver response is invalid',
  );
}

if (
  driver.tenantId !==
  tenantId
) {
  throw new Error(
    'Driver belongs to another tenant',
  );
}

/**
 * ========================================================
 * RESET FIXTURE
 * ========================================================
 */
const resetResponse =
  await fetch(
    `${apiUrl}/drivers/${driver.id}`,
    {
      method:
        'PATCH',

      headers:
        jsonHeaders,

      body:
        JSON.stringify({
          firstName:
            'Web',

          lastName:
            'Checkpoint',

          licenseExpiryDate:
            initialLicenseExpiryDate,

          status:
            'active',
        }),
    },
  );

const resetDriver =
  await readJson(
    resetResponse,
  );

if (
  resetDriver.status !==
  'active'
) {
  throw new Error(
    'Driver could not be reset to active',
  );
}

assertLicenseExpiry(
  resetDriver,
  initialLicenseExpiryDate,
  'Reset licence expiry failed',
);

console.log(
  '✓ driver activated/reset',
);

/**
 * ========================================================
 * UPDATE
 * ========================================================
 */
const updateResponse =
  await fetch(
    `${apiUrl}/drivers/${driver.id}`,
    {
      method:
        'PATCH',

      headers:
        jsonHeaders,

      body:
        JSON.stringify({
          firstName:
            'Web',

          lastName:
            'Checkpoint Updated',

          phone:
            '+254700999999',

          licenseExpiryDate:
            updatedLicenseExpiryDate,
        }),
    },
  );

const updated =
  await readJson(
    updateResponse,
  );

if (
  updated.lastName !==
  'Checkpoint Updated'
) {
  throw new Error(
    'Driver last name update was not persisted',
  );
}

if (
  updated.phone !==
  '+254700999999'
) {
  throw new Error(
    'Driver phone update was not persisted',
  );
}

const updateExpiry =
  assertLicenseExpiry(
    updated,
    updatedLicenseExpiryDate,
    'Driver licence expiry update failed',
  );

console.log(
  '✓ driver updated',
);

console.log(
  `✓ licence expiry: ${String(
    updateExpiry.raw,
  )} -> ${updateExpiry.actual} Nairobi`,
);

/**
 * ========================================================
 * VERIFY THROUGH GET /drivers
 * ========================================================
 */
drivers =
  await loadDrivers();

const reread =
  drivers.find(
    (item) =>
      item.id ===
      driver.id,
  );

if (!reread) {
  throw new Error(
    'Updated driver disappeared from GET /drivers',
  );
}

if (
  reread.lastName !==
  'Checkpoint Updated'
) {
  throw new Error(
    'Updated driver name was not returned by GET /drivers',
  );
}

if (
  reread.phone !==
  '+254700999999'
) {
  throw new Error(
    'Updated driver phone was not returned by GET /drivers',
  );
}

assertLicenseExpiry(
  reread,
  updatedLicenseExpiryDate,
  'Persisted licence expiry verification failed',
);

console.log(
  '✓ driver update verified',
);

/**
 * ========================================================
 * DEACTIVATE
 * ========================================================
 */
const deactivateResponse =
  await fetch(
    `${apiUrl}/drivers/${driver.id}`,
    {
      method:
        'DELETE',

      headers:
        baseHeaders,
    },
  );

const deactivated =
  await readJson(
    deactivateResponse,
  );

if (
  deactivated.status !==
  'inactive'
) {
  throw new Error(
    `Expected inactive status after deactivation, received: ${deactivated.status}`,
  );
}

console.log(
  '✓ driver deactivated',
);

/**
 * ========================================================
 * VERIFY DEACTIVATION
 * ========================================================
 */
drivers =
  await loadDrivers();

const verified =
  drivers.find(
    (item) =>
      item.id ===
      driver.id,
  );

if (!verified) {
  throw new Error(
    'Deactivated driver should remain in historical records',
  );
}

if (
  verified.status !==
  'inactive'
) {
  throw new Error(
    'Driver deactivation was not persisted',
  );
}

console.log(
  '✓ deactivation persisted',
);

/**
 * ========================================================
 * TENANT ISOLATION
 * ========================================================
 */
for (
  const item of drivers
) {
  if (
    item.tenantId !==
    tenantId
  ) {
    throw new Error(
      `Cross-tenant driver returned: ${item.id}`,
    );
  }
}

console.log(
  '✓ tenant isolation response',
);

console.log();

console.log(
  'Drivers CRUD API checkpoint PASSED',
);
