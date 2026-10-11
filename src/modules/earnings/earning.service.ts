import moment from "moment";
import { Earnings } from "./earning.model";
const monthlyEarning = async (query: any = {}) => {
  const aggregatedData = await Earnings.aggregate([
    { $match: query },
    {
      $addFields: {
        year: { $year: "$createdAt" },
        month: { $month: "$createdAt" },
        day: { $dayOfMonth: "$createdAt" },
        monthName: { $dateToString: { format: "%B", date: "$createdAt" } },
        lastDayOfMonth: {
          $let: {
            vars: {
              nextMonth: {
                $dateFromParts: {
                  year: { $year: "$createdAt" },
                  month: { $add: [{ $month: "$createdAt" }, 1] },
                  day: 1,
                },
              },
            },
            in: {
              $dayOfMonth: { $subtract: ["$$nextMonth", 24 * 60 * 60000] },
            },
          },
        },
      },
    },
    {
      $addFields: {
        periodType: {
          $cond: [{ $lte: ["$day", 15] }, "1-15", "16+"],
        },
      },
    },
    {
      $group: {
        _id: {
          year: "$year",
          month: "$month",
          periodType: "$periodType",
        },
        monthName: { $first: "$monthName" },
        yearValue: { $first: "$year" },
        numericMonth: { $first: "$month" },
        lastDayOfMonth: { $first: "$lastDayOfMonth" },
        totalAmount: { $sum: "$amount" },
        hasUnpaid: { $min: "$isPaid" },
      },
    },
    {
      $group: {
        _id: {
          year: "$_id.year",
          month: "$_id.month",
        },
        month: { $first: "$monthName" },
        year: { $first: "$yearValue" },
        numericMonth: { $first: "$numericMonth" },
        lastDayOfMonth: { $first: "$lastDayOfMonth" },
        periods: {
          $push: {
            periodType: "$_id.periodType",
            amount: "$totalAmount",
            hasUnpaid: "$hasUnpaid",
          },
        },
      },
    },
    {
      $project: {
        month: 1,
        year: 1,
        periods: {
          $map: {
            input: "$periods",
            as: "p",
            in: {
              label: {
                $cond: [
                  { $eq: ["$$p.periodType", "1-15"] },
                  { $concat: ["1 ", "$month", " - 15 ", "$month"] },
                  {
                    $concat: [
                      "16 ",
                      "$month",
                      " - ",
                      { $toString: "$lastDayOfMonth" },
                      " ",
                      "$month",
                    ],
                  },
                ],
              },
              amount: "$$p.amount",
              status: { $cond: ["$$p.hasUnpaid", "Paid", "Unpaid"] },
              startDate: {
                $cond: [
                  { $eq: ["$$p.periodType", "1-15"] },
                  {
                    $dateFromParts: {
                      year: "$year",
                      month: "$numericMonth",
                      day: 1,
                    },
                  },
                  {
                    $dateFromParts: {
                      year: "$year",
                      month: "$numericMonth",
                      day: 16,
                    },
                  },
                ],
              },
              endDate: {
                $cond: [
                  { $eq: ["$$p.periodType", "1-15"] },
                  {
                    $dateFromParts: {
                      year: "$year",
                      month: "$numericMonth",
                      day: 15,
                    },
                  },
                  {
                    $dateFromParts: {
                      year: "$year",
                      month: "$numericMonth",
                      day: "$lastDayOfMonth",
                    },
                  },
                ],
              },
            },
          },
        },
      },
    },
    { $sort: { year: 1, numericMonth: 1 } },
  ]);

  return aggregatedData.map((data: any) => ({
    header: `Earnings - ${data.month}, ${data.year}`,
    periods: data.periods,
  }));
};

const getEarningsGroupedByDay = async (
  startDate: Date,
  endDate: Date,
  query: any
) => {
  // Adjust endDate to include entire last day

  const results = await Earnings.aggregate([
    // Filter documents in date range
    {
      $match: {
        ...query,
        createdAt: {
          $gte: startDate,
          $lte: endDate,
        },
      },
    },
    {
      $lookup: {
        from: "shifts", // Collection name for shifts
        localField: "shift",
        foreignField: "_id",
        as: "shiftData",
      },
    },
    // Group by day and sum amounts
    {
      $group: {
        _id: {
          $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
        },
        amount: { $sum: "$amount" },
        // Preserve first createdAt for date consistency
        date: { $first: "$createdAt" },
        shiftData: { $first: "$shiftData" }, // Ensure shift data is available for client names
      },
    },
    // Format output fields
    {
      $project: {
        _id: 0,
        date: {
          $dateToString: { date: "$date" },
        },
        amount: 1,

        client: {
          $concat: [
            {
              $ifNull: [
                { $arrayElemAt: ["$shiftData.clientFirstName", 0] },
                "",
              ],
            },
            " ",
            {
              $ifNull: [{ $arrayElemAt: ["$shiftData.clientLastName", 0] }, ""],
            },
          ],
        },
      },
    },
    { $sort: { date: 1 } },
    // Sort chronologically
    {
      $group: {
        _id: null,
        total: { $sum: "$amount" },
        history: { $push: "$$ROOT" },
      },
    },
    {
      $project: {
        _id: 0,
        total: 1,
        history: 1,
      },
    },
  ]);

  return results[0];
};
const paymentStatus = async (
  startDate: Date,
  endDate: Date,
  query: any,
  status: string
) => {
  // Adjust endDate to include entire last day
  const adjustedEndDate = new Date(endDate);
  adjustedEndDate.setUTCHours(23, 59, 59, 999);

  const results = await Earnings.updateMany(
    {
      ...query,
      createdAt: {
        $gte: startDate,
        $lte: adjustedEndDate,
      },
    },
    {
      isPaid: status,
    }
  );

  return results;
};
export const EarningServices = {
  monthlyEarning,
  getEarningsGroupedByDay,
  paymentStatus,
};
