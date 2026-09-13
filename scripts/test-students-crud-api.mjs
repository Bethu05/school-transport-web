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

/**
 * Students are preserved after deactivation.
 *
 * Therefore we deliberately use a unique external reference
 * on each run instead of trying to reuse a previously
 * deactivated fixture.
 */
const checkpointId =
  Date.now();

const externalRef =
  `WEB-STUDENT-CRUD-${checkpointId}`;

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
  'Students CRUD API checkpoint',
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
  login?.accessToken;

required(
  'accessToken',
  token,
);

console.log(
  '✓ administrator login',
);

const baseHeaders = {
  Authorization:
    `Bearer ${token}`,

  'x-tenant-id':
    tenantId,

  Accept:
    'application/json',
};

const jsonHeaders = {
  ...baseHeaders,

  'Content-Type':
    'application/json',
};

/**
 * ========================================================
 * LOAD A SCHOOL
 * ========================================================
 *
 * Student creation requires schoolId.
 */
const schoolsResponse =
  await fetch(
    `${apiUrl}/schools`,
    {
      headers:
        baseHeaders,
    },
  );

const schoolsResult =
  await readJson(
    schoolsResponse,
  );

const schools =
  Array.isArray(
    schoolsResult,
  )
    ? schoolsResult
    : schoolsResult?.items;

if (
  !Array.isArray(
    schools,
  ) ||
  schools.length === 0
) {
  throw new Error(
    'No school is available for the Student CRUD checkpoint',
  );
}

const school =
  schools.find(
    (item) =>
      item.status ===
      'active',
  ) ??
  schools[0];

if (
  !school ||
  typeof school.id !==
    'string'
) {
  throw new Error(
    'School response is invalid',
  );
}

if (
  school.tenantId &&
  school.tenantId !==
    tenantId
) {
  throw new Error(
    'Selected school belongs to another tenant',
  );
}

console.log(
  '✓ checkpoint school loaded',
);

/**
 * ========================================================
 * STUDENT LIST HELPER
 * ========================================================
 */
async function loadStudents({
  status,
  search,
  schoolId,
} = {}) {
  const params =
    new URLSearchParams();

  params.set(
    'page',
    '1',
  );

  params.set(
    'limit',
    '100',
  );

  if (status) {
    params.set(
      'status',
      status,
    );
  }

  if (search) {
    params.set(
      'search',
      search,
    );
  }

  if (schoolId) {
    params.set(
      'schoolId',
      schoolId,
    );
  }

  const response =
    await fetch(
      `${apiUrl}/students?${params.toString()}`,
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
    !result ||
    !Array.isArray(
      result.items,
    )
  ) {
    throw new Error(
      'GET /students must return a paginated response with items[]',
    );
  }

  if (
    typeof result.page !==
      'number' ||
    typeof result.limit !==
      'number' ||
    typeof result.total !==
      'number' ||
    typeof result.totalPages !==
      'number'
  ) {
    throw new Error(
      'GET /students pagination metadata is invalid',
    );
  }

  for (
    const item of
      result.items
  ) {
    if (
      item.tenantId !==
      tenantId
    ) {
      throw new Error(
        `Cross-tenant student returned: ${item.id}`,
      );
    }
  }

  return result;
}

/**
 * ========================================================
 * LOAD STUDENTS
 * ========================================================
 */
await loadStudents();

console.log(
  '✓ students list loaded',
);

/**
 * ========================================================
 * CREATE
 * ========================================================
 */
const createResponse =
  await fetch(
    `${apiUrl}/students`,
    {
      method:
        'POST',

      headers:
        jsonHeaders,

      body:
        JSON.stringify({
          schoolId:
            school.id,

          externalRef,

          firstName:
            'Web',

          lastName:
            'Checkpoint',

          grade:
            'Grade 4',
        }),
    },
  );

const student =
  await readJson(
    createResponse,
  );

if (
  !student ||
  typeof student.id !==
    'string'
) {
  throw new Error(
    'Checkpoint Student response is invalid',
  );
}

if (
  student.tenantId !==
  tenantId
) {
  throw new Error(
    'Student belongs to another tenant',
  );
}

if (
  student.schoolId !==
  school.id
) {
  throw new Error(
    'Student was created against the wrong school',
  );
}

if (
  student.externalRef !==
  externalRef
) {
  throw new Error(
    'Student external reference was not persisted',
  );
}

