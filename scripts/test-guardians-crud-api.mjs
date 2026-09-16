const API_URL = (process.env.VITE_API_URL ?? "http://localhost:3000").replace(
  /\/$/,
  "",
);

const ADMIN_EMAIL = process.env.VITE_DEV_ADMIN_EMAIL;

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

console.log("Guardians CRUD API checkpoint");
console.log("-----------------------------");

assert(ADMIN_EMAIL, "VITE_DEV_ADMIN_EMAIL is missing");

assert(PASSWORD, "VITE_DEV_PASSWORD is missing");

assert(TENANT_ID, "VITE_DEV_TENANT_ID is missing");

/*
 * 1. Login
 */
const login = await request("/auth/login", {
  method: "POST",

  body: {
    email: ADMIN_EMAIL,

    password: PASSWORD,
  },
});

assert(login?.accessToken, "Administrator login returned no access token");

const token = login.accessToken;

console.log("✓ administrator login");

/*
 * Use a unique email so repeated runs remain safe even though
 * Guardian records are preserved historically.
 */
const unique = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;

const email = `guardian-checkpoint-${unique}@example.com`;

const updatedEmail = `guardian-updated-${unique}@example.com`;

/*
 * 2. Create
 */
const created = await request("/guardians", {
  token,

  method: "POST",

  body: {
    firstName: "Checkpoint",

    lastName: "Guardian",

    email,

    phone: "+254700123456",

    notifyBoarded: true,

    notifyDroppedOff: true,

    notifyTripUpdates: true,
  },
});

assert(created?.id, "Guardian create returned no id");

assert(created.status === "active", "New Guardian was not active");

assert(created.email === email, "Created Guardian email mismatch");

console.log("✓ guardian created");

/*
 * 3. Verify in list
 */
const listAfterCreate = await request(
  `/guardians?page=1&limit=10&search=${encodeURIComponent(email)}`,
  {
    token,
  },
);

assert(
  Array.isArray(listAfterCreate?.items),
  "Guardian list response has no items array",
);

assert(
  listAfterCreate.items.some((guardian) => guardian.id === created.id),
  "Created Guardian was not found in list",
);

console.log("✓ guardian creation verified");

/*
 * 4. Update
 */
const updated = await request(`/guardians/${created.id}`, {
  token,

  method: "PATCH",

  body: {
    firstName: "Updated",

    lastName: "Guardian",

    email: updatedEmail,

    phone: "+254711654321",

    notifyBoarded: false,

    notifyDroppedOff: true,

    notifyTripUpdates: false,
  },
});

assert(updated.firstName === "Updated", "Guardian first name update failed");

assert(updated.email === updatedEmail, "Guardian email update failed");

assert(updated.notifyBoarded === false, "notifyBoarded update failed");

assert(updated.notifyTripUpdates === false, "notifyTripUpdates update failed");

console.log("✓ guardian updated");

/*
 * 5. Deactivate
 */
const deactivated = await request(`/guardians/${created.id}/deactivate`, {
  token,

  method: "POST",
});

assert(deactivated.status === "inactive", "Guardian did not deactivate");

console.log("✓ guardian deactivated");

/*
 * 6. Verify inactive state
 */
const inactive = await request(`/guardians/${created.id}`, {
  token,
});

assert(
  inactive.status === "inactive",
  "Guardian inactive state did not persist",
);

console.log("✓ deactivation persisted");

/*
 * 7. Reactivate
 */
const reactivated = await request(`/guardians/${created.id}/activate`, {
  token,

  method: "POST",
});

assert(reactivated.status === "active", "Guardian did not reactivate");

assert(
  reactivated.id === created.id,
  "Reactivation created/returned a different Guardian record",
);

console.log("✓ guardian reactivated");

/*
 * 8. Verify active state persisted
 */
const activeAgain = await request(`/guardians/${created.id}`, {
  token,
});

assert(
  activeAgain.status === "active",
  "Guardian reactivation did not persist",
);

console.log("✓ reactivation persisted");

console.log("");
console.log("Guardians CRUD API checkpoint PASSED");
