import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";

import { TuneRounded } from "@mui/icons-material";

import { useQuery } from "@tanstack/react-query";

import { useState } from "react";

import {
  listPlatformTenants,
  type PlatformTenantListItem,
} from "./platform.api";

type SchoolFilter = "all" | "live" | "trial" | "paused" | "deactivated";

interface SchoolsWorkspaceProps {
  selectedTenantId: string | null;

  onSelectTenant: (tenant: PlatformTenantListItem) => void;

  onManageTenant: (tenant: PlatformTenantListItem) => void;
}

function isDeactivated(tenant: PlatformTenantListItem): boolean {
  return tenant.status.toLowerCase() !== "active";
}

function matchesFilter(
  tenant: PlatformTenantListItem,
  filter: SchoolFilter,
): boolean {
  if (filter === "deactivated") {
    return isDeactivated(tenant);
  }

  if (isDeactivated(tenant)) {
    return filter === "all";
  }

  if (filter === "live") {
    return (
      tenant.subscriptionStatus === "active" && tenant.subscriptionEffective
    );
  }

  if (filter === "trial") {
    return (
      tenant.subscriptionStatus === "trialing" && tenant.subscriptionEffective
    );
  }

  if (filter === "paused") {
    return (
      tenant.subscriptionStatus === "cancelled" ||
      tenant.subscriptionStatus === "expired"
    );
  }

  return true;
}

function lifecycleLabel(tenant: PlatformTenantListItem): string {
  if (isDeactivated(tenant)) {
    return "Deactivated";
  }

  if (
    tenant.subscriptionStatus === "trialing" &&
    tenant.subscriptionEffective
  ) {
    return "Trial";
  }

  if (tenant.subscriptionStatus === "active" && tenant.subscriptionEffective) {
    return "Live";
  }

  if (tenant.subscriptionStatus === "cancelled") {
    return "Paused";
  }

  if (tenant.subscriptionStatus === "expired") {
    return "Expired";
  }

  if (
    tenant.subscriptionStatus === "active" ||
    tenant.subscriptionStatus === "trialing"
  ) {
    return "Configured";
  }

  return "Setup";
}

function lifecycleColor(
  tenant: PlatformTenantListItem,
): "default" | "success" | "warning" | "error" | "info" {
  const label = lifecycleLabel(tenant);

  switch (label) {
    case "Live":
      return "success";

    case "Trial":
      return "info";

    case "Paused":
    case "Expired":
      return "warning";

    case "Deactivated":
      return "error";

    default:
      return "default";
  }
}

function formatDate(value: string | null): string {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-KE", {
    dateStyle: "medium",

    timeZone: "Africa/Nairobi",
  }).format(new Date(value));
}

function filterLabel(filter: SchoolFilter): string {
  switch (filter) {
    case "live":
      return "Live";

    case "trial":
      return "Trial";

    case "paused":
      return "Paused / expired";

    case "deactivated":
      return "Deactivated";

    default:
      return "All schools";
  }
}

