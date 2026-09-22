import { apiRequest } from "../api/client";

export const STUDENT_CUSTOM_FIELD_TYPES = [
  "text",
  "number",
  "date",
  "boolean",
  "select",
] as const;

export type StudentCustomFieldType =
  (typeof STUDENT_CUSTOM_FIELD_TYPES)[number];

export type StudentCustomFieldStatus = "active" | "inactive";

export interface StudentCustomFieldDefinition {
  id: string;

  tenantId: string;

  schoolId: string;

  key: string;

  label: string;

  fieldType: StudentCustomFieldType;

  isRequired: boolean;

  isUnique: boolean;

  options: string[];

  sortOrder: number;

  status: StudentCustomFieldStatus;

  createdAt: string;

  updatedAt: string;
}

export interface CreateStudentCustomFieldInput {
  schoolId: string;

  key: string;

  label: string;

  fieldType: StudentCustomFieldType;

  isRequired?: boolean;

  isUnique?: boolean;

  options?: string[];

  sortOrder?: number;
}

export interface UpdateStudentCustomFieldInput {
  label?: string;

  isRequired?: boolean;

  isUnique?: boolean;

  options?: string[];

  sortOrder?: number;
}

export function listStudentCustomFields(
  tenantId: string,
  schoolId: string,
): Promise<StudentCustomFieldDefinition[]> {
  const parameters = new URLSearchParams({
    schoolId,
  });

  return apiRequest<StudentCustomFieldDefinition[]>(
    `/student-custom-fields?${parameters.toString()}`,
    {
      tenantId,
    },
  );
}

export function createStudentCustomField(
  tenantId: string,
  input: CreateStudentCustomFieldInput,
): Promise<StudentCustomFieldDefinition> {
  return apiRequest<StudentCustomFieldDefinition>("/student-custom-fields", {
    tenantId,

    method: "POST",

    body: JSON.stringify(input),
  });
}

export function updateStudentCustomField(
  tenantId: string,
  fieldId: string,
  input: UpdateStudentCustomFieldInput,
): Promise<StudentCustomFieldDefinition> {
  return apiRequest<StudentCustomFieldDefinition>(
    `/student-custom-fields/${fieldId}`,
    {
      tenantId,

      method: "PATCH",

      body: JSON.stringify(input),
    },
  );
}

export function deactivateStudentCustomField(
  tenantId: string,
  fieldId: string,
): Promise<StudentCustomFieldDefinition> {
  return apiRequest<StudentCustomFieldDefinition>(
    `/student-custom-fields/${fieldId}/deactivate`,
    {
      tenantId,

      method: "POST",
    },
  );
}
