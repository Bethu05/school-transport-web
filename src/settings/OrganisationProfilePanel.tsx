import { useState, type FormEvent } from "react";

import {
  Alert,
  Box,
  Button,
  Paper,
  TextField,
  Typography,
} from "@mui/material";

import { SaveRounded } from "@mui/icons-material";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import {
  updateOrganisationProfile,
  type OrganisationProfile,
  type SettingsResponse,
  type UpdateOrganisationProfileInput,
} from "./settings.api";

interface Props {
  tenantId: string;

  profile: OrganisationProfile;

  canUpdate: boolean;
}

type FormState = {
  displayName: string;
  countryCode: string;
  region: string;
  city: string;
  addressLine1: string;
  addressLine2: string;
  postalCode: string;
  phone: string;
  email: string;
  website: string;
  operationalContactName: string;
  operationalContactEmail: string;
  operationalContactPhone: string;
  motto: string;
  vision: string;
  about: string;
};

function fromProfile(profile: OrganisationProfile): FormState {
  return {
    displayName: profile.displayName ?? "",
    countryCode: profile.countryCode ?? "",
    region: profile.region ?? "",
    city: profile.city ?? "",
    addressLine1: profile.addressLine1 ?? "",
    addressLine2: profile.addressLine2 ?? "",
    postalCode: profile.postalCode ?? "",
    phone: profile.phone ?? "",
    email: profile.email ?? "",
    website: profile.website ?? "",
    operationalContactName: profile.operationalContactName ?? "",
    operationalContactEmail: profile.operationalContactEmail ?? "",
    operationalContactPhone: profile.operationalContactPhone ?? "",
    motto: profile.motto ?? "",
    vision: profile.vision ?? "",
    about: profile.about ?? "",
  };
}

function errorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "Organisation profile could not be saved.";
}

