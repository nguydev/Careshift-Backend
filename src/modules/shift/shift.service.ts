import mongoose, { Types } from "mongoose";
import { TShift } from "./shift.interface";
import { ApplyShift, CheckIn, CheckOut, Shift } from "./shift.model";
import ApiError from "../../errors/ApiError";
import httpStatus from "http-status";

import { generateDateArray } from "../../utils/monthFormat";
import {
  getNextDaysFrom,
  getNextFortnightlyDateFrom,
  getNextFortnightsFrom,
  getNextWeeklyDateFrom,
  getTNextDaysFrom,
  getTNextFortnightsFrom,
} from "../../utils/getDate";
import { areDatesSame } from "../../utils/sameDateChecker";
import { Earnings } from "../earnings/earning.model";
import { endOfDay, format, isSameDay, startOfDay } from "date-fns";

const createShift = async (payload: TShift) => {
  const result = await Shift.create(payload);
  return result;
};

const getShiftById = async (query: object) => {
  const shift = await Shift.findOne(query).populate(
    "applyedUsers",
    "-password",
  );

  return shift;
};
const getShiftMiniById = async (query: object) => {
  const shift = await Shift.findOne(query)
    .populate("applyedUsers", "-password")
    .populate("assigned", "-password");

  return shift;
};
const applyShift = async (data: any) => {
  const apply = await ApplyShift.findOneAndUpdate(
    {
      user: new mongoose.Types.ObjectId(data.user),
      shift: new mongoose.Types.ObjectId(data.shift),
    },
    data,
    {
      new: true,
      upsert: true,
      runValidators: true,
    },
  );
  await Shift.findByIdAndUpdate(data?.shift, {
    $addToSet: { applyedUsers: data.user },
  });
  return apply;
};
const action = async (query: any, status: string) => {
  console.log("check query =================> ", query.user);
  console.log("check status ================> ", status);

  const action = await ApplyShift.findOneAndUpdate(
    { ...query, status: { $ne: "approved" } },
    // { user: query.user },
    {
      status: status,
    },
    {
      new: true,
    },
  );
  console.log("action =================> ", action);

  if (!action) {
    throw new ApiError(httpStatus.NOT_FOUND, "Application not found");
  }
  if (status === "approved") {
    await Shift.findOneAndUpdate(
      {
        _id: action?.shift,
        applyedUsers: { $in: action?.user },
      },
      {
        assigned: action?.user,
      },
    );
  }

  return action;
};
const getShiftController = async (
  query: object,
  skip = 0,
  limit = 10,
  userId: Types.ObjectId,
) => {
  const result: any = await Shift.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  if (!result || result.length === 0) {
    return []; // Return empty if no shifts found
  }

  // const applyedJob = await ApplyShift.findOne({
  //   shift: { $in: result.map((shift: any) => shift._id) },
  //   user: userId,
  //   input: "no",
  // });

  // if (applyedJob) {
  //   const filteredShifts = result.filter(
  //     (shift: any) => shift._id.toString() !== applyedJob.shift.toString()
  //   );
  //   return filteredShifts;
  // }

  return result;
};

