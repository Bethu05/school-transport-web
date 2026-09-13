import { useState, type FormEvent } from 'react';

import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  TextField,
  Typography,
} from '@mui/material';

import type { School } from '../schools/schools.api';

import type {
  CreateRouteInput,
  Route,
  RouteType,
  UpdateRouteInput,
} from './routes.api';

interface RouteFormDialogProps {
  open: boolean;
  route: Route | null;
  schools: readonly School[];
  schoolsLoading: boolean;
  schoolsError: string | null;
  saving: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (input: CreateRouteInput | UpdateRouteInput) => Promise<void>;
}

interface RouteFormState {
  schoolId: string;
  name: string;
  code: string;
  routeType: RouteType;
}

function createFormState(
  route: Route | null,
  schools: readonly School[],
): RouteFormState {
  if (!route) {
    return {
      // If a tenant has one school, select it automatically.
      // Multi-school tenants still get an explicit school choice.
      schoolId: schools.length === 1 ? schools[0].id : '',
      name: '',
      code: '',
      routeType: 'other',
    };
  }

  return {
    schoolId: route.schoolId,
    name: route.name,
    code: route.code ?? '',
    routeType: route.routeType,
  };
}

function schoolLabel(school: School): string {
  return school.code ? `${school.name} (${school.code})` : school.name;
}

export function RouteFormDialog({
  open,
  route,
  schools,
  schoolsLoading,
  schoolsError,
  saving,
  error,
  onClose,
  onSubmit,
}: RouteFormDialogProps) {
  const editing = route !== null;

  const [form, setForm] = useState<RouteFormState>(() =>
    createFormState(route, schools),
  );

  const [validationError, setValidationError] = useState<string | null>(null);

  const selectedSchool = route
    ? schools.find((school) => school.id === route.schoolId) ?? null
    : null;

  function updateField<K extends keyof RouteFormState>(
    key: K,
    value: RouteFormState[K],
  ): void {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();
    setValidationError(null);

    const schoolId = form.schoolId.trim();
    const name = form.name.trim();
    const code = form.code.trim();

    if (!editing && !schoolId) {
      setValidationError('Please select a school.');
      return;
    }

    if (!name) {
      setValidationError('Route name is required.');
      return;
    }

    if (editing) {
      const input: UpdateRouteInput = {
        name,
        code: code || undefined,
        routeType: form.routeType,
      };

      await onSubmit(input);
      return;
    }

    const input: CreateRouteInput = {
      schoolId,
      name,
      code: code || undefined,
      routeType: form.routeType,
    };

    await onSubmit(input);
  }

  return (
    <Dialog
      open={open}
      onClose={saving ? undefined : onClose}
      fullWidth
      maxWidth="sm"
    >
      <Box component="form" onSubmit={handleSubmit}>
        <DialogTitle sx={{ fontWeight: 850 }}>
          {editing ? 'Edit route' : 'Add route'}
        </DialogTitle>

        <DialogContent>
          <Box
            sx={{
              pt: 1,
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                sm: 'repeat(2, minmax(0, 1fr))',
              },
              gap: 2,
            }}
          >
            {validationError || error ? (
              <Alert severity="error" sx={{ gridColumn: '1 / -1' }}>
                {validationError ?? error}
              </Alert>
            ) : null}

            {editing ? (
              <TextField
                disabled
                label="School"
                value={
                  selectedSchool
                    ? schoolLabel(selectedSchool)
                    : 'Current school'
                }
                helperText="The school cannot be changed after the route is created."
                sx={{
                  gridColumn: {
                    sm: '1 / -1',
                  },
                }}
              />
            ) : (
              <TextField
                select
                required
                disabled={schoolsLoading || Boolean(schoolsError)}
                label="School"
                value={form.schoolId}
                onChange={(event) =>
                  updateField('schoolId', event.target.value)
                }
                helperText={
                  schoolsLoading
                    ? 'Loading schools...'
                    : schoolsError
                      ? 'Schools could not be loaded.'
                      : schools.length === 0
                        ? 'No active schools are available.'
                        : 'Choose the school this route belongs to.'
                }
                sx={{
                  gridColumn: {
                    sm: '1 / -1',
                  },
                }}
              >
                {schools.length === 0 ? (
                  <MenuItem value="" disabled>
                    No active schools available
                  </MenuItem>
                ) : null}

                {schools.map((school) => (
                  <MenuItem key={school.id} value={school.id}>
                    {schoolLabel(school)}
                  </MenuItem>
                ))}
              </TextField>
            )}

            <TextField
              required
              label="Route name"
              value={form.name}
              onChange={(event) => updateField('name', event.target.value)}
              placeholder="e.g. Westlands Morning"
              slotProps={{
                htmlInput: {
                  maxLength: 150,
                },
              }}
            />

            <TextField
              label="Route code"
              value={form.code}
              onChange={(event) => updateField('code', event.target.value)}
              placeholder="e.g. WEST-AM-01"
              slotProps={{
                htmlInput: {
                  maxLength: 50,
                },
              }}
            />

            <TextField
              select
              label="Route type"
              value={form.routeType}
              onChange={(event) =>
                updateField('routeType', event.target.value as RouteType)
              }
              sx={{
                gridColumn: {
                  sm: '1 / -1',
                },
              }}
            >
              <MenuItem value="pickup">Pickup</MenuItem>
              <MenuItem value="dropoff">Drop-off</MenuItem>
              <MenuItem value="other">Other</MenuItem>
            </TextField>

            <Typography
              sx={{
                gridColumn: '1 / -1',
                color: 'text.secondary',
                fontSize: 11.5,
                lineHeight: 1.6,
              }}
            >
              Route status is controlled separately with Activate and Deactivate
              actions. This prevents ordinary route edits from bypassing
              lifecycle permissions.
            </Typography>
          </Box>
        </DialogContent>

        <DialogActions
          sx={{
            px: 3,
            pb: 3,
          }}
        >
          <Button disabled={saving} onClick={onClose}>
            Cancel
          </Button>

          <Button
            type="submit"
            variant="contained"
            disabled={
              saving ||
              (!editing &&
                (schoolsLoading || Boolean(schoolsError) || schools.length === 0))
            }
          >
            {saving ? 'Saving...' : editing ? 'Save changes' : 'Add route'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
