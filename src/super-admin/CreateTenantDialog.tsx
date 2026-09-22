import { useState } from "react";

import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import {
  createPlatformTenant,
  listPlatformTenants,
  type PlatformTenantListItem,
} from "./platform.api";

interface CreateTenantDialogProps {
  open: boolean;

  onClose: () => void;

  onTenantCreated: (tenant: PlatformTenantListItem) => void;
}

function createSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function CreateTenantDialog({
  open,
  onClose,
  onTenantCreated,
}: CreateTenantDialogProps) {
  const queryClient = useQueryClient();

  const [tenantName, setTenantName] = useState("");

  const [tenantSlug, setTenantSlug] = useState("");

  const [timezone, setTimezone] = useState("Africa/Nairobi");

  const [schoolName, setSchoolName] = useState("");

  const [schoolCode, setSchoolCode] = useState("");

  const [schoolAddress, setSchoolAddress] = useState("");

  const mutation = useMutation({
    mutationFn: createPlatformTenant,

    onSuccess: async (result) => {
      const tenants = await listPlatformTenants();

      queryClient.setQueryData(["platform", "tenants"], tenants);

      const createdTenant = tenants.find(
        (tenant) => tenant.id === result.tenant.id,
      );

      if (createdTenant) {
        onTenantCreated(createdTenant);
      }

      setTenantName("");
      setTenantSlug("");
      setTimezone("Africa/Nairobi");
      setSchoolName("");
      setSchoolCode("");
      setSchoolAddress("");

      onClose();
    },
  });

  const canSubmit =
    tenantName.trim().length > 0 &&
    tenantSlug.trim().length > 0 &&
    timezone.trim().length > 0 &&
    schoolName.trim().length > 0 &&
    schoolCode.trim().length > 0 &&
    !mutation.isPending;

  function handleClose(): void {
    if (mutation.isPending) {
      return;
    }

    onClose();
  }

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
      <DialogTitle>Add tenant</DialogTitle>

      <DialogContent>
        <Typography
          sx={{
            mb: 3,
            color: "text.secondary",
            fontSize: 12,
            lineHeight: 1.6,
          }}
        >
          Create the customer organisation and its first school. Commercial plan
          or trial can be assigned immediately afterwards.
        </Typography>

        <Stack spacing={2}>
          {mutation.isError && (
            <Alert severity="error">
              {mutation.error instanceof Error
                ? mutation.error.message
                : "Unable to create tenant"}
            </Alert>
          )}

          <TextField
            label="Tenant / organisation name"
            value={tenantName}
            onChange={(event) => {
              const value = event.target.value;

              setTenantName(value);

              setTenantSlug(createSlug(value));
            }}
            disabled={mutation.isPending}
            autoFocus
            required
            fullWidth
          />

          <TextField
            label="Tenant slug"
            value={tenantSlug}
            onChange={(event) => {
              setTenantSlug(createSlug(event.target.value));
            }}
            helperText="Lowercase permanent identifier, e.g. brookhouse-schools"
            disabled={mutation.isPending}
            required
            fullWidth
          />

          <TextField
            label="Timezone"
            value={timezone}
            onChange={(event) => setTimezone(event.target.value)}
            disabled={mutation.isPending}
            required
            fullWidth
          />

          <TextField
            label="First school name"
            value={schoolName}
            onChange={(event) => setSchoolName(event.target.value)}
            disabled={mutation.isPending}
            required
            fullWidth
          />

          <TextField
            label="School code"
            value={schoolCode}
            onChange={(event) =>
              setSchoolCode(
                event.target.value.toUpperCase().replace(/\s+/g, ""),
              )
            }
            helperText="Example: BHK001"
            disabled={mutation.isPending}
            required
            fullWidth
          />

          <TextField
            label="School address"
            value={schoolAddress}
            onChange={(event) => setSchoolAddress(event.target.value)}
            disabled={mutation.isPending}
            multiline
            minRows={2}
            fullWidth
          />
        </Stack>
      </DialogContent>

      <DialogActions
        sx={{
          px: 3,
          pb: 3,
        }}
      >
        <Button onClick={handleClose} disabled={mutation.isPending}>
          Cancel
        </Button>

        <Button
          variant="contained"
          disabled={!canSubmit}
          onClick={() => {
            mutation.mutate({
              tenantName: tenantName.trim(),

              tenantSlug: tenantSlug.trim(),

              timezone: timezone.trim(),

              schoolName: schoolName.trim(),

              schoolCode: schoolCode.trim(),

              schoolAddress: schoolAddress.trim() || undefined,
            });
          }}
        >
          {mutation.isPending ? "Creating..." : "Create tenant"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
