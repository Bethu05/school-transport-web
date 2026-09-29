import {
  Alert,
  Box,
  CircularProgress,
  MenuItem,
  TextField,
  Typography,
} from "@mui/material";

import { useMutation, useQuery } from "@tanstack/react-query";

import { useAuth } from "../auth/AuthProvider";

import {
  FRONTEND_PERMISSIONS,
  hasFrontendPermission,
} from "../auth/frontend-permissions";

import { listTenantUsers, type TenantUser } from "../users/users.api";

import {
  assignTripStaff,
  listTripStaff,
  removeTripStaffAssignment,
  type Trip,
  type TripStaffAssignment,
} from "./trips.api";

interface TripChaperoneFieldProps {
  trip: Trip;

  disabled?: boolean;
}

function optionalString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

/**
 * users.api.ts owns the authoritative TenantUser type.
 *
 * We deliberately read optional display fields defensively here
 * because the Chaperone selector only needs:
 *
 * - user id
 * - active membership
 * - a human-friendly label
 */
function userField(user: TenantUser, key: string): string | null {
  const record = user as unknown as Record<string, unknown>;

  return optionalString(record[key]);
}

function userLabel(user: TenantUser): string {
  const firstName = userField(user, "firstName");

  const lastName = userField(user, "lastName");

  const email = userField(user, "email");

  const name = [firstName, lastName].filter(Boolean).join(" ");

  if (name && email) {
    return `${name} — ${email}`;
  }

  return name || email || user.id;
}

function userRole(user: TenantUser): string | null {
  return userField(user, "role") ?? userField(user, "membershipRole");
}

function isEligibleCandidate(user: TenantUser): boolean {
  if (user.membershipStatus !== "active" || user.userStatus !== "active") {
    return false;
  }

  /**
   * Current tenant-user models normally expose the tenant role.
   *
   * If the property is present, restrict the selector to
   * staff-style accounts.
   *
   * If an older API response does not expose it, the backend
   * still performs the authoritative active-membership check.
   */
  const role = userRole(user);

  if (!role) {
    return true;
  }

  return role === "staff" || role === "teacher" || role === "chaperone";
}

function assignmentLabel(assignment: TripStaffAssignment): string {
  const name = [assignment.firstName, assignment.lastName]
    .filter(Boolean)
    .join(" ");

  return name ? `${name} — ${assignment.email}` : assignment.email;
}

