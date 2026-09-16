const API_URL = (process.env.VITE_API_URL ?? "http://localhost:3000").replace(
  /\/$/,
  "",
);

const EMAIL = process.env.VITE_DEV_TRANSPORT_MANAGER_EMAIL;

const PASSWORD = process.env.VITE_DEV_PASSWORD;

const TENANT_ID = process.env.VITE_DEV_TENANT_ID;

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function request(path, { token, method = "GET", body } = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    method,

    headers: {
      ...(token
        ? {
            Authorization: `Bearer ${token}`,
          }
        : {}),

      ...(TENANT_ID
        ? {
            "x-tenant-id": TENANT_ID,
          }
        : {}),

      ...(body !== undefined
        ? {
            "Content-Type": "application/json",
          }
        : {}),
    },

    ...(body !== undefined
      ? {
          body: JSON.stringify(body),
        }
      : {}),
  });

  const text = await response.text();

  let data = null;

  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!response.ok) {
    throw new Error(
      `${method} ${path} failed (${response.status}): ${
        typeof data === "string" ? data : JSON.stringify(data)
      }`,
    );
  }

  return data;
}

console.log("Transport Manager Guardian permissions checkpoint");

console.log("-----------------------------------------------");

assert(EMAIL, "VITE_DEV_TRANSPORT_MANAGER_EMAIL is missing");

assert(PASSWORD, "VITE_DEV_PASSWORD is missing");

assert(TENANT_ID, "VITE_DEV_TENANT_ID is missing");

/*
 * 1. Login as Transport Manager.
 */
const login = await request("/auth/login", {
  method: "POST",

  body: {
    email: EMAIL,

    password: PASSWORD,
  },
});

assert(login?.accessToken, "Transport Manager login returned no access token");

const token = login.accessToken;

console.log("✓ transport manager login");

/*
 * 2. Confirm backend auth context is authoritative.
 */
const context = await request("/auth/context", {
  token,
});

assert(
  context?.tenant?.role === "transport_manager",
  `Expected transport_manager role but received ${
    context?.tenant?.role ?? "nothing"
  }`,
);

assert(
  Array.isArray(context.permissions),
  "auth/context returned no permissions array",
);

const requiredPermissions = [
  "guardians.read",
  "guardians.create",
  "guardians.update",
  "guardians.activate",
  "guardians.deactivate",
  "guardians.manage_students",
];

for (const permission of requiredPermissions) {
  assert(
    context.permissions.includes(permission),
    `Missing backend permission: ${permission}`,
  );
}

console.log("✓ guardian permissions returned by auth context");

/*
 * Use a unique address because Guardian records are retained
 * historically rather than hard-deleted.
 */
const unique = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;

const originalEmail = `tm-guardian-${unique}@example.com`;

const updatedEmail = `tm-guardian-updated-${unique}@example.com`;

/*
 * 3. CREATE
 */
const created = await request("/guardians", {
  token,

  method: "POST",

  body: {
    firstName: "Transport",

    lastName: "Manager Guardian",

    email: originalEmail,

    phone: "+254700555111",

    notifyBoarded: true,

    notifyDroppedOff: true,

    notifyTripUpdates: true,
  },
});

assert(created?.id, "Transport Manager could not create Guardian");

console.log("✓ guardian created");

/*
 * 4. UPDATE
 *
 * This directly verifies the bug we were fixing:
 * the edit control must correspond to genuine backend permission.
 */
const updated = await request(`/guardians/${created.id}`, {
  token,

  method: "PATCH",

  body: {
    firstName: "Updated Transport",

    lastName: "Manager Guardian",

    email: updatedEmail,

    phone: "+254700555222",

    notifyBoarded: false,

    notifyDroppedOff: true,

    notifyTripUpdates: false,
  },
});

assert(
  updated.firstName === "Updated Transport",
  "Guardian first-name update did not persist",
);

assert(updated.email === updatedEmail, "Guardian email update did not persist");

assert(
  updated.notifyBoarded === false,
  "Guardian notification change did not persist",
);

console.log("✓ guardian edit persisted through backend");

/*
 * 5. DEACTIVATE
 */
const deactivated = await request(`/guardians/${created.id}/deactivate`, {
  token,

  method: "POST",
});

assert(
  deactivated.status === "inactive",
  "Transport Manager could not deactivate Guardian",
);

console.log("✓ guardian deactivated");

/*
 * 6. REACTIVATE
 */
const reactivated = await request(`/guardians/${created.id}/activate`, {
  token,

  method: "POST",
});

assert(
  reactivated.status === "active",
  "Transport Manager could not reactivate Guardian",
);

assert(
  reactivated.id === created.id,
  "Reactivation did not preserve the Guardian record",
);

console.log("✓ guardian reactivated");

/*
 * 7. Final persisted state.
 */
const finalGuardian = await request(`/guardians/${created.id}`, {
  token,
});

assert(
  finalGuardian.status === "active",
  "Final Guardian status is not active",
);

assert(
  finalGuardian.email === updatedEmail,
  "Updated Guardian details were not preserved",
);

console.log("✓ final Guardian state verified");

console.log("");
console.log("Transport Manager Guardian permissions checkpoint PASSED");
