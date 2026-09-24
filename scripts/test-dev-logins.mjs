const apiUrl = process.env.VITE_API_URL ?? "http://localhost:3000";

const tenantId = process.env.VITE_DEV_TENANT_ID;
const password = process.env.VITE_DEV_PASSWORD;

if (!tenantId) {
  throw new Error("VITE_DEV_TENANT_ID is missing");
}

if (!password) {
  throw new Error("VITE_DEV_PASSWORD is missing");
}

const tenantAccounts = [
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

const platformAccounts = [
  {
    label: "Platform Admin",
    email: process.env.VITE_DEV_SUPER_ADMIN_EMAIL,
    expectedRole: "super_admin",
    requireNoTenantMembership: false,
  },
  {
    label: "Assistant Platform Admin",
    email:
      process.env.VITE_DEV_ASSISTANT_PLATFORM_ADMIN_EMAIL ??
      "assistant.platform.admin@example.test",
    expectedRole: "assistant_platform_admin",
    requireNoTenantMembership: true,
  },
  {
    label: "Executive Sales",
    email:
      process.env.VITE_DEV_EXECUTIVE_SALES_EMAIL ??
      "executive.sales@example.test",
    expectedRole: "executive_sales",
    requireNoTenantMembership: true,
  },
];

async function login(account) {
  if (!account.email) {
    throw new Error(`${account.label} email is missing`);
  }

  const response = await fetch(`${apiUrl}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: account.email,
      password,
    }),
  });

  if (!response.ok) {
    throw new Error(
      `${account.label} login failed (${response.status}): ${await response.text()}`,
    );
  }

  const body = await response.json();

  if (!body.accessToken) {
    throw new Error(`${account.label} returned no access token`);
  }

  return body.accessToken;
}

async function testTenantAccount(account) {
  console.log(`\n→ Testing ${account.label}`);

  const accessToken = await login(account);

  const response = await fetch(`${apiUrl}/auth/context`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "x-tenant-id": tenantId,
    },
  });

  if (!response.ok) {
    throw new Error(
      `${account.label} context failed (${response.status}): ${await response.text()}`,
    );
  }

  const context = await response.json();
  const role = context?.tenant?.role;

  if (!account.expectedRoles.includes(role)) {
    throw new Error(
      `${account.label}: expected ${account.expectedRoles.join(" or ")}, received ${String(role)}`,
    );
  }

  console.log(`✓ ${account.label}`);
  console.log(`  email: ${account.email}`);
  console.log(`  tenant role: ${role}`);
}

async function testPlatformAccount(account) {
  console.log(`\n→ Testing ${account.label}`);

  const accessToken = await login(account);

  const meResponse = await fetch(`${apiUrl}/auth/me`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!meResponse.ok) {
    throw new Error(
      `${account.label} auth/me failed (${meResponse.status}): ${await meResponse.text()}`,
    );
  }

  const me = await meResponse.json();
  const roles = me?.platform?.roles ?? [];

  if (!roles.includes(account.expectedRole)) {
    throw new Error(
      `${account.label}: expected platform role ${account.expectedRole}, received ${roles.join(", ") || "<none>"}`,
    );
  }

  if (!Array.isArray(me?.platform?.permissions)) {
    throw new Error(`${account.label}: platform permissions are missing`);
  }

  if (account.requireNoTenantMembership) {
    const tenantsResponse = await fetch(`${apiUrl}/auth/tenants`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!tenantsResponse.ok) {
      throw new Error(
        `${account.label} tenant discovery failed (${tenantsResponse.status}): ${await tenantsResponse.text()}`,
      );
    }

    const tenants = await tenantsResponse.json();

    if ((tenants?.items ?? []).length !== 0) {
      throw new Error(
        `${account.label} unexpectedly received tenant membership`,
      );
    }
  }

  console.log(`✓ ${account.label}`);
  console.log(`  email: ${account.email}`);
  console.log(`  platform role: ${account.expectedRole}`);
}

console.log("\n========================================");
console.log(" DEVELOPMENT LOGIN CHECKPOINT");
console.log("========================================");

for (const account of platformAccounts) {
  await testPlatformAccount(account);
}

for (const account of tenantAccounts) {
  await testTenantAccount(account);
}

console.log("\n========================================");
console.log(" ✓ ALL DEVELOPMENT LOGINS PASSED");
console.log("========================================\n");
