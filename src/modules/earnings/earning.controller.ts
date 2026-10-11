import httpStatus from "http-status";
import sendResponse from "../../utils/sendResponse";
import { ShiftService } from "../shift/shift.service";
import mongoose from "mongoose";
import { IUserPayload } from "../../middlewares/roleGuard";
import { NextFunction, Request, Response } from "express";
import catchAsync from "../../utils/catchAsync";
import { EarningServices } from "./earning.service";
import ApiError from "../../errors/ApiError";
import { endOfDay, startOfDay } from "date-fns";

const monthlyEarning = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user as IUserPayload;
      const query = {
        user: new mongoose.Types.ObjectId(user?.id),
      };

      const result = await EarningServices.monthlyEarning(query);

      return sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Monthly Earning",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);
const getEarningsGroupedByDay = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user as IUserPayload;
      if (!req?.query?.startDate) {
        throw new ApiError(
          httpStatus.NOT_FOUND,
          "startDate is required in query."
        );
      }
      if (!req?.query?.endDate) {
        throw new ApiError(
          httpStatus.NOT_FOUND,
          "endDate is required in query."
        );
      }
      const query = {
        user: new mongoose.Types.ObjectId(user?.id),
      };
      const startDate = startOfDay(req.query?.startDate as string);
      const endDate = endOfDay(req.query?.endDate as string);
      // const endDate = new Date(new Date(req.body.endDate).setHours(0, 0, 0, 0));

      const result = await EarningServices.getEarningsGroupedByDay(
        startDate,
        endDate,
        query
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
  }
);
export const EarningControllers = {
  monthlyEarning,
  getEarningsGroupedByDay,
};
