import { readFileSync } from "node:fs";

function assert(condition, message) {
  if (!condition) {
    throw new Error(`✗ ${message}`);
  }

  console.log(`✓ ${message}`);
}

function quotedValue(source, value) {
  return source.includes(`"${value}"`) || source.includes(`'${value}'`);
}

const app = readFileSync("src/App.tsx", "utf8");

const client = readFileSync("src/api/client.ts", "utf8");

const authApi = readFileSync("src/auth/auth.api.ts", "utf8");

const authProvider = readFileSync("src/auth/AuthProvider.tsx", "utf8");

const protectedRoute = readFileSync("src/auth/ProtectedRoute.tsx", "utf8");

const loginPage = readFileSync("src/auth/LoginPage.tsx", "utf8");

const shell = readFileSync("src/app/AppShell.tsx", "utf8");

const permissions = readFileSync("src/auth/frontend-permissions.ts", "utf8");

const changePasswordPage = readFileSync(
  "src/security/ChangePasswordPage.tsx",
  "utf8",
);

const usersApi = readFileSync("src/users/users.api.ts", "utf8");

const usersPage = readFileSync("src/users/UsersAccessPage.tsx", "utf8");

const resetDialog = readFileSync(
  "src/users/ResetUserPasswordDialog.tsx",
  "utf8",
);

const accountStatus = readFileSync(
  "src/account-status/AccountStatusPage.tsx",
  "utf8",
);

const settings = readFileSync("src/settings/SettingsPage.tsx", "utf8");

console.log("Password management frontend checkpoint");
console.log("---------------------------------------");

assert(authApi.includes("mustChangePassword"), "/auth/me security state typed");

assert(
  authApi.includes('"/auth/password"'),
  "self-service password endpoint wired",
);

assert(authApi.includes('method: "PUT"'), "password mutation uses PUT");

assert(
  authProvider.includes("passwordChangeRequired"),
  "AuthProvider stores forced-password state",
);

assert(
  authProvider.indexOf("response.security.mustChangePassword") <
    authProvider.indexOf("await getAuthTenants()"),
  "password security is evaluated before tenant discovery",
);

assert(
  client.includes("PASSWORD_CHANGE_REQUIRED_EVENT"),
  "live password-reset event handled",
);

assert(
  client.includes('"PASSWORD_CHANGE_REQUIRED"'),
  "backend forced-password error code recognised",
);

assert(
  protectedRoute.includes('to="/change-password"'),
  "normal protected routes enforce password change",
);

assert(app.includes('path="/change-password"'), "change-password route exists");

assert(app.includes('path="/users-access"'), "Users & Access route exists");

assert(
  loginPage.includes('"/change-password"'),
  "login routes temporary-password users to password change",
);

assert(
  changePasswordPage.includes("Minimum 12 characters"),
  "new-password minimum displayed",
);

assert(
  changePasswordPage.includes("currentPassword"),
  "current password is required",
);

assert(
  changePasswordPage.includes("confirmPassword"),
  "new password confirmation exists",
);

assert(
  changePasswordPage.includes("Generate strong password"),
  "change-password screen can generate a strong password",
);

assert(
  changePasswordPage.includes("crypto.getRandomValues"),
  "password generator uses cryptographic browser randomness",
);

assert(
  changePasswordPage.includes("navigator.clipboard.writeText"),
  "generated password can be copied",
);

assert(
  changePasswordPage.includes("showNewPassword"),
  "generated password can be shown or hidden",
);

assert(
  shell.includes('navigate("/change-password")'),
  "user avatar opens password security",
);

assert(
  shell.includes('label: "Users & Access"'),
  "Users & Access navigation exists",
);

assert(
  quotedValue(permissions, "users.read"),
  "users.read frontend permission exists",
);

assert(
  quotedValue(permissions, "users.reset_password"),
  "users.reset_password frontend permission exists",
);

assert(usersApi.includes('"/users"'), "tenant users API wired");

assert(usersApi.includes("/password/reset"), "admin password-reset API wired");

assert(
  usersPage.includes("FRONTEND_PERMISSIONS.USERS_READ"),
  "Users page checks users.read",
);

assert(
  usersPage.includes("FRONTEND_PERMISSIONS.USERS_RESET_PASSWORD"),
  "Users page checks reset-password permission",
);

assert(
  resetDialog.includes("temporary password"),
  "temporary-password reset dialog exists",
);

assert(
  resetDialog.includes("Minimum 12 characters"),
  "admin reset enforces 12-character guidance",
);

assert(
  accountStatus.includes('navigate("/change-password")'),
  "paused account can still change password",
);

assert(
  accountStatus.includes('navigate("/users-access")'),
  "paused authorised admin can still reach user recovery",
);

assert(
  settings.includes('navigate("/change-password")'),
  "Settings exposes account password security",
);

assert(
  settings.includes('navigate("/users-access")'),
  "Settings exposes Users & Access",
);

console.log();
console.log("Password management frontend checkpoint PASSED");
