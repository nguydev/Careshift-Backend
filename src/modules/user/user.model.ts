import { UserController } from "../user/user.controller";
import mongoose, { Schema } from "mongoose";
import {
  IUser,
  IOTP,
  RelationshipEnum,
  stateEnum,
  ReferralSourceEnum,
  languageEnum,
} from "./user.interface";
import { ERole } from "../../config/role";

const UserSchema = new Schema<IUser>(
  {
    // Personal Details
    firstName: { type: String, trim: true, required: false },
    lastName: { type: String, trim: true, required: false },
    gender: {
      type: String,
      required: false,
      enum: ["Male", "Female", null],
      default: null,
    },
    dateOfBirth: { type: Date, required: false, default: null },
    phoneNumber: { type: String, trim: true, required: false, default: null },
    residentialAddress: {
      type: String,
      trim: true,
      required: false,
      default: null,
    },
    suburb: { type: String, trim: true, required: false, default: null },
    state: {
      type: String,
      trim: true,
      enum: stateEnum,
      required: false,
      default: null,
    },
    languagesSpoken: { type: [String], enum: languageEnum, required: false },
    // Emergency Contact
    emergencyContactFirstName: { type: String, trim: true, required: false },
    emergencyContactLastName: { type: String, trim: true, required: false },
    emergencyContactRelationship: {
      type: String,
      enum: RelationshipEnum,
      trim: true,
      required: false,
    },
    emergencyContactPhoneNumber: { type: String, trim: true, required: false },
    email: { type: String, required: true, unique: true, trim: true },
    password: { type: String, trim: true },
    profile_status: { type: Boolean, required: false, default: false },
    referralSourceEnum: {
      type: String,
      enum: ReferralSourceEnum,
      required: false,
      default: null,
    },
    image: {
      type: {
        publicFileURL: { type: String, trim: true },
        path: { type: String, trim: true },
      },
      required: false,
      default: {
        publicFileURL: "",
        path: "",
      },
    },
    isVerified: { type: Boolean, default: false },
    blockStatus: { type: Date, required: false, default: null },
    role: { type: String, enum: ERole, required: false, default: null },
    isRequest: {
      type: String,
      enum: ["approve", "deny", "send"],
      default: "send",
    },
    isDeleted: { type: Boolean, default: false },
    verifyedByAdmin: { type: Boolean, default: false, required: true },
    lastLogin: { type: String, trim: true, default: null },
    fcmToken: { type: String, trim: true },
  },
  { timestamps: true }
);

export const UserModel =
  mongoose.models.User || mongoose.model<IUser>("User", UserSchema);
UserSchema.index({ firstName: "text", lastName: "text" });
UserSchema.index({ createdAt: 1 });
UserModel.schema.index({ role: 1 });

const OTPSchema = new Schema<IOTP>({
  email: { type: String, required: true, trim: true, index: true },
  otp: { type: String, required: true, trim: true },
  expiresAt: { type: Date, required: true, index: { expires: "1m" } },
});

export const OTPModel = mongoose.model<IOTP>("OTP", OTPSchema);
OTPSchema.index({ email: 1, expiresAt: 1 });
