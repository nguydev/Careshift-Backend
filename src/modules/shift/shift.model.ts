import mongoose from "mongoose";
import {
  EQualification,
  TShift,
  EFirstAidAndCPR,
  EVaccination,
  EServices,
  TApplyShift,
  EnumFrequency,
} from "./shift.interface";
import { ERole } from "../../config/role";
import { languageEnum } from "../user/user.interface";

const shiftSchema = new mongoose.Schema<TShift>(
  {
    clientFirstName: { type: String, required: true },
    clientLastName: { type: String, required: true },
    clientSuburb: { type: String, required: true },
    clientState: { type: String, required: true },
    clientPostcode: { type: Number, required: true },
    clientFullAddress: { type: String, required: true },
    clientPhoneNumber: { type: Number, required: true },
    clientImage: {
      type: {
        publicFileURL: { type: String, trim: true },
        path: { type: String, trim: true },
      },
      required: true,
      default: { publicFileURL: "", path: "" },
    },

    // Shift Details
    workerRole: { type: String, required: true, enum: ERole },
    workType: { type: String, required: true, enum: ["one-off", "ongoing"] },
    shiftSuburb: { type: String, required: true },
    applyedUsers: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "User",
      default: [],
    },
    assigned: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    shiftState: { type: String, required: true },
    description: { type: String, maxLength: 250 },
    workStartDate: { type: Date, required: true },
    workingTimeStart: { type: Date, required: true },
    workingTimeFinish: { type: Date, required: true },
    totalShiftHours: { type: Number, required: true },
    // Requirements
    drivingLicense: { type: Boolean, required: true, default: false },
    policeCheck: { type: Boolean, required: true, default: false },
    ndidWorkerCheck: { type: Boolean, required: true, default: false },
    preferredGender: {
      type: String,
      required: true,
      enum: ["Male", "Female", "Anyone"],
    },
    language: { type: [String], enum: languageEnum, required: true },
    preferredQualification: {
      type: String,
      enum: Object.values(EQualification),
    },
    firstAidAndCPR: {
      type: String,
      enum: Object.values(EFirstAidAndCPR),
      required: false,
    },
    vaccination: {
      type: String,
      enum: Object.values(EVaccination),
      required: false,
    },
    // Payment Information
    hourlyRate: { type: Number, required: true },
    travelRatePerKm: { type: Number, required: true },
    clientPayhourlyRate: { type: Number, required: true },
    clientPaytravelRatePerKm: { type: Number, required: true },
    // Services and Frequency
    services: {
      type: [String],
      required: true,
      enum: Object.values(EServices),
    },
    frequency: { type: String, required: true, enum: EnumFrequency },
    isDeleted: { type: Boolean, required: true, default: false },
  },
  {
    timestamps: true,
  }
);
const applyShiftSchema = new mongoose.Schema<TApplyShift>(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      trim: true,
    },
    shift: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shift",
      required: true,
      trim: true,
    },
    input: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "canceled"],
      required: true,
      trim: true,
      default: "pending",
    },
  },
  { timestamps: true }
);

const shiftReportSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    shift: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shift",
      required: true,
    },
    what_tasks_did_you_complete_during_this_shift: {
      type: String,
      required: false,
    },
    have_you_noticed_any_changes_in_the_clients_condition_behavior_or_needs: {
      type: String,
      required: false,
    },
    did_any_incident_occur_during_this_shift: {
      type: String,
      required: false,
    },

    did_you_travel_with_the_client_during_this_shift: {
      type: String,
      required: false,
    },

    how_many_kilometers_did_you_travel_with_the_client_only: {
      type: Number,
      required: false,
      default: 0,
    },
  },
  { timestamps: true }
);
const checkIncheckoutSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      trim: true,
    },
    shift: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shift",
      required: true,
      trim: true,
    },

    status: {
      type: String,
      enum: ["checkin", "checkout"],
      required: true,
      trim: true,
    },
  },
  { timestamps: true }
);

const suburbSchema = new mongoose.Schema({
  state: { type: String, required: true },
  suburb: { type: String, required: true },
});

export const SuburbDB = mongoose.model("Suburb", suburbSchema);
export const CheckOut = mongoose.model("checkout", shiftReportSchema);
export const CheckIn = mongoose.model("checkin", checkIncheckoutSchema);
export const ApplyShift = mongoose.model("applyShift", applyShiftSchema);
export const Shift = mongoose.model("Shift", shiftSchema);
