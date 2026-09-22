import { useState } from "react";

import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createInitialTenantAdmin,
  getPlatformTenantOnboardingStatus,
  type PlatformTenantListItem,
  type PlatformTenantOnboardingStatus,
} from "./platform.api";

interface TenantInitialAdminActionsProps {
  tenant: PlatformTenantListItem;
}

export function TenantInitialAdminActions({
  tenant,
}: TenantInitialAdminActionsProps) {
  const queryClient = useQueryClient();

  const onboardingQueryKey = [
    "platform",
    "tenant",
    tenant.id,
    "onboarding",
  ] as const;

  const [firstName, setFirstName] = useState("");

  const [lastName, setLastName] = useState("");

  const [email, setEmail] = useState("");

  const [password, setPassword] = useState("");

  // ==========================================================
  // PERSISTED ONBOARDING STATE
  //
  // This is deliberately fetched from the backend rather than
  // relying on local component state so a full page reload still
  // knows whether the initial administrator already exists.
  // ==========================================================

  const onboardingQuery = useQuery({
    queryKey: onboardingQueryKey,

    queryFn: () => getPlatformTenantOnboardingStatus(tenant.id),
  });

  // ==========================================================
  // CREATE INITIAL ADMIN
  // ==========================================================

  const mutation = useMutation({
    mutationFn: () =>
      createInitialTenantAdmin(tenant.id, {
        firstName: firstName.trim(),

        lastName: lastName.trim(),

        email: email.trim().toLowerCase(),

        password,
      }),

    onSuccess: (result) => {
      /**
       * Never retain the plaintext password after success.
       */
      setPassword("");

      /**
       * Immediately move the UI into the persisted configured
       * state without waiting for another network round trip.
       */
      queryClient.setQueryData<PlatformTenantOnboardingStatus>(
        onboardingQueryKey,
        {
          tenantId: tenant.id,

          hasInitialAdmin: true,

          initialAdmin: {
            userId: result.user.id,

            email: result.user.email,

            firstName: result.user.firstName,

            lastName: result.user.lastName,

            userStatus: result.user.status,

            membershipStatus: result.membership.status,
          },
        },
      );

      /**
       * Then refresh from the canonical backend state.
       */
      void queryClient.invalidateQueries({
        queryKey: onboardingQueryKey,
      });
    },
  });

  const canSubmit =
    firstName.trim().length > 0 &&
    lastName.trim().length > 0 &&
    email.trim().length > 0 &&
    password.length >= 12 &&
    !mutation.isPending;

  const initialAdmin = onboardingQuery.data?.initialAdmin ?? null;

  return (
    <Box>
      <Divider sx={{ my: 3 }} />

      <Typography
        sx={{
          fontSize: 12,
          fontWeight: 800,
        }}
      >
        Initial administrator
      </Typography>

      <Typography
        sx={{
          mt: 0.5,
          color: "text.secondary",
          fontSize: 10,
          lineHeight: 1.5,
        }}
      >
        Configure the customer&apos;s first school administrator account.
      </Typography>

      {/* ======================================================
          LOADING
          ====================================================== */}

      {onboardingQuery.isPending && (
        <Box
          sx={{
            mt: 2,
            display: "flex",
            alignItems: "center",
            gap: 1,
          }}
        >
          <CircularProgress size={18} />

          <Typography
            sx={{
              color: "text.secondary",
              fontSize: 10,
            }}
          >
            Checking administrator status...
          </Typography>
        </Box>
      )}

      {/* ======================================================
          STATUS READ ERROR
          ====================================================== */}

      {onboardingQuery.isError && (
        <Stack
          spacing={1}
          sx={{
            mt: 2,
          }}
        >
          <Alert severity="error">
            {onboardingQuery.error instanceof Error
              ? onboardingQuery.error.message
              : "Unable to load administrator status"}
          </Alert>

          <Button
            size="small"
            variant="outlined"
            onClick={() => {
              void onboardingQuery.refetch();
            }}
          >
            Retry
          </Button>
        </Stack>
      )}

      {/* ======================================================
          ADMIN ALREADY CONFIGURED
          ====================================================== */}

      {onboardingQuery.data?.hasInitialAdmin && initialAdmin && (
        <Stack
          spacing={1.5}
          sx={{
            mt: 2,
          }}
        >
          <Alert severity="success">Administrator configured</Alert>

          <Box>
            <Typography
              sx={{
                color: "text.secondary",
                fontSize: 9,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Administrator
            </Typography>

            <Typography
              sx={{
                mt: 0.5,
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              {initialAdmin.firstName} {initialAdmin.lastName}
            </Typography>
          </Box>

          <Box>
            <Typography
              sx={{
                color: "text.secondary",
                fontSize: 9,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Login email
            </Typography>

            <Typography
              sx={{
                mt: 0.5,
                fontSize: 11,
                wordBreak: "break-word",
              }}
            >
              {initialAdmin.email}
            </Typography>
          </Box>

          <Box>
            <Typography
              sx={{
                color: "text.secondary",
                fontSize: 9,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Access status
            </Typography>

            <Typography
              sx={{
                mt: 0.5,
                fontSize: 11,
                fontWeight: 700,
              }}
            >
              {initialAdmin.userStatus}
              {" / "}
              {initialAdmin.membershipStatus}
            </Typography>
          </Box>

          <Typography
            sx={{
              color: "text.secondary",
              fontSize: 10,
              lineHeight: 1.5,
            }}
          >
            This customer has an administrator account and can log into the
            tenant application.
          </Typography>
        </Stack>
      )}

      {/* ======================================================
          CREATE FORM
          ====================================================== */}

      {onboardingQuery.data && !onboardingQuery.data.hasInitialAdmin && (
        <Stack
          spacing={1.5}
          sx={{
            mt: 2,
          }}
        >
          {mutation.isError && (
            <Alert severity="error">
              {mutation.error instanceof Error
                ? mutation.error.message
                : "Unable to create administrator"}
            </Alert>
          )}

          <TextField
            size="small"
            label="First name"
            value={firstName}
            onChange={(event) => {
              setFirstName(event.target.value);

              mutation.reset();
            }}
            disabled={mutation.isPending}
            fullWidth
          />

          <TextField
            size="small"
            label="Last name"
            value={lastName}
            onChange={(event) => {
              setLastName(event.target.value);

              mutation.reset();
            }}
            disabled={mutation.isPending}
            fullWidth
          />

          <TextField
            size="small"
            type="email"
            label="Email"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);

              mutation.reset();
            }}
            disabled={mutation.isPending}
            fullWidth
          />

          <TextField
            size="small"
            type="password"
            label="Temporary password"
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);

              mutation.reset();
            }}
            helperText="Minimum 12 characters"
            disabled={mutation.isPending}
            fullWidth
          />

          <Button
            variant="contained"
            disabled={!canSubmit}
            onClick={() => mutation.mutate()}
            fullWidth
          >
            {mutation.isPending
              ? "Creating administrator..."
              : "Create administrator"}
          </Button>

          <Typography
            sx={{
              color: "text.secondary",
              fontSize: 10,
              lineHeight: 1.5,
            }}
          >
            Record or communicate the temporary password securely before
            submitting. It will not be shown again after the account is created.
          </Typography>
        </Stack>
      )}
    </Box>
  );
}