export function OrganisationProfilePanel({
  tenantId,
  profile,
  canUpdate,
}: Props) {
  const queryClient = useQueryClient();

  const [form, setForm] = useState<FormState>(() => fromProfile(profile));

  const [success, setSuccess] = useState<string | null>(null);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));

    setSuccess(null);
  }

  const mutation = useMutation({
    mutationFn: (input: UpdateOrganisationProfileInput) =>
      updateOrganisationProfile(tenantId, input),

    onSuccess: (response: SettingsResponse) => {
      queryClient.setQueryData(["settings", tenantId], response);

      setForm(fromProfile(response.profile));

      setSuccess("Organisation profile saved successfully.");
    },
  });

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canUpdate) {
      return;
    }

    await mutation.mutateAsync({
      displayName: form.displayName.trim() || null,

      countryCode: form.countryCode.trim().toUpperCase() || null,

      region: form.region.trim() || null,

      city: form.city.trim() || null,

      addressLine1: form.addressLine1.trim() || null,

      addressLine2: form.addressLine2.trim() || null,

      postalCode: form.postalCode.trim() || null,

      phone: form.phone.trim() || null,

      email: form.email.trim().toLowerCase() || null,

      website: form.website.trim() || null,

      operationalContactName: form.operationalContactName.trim() || null,

      operationalContactEmail:
        form.operationalContactEmail.trim().toLowerCase() || null,

      operationalContactPhone: form.operationalContactPhone.trim() || null,

      motto: form.motto.trim() || null,

      vision: form.vision.trim() || null,

      about: form.about.trim() || null,
    });
  }

  return (
    <Paper
      component="form"
      onSubmit={submit}
      elevation={0}
      sx={{
        mt: 3,
        p: {
          xs: 2,
          sm: 3,
        },
        maxWidth: 1080,
        border: "1px solid",
        borderColor: "divider",
      }}
    >
      <Typography
        sx={{
          fontWeight: 850,
          fontSize: 16,
        }}
      >
        Organisation profile
      </Typography>

      <Typography
        sx={{
          mt: 0.5,
          color: "text.secondary",
          fontSize: 11.5,
        }}
      >
        Operational identity, location, contacts and school-group branding.
        Financial information is deliberately excluded.
      </Typography>

      {!canUpdate ? (
        <Alert severity="info" sx={{ mt: 2 }}>
          You have read-only access.
        </Alert>
      ) : null}

      {mutation.isError ? (
        <Alert severity="error" sx={{ mt: 2 }}>
          {errorMessage(mutation.error)}
        </Alert>
      ) : null}

      {success ? (
        <Alert severity="success" sx={{ mt: 2 }}>
          {success}
        </Alert>
      ) : null}

      <Box
        sx={{
          mt: 2.5,
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            md: "repeat(2, minmax(0, 1fr))",
          },
          gap: 2,
        }}
      >
        <TextField
          label="Brand / display name"
          value={form.displayName}
          disabled={!canUpdate}
          onChange={(event) => updateField("displayName", event.target.value)}
        />

        <TextField
          label="Country code"
          value={form.countryCode}
          disabled={!canUpdate}
          placeholder="KE"
          helperText="Two-letter ISO country code"
          onChange={(event) => updateField("countryCode", event.target.value)}
        />

        <TextField
          label="County / region / state"
          value={form.region}
          disabled={!canUpdate}
          onChange={(event) => updateField("region", event.target.value)}
        />

        <TextField
          label="City / town"
          value={form.city}
          disabled={!canUpdate}
          onChange={(event) => updateField("city", event.target.value)}
        />

        <TextField
          label="Address line 1"
          value={form.addressLine1}
          disabled={!canUpdate}
          onChange={(event) => updateField("addressLine1", event.target.value)}
        />

        <TextField
          label="Address line 2"
          value={form.addressLine2}
          disabled={!canUpdate}
          onChange={(event) => updateField("addressLine2", event.target.value)}
        />

        <TextField
          label="Postal code"
          value={form.postalCode}
          disabled={!canUpdate}
          onChange={(event) => updateField("postalCode", event.target.value)}
        />

        <TextField
          label="Main phone"
          value={form.phone}
          disabled={!canUpdate}
          onChange={(event) => updateField("phone", event.target.value)}
        />

        <TextField
          label="General email"
          type="email"
          value={form.email}
          disabled={!canUpdate}
          onChange={(event) => updateField("email", event.target.value)}
        />

        <TextField
          label="Website"
          value={form.website}
          disabled={!canUpdate}
          onChange={(event) => updateField("website", event.target.value)}
        />

        <TextField
          label="Operational contact"
          value={form.operationalContactName}
          disabled={!canUpdate}
          onChange={(event) =>
            updateField("operationalContactName", event.target.value)
          }
        />

        <TextField
          label="Operational contact email"
          type="email"
          value={form.operationalContactEmail}
          disabled={!canUpdate}
          onChange={(event) =>
            updateField("operationalContactEmail", event.target.value)
          }
        />

        <TextField
          label="Operational contact phone"
          value={form.operationalContactPhone}
          disabled={!canUpdate}
          onChange={(event) =>
            updateField("operationalContactPhone", event.target.value)
          }
        />

        <TextField
          label="Motto"
          value={form.motto}
          disabled={!canUpdate}
          onChange={(event) => updateField("motto", event.target.value)}
          sx={{
            gridColumn: {
              md: "1 / -1",
            },
          }}
        />

        <TextField
          label="Vision"
          multiline
          minRows={3}
          value={form.vision}
          disabled={!canUpdate}
          onChange={(event) => updateField("vision", event.target.value)}
          sx={{
            gridColumn: {
              md: "1 / -1",
            },
          }}
        />

        <TextField
          label="About the organisation"
          multiline
          minRows={4}
          value={form.about}
          disabled={!canUpdate}
          onChange={(event) => updateField("about", event.target.value)}
          sx={{
            gridColumn: {
              md: "1 / -1",
            },
          }}
        />
      </Box>

      {canUpdate ? (
        <Box
          sx={{
            mt: 2.5,
            display: "flex",
            justifyContent: "flex-end",
          }}
        >
          <Button
            type="submit"
            variant="contained"
            startIcon={<SaveRounded />}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? "Saving..." : "Save organisation profile"}
          </Button>
        </Box>
      ) : null}
    </Paper>
  );
}
