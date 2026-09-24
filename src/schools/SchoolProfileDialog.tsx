import { useState, type FormEvent } from "react";

import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
} from "@mui/material";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  getSchoolProfile,
  updateSchoolProfile,
  type School,
  type SchoolProfile,
} from "./schools.api";

interface Props {
  open: boolean;

  tenantId: string;

  school: School;

  canUpdate: boolean;

  onClose: () => void;

  onSaved: () => void;
}

type FormState = {
  countryCode: string;
  region: string;
  city: string;
  addressLine1: string;
  addressLine2: string;
  postalCode: string;
  latitude: string;
  longitude: string;
  phone: string;
  email: string;
  website: string;
  transportContactName: string;
  transportContactEmail: string;
  transportContactPhone: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  motto: string;
  vision: string;
  about: string;
};

function fromProfile(profile: SchoolProfile): FormState {
  return {
    countryCode: profile.countryCode ?? "",
    region: profile.region ?? "",
    city: profile.city ?? "",
    addressLine1: profile.addressLine1 ?? "",
    addressLine2: profile.addressLine2 ?? "",
    postalCode: profile.postalCode ?? "",
    latitude: profile.latitude === null ? "" : String(profile.latitude),
    longitude: profile.longitude === null ? "" : String(profile.longitude),
    phone: profile.phone ?? "",
    email: profile.email ?? "",
    website: profile.website ?? "",
    transportContactName: profile.transportContactName ?? "",
    transportContactEmail: profile.transportContactEmail ?? "",
    transportContactPhone: profile.transportContactPhone ?? "",
    emergencyContactName: profile.emergencyContactName ?? "",
    emergencyContactPhone: profile.emergencyContactPhone ?? "",
    motto: profile.motto ?? "",
    vision: profile.vision ?? "",
    about: profile.about ?? "",
  };
}

function errorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "School profile could not be loaded.";
}

