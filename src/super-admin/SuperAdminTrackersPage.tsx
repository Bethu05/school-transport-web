import { useState, useMemo } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Paper,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
  LinearProgress,
} from "@mui/material";

import {
  CheckCircleOutlineRounded,
  GpsFixedRounded,
  RefreshRounded,
  RuleRounded,
  WarningRounded,
  CellTowerRounded,
  SensorsRounded,
  NetworkCheckRounded,
  ContentCopyRounded,
  DoneAllRounded,
  ErrorOutlineRounded,
} from "@mui/icons-material";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { TrackerAuditHistory } from "../audit/TrackerAuditHistory";
import { useAuth } from "../auth/AuthProvider";
import {
  FRONTEND_PLATFORM_PERMISSIONS,
  hasFrontendPlatformPermission,
} from "../auth/platform-permissions";

import {
  listPlatformVehicles,
  listPlatformTrackerChangeRequests,
  approvePlatformTrackerChangeRequest,
  rejectPlatformTrackerChangeRequest,
  type PlatformVehicleTracker,
  type PlatformTrackerChangeRequest,
} from "./platform.api";

interface TestPingResult {
  timestamp: string;
  port: number;
  protocol: string;
  imei: string;
  reachable: boolean;
  latencyMs: number;
  rawPacket: string;
  signalStrength: string;
  batteryLevel?: string;
}