const myShift = async (query: object, limit: number) => {
  return Shift.find(query).limit(limit);
};
const getShift = async (query: object, page: number, limit: number) => {
  const skip = (page - 1) * limit;
  return Shift.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit);
};
const countShifts = async (query: object) => {
  return Shift.countDocuments(query);
};
const status = async (query: object) => {
  const shift = await Shift.findOne(query);
  if (!shift) {
    throw new ApiError(httpStatus.NOT_FOUND, "No data found");
  }

  return shift;
};
const getApplication = async (query: object) => {
  const application = await ApplyShift.find(query).populate(
    "user",
    "-password",
  );

  if (!application) {
    throw new ApiError(httpStatus.NOT_FOUND, "No data found");
  }

  return application;
};
const myBooking = async (query: object) => {
  let monthFormat = generateDateArray();
  const shifts: any = await Shift.find(query);
  // console.log(shifts);
  shifts.forEach((shift: any) => {
    const shiftDay = shift?.workStartDate?.getDate();
    const workType = shift?.workType; // "one-off" , "ongoing"
    const frequency = shift?.frequency; // "one off", "weekly", "fortnight"
    const fortnightDayListOnlyTime = getTNextFortnightsFrom(shiftDay);

    const weekDay = getNextWeeklyDateFrom(shiftDay);
    const fortnightDay = getNextFortnightlyDateFrom(shiftDay);
    // console.log(fortnightDay);
    const weekDayListOnlyTime = getTNextDaysFrom(shiftDay);
    if (workType === "ongoing" && frequency === "one off") {
      monthFormat?.map((month: any) => {
        // 1 = 7

        if (
          month.date.toISOString().split("T")[0] ===
            shift?.workStartDate.toISOString().split("T")[0] ||
          month.date > shift?.workStartDate
        ) {
          return month.data.push({
            id: shift?._id,
            client: `${shift?.clientFirstName} ${shift?.clientLastName}`,
            time: `${new Date(shift?.workingTimeStart).toLocaleTimeString(
              "en-US",
              {
                hour: "2-digit",
                minute: "2-digit",
                hour12: true,
              },
            )} - ${new Date(shift?.workingTimeFinish).toLocaleTimeString(
              "en-US",
              {
                hour: "2-digit",
                minute: "2-digit",
                hour12: true,
              },
            )}`,
            address: shift?.clientFullAddress,
            image: shift?.clientImage?.publicFileURL || "",
          });
        }
      });
    }
    if (workType === "ongoing" && frequency === "weekly") {
      monthFormat?.map((month: any) => {
        const isSameDate = areDatesSame(month.date, weekDayListOnlyTime);
        if (isSameDate) {
          return month.data.push({
            id: shift?._id,
            client: `${shift?.clientFirstName} ${shift?.clientLastName}`,
            time: `${new Date(shift?.workingTimeStart).toLocaleTimeString(
              "en-US",
              {
                hour: "2-digit",
                minute: "2-digit",
                hour12: true,
              },
            )} - ${new Date(shift?.workingTimeFinish).toLocaleTimeString(
              "en-US",
              {
                hour: "2-digit",
                minute: "2-digit",
                hour12: true,
              },
            )}`,
            address: shift?.clientFullAddress,
            image: shift?.clientImage?.publicFileURL || "",
          });
        }
      });
    }
    if (workType === "ongoing" && frequency === "fortnight") {
      monthFormat?.map((month: any) => {
        const isSameDate = areDatesSame(month.date, fortnightDayListOnlyTime);
        if (isSameDate) {
          return month.data.push({
            id: shift?._id,
            client: `${shift?.clientFirstName} ${shift?.clientLastName}`,
            time: `${new Date(shift?.workingTimeStart).toLocaleTimeString(
              "en-US",
              {
                hour: "2-digit",
                minute: "2-digit",
                hour12: true,
              },
            )} - ${new Date(shift?.workingTimeFinish).toLocaleTimeString(
              "en-US",
              {
                hour: "2-digit",
                minute: "2-digit",
                hour12: true,
              },
            )}`,
            address: shift?.clientFullAddress,
            image: shift?.clientImage?.publicFileURL || "",
          });
        }
      });
    }

    // ============
    if (workType === "one-off" && frequency === "one off") {
      monthFormat?.map((month: any) => {
        const isSameDate = areDatesSame(month.date, [shift?.workStartDate]);
        if (isSameDate) {
          return month.data.push({
            id: shift?._id,
            client: `${shift?.clientFirstName} ${shift?.clientLastName}`,
            time: `${new Date(shift?.workingTimeStart).toLocaleTimeString(
              "en-US",
              {
                hour: "2-digit",
                minute: "2-digit",
                hour12: true,
              },
            )} - ${new Date(shift?.workingTimeFinish).toLocaleTimeString(
              "en-US",
              {
                hour: "2-digit",
                minute: "2-digit",
                hour12: true,
              },
            )}`,
            address: shift?.clientFullAddress,
            image: shift?.clientImage?.publicFileURL || "",
          });
        }
      });
    }
    if (workType === "one-off" && frequency === "weekly") {
      monthFormat?.map((month: any) => {
        const isSameDate = areDatesSame(month.date, [weekDay.time]);
        if (isSameDate) {
          return month.data.push({
            id: shift?._id,
            client: `${shift?.clientFirstName} ${shift?.clientLastName}`,
            time: `${new Date(shift?.workingTimeStart).toLocaleTimeString(
              "en-US",
              {
                hour: "2-digit",
                minute: "2-digit",
                hour12: true,
              },
            )} - ${new Date(shift?.workingTimeFinish).toLocaleTimeString(
              "en-US",
              {
                hour: "2-digit",
                minute: "2-digit",
                hour12: true,
              },
            )}`,
            address: shift?.clientFullAddress,
            image: shift?.clientImage?.publicFileURL || "",
          });
        }
      });
    }
    if (workType === "one-off" && frequency === "fortnight") {
      monthFormat?.map((month: any) => {
        // console.log("inside================", month.date, fortnightDay.time);
        const isSameDate = areDatesSame(month.date, [fortnightDay.time]);
        if (isSameDate) {
          return month.data.push({
            id: shift?._id,
            client: `${shift?.clientFirstName} ${shift?.clientLastName}`,
            time: `${new Date(shift?.workingTimeStart).toLocaleTimeString(
              "en-US",
              {
                hour: "2-digit",
                minute: "2-digit",
                hour12: true,
              },
            )} - ${new Date(shift?.workingTimeFinish).toLocaleTimeString(
              "en-US",
              {
                hour: "2-digit",
                minute: "2-digit",
                hour12: true,
              },
            )}`,
            address: shift?.clientFullAddress,
            image: shift?.clientImage?.publicFileURL || "",
          });
        }
      });
    }
  });

  return monthFormat;
};
const getUserSchedule = async (query: object, startDate: Date) => {
  let monthFormat = generateDateArray(startDate);
  const shifts: any = await Shift.find(query);
  shifts.forEach((shift: any) => {
    const shiftDay = shift?.workStartDate?.getDate();
    const workType = shift?.workType; // "one-off" , "ongoing"
    const frequency = shift?.frequency; // "one off", "weekly", "fortnight"
    const fortnightDayListOnlyTime = getTNextFortnightsFrom(shiftDay);

    const weekDay = getNextWeeklyDateFrom(shiftDay);
    const fortnightDay = getNextFortnightlyDateFrom(shiftDay);
    const weekDayListOnlyTime = getTNextDaysFrom(shiftDay);
    if (workType === "ongoing" && frequency === "one off") {
      monthFormat?.map((month: any) => {
        return month.data.push({
          id: shift?._id,
          client: `${shift?.clientFirstName} ${shift?.clientLastName}`,
          time: `${new Date(shift?.workingTimeStart).toLocaleTimeString(
            "en-US",
            {
              hour: "2-digit",
              minute: "2-digit",
              hour12: true,
            },
          )} - ${new Date(shift?.workingTimeFinish).toLocaleTimeString(
            "en-US",
            {
              hour: "2-digit",
              minute: "2-digit",
              hour12: true,
            },
          )}`,
          address: shift?.clientFullAddress,
          image: shift?.clientImage?.publicFileURL || "",
        });
      });
    }
    if (workType === "ongoing" && frequency === "weekly") {
      monthFormat?.map((month: any) => {
        const isSameDate = areDatesSame(month.date, weekDayListOnlyTime);
        if (isSameDate) {
          return month.data.push({
            id: shift?._id,
            client: `${shift?.clientFirstName} ${shift?.clientLastName}`,
            time: `${new Date(shift?.workingTimeStart).toLocaleTimeString(
              "en-US",
              {
                hour: "2-digit",
                minute: "2-digit",
                hour12: true,
              },
            )} - ${new Date(shift?.workingTimeFinish).toLocaleTimeString(
              "en-US",
              {
                hour: "2-digit",
                minute: "2-digit",
                hour12: true,
              },
            )}`,
            address: shift?.clientFullAddress,
            image: shift?.clientImage?.publicFileURL || "",
          });
        }
      });
    }
    if (workType === "ongoing" && frequency === "fortnight") {
      monthFormat?.map((month: any) => {
        const isSameDate = areDatesSame(month.date, fortnightDayListOnlyTime);
        if (isSameDate) {
          return month.data.push({
            id: shift?._id,
            client: `${shift?.clientFirstName} ${shift?.clientLastName}`,
            time: `${new Date(shift?.workingTimeStart).toLocaleTimeString(
              "en-US",
              {
                hour: "2-digit",
                minute: "2-digit",
                hour12: true,
              },
            )} - ${new Date(shift?.workingTimeFinish).toLocaleTimeString(
              "en-US",
              {
                hour: "2-digit",
                minute: "2-digit",
                hour12: true,
              },
            )}`,
            address: shift?.clientFullAddress,
            image: shift?.clientImage?.publicFileURL || "",
          });
        }
      });
    }

    // ============
    if (workType === "one-off" && frequency === "one off") {
      monthFormat?.map((month: any) => {
        const isSameDate = areDatesSame(month.date, [shift?.workStartDate]);
        if (isSameDate) {
          return month.data.push({
            id: shift?._id,
            client: `${shift?.clientFirstName} ${shift?.clientLastName}`,
            time: `${new Date(shift?.workingTimeStart).toLocaleTimeString(
              "en-US",
              {
                hour: "2-digit",
                minute: "2-digit",
                hour12: true,
              },
            )} - ${new Date(shift?.workingTimeFinish).toLocaleTimeString(
              "en-US",
              {
                hour: "2-digit",
                minute: "2-digit",
                hour12: true,
              },
            )}`,
            address: shift?.clientFullAddress,
            image: shift?.clientImage?.publicFileURL || "",
          });
        }
      });
    }
    if (workType === "one-off" && frequency === "weekly") {
      monthFormat?.map((month: any) => {
        const isSameDate = areDatesSame(month.date, [weekDay.time]);
        if (isSameDate) {
          return month.data.push({
            id: shift?._id,
            client: `${shift?.clientFirstName} ${shift?.clientLastName}`,
            time: `${new Date(shift?.workingTimeStart).toLocaleTimeString(
              "en-US",
              {
                hour: "2-digit",
                minute: "2-digit",
                hour12: true,
              },
            )} - ${new Date(shift?.workingTimeFinish).toLocaleTimeString(
              "en-US",
              {
                hour: "2-digit",
                minute: "2-digit",
                hour12: true,
              },
            )}`,
            address: shift?.clientFullAddress,
            image: shift?.clientImage?.publicFileURL || "",
          });
        }
      });
    }
    if (workType === "one-off" && frequency === "fortnight") {
      monthFormat?.map((month: any) => {
        const isSameDate = areDatesSame(month.date, [fortnightDay.time]);
        if (isSameDate) {
          return month.data.push({
            id: shift?._id,
            client: `${shift?.clientFirstName} ${shift?.clientLastName}`,
            time: `${new Date(shift?.workingTimeStart).toLocaleTimeString(
              "en-US",
              {
                hour: "2-digit",
                minute: "2-digit",
                hour12: true,
              },
            )} - ${new Date(shift?.workingTimeFinish).toLocaleTimeString(
              "en-US",
              {
                hour: "2-digit",
                minute: "2-digit",
                hour12: true,
              },
            )}`,
            address: shift?.clientFullAddress,
            image: shift?.clientImage?.publicFileURL || "",
          });
        }
      });
    }
  });

  return monthFormat;
};
const myBookingById = async (query: any) => {
  const shift: any = await Shift.findOne(query);
  if (!shift) {
    throw new ApiError(httpStatus.NOT_FOUND, "Invalid shift");
  }
  let isToday = false;
  let checkIn = false;
  let checkOut = false;
  const shiftDay = shift?.workStartDate?.getDate();
  const workType = shift?.workType; // "one-off" , "ongoing"
  const frequency = shift?.frequency; // "one off", "weekly", "fortnight"
  const weekDay = getNextWeeklyDateFrom(shiftDay);
  const fortnightDay = getNextFortnightlyDateFrom(shiftDay);
  const weekDayListOnlyTime = getTNextDaysFrom(shiftDay);
  const fortnightDayListOnlyTime = getTNextFortnightsFrom(shiftDay);
  if (workType === "ongoing" && frequency === "one off") {
    isToday = true;
  }
  if (workType === "ongoing" && frequency === "weekly") {
    const isSameDate = areDatesSame(new Date(), weekDayListOnlyTime);
    if (isSameDate) {
      isToday = true;
    }
  }
  if (workType === "ongoing" && frequency === "fortnight") {
    const isSameDate = areDatesSame(new Date(), fortnightDayListOnlyTime);
    if (isSameDate) {
      isToday = true;
    }
  }
  // ============
  if (workType === "one-off" && frequency === "one off") {
    const isSameDate = areDatesSame(new Date(), [shift?.workStartDate]);
    if (isSameDate) {
      isToday = true;
    }
  }
  if (workType === "one-off" && frequency === "weekly") {
    const isSameDate = areDatesSame(new Date(), [weekDay.time]);
    if (isSameDate) {
      isToday = true;
    }
  }
  if (workType === "one-off" && frequency === "fortnight") {
    const isSameDate = areDatesSame(new Date(), [fortnightDay.time]);
    if (isSameDate) {
      isToday = true;
    }
  }
  const details = {
    client: `${shift?.clientFirstName} ${shift?.clientLastName}`,
    startTime: `${new Date(shift?.workingTimeStart).toLocaleTimeString(
      "en-US",
      {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      },
    )} `,
    endTime: `${new Date(shift?.workingTimeFinish).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })}`,
    address: shift?.clientFullAddress,
    image: shift?.clientImage?.publicFileURL || "",
    duration:
      Math.abs(
        shift?.workingTimeFinish.getTime() - shift?.workingTimeStart.getTime(),
      ) /
      (1000 * 60 * 60),
    hourlyRate: shift?.hourlyRate,
    travelRate: shift?.travelRatePerKm,
    total: shift?.hourlyRate + shift?.travelRatePerKm,
    services: shift?.services,
  };
  const check = await CheckIn.find({
    user: query?.assigned,
    shift: query?._id,
    status: { $ne: "checkout" },
  });
  const time = check?.map((data) => {
    return data.createdAt;
  });
  const isSameDateForCheckIn = areDatesSame(new Date(), time);
  if (isSameDateForCheckIn) {
    checkIn = true;
  }
  //==========
  const checkOutData = await CheckIn.find({
    user: query?.assigned,
    shift: query?._id,
    status: "checkout",
  });
  const checkOuttime = checkOutData?.map((data) => {
    return data.createdAt;
  });
  const isSameDateForCheckout = areDatesSame(new Date(), checkOuttime);
  if (isSameDateForCheckout) {
    checkOut = true;
  }
  return { details, isToday, checkIn, checkOut };
};
const checkin = async (query: any) => {
  const shift: any = await Shift.findOne(query);
  let isToday = false;
  const shiftDay = shift?.workStartDate?.getDate();
  const workType = shift?.workType; // "one-off" , "ongoing"
  const frequency = shift?.frequency; // "one off", "weekly", "fortnight"
  const weekDay = getNextWeeklyDateFrom(shiftDay);
  const fortnightDay = getNextFortnightlyDateFrom(shiftDay);
  const weekDayListOnlyTime = getTNextDaysFrom(shiftDay);
  const fortnightDayListOnlyTime = getTNextFortnightsFrom(shiftDay);
  if (workType === "ongoing" && frequency === "one off") {
    isToday = true;
  }
  if (workType === "ongoing" && frequency === "weekly") {
    const isSameDate = areDatesSame(new Date(), weekDayListOnlyTime);
    if (isSameDate) {
      isToday = true;
    }
  }
  if (workType === "ongoing" && frequency === "fortnight") {
    const isSameDate = areDatesSame(new Date(), fortnightDayListOnlyTime);
    if (isSameDate) {
      isToday = true;
    }
  }
  // ============
  if (workType === "one-off" && frequency === "one off") {
    const isSameDate = areDatesSame(new Date(), [shift?.workStartDate]);
    if (isSameDate) {
      isToday = true;
    }
  }
  if (workType === "one-off" && frequency === "weekly") {
    const isSameDate = areDatesSame(new Date(), [weekDay.time]);
    if (isSameDate) {
      isToday = true;
    }
  }
  if (workType === "one-off" && frequency === "fortnight") {
    const isSameDate = areDatesSame(new Date(), [fortnightDay.time]);
    if (isSameDate) {
      isToday = true;
    }
  }
  if (!isToday) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "You can only checkin today jobs.",
    );
  }
  const check = await CheckIn.find({
    user: query?.assigned,
    shift: query?._id,
    status: { $ne: "checkout" },
  });
  const time = check?.map((data) => {
    return data.createdAt;
  });
  const isSameDate = areDatesSame(new Date(), time);
  if (isSameDate) {
    throw new ApiError(httpStatus.BAD_REQUEST, "You already check in today.");
  }

  await CheckIn.create({
    user: query?.assigned,
    shift: query?._id,
    status: "checkin",
  });
  return true;
};
const checkout = async (query: any, body: any) => {
  const shift: any = await Shift.findOne(query);
  let isToday = false;
  const shiftDay = shift?.workStartDate?.getDate();
  const workType = shift?.workType; // "one-off" , "ongoing"
  const frequency = shift?.frequency; // "one off", "weekly", "fortnight"
  const weekDay = getNextWeeklyDateFrom(shiftDay);
  const fortnightDay = getNextFortnightlyDateFrom(shiftDay);
  const weekDayListOnlyTime = getTNextDaysFrom(shiftDay);
  const fortnightDayListOnlyTime = getTNextFortnightsFrom(shiftDay);
  if (workType === "ongoing" && frequency === "one off") {
    isToday = true;
  }
  if (workType === "ongoing" && frequency === "weekly") {
    const isSameDate = areDatesSame(new Date(), weekDayListOnlyTime);
    if (isSameDate) {
      isToday = true;
    }
  }
  if (workType === "ongoing" && frequency === "fortnight") {
    const isSameDate = areDatesSame(new Date(), fortnightDayListOnlyTime);
    if (isSameDate) {
      isToday = true;
    }
  }
  // ============
  if (workType === "one-off" && frequency === "one off") {
    const isSameDate = areDatesSame(new Date(), [shift?.workStartDate]);
    if (isSameDate) {
      isToday = true;
    }
  }
  if (workType === "one-off" && frequency === "weekly") {
    const isSameDate = areDatesSame(new Date(), [weekDay.time]);
    if (isSameDate) {
      isToday = true;
    }
  }
  if (workType === "one-off" && frequency === "fortnight") {
    const isSameDate = areDatesSame(new Date(), [fortnightDay.time]);
    if (isSameDate) {
      isToday = true;
    }
  }
  if (!isToday) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "You can only checkin today jobs.",
    );
  }
  const check = await CheckIn.find({
    user: query?.assigned,
    shift: query?._id,
    status: "checkin",
  });
  const time = check?.map((data) => {
    return data.createdAt;
  });
  const isSameDate = areDatesSame(new Date(), time);
  if (!isSameDate) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Please check-in first.");
  }
  //============
  const checkOut = await CheckIn.find({
    user: query?.assigned,
    shift: query?._id,
    status: "checkout",
  });
  const outtime = checkOut?.map((data) => {
    return data.createdAt;
  });
  const isSameDateOut = areDatesSame(new Date(), outtime);
  if (isSameDateOut) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "You can't check-out multiple time.",
    );
  }

  await CheckIn.create({
    user: query?.assigned,
    shift: query?._id,
    status: "checkout",
  });
  const result = await CheckOut.create({
    ...body,
    user: query?.assigned,
    shift: query?._id,
  });
  return result;
};
const profitFilter = async (query: object, page: number, limit: number) => {
  const skip = (page - 1) * limit;

  return CheckOut.aggregate([
    { $match: query },
    {
      $lookup: {
        from: "shifts",
        localField: "shift",
        foreignField: "_id",
        as: "shiftData",
      },
    },
    { $unwind: "$shiftData" },
    {
      $project: {
        shiftData: 1,
        how_many_kilometers_did_you_travel_with_the_client_only: 1,
      },
    },
    {
      $addFields: {
        totalWorkerHourlyIncome: {
          $multiply: ["$shiftData.hourlyRate", "$shiftData.totalShiftHours"],
        },
      },
    },
    {
      $addFields: {
        totalClientHourlyPay: {
          $multiply: [
            "$shiftData.clientPayhourlyRate",
            "$shiftData.totalShiftHours",
          ],
        },
      },
    },
    {
      $addFields: {
        totalWorkerTravelIncome: {
          $multiply: [
            "$how_many_kilometers_did_you_travel_with_the_client_only",
            "$shiftData.travelRatePerKm",
          ],
        },
      },
    },
    {
      $addFields: {
        totalClientTravelPay: {
          $multiply: [
            "$how_many_kilometers_did_you_travel_with_the_client_only",
            "$shiftData.clientPaytravelRatePerKm",
          ],
        },
      },
    },
    {
      $addFields: {
        totalClientPay: {
          $add: ["$totalClientHourlyPay", "$totalClientTravelPay"],
        },
      },
    },
    {
      $addFields: {
        totalWorkerIncome: {
          $add: ["$totalWorkerHourlyIncome", "$totalWorkerTravelIncome"],
        },
      },
    },
    {
      $addFields: {
        profit: {
          $subtract: ["$totalClientPay", "$totalWorkerIncome"],
        },
      },
    },
    {
      $group: {
        _id: "$shiftData._id",
        totalProfit: { $sum: "$profit" },
        shift: { $first: "$shiftData" },
      },
    },
    {
      $project: {
        _id: 0,
        totalWorkerHourlyIncome: 1,
        totalClientHourlyPay: 1,
        totalProfit: 1,
        totalWorkerTravelIncome: 1,
        totalClientTravelPay: 1,
        totalWorkerIncome: 1,
        totalClientPay: 1,
        profit: 1,
        shiftData: 1,
        totalAmount: 1,
        shift: 1,
        user: 1,
      },
    },
    { $sort: { "shift.createdAt": 1 } },
    { $skip: skip },
    { $limit: limit },
  ]);
};
const profitFilterDetails = async (
  query: object,
  page: number,
  limit: number,
) => {
  const skip = (page - 1) * limit;

  return CheckOut.aggregate([
    { $match: query },
    {
      $lookup: {
        from: "shifts",
        localField: "shift",
        foreignField: "_id",
        as: "shiftData",
      },
    },
    { $unwind: "$shiftData" },
    {
      $project: {
        shiftData: 1,
        how_many_kilometers_did_you_travel_with_the_client_only: 1,
        createdAt: 1,
      },
    },
    {
      $addFields: {
        totalWorkerHourlyIncome: {
          $multiply: ["$shiftData.hourlyRate", "$shiftData.totalShiftHours"],
        },
      },
    },
    {
      $addFields: {
        totalClientHourlyPay: {
          $multiply: [
            "$shiftData.clientPayhourlyRate",
            "$shiftData.totalShiftHours",
          ],
        },
      },
    },
    {
      $addFields: {
        totalWorkerTravelIncome: {
          $multiply: [
            "$how_many_kilometers_did_you_travel_with_the_client_only",
            "$shiftData.travelRatePerKm",
          ],
        },
      },
    },
    {
      $addFields: {
        totalClientTravelPay: {
          $multiply: [
            "$how_many_kilometers_did_you_travel_with_the_client_only",
            "$shiftData.clientPaytravelRatePerKm",
          ],
        },
      },
    },
    {
      $addFields: {
        totalClientPay: {
          $add: ["$totalClientHourlyPay", "$totalClientTravelPay"],
        },
      },
    },
    {
      $addFields: {
        totalWorkerIncome: {
          $add: ["$totalWorkerHourlyIncome", "$totalWorkerTravelIncome"],
        },
      },
    },
    {
      $addFields: {
        profit: {
          $subtract: ["$totalClientPay", "$totalWorkerIncome"],
        },
      },
    },
    // {
    //   $group: {
    //     _id: "$shiftData._id",
    //     totalProfit: { $sum: "$profit" },
    //     shift: { $first: "$shiftData" },
    //   },
    // },
    {
      $project: {
        _id: 0,
        totalWorkerHourlyIncome: 1,
        totalClientHourlyPay: 1,
        totalProfit: 1,
        totalWorkerTravelIncome: 1,
        totalClientTravelPay: 1,
        totalWorkerIncome: 1,
        totalClientPay: 1,
        profit: 1,
        how_many_kilometers_did_you_travel_with_the_client_only: 1,
        shiftData: 1,
        totalAmount: 1,
        createdAt: 1,
        shift: 1,
        user: 1,
      },
    },
    { $sort: { "shift.createdAt": 1 } },
    { $skip: skip },
    { $limit: limit },
  ]);
};
const shiftAction = async (query: object, status: Boolean) => {
  const shift = await Shift.findOneAndUpdate(query, { isDeleted: status });
  if (!shift) {
    throw new ApiError(httpStatus.NOT_FOUND, "Invalid shift");
  }

  return shift;
};

export const ShiftService = {
  createShift,
  getShiftById,
  applyShift,
  action,
  getShiftController,
  countShifts,
  status,
  myShift,
  myBooking,
  myBookingById,
  checkin,
  checkout,
  getShift,
  getApplication,
  profitFilter,
  profitFilterDetails,
  shiftAction,
  getUserSchedule,
  getShiftMiniById,
};
