import { Request, Response } from "express";

import catchAsync from "../../utils/catchAsync";
import sendError from "../../utils/sendError";
import sendResponse from "../../utils/sendResponse";

import { UserService } from "./user.service";

import { OTPModel, UserModel } from "./user.model";

import { emitNotification } from "../../utils/socket";
import httpStatus from "http-status";
// import RegisterShowerModel from "../RegisterShower/RegisterShower.model";

import argon2 from "argon2";

import {
  findUserByEmail,
  findUserById,
  generateOTP,
  hashPassword,
  resendOTPEmail,
  saveOTP,
  sendManagerRequest,
  sendOTPEmailRegister,
  sendOTPEmailVerification,
  sendResetOTPEmail,
} from "./user.utils";

import ApiError from "../../errors/ApiError";
import {
  generateRegisterToken,
  generateToken,
  verifyToken,
} from "../../utils/JwtToken";
import mongoose from "mongoose";

import { sendPushNotification } from "../notifications/pushNotification/pushNotification.controller";
import { IUserPayload } from "../../middlewares/roleGuard";
import { validateUserLockStatus } from "../../middlewares/lock";
import { IUser } from "./user.interface";
import { PrivacyModel } from "../settings/privacy/Privacy.model";
import { AboutModel } from "../settings/About/About.model";
import { TermsModel } from "../settings/Terms/Terms.model";

const registerUser = catchAsync(async (req: Request, res: Response) => {
  const { firstName, lastName, email, password, fcmToken, role } = req.body;
  if (!role) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Role is required for registration.",
    );
  }
  // Validate that the role is provided and valid (already handled by zod, but double-check for safety)
  // Call the service to register the user, which returns an OTP.
  const { otp } = await UserService.registerUserService(
    firstName,
    lastName,
    email,
    password,
  );
  const token = generateRegisterToken({ email });
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "OTP sent to your email. Please verify to continue registration.",
    data: { token: token },
  });
  (async () => {
    try {
      await sendOTPEmailRegister(`${firstName} ${lastName}`, email, otp);
      const hashedPassword = await hashPassword(password);
      let image: any = {
        path: "",
        publicFileURL: "",
      };
      if (req.file) {
        const imagePath = `public\\images\\${req.file.filename}`;
        const publicFileURL = `/images/${req.file.filename}`;
        image = {
          path: imagePath,
          publicFileURL: publicFileURL,
        };
      }
      // Pass role to createUser
      const createdUser: any = await UserService.createUser({
        firstName,
        lastName,
        email,
        image,
        hashedPassword,
        fcmToken,
        role,
      });

      // Calculate OTP expiration (60 seconds from now)
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 60 * 1000);
      // Save or update the OTP in the database concurrently.
      await Promise.all([
        OTPModel.findOneAndUpdate(
          { email },
          { otp, expiresAt },
          { upsert: true },
        ),
        saveOTP(email, otp),
      ]);
      // --------> Emit notification <----------------
      // Convert the created user's id to a mongoose ObjectId type.
      // const userObjectId = new mongoose.Types.ObjectId(
      //   createdUser._id as string
      // );
      const createdUserData = createdUser.createdUser;
      console.log(createdUserData, "===========create========");
      // Create a payload for notifications with messages for both the user and the admin.
      const notificationPayload: any = {
        userId: createdUserData?._id,
        adminMsgTittle: "New Registration!",
        userMsgTittle: "Registration Completed",
        userMsg: `💫 Welcome to Carefinder, ${createdUserData?.firstName} ${createdUserData?.lastName}! 🎉 Your registration is complete, and we're thrilled to have you onboard. Start exploring and enjoy the experience! 🚀`,
        adminMsg: `🎉 A new user, ${createdUserData?.firstName} ${createdUserData?.lastName}, has successfully registered with Carefinder. Please welcome them aboard and ensure everything is set up for their journey.`,
      };

      // Emit the notification.
      await emitNotification(notificationPayload);
      // --------> End Emit notification <----------------
      // --------> Send push notification via FCM (if fcmToken is provided) <----------------
      if (fcmToken) {
        try {
          // Define the base push message.
          const pushMessage = {
            title: "🎉 Welcome to Sweepy!",
            body: `Hi ${createdUserData?.firstName} ${createdUserData?.lastName}, 🎉 Welcome to Carefinder! Your registration is complete. We're excited to have you onboard!`,
          };

          // Send the push notification.
          await sendPushNotification(fcmToken, pushMessage);
        } catch (pushError) {
          // Log any push notification errors without affecting the client response.
          console.error("Error sending push notification:", pushError);
        }
      }
      // --------> End push notification <----------------
    } catch (backgroundError) {
      // Log errors from background tasks so they don't affect the already sent response.
      console.error("Error in background tasks:", backgroundError);
    }
  })();
});

