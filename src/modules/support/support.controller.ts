import httpStatus from "http-status";
import sendResponse from "../../utils/sendResponse";
import sendError from "../../utils/sendError";
import { findUserById } from "../user/user.utils";
import { verifyToken } from "../../utils/JwtToken";
import catchAsync from "../../utils/catchAsync";
import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import {
  createSupportService,
  findSupportId,
  supportDelete,
  supportList,
} from "./support.service";
import { emitNotification } from "../../utils/socket";
import mongoose, { Types } from "mongoose";
import ApiError from "../../errors/ApiError";
import paginationBuilder from "../../utils/paginationBuilder";

export const needSupport = catchAsync(async (req: Request, res: Response) => {
  let decoded;
  try {
    decoded = verifyToken(req.headers.authorization);
  } catch (error: any) {
    return sendError(res, error);
  }
  const userId = decoded.id as string;
  const userObjectId = new mongoose.Types.ObjectId(userId);
  const { supportMsg } = req.body;

  if (!supportMsg) {
    return sendError(res, {
      statusCode: httpStatus.BAD_REQUEST,
      message: "What kind of support do you want?",
    });
  }

  // Find the user and their role
  const user = await findUserById(userId);
  if (!user) {
    return sendError(res, {
      statusCode: httpStatus.NOT_FOUND,
      message: "User not found.",
    });
  }

  const name = `${user.firstName} ${user.lastName}`;
  const email = user.email;
  const msg = supportMsg;
  const createdCategory = await createSupportService(name, email, msg);

  // Success response
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message:
      "Your support request has been received. We will review it and get back to you shortly.",

    data: null, // returning the updated user with the supportMsg field updated
  });

  //--------------------------> emit function <-------------------------
  // Define notification messages
  const userMsg =
    "Our support team has received your message and will get back to you shortly. 🚀";

  const primaryMsg = `🌟 A user has requested support:👤Name:${name} ✉️ Email: ${email} `;

  await emitNotification({
    userId: userObjectId,
    adminMsgTittle: "Support Request Alert!",
    userMsgTittle: "Thank you for reaching out!",
    userMsg: userMsg,
    adminMsg: primaryMsg,
  });
  //--------------------------> emit function <-------------------------
});

export const getSupport = catchAsync(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const { support, totalSupport } = await supportList(page, limit);
  const pagination = paginationBuilder({
    totalData: totalSupport,
    currentPage: page,
    limit,
  });
  // Patch: convert null to 0 for prevPage/nextPage to match expected type
  const patchedPagination = {
    ...pagination,
    prevPage: pagination.prevPage ?? 0,
    nextPage: pagination.nextPage ?? 0,
    limit,
    totalItem: pagination.totalData,
  };
  if (support.length === 0) {
    return sendResponse(res, {
      statusCode: httpStatus.NO_CONTENT,
      success: false,
      message: "No support found in this area",
      data: [],
      pagination: patchedPagination,
    });
  }
  const responseData = support.map((support) => {
    return {
      _id: support._id,
      name: `${support.firstName} ${support.lastName}`,
      email: support.email,
      msg: support.msg,
      createdAt: support.createdAt,
    };
  });
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "All supports retrived successfully",
    data: responseData,
    pagination: patchedPagination,
  });
});

export const deleteSupport = catchAsync(async (req: Request, res: Response) => {
  const id = req.query?.supportId as string;

  const support = await findSupportId(id);

  if (!support) {
    // return sendError(res, {
    //   statusCode: httpStatus.NOT_FOUND,
    //   message: "support not found .",
    // });
    throw new ApiError(httpStatus.NOT_FOUND, "support not found .");
  }

  if (support.isDeleted) {
    // return sendError(res, {
    //   statusCode: httpStatus.NOT_FOUND,
    //   message: "This support is  already deleted.",
    // });
    throw new ApiError(
      httpStatus.NOT_FOUND,
      "This support is  already deleted."
    );
  }
  await supportDelete(id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "support deleted successfully",
    data: null,
  });
});
