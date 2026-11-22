import type { StaffTripPassenger } from "./staff-passengers.api";

type PassengerState = Pick<
  StaffTripPassenger,
  "assignmentType" | "assignedTripStopId" | "status"
>;

export function passengerActions(
  passenger: PassengerState,
  tripStatus: string,
  selectedStopId: string,
) {
  const acceptingBoarding =
    tripStatus === "boarding" || tripStatus === "in_progress";
  const canBoard = passenger.status === "waiting" && acceptingBoarding;
  const canDropOff =
    passenger.status === "boarded" && tripStatus === "in_progress";
  const stopMatchesAssignment =
    selectedStopId === passenger.assignedTripStopId;

  return {
    canBoard,
    canDropOff,
    canMarkNoShow:
      canBoard && passenger.assignmentType === "pickup",
    boardEnabled:
      canBoard &&
      Boolean(selectedStopId) &&
      (passenger.assignmentType !== "pickup" || stopMatchesAssignment),
    dropOffEnabled:
      canDropOff &&
      Boolean(selectedStopId) &&
      (passenger.assignmentType !== "dropoff" || stopMatchesAssignment),
  };
}