const resendOTP = catchAsync(async (req: Request, res: Response) => {
  let decoded;
  try {
    decoded = verifyToken(req.headers.authorization as string);
  } catch (error: any) {
    throw new ApiError(httpStatus.UNAUTHORIZED, "Invalid token");
  }
  const email = decoded.email as string;
  const now = new Date();
  const otpRecord = await OTPModel.findOne({ email });

  if (otpRecord && otpRecord.expiresAt > now) {
    const remainingTime = Math.floor(
      (otpRecord.expiresAt.getTime() - now.getTime()) / 1000,
    );

    throw new ApiError(
      httpStatus.FORBIDDEN,
      `You can't request another OTP before ${remainingTime} seconds.`,
    );
  }
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "A new OTP has been sent to your email.",
    data: null,
  });
  const otp = generateOTP();

  resendOTPEmail(email, otp)
    .then((res) => {
      console.log("Email Send");
    })
    .catch((err) => {
      console.log("Email not send");
    });
  await saveOTP(email, otp); // Save the new OTP with expiration
});

const loginUser = catchAsync(async (req: Request, res: Response) => {
  const { email, password, role, fcmToken } = req.body;

  const user = await findUserByEmail(email);

  if (!user) {
    throw new ApiError(404, "This account does not exist.");
  }

  if (user.isDeleted) {
    throw new ApiError(404, "your account is deleted.");
  }
  await validateUserLockStatus(user);
  const userId = user._id as string;
  const token = generateToken({
    id: userId,
    email: user.email,
    role: user.role ?? "",
  });

  if (!user.isVerified) {
    sendResponse(res, {
      statusCode: 401,
      success: false,
      message: "We've sent an OTP to your email to verify your profile.",
      data: {
        role: user.role,
        token,
      },
    });
    const fullName = `${user.firstName} ${user.lastName}`;
    const otp = generateOTP();
    sendOTPEmailVerification(fullName, email, otp)
      .then(() => {
        console.log("Email sent");
      })
      .catch((err) => {
        console.error("Error sending OTP email:", err);
      });
    return await saveOTP(email, otp);
  }
  const isPasswordValid = await argon2.verify(
    user.password as string,
    password,
  );
  if (!isPasswordValid) {
    throw new ApiError(401, "Wrong password!");
  }

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Login complete!",
    data: {
      user: {
        _id: user._id,
        firstName: user?.firstName,
        lastName: user?.lastName,
        email: user?.email ?? "",
        image: user?.image?.publicFileURL || "",
        role: user?.role ?? "",
        profile_status: user?.profile_status,
      },
      token,
    },
  });
  user.lastLogin = new Date();
  await user.save();
  if (fcmToken) {
    user.fcmToken = fcmToken;
    await user.save();
  }
});

//cool down timer
const forgotPassword = catchAsync(async (req: Request, res: Response) => {
  const { email } = req.body;

  if (!email) {
    throw new ApiError(400, "Please provide an email.");
  }
  // await delCache(email);
  const user = await findUserByEmail(email);
  if (!user) {
    throw new ApiError(404, "This account does not exist.");
  }

  const now = new Date();
  // Check if there's a pending OTP request and if the 2-minute cooldown has passed
  const otpRecord = await OTPModel.findOne({ email });
  if (otpRecord && otpRecord.expiresAt > now) {
    const remainingTime = Math.floor(
      (otpRecord.expiresAt.getTime() - now.getTime()) / 1000,
    );

    throw new ApiError(
      403,
      `You can't request another OTP before ${remainingTime} seconds.`,
    );
  }
  const token = generateRegisterToken({ email });
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "OTP sent to your email. Please check!",
    data: { token },
  });
  const otp = generateOTP();
  console.log("forgot-otp: ", otp);
  // await setCache(email, otp, 300);
  await sendResetOTPEmail(email, otp, user.firstName as string);
  await saveOTP(email, otp); // Save OTP with expiration
});

