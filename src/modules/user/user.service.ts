import { IUser } from "./user.interface";

import { OTPModel, UserModel } from "./user.model";

import ApiError from "../../errors/ApiError";

import { findUserByEmail, generateOTP } from "./user.utils";

import httpStatus from "http-status";
import { generateToken, verifyToken } from "../../utils/JwtToken";

import { TRole } from "../../config/role";
import paginationBuilder from "../../utils/paginationBuilder";

// Improved: Add JSDoc comments, better error logging, and minor optimizations for clarity and maintainability.

/**
 * Registers a new user by email, name, and password. Handles OTP logic and prevents duplicate registration.
 */
const registerUserService = async (
  firstName: string,
  lastName: string,
  email: string,
  password: string
) => {
  const start = Date.now();
  // Check if user is already registered and get OTP record in parallel
  const [isUserRegistered, otpRecord] = await Promise.all([
    findUserByEmail(email),
    OTPModel.findOne({ email }).lean(),
  ]);
  if (isUserRegistered) {
    throw new ApiError(
      httpStatus.CONFLICT,
      "This account is already registered. Please log in or use a different account."
    );
  }
  // OTP handling logic
  const now = new Date();
  if (otpRecord && otpRecord.expiresAt > now) {
    const remainingTime = Math.floor(
      (otpRecord.expiresAt.getTime() - now.getTime()) / 1000
    );
    throw new ApiError(
      httpStatus.TOO_MANY_REQUESTS,
      `Please wait ${remainingTime} seconds before requesting a new OTP.`
    );
  }
  // Generate and save OTP
  const otp = generateOTP();
  return { otp };
};

/**
 * Creates a new user in the database.
 */
const createUser = async ({
  firstName,
  lastName,
  email,
  image,
  hashedPassword,
  fcmToken,
  role,
}: {
  firstName: string;
  lastName: string;
  email: string;
  image: any;
  hashedPassword: string;
  fcmToken?: string;
  role: string;
}): Promise<{ createdUser: IUser }> => {
  try {
    const createdUser = new UserModel({
      firstName,
      lastName,
      email,
      image,
      password: hashedPassword,
      fcmToken,
      role,
    });
    await createdUser.save();
    return { createdUser };
  } catch (error) {
    console.error("User creation failed:", error);
    throw new ApiError(500, "User creation failed");
  }
};

/**
 * Updates a user by ID.
 */
const updateUserById = async (
  id: string,
  updateData: Partial<IUser>
): Promise<IUser | null> => {
  return UserModel.findByIdAndUpdate(id, updateData, {
    new: true,
    runValidators: true,
  });
};

const userDelete = async (id: string, email: string): Promise<void> => {
  const baseDeletedEmail = `deleted-account-${email}`;
  let deletedEmail = baseDeletedEmail;
  for (
    let counter = 1;
    await UserModel.exists({ email: deletedEmail });
    counter++
  ) {
    deletedEmail = `${baseDeletedEmail}-${counter}`;
  }
  await UserModel.findByIdAndUpdate(id, {
    isDeleted: true,
    email: deletedEmail,
  });
};

/**
 * Verifies OTP for forgot password flow and returns a new token if valid.
 */
const verifyForgotPasswordOTPService = async (email: string, otp: string) => {
  const user = await findUserByEmail(email);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found!");
  }
  const otpRecord = await OTPModel.findOne({ email });
  if (!otpRecord) {
    throw new ApiError(httpStatus.NOT_FOUND, "OTP record not found!");
  }
  const currentTime = new Date();
  if (otpRecord.expiresAt < currentTime) {
    throw new ApiError(httpStatus.BAD_REQUEST, "OTP has expired");
  }
  if (otpRecord.otp !== otp) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Wrong OTP");
  }
  const userId = user._id as string;
  const token = generateToken({
    id: userId,
    role: user.role ?? "",
    email: user.email,
    firstName: user.firstName ?? "",
    lastName: user.lastName ?? "",
  });
  return { token };
};

/**
 * Gets a paginated list of admin users.
 */
