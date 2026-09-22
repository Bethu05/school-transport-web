import { useState } from "react";

import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";

import { AddRounded, TuneRounded } from "@mui/icons-material";

import { useQuery } from "@tanstack/react-query";

import { CreateTenantDialog } from "./CreateTenantDialog";

import {
  listPlatformTenants,
  type PlatformTenantListItem,
} from "./platform.api";

function formatDate(value: string | null): string {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-KE", {
    dateStyle: "medium",

    timeZone: "Africa/Nairobi",
  }).format(new Date(value));
}

function subscriptionLabel(tenant: PlatformTenantListItem): string {
  if (!tenant.subscriptionStatus) {
    return "None";
  }

  switch (tenant.subscriptionStatus) {
    case "trialing":
      return "Trial";

    case "cancelled":
      return "Paused";

    case "expired":
      return "Expired";

    case "active":
      return "Active";
  }
}

interface TenantsPanelProps {
  selectedTenantId: string | null;

  onSelectTenant: (tenant: PlatformTenantListItem) => void;

  onManageTenant: (tenant: PlatformTenantListItem) => void;
}

export function TenantsPanel({
  selectedTenantId,
  onSelectTenant,
  onManageTenant,
}: TenantsPanelProps) {
  const [createOpen, setCreateOpen] = useState(false);

  const tenantsQuery = useQuery({
    queryKey: ["platform", "tenants"],

    queryFn: listPlatformTenants,
  });

  if (tenantsQuery.isLoading) {
    return (
      <Box
        sx={{
          minHeight: 300,

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
          : "Unable to load tenants"}
      </Alert>
    );
  }

  const tenants = tenantsQuery.data ?? [];

  return (
    <Box>
      <Box
        sx={{
          display: "flex",

          alignItems: {
            xs: "flex-start",

            sm: "center",
          },

          justifyContent: "space-between",

          gap: 2,

          flexDirection: {
            xs: "column",

            sm: "row",
          },
        }}
      >
        <Box>
          <Typography
            sx={{
              fontSize: 17,

              fontWeight: 800,
            }}
          >
            School tenants
          </Typography>

          <Typography
            sx={{
              mt: 0.5,

              color: "text.secondary",

              fontSize: 12,
            }}
          >
            Organisations currently registered on the platform.
          </Typography>
        </Box>

        <Box
          sx={{
            display: "flex",

            alignItems: "center",

            gap: 1,
          }}
        >
          <Chip
            size="small"
            label={`${tenants.length} ${
              tenants.length === 1 ? "tenant" : "tenants"
            }`}
          />

          <Button
            size="small"
            variant="contained"
            startIcon={<AddRounded />}
            onClick={() => setCreateOpen(true)}
          >
            Add tenant
          </Button>
        </Box>
      </Box>

      {tenants.length === 0 ? (
        <Box
          sx={{
            py: 8,

            textAlign: "center",
          }}
        >
          <Typography
            sx={{
              fontWeight: 700,
            }}
          >
            No tenants found
          </Typography>

          <Typography
            sx={{
              mt: 0.75,

              color: "text.secondary",

              fontSize: 12,
            }}
          >
            New school organisations will appear here.
          </Typography>
        </Box>
      ) : (
        <TableContainer
          sx={{
            mt: 3,

            border: "1px solid",

            borderColor: "divider",

            borderRadius: 2,
          }}
        >
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Tenant</TableCell>

                <TableCell>Status</TableCell>

                <TableCell>Plan</TableCell>

                <TableCell>Subscription</TableCell>

                <TableCell>Ends</TableCell>

                <TableCell>Timezone</TableCell>

                <TableCell align="right">Manage</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {tenants.map((tenant) => (
                <TableRow
                  key={tenant.id}
                  hover
                  selected={selectedTenantId === tenant.id}
                  onClick={() => onSelectTenant(tenant)}
                  sx={{
                    cursor: "pointer",
                  }}
                >
                  <TableCell>
                    <Typography
                      sx={{
                        fontSize: 13,

                        fontWeight: 700,
                      }}
                    >
                      {tenant.name}
                    </Typography>

                    <Typography
                      sx={{
                        mt: 0.25,

                        color: "text.secondary",

                        fontSize: 10,
                      }}
                    >
                      {tenant.slug}
                    </Typography>
                  </TableCell>

                  <TableCell>
                    <Chip
                      size="small"
                      label={tenant.status}
                      color={tenant.status === "active" ? "success" : "default"}
                      variant="outlined"
                    />
                  </TableCell>

                  <TableCell>
                    <Typography
                      sx={{
                        fontSize: 12,

                        fontWeight: 600,
                      }}
                    >
                      {tenant.planName ?? "No plan"}
                    </Typography>

                    {tenant.planCode ? (
                      <Typography
                        sx={{
                          color: "text.secondary",

                          fontSize: 10,
                        }}
                      >
                        {tenant.planCode}
                      </Typography>
                    ) : null}
                  </TableCell>

                  <TableCell>
                    <Chip
                      size="small"
                      label={subscriptionLabel(tenant)}
                      color={
                        tenant.subscriptionEffective ? "primary" : "default"
                      }
                      variant={
                        tenant.subscriptionEffective ? "filled" : "outlined"
                      }
                    />
                  </TableCell>

                  <TableCell>
                    <Typography
                      sx={{
                        fontSize: 12,
                      }}
                    >
                      {formatDate(tenant.subscriptionEndsAt)}
                    </Typography>
                  </TableCell>

                  <TableCell>
                    <Typography
                      sx={{
                        color: "text.secondary",

                        fontSize: 11,
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
                        whiteSpace: "nowrap",

                        textTransform: "none",

                        fontWeight: 700,
                      }}
                    >
                      Manage tenant
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <CreateTenantDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onTenantCreated={onSelectTenant}
      />
    </Box>
  );
}
