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
    throw new Error(`${response.status} ${response.statusText}\n${text}`);
  }

  return text ? JSON.parse(text) : undefined;
}

console.log("Drivers API checkpoint");

console.log("----------------------");

/**
 * Authenticate using the permanent
 * development administrator.
 */
const loginResponse = await fetch(`${apiUrl}/auth/login`, {
  method: "POST",

  headers: {
    "Content-Type": "application/json",
  },

  body: JSON.stringify({
    email,
    password,
  }),
});

const login = await readJson(loginResponse);

if (!login || typeof login.accessToken !== "string" || !login.accessToken) {
  throw new Error("Login response did not contain accessToken");
}

console.log("✓ administrator login");

/**
 * Fetch the tenant-scoped Drivers API.
 */
const response = await fetch(`${apiUrl}/drivers`, {
  headers: {
    Authorization: `Bearer ${login.accessToken}`,

    "x-tenant-id": tenantId,
  },
});

const drivers = await readJson(response);

if (!Array.isArray(drivers)) {
  throw new Error("GET /drivers must return an array");
}

console.log("✓ drivers response contract");

const allowedStatuses = new Set(["active", "inactive", "suspended"]);

for (const driver of drivers) {
  if (driver.tenantId !== tenantId) {
    throw new Error(`Cross-tenant driver returned: ${driver.id}`);
  }

  if (
    typeof driver.id !== "string" ||
    typeof driver.firstName !== "string" ||
    typeof driver.lastName !== "string" ||
    typeof driver.licenseNumber !== "string" ||
    typeof driver.status !== "string"
  ) {
    throw new Error(
      `Driver ${driver.id ?? "<unknown>"} has an invalid response shape`,
    );
  }

  if (!allowedStatuses.has(driver.status)) {
    throw new Error(
      `Driver ${driver.id} returned unsupported status: ${driver.status}`,
    );
  }
}

console.log("✓ tenant isolation response");

console.log("✓ driver field contract");

console.log(`✓ ${drivers.length} driver(s) returned`);

console.log();

console.log("Drivers API checkpoint PASSED");
