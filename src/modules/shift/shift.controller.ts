import { Request, Response, NextFunction } from "express";
import catchAsync from "../../utils/catchAsync";
import { ShiftService } from "./shift.service";
import sendResponse from "../../utils/sendResponse";
import ApiError from "../../errors/ApiError";
import httpStatus from "http-status";
import mongoose from "mongoose";
import { requiredFields, TShift } from "./shift.interface";
import { IUserPayload } from "../../middlewares/roleGuard";
import { DocumentModel } from "../document/document.model";
import { matchQualification } from "../../middlewares/qualificationCheck";
import paginationBuilder from "../../utils/paginationBuilder";
import {
  getNextFortnightlyDateFrom,
  getNextWeeklyDateFrom,
  getTNextDaysFrom,
  getTNextFortnightsFrom,
} from "../../utils/getDate";
import { duration } from "moment";
import { generateDateArray } from "../../utils/monthFormat";
import { areDatesSame } from "../../utils/sameDateChecker";
import { TLanguages } from "../user/user.interface";
import { Earnings } from "../earnings/earning.model";
import { addDays, startOfDay } from "date-fns";

const createShiftController = catchAsync(
  async (req: Request, res: Response) => {
    const body = req.body;
    console.log(body, "==================");
    let clientImage = {
      path: "",
      publicFileURL: "",
    };
    if (req.file) {
      clientImage = {
        path: req.file.path,
        publicFileURL: `/images/${req.file.filename}`,
      };
    } else {
      throw new ApiError(httpStatus.BAD_REQUEST, "Client image is required");
    }

    // Build the flat shiftData object
    const shiftData = {
      ...body,
      clientImage,
    };

    // Validate all required flat fields for the new schema

    for (const field of requiredFields) {
      if (
        shiftData[field] === undefined ||
        shiftData[field] === null ||
        (Array.isArray(shiftData[field]) && shiftData[field].length === 0)
      ) {
        throw new ApiError(
          httpStatus.BAD_REQUEST,
          `Missing required field: ${field}`,
        );
      }
    }
    // Validate clientImage object
    if (!shiftData.clientImage.publicFileURL || !shiftData.clientImage.path) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        "clientImage must have publicFileURL and path",
      );
    }
    const result = await ShiftService.createShift(shiftData);
    res.status(201).json({
      success: true,
      message: "Shift created successfully",
      data: result,
    });
  },
);
const getShiftByIdController = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user as IUserPayload | undefined;
    if (!user || !user.id) {
      throw new ApiError(httpStatus.UNAUTHORIZED, "User not authenticated");
    }
    const { id } = req.params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      throw new ApiError(httpStatus.BAD_REQUEST, "Invalid shift ID");
    }
    const document = await DocumentModel.findOne({
      userId: new mongoose.Types.ObjectId(user.id),
    }).populate("userId", "-password");
    if (!document) {
      throw new ApiError(httpStatus.NOT_FOUND, "User document not found");
    }
    // Exclude shifts already applied by this user
    const query: any = {
      _id: new mongoose.Types.ObjectId(id),
      applyedUsers: { $ne: new mongoose.Types.ObjectId(user.id) },
      isDeleted: false,
    };
    const shift = await ShiftService.getShiftById(query);
    if (!shift) {
      throw new ApiError(httpStatus.NOT_FOUND, "Shift not found");
    }

    // Build requirements object with type safety and null checks
    const requirements = {
      valid_id: {
        value: true,
        client_value: document?.userId?.verifyedByAdmin,
      },
      police_check: {
        value: shift?.policeCheck,
        client_value: shift?.policeCheck
          ? Array.isArray(document?.checks) &&
            document.checks.length > 0 &&
            matchQualification(document.checks, String("Police Check"))
          : false,
      },
      ndis_worker_check: {
        value: shift?.ndidWorkerCheck,
        client_value: shift?.ndidWorkerCheck
          ? Array.isArray(document?.checks) &&
            document.checks.length > 0 &&
            matchQualification(document.checks, String("NDIS Worker Check"))
          : false,
      },

      driving_license_check: {
        value: shift?.drivingLicense,
        client_value: shift?.drivingLicense
          ? document?.drivingLicense?.isVerifyed === "approved" && true
          : false,
      },
      gender: {
        value: shift?.preferredGender, // The preferred gender from the shift object
        client_value:
          document?.userId?.gender && shift?.preferredGender
            ? document.userId.gender === shift.preferredGender // If both values exist, compare them
            : false, // If either document?.userId?.gender or shift?.preferredGender is missing, set false
      },

      qualifications: {
        value: shift?.preferredQualification,
        client_value:
          shift?.preferredQualification &&
          matchQualification(
            document?.qualification,
            String(shift.preferredQualification),
          ),
      },
      language: {
        value: shift?.language,
        client_value:
          Array.isArray(document?.userId?.languagesSpoken) &&
          Array.isArray(shift?.language)
            ? document.userId.languagesSpoken.some((language: string) =>
                (shift.language ?? []).includes(language),
              )
            : false,
      },
    };
    // Build response object
    const response = {
      clientDetails: {
        name: `${shift.clientFirstName} ${shift.clientLastName}` || "Unknown",
        address: shift.clientFullAddress,
        image: shift.clientImage?.publicFileURL || "",
      },
      description: shift.description || "",
      summary: {
        time: `${new Date(shift.workingTimeStart).toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        })} - ${new Date(shift.workingTimeFinish).toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        })}`,
        duration:
          Math.abs(
            shift.workingTimeFinish.getTime() -
              shift.workingTimeStart.getTime(),
          ) /
          (1000 * 60 * 60),
        date: shift.workStartDate,
        frequency: shift.frequency,
        address: shift.clientFullAddress,
        postalCode: shift?.clientPostcode,
      },
      earnings: {
        hourlyRate: shift.hourlyRate,
        travelRate: shift.travelRatePerKm,
        total: shift.hourlyRate + shift.travelRatePerKm,
      },
      requirements,
      services: shift?.services,
      eligible:
        requirements?.valid_id?.client_value ===
          requirements?.valid_id?.value &&
        requirements?.gender?.client_value &&
        requirements?.language?.client_value &&
        requirements?.police_check?.client_value ===
          requirements?.police_check?.value &&
        requirements?.ndis_worker_check?.client_value ===
          requirements?.ndis_worker_check?.value &&
        requirements?.qualifications?.client_value &&
        requirements?.driving_license_check?.client_value ===
          requirements?.driving_license_check?.value,
    };

    return sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Shift fetched successfully",
      data: response,
    });
  },
);
const applyShift = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { shiftId } = req.params;
      const { input } = req.body;
      if (!input?.trim()) {
        throw new ApiError(httpStatus.BAD_REQUEST, "input is required");
      }
      const data = {
        user: (req.user as IUserPayload).id,
        shift: shiftId,
        input: input,
      };
      const result = await ShiftService.applyShift(data);
      return sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Shift apply successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },
);
const action = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { applicationId } = req.params;
      const { status, user } = req.body;

      if (!status || typeof status !== "string" || !status.trim()) {
        throw new ApiError(
          httpStatus.BAD_REQUEST,
          "status is required and must be a non-empty string",
        );
      }
      if (!user) {
        throw new ApiError(httpStatus.BAD_REQUEST, "user is required");
      }
      const query = {
        _id: new mongoose.Types.ObjectId(applicationId),
        user: new mongoose.Types.ObjectId(user),
        input: { $ne: "no" },
      };
      const result = await ShiftService.action(query, status);
      return sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Shift action successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },
);
const getShiftController = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user as IUserPayload;
      const jobType = req.query.type as string;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const skip = (page - 1) * limit;
      let query: any = {
        isDeleted: false,
        workStartDate: { $gte: startOfDay(new Date()) },
        workerRole: user?.role,
      };

      if (jobType === "open") {
        query.applyedUsers = { $ne: new mongoose.Types.ObjectId(user?.id) };
      }
      if (jobType === "applied") {
        // query.status = {
        //   $ne: "canceled",
        // };
        query.applyedUsers = { $in: new mongoose.Types.ObjectId(user?.id) };
      }
      // Get total count for pagination
      const totalData = await ShiftService.countShifts(query);
      // Get paginated data
      const result: any = await ShiftService.getShiftController(
        query,
        skip,
        limit,
        new mongoose.Types.ObjectId(user?.id),
      );

      const response = result?.map((data: any) => {
        return {
          status:
            data?.assigned?.toString() === user?.id?.toString()
              ? "You got this shift"
              : data?.assigned === null &&
                  data?.applyedUsers?.includes(
                    new mongoose.Types.ObjectId(user?.id),
                  )
                ? "Application send"
                : data?.assigned !== null &&
                    data?.assigned?.toString() !== user?.id?.toString()
                  ? "Filed by someone else"
                  : "",

          address: data?.clientFullAddress || "",
          timeRanges: `${new Date(data.workingTimeStart).toLocaleTimeString(
            "en-US",
            {
              hour: "2-digit",
              minute: "2-digit",
              hour12: true,
            },
          )} - ${new Date(data.workingTimeFinish).toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
          })}`,
          date: data.workStartDate,
          frequency: data.frequency,
          workType: data.workType || "N/A",
          id: data?._id,
          shift_id: data?.shift,
          client_image: data?.clientImage?.publicFileURL || "",
        };
      });
      const pagination = paginationBuilder({
        totalData,
        currentPage: page,
        limit: limit,
      });
      return sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Shift view successfully",
        data: response,
        pagination: pagination,
      });
    } catch (error) {
      next(error);
    }
  },
);
const status = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user as IUserPayload;
      const { shiftId } = req.params;
      const query = {
        _id: new mongoose.Types.ObjectId(shiftId),
        applyedUsers: {
          $in: new mongoose.Types.ObjectId(user?.id),
        },
      };

      const result = await ShiftService.status(query);
      let message = null;
      if (result?.assigned?.toString() === user?.id?.toString()) {
        message = "You got this shift";
      } else if (result?.assigned === null) {
        message = "Application send";
      } else if (result?.assigned?.toString() !== user?.id?.toString()) {
        message = "Filed by someone else";
      }
      return sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Shift status checking",
        data: message,
      });
    } catch (error) {
      next(error);
    }
  },
);
const myShift = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const limit = parseInt(req.query.limit as string) || 5;
    try {
      const user = req.user as IUserPayload;
      const query = {
        assigned: new mongoose.Types.ObjectId(user?.id),
        workStartDate: {
          $lte: addDays(startOfDay(new Date()), 30),
        },
        isDeleted: false,
      };

      const result: any = await ShiftService.myShift(query, limit);

      const data = result?.map((shift: any) => {
        const shiftDay = shift?.workStartDate?.getDate();
        const workType = shift?.workType; // "one-off" , "ongoing"
        const frequency = shift?.frequency; // "one off", "weekly", "fortnight"
        const weekDay = getNextWeeklyDateFrom(shiftDay);
        const fortnightDay = getNextFortnightlyDateFrom(shiftDay);
        const weekDayListOnlyTime = getTNextDaysFrom(shiftDay);
        const fortnightDayListOnlyTime = getTNextFortnightsFrom(shiftDay);
        const oneoffweekly = areDatesSame(new Date(), [weekDay.time]);
        const ongoingweekly = areDatesSame(new Date(), weekDayListOnlyTime);
        const ongoingfortnight = areDatesSame(
          new Date(),
          fortnightDayListOnlyTime,
        );
        const oneoffone_off = areDatesSame(new Date(), [shift?.workStartDate]);
        console.log(oneoffone_off);
        const oneofffortnight = areDatesSame(new Date(), [fortnightDay.time]);
        if (workType === "ongoing" && frequency === "one off") {
          if (oneoffone_off) {
            return {
              id: shift?._id,
              date: new Date(),
              client: `${shift?.clientFirstName} ${shift?.clientLastName}`,
              time: `${new Date(shift.workingTimeStart).toLocaleTimeString(
                "en-US",
                {
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: true,
                },
              )} - ${new Date(shift.workingTimeFinish).toLocaleTimeString(
                "en-US",
                {
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: true,
                },
              )}`,
              address: shift?.clientFullAddress,
              image: shift?.clientImage?.publicFileURL || "",
            };
          }
        } else if (
          workType === "ongoing" &&
          frequency === "weekly" &&
          ongoingweekly
        ) {
          return {
            id: shift?._id,
            date: new Date(),
            client: `${shift?.clientFirstName} ${shift?.clientLastName}`,
            time: `${new Date(shift.workingTimeStart).toLocaleTimeString(
              "en-US",
              {
                hour: "2-digit",
                minute: "2-digit",
                hour12: true,
              },
            )} - ${new Date(shift.workingTimeFinish).toLocaleTimeString(
              "en-US",
              {
                hour: "2-digit",
                minute: "2-digit",
                hour12: true,
              },
            )}`,
            address: shift?.clientFullAddress,
            image: shift?.clientImage?.publicFileURL || "",
          };
        } else if (
          workType === "ongoing" &&
          frequency === "fortnight" &&
          ongoingfortnight
        ) {
          return {
            id: shift?._id,
            date: new Date(),
            client: `${shift?.clientFirstName} ${shift?.clientLastName}`,
            time: `${new Date(shift.workingTimeStart).toLocaleTimeString(
              "en-US",
              {
                hour: "2-digit",
                minute: "2-digit",
                hour12: true,
              },
            )} - ${new Date(shift.workingTimeFinish).toLocaleTimeString(
              "en-US",
              {
                hour: "2-digit",
                minute: "2-digit",
                hour12: true,
              },
            )}`,
            address: shift?.clientFullAddress,
            image: shift?.clientImage?.publicFileURL || "",
          };
        } else if (
          workType === "one-off" &&
          frequency === "one off" &&
          oneoffone_off
          // shiftDay === todayDate
        ) {
          return {
            id: shift?._id,
            date: new Date(),
            client: `${shift?.clientFirstName} ${shift?.clientLastName}`,
            time: `${new Date(shift.workingTimeStart).toLocaleTimeString(
              "en-US",
              {
                hour: "2-digit",
                minute: "2-digit",
                hour12: true,
              },
            )} - ${new Date(shift.workingTimeFinish).toLocaleTimeString(
              "en-US",
              {
                hour: "2-digit",
                minute: "2-digit",
                hour12: true,
              },
            )}`,
            address: shift?.clientFullAddress,
            image: shift?.clientImage?.publicFileURL || "",
          };
        } else if (
          workType === "one-off" &&
          frequency === "weekly" &&
          oneoffweekly
        ) {
          return {
            id: shift?._id,
            date: new Date(),
            client: `${shift?.clientFirstName} ${shift?.clientLastName}`,
            time: `${new Date(shift.workingTimeStart).toLocaleTimeString(
              "en-US",
              {
                hour: "2-digit",
                minute: "2-digit",
                hour12: true,
              },
            )} - ${new Date(shift.workingTimeFinish).toLocaleTimeString(
              "en-US",
              {
                hour: "2-digit",
                minute: "2-digit",
                hour12: true,
              },
            )}`,
            address: shift?.clientFullAddress,
            image: shift?.clientImage?.publicFileURL || "",
          };
        } else if (
          workType === "one-off" &&
          frequency === "fortnight" &&
          oneofffortnight
        ) {
          return {
            id: shift?._id,
            date: new Date(),
            client: `${shift?.clientFirstName} ${shift?.clientLastName}`,
            time: `${new Date(shift.workingTimeStart).toLocaleTimeString(
              "en-US",
              {
                hour: "2-digit",
                minute: "2-digit",
                hour12: true,
              },
            )} - ${new Date(shift.workingTimeFinish).toLocaleTimeString(
              "en-US",
              {
                hour: "2-digit",
                minute: "2-digit",
                hour12: true,
              },
            )}`,
            address: shift?.clientFullAddress,
            image: shift?.clientImage?.publicFileURL || "",
          };
        } else {
          return "fu";
        }
      });
      const finaldata = data?.filter((d: any) => d !== "fu");

      return sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Today shift",
        data: finaldata,
      });
    } catch (error) {
      next(error);
    }
  },
);
const myBooking = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user as IUserPayload;
      const query = {
        assigned: new mongoose.Types.ObjectId(user?.id),
        workStartDate: {
          $lte: addDays(new Date(), 30),
        },
        isDeleted: false,
      };

      const result = await ShiftService.myBooking(query);

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

