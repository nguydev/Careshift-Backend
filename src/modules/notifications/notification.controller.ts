import httpStatus from "http-status";
import { NextFunction, Request, Response } from "express";

import { findUserById } from "../user/user.utils";
import { NotificationModel } from "./notification.model";
import catchAsync from "../../utils/catchAsync";
import sendError from "../../utils/sendError";
import sendResponse from "../../utils/sendResponse";

import ApiError from "../../errors/ApiError";
import { sendPushNotificationToMultiple } from "./pushNotification/pushNotification.controller";
import paginationBuilder from "../../utils/paginationBuilder";
import { UserModel } from "../user/user.model";

// --- Role-based notification config ---
const roleNotificationConfig = {
  admin: {
    queryKey: "adminId",
    selectFields: "adminMsg adminMsgTittle isAdminRead createdAt updatedAt",
    readField: "isAdminRead",
    msgField: "adminMsg",
  },
  carer: {
    queryKey: "userId",
    selectFields: "userMsg userMsgTittle createdAt updatedAt",
    readField: "isCarerRead",
    msgField: "carerMsg",
  },
  nurse: {
    queryKey: "userId",
    selectFields: "userMsg userMsgTittle createdAt updatedAt",
    readField: "isNurseRead",
    msgField: "userMsg",
  },
  cleaner: {
    queryKey: "userId",
    selectFields: "userMsg userMsgTittle isCleanerRead createdAt updatedAt",
    readField: "isCleanerRead",
    msgField: "userMsg",
  },
} as const;

export const getMyNotification = catchAsync(
  async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;
    // Use req.auth for id/role, and fetch user from DB for full IUser
    const auth: any = req.user;
    console.log(auth);
    if (!auth) throw new ApiError(401, "Unauthorized");
    const user = await findUserById(auth.id);
    if (!user) throw new ApiError(404, "User not found.");

    // Role config
    const config =
      roleNotificationConfig[user.role as keyof typeof roleNotificationConfig];
    if (!config) {
      return sendError(res, {
        statusCode: httpStatus.BAD_REQUEST,
        message: "Invalid user role.",
      });
    }
    const query = { [config.queryKey]: user._id };
    const selectFields = config.selectFields;
    const readField = config.readField;
    const msgField = config.msgField;

    // Fetch notifications
    const notifications = await NotificationModel.find(query)
      .select(selectFields)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec();

    const totalNotifications =
      await NotificationModel.countDocuments(query).exec();
    // Use paginationBuilder for pagination info
    const pagination = paginationBuilder({
      totalData: totalNotifications,
      currentPage: page,
      limit: limit,
    });
    const formattedNotifications = notifications.map((notification) => ({
      _id: notification._id,
      isReadable: notification[readField] as boolean,
      title: (notification?.userMsgTittle as string) || "N/A",
      msg: (notification[msgField] as string) || "N/A",
      createdAt: notification.createdAt,
      updatedAt: notification.updatedAt,
    }));
    if (formattedNotifications.length === 0) {
      return sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "You have no notifications.",
        data: { notifications: [] },
      });
    }
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Here are your notifications.",
      data: {
        notifications: formattedNotifications,
        pagination: {
          ...pagination,
        },
      },
    });
    // Mark notifications as read
    await NotificationModel.updateMany(
      { ...query, [readField]: false },
      { $set: { [readField]: true } }
    );
  }
);

export const getUnreadBadgeCount = catchAsync(
  async (req: Request, res: Response) => {
    const auth = (req as any).auth;
    if (!auth) throw new ApiError(401, "Unauthorized");
    const user = await findUserById(auth.id);
    if (!user) throw new ApiError(404, "User not found");

    const config =
      roleNotificationConfig[user.role as keyof typeof roleNotificationConfig];
    if (!config) {
      return sendError(res, {
        statusCode: httpStatus.BAD_REQUEST,
        message: "Invalid user role.",
      });
    }
    const unreadCount = await NotificationModel.countDocuments({
      [config.queryKey]: user._id,
      [config.readField]: false,
    }).exec();
    const rawNotifications = await NotificationModel.find({
      [config.queryKey]: user._id,
      [config.msgField]: { $exists: true },
    })
      .sort({ createdAt: -1 })
      .limit(3)
      .select(`${config.msgField} createdAt`)
      .exec();
    const latestNotifications = rawNotifications.map((notification) => ({
      msg: notification[config.msgField] || "",
      createdAt: notification.createdAt,
    }));
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message:
        "Unread badge count and latest notifications retrieved successfully.",
      data: {
        unreadCount,
        latestNotifications,
      },
    });
  }
);

export const adminSendPushNotification = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { type, ids, title, body } = req.body;
    if (!type || !title || !body) {
      return res.status(400).json({
        message: "Missing required fields: type, title, and body.",
      });
    }
    let query: any = {};
    if (type === "all") {
      query = {};
    } else if (type === "nurse") {
      query.role = "nurse";
    } else if (type === "carer") {
      query.role = "carer";
    } else if (type === "cleaner") {
      query.role = "cleaner";
    } else if (type === "manual") {
      if (!Array.isArray(ids) || ids?.length <= 0) {
        throw new ApiError(
          httpStatus.NOT_FOUND,
          "Selected user ids is required in array"
        );
      }
      query._id = { $in: ids };
    }
    console.log(query);
    const user = await UserModel.find(query).select("fcmToken");
    const validTokens = user.map(
      (token: any) => token?.fcmToken && token?.fcmToken
    );

    // Ensure fcmTokens is an array of strings
    let tokens: string[] = [];
    if (Array.isArray(validTokens)) {
      tokens = validTokens;
    } else {
      return res.status(400).json({
        message: "fcmTokens must be a string or an array of strings.",
      });
    }

    // Use the multicast helper to send notifications to all provided tokens
    const response = await sendPushNotificationToMultiple(tokens, {
      title,
      body,
    });
    if (response?.responses[0]?.success) {
      return res
        .status(200)
        .json({ message: "Push notifications sent successfully.", response });
    } else {
      return res.status(200).json({
        message: "Push notifications sent successfully.",
        response,
      });
    }
  } catch (error) {
    next(error);
  }
};
