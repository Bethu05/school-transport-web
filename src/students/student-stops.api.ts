import {
  apiRequest,
} from '../api/client';

export interface StudentAssignedStop {
  assignmentId: string;

  stopId: string;

  assignmentType:
    | 'pickup'
    | 'dropoff';

  name: string;

  code:
    | string
    | null;

  address:
    | string
    | null;

  geofenceRadiusMeters: number;

  createdAt: string;

  updatedAt: string;
}

export interface StudentStopAssignments {
  studentId: string;

  schoolId: string;

  pickup:
    | StudentAssignedStop
    | null;

  dropoff:
    | StudentAssignedStop
    | null;
}

export function getStudentStops(
  tenantId: string,
  studentId: string,
): Promise<StudentStopAssignments> {
  return apiRequest<StudentStopAssignments>(
    `/students/${studentId}/stops`,
    {
      tenantId,
    },
  );
}

export function setStudentPickupStop(
  tenantId: string,
  studentId: string,
  stopId: string,
): Promise<StudentStopAssignments> {
  return apiRequest<StudentStopAssignments>(
    `/students/${studentId}/stops/pickup`,
    {
      method:
        'PUT',

      tenantId,

      body:
        JSON.stringify({
          stopId,
        }),
    },
  );
}

export function clearStudentPickupStop(
  tenantId: string,
  studentId: string,
): Promise<void> {
  return apiRequest<void>(
    `/students/${studentId}/stops/pickup`,
    {
      method:
        'DELETE',

      tenantId,
    },
  );
}

export function setStudentDropoffStop(
  tenantId: string,
  studentId: string,
  stopId: string,
): Promise<StudentStopAssignments> {
  return apiRequest<StudentStopAssignments>(
    `/students/${studentId}/stops/dropoff`,
    {
      method:
        'PUT',

      tenantId,

      body:
        JSON.stringify({
          stopId,
        }),
    },
  );
}

export function clearStudentDropoffStop(
  tenantId: string,
  studentId: string,
): Promise<void> {
  return apiRequest<void>(
    `/students/${studentId}/stops/dropoff`,
    {
      method:
        'DELETE',

      tenantId,
    },
  );
}
