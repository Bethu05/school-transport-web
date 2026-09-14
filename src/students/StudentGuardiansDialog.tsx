import {
  useMemo,
  useState,
} from 'react';

import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  IconButton,
  MenuItem,
  Paper,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';

import {
  AddRounded,
  DeleteOutlineRounded,
  EditRounded,
  FamilyRestroomRounded,
  StarRounded,
} from '@mui/icons-material';

import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import {
  listGuardians,
  type Guardian,
} from '../guardians/guardians.api';

import type {
  Student,
} from './students.api';

import {
  GUARDIAN_RELATIONSHIP_TYPES,
  linkStudentGuardian,
  listStudentGuardians,
  unlinkStudentGuardian,
  updateStudentGuardian,
  type GuardianRelationshipType,
  type LinkStudentGuardianInput,
  type StudentGuardian,
  type UpdateStudentGuardianInput,
} from './student-guardians.api';

interface StudentGuardiansDialogProps {
  open: boolean;

  tenantId:
    | string
    | undefined;

  student:
    | Student
    | null;

  canManage: boolean;

  onClose: () => void;
}

interface RelationshipFormState {
  guardianId: string;

  relationshipType:
    GuardianRelationshipType;

  isPrimary: boolean;

  receiveNotifications: boolean;
}

const EMPTY_RELATIONSHIPS:
  StudentGuardian[] = [];

const EMPTY_GUARDIANS:
  Guardian[] = [];

function errorMessage(
  error: unknown,
): string {
  return error instanceof Error
    ? error.message
    : 'The operation could not be completed.';
}

function relationshipLabel(
  type:
    GuardianRelationshipType,
): string {
  switch (type) {
    case 'mother':
      return 'Mother';

    case 'father':
      return 'Father';

    case 'parent':
      return 'Parent';

    case 'guardian':
      return 'Guardian';

    case 'grandparent':
      return 'Grandparent';

    case 'sibling':
      return 'Sibling';

    case 'relative':
      return 'Relative';

    case 'carer':
      return 'Carer';

    case 'other':
      return 'Other';
  }
}

function guardianLabel(
  guardian: Guardian,
): string {
  const contact =
    guardian.email ??
    guardian.phone;

  return contact
    ? `${guardian.firstName} ${guardian.lastName} — ${contact}`
    : `${guardian.firstName} ${guardian.lastName}`;
}

function relationshipContact(
  relationship:
    StudentGuardian,
): string {
  return (
    relationship.guardianEmail ??
    relationship.guardianPhone ??
    'No contact details'
  );
}

const INITIAL_FORM:
  RelationshipFormState = {
    guardianId: '',

    relationshipType:
      'guardian',

    isPrimary: false,

    receiveNotifications:
      true,
  };

