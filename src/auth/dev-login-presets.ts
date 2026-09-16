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
    "Administrator",
    "Administrator",
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
