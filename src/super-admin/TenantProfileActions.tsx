import { useState, type FormEvent } from "react";

import { Alert, Box, Button, CircularProgress, TextField } from "@mui/material";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  getPlatformTenantProfile,
  updatePlatformTenantProfile,
  type PlatformTenantListItem,
  type PlatformTenantProfile,
} from "./platform.api";

interface Props {
  tenant: PlatformTenantListItem;

  onTenantUpdated: (tenant: PlatformTenantListItem) => void;
}

type FormState = {
  name: string;
  timezone: string;
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

function initial(profile: PlatformTenantProfile): FormState {
  return {
    name: profile.name,
    timezone: profile.timezone,
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
    : "Tenant details could not be saved.";
}

function TenantProfileForm({
  tenant,
  profile,
  onTenantUpdated,
}: Props & {
  profile: PlatformTenantProfile;
}) {
  const queryClient = useQueryClient();

  const [form, setForm] = useState<FormState>(() => initial(profile));

  const [saved, setSaved] = useState(false);

  function field<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));

    setSaved(false);
  }

  const mutation = useMutation({
    mutationFn: () =>
      updatePlatformTenantProfile(tenant.id, {
        name: form.name.trim(),

        timezone: form.timezone.trim(),

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
      }),

    onSuccess: (updated) => {
      queryClient.setQueryData(
        ["platform", "tenant-profile", tenant.id],
        updated,
      );

      onTenantUpdated({
        ...tenant,
        name: updated.name,
        timezone: updated.timezone,
      });

      setForm(initial(updated));
      setSaved(true);
    },
  });

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.name.trim()) {
      return;
    }

    if (!form.timezone.trim()) {
      return;
    }

    await mutation.mutateAsync();
  }

  return (
    <Box component="form" onSubmit={submit}>
      {mutation.isError ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {errorMessage(mutation.error)}
        </Alert>
      ) : null}

      {saved ? (
        <Alert severity="success" sx={{ mb: 2 }}>
          Tenant details saved.
        </Alert>
      ) : null}

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            md: "repeat(2, minmax(0, 1fr))",
          },
          gap: 2,
        }}
      >
        <TextField
          required
          label="Organisation name"
          value={form.name}
          onChange={(event) => field("name", event.target.value)}
        />

        <TextField
          label="Brand / display name"
          value={form.displayName}
          onChange={(event) => field("displayName", event.target.value)}
        />

        <TextField
          disabled
          label="Tenant slug"
          value={profile.slug}
          helperText="Stable URL identifier"
        />

        <TextField
          disabled
          label="Lifecycle status"
          value={profile.status}
          helperText="Managed through lifecycle controls"
        />

        <TextField
          required
          label="Timezone"
          value={form.timezone}
          onChange={(event) => field("timezone", event.target.value)}
        />

        <TextField
          label="Country code"
          value={form.countryCode}
          placeholder="KE"
          onChange={(event) => field("countryCode", event.target.value)}
        />

        <TextField
          label="County / region / state"
          value={form.region}
          onChange={(event) => field("region", event.target.value)}
        />

        <TextField
          label="City / town"
          value={form.city}
          onChange={(event) => field("city", event.target.value)}
        />

        <TextField
          label="Address line 1"
          value={form.addressLine1}
          onChange={(event) => field("addressLine1", event.target.value)}
        />

        <TextField
          label="Address line 2"
          value={form.addressLine2}
          onChange={(event) => field("addressLine2", event.target.value)}
        />

        <TextField
          label="Postal code"
          value={form.postalCode}
          onChange={(event) => field("postalCode", event.target.value)}
        />

        <TextField
          label="Main phone"
          value={form.phone}
          onChange={(event) => field("phone", event.target.value)}
        />

        <TextField
          type="email"
          label="General email"
          value={form.email}
          onChange={(event) => field("email", event.target.value)}
        />

        <TextField
          label="Website"
          value={form.website}
          onChange={(event) => field("website", event.target.value)}
        />

        <TextField
          label="Operational contact"
          value={form.operationalContactName}
          onChange={(event) =>
            field("operationalContactName", event.target.value)
          }
        />

        <TextField
          type="email"
          label="Operational contact email"
          value={form.operationalContactEmail}
          onChange={(event) =>
            field("operationalContactEmail", event.target.value)
          }
        />

        <TextField
          label="Operational contact phone"
          value={form.operationalContactPhone}
          onChange={(event) =>
            field("operationalContactPhone", event.target.value)
          }
        />

        <TextField
          label="Motto"
          value={form.motto}
          onChange={(event) => field("motto", event.target.value)}
          sx={{
            gridColumn: {
              md: "1 / -1",
            },
          }}
        />

        <TextField
          multiline
          minRows={3}
          label="Vision"
          value={form.vision}
          onChange={(event) => field("vision", event.target.value)}
          sx={{
            gridColumn: {
              md: "1 / -1",
            },
          }}
        />

        <TextField
          multiline
          minRows={4}
          label="About"
          value={form.about}
          onChange={(event) => field("about", event.target.value)}
          sx={{
            gridColumn: {
              md: "1 / -1",
            },
          }}
        />
      </Box>

      <Box
        sx={{
          mt: 2.5,
          display: "flex",
          justifyContent: "flex-end",
        }}
      >
        <Button type="submit" variant="contained" disabled={mutation.isPending}>
          {mutation.isPending ? "Saving..." : "Save tenant details"}
        </Button>
      </Box>
    </Box>
  );
}

export function TenantProfileActions(props: Props) {
  const query = useQuery({
    queryKey: ["platform", "tenant-profile", props.tenant.id],

    queryFn: () => getPlatformTenantProfile(props.tenant.id),
  });

  if (query.isLoading) {
    return (
      <Box
        sx={{
          minHeight: 180,
          display: "grid",
          placeItems: "center",
        }}
      >
        <CircularProgress size={28} />
      </Box>
    );
  }

  if (query.isError || !query.data) {
    return <Alert severity="error">{errorMessage(query.error)}</Alert>;
  }

  return (
    <TenantProfileForm
      key={query.data.updatedAt}
      {...props}
      profile={query.data}
    />
  );
}
