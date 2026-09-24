import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  LinearProgress,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";

import {
  CloseRounded,
  FactCheckRounded,
  SchoolRounded,
} from "@mui/icons-material";

import { useQuery } from "@tanstack/react-query";

import { useState } from "react";

import { SchoolSetupReviewPanel } from "./SchoolSetupReviewPanel";

import { TenantOnboardingPanel } from "./TenantOnboardingPanel";

import {
  listPlatformOnboardingQueue,
  listPlatformTenants,
  type PlatformOnboardingQueueItem,
  type PlatformTenantListItem,
} from "./platform.api";

type OnboardingView = "applications" | "workflow";

type QueueFilter =
  "all" | "pending_review" | "in_onboarding" | "ready_to_launch" | "rejected";

function filterLabel(filter: QueueFilter): string {
  switch (filter) {
    case "pending_review":
      return "Needs review";

    case "in_onboarding":
      return "In onboarding";

    case "ready_to_launch":
      return "Ready to launch";

    case "rejected":
      return "Rejected";

    default:
      return "All active";
  }
}

function matchesFilter(
  item: PlatformOnboardingQueueItem,
  filter: QueueFilter,
): boolean {
  if (filter === "pending_review") {
    return item.approvalStatus === "pending_review";
  }

  if (filter === "rejected") {
    return item.approvalStatus === "rejected";
  }

  if (filter === "ready_to_launch") {
    return (
      item.approvalStatus === "approved" &&
      item.currentStage === "ready_to_launch"
    );
  }

  if (filter === "in_onboarding") {
    return (
      item.approvalStatus === "approved" &&
      item.currentStage !== "live" &&
      item.currentStage !== "ready_to_launch"
    );
  }

  return item.currentStage !== "live";
}

