// admin.controller.ts

import { NextFunction, Request, Response } from "express";
import catchAsync from "../../utils/catchAsync";
import ApiError from "../../errors/ApiError";
import httpStatus from "http-status";
import mongoose, { Types } from "mongoose";
import sendResponse from "../../utils/sendResponse";
import { AdminService } from "./admin.service";
import { UserModel } from "../user/user.model";
import { CheckOut, Shift } from "../shift/shift.model";
import paginationBuilder from "../../utils/paginationBuilder";
import { IUserPayload } from "../../middlewares/roleGuard";
import { EarningServices } from "../earnings/earning.service";
import { ShiftService } from "../shift/shift.service";
import { endOfDay, endOfMonth, startOfDay, startOfMonth } from "date-fns";
import { determineStatus } from "../../utils/shiftStatus";

const changeUserStatus = catchAsync(async (req: Request, res: Response) => {
  const { days } = req.query;
  if (!days)
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Days is required if you want to suspend anyone!",
    );

  const updateStatus = await AdminService.updateStatus(
    new Types.ObjectId(req.params?.userId),
    Number(days),
  );

  return sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "User suspention action perform.",
    data: updateStatus,
  });
});
const clients = catchAsync(async (req: Request, res: Response) => {
  const { searchQ } = req.query;
  type TQuery = {
    $or?: {
      fname?: { $regex: string; $options: string };
      lname?: { $regex: string; $options: string };
    }[];
    role: string;
  };

  let query: TQuery = {
    role: "client",
  };

  if (searchQ) {
    query.$or = [
      { fname: { $regex: searchQ.toString(), $options: "i" } },
      { lname: { $regex: searchQ.toString(), $options: "i" } },
    ];
  }

  const clientsData = await AdminService.getUsers(query);

  return sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Get Clients",
    data: clientsData,
  });
});
const drivers = catchAsync(async (req: Request, res: Response) => {
  const { searchQ } = req.query;

  type TQuery = {
    $or?: {
      fname?: { $regex: string; $options: string };
      lname?: { $regex: string; $options: string };
    }[];
    role: string;
  };

  let query: TQuery = {
    role: "driver",
  };

  if (searchQ) {
    query.$or = [
      { fname: { $regex: searchQ.toString(), $options: "i" } },
      { lname: { $regex: searchQ.toString(), $options: "i" } },
    ];
  }

  const driverData = await AdminService.getUsers(query);

  return sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Get Drivers",
    data: driverData,
  });
});

const addArtical = catchAsync(async (req: Request, res: Response) => {
  if (!req.file)
    throw new ApiError(httpStatus.BAD_REQUEST, "Image is required");
  const result = await AdminService.createArtical(req.body, req.file);
  return sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Artical created successfully.",
    data: result,
  });
});
const updateArtical = catchAsync(async (req: Request, res: Response) => {
  const result = await AdminService.updateArtical(
    req.body,
    req.file,
    new mongoose.Types.ObjectId(req.params.articalId),
  );
  if (!result) throw new ApiError(httpStatus.BAD_REQUEST, "Invalid submission");
  return sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Artical update successfully.",
    data: result,
  });
});
const addFaq = catchAsync(async (req: Request, res: Response) => {
  const result = await AdminService.createFAQ(req.body);
  return sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "FAQ created successfully.",
    data: result,
  });
});
const updateFAQ = catchAsync(async (req: Request, res: Response) => {
  const result = await AdminService.updateFAQ(
    req.body,
    new mongoose.Types.ObjectId(req.params.faqId),
  );
  if (!result) throw new ApiError(httpStatus.BAD_REQUEST, "Invalid submission");
  return sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "FAQ update successfully.",
    data: result,
  });
});
//=================================================================
const dashboardStacks = catchAsync(async (req: Request, res: Response) => {
  const totalUser = await UserModel.countDocuments({
    isVerified: true,
    isDeleted: false,
  });
  const totalPostedShift = await Shift.countDocuments({});
  const totalCancelledShift = await Shift.countDocuments({
    isDeleted: true,
  });
  const totalFilledShift = await Shift.countDocuments({
    assigned: { $ne: null },
  });
  return sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Dashboard stacks.",
    data: {
      total_worker: totalUser,
      total_posted_shift: totalPostedShift,
      total_filled_shift: totalFilledShift,
      total_cancelled_shift: totalCancelledShift,
    },
  });
});

