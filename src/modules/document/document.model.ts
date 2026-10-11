import mongoose, { Schema } from "mongoose";
import { IDocuments } from "./document.interface";

const docummentsSchema = new Schema<IDocuments>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    abn: {
      abnNumber: { type: String, required: true },
      businessName: { type: String, required: true },
      gstRegistered: { type: Boolean, default: true },
      isVerifyed: {
        type: String,
        default: "pending",
        enum: ["pending", "approved", "canceled"],
        required: false,
      },
      adminNote: { type: String, default: null },
    },
    bankDetails: {
      bsbNumber: { type: String, required: true },
      accountNumber: { type: String, required: true },
      isVerifyed: {
        type: String,
        default: "pending",
        enum: ["pending", "approved", "canceled"],
        required: false,
      },
      adminNote: { type: String, default: null },
    },
    passport: {
      expiryDate: { type: Date },
      document: { type: String, required: true },
      isVerifyed: {
        type: String,
        default: "pending",
        enum: ["pending", "approved", "canceled"],
        required: false,
      },
      adminNote: { type: String, default: null },
    },
    drivingLicense: {
      frontDocument: { type: String, required: false },
      backDocument: { type: String, required: false },
      expiryDate: { type: Date, required: false },
      isVerifyed: {
        type: String,
        default: "pending",
        enum: ["pending", "approved", "canceled"],
        required: false,
      },
      adminNote: { type: String, default: null },
    },
    carInsuranceCertificate: {
      certificate: { type: String, required: false },
      expiryDate: { type: Date, required: false },
      type: { type: String, required: false },
      isVerifyed: {
        type: String,
        default: "pending",
        enum: ["pending", "approved", "canceled"],
        required: false,
      },
      adminNote: { type: String, default: null },
    },
    checks: [
      {
        document: { type: String, required: true },
        publishDate: { type: Date, required: true },
        type: {
          type: String,
          required: true,
          enum: ["NDIS Worker Check", "Police Check"],
        },
        isVerifyed: {
          type: String,
          default: "pending",
          enum: ["pending", "approved", "canceled"],
          required: false,
        },
        adminNote: { type: String, default: null },
      },
    ],
    qualification: [
      {
        certificate: { type: String, required: true },
        expiryDate: { type: Date, required: true },
        type: { type: String, required: true },
        isVerifyed: {
          type: String,
          default: "pending",
          enum: ["pending", "approved", "canceled"],
          required: false,
        },
        adminNote: { type: String, default: null },
      },
    ],
    firstAid: [
      {
        document: { type: String, required: true },
        expiryDate: { type: Date, required: true },
        type: { type: String, required: true },
        isVerifyed: {
          type: String,
          default: "pending",
          enum: ["pending", "approved", "canceled"],
          required: false,
        },
        adminNote: { type: String, default: null },
      },
    ],
    workingWithChildren: {
      document: { type: String, required: false },
      expiryDate: { type: Date, required: false },
      isVerifyed: {
        type: String,
        default: "pending",
        enum: ["pending", "approved", "canceled"],
        required: false,
      },
      adminNote: { type: String, default: null },
    },
    vaccination: [
      {
        certificate: { type: String, required: true },
        publishDate: { type: Date, required: true },
        type: { type: String, required: true },
        isVerifyed: {
          type: String,
          default: "pending",
          enum: ["pending", "approved", "canceled"],
          required: false,
        },
        adminNote: { type: String, default: null },
      },
    ],
  },
  { timestamps: true }
);

export const DocumentModel =
  mongoose.models.Document ||
  mongoose.model<IDocuments>("Document", docummentsSchema);
