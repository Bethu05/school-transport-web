export interface DevLoginPreset {
  label: string;
  role: string;
  email: string;
  password: string;
  configured: boolean;
}

const developmentPassword = import.meta.env.VITE_DEV_PASSWORD ?? "";

function createPreset(
  label: string,
  role: string,
  email: string | undefined,
): DevLoginPreset {
  const resolvedEmail = email ?? "";

  return {
    label,
    role,
    email: resolvedEmail,
    password: developmentPassword,

    configured: Boolean(resolvedEmail && developmentPassword),
  };
}

export const devLoginPresets: DevLoginPreset[] = [
  createPreset(
    "Platform Admin",
    "Full Platform Administration",
    import.meta.env.VITE_DEV_SUPER_ADMIN_EMAIL,
  ),

  createPreset(
    "Assistant Platform Admin",
    "School Application Review",
    import.meta.env.VITE_DEV_ASSISTANT_PLATFORM_ADMIN_EMAIL ??
      "assistant.platform.admin@example.test",
  ),

  createPreset(
    "Executive Sales",
    "School Application Sales",
    import.meta.env.VITE_DEV_EXECUTIVE_SALES_EMAIL ??
      "executive.sales@example.test",
  ),

  createPreset(
    "Administrator",
    "School Administrator",
    import.meta.env.VITE_DEV_ADMIN_EMAIL,
  ),

  createPreset(
    "Transport Manager",
    "Transport Manager",
    import.meta.env.VITE_DEV_TRANSPORT_MANAGER_EMAIL,
  ),

  createPreset("Driver", "Driver", import.meta.env.VITE_DEV_DRIVER_EMAIL),

  createPreset(
    "Parent",
    "Parent / Guardian",
    import.meta.env.VITE_DEV_PARENT_EMAIL,
  ),
];
