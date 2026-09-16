import type { IncidentRow, TripRow } from "./dashboard.types";

/**
 * Translate backend membership role names into
 * human-readable labels.
 */
export function roleLabel(role?: string): string {
  switch (role) {
    case "owner":
      return "Owner";

    case "admin":
      return "Administrator";

    case "transport_manager":
      return "Transport Manager";

    case "driver":
      return "Driver";

    case "guardian":
      return "Parent";

    default:
      return "User";
  }
}

export function statusColor(status: TripRow["status"]): string {
  switch (status) {
    case "Active":
      return "#65A77C";

    case "Delayed":
      return "#C36A63";

    default:
      return "#C9A55C";
  }
}

export function severityColor(severity: IncidentRow["severity"]): string {
  switch (severity) {
    case "High":
      return "#C35E58";

    case "Medium":
      return "#C28A3D";

    default:
      return "#718775";
  }
}
