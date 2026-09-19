const apiUrl = (process.env.VITE_API_URL ?? "http://localhost:3000").replace(
  /\/$/,
  "",
);

const email = process.env.VITE_DEV_ADMIN_EMAIL;

const password = process.env.VITE_DEV_PASSWORD;

const tenantId = process.env.VITE_DEV_TENANT_ID;

function required(name, value) {
  if (!value) {
    throw new Error(`${name} is required`);
  }

  return value;
}

required("VITE_DEV_ADMIN_EMAIL", email);

required("VITE_DEV_PASSWORD", password);

required("VITE_DEV_TENANT_ID", tenantId);

async function readJson(response) {
  const text = await response.text();

  if (!response.ok) {
    throw new Error(
      [`${response.status} ${response.statusText}`, text].join("\n"),
    );
  }

  return text ? JSON.parse(text) : undefined;
}

console.log("Settings API checkpoint");

console.log("-----------------------");

// ============================================================
// LOGIN
// ============================================================

const loginResponse = await fetch(`${apiUrl}/auth/login`, {
  method: "POST",

  headers: {
    "Content-Type": "application/json",

    Accept: "application/json",
  },

  body: JSON.stringify({
    email,

    password,
  }),
});

const login = await readJson(loginResponse);

const token = login?.accessToken;

required("accessToken", token);

console.log("✓ administrator login");

// ============================================================
// HEADERS
// ============================================================

const baseHeaders = {
  Authorization: `Bearer ${token}`,

  "x-tenant-id": tenantId,

  Accept: "application/json",
};

const jsonHeaders = {
  ...baseHeaders,

  "Content-Type": "application/json",
};

// ============================================================
// READ CURRENT SETTINGS
// ============================================================

const readResponse = await fetch(`${apiUrl}/settings`, {
  headers: baseHeaders,
});

const initial = await readJson(readResponse);

if (!initial?.general || initial.general.tenantId !== tenantId) {
  throw new Error("GET /settings returned an invalid tenant settings response");
}

console.log("✓ settings loaded");

const originalTimeFormat = initial.general.timeFormat;

const alternateTimeFormat = originalTimeFormat === "24h" ? "12h" : "24h";

let changed = false;

let checkpointError = null;

// ============================================================
// MUTATE / VERIFY / RETRY
// ============================================================

try {
  const updateResponse = await fetch(`${apiUrl}/settings/general`, {
    method: "PATCH",

    headers: jsonHeaders,

    body: JSON.stringify({
      timeFormat: alternateTimeFormat,
    }),
  });

  const updated = await readJson(updateResponse);

  if (updated?.general?.timeFormat !== alternateTimeFormat) {
    throw new Error(
      "PATCH /settings/general did not return updated time format",
    );
  }

  changed = true;

  console.log(
    `✓ time format changed: ${originalTimeFormat} -> ${alternateTimeFormat}`,
  );

  const verifyResponse = await fetch(`${apiUrl}/settings`, {
    headers: baseHeaders,
  });

  const verified = await readJson(verifyResponse);

  if (verified?.general?.timeFormat !== alternateTimeFormat) {
    throw new Error("Settings update was not persisted");
  }

  console.log("✓ settings update persisted");

  const retryResponse = await fetch(`${apiUrl}/settings/general`, {
    method: "PATCH",

    headers: jsonHeaders,

    body: JSON.stringify({
      timeFormat: alternateTimeFormat,
    }),
  });

  const retried = await readJson(retryResponse);

  if (retried?.general?.timeFormat !== alternateTimeFormat) {
    throw new Error(
      "Identical Settings PATCH did not return canonical settings",
    );
  }

  console.log("✓ identical PATCH accepted idempotently");
} catch (error) {
  checkpointError = error;
}

// ============================================================
// RESTORE ORIGINAL VALUE
//
// Deliberately outside finally.
//
// This preserves the original checkpoint error if restoration
// also fails.
// ============================================================

let restoreError = null;

if (changed) {
  try {
    const restoreResponse = await fetch(`${apiUrl}/settings/general`, {
      method: "PATCH",

      headers: jsonHeaders,

      body: JSON.stringify({
        timeFormat: originalTimeFormat,
      }),
    });

    const restored = await readJson(restoreResponse);

    if (restored?.general?.timeFormat !== originalTimeFormat) {
      throw new Error(
        "Settings API checkpoint could not restore original time format",
      );
    }

    console.log("✓ original setting restored");
  } catch (error) {
    restoreError = error;
  }
}

// ============================================================
// REPORT RESULT AFTER CLEANUP
// ============================================================

if (checkpointError && restoreError) {
  throw new AggregateError(
    [checkpointError, restoreError],
    "Settings API checkpoint failed and cleanup also failed",
  );
}

if (checkpointError) {
  throw checkpointError;
}

if (restoreError) {
  throw restoreError;
}

console.log("");

console.log("Settings API checkpoint PASSED");
