export function getNextDaysFrom(day: number) {
  const today = new Date();
  today.setDate(day);
  const days = [];

  for (let i = 1; i <= 4; i++) {
    const nextDate = new Date(today);
    nextDate.setMonth(today.getMonth(), today.getDate() + 7);
    days.push(nextDate.getDate());
    today.setDate(nextDate.getDate());
  }

  return days;
}
export function getTNextDaysFrom(day: number) {
  const today = new Date();
  today.setDate(day);
  const days = [];
  for (let i = 1; i <= 4; i++) {
    const nextDate = new Date(today);
    nextDate.setMonth(today.getMonth(), today.getDate() + 7);
    days.push(nextDate);
    today.setDate(nextDate.getDate());
  }

  return days;
}
export function getNextFortnightsFrom(day: number) {
  const today = new Date();
  today.setDate(day); // Set the starting day
  const days = [];

  for (let i = 1; i <= 4; i++) {
    const nextDate = new Date(today);
    nextDate.setDate(today.getDate() + i * 14); // Add 14 days (fortnight) intervals
    days.push(nextDate.getDate()); // Get the day of the month
    today.setDate(nextDate.getDate()); // Update today to the new date after each iteration
  }

  return days;
}
export function getTNextFortnightsFrom(day: number) {
  const today = new Date();
  today.setDate(day); // Set the starting day
  const days = [];

  for (let i = 1; i <= 4; i++) {
    const nextDate = new Date(today);
    nextDate.setDate(today.getDate() + i * 14); // Add 14 days (fortnight) intervals
    days.push(nextDate); // Get the day of the month
    today.setDate(nextDate.getDate()); // Update today to the new date after each iteration
  }

  return days;
}
export function getNextFortnightlyDateFrom(day: number) {
  const today = new Date();
  today.setDate(day); // Set the starting day
  const nextDate = new Date(today);
  nextDate.setDate(today.getDate() + 14); // Add 14 days (fortnight interval)
  return { day: nextDate.getDate(), time: nextDate }; // Return the day of the next fortnight
}
export function getNextWeeklyDateFrom(day: number) {
  const today = new Date();
  today.setDate(day); // Set the starting day
  const nextDate = new Date(today);
  nextDate.setDate(today.getDate() + 7); // Add 7 days (weekly interval)
  return { day: nextDate.getDate(), time: nextDate }; // Return the day of the next week
}