export function OnboardingWorkspace() {
  const [view, setView] = useState<OnboardingView>("applications");

  const [filter, setFilter] = useState<QueueFilter>("all");

  const [selectedTenant, setSelectedTenant] =
    useState<PlatformTenantListItem | null>(null);

  const queueQuery = useQuery({
    queryKey: ["platform", "onboarding", "queue"],

    queryFn: listPlatformOnboardingQueue,
  });

  const tenantsQuery = useQuery({
    queryKey: ["platform", "tenants"],

    queryFn: listPlatformTenants,
  });

  if (queueQuery.isLoading || tenantsQuery.isLoading) {
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

  if (queueQuery.isError || tenantsQuery.isError) {
    const error = queueQuery.error ?? tenantsQuery.error;

    return (
      <Alert severity="error">
        {error instanceof Error
          ? error.message
          : "Unable to load onboarding queue"}
      </Alert>
    );
  }

  const queue = queueQuery.data?.items ?? [];

  const tenants = tenantsQuery.data ?? [];

  const filtered = queue.filter((item) => matchesFilter(item, filter));

  const filters: QueueFilter[] = [
    "all",
    "pending_review",
    "in_onboarding",
    "ready_to_launch",
    "rejected",
  ];

  function openTenant(item: PlatformOnboardingQueueItem): void {
    const tenant = tenants.find((candidate) => candidate.id === item.tenantId);

    if (tenant) {
      setSelectedTenant(tenant);
    }
  }

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
            School onboarding
          </Typography>

          <Typography
            sx={{
              mt: 0.4,

              maxWidth: 700,

              color: "text.secondary",

              fontSize: 11,

              lineHeight: 1.6,
            }}
          >
            Review applications and move schools through verified setup,
            commercial configuration and launch.
          </Typography>
        </Box>

        <FactCheckRounded color="primary" />
      </Box>

      <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap" }}>
        <Button
          variant={view === "applications" ? "contained" : "outlined"}
          onClick={() => setView("applications")}
          sx={{ textTransform: "none", fontWeight: 800 }}
        >
          School applications
        </Button>

        <Button
          variant={view === "workflow" ? "contained" : "outlined"}
          onClick={() => setView("workflow")}
          sx={{ textTransform: "none", fontWeight: 800 }}
        >
          15-step onboarding
        </Button>
      </Stack>

      {view === "applications" ? <SchoolSetupReviewPanel /> : null}

      <Stack
        direction="row"
        spacing={1}
        useFlexGap
        sx={{
          display: view === "workflow" ? "flex" : "none",
          flexWrap: "wrap",
        }}
      >
        {filters.map((candidate) => {
          const count = queue.filter((item) =>
            matchesFilter(item, candidate),
          ).length;

          return (
            <Button
              key={candidate}
              variant={filter === candidate ? "contained" : "outlined"}
              onClick={() => setFilter(candidate)}
              sx={{
                minHeight: 40,

                px: 2,

                borderRadius: 1.75,

                textTransform: "none",

                fontWeight: 800,
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

      {view === "workflow" ? (
        filtered.length === 0 ? (
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
              No schools in this queue
            </Typography>

            <Typography
              sx={{
                mt: 0.5,

                color: "text.secondary",

                fontSize: 11,
              }}
            >
              There are currently no onboarding records matching this filter.
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

                  <TableCell>Approval</TableCell>

                  <TableCell>Stage</TableCell>

                  <TableCell>Required progress</TableCell>

                  <TableCell align="right">Workflow</TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {filtered.map((item) => {
                  const percent =
                    item.requiredSteps > 0
                      ? Math.round(
                          (item.completedRequiredSteps / item.requiredSteps) *
                            100,
                        )
                      : 0;

                  return (
                    <TableRow key={item.tenantId} hover>
                      <TableCell>
                        <Typography
                          sx={{
                            fontSize: 12,

                            fontWeight: 800,
                          }}
                        >
                          {item.tenantName}
                        </Typography>

                        <Typography
                          sx={{
                            mt: 0.2,

                            color: "text.secondary",

                            fontSize: 9.5,
                          }}
                        >
                          {item.tenantSlug}
                        </Typography>
                      </TableCell>

                      <TableCell>
                        <Chip
                          size="small"
                          label={item.approvalStatus.replaceAll("_", " ")}
                          color={
                            item.approvalStatus === "approved"
                              ? "success"
                              : item.approvalStatus === "rejected"
                                ? "error"
                                : "warning"
                          }
                          variant="outlined"
                        />
                      </TableCell>

                      <TableCell>
                        <Chip
                          size="small"
                          label={item.currentStage.replaceAll("_", " ")}
                          variant="outlined"
                        />
                      </TableCell>

                      <TableCell>
                        <Box
                          sx={{
                            minWidth: 160,
                          }}
                        >
                          <Typography
                            sx={{
                              mb: 0.5,

                              color: "text.secondary",

                              fontSize: 9,
                            }}
                          >
                            {item.completedRequiredSteps}
                            {" / "}
                            {item.requiredSteps}
                          </Typography>

                          <LinearProgress
                            variant="determinate"
                            value={percent}
                            sx={{
                              height: 6,

                              borderRadius: 999,
                            }}
                          />
                        </Box>
                      </TableCell>

                      <TableCell align="right">
                        <Button
                          variant="contained"
                          onClick={() => openTenant(item)}
                          sx={{
                            minHeight: 40,

                            px: 2,

                            borderRadius: 1.75,

                            textTransform: "none",

                            fontWeight: 800,
                          }}
                        >
                          Open onboarding
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )
      ) : null}

      <Dialog
        open={selectedTenant !== null}
        onClose={() => setSelectedTenant(null)}
        fullWidth
        maxWidth={false}
        slotProps={{
          backdrop: {
            sx: {
              backgroundColor: "rgba(15, 23, 42, 0.50)",

              backdropFilter: "blur(10px)",
            },
          },
        }}
        sx={{
          "& .MuiDialog-paper": {
            width: {
              xs: "96vw",
              md: "92vw",
            },

            maxWidth: "92vw",

            height: {
              xs: "94vh",
              md: "90vh",
            },

            maxHeight: "94vh",

            m: 1,

            overflow: "hidden",

            borderRadius: 3,

            border: "1px solid rgba(148, 163, 184, 0.22)",

            background:
              "linear-gradient(145deg, rgba(12, 19, 36, 0.93), rgba(7, 12, 25, 0.88))",

            backdropFilter: "blur(24px) saturate(140%)",
            WebkitBackdropFilter: "blur(24px) saturate(140%)",

            boxShadow: "0 34px 100px rgba(0, 0, 0, 0.52)",
          },
        }}
      >
        {selectedTenant ? (
          <>
            <DialogTitle
              sx={{
                flexShrink: 0,

                px: {
                  xs: 1.5,
                  md: 2.5,
                },

                py: 1.5,

                borderBottom: "1px solid",

                borderColor: "divider",
              }}
            >
              <Box
                sx={{
                  display: "grid",

                  gridTemplateColumns: "48px minmax(0, 1fr) 48px",

                  gap: 1,

                  alignItems: "center",
                }}
              >
                <Box
                  sx={{
                    width: 40,
                    height: 40,

                    display: "grid",

                    placeItems: "center",

                    borderRadius: 2,

                    bgcolor: "action.hover",

                    color: "primary.main",
                  }}
                >
                  <SchoolRounded />
                </Box>

                <Box
                  sx={{
                    minWidth: 0,

                    textAlign: "center",
                  }}
                >
                  <Typography
                    sx={{
                      color: "primary.main",

                      fontSize: 9,

                      fontWeight: 900,

                      textTransform: "uppercase",

                      letterSpacing: "0.12em",
                    }}
                  >
                    School onboarding
                  </Typography>

                  <Typography
                    sx={{
                      mt: 0.15,

                      fontSize: {
                        xs: 18,
                        md: 23,
                      },

                      fontWeight: 950,

                      letterSpacing: "-0.025em",

                      lineHeight: 1.2,
                    }}
                  >
                    {selectedTenant.name}
                  </Typography>

                  <Stack
                    direction="row"
                    spacing={0.75}
                    useFlexGap
                    sx={{
                      mt: 0.6,

                      justifyContent: "center",

                      flexWrap: "wrap",
                    }}
                  >
                    <Chip
                      size="small"
                      label={selectedTenant.slug}
                      variant="outlined"
                    />

                    <Chip
                      size="small"
                      label={selectedTenant.timezone}
                      variant="outlined"
                    />
                  </Stack>
                </Box>

                <IconButton
                  aria-label="Close onboarding"
                  onClick={() => setSelectedTenant(null)}
                  sx={{
                    width: 42,
                    height: 42,

                    justifySelf: "end",

                    border: "1px solid",

                    borderColor: "divider",
                  }}
                >
                  <CloseRounded />
                </IconButton>
              </Box>
            </DialogTitle>

            <DialogContent
              dividers
              sx={{
                p: 0,

                minHeight: 0,

                overflow: "hidden",

                display: "flex",
              }}
            >
              <Box
                sx={{
                  width: "100%",

                  minHeight: 0,
                }}
              >
                <TenantOnboardingPanel
                  tenant={selectedTenant}
                  onTenantUpdated={(updatedTenant) =>
                    setSelectedTenant(updatedTenant)
                  }
                />
              </Box>
            </DialogContent>
          </>
        ) : null}
      </Dialog>
    </Stack>
  );
}