export function TripChaperoneField({
  trip,
  disabled = false,
}: TripChaperoneFieldProps) {
  const { tenant, permissions } = useAuth();

  const tenantId = tenant?.tenantId ?? null;

  const canManageStaff = hasFrontendPermission(
    permissions,
    FRONTEND_PERMISSIONS.TRIPS_MANAGE_STAFF,
  );

  const canReadUsers = hasFrontendPermission(
    permissions,
    FRONTEND_PERMISSIONS.USERS_READ,
  );

  const editable = trip.status === "draft" || trip.status === "scheduled";

  const staffQuery = useQuery({
    queryKey: ["trip-staff", tenantId, trip.id],

    enabled: Boolean(tenantId && canManageStaff),

    queryFn: async () => {
      if (!tenantId) {
        throw new Error("No active tenant");
      }

      return listTripStaff(tenantId, trip.id);
    },
  });

  const usersQuery = useQuery({
    queryKey: ["tenant-users", tenantId, "trip-chaperone"],

    enabled: Boolean(tenantId && canManageStaff && canReadUsers && editable),

    queryFn: async () => {
      if (!tenantId) {
        throw new Error("No active tenant");
      }

      return listTenantUsers(tenantId);
    },
  });

  const activeChaperones = (staffQuery.data ?? []).filter(
    (assignment) =>
      assignment.status === "assigned" && assignment.staffRole === "chaperone",
  );

  /**
   * Normally this is one person.
   *
   * If historical/demo data contains more than one active
   * Chaperone, changing the selector cleans those assignments
   * before creating the replacement.
   */
  const currentChaperone = activeChaperones[0] ?? null;

  const candidates = (usersQuery.data ?? []).filter(isEligibleCandidate);

  const mutation = useMutation({
    mutationFn: async (nextUserId: string) => {
      if (!tenantId) {
        throw new Error("No active tenant");
      }

      if (!editable) {
        throw new Error("Chaperone assignment is locked once boarding begins.");
      }

      if (
        activeChaperones.length === 1 &&
        currentChaperone?.userId === nextUserId
      ) {
        return currentChaperone;
      }

      /**
       * Clear existing active Chaperone assignments first.
       *
       * The trip is still draft/scheduled, and the backend
       * boarding guard prevents this trip becoming operational
       * while no Chaperone is assigned.
       */
      for (const assignment of activeChaperones) {
        await removeTripStaffAssignment(tenantId, trip.id, assignment.id);
      }

      if (!nextUserId) {
        return null;
      }

      return assignTripStaff(tenantId, trip.id, {
        userId: nextUserId,

        staffRole: "chaperone",
      });
    },

    onSuccess: async () => {
      await staffQuery.refetch();
    },
  });

  if (!canManageStaff) {
    return (
      <Box
        sx={{
          gridColumn: "1 / -1",
        }}
      >
        <TextField
          fullWidth
          label="Chaperone"
          value="Management permission required"
          disabled
          helperText="Your current account does not have permission to assign onboard staff."
        />
      </Box>
    );
  }

  if (staffQuery.isLoading) {
    return (
      <Box
        sx={{
          gridColumn: "1 / -1",

          display: "flex",
          alignItems: "center",
          gap: 1,
          py: 1,
        }}
      >
        <CircularProgress size={18} />

        <Typography
          sx={{
            color: "text.secondary",

            fontSize: 12,
          }}
        >
          Loading Chaperone assignment…
        </Typography>
      </Box>
    );
  }

  if (staffQuery.isError) {
    return (
      <Alert
        severity="error"
        sx={{
          gridColumn: "1 / -1",
        }}
      >
        Unable to load the trip Chaperone.
      </Alert>
    );
  }

  if (!canReadUsers) {
    return (
      <Box
        sx={{
          gridColumn: "1 / -1",
        }}
      >
        <TextField
          fullWidth
          label="Chaperone"
          value={
            currentChaperone
              ? assignmentLabel(currentChaperone)
              : "Not assigned"
          }
          disabled
        />

        <Alert severity="info" sx={{ mt: 1 }}>
          You can manage trip staff, but this account cannot read the
          organisation user directory.
        </Alert>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        gridColumn: "1 / -1",
      }}
    >
      <TextField
        select
        fullWidth
        label="Chaperone"
        value={currentChaperone?.userId ?? ""}
        disabled={
          disabled || !editable || usersQuery.isLoading || mutation.isPending
        }
        onChange={(event) => {
          mutation.mutate(event.target.value);
        }}
        helperText={
          !editable
            ? "Chaperone assignment is locked once boarding begins."
            : "Required before the Driver can begin boarding."
        }
      >
        <MenuItem value="">Not assigned</MenuItem>

        {candidates.map((user) => (
          <MenuItem key={user.id} value={user.id}>
            {userLabel(user)}
          </MenuItem>
        ))}
      </TextField>

      {currentChaperone ? (
        <Typography
          sx={{
            mt: 0.75,

            color: "success.main",

            fontSize: 11.5,

            fontWeight: 750,
          }}
        >
          Assigned onboard Chaperone: {assignmentLabel(currentChaperone)}
        </Typography>
      ) : (
        <Typography
          sx={{
            mt: 0.75,

            color: "warning.main",

            fontSize: 11.5,

            fontWeight: 750,
          }}
        >
          No Chaperone assigned — boarding will be blocked.
        </Typography>
      )}

      {activeChaperones.length > 1 ? (
        <Alert
          severity="warning"
          sx={{
            mt: 1,
          }}
        >
          More than one active Chaperone assignment exists. Selecting a
          Chaperone here will normalise the trip to one assignment.
        </Alert>
      ) : null}

      {usersQuery.isError ? (
        <Alert
          severity="error"
          sx={{
            mt: 1,
          }}
        >
          Unable to load eligible Chaperone accounts.
        </Alert>
      ) : null}

      {mutation.isError ? (
        <Alert
          severity="error"
          sx={{
            mt: 1,
          }}
        >
          {mutation.error instanceof Error
            ? mutation.error.message
            : "Chaperone assignment could not be changed."}
        </Alert>
      ) : null}
    </Box>
  );
}
