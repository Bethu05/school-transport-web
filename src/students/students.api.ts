import { apiRequest } from "../api/client";

export type StudentStatus = "active" | "inactive";

export interface Student {
  id: string;

  tenantId: string;

  schoolId: string;

  externalRef: string | null;

  firstName: string;

  lastName: string;

  grade: string;

  photoUrl: string | null;

  status: StudentStatus;

  createdAt: string;

  updatedAt: string;
}

export interface PaginatedStudents {
  items: Student[];

  page: number;

  limit: number;

  total: number;

  totalPages: number;
}

export interface ListStudentsQuery {
  page?: number;

  limit?: number;

  search?: string;

  schoolId?: string;

  status?: StudentStatus;
}

export interface CreateStudentInput {
  schoolId: string;

  externalRef?: string;

  firstName: string;

  lastName: string;

  grade: string;

  photoUrl?: string;
}

/**
 * School reassignment is deliberately not exposed through
 * the web edit form.
 *
 * Once Students are linked to guardians, stops and trips,
 * changing school becomes a relationship migration rather
 * than an ordinary profile edit.
 */
export interface UpdateStudentInput {
  externalRef?: string;

  firstName?: string;

  lastName?: string;

  grade?: string;

  /**
   * Empty string clears the current photograph.
   */
  photoUrl?: string;
}

function buildQueryString(query: ListStudentsQuery): string {
  const parameters = new URLSearchParams();

  if (query.page) {
    parameters.set("page", String(query.page));
  }

  if (query.limit) {
    parameters.set("limit", String(query.limit));
  }

  if (query.search?.trim()) {
    parameters.set("search", query.search.trim());
  }

  if (query.schoolId) {
    parameters.set("schoolId", query.schoolId);
  }

  if (query.status) {
    parameters.set("status", query.status);
  }

  const value = parameters.toString();

  return value ? `?${value}` : "";
}

/**
 * Server-side paginated Student list.
 */
export function listStudentsPage(
  tenantId: string,
  query: ListStudentsQuery = {},
): Promise<PaginatedStudents> {
  return apiRequest<PaginatedStudents>(`/students${buildQueryString(query)}`, {
    tenantId,
  });
}

export function createStudent(
  tenantId: string,
  input: CreateStudentInput,
): Promise<Student> {
  return apiRequest<Student>("/students", {
    method: "POST",

    tenantId,

    body: JSON.stringify(input),
  });
}

export function updateStudent(
  tenantId: string,
  studentId: string,
  input: UpdateStudentInput,
): Promise<Student> {
  return apiRequest<Student>(`/students/${studentId}`, {
    method: "PATCH",

    tenantId,

    body: JSON.stringify(input),
  });
}

/**
 * Current committed Student lifecycle contract.
 *
 * Student records are preserved for historical relationships.
 */
export function deactivateStudent(
  tenantId: string,
  studentId: string,
): Promise<Student> {
  return apiRequest<Student>(`/students/${studentId}/deactivate`, {
    method: "POST",

    tenantId,
  });
}
