import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  TextField,
  Typography,
} from "@mui/material";

import {
  CheckCircleOutlineRounded,
  ErrorOutlineRounded,
  InfoOutlined,
  PublishedWithChangesRounded,
  RuleRounded,
  SpeedRounded,
} from "@mui/icons-material";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../auth/AuthProvider";
import { TrackerAuditHistory } from "../audit/TrackerAuditHistory";
import {
  getTrackingReadiness,
  requestTrackerChange,
  type RequestTrackerChangeInput,
  type TrackingHealthStatus,
  type Vehicle,
} from "./vehicles.api";

interface VehicleTrackingReadinessDialogProps {
  open: boolean;
  vehicle: Vehicle | null;
  onClose: () => void;
}

function getHealthBadgeProps(status: TrackingHealthStatus): {
  label: string;
  color: "success" | "warning" | "error" | "info" | "default" | "secondary";
} {
  switch (status) {
    case "online":
      return { label: "Online", color: "success" };
    case "delayed":
      return { label: "Delayed Signal", color: "warning" };
    case "stale":
      return { label: "Stale (>30m)", color: "warning" };
    case "offline":
      return { label: "Offline (>24h)", color: "error" };
    case "configured_no_telemetry":
      return { label: "No Telemetry Yet", color: "info" };
    case "change_pending":
      return { label: "Change Pending", color: "secondary" };
    case "unconfigured":
    default:
      return { label: "Unconfigured", color: "default" };
  }
}