const resetPassword = catchAsync(async (req: Request, res: Response) => {
  let decoded: any;
  try {
    decoded = verifyToken(req.headers.authorization);
  } catch (error: any) {
    return sendError(res, error);
  }
  // if (!decoded.role) {
  //   throw new ApiError(401, "Invalid token. Please try again.");
  // }
  const email = decoded.email as string;

  const { password } = req.body;

  if (!password) {
    throw new ApiError(400, "Please provide  password ");
  }
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Password reset successfully.",
    data: null,
  });

  const user = await findUserByEmail(email);

  if (!user) {
    throw new ApiError(
      404,
      "User not found. Are you attempting something sneaky?",
    );
  }
  const newPassword = await hashPassword(password);
  user.password = newPassword;
  await user.save();
});

const verifyOTP = catchAsync(async (req: Request, res: Response) => {
  const { otp } = req.body;
  try {
    const { token, firstName, lastName, email, phone } =
      await UserService.verifyOTPService(
        otp,
        req.headers.authorization as string,
      );
    sendResponse(res, {
      statusCode: httpStatus.CREATED,
      success: true,
      message: "OTP Verified successfully.",
      data: { firstName, lastName, email, phone, token },
    });
    const user = await UserModel.findOne({ email });
    if (!user.isVerified) {
      user.isVerified = true;
      await user.save();
    }
  } catch (error: any) {
    throw new ApiError(500, error.message || "Failed to verify otp");
  }
});

const updateUser = catchAsync(async (req: Request, res: Response) => {
  try {
    let decoded = req.user as IUserPayload;
    const userId = decoded.id as string;
    const user = await findUserById(userId);
    if (!user) {
      throw new ApiError(404, "User not found.");
    }
    // Only allow updatable fields
    const {
      firstName,
      lastName,
      gender,
      dateOfBirth,
      phoneNumber,
      residentialAddress,
      suburb,
      state,
      languagesSpoken,
      emergencyContactFirstName,
      emergencyContactLastName,
      emergencyContactRelationship,
      emergencyContactPhoneNumber,
      referralSourceEnum,
    } = req.body;
    let image;
    if (req.file) {
      const imagePath = `public\\images\\${req.file.filename}`;
      const publicFileURL = `/images/${req.file.filename}`;
      image = {
        path: imagePath,
        publicFileURL: publicFileURL,
      };
    }
    const updateData: any = {
      ...(firstName !== undefined && { firstName }),
      ...(lastName !== undefined && { lastName }),
      ...(gender !== undefined && { gender }),
      ...(dateOfBirth !== undefined && { dateOfBirth }),
      ...(phoneNumber !== undefined && { phoneNumber }),
      ...(residentialAddress !== undefined && { residentialAddress }),
      ...(suburb !== undefined && { suburb }),
      ...(state !== undefined && { state }),
      ...(languagesSpoken !== undefined && { languagesSpoken }),
      ...(emergencyContactFirstName !== undefined && {
        emergencyContactFirstName,
      }),
      ...(emergencyContactLastName !== undefined && {
        emergencyContactLastName,
      }),
      ...(emergencyContactRelationship !== undefined && {
        emergencyContactRelationship,
      }),
      ...(emergencyContactPhoneNumber !== undefined && {
        emergencyContactPhoneNumber,
      }),
      ...(referralSourceEnum !== undefined && {
        referralSourceEnum,
      }),
      ...(image && { image }),
    };
    // Remove email and password if present
    delete updateData.email;
    delete updateData.password;
    // Remove 'strict: false' to enforce schema validation (including enum)
    const updatedUser = await UserService.updateUserById(userId, updateData);
    const responseData = {
      _id: updatedUser?._id,
      firstName: updatedUser?.firstName,
      lastName: updatedUser?.lastName,
      image: updatedUser?.image?.publicFileURL || "",
      gender: updatedUser?.gender,
      dateOfBirth: updatedUser?.dateOfBirth,
      phoneNumber: updatedUser?.phoneNumber,
      residentialAddress: updatedUser?.residentialAddress,
      suburb: updatedUser?.suburb,
      state: updatedUser?.state,
      languagesSpoken: updatedUser?.languagesSpoken,
      emergencyContactFirstName: updatedUser?.emergencyContactFirstName,
      emergencyContactLastName: updatedUser?.emergencyContactLastName,
      emergencyContactRelationship: updatedUser?.emergencyContactRelationship,
      emergencyContactPhoneNumber: updatedUser?.emergencyContactPhoneNumber,
    };
    if (updatedUser) {
      return sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Profile updated.",
        data: responseData,
      });
    }
  } catch (error: any) {
    throw new ApiError(
      error.statusCode || 500,
      error.message || "Unexpected error occurred while updating user.",
    );
  }
});