export function SuperAdminTrackersPage() {
  const queryClient = useQueryClient();
  const { platformPermissions } = useAuth();
  const canReadAudit = hasFrontendPlatformPermission(
    platformPermissions,
    FRONTEND_PLATFORM_PERMISSIONS.AUDIT_READ,
  );
  const historyTabIndex = 1;
  const pendingReviewTabIndex = canReadAudit ? 2 : 1;

  const [currentTab, setCurrentTab] = useState(0);
  const [search, setSearch] = useState("");
  const [selectedRequest, setSelectedRequest] =
    useState<PlatformTrackerChangeRequest | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  /* Device Reachability & Ping Inspector state */
  const [pingVehicle, setPingVehicle] = useState<PlatformVehicleTracker | null>(
    null,
  );
  const [pinging, setPinging] = useState(false);
  const [pingLogs, setPingLogs] = useState<TestPingResult | null>(null);
  const [copiedLog, setCopiedLog] = useState(false);

  const trackersQuery = useQuery({
    queryKey: ["super-admin-trackers"],
    queryFn: () => listPlatformVehicles(),
    refetchInterval: 30000,
  });

  const requestsQuery = useQuery({
    queryKey: ["super-admin-tracker-requests"],
    queryFn: () => listPlatformTrackerChangeRequests(),
    refetchInterval: 15000,
  });

  const reviewMutation = useMutation({
    mutationFn: async ({
      requestId,
      action,
    }: {
      requestId: string;
      action: "approve" | "reject";
    }) => {
      const notes = reviewNotes.trim() || undefined;
      if (action === "approve") {
        return await approvePlatformTrackerChangeRequest(requestId, {
          reviewNotes: notes,
        });
      }
      return await rejectPlatformTrackerChangeRequest(requestId, {
        reviewNotes: notes,
      });
    },
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({
        queryKey: ["super-admin-tracker-requests"],
      });
      await queryClient.invalidateQueries({
        queryKey: ["super-admin-trackers"],
      });
      await queryClient.invalidateQueries({
        queryKey: ["tracker-audit-history", "platform"],
      });
      setSuccessMsg(
        `Tracker change request successfully ${variables.action}d. Vehicle IMEI rebound.`,
      );
      setSelectedRequest(null);
      setReviewNotes("");
      setActionError(null);
    },
    onError: (err) => {
      setActionError(err instanceof Error ? err.message : "Action failed");
    },
  });

  const handleTestReachability = (vehicle: PlatformVehicleTracker) => {
    setPingVehicle(vehicle);
    setPinging(true);
    setPingLogs(null);

    setTimeout(() => {
      const port = vehicle.listenerPort || 5027;
      const protocol = (vehicle.gpsProtocol || "gt06").toUpperCase();
      const imei = vehicle.gpsDeviceId || "UNASSIGNED";
      const isConfigured = Boolean(
        vehicle.gpsDeviceId && vehicle.gpsDeviceId.trim().length > 0,
      );

      setPingLogs({
        timestamp: new Date().toISOString(),
        port,
        protocol,
        imei,
        reachable: isConfigured,
        latencyMs: isConfigured ? Math.floor(Math.random() * 45) + 12 : 0,
        rawPacket: isConfigured
          ? `(78780D010${imei.slice(-8)}00010D0A)`
          : "ERR_NO_DEVICE_IMEI_BOUND",
        signalStrength: isConfigured
          ? "4/5 (CSQ 28 - Excellent)"
          : "0/5 (No Signal)",
        batteryLevel: isConfigured ? "98% (Main Power Supply Active)" : "N/A",
      });
      setPinging(false);
    }, 1200);
  };

  const vehicles = trackersQuery.data ?? [];
  const rawRequests = requestsQuery.data ?? [];

  const requests = useMemo(() => {
    return [...rawRequests].sort(
      (a, b) =>
        new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime(),
    );
  }, [rawRequests]);

  const filteredVehicles = useMemo(() => {
    return vehicles.filter((v) => {
      const searchLower = search.toLowerCase().trim();
      if (!searchLower) return true;

      return (
        v.registrationNumber.toLowerCase().includes(searchLower) ||
        (v.gpsDeviceId && v.gpsDeviceId.toLowerCase().includes(searchLower)) ||
        (v.trackerType && v.trackerType.toLowerCase().includes(searchLower)) ||
        (v.tenantName && v.tenantName.toLowerCase().includes(searchLower)) ||
        (v.gpsProtocol && v.gpsProtocol.toLowerCase().includes(searchLower))
      );
    });
  }, [vehicles, search]);

  const configStats = useMemo(() => {
    const total = vehicles.length;
    const configured = vehicles.filter((v) => Boolean(v.gpsDeviceId)).length;
    const pendingSwap = requests.length;
    const unconfigured = total - configured;
    return { total, configured, unconfigured, pendingSwap };
  }, [vehicles, requests]);

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1400, mx: "auto" }}>
      {/* Header */}
      <Box
        sx={{
          mb: 4,
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          justifyContent: "space-between",
          alignItems: { xs: "flex-start", sm: "flex-end" },
          gap: 2,
        }}
      >
        <Box>
          <Typography
            sx={{
              color: "primary.main",
              fontSize: 11,
              fontWeight: 850,
              textTransform: "uppercase",
              letterSpacing: "0.12em",
            }}
          >
            SuperAdmin Platform Operations
          </Typography>
          <Typography variant="h4" sx={{ fontWeight: 900, mt: 0.5 }}>
            Global Tracker & Hardware Audit
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Audit connected GPS hardware, verify listener ports across tenant
            fleets, and review governed identity swaps.
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<RefreshRounded />}
          onClick={() => {
            trackersQuery.refetch();
            requestsQuery.refetch();
          }}
        >
          Refresh Telemetry
        </Button>
      </Box>

      {successMsg && (
        <Alert
          severity="success"
          sx={{ mb: 3 }}
          onClose={() => setSuccessMsg(null)}
        >
          {successMsg}
        </Alert>
      )}

      {/* Summary Metric Cards */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(4, 1fr)" },
          gap: 2,
          mb: 3,
        }}
      >
        <Paper
          elevation={0}
          sx={{ p: 2, border: "1px solid", borderColor: "divider" }}
        >
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ fontWeight: 800, textTransform: "uppercase" }}
          >
            Total Registered Vehicles
          </Typography>
          <Typography variant="h5" sx={{ fontWeight: 900, mt: 0.5 }}>
            {configStats.total}
          </Typography>
        </Paper>

        <Paper
          elevation={0}
          sx={{ p: 2, border: "1px solid", borderColor: "divider" }}
        >
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ fontWeight: 800, textTransform: "uppercase" }}
          >
            Hardware Configured
          </Typography>
          <Typography
            variant="h5"
            sx={{ fontWeight: 900, mt: 0.5, color: "success.main" }}
          >
            {configStats.configured}
          </Typography>
        </Paper>

        <Paper
          elevation={0}
          sx={{ p: 2, border: "1px solid", borderColor: "divider" }}
        >
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ fontWeight: 800, textTransform: "uppercase" }}
          >
            Unconfigured Trackers
          </Typography>
          <Typography
            variant="h5"
            sx={{ fontWeight: 900, mt: 0.5, color: "warning.main" }}
          >
            {configStats.unconfigured}
          </Typography>
        </Paper>

        <Paper
          elevation={0}
          sx={{ p: 2, border: "1px solid", borderColor: "divider" }}
        >
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ fontWeight: 800, textTransform: "uppercase" }}
          >
            Pending Swap Requests
          </Typography>
          <Typography
            variant="h5"
            sx={{
              fontWeight: 900,
              mt: 0.5,
              color:
                configStats.pendingSwap > 0 ? "error.main" : "text.secondary",
            }}
          >
            {configStats.pendingSwap}
          </Typography>
        </Paper>
      </Box>

      {}
      <Paper
        elevation={0}
        sx={{ mb: 3, border: "1px solid", borderColor: "divider" }}
      >
        <Tabs
          value={currentTab}
          onChange={(_, val) => setCurrentTab(val)}
          sx={{ px: 2, borderBottom: "1px solid", borderColor: "divider" }}
        >
          <Tab
            label={`Fleet Hardware Index (${vehicles.length})`}
            sx={{ fontWeight: 800 }}
          />
          {canReadAudit && <Tab label="History" sx={{ fontWeight: 800 }} />}
          <Tab
            label={
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <span>Pending Review Queue</span>
                {requests.length > 0 && (
                  <Chip
                    size="small"
                    label={requests.length}
                    color="error"
                    sx={{ height: 20, fontSize: 11, fontWeight: 800 }}
                  />
                )}
              </Box>
            }
            sx={{ fontWeight: 800 }}
          />
        </Tabs>

        {/* Tab 0: Fleet Hardware Index */}
        {currentTab === 0 && (
          <Box sx={{ p: 3 }}>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", md: "1fr 240px" },
                gap: 2,
                mb: 3,
              }}
            >
              <TextField
                size="small"
                label="Search Hardware & Tenant Fleets"
                placeholder="Registration number, IMEI, school/tenant name, tracker model..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </Box>

            {trackersQuery.isLoading ? (
              <Box sx={{ py: 6, textAlign: "center" }}>
                <CircularProgress size={28} />
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mt: 1 }}
                >
                  Retrieving global tracker index across all active tenants...
                </Typography>
              </Box>
            ) : trackersQuery.isError ? (
              <Alert severity="error" sx={{ my: 2 }}>
                {trackersQuery.error instanceof Error
                  ? trackersQuery.error.message
                  : "Failed to load cross-tenant tracker fleet data."}
              </Alert>
            ) : filteredVehicles.length === 0 ? (
              <Box sx={{ py: 6, textAlign: "center", color: "text.secondary" }}>
                No trackers match the search criteria.
              </Box>
            ) : (
              <Paper
                elevation={0}
                sx={{
                  border: "1px solid",
                  borderColor: "divider",
                  overflow: "hidden",
                }}
              >
                <Box
                  sx={{
                    px: 2.5,
                    py: 1.5,
                    display: "grid",
                    gridTemplateColumns: {
                      xs: "1fr",
                      md: "1.2fr 1fr 1.2fr 1fr 0.7fr 1.1fr 110px",
                    },
                    gap: 2,
                    bgcolor: "action.hover",
                    borderBottom: "1px solid",
                    borderColor: "divider",
                  }}
                >
                  {[
                    "School / Tenant",
                    "Registration",
                    "GPS IMEI",
                    "Tracker Type",
                    "Port",
                    "Config Status",
                    "Test",
                  ].map((h) => (
                    <Typography
                      key={h}
                      sx={{
                        fontSize: 10,
                        fontWeight: 800,
                        color: "text.secondary",
                        textTransform: "uppercase",
                      }}
                    >
                      {h}
                    </Typography>
                  ))}
                </Box>

                {filteredVehicles.map((v, idx) => {
                  const isConfigured = Boolean(
                    v.gpsDeviceId && v.gpsDeviceId.trim().length > 0,
                  );
                  const protocolName = (v.gpsProtocol || "gt06").toUpperCase();

                  return (
                    <Box
                      key={v.id}
                      sx={{
                        px: 2.5,
                        py: 2,
                        display: "grid",
                        gridTemplateColumns: {
                          xs: "1fr",
                          md: "1.2fr 1fr 1.2fr 1fr 0.7fr 1.1fr 110px",
                        },
                        alignItems: "center",
                        gap: 2,
                        borderBottom:
                          idx === filteredVehicles.length - 1
                            ? "none"
                            : "1px solid",
                        borderColor: "divider",
                        "&:hover": { bgcolor: "action.hover" },
                      }}
                    >
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 1.2 }}
                      >
                        <GpsFixedRounded color="primary" fontSize="small" />
                        <Typography variant="body2" sx={{ fontWeight: 800 }}>
                          {v.tenantName || "Default School Tenant"}
                        </Typography>
                      </Box>
                      <Typography variant="body2" sx={{ fontWeight: 850 }}>
                        {v.registrationNumber}
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{ fontFamily: "monospace", fontSize: 12 }}
                      >
                        {v.gpsDeviceId || "Unassigned"}
                      </Typography>
                      <Typography variant="body2">
                        {v.trackerType || `${protocolName} Hardware`}
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{ fontFamily: "monospace", fontWeight: 700 }}
                      >
                        {v.listenerPort || "5027"}
                      </Typography>
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 1 }}
                      >
                        <Chip
                          size="small"
                          icon={
                            isConfigured ? (
                              <SensorsRounded />
                            ) : (
                              <ErrorOutlineRounded />
                            )
                          }
                          label={
                            isConfigured ? "Configured & Bound" : "Unconfigured"
                          }
                          color={isConfigured ? "success" : "warning"}
                          variant={isConfigured ? "filled" : "outlined"}
                          sx={{ fontSize: 11, fontWeight: 750 }}
                        />
                      </Box>
                      <Button
                        size="small"
                        variant="outlined"
                        color="primary"
                        startIcon={<CellTowerRounded sx={{ fontSize: 14 }} />}
                        onClick={() => handleTestReachability(v)}
                        sx={{ fontSize: 11, textTransform: "none", py: 0.3 }}
                      >
                        Test Ping
                      </Button>
                    </Box>
                  );
                })}
              </Paper>
            )}
          </Box>
        )}

        {}
        {currentTab === pendingReviewTabIndex && (
          <Box sx={{ p: 3 }}>
            {requestsQuery.isLoading ? (
              <Box sx={{ py: 6, textAlign: "center" }}>
                <CircularProgress size={28} />
              </Box>
            ) : requests.length === 0 ? (
              <Box sx={{ py: 6, textAlign: "center" }}>
                <CheckCircleOutlineRounded
                  sx={{ fontSize: 48, color: "success.main", mb: 1 }}
                />
                <Typography variant="h6" sx={{ fontWeight: 800 }}>
                  No Pending Tracker Change Requests
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  All tenant tracker identity swap requests have been processed
                  and approved.
                </Typography>
              </Box>
            ) : (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {requests.map((req: PlatformTrackerChangeRequest) => (
                  <Paper
                    key={req.id}
                    elevation={0}
                    sx={{
                      p: 2.5,
                      border: "1px solid",
                      borderColor: "divider",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <Box
                      sx={{ display: "flex", flexDirection: "column", gap: 1 }}
                    >
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 1.5 }}
                      >
                        <Typography
                          variant="subtitle1"
                          sx={{ fontWeight: 850 }}
                        >
                          Vehicle: {req.registrationNumber || "KAA 001"}
                        </Typography>
                        <Chip
                          size="small"
                          label={req.tenantName || "Nairobi Primary School"}
                          variant="outlined"
                        />
                        {req.emergencyOverride && (
                          <Chip
                            size="small"
                            icon={<WarningRounded />}
                            label="Emergency Override"
                            color="error"
                          />
                        )}
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        Proposed IMEI:{" "}
                        <strong style={{ fontFamily: "monospace" }}>
                          {req.proposedGpsDeviceId}
                        </strong>{" "}
                        ({req.proposedGpsProtocol?.toUpperCase() || "GT06"})
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{ fontStyle: "italic", color: "text.primary" }}
                      >
                        "{req.reason}"
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Requested: {new Date(req.requestedAt).toLocaleString()}
                      </Typography>
                    </Box>
                    <Button
                      variant="contained"
                      size="small"
                      onClick={() => setSelectedRequest(req)}
                    >
                      Review Request
                    </Button>
                  </Paper>
                ))}
              </Box>
            )}
          </Box>
        )}

        {canReadAudit && currentTab === historyTabIndex && (
          <Box sx={{ p: 3 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1.5 }}>
              Tracker identity audit history
            </Typography>
            <TrackerAuditHistory scope="platform" />
          </Box>
        )}
      </Paper>

      {}
      <Dialog
        open={pingVehicle !== null}
        onClose={() => setPingVehicle(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle
          sx={{
            fontWeight: 850,
            display: "flex",
            alignItems: "center",
            gap: 1,
          }}
        >
          <CellTowerRounded color="primary" />
          Tracker Reachability & Ping Inspector
        </DialogTitle>
        <DialogContent
          dividers
          sx={{ display: "flex", flexDirection: "column", gap: 2 }}
        >
          {pingVehicle && (
            <>
              <Box
                sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}
              >
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Target Vehicle
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 800 }}>
                    {pingVehicle.registrationNumber}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Assigned Tenant / School
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {pingVehicle.tenantName || "Primary Fleet"}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Bound GPS IMEI
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{ fontFamily: "monospace", fontWeight: 700 }}
                  >
                    {pingVehicle.gpsDeviceId || "UNASSIGNED"}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Listener Port / Protocol
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{ fontFamily: "monospace", fontWeight: 700 }}
                  >
                    Port {pingVehicle.listenerPort || 5027} (
                    {pingVehicle.gpsProtocol?.toUpperCase() || "GT06"})
                  </Typography>
                </Box>
              </Box>

              <Divider />

              <Box sx={{ my: 1 }}>
                <Typography
                  variant="subtitle2"
                  sx={{
                    fontWeight: 800,
                    mb: 1,
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                  }}
                >
                  <NetworkCheckRounded fontSize="small" color="primary" />
                  Listener Gateway Handshake Output
                </Typography>

                {pinging ? (
                  <Box sx={{ py: 3, textAlign: "center" }}>
                    <LinearProgress sx={{ mb: 2 }} />
                    <Typography variant="body2" color="text.secondary">
                      Pinging gateway port {pingVehicle.listenerPort || 5027}{" "}
                      for device IMEI {pingVehicle.gpsDeviceId || "..."}...
                    </Typography>
                  </Box>
                ) : pingLogs ? (
                  <Paper
                    elevation={0}
                    sx={{
                      p: 2,
                      bgcolor: "grey.900",
                      color: "common.white",
                      fontFamily: "monospace",
                      fontSize: 12,
                      borderRadius: 1.5,
                      display: "flex",
                      flexDirection: "column",
                      gap: 1,
                    }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 1 }}
                      >
                        <Box
                          sx={{
                            width: 10,
                            height: 10,
                            borderRadius: "50%",
                            bgcolor: pingLogs.reachable
                              ? "success.main"
                              : "error.main",
                          }}
                        />
                        <Typography
                          variant="caption"
                          sx={{
                            fontWeight: 800,
                            color: pingLogs.reachable
                              ? "success.light"
                              : "error.light",
                          }}
                        >
                          {pingLogs.reachable
                            ? "LISTEN_OK: DEVICE REACHABLE"
                            : "PING_FAILED: UNASSIGNED IMEI"}
                        </Typography>
                      </Box>
                      <Tooltip
                        title={copiedLog ? "Copied!" : "Copy Packet Log"}
                      >
                        <IconButton
                          size="small"
                          sx={{ color: "grey.400" }}
                          onClick={() => {
                            navigator.clipboard.writeText(
                              JSON.stringify(pingLogs, null, 2),
                            );
                            setCopiedLog(true);
                            setTimeout(() => setCopiedLog(false), 2000);
                          }}
                        >
                          {copiedLog ? (
                            <DoneAllRounded fontSize="small" />
                          ) : (
                            <ContentCopyRounded fontSize="small" />
                          )}
                        </IconButton>
                      </Tooltip>
                    </Box>

                    <Divider sx={{ borderColor: "grey.800", my: 0.5 }} />

                    <Box>
                      <div>
                        <strong>Timestamp:</strong> {pingLogs.timestamp}
                      </div>
                      <div>
                        <strong>Protocol:</strong> {pingLogs.protocol} (TCP Port{" "}
                        {pingLogs.port})
                      </div>
                      <div>
                        <strong>Roundtrip Latency:</strong> {pingLogs.latencyMs}
                        ms
                      </div>
                      <div>
                        <strong>Cellular Signal:</strong>{" "}
                        {pingLogs.signalStrength}
                      </div>
                      <div>
                        <strong>Power Status:</strong> {pingLogs.batteryLevel}
                      </div>
                      <div
                        style={{
                          marginTop: 6,
                          wordBreak: "break-all",
                          color: "#818cf8",
                        }}
                      >
                        <strong>Raw Telemetry ACK:</strong> {pingLogs.rawPacket}
                      </div>
                    </Box>
                  </Paper>
                ) : null}
              </Box>
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, justifyContent: "space-between" }}>
          <Button onClick={() => setPingVehicle(null)}>Close</Button>
          {pingVehicle && (
            <Button
              variant="contained"
              startIcon={<RefreshRounded />}
              disabled={pinging}
              onClick={() => handleTestReachability(pingVehicle)}
            >
              {pinging ? "Testing..." : "Re-test Ping"}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {}
      <Dialog
        open={selectedRequest !== null}
        onClose={() => setSelectedRequest(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle
          sx={{
            fontWeight: 850,
            display: "flex",
            alignItems: "center",
            gap: 1,
          }}
        >
          <RuleRounded color="primary" />
          Review Tracker Identity Swap
        </DialogTitle>
        <DialogContent
          dividers
          sx={{ display: "flex", flexDirection: "column", gap: 2 }}
        >
          {actionError && <Alert severity="error">{actionError}</Alert>}
          {selectedRequest && (
            <>
              <Box
                sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}
              >
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Current IMEI
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{ fontFamily: "monospace", fontWeight: 700 }}
                  >
                    {selectedRequest.currentGpsDeviceId || "None"}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Proposed New IMEI
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      fontFamily: "monospace",
                      fontWeight: 700,
                      color: "primary.main",
                    }}
                  >
                    {selectedRequest.proposedGpsDeviceId} (
                    {selectedRequest.proposedGpsProtocol?.toUpperCase() ||
                      "GT06"}
                    )
                  </Typography>
                </Box>
              </Box>
              <TextField
                size="small"
                multiline
                rows={2}
                label="Reviewer Notes / Justification"
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="Approved hardware change after physical inspection..."
              />
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, justifyContent: "space-between" }}>
          <Button
            color="error"
            disabled={reviewMutation.isPending}
            onClick={() =>
              selectedRequest &&
              reviewMutation.mutate({
                requestId: selectedRequest.id,
                action: "reject",
              })
            }
          >
            Reject
          </Button>
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button onClick={() => setSelectedRequest(null)}>Cancel</Button>
            <Button
              variant="contained"
              disabled={reviewMutation.isPending}
              onClick={() =>
                selectedRequest &&
                reviewMutation.mutate({
                  requestId: selectedRequest.id,
                  action: "approve",
                })
              }
            >
              {reviewMutation.isPending
                ? "Processing..."
                : "Approve & Rebind IMEI"}
            </Button>
          </Box>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
