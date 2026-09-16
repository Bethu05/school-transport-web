import { apiRequest } from "../api/client";

export const GUARDIAN_RELATIONSHIP_TYPES = [
  "mother",
  "father",
  "parent",
  "guardian",
  "grandparent",
  "sibling",
  "relative",
  "carer",
  "other",
] as const;

export type GuardianRelationshipType =
  (typeof GUARDIAN_RELATIONSHIP_TYPES)[number];

export interface StudentGuardian {
  id: string;

  tenantId: string;

  schoolId: string;

  studentId: string;

  guardianId: string;

  relationshipType: GuardianRelationshipType;

  isPrimary: boolean;

  receiveNotifications: boolean;

  guardianUserId: string | null;

  guardianFirstName: string;

  guardianLastName: string;

  guardianEmail: string | null;

  guardianPhone: string | null;

  guardianStatus: "active" | "inactive";

  notifyBoarded: boolean;

  notifyDroppedOff: boolean;

  notifyTripUpdates: boolean;

  createdAt: string;

  updatedAt: string;
}

export interface LinkStudentGuardianInput {
  guardianId: string;

  relationshipType: GuardianRelationshipType;

  isPrimary?: boolean;

  receiveNotifications?: boolean;
}

export interface UpdateStudentGuardianInput {
  relationshipType?: GuardianRelationshipType;

  isPrimary?: boolean;

  receiveNotifications?: boolean;
}

/**
 * List all Guardian relationships for one Student.
 */
export function listStudentGuardians(
  tenantId: string,
  studentId: string,
): Promise<StudentGuardian[]> {
  return apiRequest<StudentGuardian[]>(`/students/${studentId}/guardians`, {
    tenantId,
  });
}

/**
 * Link an existing Guardian master record to a Student.
 */
export function linkStudentGuardian(
  tenantId: string,
  studentId: string,
  input: LinkStudentGuardianInput,
): Promise<StudentGuardian> {
  return apiRequest<StudentGuardian>(`/students/${studentId}/guardians`, {
    tenantId,

    method: "POST",

    body: JSON.stringify(input),
  });
}

/**
 * Update relationship metadata only.
 *
 * This does not change the Guardian master record.
 */
export function updateStudentGuardian(
  tenantId: string,
  studentId: string,
  guardianId: string,
  input: UpdateStudentGuardianInput,
): Promise<StudentGuardian> {
  return apiRequest<StudentGuardian>(
    `/students/${studentId}/guardians/${guardianId}`,
    {
      tenantId,

      method: "PATCH",

      body: JSON.stringify(input),
    },
  );
}

/**
 * Remove only the Student ↔ Guardian relationship.
 *
 * Neither master record is deleted.
 */
export function unlinkStudentGuardian(
  tenantId: string,
  studentId: string,
  guardianId: string,
): Promise<void> {
  return apiRequest<void>(`/students/${studentId}/guardians/${guardianId}`, {
    tenantId,

    method: "DELETE",
  });
}
