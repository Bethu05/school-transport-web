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

console.log("Student Guardians API checkpoint");

console.log("-------------------------------");

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

assert(login?.accessToken, "Transport Manager login returned no token");

const token = login.accessToken;

console.log("✓ transport manager login");

/*
 * 2. Confirm relationship-management permission.
 */
const context = await request("/auth/context", {
  token,
});

assert(
  Array.isArray(context.permissions),
  "auth/context did not return permissions[]",
);

assert(
  context.permissions.includes("guardians.manage_students"),
  "Transport Manager is missing guardians.manage_students",
);

console.log("✓ guardian/student relationship permission");

/*
 * 3. Obtain an active Student.
 *
 * We deliberately reuse an existing Student so this checkpoint
 * only tests the Guardian relationship domain.
 */
const students = await request("/students?status=active&page=1&limit=10", {
  token,
});

assert(
  Array.isArray(students?.items) && students.items.length > 0,
  "No active Student is available for the checkpoint",
);

const student = students.items[0];

console.log(
  `✓ active student loaded: ${student.firstName} ${student.lastName}`,
);

/*
 * 4. Create a unique Guardian.
 */
const unique = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;

const guardian = await request("/guardians", {
  token,

  method: "POST",

  body: {
    firstName: "Checkpoint",

    lastName: "Guardian",

    email: `student-guardian-${unique}@example.com`,

    phone: `+2547${String(Math.floor(Math.random() * 100000000)).padStart(
      8,
      "0",
    )}`,

    notifyBoarded: true,

    notifyDroppedOff: true,

    notifyTripUpdates: true,
  },
});

assert(guardian?.id, "Guardian creation returned no id");

console.log("✓ checkpoint guardian created");

/*
 * 5. Confirm initial relationship does not already exist.
 */
const initialRelationships = await request(
  `/students/${student.id}/guardians`,
  {
    token,
  },
);

assert(
  Array.isArray(initialRelationships),
  "Student Guardian list did not return an array",
);

assert(
  !initialRelationships.some(
    (relationship) => relationship.guardianId === guardian.id,
  ),
  "Checkpoint Guardian was unexpectedly already linked",
);

/*
 * The checkpoint reuses a real active Student.
 *
 * That Student may already have a primary Guardian. The database
 * correctly allows only one primary Guardian per Student, so this
 * checkpoint must not assume that promotion to primary is always
 * available.
 *
 * If no primary Guardian exists, prove that this relationship can
 * become primary. Otherwise keep this relationship non-primary and
 * continue testing the remaining mutable relationship metadata.
 */
const studentAlreadyHasPrimaryGuardian = initialRelationships.some(
  (relationship) => relationship.isPrimary === true,
);

const expectedPrimaryAfterUpdate = !studentAlreadyHasPrimaryGuardian;

console.log("✓ initial relationship absent");

console.log(
  studentAlreadyHasPrimaryGuardian
    ? "✓ existing primary Guardian detected; checkpoint relationship will remain non-primary"
    : "✓ no existing primary Guardian; checkpoint relationship will be promoted to primary",
);

/*
 * 6. Link Guardian to Student.
 */
const linked = await request(`/students/${student.id}/guardians`, {
  token,

  method: "POST",

  body: {
    guardianId: guardian.id,

    relationshipType: "guardian",

    isPrimary: false,

    receiveNotifications: true,
  },
});

assert(
  linked?.guardianId === guardian.id,
  "Linked relationship returned wrong Guardian",
);

assert(
  linked.relationshipType === "guardian",
  "Initial relationship type was not persisted",
);

assert(linked.isPrimary === false, "Initial primary flag was not persisted");

assert(
  linked.receiveNotifications === true,
  "Initial notification flag was not persisted",
);

console.log("✓ guardian linked to student");

/*
 * 7. Verify link persisted.
 */
const afterLink = await request(`/students/${student.id}/guardians`, {
  token,
});

const persistedLink = afterLink.find(
  (relationship) => relationship.guardianId === guardian.id,
);

assert(persistedLink, "Guardian relationship did not persist");

console.log("✓ relationship persisted");

/*
 * 8. Update relationship metadata.
 */
const updated = await request(
  `/students/${student.id}/guardians/${guardian.id}`,
  {
    token,

    method: "PATCH",

    body: {
      relationshipType: "parent",

      isPrimary: expectedPrimaryAfterUpdate,

      receiveNotifications: false,
    },
  },
);

assert(
  updated.relationshipType === "parent",
  "Relationship type update failed",
);

assert(
  updated.isPrimary === expectedPrimaryAfterUpdate,
  "Primary Guardian update did not match the valid relationship state",
);

assert(
  updated.receiveNotifications === false,
  "Relationship notification update failed",
);

console.log("✓ relationship updated");

/*
 * 9. Verify update persisted.
 */
const afterUpdate = await request(`/students/${student.id}/guardians`, {
  token,
});

const persistedUpdate = afterUpdate.find(
  (relationship) => relationship.guardianId === guardian.id,
);

assert(
  persistedUpdate?.relationshipType === "parent",
  "Updated relationship type did not persist",
);

assert(
  persistedUpdate?.isPrimary === expectedPrimaryAfterUpdate,
  "Updated primary flag did not persist",
);

assert(
  persistedUpdate?.receiveNotifications === false,
  "Updated notification flag did not persist",
);

console.log("✓ relationship update verified");

/*
 * 10. Unlink.
 *
 * This must remove only the Student/Guardian relationship.
 * It must NOT delete either master record.
 */
await request(`/students/${student.id}/guardians/${guardian.id}`, {
  token,

  method: "DELETE",
});

console.log("✓ guardian unlinked");

/*
 * 11. Verify relationship is gone.
 */
const afterUnlink = await request(`/students/${student.id}/guardians`, {
  token,
});

assert(
  !afterUnlink.some((relationship) => relationship.guardianId === guardian.id),
  "Guardian relationship still exists after unlink",
);

console.log("✓ unlink persisted");

/*
 * 12. Verify Guardian master record still exists.
 */
const survivingGuardian = await request(`/guardians/${guardian.id}`, {
  token,
});

assert(
  survivingGuardian.id === guardian.id,
  "Unlink incorrectly removed the Guardian master record",
);

console.log("✓ guardian master record preserved");

console.log("");
console.log("Student Guardians API checkpoint PASSED");