const dashboardUserChart = catchAsync(async (req: Request, res: Response) => {
  const year = parseInt(req.query.year as string);
  if (!year) {
    throw new ApiError(httpStatus.NOT_FOUND, "Year is required");
  }
  const result = await AdminService.dashboardUserChart(year);
  return sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Dashboard user chart.",
    data: result,
  });
});
const workers = catchAsync(async (req: Request, res: Response) => {
  const { gender, role, suburb, state, searchQ, language } = req.query;
  const page = parseInt(req?.query?.page as string) || 1;
  const limit = parseInt(req?.query?.limit as string) || 10;
  const me = req.user as IUserPayload;
  let query: Record<string, any> = {
    isDeleted: false,
    _id: { $ne: new mongoose.Types.ObjectId(me?.id) },
  };

  // Handle gender filter (case-insensitive)
  if (gender && typeof gender === "string") {
    query.gender = { $regex: new RegExp(gender, "i") };
  }

  // Handle role filter (case-insensitive)
  if (role && typeof role === "string") {
    query.role = { $regex: new RegExp(role, "i") };
  }

  // Handle suburb filter (case-insensitive)
  if (suburb && typeof suburb === "string") {
    query.suburb = { $regex: new RegExp(suburb, "i") };
  }

  // Handle state filter (case-insensitive) - FIXED TYPO
  if (state && typeof state === "string") {
    query.state = { $regex: new RegExp(state, "i") }; // Was using 'language' by mistake
  }

  // Handle language array search (case-insensitive)
  if (language && typeof language === "string") {
    const cleanedLanguage = language.trim();
    if (cleanedLanguage) {
      query.languagesSpoken = {
        $elemMatch: { $regex: new RegExp(cleanedLanguage, "i") },
      };
    }
  }

  // Handle search query (first name OR last name)
  if (searchQ && typeof searchQ === "string") {
    const searchRegex = new RegExp(searchQ, "i");
    query.$or = [{ firstName: searchRegex }, { lastName: searchRegex }];
  }

  const result = await AdminService.workers(query, page, limit);
  const total = await UserModel.countDocuments(query);
  const pagination = paginationBuilder({
    totalData: total,
    currentPage: page,
    limit: limit,
  });
  return sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Workers retrieved successfully",
    pagination,
    data: result,
  });
});
const workersForNotification = catchAsync(
  async (req: Request, res: Response) => {
    const { searchQ } = req.query;
    const page = parseInt(req?.query?.page as string) || 1;
    const limit = parseInt(req?.query?.limit as string) || 10;
    const me = req.user as IUserPayload;
    let query: Record<string, any> = {
      isDeleted: false,
      _id: { $ne: new mongoose.Types.ObjectId(me?.id) },
    };

    if (searchQ && typeof searchQ === "string") {
      const searchRegex = new RegExp(searchQ, "i");
      query.$or = [
        { firstName: searchRegex },
        { lastName: searchRegex },
        { suburb: searchRegex },
      ];
    }
    console.log(query);
    const result = await AdminService.workersForNotification(
      query,
      page,
      limit,
    );
    const total = await UserModel.countDocuments(query);
    const pagination = paginationBuilder({
      totalData: total,
      currentPage: page,
      limit: limit,
    });
    return sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Workers retrieved successfully",
      pagination,
      data: result,
    });
  },
);
const getWorker = catchAsync(async (req: Request, res: Response) => {
  const userId = req.params?.userId;

  const query = {
    userId: new mongoose.Types.ObjectId(userId),
  };
  const result = await AdminService.getUserWithDocs(query);
  return sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Worker details retrieved successfully",
    data: result,
  });
});
const updateWorkerStatus = catchAsync(async (req: Request, res: Response) => {
  const status = req.query?.status as string;
  const userId = req.params?.userId as string;
  if (!status) {
    throw new ApiError(httpStatus.NOT_FOUND, "status is required");
  }
  const query = {
    _id: new mongoose.Types.ObjectId(userId),
    isDeleted: false,
    isVerified: true,
    role: { $ne: "admin" },
  };
  const result = await AdminService.updateWorkerStatus(query, status);
  if (!result) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Invalid oparation");
  }
  return sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Worker status update successfully",
    data: status,
  });
});
const monthlyEarning = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.params.userId as string;
      const query = {
        user: new mongoose.Types.ObjectId(user),
      };

      const result = await AdminService.monthlyEarning(query);

      return sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Monthly Earning In dashboard",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },
);
const getEarningsGroupedByDay = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.params.userId;
      if (!req?.query?.startDate) {
        throw new ApiError(
          httpStatus.NOT_FOUND,
          "startDate is required in body.",
        );
      }
      if (!req?.query?.endDate) {
        throw new ApiError(
          httpStatus.NOT_FOUND,
          "endDate is required in body.",
        );
      }
      const query = {
        user: new mongoose.Types.ObjectId(user),
      };
      const startDate = new Date(startOfDay(req.query.startDate as string));
      const endDate = endOfDay(req.query.endDate as string);

      const result: any = await EarningServices.getEarningsGroupedByDay(
        startDate,
        endDate,
        query,
      );

      return sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Daily Earnings",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },
);
const paymentStatus = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.params.userId;
      if (!req?.body?.startDate) {
        throw new ApiError(
          httpStatus.NOT_FOUND,
          "startDate is required in body.",
        );
      }
      if (!req?.body?.endDate) {
        throw new ApiError(
          httpStatus.NOT_FOUND,
          "endDate is required in body.",
        );
      }
      if (!req?.body?.status) {
        throw new ApiError(httpStatus.NOT_FOUND, "status is required in body.");
      }
      const query = {
        user: new mongoose.Types.ObjectId(user),
      };
      const startDate = startOfDay(req.body.startDate);
      const endDate = endOfDay(req.body.endDate);
      const result: any = await EarningServices.paymentStatus(
        startDate,
        endDate,
        query,
        req.body?.status,
      );

      return sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Payment make paid",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },
);

