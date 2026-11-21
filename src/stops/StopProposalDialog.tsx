import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Alert, Button } from "@mui/material";
import { ApiRequestError } from "../api/client";
import type { School } from "../schools/schools.api";
import { StopFormDialog } from "./StopFormDialog";
import { createStopProposal } from "./stop-proposals.api";
import type { CreateStopInput, UpdateStopInput } from "./stops.api";

interface Props {
  open: boolean;
  tenantId: string;
  userId: string;
  school: School;
  onClose: () => void;
}

interface PendingSubmission {
  input: CreateStopInput & { idempotencyKey: string };
}

function loadPending(key: string): {
  draft: PendingSubmission | null;
  error: string | null;
} {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return { draft: null, error: null };
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object" || !("input" in value))
      throw new Error();
    const input: unknown = value.input;
    if (
      !input ||
      typeof input !== "object" ||
      !("idempotencyKey" in input) ||
      typeof input.idempotencyKey !== "string" ||
      !("name" in input) ||
      typeof input.name !== "string" ||
      !("latitude" in input) ||
      typeof input.latitude !== "number" ||
      !("longitude" in input) ||
      typeof input.longitude !== "number"
    )
      throw new Error();
    return {
      draft: { input: input as PendingSubmission["input"] },
      error: null,
    };
  } catch {
    return {
      draft: null,
      error:
        "The saved proposal cannot be read. Check the pending list before creating another proposal.",
    };
  }
}

export function StopProposalDialog({
  open,
  tenantId,
  userId,
  school,
  onClose,
}: Props) {
  const storageKey = `stop-proposal.${tenantId}.${userId}.${school.id}`;
  const queryClient = useQueryClient();
  const [initial] = useState(() => loadPending(storageKey));
  const [pending, setPending] = useState(initial.draft);
  const [error, setError] = useState<string | null>(initial.error);
  const create = useMutation({
    mutationFn: (input: PendingSubmission["input"]) =>
      createStopProposal(tenantId, input),
  });

  async function send(draft: PendingSubmission): Promise<void> {
    setError(null);
    try {
      await create.mutateAsync(draft.input);
      sessionStorage.removeItem(storageKey);
      setPending(null);
      onClose();
      await queryClient.invalidateQueries({
        queryKey: ["stop-proposals", tenantId],
      });
    } catch (requestError) {
      if (
        requestError instanceof ApiRequestError &&
        [400, 403, 404, 422].includes(requestError.status)
      ) {
        try {
          sessionStorage.removeItem(storageKey);
          setPending(null);
        } catch {
          setError(
            "The rejected proposal could not be removed from browser storage.",
          );
          return;
        }
      }
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to submit the stop proposal.",
      );
    }
  }

  async function submit(
    input: CreateStopInput | UpdateStopInput,
  ): Promise<void> {
    setError(null);
    if (initial.error) {
      setError(initial.error);
      return;
    }
    if (pending) {
      setError("Retry the saved proposal before submitting another.");
      return;
    }
    if (
      typeof input.name !== "string" ||
      typeof input.latitude !== "number" ||
      typeof input.longitude !== "number"
    ) {
      setError("A stop name and valid coordinates are required.");
      return;
    }
    if (!globalThis.crypto?.randomUUID) {
      setError(
        "Secure proposal submission requires a secure browser connection.",
      );
      return;
    }
    const draft: PendingSubmission = {
      input: {
        name: input.name,
        latitude: input.latitude,
        longitude: input.longitude,
        code: input.code,
        address: input.address,
        geofenceRadiusMeters: input.geofenceRadiusMeters,
        schoolId: "schoolId" in input && input.schoolId ? school.id : undefined,
        idempotencyKey: globalThis.crypto.randomUUID(),
      },
    };
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(draft));
    } catch {
      setError(
        "Browser storage is unavailable; the proposal was not submitted.",
      );
      return;
    }
    setPending(draft);
    await send(draft);
  }

  return (
    <StopFormDialog
      open={open}
      stop={null}
      stopSchoolName=""
      schools={[school]}
      saving={create.isPending}
      proposalMode
      error={error}
      recoveryAction={
        pending ? (
          <Alert severity="warning" sx={{ mb: 2 }}>
            An earlier submission for {pending.input.name} may have succeeded.{" "}
            <Button
              disabled={create.isPending}
              onClick={() => void send(pending)}
            >
              Retry saved proposal
            </Button>
          </Alert>
        ) : null
      }
      onClose={onClose}
      onSubmit={submit}
    />
  );
}