function SchoolProfileForm({
  tenantId,
  school,
  profile,
  canUpdate,
  onClose,
  onSaved,
}: Omit<Props, "open"> & {
  profile: SchoolProfile;
}) {
  const queryClient = useQueryClient();

  const [form, setForm] = useState<FormState>(() => fromProfile(profile));

  const [validationError, setValidationError] = useState<string | null>(null);

  function field<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));

    setValidationError(null);
  }

  const mutation = useMutation({
    mutationFn: () => {
      const latText = form.latitude.trim();

      const lngText = form.longitude.trim();

      if (Boolean(latText) !== Boolean(lngText)) {
        throw new Error("Latitude and longitude must be supplied together.");
      }

      const latitude = latText === "" ? null : Number(latText);

      const longitude = lngText === "" ? null : Number(lngText);

      if (latitude !== null && !Number.isFinite(latitude)) {
        throw new Error("Latitude must be a valid number.");
      }

      if (longitude !== null && !Number.isFinite(longitude)) {
        throw new Error("Longitude must be a valid number.");
      }

      return updateSchoolProfile(tenantId, school.id, {
        countryCode: form.countryCode.trim().toUpperCase() || null,

        region: form.region.trim() || null,

        city: form.city.trim() || null,

        addressLine1: form.addressLine1.trim() || null,

        addressLine2: form.addressLine2.trim() || null,

        postalCode: form.postalCode.trim() || null,

        latitude,

        longitude,

        phone: form.phone.trim() || null,

        email: form.email.trim().toLowerCase() || null,

        website: form.website.trim() || null,

        transportContactName: form.transportContactName.trim() || null,

        transportContactEmail:
          form.transportContactEmail.trim().toLowerCase() || null,

        transportContactPhone: form.transportContactPhone.trim() || null,

        emergencyContactName: form.emergencyContactName.trim() || null,

        emergencyContactPhone: form.emergencyContactPhone.trim() || null,

        motto: form.motto.trim() || null,

        vision: form.vision.trim() || null,

        about: form.about.trim() || null,
      });
    },

    onSuccess: async (updated) => {
      queryClient.setQueryData(
        ["school-profile", tenantId, school.id],
        updated,
      );

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["schools"],
        }),

        queryClient.invalidateQueries({
          queryKey: ["auth-schools"],
        }),
      ]);

      onSaved();
      onClose();
    },

    onError: (error) => {
      setValidationError(errorMessage(error));
    },
  });

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canUpdate) {
      return;
    }

    setValidationError(null);

    await mutation.mutateAsync();
  }

  return (
    <Box component="form" onSubmit={submit}>
      <DialogContent dividers>
        {!canUpdate ? (
          <Alert severity="info" sx={{ mb: 2 }}>
            This profile is read-only.
          </Alert>
        ) : null}

        {validationError ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {validationError}
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
            label="Country code"
            placeholder="KE"
            value={form.countryCode}
            disabled={!canUpdate}
            onChange={(event) => field("countryCode", event.target.value)}
          />

          <TextField
            label="County / region / state"
            value={form.region}
            disabled={!canUpdate}
            onChange={(event) => field("region", event.target.value)}
          />

          <TextField
            label="City / town"
            value={form.city}
            disabled={!canUpdate}
            onChange={(event) => field("city", event.target.value)}
          />

          <TextField
            label="Postal code"
            value={form.postalCode}
            disabled={!canUpdate}
            onChange={(event) => field("postalCode", event.target.value)}
          />

          <TextField
            label="Address line 1"
            value={form.addressLine1}
            disabled={!canUpdate}
            onChange={(event) => field("addressLine1", event.target.value)}
          />

          <TextField
            label="Address line 2"
            value={form.addressLine2}
            disabled={!canUpdate}
            onChange={(event) => field("addressLine2", event.target.value)}
          />

          <TextField
            label="Latitude"
            value={form.latitude}
            disabled={!canUpdate}
            onChange={(event) => field("latitude", event.target.value)}
          />

          <TextField
            label="Longitude"
            value={form.longitude}
            disabled={!canUpdate}
            onChange={(event) => field("longitude", event.target.value)}
          />

          <TextField
            label="Main phone"
            value={form.phone}
            disabled={!canUpdate}
            onChange={(event) => field("phone", event.target.value)}
          />

          <TextField
            type="email"
            label="General email"
            value={form.email}
            disabled={!canUpdate}
            onChange={(event) => field("email", event.target.value)}
          />

          <TextField
            label="Website"
            value={form.website}
            disabled={!canUpdate}
            onChange={(event) => field("website", event.target.value)}
          />

          <TextField
            label="Transport contact"
            value={form.transportContactName}
            disabled={!canUpdate}
            onChange={(event) =>
              field("transportContactName", event.target.value)
            }
          />

          <TextField
            type="email"
            label="Transport contact email"
            value={form.transportContactEmail}
            disabled={!canUpdate}
            onChange={(event) =>
              field("transportContactEmail", event.target.value)
            }
          />

          <TextField
            label="Transport contact phone"
            value={form.transportContactPhone}
            disabled={!canUpdate}
            onChange={(event) =>
              field("transportContactPhone", event.target.value)
            }
          />

          <TextField
            label="Emergency contact"
            value={form.emergencyContactName}
            disabled={!canUpdate}
            onChange={(event) =>
              field("emergencyContactName", event.target.value)
            }
          />

          <TextField
            label="Emergency contact phone"
            value={form.emergencyContactPhone}
            disabled={!canUpdate}
            onChange={(event) =>
              field("emergencyContactPhone", event.target.value)
            }
          />

          <TextField
            label="Motto"
            value={form.motto}
            disabled={!canUpdate}
            onChange={(event) => field("motto", event.target.value)}
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
            onChange={(event) => field("vision", event.target.value)}
            sx={{
              gridColumn: {
                md: "1 / -1",
              },
            }}
          />

          <TextField
            label="About the school"
            multiline
            minRows={4}
            value={form.about}
            disabled={!canUpdate}
            onChange={(event) => field("about", event.target.value)}
            sx={{
              gridColumn: {
                md: "1 / -1",
              },
            }}
          />
        </Box>
      </DialogContent>

      <DialogActions>
        <Button type="button" onClick={onClose} disabled={mutation.isPending}>
          Close
        </Button>

        {canUpdate ? (
          <Button
            type="submit"
            variant="contained"
            disabled={mutation.isPending}
          >
            {mutation.isPending ? "Saving..." : "Save profile"}
          </Button>
        ) : null}
      </DialogActions>
    </Box>
  );
}

export function SchoolProfileDialog(props: Props) {
  const query = useQuery({
    queryKey: ["school-profile", props.tenantId, props.school.id],

    enabled: props.open,

    queryFn: () => getSchoolProfile(props.tenantId, props.school.id),
  });

  return (
    <Dialog open={props.open} onClose={props.onClose} fullWidth maxWidth="md">
      <DialogTitle
        sx={{
          fontWeight: 900,
        }}
      >
        School profile — {props.school.name}
      </DialogTitle>

      {query.isLoading ? (
        <Box
          sx={{
            minHeight: 260,
            display: "grid",
            placeItems: "center",
          }}
        >
          <CircularProgress size={30} />
        </Box>
      ) : query.isError || !query.data ? (
        <>
          <DialogContent dividers>
            <Alert severity="error">{errorMessage(query.error)}</Alert>
          </DialogContent>

          <DialogActions>
            <Button onClick={props.onClose}>Close</Button>
          </DialogActions>
        </>
      ) : (
        <SchoolProfileForm
          key={query.data.updatedAt}
          tenantId={props.tenantId}
          school={props.school}
          profile={query.data}
          canUpdate={props.canUpdate}
          onClose={props.onClose}
          onSaved={props.onSaved}
        />
      )}
    </Dialog>
  );
}