export function VehicleTrackingReadinessDialog({
  open,
  vehicle,
  onClose,
}: VehicleTrackingReadinessDialogProps) {
  const { tenant } = useAuth();
  const queryClient = useQueryClient();
  const tenantId = tenant?.tenantId;

  const [showChangeForm, setShowChangeForm] = useState(false);
  const [proposedProtocol, setProposedProtocol] = useState("gt06");
  const [proposedImei, setProposedImei] = useState("");
  const [reason, setReason] = useState("");
  const [emergencyOverride, setEmergencyOverride] = useState(false);
  const [emergencyReason, setEmergencyReason] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const readinessQuery = useQuery({
    queryKey: ["vehicle-readiness", tenantId, vehicle?.id],
    enabled: Boolean(open && tenantId && vehicle?.id),
    queryFn: async () => {
      if (!tenantId || !vehicle?.id) {
        throw new Error("Vehicle context unavailable");
      }
      return getTrackingReadiness(tenantId, vehicle.id);
    },
  });

  const changeMutation = useMutation({
    mutationFn: async (input: RequestTrackerChangeInput) => {
      if (!tenantId || !vehicle?.id) {
        throw new Error("Vehicle context unavailable");
      }
      return requestTrackerChange(tenantId, vehicle.id, input);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["vehicle-readiness", tenantId, vehicle?.id],
      });
      await queryClient.invalidateQueries({
        queryKey: ["tracker-audit-history", "tenant", tenantId, vehicle?.id],
      });
      await queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      setSuccessMessage(
        emergencyOverride
          ? "Emergency tracker change request submitted! Sent for priority platform approval."
          : "Tracker identity change request submitted! Enforced cooling period active.",
      );
      setShowChangeForm(false);
      setProposedImei("");
      setReason("");
      setEmergencyOverride(false);
      setEmergencyReason("");
      setFormError(null);
    },
    onError: (err) => {
      setFormError(
        err instanceof Error ? err.message : "Failed to submit change request",
      );
    },
  });

  function handleSubmitChange(e: React.FormEvent): void {
    e.preventDefault();
    setFormError(null);

    if (!proposedImei.trim()) {
      setFormError("Proposed GPS IMEI / Device ID is required.");
      return;
    }

    if (reason.trim().length < 5) {
      setFormError(
        "Please enter a clear replacement reason (at least 5 characters).",
      );
      return;
    }

    if (emergencyOverride && emergencyReason.trim().length < 3) {
      setFormError("Emergency override requires an emergency reason.");
      return;
    }

    changeMutation.mutate({
      proposedGpsProtocol: proposedProtocol,
      proposedGpsDeviceId: proposedImei.trim(),
      reason: reason.trim(),
      emergencyOverride,
      emergencyReason: emergencyOverride ? emergencyReason.trim() : undefined,
    });
  }

  if (!vehicle) return null;

  const readiness = readinessQuery.data;
  const badge = getHealthBadgeProps(readiness?.healthStatus ?? "unconfigured");

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle
        sx={{
          fontWeight: 850,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <SpeedRounded color="primary" />
          <Typography variant="h6" sx={{ fontWeight: 850 }}>
            Tracking Readiness Inspector
          </Typography>
        </Box>
        <Chip size="small" label={badge.label} color={badge.color} />
      </DialogTitle>

      <DialogContent
        dividers
        sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}
      >
        {successMessage && (
          <Alert severity="success" onClose={() => setSuccessMessage(null)}>
            {successMessage}
          </Alert>
        )}

        {readinessQuery.isLoading && (
          <Box sx={{ py: 4, textAlign: "center" }}>
            <CircularProgress size={28} />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Evaluating operational tracking gates...
            </Typography>
          </Box>
        )}

        {readinessQuery.isError && (
          <Alert severity="error">
            Failed to load tracking readiness for {vehicle.registrationNumber}.
          </Alert>
        )}

        {readiness && (
          <>
            <Paper
              elevation={0}
              sx={{
                p: 2,
                bgcolor: "action.hover",
                border: "1px solid",
                borderColor: "divider",
              }}
            >
              <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                {vehicle.registrationNumber}{" "}
                {vehicle.fleetNumber ? `(${vehicle.fleetNumber})` : ""}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Vehicle ID: {readiness.vehicleId} • Capacity:{" "}
                {vehicle.seatCapacity} seats
              </Typography>
            </Paper>

            <Box>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{
                  fontWeight: 800,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                }}
              >
                Operational Gate Checklist
              </Typography>

              <Box
                sx={{ mt: 1, display: "flex", flexDirection: "column", gap: 1 }}
              >
                {[
                  {
                    label: "Vehicle Record Saved in Tenant",
                    passed: readiness.vehicleSaved,
                    detail: "Entity verified",
                  },
                  {
                    label: "School Assignment",
                    passed: readiness.schoolAssigned,
                    detail: readiness.schoolAssigned
                      ? "Assigned"
                      : "Unassigned",
                  },
                  {
                    label: "Tracking Mode Configured",
                    passed: readiness.trackingMode !== "unconfigured",
                    detail: readiness.trackingMode.toUpperCase(),
                  },
                  {
                    label: "Hardware Credential Valid",
                    passed: readiness.credentialValid,
                    detail: readiness.credentialValid ? "Valid" : "Incomplete",
                  },
                  {
                    label: "Telemetry Fresh (<5 mins)",
                    passed: readiness.telemetryFresh,
                    detail: readiness.lastTelemetryAt
                      ? `Last ping: ${new Date(readiness.lastTelemetryAt).toLocaleTimeString()}`
                      : "No ping received",
                  },
                ].map((item) => (
                  <Paper
                    key={item.label}
                    elevation={0}
                    sx={{
                      p: 1.2,
                      px: 2,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      border: "1px solid",
                      borderColor: "divider",
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      {item.passed ? (
                        <CheckCircleOutlineRounded
                          color="success"
                          fontSize="small"
                        />
                      ) : (
                        <ErrorOutlineRounded color="error" fontSize="small" />
                      )}
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {item.label}
                      </Typography>
                    </Box>
                    <Typography
                      variant="caption"
                      sx={{
                        fontWeight: 700,
                        color: item.passed ? "success.main" : "text.secondary",
                      }}
                    >
                      {item.detail}
                    </Typography>
                  </Paper>
                ))}
              </Box>
            </Box>

            <Divider />
            <Box
              sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}
            >
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Current GPS Protocol
                </Typography>
                <Typography
                  variant="body2"
                  sx={{ fontWeight: 700, textTransform: "uppercase" }}
                >
                  {readiness.details.gpsProtocol || "N/A"}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Assigned GPS IMEI / ID
                </Typography>
                <Typography
                  variant="body2"
                  sx={{ fontWeight: 700, fontFamily: "monospace" }}
                >
                  {readiness.details.gpsDeviceId || "Unassigned"}
                </Typography>
              </Box>
            </Box>

            <Divider />
            {readiness.hasPendingChangeRequest ? (
              <Alert severity="warning" icon={<PublishedWithChangesRounded />}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                  Tracker Identity Change Request Pending
                </Typography>
                <Typography variant="caption">
                  A change request is currently awaiting platform review or
                  cooling period completion.
                </Typography>
              </Alert>
            ) : !showChangeForm ? (
              <Button
                variant="outlined"
                color="primary"
                fullWidth
                startIcon={<PublishedWithChangesRounded />}
                onClick={() => setShowChangeForm(true)}
              >
                Request Governed Tracker Swap (IMEI)
              </Button>
            ) : (
              <Paper
                component="form"
                onSubmit={handleSubmitChange}
                elevation={0}
                sx={{
                  p: 2,
                  border: "1px solid",
                  borderColor: "primary.main",
                  borderRadius: 2,
                  display: "flex",
                  flexDirection: "column",
                  gap: 2,
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <RuleRounded color="primary" fontSize="small" />
                  <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                    Governed Tracker Identity Swap Request
                  </Typography>
                </Box>

                <Alert severity="info" icon={<InfoOutlined fontSize="small" />}>
                  Direct IMEI overwrites are blocked to prevent device spoofing.
                  Swaps require platform audit.
                </Alert>

                {formError && <Alert severity="error">{formError}</Alert>}

                <FormControl size="small" fullWidth>
                  <InputLabel id="protocol-label">Proposed Protocol</InputLabel>
                  <Select
                    labelId="protocol-label"
                    label="Proposed Protocol"
                    value={proposedProtocol}
                    onChange={(e) => setProposedProtocol(e.target.value)}
                  >
                    <MenuItem value="gt06">GT06 / Concox</MenuItem>
                    <MenuItem value="teltonika">Teltonika</MenuItem>
                    <MenuItem value="ruptela">Ruptela</MenuItem>
                    <MenuItem value="gl200">Queclink GL200</MenuItem>
                    <MenuItem value="suntech">Suntech</MenuItem>
                  </Select>
                </FormControl>

                <TextField
                  size="small"
                  fullWidth
                  label="Proposed New GPS IMEI *"
                  placeholder="e.g. 863835041239999"
                  value={proposedImei}
                  onChange={(e) => setProposedImei(e.target.value)}
                />

                <TextField
                  size="small"
                  fullWidth
                  multiline
                  rows={2}
                  label="Reason for Swap *"
                  placeholder="Describe hardware failure, upgrade, or replacement..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />

                <Box
                  sx={{ borderTop: "1px solid", borderColor: "divider", pt: 1 }}
                >
                  <FormControlLabel
                    control={
                      <Checkbox
                        size="small"
                        checked={emergencyOverride}
                        onChange={(e) => setEmergencyOverride(e.target.checked)}
                      />
                    }
                    label={
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>
                        Request Emergency Cooling Period Override
                      </Typography>
                    }
                  />

                  {emergencyOverride && (
                    <TextField
                      sx={{ mt: 1 }}
                      size="small"
                      fullWidth
                      label="Emergency Justification *"
                      placeholder="e.g. Bus breakdown during active pickup - immediate swap required"
                      value={emergencyReason}
                      onChange={(e) => setEmergencyReason(e.target.value)}
                    />
                  )}
                </Box>

                <Box
                  sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }}
                >
                  <Button size="small" onClick={() => setShowChangeForm(false)}>
                    Cancel
                  </Button>
                  <Button
                    size="small"
                    variant="contained"
                    type="submit"
                    disabled={changeMutation.isPending}
                  >
                    {changeMutation.isPending
                      ? "Submitting..."
                      : "Submit for Platform Review"}
                  </Button>
                </Box>
              </Paper>
            )}

            <Divider />
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>
                Tracker change history
              </Typography>
              <TrackerAuditHistory
                scope="tenant"
                tenantId={tenantId}
                vehicleId={vehicle.id}
              />
            </Box>
          </>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose}>Close Inspector</Button>
      </DialogActions>
    </Dialog>
  );
}
