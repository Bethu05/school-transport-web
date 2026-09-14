const API_BASE_URL =
  process.env.VITE_API_URL ??
  'http://localhost:3000';

const EMAIL =
  process.env.VITE_DEV_PARENT_EMAIL;

const PASSWORD =
  process.env.VITE_DEV_PASSWORD;

const TENANT_ID =
  process.env.VITE_DEV_TENANT_ID;

function required(
  value,
  name,
) {
  if (!value) {
    throw new Error(
      `${name} is missing from .env.development.local`,
    );
  }

  return value;
}

required(
  EMAIL,
  'VITE_DEV_PARENT_EMAIL',
);

required(
  PASSWORD,
  'VITE_DEV_PASSWORD',
);

required(
  TENANT_ID,
  'VITE_DEV_TENANT_ID',
);

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

async function request(
  path,
  {
    method = 'GET',
    token,
    body,
  } = {},
) {
  const response =
    await fetch(
      `${API_BASE_URL}${path}`,
      {
        method,

        headers: {
          Accept:
            'application/json',

          ...(body !==
          undefined
            ? {
                'Content-Type':
                  'application/json',
              }
            : {}),

          ...(token
            ? {
                Authorization:
                  `Bearer ${token}`,

                'x-tenant-id':
                  TENANT_ID,
              }
            : {}),
        },

        ...(body !==
        undefined
          ? {
              body:
                JSON.stringify(
                  body,
                ),
            }
          : {}),
      },
    );

  const text =
    await response.text();

  let payload = null;

  if (text) {
    try {
      payload =
        JSON.parse(
          text,
        );
    } catch {
      payload =
        text;
    }
  }

  if (!response.ok) {
    throw new Error(
      `${method} ${path} -> ${response.status}: ${
        typeof payload ===
        'string'
          ? payload
          : JSON.stringify(
              payload,
            )
      }`,
    );
  }

  return payload;
}

console.log();
console.log(
  'Notifications API checkpoint',
);
console.log(
  '----------------------------',
);

const login =
  await request(
    '/auth/login',
    {
      method:
        'POST',

      body: {
        email:
          EMAIL,

        password:
          PASSWORD,
      },
    },
  );

check(
  typeof login?.accessToken ===
    'string' &&
    login.accessToken.length >
      0,
  'parent login',
);

const token =
  login.accessToken;

const context =
  await request(
    '/auth/context',
    {
      token,
    },
  );

check(
  context?.tenant?.tenantId ===
    TENANT_ID,
  'parent tenant context verified',
);


/* ============================================================
 * INBOX
 * ============================================================ */

const firstPage =
  await request(
    '/me/notifications?limit=1',
    {
      token,
    },
  );

check(
  Array.isArray(
    firstPage?.items,
  ),
  'notification inbox loaded',
);

check(
  firstPage.items.length <=
    1,
  'notification page size respected',
);

check(
  firstPage.nextCursor ===
    null ||
    typeof firstPage.nextCursor ===
      'string',
  'notification cursor response valid',
);


/* ============================================================
 * PAGINATION
 * ============================================================ */

if (
  firstPage.nextCursor
) {
  const secondPage =
    await request(
      `/me/notifications?limit=1&cursor=${encodeURIComponent(
        firstPage.nextCursor,
      )}`,
      {
        token,
      },
    );

  check(
    Array.isArray(
      secondPage?.items,
    ),
    'next notification page loaded',
  );

  if (
    firstPage.items[0] &&
    secondPage.items[0]
  ) {
    check(
      firstPage.items[0].id !==
        secondPage.items[0].id,
      'cursor advances to another notification',
    );
  }
} else {
  console.log(
    '✓ pagination endpoint valid; only one page currently available',
  );
}


/* ============================================================
 * MARK READ
 * ============================================================ */

const notification =
  firstPage.items[0];

if (notification) {
  const originalReadAt =
    notification.readAt;

  const marked =
    await request(
      `/me/notifications/${notification.id}/read`,
      {
        method:
          'PATCH',

        token,
      },
    );

  check(
    marked.id ===
      notification.id,
    'mark-read targets correct notification',
  );

  check(
    typeof marked.readAt ===
      'string' &&
    marked.readAt.length >
      0,
    'notification marked read',
  );

  /*
   * Calling mark-read again must remain safe/idempotent.
   */
  const markedAgain =
    await request(
      `/me/notifications/${notification.id}/read`,
      {
        method:
          'PATCH',

        token,
      },
    );

  check(
    markedAgain.readAt ===
      marked.readAt,
    'mark-read is idempotent',
  );

  if (!originalReadAt) {
    console.log(
      '  note: this test intentionally leaves the notification read',
    );
  }
} else {
  console.log(
    '✓ inbox currently empty; mark-read fixture not available',
  );
}


/* ============================================================
 * PREFERENCES
 * ============================================================ */

const preferences =
  await request(
    '/me/notification-preferences',
    {
      token,
    },
  );

check(
  typeof preferences
    ?.notifyBoarded ===
    'boolean' &&
  typeof preferences
    ?.notifyDroppedOff ===
    'boolean' &&
  typeof preferences
    ?.notifyTripUpdates ===
    'boolean',
  'notification preferences loaded',
);

const originalPreferences = {
  notifyBoarded:
    preferences.notifyBoarded,

  notifyDroppedOff:
    preferences.notifyDroppedOff,

  notifyTripUpdates:
    preferences.notifyTripUpdates,
};

const temporaryValue =
  !originalPreferences
    .notifyBoarded;

try {
  const changed =
    await request(
      '/me/notification-preferences',
      {
        method:
          'PATCH',

        token,

        body: {
          notifyBoarded:
            temporaryValue,
        },
      },
    );

  check(
    changed.notifyBoarded ===
      temporaryValue,
    'notification preference updated',
  );

  const verified =
    await request(
      '/me/notification-preferences',
      {
        token,
      },
    );

  check(
    verified.notifyBoarded ===
      temporaryValue,
    'preference update persisted',
  );
} finally {
  const restored =
    await request(
      '/me/notification-preferences',
      {
        method:
          'PATCH',

        token,

        body:
          originalPreferences,
      },
    );

  check(
    restored.notifyBoarded ===
      originalPreferences
        .notifyBoarded &&
    restored.notifyDroppedOff ===
      originalPreferences
        .notifyDroppedOff &&
    restored.notifyTripUpdates ===
      originalPreferences
        .notifyTripUpdates,
    'original preferences restored',
  );
}

console.log();
console.log(
  'Notifications API checkpoint PASSED',
);
