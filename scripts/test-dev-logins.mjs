const apiUrl = process.env.VITE_API_URL ?? "http://localhost:3000";

const tenantId = process.env.VITE_DEV_TENANT_ID;

const password = process.env.VITE_DEV_PASSWORD;

if (!tenantId) {
  throw new Error("VITE_DEV_TENANT_ID is missing");
}

if (!password) {
  throw new Error("VITE_DEV_PASSWORD is missing");
}

const accounts = [
  {
    label: "Administrator",
    email: process.env.VITE_DEV_ADMIN_EMAIL,
    expectedRoles: ["admin", "owner"],
  },

  {
    label: "Transport Manager",
    email: process.env.VITE_DEV_TRANSPORT_MANAGER_EMAIL,
    expectedRoles: ["transport_manager"],
  },

  {
    label: "Driver",
    email: process.env.VITE_DEV_DRIVER_EMAIL,
    expectedRoles: ["driver"],
  },

  {
    label: "Parent",
    email: process.env.VITE_DEV_PARENT_EMAIL,
    expectedRoles: ["guardian"],
  },
];

async function testAccount(account) {
  if (!account.email) {
    throw new Error(`${account.label} email is missing`);
  }

  console.log(`\n→ Testing ${account.label}`);

  const loginResponse = await fetch(`${apiUrl}/auth/login`, {
    method: "POST",

    headers: {
      "Content-Type": "application/json",
    },

    body: JSON.stringify({
      email: account.email,
      password,
    }),
  });

  if (!loginResponse.ok) {
    const body = await loginResponse.text();

    throw new Error(
      `${account.label} login failed ` + `(${loginResponse.status}): ${body}`,
    );
  }

  const login = await loginResponse.json();

  if (!login.accessToken) {
    throw new Error(`${account.label} returned no access token`);
  }

  const contextResponse = await fetch(`${apiUrl}/auth/context`, {
    headers: {
      Authorization: `Bearer ${login.accessToken}`,

      "x-tenant-id": tenantId,
    },
  });

  if (!contextResponse.ok) {
    const body = await contextResponse.text();

    throw new Error(
      `${account.label} context failed ` +
        `(${contextResponse.status}): ${body}`,
    );
  }

  const context = await contextResponse.json();

  const role = context?.tenant?.role;

  if (!account.expectedRoles.includes(role)) {
    throw new Error(
      `${account.label}: expected ` +
        `${account.expectedRoles.join(" or ")}, ` +
        `received ${String(role)}`,
    );
  }

  console.log(`✓ ${account.label}`);

  console.log(`  email: ${account.email}`);

  console.log(`  role: ${role}`);

  console.log(`  tenant: ${context.tenant.tenantId}`);
}

console.log("\n========================================");

console.log(" DEVELOPMENT LOGIN CHECKPOINT");

console.log("========================================");

for (const account of accounts) {
  await testAccount(account);
}

console.log("\n========================================");

console.log(" ✓ ALL DEVELOPMENT LOGINS PASSED");

console.log("========================================\n");
