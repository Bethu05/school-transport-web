import { useInfiniteQuery } from "@tanstack/react-query";

import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Paper,
  Typography,
} from "@mui/material";

import {
  listPlatformTrackerAudit,
  listTenantTrackerAudit,
  type TrackerAuditEvent,
} from "./tracker-audit.api";

interface TrackerAuditHistoryProps {
  scope: "tenant" | "platform";
  vehicleId?: string;
  tenantId?: string;
}

function eventLabel(action: string): string {
  switch (action) {
    case "vehicle.tracker_change.requested":
      return "Change requested";
    case "vehicle.tracker_change.approved":
      return "Change approved";
    case "vehicle.tracker_change.rejected":
      return "Change rejected";
    default:
      return action;
  }
}

function metadataText(
  metadata: Record<string, unknown>,
  key: string,
): string | null {
  const value = metadata[key];
  return typeof value === "string" && value.length > 0 ? value : null;
}

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(date);
}

function AuditEventRow({
  event,
  showTenant,
}: {
  event: TrackerAuditEvent;
  showTenant: boolean;
}) {
  const registration = metadataText(event.metadata, "registrationNumber");
  const oldImei = metadataText(event.metadata, "currentGpsDeviceIdLast4");
  const newImei = metadataText(event.metadata, "proposedGpsDeviceIdLast4");
  const status = metadataText(event.metadata, "status");
  const actorName = metadataText(event.metadata, "actorName");
  const actorLabel = event.action.endsWith(".approved")
    ? "Approved by"
    : event.action.endsWith(".rejected")
      ? "Rejected by"
      : "Requested by";

  return (
    <Paper
      elevation={0}
      sx={{ px: 1.25, py: 0.75, border: "1px solid", borderColor: "divider" }}
    >
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: showTenant
            ? {
                xs: "minmax(0, 1fr) auto",
                md: "minmax(190px, 1.3fr) minmax(125px, 0.9fr) minmax(145px, 1fr) minmax(165px, 1.15fr) minmax(145px, 1fr) auto",
              }
            : {
                xs: "minmax(0, 1fr) auto",
                md: "minmax(210px, 1.4fr) minmax(150px, 1fr) minmax(170px, 1.2fr) minmax(155px, 1.1fr) auto",
              },
          alignItems: "center",
          gap: { xs: 0.5, md: 1.25 },
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="body2" sx={{ fontWeight: 800 }}>
            {eventLabel(event.action)}
            {registration ? ` | ${registration}` : ""}
          </Typography>
        </Box>
        {showTenant && (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ minWidth: 0 }}
          >
            {event.tenantName ?? "Unknown tenant"}
          </Typography>
        )}
        <Typography variant="caption" color="text.secondary">
          {formatDate(event.createdAt)}
        </Typography>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ minWidth: 0, overflowWrap: "anywhere" }}
        >
          {actorLabel}: {actorName ?? event.userId ?? "Unavailable"}
        </Typography>
        <Typography
          variant="caption"
          sx={{ fontFamily: "monospace", whiteSpace: "nowrap" }}
        >
          {oldImei || newImei
            ? `${oldImei ? `...${oldImei}` : "new"} -> ${newImei ? `...${newImei}` : "unchanged"}`
            : "No IMEI change"}
        </Typography>
        <Box sx={{ justifySelf: { xs: "end", md: "auto" } }}>
          {status && <Chip size="small" label={status} variant="outlined" />}
        </Box>
      </Box>
    </Paper>
  );
}

export function TrackerAuditHistory({
  scope,
  vehicleId,
  tenantId,
}: TrackerAuditHistoryProps) {
  const query = useInfiniteQuery({
    queryKey: ["tracker-audit-history", scope, tenantId, vehicleId],
    enabled: scope === "platform" || Boolean(tenantId && vehicleId),
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      scope === "platform"
        ? listPlatformTrackerAudit(pageParam)
        : listTenantTrackerAudit(tenantId!, vehicleId!, pageParam),
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });

  const events = query.data?.pages.flatMap((page) => page.items) ?? [];

  if (query.isLoading) {
    return (
      <Box sx={{ py: 3, display: "flex", justifyContent: "center" }}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  if (query.isError) {
    return (
      <Alert severity="error">
        {query.error instanceof Error
          ? query.error.message
          : "Tracker audit history could not be loaded."}
      </Alert>
    );
  }

  if (events.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        No tracker changes recorded.
      </Typography>
    );
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
      {events.map((event) => (
        <AuditEventRow
          key={event.id}
          event={event}
          showTenant={scope === "platform"}
        />
      ))}
      {query.hasNextPage && (
        <Button
          size="small"
          variant="outlined"
          onClick={() => void query.fetchNextPage()}
          disabled={query.isFetchingNextPage}
        >
          {query.isFetchingNextPage
            ? "Loading history..."
            : "Load older events"}
        </Button>
      )}
    </Box>
  );
}