export function StudentGuardiansDialog({
  open,
  tenantId,
  student,
  canManage,
  onClose,
}: StudentGuardiansDialogProps) {
  const queryClient =
    useQueryClient();

  const [
    addOpen,
    setAddOpen,
  ] =
    useState(false);

  const [
    editingRelationship,
    setEditingRelationship,
  ] =
    useState<
      StudentGuardian | null
    >(null);

  const [
    unlinkTarget,
    setUnlinkTarget,
  ] =
    useState<
      StudentGuardian | null
    >(null);

  const [
    form,
    setForm,
  ] =
    useState<
      RelationshipFormState
    >(INITIAL_FORM);

  const [
    formError,
    setFormError,
  ] =
    useState<
      string | null
    >(null);

  const [
    successMessage,
    setSuccessMessage,
  ] =
    useState<
      string | null
    >(null);

  const studentId =
    student?.id;

  const relationshipsQuery =
    useQuery({
      queryKey: [
        'student-guardians',
        tenantId,
        studentId,
      ],

      enabled:
        Boolean(
          open &&
          tenantId &&
          studentId,
        ),

      queryFn:
        async () => {
          if (
            !tenantId ||
            !studentId
          ) {
            throw new Error(
              'Student context is unavailable',
            );
          }

          return listStudentGuardians(
            tenantId,
            studentId,
          );
        },
    });

  /**
   * Load active Guardian master records for the selector.
   *
   * limit=100 follows the platform's supported pagination sizes.
   * We exclude already-linked Guardians below.
   */
  const guardiansQuery =
    useQuery({
      queryKey: [
        'guardians',
        'student-link-selector',
        tenantId,
      ],

      enabled:
        Boolean(
          open &&
          tenantId &&
          canManage,
        ),

      queryFn:
        async () => {
          if (!tenantId) {
            throw new Error(
              'No active tenant',
            );
          }

          return listGuardians(
            tenantId,
            {
              status:
                'active',

              page: 1,

              limit: 100,
            },
          );
        },
    });

  const relationships =
    relationshipsQuery.data ??
    EMPTY_RELATIONSHIPS;

  const guardians =
    guardiansQuery.data
      ?.items ??
    EMPTY_GUARDIANS;

  const linkedGuardianIds =
    useMemo(
      () =>
        new Set(
          relationships.map(
            (
              relationship,
            ) =>
              relationship.guardianId,
          ),
        ),
      [
        relationships,
      ],
    );

  const availableGuardians =
    useMemo(
      () =>
        guardians
          .filter(
            (
              guardian,
            ) =>
              guardian.status ===
                'active' &&
              !linkedGuardianIds.has(
                guardian.id,
              ),
          )
          .sort(
            (
              left,
              right,
            ) =>
              `${left.lastName} ${left.firstName}`.localeCompare(
                `${right.lastName} ${right.firstName}`,
              ),
          ),
      [
        guardians,
        linkedGuardianIds,
      ],
    );

  async function refreshRelationships():
    Promise<void> {
    await Promise.all([
      queryClient.invalidateQueries(
        {
          queryKey: [
            'student-guardians',
          ],
        },
      ),

      queryClient.invalidateQueries(
        {
          queryKey: [
            'guardians',
          ],
        },
      ),
    ]);
  }

  function resetForm():
    void {
    setForm(
      INITIAL_FORM,
    );

    setFormError(
      null,
    );
  }

  function handleClose():
    void {
    setAddOpen(
      false,
    );

    setEditingRelationship(
      null,
    );

    setUnlinkTarget(
      null,
    );

    setSuccessMessage(
      null,
    );

    resetForm();

    onClose();
  }

  function openAdd():
    void {
    resetForm();

    setEditingRelationship(
      null,
    );

    setAddOpen(
      true,
    );
  }

  function openEdit(
    relationship:
      StudentGuardian,
  ): void {
    setFormError(
      null,
    );

    setEditingRelationship(
      relationship,
    );

    setForm({
      guardianId:
        relationship.guardianId,

      relationshipType:
        relationship.relationshipType,

      isPrimary:
        relationship.isPrimary,

      receiveNotifications:
        relationship.receiveNotifications,
    });
  }

  const linkMutation =
    useMutation({
      mutationFn:
        async (
          input:
            LinkStudentGuardianInput,
        ) => {
          if (
            !tenantId ||
            !studentId
          ) {
            throw new Error(
              'Student context is unavailable',
            );
          }

          return linkStudentGuardian(
            tenantId,
            studentId,
            input,
          );
        },

      onSuccess:
        async () => {
          await refreshRelationships();

          setAddOpen(
            false,
          );

          resetForm();

          setSuccessMessage(
            'Guardian linked to student.',
          );
        },

      onError:
        (
          error,
        ) => {
          setFormError(
            errorMessage(
              error,
            ),
          );
        },
    });

  const updateMutation =
    useMutation({
      mutationFn:
        async ({
          guardianId,
          input,
        }: {
          guardianId:
            string;

          input:
            UpdateStudentGuardianInput;
        }) => {
          if (
            !tenantId ||
            !studentId
          ) {
            throw new Error(
              'Student context is unavailable',
            );
          }

          return updateStudentGuardian(
            tenantId,
            studentId,
            guardianId,
            input,
          );
        },

      onSuccess:
        async () => {
          await refreshRelationships();

          setEditingRelationship(
            null,
          );

          resetForm();

          setSuccessMessage(
            'Guardian relationship updated.',
          );
        },

      onError:
        (
          error,
        ) => {
          setFormError(
            errorMessage(
              error,
            ),
          );
        },
    });

  const unlinkMutation =
    useMutation({
      mutationFn:
        async (
          guardianId:
            string,
        ) => {
          if (
            !tenantId ||
            !studentId
          ) {
            throw new Error(
              'Student context is unavailable',
            );
          }

          await unlinkStudentGuardian(
            tenantId,
            studentId,
            guardianId,
          );
        },

      onSuccess:
        async () => {
          await refreshRelationships();

          setUnlinkTarget(
            null,
          );

          setSuccessMessage(
            'Guardian unlinked. The Guardian record has been preserved.',
          );
        },
    });

  function submitAdd():
    void {
    setFormError(
      null,
    );

    if (
      !form.guardianId
    ) {
      setFormError(
        'Select a Guardian.',
      );

      return;
    }

    linkMutation.mutate({
      guardianId:
        form.guardianId,

      relationshipType:
        form.relationshipType,

      isPrimary:
        form.isPrimary,

      receiveNotifications:
        form.receiveNotifications,
    });
  }

  function submitEdit():
    void {
    if (
      !editingRelationship
    ) {
      return;
    }

    setFormError(
      null,
    );

    updateMutation.mutate({
      guardianId:
        editingRelationship.guardianId,

      input: {
        relationshipType:
          form.relationshipType,

        isPrimary:
          form.isPrimary,

        receiveNotifications:
          form.receiveNotifications,
      },
    });
  }

  const saving =
    linkMutation.isPending ||
    updateMutation.isPending;

  return (
    <>
      <Dialog
        open={open}
        onClose={
          saving ||
          unlinkMutation.isPending
            ? undefined
            : handleClose
        }
        fullWidth
        maxWidth="md"
      >
        <DialogTitle
          sx={{
            display:
              'flex',

            alignItems:
              'center',

            gap: 1,
          }}
        >
          <FamilyRestroomRounded />

          Manage Guardians

          {student ? (
            <Typography
              component="span"
              sx={{
                color:
                  'text.secondary',

                fontSize:
                  13,

                ml: 0.5,
              }}
            >
              {student.firstName}{' '}
              {student.lastName}
            </Typography>
          ) : null}
        </DialogTitle>

        <DialogContent>
          {successMessage ? (
            <Alert
              severity="success"
              sx={{
                mb: 2,
              }}
              onClose={() =>
                setSuccessMessage(
                  null,
                )
              }
            >
              {successMessage}
            </Alert>
          ) : null}

          {relationshipsQuery.isError ? (
            <Alert
              severity="error"
              sx={{
                mb: 2,
              }}
            >
              {errorMessage(
                relationshipsQuery.error,
              )}
            </Alert>
          ) : null}

          <Box
            sx={{
              display:
                'flex',

              justifyContent:
                'space-between',

              alignItems:
                'center',

              mb: 2,
            }}
          >
            <Box>
              <Typography
                sx={{
                  fontWeight:
                    800,
                }}
              >
                Family &
                Guardian
                relationships
              </Typography>

              <Typography
                sx={{
                  color:
                    'text.secondary',

                  fontSize:
                    12.5,
                }}
              >
                Link existing
                Guardian records
                without duplicating
                people.
              </Typography>
            </Box>

            {canManage ? (
              <Button
                variant="contained"
                startIcon={
                  <AddRounded />
                }
                onClick={
                  openAdd
                }
                disabled={
                  guardiansQuery.isLoading
                }
              >
                Link Guardian
              </Button>
            ) : null}
          </Box>

          {relationshipsQuery.isLoading ? (
            <Box
              sx={{
                display:
                  'flex',

                justifyContent:
                  'center',

                py: 5,
              }}
            >
              <CircularProgress
                size={30}
              />
            </Box>
          ) : null}

          {!relationshipsQuery.isLoading &&
          relationships.length ===
            0 ? (
            <Paper
              variant="outlined"
              sx={{
                p: 3,

                textAlign:
                  'center',
              }}
            >
              <FamilyRestroomRounded
                sx={{
                  fontSize:
                    36,

                  color:
                    'text.disabled',

                  mb: 1,
                }}
              />

              <Typography
                sx={{
                  fontWeight:
                    750,
                }}
              >
                No Guardians
                linked
              </Typography>

              <Typography
                sx={{
                  color:
                    'text.secondary',

                  fontSize:
                    12.5,

                  mt: 0.5,
                }}
              >
                Link an existing
                active Guardian to
                this Student.
              </Typography>
            </Paper>
          ) : null}

          <Box
            sx={{
              display:
                'grid',

              gap: 1.5,
            }}
          >
            {relationships.map(
              (
                relationship,
              ) => (
                <Paper
                  key={
                    relationship.id
                  }
                  variant="outlined"
                  sx={{
                    p: 2,

                    display:
                      'grid',

                    gridTemplateColumns:
                      {
                        xs:
                          '1fr',

                        sm:
                          '1fr auto',
                      },

                    gap: 2,

                    alignItems:
                      'center',
                  }}
                >
                  <Box>
                    <Box
                      sx={{
                        display:
                          'flex',

                        alignItems:
                          'center',

                        gap: 1,

                        flexWrap:
                          'wrap',
                      }}
                    >
                      <Typography
                        sx={{
                          fontWeight:
                            800,
                        }}
                      >
                        {
                          relationship.guardianFirstName
                        }{' '}
                        {
                          relationship.guardianLastName
                        }
                      </Typography>

                      <Chip
                        size="small"
                        label={relationshipLabel(
                          relationship.relationshipType,
                        )}
                      />

                      {relationship.isPrimary ? (
                        <Chip
                          size="small"
                          icon={
                            <StarRounded />
                          }
                          label="Primary"
                          color="secondary"
                        />
                      ) : null}

                      {relationship.guardianStatus !==
                      'active' ? (
                        <Chip
                          size="small"
                          label="Inactive Guardian"
                        />
                      ) : null}
                    </Box>

                    <Typography
                      sx={{
                        color:
                          'text.secondary',

                        fontSize:
                          12.5,

                        mt: 0.6,
                      }}
                    >
                      {relationshipContact(
                        relationship,
                      )}
                    </Typography>

                    <Typography
                      sx={{
                        color:
                          'text.secondary',

                        fontSize:
                          12,

                        mt: 0.4,
                      }}
                    >
                      Relationship
                      notifications:{' '}
                      {relationship.receiveNotifications
                        ? 'Enabled'
                        : 'Disabled'}
                    </Typography>
                  </Box>

                  {canManage ? (
                    <Box
                      sx={{
                        display:
                          'flex',
                      }}
                    >
                      <Tooltip title="Edit relationship">
                        <IconButton
                          size="small"
                          onClick={() =>
                            openEdit(
                              relationship,
                            )
                          }
                        >
                          <EditRounded
                            fontSize="small"
                          />
                        </IconButton>
                      </Tooltip>

                      <Tooltip title="Unlink Guardian">
                        <IconButton
                          size="small"
                          onClick={() =>
                            setUnlinkTarget(
                              relationship,
                            )
                          }
                        >
                          <DeleteOutlineRounded
                            fontSize="small"
                          />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  ) : null}
                </Paper>
              ),
            )}
          </Box>
        </DialogContent>

        <DialogActions>
          <Button
            onClick={
              handleClose
            }
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* ====================================================
          LINK GUARDIAN
          ==================================================== */}

      <Dialog
        open={addOpen}
        onClose={
          linkMutation.isPending
            ? undefined
            : () =>
                setAddOpen(
                  false,
                )
        }
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          Link Guardian
        </DialogTitle>

        <DialogContent>
          {formError ? (
            <Alert
              severity="error"
              sx={{
                mb: 2,
              }}
            >
              {formError}
            </Alert>
          ) : null}

          {guardiansQuery.isError ? (
            <Alert
              severity="error"
              sx={{
                mb: 2,
              }}
            >
              {errorMessage(
                guardiansQuery.error,
              )}
            </Alert>
          ) : null}

          <Box
            sx={{
              display:
                'grid',

              gap: 2,

              pt: 1,
            }}
          >
            <TextField
              select
              required
              label="Guardian"
              value={
                form.guardianId
              }
              onChange={(
                event,
              ) =>
                setForm(
                  (
                    current,
                  ) => ({
                    ...current,

                    guardianId:
                      event.target
                        .value,
                  }),
                )
              }
              disabled={
                guardiansQuery.isLoading
              }
            >
              {availableGuardians.length ===
              0 ? (
                <MenuItem
                  value=""
                  disabled
                >
                  No unlinked
                  active Guardians
                  available
                </MenuItem>
              ) : null}

              {availableGuardians.map(
                (
                  guardian,
                ) => (
                  <MenuItem
                    key={
                      guardian.id
                    }
                    value={
                      guardian.id
                    }
                  >
                    {guardianLabel(
                      guardian,
                    )}
                  </MenuItem>
                ),
              )}
            </TextField>

            <TextField
              select
              label="Relationship"
              value={
                form.relationshipType
              }
              onChange={(
                event,
              ) =>
                setForm(
                  (
                    current,
                  ) => ({
                    ...current,

                    relationshipType:
                      event.target
                        .value as GuardianRelationshipType,
                  }),
                )
              }
            >
              {GUARDIAN_RELATIONSHIP_TYPES.map(
                (
                  type,
                ) => (
                  <MenuItem
                    key={
                      type
                    }
                    value={
                      type
                    }
                  >
                    {relationshipLabel(
                      type,
                    )}
                  </MenuItem>
                ),
              )}
            </TextField>

            <Divider />

            <FormControlLabel
              control={
                <Switch
                  checked={
                    form.isPrimary
                  }
                  onChange={(
                    event,
                  ) =>
                    setForm(
                      (
                        current,
                      ) => ({
                        ...current,

                        isPrimary:
                          event
                            .target
                            .checked,
                      }),
                    )
                  }
                />
              }
              label="Primary Guardian"
            />

            <FormControlLabel
              control={
                <Switch
                  checked={
                    form.receiveNotifications
                  }
                  onChange={(
                    event,
                  ) =>
                    setForm(
                      (
                        current,
                      ) => ({
                        ...current,

                        receiveNotifications:
                          event
                            .target
                            .checked,
                      }),
                    )
                  }
                />
              }
              label="Receive notifications for this Student"
            />
          </Box>
        </DialogContent>

        <DialogActions>
          <Button
            disabled={
              linkMutation.isPending
            }
            onClick={() =>
              setAddOpen(
                false,
              )
            }
          >
            Cancel
          </Button>

          <Button
            variant="contained"
            disabled={
              linkMutation.isPending ||
              !form.guardianId
            }
            onClick={
              submitAdd
            }
          >
            {linkMutation.isPending
              ? 'Linking...'
              : 'Link Guardian'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ====================================================
          EDIT RELATIONSHIP
          ==================================================== */}

      <Dialog
        open={
          editingRelationship !==
          null
        }
        onClose={
          updateMutation.isPending
            ? undefined
            : () =>
                setEditingRelationship(
                  null,
                )
        }
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          Edit Guardian
          Relationship
        </DialogTitle>

        <DialogContent>
          {formError ? (
            <Alert
              severity="error"
              sx={{
                mb: 2,
              }}
            >
              {formError}
            </Alert>
          ) : null}

          {editingRelationship ? (
            <Typography
              sx={{
                color:
                  'text.secondary',

                fontSize:
                  13,

                mb: 2,
              }}
            >
              {
                editingRelationship.guardianFirstName
              }{' '}
              {
                editingRelationship.guardianLastName
              }
            </Typography>
          ) : null}

          <Box
            sx={{
              display:
                'grid',

              gap: 2,
            }}
          >
            <TextField
              select
              label="Relationship"
              value={
                form.relationshipType
              }
              onChange={(
                event,
              ) =>
                setForm(
                  (
                    current,
                  ) => ({
                    ...current,

                    relationshipType:
                      event.target
                        .value as GuardianRelationshipType,
                  }),
                )
              }
            >
              {GUARDIAN_RELATIONSHIP_TYPES.map(
                (
                  type,
                ) => (
                  <MenuItem
                    key={
                      type
                    }
                    value={
                      type
                    }
                  >
                    {relationshipLabel(
                      type,
                    )}
                  </MenuItem>
                ),
              )}
            </TextField>

            <FormControlLabel
              control={
                <Switch
                  checked={
                    form.isPrimary
                  }
                  onChange={(
                    event,
                  ) =>
                    setForm(
                      (
                        current,
                      ) => ({
                        ...current,

                        isPrimary:
                          event
                            .target
                            .checked,
                      }),
                    )
                  }
                />
              }
              label="Primary Guardian"
            />

            <FormControlLabel
              control={
                <Switch
                  checked={
                    form.receiveNotifications
                  }
                  onChange={(
                    event,
                  ) =>
                    setForm(
                      (
                        current,
                      ) => ({
                        ...current,

                        receiveNotifications:
                          event
                            .target
                            .checked,
                      }),
                    )
                  }
                />
              }
              label="Receive notifications for this Student"
            />
          </Box>
        </DialogContent>

        <DialogActions>
          <Button
            disabled={
              updateMutation.isPending
            }
            onClick={() =>
              setEditingRelationship(
                null,
              )
            }
          >
            Cancel
          </Button>

          <Button
            variant="contained"
            disabled={
              updateMutation.isPending
            }
            onClick={
              submitEdit
            }
          >
            {updateMutation.isPending
              ? 'Saving...'
              : 'Save relationship'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ====================================================
          UNLINK CONFIRMATION
          ==================================================== */}

      <Dialog
        open={
          unlinkTarget !==
          null
        }
        onClose={
          unlinkMutation.isPending
            ? undefined
            : () =>
                setUnlinkTarget(
                  null,
                )
        }
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>
          Unlink Guardian?
        </DialogTitle>

        <DialogContent>
          {unlinkMutation.isError ? (
            <Alert
              severity="error"
              sx={{
                mb: 2,
              }}
            >
              {errorMessage(
                unlinkMutation.error,
              )}
            </Alert>
          ) : null}

          <Typography
            sx={{
              color:
                'text.secondary',

              fontSize:
                13,

              lineHeight:
                1.7,
            }}
          >
            {unlinkTarget
              ? `${unlinkTarget.guardianFirstName} ${unlinkTarget.guardianLastName} will be unlinked from this Student. The Guardian record and historical data will not be deleted.`
              : ''}
          </Typography>
        </DialogContent>

        <DialogActions>
          <Button
            disabled={
              unlinkMutation.isPending
            }
            onClick={() =>
              setUnlinkTarget(
                null,
              )
            }
          >
            Cancel
          </Button>

          <Button
            variant="contained"
            disabled={
              unlinkMutation.isPending ||
              !unlinkTarget
            }
            onClick={() => {
              if (
                unlinkTarget
              ) {
                unlinkMutation.mutate(
                  unlinkTarget.guardianId,
                );
              }
            }}
          >
            {unlinkMutation.isPending
              ? 'Unlinking...'
              : 'Unlink Guardian'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
