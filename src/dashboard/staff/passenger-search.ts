import type { StaffTripPassenger } from "./staff-passengers.api";

export function matchesPassengerSearch(
  passenger: Pick<
    StaffTripPassenger,
    "studentFirstName" | "studentLastName" | "studentExternalRef"
  >,
  search: string,
): boolean {
  const terms = search.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);

  if (terms.length === 0) {
    return true;
  }

  const searchable = [
    passenger.studentFirstName,
    passenger.studentLastName,
    passenger.studentExternalRef ?? "",
  ]
    .join(" ")
    .toLocaleLowerCase();

  return terms.every((term) => searchable.includes(term));
}