const getAdminList = async (
  skip: number,
  limit: number,
  name?: string
): Promise<{
  admins: IUser[];
  pagination: ReturnType<typeof paginationBuilder>;
}> => {
  const query: any = {
    isDeleted: { $ne: true },
    role: { $in: ["primary", "secondary", "junior"] },
  };
  if (name) {
    query.name = { $regex: name, $options: "i" };
  }
  const pipeline: any[] = [
    { $match: query },
    { $sort: { createdAt: -1 } },
    { $skip: skip },
    { $limit: limit },
    {
      $project: {
        image: 1,
        name: 1,
        role: 1,
        email: 1,
        createdAt: 1,
        phone: 1,
        address: 1,
        _id: 1,
      },
    },
  ];
  const admins = await UserModel.aggregate(pipeline);
  const totalAdmins = await UserModel.countDocuments(query);
  const currentPage = Math.floor(skip / limit) + 1;
  const pagination = paginationBuilder({
    totalData: totalAdmins,
    currentPage,
    limit,
  });
  return { admins, pagination };
};

/**
 * Gets a paginated list of non-admin users with optional filters.
 */
const getUserList = async (
  skip: number,
  limit: number,
  date?: string,
  firstName?: string,
  lastName?: string,
  email?: string,
  role?: string,
  requestStatus?: string
): Promise<{
  users: IUser[];
  pagination: ReturnType<typeof paginationBuilder>;
}> => {
  const query: any = {
    $and: [{ isDeleted: { $ne: true } }, { role: { $nin: ["admin"] } }],
  };
  if (date) {
    const [year, month, day] = date.split("-").map(Number);
    const startDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
    const endDate = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
    query.createdAt = { $gte: startDate, $lte: endDate };
  }
  if (firstName || lastName) {
    query.$or = [];
    if (firstName)
      query.$or.push({ firstName: { $regex: firstName, $options: "i" } });
    if (lastName)
      query.$or.push({ lastName: { $regex: lastName, $options: "i" } });
  }
  if (role) query.role = { $regex: role, $options: "i" };
  if (requestStatus) {
    query.isRequest = { $regex: requestStatus, $options: "i" };
  }
  const pipeline: any[] = [
    { $match: query },
    { $sort: { createdAt: -1 } },
    { $skip: skip },
    { $limit: limit },
    {
      $project: {
        image: 1,
        firstName: 1,
        lastName: 1,
        email: 1,
        role: 1,
        createdAt: 1,
        phone: 1,
        address: 1,
        isRequest: 1,
        managerInfoId: 1,
        _id: 1,
      },
    },
  ];
  const users = (await UserModel.aggregate(pipeline)) as IUser[];
  const totalUsers = await UserModel.countDocuments(query);
  const currentPage = Math.floor(skip / limit) + 1;
  const pagination = paginationBuilder({
    totalData: totalUsers,
    currentPage,
    limit,
  });
  return { users, pagination };
};

/**
 * Verifies OTP for user registration and returns a new token if valid.
 */
const verifyOTPService = async (otp: string, authorizationHeader: string) => {
  let decoded;
  try {
    decoded = verifyToken(authorizationHeader);
  } catch (error: any) {
    throw new ApiError(httpStatus.UNAUTHORIZED, "Invalid token");
  }
  const email = decoded.email as string;
  const dbOTP = await OTPModel.findOne({ email: email });
  if (!dbOTP || dbOTP.otp !== otp) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Invalid or expired OTP");
  }
  const user = await UserModel.findOne({ email });
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found!");
  }
  const token = generateToken({
    id: user._id,
    role: user.role ?? "",
    email: user.email,
    firstName: user.firstName ?? "",
    lastName: user.lastName ?? "",
  });
  return {
    token,
    email,
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user?.phone,
    image: user.image?.publicFileURL ?? null,
  };
};

const UserService = {
  registerUserService,
  createUser,
  updateUserById,
  userDelete,
  verifyForgotPasswordOTPService,
  getAdminList,
  getUserList,
  verifyOTPService,
};

export { UserService };