export function SchoolsWorkspace({
  selectedTenantId,
  onSelectTenant,
  onManageTenant,
}: SchoolsWorkspaceProps) {
  const [filter, setFilter] = useState<SchoolFilter>("all");

  const [search, setSearch] = useState("");

  const tenantsQuery = useQuery({
    queryKey: ["platform", "tenants"],

    queryFn: listPlatformTenants,
  });

  if (tenantsQuery.isLoading) {
    return (
      <Box
        sx={{
          minHeight: 320,

          display: "grid",

          placeItems: "center",
        }}
      >
        <CircularProgress size={28} />
      </Box>
    );
  }

  if (tenantsQuery.isError) {
    return (
      <Alert severity="error">
        {tenantsQuery.error instanceof Error
          ? tenantsQuery.error.message
          : "Unable to load schools"}
      </Alert>
    );
  }

  const tenants = tenantsQuery.data ?? [];

  const normalizedSearch = search.trim().toLowerCase();

  const filtered = tenants.filter((tenant) => {
    if (!matchesFilter(tenant, filter)) {
      return false;
    }

    if (!normalizedSearch) {
      return true;
    }

    return (
      tenant.name.toLowerCase().includes(normalizedSearch) ||
      tenant.slug.toLowerCase().includes(normalizedSearch) ||
      tenant.planName?.toLowerCase().includes(normalizedSearch) === true
    );
  });

  const filters: SchoolFilter[] = [
    "all",
    "live",
    "trial",
    "paused",
    "deactivated",
  ];

  return (
    <Stack spacing={2.5}>
      <Box
        sx={{
          display: "flex",

          alignItems: {
            xs: "flex-start",

            md: "center",
          },

          justifyContent: "space-between",

          gap: 2,

          flexDirection: {
            xs: "column",

            md: "row",
          },
        }}
      >
        <Box>
          <Typography
            sx={{
              fontSize: 18,

              fontWeight: 900,
            }}
          >
            Schools
          </Typography>

          <Typography
            sx={{
              mt: 0.4,

              color: "text.secondary",

              fontSize: 11,

              lineHeight: 1.6,
            }}
          >
            Manage live customers, trials, paused subscriptions and deactivated
            school accounts.
          </Typography>
        </Box>
      </Box>

      <Stack
        direction="row"
        spacing={1}
        useFlexGap
        sx={{
          flexWrap: "wrap",
        }}
      >
        {filters.map((candidate) => {
          const count = tenants.filter((tenant) =>
            matchesFilter(tenant, candidate),
          ).length;

          return (
            <Button
              key={candidate}
              size="small"
              variant={filter === candidate ? "contained" : "outlined"}
              onClick={() => setFilter(candidate)}
              sx={{
                textTransform: "none",
              }}
            >
              {filterLabel(candidate)}
              {" ("}
              {count}
              {")"}
            </Button>
          );
        })}
      </Stack>

      <TextField
        size="small"
        label="Search schools"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="School name, slug or package"
        fullWidth
      />

      {filtered.length === 0 ? (
        <Paper
          variant="outlined"
          sx={{
            p: 4,

            textAlign: "center",

            borderRadius: 2,
          }}
        >
          <Typography
            sx={{
              fontSize: 13,

              fontWeight: 800,
            }}
          >
            No schools found
          </Typography>

          <Typography
            sx={{
              mt: 0.5,

              color: "text.secondary",

              fontSize: 11,
            }}
          >
            Adjust the lifecycle filter or search term.
          </Typography>
        </Paper>
      ) : (
        <TableContainer
          component={Paper}
          variant="outlined"
          sx={{
            borderRadius: 2,
          }}
        >
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>School</TableCell>

                <TableCell>Lifecycle</TableCell>

                <TableCell>Package</TableCell>

                <TableCell>Subscription ends</TableCell>

                <TableCell>Timezone</TableCell>

                <TableCell align="right">Manage</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {filtered.map((tenant) => (
                <TableRow
                  key={tenant.id}
                  hover
                  selected={tenant.id === selectedTenantId}
                  onClick={() => onSelectTenant(tenant)}
                  sx={{
                    cursor: "pointer",
                  }}
                >
                  <TableCell>
                    <Typography
                      sx={{
                        fontSize: 12,

                        fontWeight: 800,
                      }}
                    >
                      {tenant.name}
                    </Typography>

                    <Typography
                      sx={{
                        mt: 0.2,

                        color: "text.secondary",

                        fontSize: 9.5,
                      }}
                    >
                      {tenant.slug}
                    </Typography>
                  </TableCell>

                  <TableCell>
                    <Chip
                      size="small"
                      label={lifecycleLabel(tenant)}
                      color={lifecycleColor(tenant)}
                      variant="outlined"
                    />
                  </TableCell>

                  <TableCell>
                    <Typography
                      sx={{
                        fontSize: 11,

                        fontWeight: 700,
                      }}
                    >
                      {tenant.planName ?? "No plan"}
                    </Typography>
                  </TableCell>

                  <TableCell>
                    <Typography
                      sx={{
                        fontSize: 10.5,

                        color: "text.secondary",
                      }}
                    >
                      {formatDate(tenant.subscriptionEndsAt)}
                    </Typography>
                  </TableCell>

                  <TableCell>
                    <Typography
                      sx={{
                        fontSize: 10.5,

                        color: "text.secondary",
                      }}
                    >
                      {tenant.timezone}
                    </Typography>
                  </TableCell>

                  <TableCell align="right">
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<TuneRounded fontSize="small" />}
                      onClick={(event) => {
                        event.stopPropagation();

                        onSelectTenant(tenant);

                        onManageTenant(tenant);
                      }}
                      sx={{
                        textTransform: "none",

                        whiteSpace: "nowrap",
                      }}
                    >
                      Manage school
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Stack>
  );
}