const getShiftById = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user as IUserPayload | undefined;
    if (!user || !user.id) {
      throw new ApiError(httpStatus.UNAUTHORIZED, "User not authenticated");
    }
    const { id } = req.params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      throw new ApiError(httpStatus.BAD_REQUEST, "Invalid shift ID");
    }

    const query: any = {
      _id: new mongoose.Types.ObjectId(id),
      applyedUsers: { $ne: new mongoose.Types.ObjectId(user.id) },
      isDeleted: false,
    };
    const shift = await ShiftService.getShiftById(query);
    if (!shift) {
      throw new ApiError(httpStatus.NOT_FOUND, "Shift not found");
    }

    return sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Shift fetched successfully",
      data: shift,
    });
  },
);
const getShiftMiniById = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      throw new ApiError(httpStatus.BAD_REQUEST, "Invalid shift ID");
    }

    const query: any = {
      _id: new mongoose.Types.ObjectId(id),
      // applyedUsers: { $ne: new mongoose.Types.ObjectId(user.id) },
      // isDeleted: false,
    };
    const shift: any = await ShiftService.getShiftMiniById(query);
    if (!shift) {
      throw new ApiError(httpStatus.NOT_FOUND, "Shift not found");
    }
    const response = {
      clientName: `${shift?.clientFirstName} ${shift?.clientLastName}`,
      assignedWorkerName:
        shift?.assigned?.firstName && shift?.assigned?.lastName
          ? `${shift?.assigned?.firstName} ${shift?.assigned?.lastName}`
          : "Not assigned anyone",
      workTime: `${new Date(shift.workingTimeStart).toLocaleTimeString(
        "en-US",
        {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        },
      )} - ${new Date(shift.workingTimeFinish).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })}`,
      date: shift.workingTimeStart,
      clientPayhourlyRate: shift.clientPayhourlyRate,
      clientPaytravelRatePerKm: shift.clientPaytravelRatePerKm,
      workerHourlyRate: shift.hourlyRate,
      workerTravelKMRate: shift.travelRatePerKm,
    };

    return sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Shift fetched successfully",
      data: response,
    });
  },
);
const getShift = catchAsync(async (req: Request, res: Response) => {
  const searchQ = req.query?.searchQ as string;
  // const status = req.query?.status as string;
  const date = req.query?.date as string;
  const query: any = {
    assigned: null,
    isDeleted: false,
  };

  if (date) {
    // Create date object in local timezone
    const localDate = new Date(date);
    // Start of day in local time
    const startDate = startOfDay(localDate);
    // End of day in local time
    const endDate = endOfDay(localDate);

    query.workStartDate = {
      $gte: startDate,
      $lte: endDate,
    };
  }

  if (searchQ) {
    query.$or = [
      { clientFirstName: { $regex: searchQ.toString(), $options: "i" } },
      { clientLastName: { $regex: searchQ.toString(), $options: "i" } },
    ];
  }

  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const shift = await ShiftService.getShift(query, page, limit);

  if (!shift) {
    throw new ApiError(httpStatus.NOT_FOUND, "Shift not found");
  }
  const response = shift?.map((data: any) => {
    return {
      shift_id: data?._id,
      clientImage: data?.clientImage?.publicFileURL || "",
      clientName: `${data?.clientFirstName} ${data?.clientLastName}`,
      clientFullAddress: data?.clientFullAddress,
      duration: `${new Date(data.workingTimeStart).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })} - ${new Date(data.workingTimeFinish).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })}`,
      frequency: data?.frequency,
      startDate: data?.workStartDate,
      candidate: data?.applyedUsers?.length,
      isDeleted: data?.isDeleted ? true : false,
    };
  });
  const totalData = await Shift.countDocuments(query);
  const pagination = paginationBuilder({
    totalData: totalData,
    currentPage: page,
    limit,
  });
  return sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Shift fetched successfully",
    pagination,
    data: response,
  });
});
const applyedWorker = catchAsync(async (req: Request, res: Response) => {
  const shiftId = req.params?.shiftId as string;
  const query: any = {
    shift: new mongoose.Types.ObjectId(shiftId),
    status: "pending",
    input: { $ne: "no" },
  };
  const application: any = await ShiftService.getApplication(query);
  if (!application) {
    throw new ApiError(httpStatus.NOT_FOUND, "Application not found");
  }
  const response = application?.map((data: any) => {
    return {
      shift_id: data?.shift?._id,
      user_id: data?.user?._id,
      application_id: data?._id,
      name: `${data?.user?.firstName} ${data?.user?.lastName}`,
      email: data?.user?.email,
      address: data?.user?.residentialAddress,
      applyDate: data?.createdAt,
    };
  });

  return sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Shift applyed worker get successfully",
    data: response,
  });
});
const getShifts = catchAsync(async (req: Request, res: Response) => {
  const statusValue = ["all", "new assigned", "ongoing", "canceled"];
  const searchQ = req.query?.searchQ as string;
  const status = req.query?.status as string;
  const date = req.query.date as string;
  let query: any = {};
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  if (status && !statusValue?.includes(status)) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Invalid status value");
  }
  if (status && status === "new assigned") {
    query.assigned = { $ne: null };
    query.workStartDate = { $lte: new Date() };
    query.isDeleted = false;
  }
  if (status && status === "ongoing") {
    query.assigned = { $ne: null };
    query.workStartDate = { $gte: new Date() };
    query.isDeleted = false;
  }
  if (status && status === "canceled") {
    query.isDeleted = true;
  }

  if (searchQ) {
    query.$or = [
      { clientFirstName: { $regex: searchQ.toString(), $options: "i" } },
      { clientLastName: { $regex: searchQ.toString(), $options: "i" } },
    ];
  }
  if (date) {
    // Create date object in local timezone
    const localDate = new Date(date);
    // Start of day in local time
    const startDate = startOfDay(localDate);
    // End of day in local time
    const endDate = endOfDay(localDate);

    query.workStartDate = {
      $gte: startDate,
      $lte: endDate,
    };
  }
  const shift = await ShiftService.getShift(query, page, limit);

  if (!shift) {
    throw new ApiError(httpStatus.NOT_FOUND, "Shift not found");
  }
  const response = shift?.map((data: any) => {
    return {
      shift_id: data?._id,
      clientImage: data?.clientImage?.publicFileURL || "",
      clientName: `${data?.clientFirstName} ${data?.clientLastName}`,
      clientFullAddress: data?.clientFullAddress,
      workType: data?.workType,
      duration: `${new Date(data.workingTimeStart).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })} - ${new Date(data.workingTimeFinish).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })}`,
      frequency: data?.frequency,
      startDate: data?.workStartDate,
      isDeleted: data?.isDeleted ? true : false,
      // candidate: data?.applyedUsers?.length,
    };
  });
  const totalData = await Shift.countDocuments(query);
  const pagination = paginationBuilder({
    totalData: totalData,
    currentPage: page,
    limit,
  });
  return sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Shift fetched successfully",
    pagination,
    data: response,
  });
});
const profitFilter = catchAsync(async (req: Request, res: Response) => {
  const startDate = req.query.startDate as string;
  const endDate = req.query.endDate as string;
  let query: any = {};
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;

  if (startDate && endDate) {
    // Create date object in local timezone

    // Start of day in local time
    const start = startOfDay(new Date(startDate));
    // End of day in local time
    const end = endOfDay(new Date(endDate));

    query.createdAt = {
      $gte: start,
      $lte: end,
    };
  }

  const profits: any = await ShiftService.profitFilter(query, page, limit);

  if (!profits) {
    throw new ApiError(httpStatus.NOT_FOUND, "Shift not found");
  }

  // Calculate the total profit
  const totalProfit = profits.reduce((acc: number, data: any) => {
    return acc + (data?.totalProfit || 0);
  }, 0);

  const response = profits?.map((data: any) => {
    return {
      shift_id: data?.shift?._id,
      clientImage: data?.shift?.clientImage?.publicFileURL || "",
      clientName: `${data?.shift?.clientFirstName} ${data?.shift?.clientLastName}`,
      frequency: data?.shift?.frequency,
      startDate: data?.shift?.workStartDate,
      status: determineStatus({
        isDeleted: data?.shift?.isDeleted,
        assigned: data?.shift?.assigned,
        workStartDate: data?.shift?.workStartDate,
        workType: data?.shift?.workType,
      }),
      profit: data?.totalProfit,
      // candidate: data?.applyedUsers?.length,
    };
  });

  const totalData = await CheckOut.countDocuments(query);
  const pagination = paginationBuilder({
    totalData: totalData,
    currentPage: page,
    limit,
  });

  return sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Profit fetched successfully",
    pagination,
    data: { details: response, totalProfit },
  });
});

