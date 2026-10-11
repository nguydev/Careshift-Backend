export function areDatesSame(d1: Date, d2Array: any) {
  const referenceDate = new Date(d1);

  // Loop through the array of dates and check if any date in the array matches the same day as d1
  return d2Array.some((date: any) => {
    const currentDate = new Date(date);
    return (
      referenceDate.getFullYear() === currentDate.getFullYear() &&
      referenceDate.getMonth() === currentDate.getMonth() &&
      referenceDate.getDate() === currentDate.getDate()
    );
  });
}
