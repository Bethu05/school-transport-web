import { apiRequest } from "../api/client";

export type StudentStatus = "active" | "inactive";

export interface StudentCustomFieldValue {
  id: string;

  fieldDefinitionId: string;

  key: string;

  label: string;

  fieldType: "text" | "number" | "date" | "boolean" | "select";

  value: string;
}

export interface StudentCustomFieldInput {
  fieldDefinitionId: string;

  value: string | null;
}

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

  customFields?: StudentCustomFieldValue[];
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

  customFields?: StudentCustomFieldInput[];
}

export interface ImportStudentRowInput {
  externalRef: string;
  firstName: string;
  lastName: string;
  grade: string;
  photoUrl?: string;
}

export interface StudentImportResultItem {
  rowNumber: number;
  externalRef: string;
  status: "imported" | "rejected";
  studentId?: string;
  message?: string;
}

export interface ImportStudentsResult {
  total: number;
  imported: number;
  rejected: number;
  results: StudentImportResultItem[];
}

/**
 * School reassignment is deliberately not exposed through
 * the web edit form.
 */
export interface UpdateStudentInput {
  externalRef?: string;

  firstName?: string;

  lastName?: string;

  grade?: string;

  photoUrl?: string;

  customFields?: StudentCustomFieldInput[];
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

export function importStudents(
  tenantId: string,
  schoolId: string,
  rows: ImportStudentRowInput[],
): Promise<ImportStudentsResult> {
  return apiRequest<ImportStudentsResult>("/students/import", {
    method: "POST",

    tenantId,

    body: JSON.stringify({
      schoolId,
      rows,
    }),
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

export function deactivateStudent(
  tenantId: string,
  studentId: string,
): Promise<Student> {
  return apiRequest<Student>(`/students/${studentId}/deactivate`, {
    method: "POST",

    tenantId,
  });
}