const getSelfInfo = catchAsync(async (req: Request, res: Response) => {
  try {
    let decoded = req.user as IUserPayload;

    const userId = decoded.id as string;
    // Find the user in DB

    const user = await findUserById(userId);
    if (!user) {
      throw new ApiError(404, "User not found.");
    }

    // Prepare base response (common fields)
    const responseData: any = {
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      gender: user.gender,
      dateOfBirth: user.dateOfBirth,
      phoneNumber: user.phoneNumber,
      residentialAddress: user.residentialAddress,
      suburb: user.suburb,
      state: user.state,
      languagesSpoken: user.languagesSpoken,
      emergencyContactFirstName: user.emergencyContactFirstName,
      emergencyContactLastName: user.emergencyContactLastName,
      emergencyContactRelationship: user.emergencyContactRelationship,
      emergencyContactPhoneNumber: user.emergencyContactPhoneNumber,
      email: user.email,
      role: user.role,
      profile_status: user.profile_status,
      image: user.image?.publicFileURL || "",
      // isVerified: user.isVerified,
      // blockStatus: user.blockStatus,
      // isRequest: user.isRequest,
      // isDeleted: user.isDeleted,
      fcmToken: user.fcmToken,
    };

    // Send final response
    return sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Profile information retrieved successfully",
      data: responseData,
      pagination: undefined,
    });
  } catch (error: any) {
    throw new ApiError(
      error.statusCode || 500,
      error.message ||
        "Unexpected error occurred while retrieving user information.",
    );
  }
});

const deleteUser = catchAsync(async (req: Request, res: Response) => {
  try {
    const id = req.query?.id as string;
    const requester = req.user as IUserPayload;
    if (!id) {
      throw new ApiError(400, "User ID is required.");
    }
    const userToDelete = await findUserById(id);
    if (!userToDelete) {
      throw new ApiError(404, "User not found.");
    }
    if (userToDelete.isDeleted) {
      throw new ApiError(410, "This account is already deleted.");
    }
    // Only allow self-delete or admin delete
    const isSelf = requester?.id === id;
    const isAdmin = requester?.role === "admin";
    if (!isSelf && !isAdmin) {
      throw new ApiError(
        403,
        "You do not have permission to delete this account.",
      );
    }
    // Prevent admin from deleting other admins (optional, for safety)
    if (isAdmin && userToDelete.role === "admin" && requester.id !== id) {
      throw new ApiError(403, "Admins cannot delete other admin accounts.");
    }
    await UserService.userDelete(id, userToDelete.email || "");
    return sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: isSelf
        ? "Your account has been deleted successfully."
        : "User account deleted successfully.",
      data: null,
    });
  } catch (error: any) {
    throw new ApiError(
      error.statusCode || 500,
      error.message || "Unexpected error occurred while deleting the user.",
    );
  }
});

