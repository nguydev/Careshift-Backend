import { Types } from "mongoose";

export function determineStatus({
  isDeleted,
  workStartDate,
  assigned,
  workType,
}: {
  isDeleted: boolean;
  workStartDate: Date;
  assigned: Types.ObjectId;
  workType: "one-off" | "ongoing";
}) {
  if (isDeleted) {
    return "canceled";
  }

  if (assigned !== null && assigned !== undefined) {
    const now = new Date();

    if (workStartDate <= now) {
      return "new assigned";
    }
    if (workType === "one-off" && workStartDate > now) {
      return "completed";
    }
    if (workStartDate > now) {
      return "ongoing";
    }
  }
  return "not assigned";
}