const myBookingById = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user as IUserPayload;
      const id = req.params.shiftId as string;
      const query = {
        _id: new mongoose.Types.ObjectId(id),
        assigned: new mongoose.Types.ObjectId(user?.id),
        workStartDate: {
          $lte: new Date(new Date().setDate(new Date().getDate() + 30)),
        },
        isDeleted: false,
      };

      const result = await ShiftService.myBookingById(query);

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
const checkin = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user as IUserPayload;
      const id = req.params.shiftId as string;
      const query = {
        _id: new mongoose.Types.ObjectId(id),
        assigned: new mongoose.Types.ObjectId(user?.id),
        workStartDate: {
          $lte: new Date(new Date().setHours(0, 0, 0, 0)).setDate(
            new Date().getDate() + 30,
          ),
        },
        isDeleted: false,
      };

      await ShiftService.checkin(query);

      return sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Check-in successful",
        data: "",
      });
    } catch (error) {
      next(error);
    }
  },
);
const checkout = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user as IUserPayload;
      const id = req.params.shiftId as string;
      const query = {
        _id: new mongoose.Types.ObjectId(id),
        assigned: new mongoose.Types.ObjectId(user?.id),
        workStartDate: {
          $lte: new Date(new Date().setHours(0, 0, 0, 0)).setDate(
            new Date().getDate() + 30,
          ),
        },
        isDeleted: false,
      };

      const result = await ShiftService.checkout(query, req.body);
      const shiftQuery = {
        _id: new mongoose.Types.ObjectId(result?.shift),
      };
      ShiftService.getShiftById(shiftQuery)
        .then((shift) => {
          const hourRate: number = shift?.hourlyRate || 0;
          const travelRate: number = shift?.travelRatePerKm || 0;
          const duration: number = shift?.totalShiftHours || 0;
          const clientTraveled: number =
            result?.how_many_kilometers_did_you_travel_with_the_client_only ||
            0;

          const travelEarning = travelRate * clientTraveled || 0;
          const normalEarning = duration * hourRate || 0;
          Earnings.create({
            shift: result?.shift,
            user: result?.shift,
            amount: travelEarning + normalEarning,
          });
        })
        .catch((err) => {
          console.log(err);
        });

      return sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Check-out successful",
        data: "",
      });
    } catch (error) {
      next(error);
    }
  },
);

export const ShiftController = {
  getShiftByIdController,
  createShiftController,
  applyShift,
  action,
  getShiftController,
  status,
  myShift,
  myBooking,
  myBookingById,
  checkin,
  checkout,
};