const changePassword = catchAsync(async (req: Request, res: Response) => {
  try {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) {
      throw new Error("Please provide both old password and new password.");
    }

    let decoded = req.user as IUserPayload;
    const email = decoded.email as string;
    const user = await findUserByEmail(email);

    if (!user) {
      throw new Error("User not found.");
    }

    const isMatch = await argon2.verify(user.password as string, oldPassword);
    if (!isMatch) {
      throw new ApiError(httpStatus.UNAUTHORIZED, "Old password is incorrect.");
    }

    const hashedNewPassword = await argon2.hash(newPassword);
    user.password = hashedNewPassword;
    await user.save();

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "You have successfully changed your password.",
      data: null,
    });
  } catch (error: any) {
    throw new ApiError(
      error.statusCode || 500,
      error.message || "Failed to change password.",
    );
  }
});

const adminloginUser = catchAsync(async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const user = await findUserByEmail(email);
    if (!user) {
      throw new ApiError(404, "This account does not exist.");
    }

    if (user.role !== "admin") {
      throw new ApiError(403, "Only admins can login.");
    }

    // Check password validity
    const isPasswordValid = await argon2.verify(
      user.password as string,
      password,
    );
    if (!isPasswordValid) {
      throw new ApiError(401, "Wrong password!");
    }

    const userId = user._id as string;

    // Generate new token for the logged-in user
    const token = generateToken({
      id: userId,
      email: user.email,
      role: user.role,
    });

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Login complete!",
      data: {
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role,
          image: user?.image?.publicFileURL,
        },
        token,
      },
    });
  } catch (error: any) {
    throw new ApiError(
      error.statusCode || 500,
      error.message || "An error occurred during admin login.",
    );
  }
});

//admin dashboard----------------------------------------------------------------------------------------

const getAllUsers = catchAsync(async (req: Request, res: Response) => {
  let decoded;
  try {
    decoded = verifyToken(req.headers.authorization);
  } catch (error: any) {
    return sendError(res, error); // If token verification fails, send error response.
  }

  const adminId = decoded.id as string;

  // Verify if admin exists
  const user = await findUserById(adminId);
  if (!user) {
    throw new ApiError(404, "This admin account does not exist.");
  }

  // Pagination and filters
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const skip = (page - 1) * limit;

  const { date, firstName, lastName, email, role, requestStatus } = req.query;

  try {
    // Get the user list based on pagination and filters
    const { users, pagination } = await UserService.getUserList(
      skip,
      limit,
      date as string,
      firstName as string,
      lastName as string,
      email as string,
      role as string,
      requestStatus as string,
    );

    if (users.length === 0) {
      return sendResponse(res, {
        statusCode: httpStatus.NO_CONTENT,
        success: true,
        message: "No user found based on your search.",
        data: [],
        pagination: {
          ...pagination,
          prevPage: pagination.prevPage ?? 0,
          nextPage: pagination.nextPage ?? 0,
        },
      });
    }

    // Populate manager info for each user
    const usersWithManagerInfo = await UserModel.populate(users, {
      path: "managerInfoId",
      select: "type businessAddress websiteLink governMentImage.publicFileURL",
    });

    // Format response data
    const responseData = usersWithManagerInfo.map((user) => ({
      _id: user._id,
      image: user.image?.publicFileURL,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      phone: user.phone,
      address: user.address,
      //isRequest: user.isRequest,
      managerInfo: user.managerInfoId
        ? {
            type: user.managerInfoId.type,
            businessAddress: user.managerInfoId.businessAddress,
            websiteLink: user.managerInfoId.websiteLink,
            governMentImage: user.managerInfoId.governMentImage?.publicFileURL,
            isRequest: user.isRequest,
          }
        : null,
      createdAt: user.createdAt,
      // Include all new personal and emergency contact fields
      gender: user.gender,
      dateOfBirth: user.dateOfBirth,
      phoneNumber: user.phoneNumber,
      residentialAddress: user.residentialAddress,
      suburb: user.suburb,
      state: user.state,
      languagesSpoken: user.languagesSpoken,
      emergencyContactFirstName: user.emergencyContactFirstName,
      emergencyContactLastName: user.emergencyContactLastName,
      emergencyContactRelationship: user.emergencyContactRelationship,
      emergencyContactPhoneNumber: user.emergencyContactPhoneNumber,
    }));

    // Send response with pagination details
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "User list retrieved successfully",
      data: responseData,
      pagination: {
        ...pagination,
        prevPage: pagination.prevPage ?? 0,
        nextPage: pagination.nextPage ?? 0,
      },
    });
  } catch (error: any) {
    // Handle any errors during the user fetching or manager population
    throw new ApiError(
      error.statusCode || 500,
      error.message || "Failed to retrieve users.",
    );
  }
});

