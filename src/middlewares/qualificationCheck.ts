import { NextFunction, Request, Response } from "express";
import { DocumentModel } from "../modules/document/document.model";
import mongoose from "mongoose";
import { IUserPayload } from "./roleGuard";
import catchAsync from "../utils/catchAsync";
import { ShiftService } from "../modules/shift/shift.service";
import httpStatus from "http-status";
import ApiError from "../errors/ApiError";

// Helper function to match qualification type
export function matchQualification(
  array: any[] = [],
  matchWith: string,
): boolean {
  if (!Array.isArray(array) || !matchWith) return false;
  return array.some(
    (data: any) =>
      data?.type?.toLowerCase() === matchWith.toLowerCase() &&
      data?.isVerifyed?.toLowerCase() === "approved",
  );
}

export const checkQualification = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user as IUserPayload | undefined;
    if (!user || !user.id) {
      throw new ApiError(httpStatus.UNAUTHORIZED, "User not authenticated");
    }

    const document = await DocumentModel.findOne({
      userId: new mongoose.Types.ObjectId(user.id),
    }).populate("userId", "-password");

    if (!document) {
      throw new ApiError(httpStatus.NOT_FOUND, "User document not found");
    }

    const { shiftId } = req.params;
    if (!shiftId || !mongoose.Types.ObjectId.isValid(shiftId)) {
      throw new ApiError(httpStatus.BAD_REQUEST, "Invalid shift ID");
    }

    const query: any = {
      _id: new mongoose.Types.ObjectId(shiftId),
      applyedUsers: { $ne: new mongoose.Types.ObjectId(user.id) },
      isDeleted: false,
    };
    const shift = await ShiftService.getShiftById(query);
    if (!shift) {
      throw new ApiError(httpStatus.NOT_FOUND, "Invalid shift");
    }
    console.log(document?.policeCheck);
    // Build requirements object
    const requirements = {
      valid_id: {
        value: true,
        client_value: true, // Always true, can be extended for more checks
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
        value: shift?.preferredGender,
        client_value:
          document?.userId?.gender && shift?.preferredGender
            ? document.userId.gender === shift.preferredGender
            : false,
      },
      qualifications: {
        value: shift?.preferredQualification,
        client_value: shift?.preferredQualification
          ? matchQualification(
              document?.qualification,
              String(shift.preferredQualification),
            )
          : false,
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
    // Check if all requirements are met
    const allQualified =
      requirements?.valid_id?.client_value === requirements?.valid_id?.value &&
      requirements?.gender?.client_value &&
      requirements?.language?.client_value &&
      requirements?.police_check?.client_value ===
        requirements?.police_check?.value &&
      requirements?.qualifications?.client_value &&
      requirements?.driving_license_check?.client_value ===
        requirements?.driving_license_check?.value;

    if (allQualified) {
      return next();
    } else {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        "You are not qualified for this job",
      );
    }
  },
);
