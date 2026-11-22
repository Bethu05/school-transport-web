import { apiRequest } from "../api/client";
import type { CreateStopInput } from "./stops.api";

export interface StopProposal {
  id: string;
  schoolId: string | null;
  requestedBy: string;
  name: string;
  code: string | null;
  address: string | null;
  latitude: number;
  longitude: number;
  geofenceRadiusMeters: number;
  status: "pending" | "approved" | "rejected";
  reviewedBy: string | null;
  reviewedAt: string | null;
  rejectionReason: string | null;
  approvedStopId: string | null;
  createdAt: string;
}

export interface ProposalPage {
  items: StopProposal[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export function listStopProposals(
  tenantId: string,
  schoolId: string,
  page: number,
  limit: number,
): Promise<ProposalPage> {
  const query = new URLSearchParams({
    schoolId,
    page: String(page),
    limit: String(limit),
  });
  return apiRequest<ProposalPage>(`/stop-proposals?${query}`, { tenantId });
}

export function createStopProposal(
  tenantId: string,
  input: CreateStopInput & { idempotencyKey: string },
): Promise<StopProposal> {
  return apiRequest<StopProposal>("/stop-proposals", {
    method: "POST",
    tenantId,
    body: JSON.stringify(input),
  });
}

export function reviewStopProposal(
  tenantId: string,
  proposalId: string,
  decision: "approve" | "reject",
  reason?: string,
): Promise<StopProposal> {
  return apiRequest<StopProposal>(
    `/stop-proposals/${encodeURIComponent(proposalId)}/${decision}`,
    {
      method: "POST",
      tenantId,
      body: JSON.stringify(decision === "reject" ? { reason } : {}),
    },
  );
}