if (
  student.status !==
  'active'
) {
  throw new Error(
    `Expected new Student to be active, received: ${student.status}`,
  );
}

if (
  student.grade !==
  'Grade 4'
) {
  throw new Error(
    `Expected Grade 4 after Student creation, received: ${String(
      student.grade,
    )}`,
  );
}

console.log(
  '✓ student created',
);

/**
 * ========================================================
 * VERIFY CREATE THROUGH LIST
 * ========================================================
 */
let page =
  await loadStudents({
    status:
      'active',

    search:
      externalRef,

    schoolId:
      school.id,
  });

let reread =
  page.items.find(
    (item) =>
      item.id ===
      student.id,
  );

if (!reread) {
  throw new Error(
    'Created Student was not returned by GET /students',
  );
}

console.log(
  '✓ student create verified',
);

/**
 * ========================================================
 * UPDATE
 * ========================================================
 */
const updateResponse =
  await fetch(
    `${apiUrl}/students/${student.id}`,
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

          grade:
            'Grade 5',
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
    'Student last name update was not persisted',
  );
}

if (
  updated.externalRef !==
  externalRef
) {
  throw new Error(
    'Student update unexpectedly changed externalRef',
  );
}

if (
  updated.grade !==
  'Grade 5'
) {
  throw new Error(
    `Student grade update was not persisted. Received: ${String(
      updated.grade,
    )}`,
  );
}

console.log(
  '✓ student updated',
);

/**
 * ========================================================
 * VERIFY UPDATE
 * ========================================================
 */
page =
  await loadStudents({
    status:
      'active',

    search:
      externalRef,

    schoolId:
      school.id,
  });

reread =
  page.items.find(
    (item) =>
      item.id ===
      student.id,
  );

if (!reread) {
  throw new Error(
    'Updated Student disappeared from GET /students',
  );
}

if (
  reread.lastName !==
  'Checkpoint Updated'
) {
  throw new Error(
    'Updated Student name was not returned by GET /students',
  );
}

if (
  reread.grade !==
  'Grade 5'
) {
  throw new Error(
    `Updated Student grade was not returned by GET /students. Received: ${String(
      reread.grade,
    )}`,
  );
}

console.log(
  '✓ student update verified',
);

/**
 * ========================================================
 * GET BY ID
 * ========================================================
 */
const detailResponse =
  await fetch(
    `${apiUrl}/students/${student.id}`,
    {
      headers:
        baseHeaders,
    },
  );

const detail =
  await readJson(
    detailResponse,
  );

if (
  detail.id !==
    student.id ||
  detail.lastName !==
    'Checkpoint Updated'
) {
  throw new Error(
    'GET /students/:id did not return the updated Student',
  );
}

console.log(
  '✓ student detail verified',
);

/**
 * ========================================================
 * DEACTIVATE
 *
 * Current committed Student contract:
 *
 * POST /students/:id/deactivate
 * ========================================================
 */
const deactivateResponse =
  await fetch(
    `${apiUrl}/students/${student.id}/deactivate`,
    {
      method:
        'POST',

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
  '✓ student deactivated',
);

/**
 * ========================================================
 * ACTIVE LIST MUST NO LONGER RETURN STUDENT
 * ========================================================
 */
page =
  await loadStudents({
    status:
      'active',

    search:
      externalRef,

    schoolId:
      school.id,
  });

const stillActive =
  page.items.find(
    (item) =>
      item.id ===
      student.id,
  );

if (stillActive) {
  throw new Error(
    'Deactivated Student is still returned as active',
  );
}

console.log(
  '✓ student removed from active results',
);

/**
 * ========================================================
 * HISTORICAL RECORD MUST REMAIN
 * ========================================================
 */
page =
  await loadStudents({
    status:
      'inactive',

    search:
      externalRef,

    schoolId:
      school.id,
  });

const historical =
  page.items.find(
    (item) =>
      item.id ===
      student.id,
  );

if (!historical) {
  throw new Error(
    'Deactivated Student should remain in historical records',
  );
}

if (
  historical.status !==
  'inactive'
) {
  throw new Error(
    'Student deactivation was not persisted',
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
  const item of
    page.items
) {
  if (
    item.tenantId !==
    tenantId
  ) {
    throw new Error(
      `Cross-tenant Student returned: ${item.id}`,
    );
  }
}

console.log(
  '✓ tenant isolation response',
);

console.log();

console.log(
  'Students CRUD API checkpoint PASSED',
);
