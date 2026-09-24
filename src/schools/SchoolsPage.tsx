import { useState } from "react";

import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Paper,
  Snackbar,
  Typography,
} from "@mui/material";

import {
  AddRounded,
  ApartmentRounded,
  BadgeRounded,
  EditRounded,
  LanguageRounded,
  LocationOnRounded,
  SchoolRounded,
} from "@mui/icons-material";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  FRONTEND_PERMISSIONS,
  hasFrontendPermission,
} from "../auth/frontend-permissions";

import { useAuth } from "../auth/AuthProvider";

import {
  createSchool,
  listSchools,
  updateSchool,
  type CreateSchoolInput,
  type School,
  type UpdateSchoolInput,
} from "./schools.api";

import { SchoolFormDialog, type SchoolFormValues } from "./SchoolFormDialog";

import { SchoolProfileDialog } from "./SchoolProfileDialog";

function errorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "The operation could not be completed.";
}

export function SchoolsPage() {
  const { tenant, permissions } = useAuth();

  const queryClient = useQueryClient();

  const tenantId = tenant?.tenantId;

  const canRead = hasFrontendPermission(
    permissions,

    FRONTEND_PERMISSIONS.SCHOOLS_READ,
  );

  const canCreate = hasFrontendPermission(
    permissions,

    FRONTEND_PERMISSIONS.SCHOOLS_CREATE,
  );

  const canUpdate = hasFrontendPermission(
    permissions,

    FRONTEND_PERMISSIONS.SCHOOLS_UPDATE,
  );

  const [formOpen, setFormOpen] = useState(false);

  const [editTarget, setEditTarget] = useState<School | null>(null);

  const [profileTarget, setProfileTarget] = useState<School | null>(null);

  const [mutationError, setMutationError] = useState<string | null>(null);

  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const schoolsQuery = useQuery({
    queryKey: ["schools", tenantId],

    enabled: Boolean(tenantId && canRead),

    queryFn: async () => {
      if (!tenantId) {
        throw new Error("No active tenant");
      }

      return listSchools(tenantId);
    },
  });

  const createMutation = useMutation({
    mutationFn: async (input: CreateSchoolInput) => {
      if (!tenantId) {
        throw new Error("No active tenant");
      }

      return createSchool(tenantId, input);
    },

    onSuccess: async (school) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["schools"],
        }),

        queryClient.invalidateQueries({
          queryKey: ["operations-dashboard"],
        }),
      ]);

      setMutationError(null);

      setFormOpen(false);

      setSuccessMessage(`${school.name} added successfully.`);
    },

    onError: (error) => {
      setMutationError(errorMessage(error));
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (input: UpdateSchoolInput) => {
      if (!tenantId || !editTarget) {
        throw new Error("School context is unavailable");
      }

      return updateSchool(tenantId, editTarget.id, input);
    },

    onSuccess: async (school) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["schools"],
        }),

        queryClient.invalidateQueries({
          queryKey: ["auth-schools"],
        }),
      ]);

      setMutationError(null);

      setFormOpen(false);

      setEditTarget(null);

      setSuccessMessage(`${school.name} updated successfully.`);
    },

    onError: (error) => {
      setMutationError(errorMessage(error));
    },
  });

  async function submitSchool(input: SchoolFormValues): Promise<void> {
    setMutationError(null);

    if (editTarget) {
      await updateMutation.mutateAsync(input);
      return;
    }

    const createInput: CreateSchoolInput = {
      name: input.name,

      shortName: input.shortName ?? undefined,

      code: input.code,

      timezone: input.timezone,

      address: input.address ?? undefined,
    };

    await createMutation.mutateAsync(createInput);
  }

  if (!canRead) {
    return (
      <Alert severity="warning">
        You do not have permission to view organisation schools.
      </Alert>
    );
  }

  return (
    <Box>
      {/* ==================================================
          HEADER
          ================================================== */}

      <Box
        sx={{
          mb: 3,

          display: "flex",

          flexDirection: {
            xs: "column",

            md: "row",
          },

          alignItems: {
            xs: "flex-start",

            md: "flex-end",
          },

          justifyContent: "space-between",

          gap: 2,
        }}
      >
        <Box>
          <Typography
            sx={{
              color: "primary.dark",

              fontSize: 10,

              fontWeight: 850,

              textTransform: "uppercase",

              letterSpacing: "0.14em",
            }}
          >
            Organisation
          </Typography>

          <Typography
            component="h1"

            sx={{
              mt: 0.7,

              fontSize: {
                xs: 30,

                md: 38,
              },

              fontWeight: 900,

              letterSpacing: "-0.04em",
            }}
          >
            Schools
          </Typography>

          <Typography
            sx={{
              mt: 0.7,

              maxWidth: 650,

              color: "text.secondary",

              fontSize: 13,

              lineHeight: 1.6,
            }}
          >
            Manage the schools and campuses operating under this organisation.
          </Typography>
        </Box>

        <Box
          sx={{
            display: "flex",

            gap: 1,

            alignItems: "center",

            flexWrap: "wrap",
          }}
        >
          <Chip
            icon={<SchoolRounded />}

            label={`${schoolsQuery.data?.length ?? 0} active`}

            sx={{
              color: "primary.main",

              bgcolor: "rgba(201,165,92,0.10)",

              border: "1px solid",

              borderColor: "rgba(201,165,92,0.22)",
            }}
          />

          {canCreate ? (
            <Button
              variant="contained"

              startIcon={<AddRounded />}

              onClick={() => {
                setMutationError(null);

                setEditTarget(null);

                setFormOpen(true);
              }}
            >
              Add school
            </Button>
          ) : null}
        </Box>
      </Box>

      {/* ==================================================
          MULTI-SCHOOL EXPLANATION
          ================================================== */}

      <Paper
        elevation={0}

        sx={{
          mb: 2.5,

          p: 2.5,

          display: "flex",

          flexDirection: {
            xs: "column",

            sm: "row",
          },

          gap: 2,

          alignItems: {
            sm: "center",
          },

          border: "1px solid",

          borderColor: "divider",

          background:
            "linear-gradient(120deg, rgba(201,165,92,0.08), transparent 70%)",
        }}
      >
        <Box
          sx={{
            width: 48,

            height: 48,

            flexShrink: 0,

            display: "grid",

            placeItems: "center",

            borderRadius: 2,

            color: "primary.main",

            bgcolor: "rgba(201,165,92,0.12)",
          }}
        >
          <ApartmentRounded />
        </Box>

        <Box>
          <Typography
            sx={{
              fontSize: 14,

              fontWeight: 850,
            }}
          >
            One organisation can operate multiple schools.
          </Typography>

          <Typography
            sx={{
              mt: 0.4,

              color: "text.secondary",

              fontSize: 11.5,

              lineHeight: 1.65,
            }}
          >
            Schools share the same tenant account while transport records remain
            protected by the platform&apos;s tenant security boundary.
          </Typography>
        </Box>
      </Paper>

      {/* ==================================================
          LOADING / ERROR
          ================================================== */}

      {schoolsQuery.isLoading ? (
        <Box
          sx={{
            py: 8,

            display: "grid",

            placeItems: "center",
          }}
        >
          <CircularProgress size={34} />
        </Box>
      ) : null}

      {schoolsQuery.isError ? (
        <Alert
          severity="error"

          sx={{
            mb: 2,
          }}
        >
          {errorMessage(schoolsQuery.error)}
        </Alert>
      ) : null}

      {/* ==================================================
          SCHOOL CARDS
          ================================================== */}

      {!schoolsQuery.isLoading && !schoolsQuery.isError ? (
        <>
          {(schoolsQuery.data ?? []).length === 0 ? (
            <Paper
              elevation={0}

              sx={{
                py: 8,

                px: 3,

                textAlign: "center",

                border: "1px dashed",

                borderColor: "divider",
              }}
            >
              <SchoolRounded
                sx={{
                  fontSize: 48,

                  color: "text.disabled",
                }}
              />

              <Typography
                sx={{
                  mt: 2,

                  fontSize: 16,

                  fontWeight: 850,
                }}
              >
                No active schools
              </Typography>

              <Typography
                sx={{
                  mt: 0.75,

                  color: "text.secondary",

                  fontSize: 12,
                }}
              >
                Add the first school or campus for this organisation.
              </Typography>

              {canCreate ? (
                <Button
                  sx={{
                    mt: 3,
                  }}

                  variant="contained"

                  startIcon={<AddRounded />}

                  onClick={() => setFormOpen(true)}
                >
                  Add school
                </Button>
              ) : null}
            </Paper>
          ) : (
            <Box
              sx={{
                display: "grid",

                gridTemplateColumns: {
                  xs: "1fr",

                  lg: "repeat(2, minmax(0,1fr))",
                },

                gap: 2,
              }}
            >
              {(schoolsQuery.data ?? []).map((school) => (
                <Paper
                  key={school.id}

                  elevation={0}

                  sx={{
                    p: 3,

                    position: "relative",

                    overflow: "hidden",

                    border: "1px solid",

                    borderColor: "divider",

                    "&::before": {
                      content: '""',

                      position: "absolute",

                      top: 0,

                      left: 0,

                      width: "100%",

                      height: 3,

                      background:
                        "linear-gradient(90deg, #C9A55C, transparent 78%)",
                    },
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",

                      alignItems: "flex-start",

                      justifyContent: "space-between",

                      gap: 2,
                    }}
                  >
                    <Box
                      sx={{
                        display: "flex",

                        gap: 1.5,
                      }}
                    >
                      <Box
                        sx={{
                          width: 46,

                          height: 46,

                          flexShrink: 0,

                          display: "grid",

                          placeItems: "center",

                          borderRadius: 2,

                          color: "primary.main",

                          bgcolor: "rgba(201,165,92,0.10)",
                        }}
                      >
                        <SchoolRounded />
                      </Box>

                      <Box>
                        <Typography
                          sx={{
                            fontSize: 15,

                            fontWeight: 900,
                          }}
                        >
                          {school.name}
                        </Typography>

                        <Typography
                          sx={{
                            mt: 0.3,

                            color: "text.secondary",

                            fontSize: 10.5,

                            fontWeight: 700,
                          }}
                        >
                          School code {school.code}
                        </Typography>
                      </Box>
                    </Box>

                    <Chip
                      size="small"

                      label="Active"

                      sx={{
                        color: "success.main",

                        bgcolor: "rgba(16,185,129,0.08)",

                        fontWeight: 750,
                      }}
                    />
                  </Box>

                  <Box
                    sx={{
                      mt: 3,

                      display: "grid",

                      gap: 1.25,
                    }}
                  >
                    <Box
                      sx={{
                        display: "flex",

                        alignItems: "center",

                        gap: 1,
                      }}
                    >
                      <LanguageRounded
                        sx={{
                          fontSize: 18,

                          color: "text.disabled",
                        }}
                      />

                      <Typography
                        sx={{
                          color: "text.secondary",

                          fontSize: 11.5,
                        }}
                      >
                        {school.timezone}
                      </Typography>
                    </Box>

                    <Box
                      sx={{
                        display: "flex",

                        alignItems: "flex-start",

                        gap: 1,
                      }}
                    >
                      <LocationOnRounded
                        sx={{
                          mt: 0.05,

                          fontSize: 18,

                          color: "text.disabled",
                        }}
                      />

                      <Typography
                        sx={{
                          color: "text.secondary",

                          fontSize: 11.5,

                          lineHeight: 1.6,
                        }}
                      >
                        {school.address ?? "Address not yet configured"}
                      </Typography>
                    </Box>
                  </Box>

                  <Box
                    sx={{
                      mt: 2.5,

                      pt: 2,

                      borderTop: "1px solid",

                      borderColor: "divider",
                    }}
                  >
                    <Typography
                      sx={{
                        color: "text.secondary",

                        fontSize: 9.5,

                        fontWeight: 850,

                        textTransform: "uppercase",

                        letterSpacing: "0.08em",
                      }}
                    >
                      School profile & onboarding
                    </Typography>

                    <Typography
                      sx={{
                        mt: 0.6,

                        color: "text.secondary",

                        fontSize: 10.5,

                        lineHeight: 1.6,
                      }}
                    >
                      Location • address • GPS coordinates • contacts •
                      transport contact • emergency contact • motto • vision •
                      about
                    </Typography>

                    <Box
                      sx={{
                        mt: 1.5,

                        display: "flex",

                        gap: 1,

                        flexWrap: "wrap",
                      }}
                    >
                      <Button
                        size="small"

                        variant="outlined"

                        startIcon={<BadgeRounded />}

                        onClick={() => setProfileTarget(school)}
                      >
                        Profile & contacts
                      </Button>

                      {canUpdate ? (
                        <Button
                          size="small"

                          variant="text"

                          startIcon={<EditRounded />}

                          onClick={() => {
                            setMutationError(null);

                            setEditTarget(school);

                            setFormOpen(true);
                          }}
                        >
                          Edit school details
                        </Button>
                      ) : null}
                    </Box>
                  </Box>
                </Paper>
              ))}
            </Box>
          )}
        </>
      ) : null}

      {/* ==================================================
          CREATE DIALOG
          ================================================== */}

      {formOpen ? (
        <SchoolFormDialog
          key={editTarget?.id ?? "create-school"}

          open

          school={editTarget}

          saving={createMutation.isPending || updateMutation.isPending}

          error={mutationError}

          onClose={() => {
            if (createMutation.isPending || updateMutation.isPending) {
              return;
            }

            setMutationError(null);

            setEditTarget(null);

            setFormOpen(false);
          }}

          onSubmit={submitSchool}
        />
      ) : null}

      {tenantId && profileTarget ? (
        <SchoolProfileDialog
          open
          tenantId={tenantId}
          school={profileTarget}
          canUpdate={canUpdate}
          onClose={() => setProfileTarget(null)}
          onSaved={() =>
            setSuccessMessage(
              `${profileTarget.name} profile updated successfully.`,
            )
          }
        />
      ) : null}

      <Snackbar
        open={Boolean(successMessage)}

        autoHideDuration={4000}

        onClose={() => setSuccessMessage(null)}

        message={successMessage}
      />
    </Box>
  );
}