const profitFilterDetails = catchAsync(async (req: Request, res: Response) => {
  const startDate = req.query.startDate as string;
  const endDate = req.query.endDate as string;
  const shift = req.params.shiftId as string;
  let query: any = {};
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  if (shift) {
    query.shift = new mongoose.Types.ObjectId(shift);
  }
  if (startDate && endDate) {
    // Start of day in local time
    const start = startOfDay(new Date(startDate));
    // End of day in local time
    const end = endOfDay(new Date(endDate));

    query.createdAt = {
      $gte: start,
      $lte: end,
    };
  }
  // else {
  //   throw new ApiError(
  //     httpStatus.BAD_REQUEST,
  //     "startDate and endDate is required"
  //   );
  // }
  const profits: any = await ShiftService.profitFilterDetails(
    query,
    page,
    limit,
  );

  if (!profits) {
    throw new ApiError(httpStatus.NOT_FOUND, "Shift not found");
  }
  const response = profits?.map((data: any) => {
    return {
      shift_id: data?.shift?._id,
      date: data?.createdAt,
      work_hours: data?.shiftData?.totalShiftHours,
      travelKM: data?.how_many_kilometers_did_you_travel_with_the_client_only,
      clientPay: data?.totalClientPay,
      workerPay: data?.totalWorkerIncome,
      profits: data?.profit,
      // candidate: data?.applyedUsers?.length,
    };
  });
  const totalData = await CheckOut.countDocuments(query);
  const pagination = paginationBuilder({
    totalData: totalData,
    currentPage: page,
    limit,
  });
  return sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Profit fetched successfully",
    pagination,
    data: response,
  });
});