export const getPrivacyFromDB = catchAsync(
  async (req: Request, res: Response) => {
    try {
      // Fetch the privacy policy data from the database
      const result = await PrivacyModel.find().lean();

      // Ensure that data exists and extract the first item
      const privacy = result && result.length > 0 ? result[0] : null;

      if (!privacy) {
        // If no privacy data is found, send a 404 response
        throw new ApiError(404, "Privacy policy not found.");
      }

      // Set the Content-Type header to text/html
      res.header("Content-Type", "text/html");

      // Send the HTML response with the privacy policy content
      res.send(`<!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Privacy Policy</title>
          <style>
              body {
                  font-family: Arial, sans-serif;
                  line-height: 1.6;
                  margin: 0;
                  padding: 0;
                  background-color: #f4f4f4;
                  color: #333;
              }
              .container {
                  max-width: 800px;
                  margin: 30px auto;
                  padding: 20px;
                  background: #fff;
                  border-radius: 8px;
                  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
              }
              h1 {
                  color: #444;
              }
              footer {
                  text-align: center;
                  margin-top: 30px;
                  font-size: 0.9em;
                  color: #666;
              }
          </style>
      </head>
      <body>
          <div class="container">
             
              ${privacy.description}
          </div>
         
      </body>
      </html>`);
    } catch (error: any) {
      console.error("Error fetching privacy policy:", error);
      throw new ApiError(
        error.statusCode || 500,
        error.message || "Failed to fetch html route api.",
      );
    }
  },
);
export const getTermsFromDB = catchAsync(
  async (req: Request, res: Response) => {
    try {
      // Fetch the privacy policy data from the database
      const result = await TermsModel.find().lean();

      // Ensure that data exists and extract the first item
      const terms = result && result.length > 0 ? result[0] : null;

      if (!terms) {
        // If no privacy data is found, send a 404 response
        throw new ApiError(404, "Terms and condition not found.");
      }

      // Set the Content-Type header to text/html
      res.header("Content-Type", "text/html");

      // Send the HTML response with the privacy policy content
      res.send(`<!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Terms and conditions</title>
          <style>
              body {
                  font-family: Arial, sans-serif;
                  line-height: 1.6;
                  margin: 0;
                  padding: 0;
                  background-color: #f4f4f4;
                  color: #333;
              }
              .container {
                  max-width: 800px;
                  margin: 30px auto;
                  padding: 20px;
                  background: #fff;
                  border-radius: 8px;
                  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
              }
              h1 {
                  color: #444;
              }
              footer {
                  text-align: center;
                  margin-top: 30px;
                  font-size: 0.9em;
                  color: #666;
              }
          </style>
      </head>
      <body>
          <div class="container">
             
              ${terms.description}
          </div>
         
      </body>
      </html>`);
    } catch (error: any) {
      console.error("Error fetching terms:", error);
      throw new ApiError(
        error.statusCode || 500,
        error.message || "Failed to fetch html route api.",
      );
    }
  },
);
export const getAboutFromDB = catchAsync(
  async (req: Request, res: Response) => {
    try {
      // Fetch the privacy policy data from the database
      const result = await AboutModel.find().lean();

      // Ensure that data exists and extract the first item
      const aboutUs = result && result.length > 0 ? result[0] : null;

      if (!aboutUs) {
        // If no privacy data is found, send a 404 response
        throw new ApiError(404, "About us not found.");
      }

      // Set the Content-Type header to text/html
      res.header("Content-Type", "text/html");

      // Send the HTML response with the privacy policy content
      res.send(`<!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>About Us</title>
          <style>
              body {
                  font-family: Arial, sans-serif;
                  line-height: 1.6;
                  margin: 0;
                  padding: 0;
                  background-color: #f4f4f4;
                  color: #333;
              }
              .container {
                  max-width: 800px;
                  margin: 30px auto;
                  padding: 20px;
                  background: #fff;
                  border-radius: 8px;
                  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
              }
              h1 {
                  color: #444;
              }
              footer {
                  text-align: center;
                  margin-top: 30px;
                  font-size: 0.9em;
                  color: #666;
              }
          </style>
      </head>
      <body>
          <div class="container">

              ${aboutUs.description}
          </div>
         
      </body>
      </html>`);
    } catch (error: any) {
      console.error("Error fetching about us:", error);
      throw new ApiError(
        error.statusCode || 500,
        error.message || "Failed to fetch html route api.",
      );
    }
  },
);
export const AppInstruction = catchAsync(
  async (req: Request, res: Response) => {
    try {
      // Set the Content-Type header to text/html
      res.header("Content-Type", "text/html");

      // Send the HTML response with the privacy policy content
      res.send(`

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Instruction Guide - CourtConnect</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            margin: 20px;
            background-color: #f4f4f4;
            color: #333;
        }
        header {
            background-color: #181f81;
            color: white;
            padding: 20px;
            text-align: center;
        }
        section {
            margin: 40px 0;
        }
        h1, h2 {
            color: #181f81;
        }
        ol {
            padding-left: 20px;
            font-size: 1.2rem;
        }
        li {
            margin-bottom: 20px;
        }
        .step-image {
            max-width: 90%;
            height: auto;
            margin: 10px 0;
            border: 1px solid #ddd;
            border-radius: 8px;
        }
        footer {
            text-align: center;
            margin-top: 40px;
            font-size: 0.9em;
            color: #777;
        }
        .step {
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
            margin-bottom: 20px;
        }
        .step h3 {
            font-size: 1.5rem;
            color: #181f81;
        }
    </style>
</head>
<body>
    <header>
        <h1>CourtConnect - Account Deletion Guide</h1>
    </header>

    <section style="max-width: 1000px; margin: 0 auto;">
        <h2>Step-by-Step Instructions</h2>
        <ol>
            <li class="step">
                <h3>1. Go to your Profile</h3>
                <p>Navigate to your profile screen after logging in.</p>
                <img src="/others/Frame.png" height="500" width="400" alt="Profile Screen" class="step-image">
            </li>

            <li class="step">
                <h3>2. Click on Settings</h3>
                <p>Click on the settings icon to access account management options.</p>
                <img src="/others/Frame (1).png" height="500" width="400" alt="Settings Screen" class="step-image">
            </li>

            <li class="step">
                <h3>3. Click on the 'Delete Account' Button</h3>
                <p>In the settings menu, you will find the option to delete your account.</p>
                <img src="/others/Frame (2).png" height="500" width="400" alt="Delete Account Button" class="step-image">
            </li>

            <li class="step">
                <h3>4. Confirm by Clicking 'Delete'</h3>
                <p>Finally, click on the 'Delete' button to permanently delete your account.</p>
                <img src="/others/Frame (3).png" height="500" width="400" alt="Confirm Delete" class="step-image">
            </li>
        </ol>
    </section>

    <footer>
        <p>&copy; 2025 carerfinderau. All rights reserved.</p>
    </footer>
</body>
</html>



    `);
    } catch (error: any) {
      //  console.error("Error fetching privacy policy:", error);
      throw new ApiError(
        error.statusCode || 500,
        error.message || "Failed to fetch instruction api.",
      );
    }
  },
);

const UserController = {
  registerUser,
  resendOTP,
  loginUser,
  forgotPassword,
  resetPassword,
  verifyOTP,
  updateUser,
  getSelfInfo,
  deleteUser,
  changePassword,
  adminloginUser,
  getAllUsers,
  AppInstruction,
  getAboutFromDB,
  getTermsFromDB,
  getPrivacyFromDB,
};

export { UserController };
