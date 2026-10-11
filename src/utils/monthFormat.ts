import { differenceInDays, endOfMonth } from "date-fns";

export function generateDateArray(startDate = new Date()) {
  const dateArray = [];
  const currentDate = new Date(startDate);
  const days = differenceInDays(endOfMonth(currentDate), currentDate);
  for (let i = 0; i < days; i++) {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + i);
    dateArray.push({
      date: newDate,
      data: [],
    });
  }

  return dateArray;
}