const shiftAction = catchAsync(async (req: Request, res: Response) => {
  const shiftId = req.params?.shiftId as string;
  const status: boolean = req.body?.status;
  if (status === null) {
    throw new ApiError(httpStatus.NOT_FOUND, "Status is required in body");
  }
  const query: any = {
    _id: new mongoose.Types.ObjectId(shiftId),
  };
  await ShiftService.shiftAction(query, status);

  return sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Shift action applyed",
    data: status,
  });
});

const getUserSchedule = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.params.userId;
      const date = req.query.date as string;

      const parsedDate = date ? new Date(date) : null;
      let startDate = new Date();
      const query: any = {
        assigned: new mongoose.Types.ObjectId(user),
        isDeleted: false,
      };

      if (parsedDate && !isNaN(parsedDate.getTime())) {
        startDate = startOfMonth(parsedDate);
        query.workStartDate = {
          $gte: startOfMonth(parsedDate),
          $lte: endOfMonth(parsedDate),
        };
      }

      const result = await ShiftService.getUserSchedule(query, startDate);

      return sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Booking",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },
);
export const AdminController = {
  changeUserStatus,
  clients,
  dashboardStacks,
  updateFAQ,
  drivers,
  addArtical,
  dashboardUserChart,
  updateArtical,
  workers,
  workersForNotification,
  addFaq,
  getWorker,
  updateWorkerStatus,
  monthlyEarning,
  getEarningsGroupedByDay,
  paymentStatus,
  getShiftById,
  getShift,
  applyedWorker,
  getShifts,
  profitFilter,
  profitFilterDetails,
  shiftAction,
  getUserSchedule,
  getShiftMiniById,
};
