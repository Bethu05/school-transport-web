import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  TextField,
  Typography,
} from "@mui/material";
import { PaginationControls } from "../components/PaginationControls";
import {
  listStopProposals,
  reviewStopProposal,
  type StopProposal,
} from "./stop-proposals.api";

interface StopProposalsPanelProps {
  tenantId: string;
  schoolId: string;
  userId: string;
  canReview: boolean;
}

export function StopProposalsPanel({
  tenantId,
  schoolId,
  userId,
  canReview,
}: StopProposalsPanelProps) {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [target, setTarget] = useState<{
    proposal: StopProposal;
    decision: "approve" | "reject";
  } | null>(null);
  const [reason, setReason] = useState("");

  const proposals = useQuery({
    queryKey: ["stop-proposals", tenantId, schoolId, page, limit],
    queryFn: () => listStopProposals(tenantId, schoolId, page, limit),
  });
  const review = useMutation({
    mutationFn: (selection: NonNullable<typeof target>) =>
      reviewStopProposal(
        tenantId,
        selection.proposal.id,
        selection.decision,
        selection.decision === "reject" ? reason.trim() : undefined,
      ),
    onSuccess: async () => {
      setTarget(null);
      setReason("");
      setPage(1);
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["stop-proposals", tenantId],
        }),
        queryClient.invalidateQueries({ queryKey: ["stops-page", tenantId] }),
        queryClient.invalidateQueries({
          queryKey: ["stops-summary", tenantId],
        }),
        queryClient.invalidateQueries({ queryKey: ["stops", tenantId] }),
      ]);
    },
  });

  return (
    <Paper sx={{ p: 2, mb: 2 }}>
      <Typography variant="h6">Pending stop proposals</Typography>
      <Typography color="text.secondary" sx={{ mb: 2 }}>
        Another administrator or transport manager must review each proposal.
        Approved stops can be added to routes separately.
      </Typography>
      {proposals.isPending ? (
        <Typography>Loading proposals...</Typography>
      ) : null}
      {proposals.isError ? (
        <Alert severity="error">
          {proposals.error instanceof Error
            ? proposals.error.message
            : "Unable to load proposals."}
        </Alert>
      ) : null}
      {proposals.data?.items.length === 0 ? (
        <Typography>
          No pending proposals for this school or shared stops.
        </Typography>
      ) : null}
      {proposals.data?.items.map((proposal) => (
        <Box
          key={proposal.id}
          sx={{ py: 2, borderBottom: "1px solid", borderColor: "divider" }}
        >
          <Typography sx={{ fontWeight: 700 }}>{proposal.name}</Typography>
          <Typography variant="body2" color="text.secondary">
            {proposal.schoolId ? "School stop" : "Shared stop"} ·{" "}
            {proposal.latitude.toFixed(6)}, {proposal.longitude.toFixed(6)} ·{" "}
            {proposal.geofenceRadiusMeters} m
          </Typography>
          {proposal.code || proposal.address ? (
            <Typography variant="body2">
              {[proposal.code, proposal.address].filter(Boolean).join(" · ")}
            </Typography>
          ) : null}
          {proposal.requestedBy === userId ? (
            <Typography variant="body2">Awaiting another reviewer.</Typography>
          ) : canReview ? (
            <Box sx={{ display: "flex", gap: 1, mt: 1 }}>
              <Button
                onClick={() => {
                  review.reset();
                  setReason("");
                  setTarget({ proposal, decision: "approve" });
                }}
              >
                Approve
              </Button>
              <Button
                color="error"
                onClick={() => {
                  review.reset();
                  setReason("");
                  setTarget({ proposal, decision: "reject" });
                }}
              >
                Reject
              </Button>
            </Box>
          ) : null}
        </Box>
      ))}
      {proposals.data ? (
        <PaginationControls
          page={page}
          limit={limit}
          total={proposals.data.total}
          totalPages={proposals.data.totalPages}
          onPageChange={setPage}
          onLimitChange={(value) => {
            setLimit(value);
            setPage(1);
          }}
        />
      ) : null}
      <Dialog
        open={target !== null}
        onClose={() => !review.isPending && setTarget(null)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          {target?.decision === "approve" ? "Approve" : "Reject"}{" "}
          {target?.proposal.name}?
        </DialogTitle>
        <DialogContent>
          {review.isError ? (
            <Alert severity="error" sx={{ mb: 2 }}>
              {review.error instanceof Error
                ? review.error.message
                : "Review failed."}
            </Alert>
          ) : null}
          {target?.decision === "reject" ? (
            <TextField
              label="Reason for rejection"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              fullWidth
              multiline
              required
              slotProps={{ htmlInput: { maxLength: 500 } }}
            />
          ) : (
            <Typography>
              The stop will become active but will not be added to a route.
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button disabled={review.isPending} onClick={() => setTarget(null)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={
              review.isPending ||
              (target?.decision === "reject" && !reason.trim())
            }
            onClick={() => {
              if (target) review.mutate(target);
            }}
          >
            {review.isPending ? "Saving..." : "Confirm"}
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}
