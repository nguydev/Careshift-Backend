import mongoose from "mongoose";
export type TDStatus = "pending" | "approved" | "canceled";
export interface IDocuments {
  userId: mongoose.Types.ObjectId;
  abn: {
    abnNumber: string;
    businessName: string;
    gstRegistered?: boolean;
    isVerifyed: TDStatus;
    adminNote?: string;
  };
  bankDetails: {
    bsbNumber: string;
    accountNumber: string;
    isVerifyed: TDStatus;
    adminNote?: string;
  };
  passport: {
    expiryDate?: Date;
    document: string;
    isVerifyed: TDStatus;
    adminNote?: string;
  };
  drivingLicense: {
    frontDocument: string;
    backDocument: string;
    expiryDate?: Date;
    isVerifyed: TDStatus;
    adminNote?: string;
  };
  carInsuranceCertificate: {
    certificate: string;
    expiryDate: Date;
    type: string; // new field for type/name
    isVerifyed: TDStatus;
    adminNote?: string;
  };
  checks: Array<{
    document: string;
    publishDate: Date;
    type: "NDIS Worker Check" | "Police Check"; // new field for type/name
    isVerifyed: TDStatus;
    adminNote?: string;
  }>;
  qualification: Array<{
    certificate: string;
    expiryDate: Date;
    type: string; // new field for type/name
    isVerifyed: TDStatus;
    adminNote?: string;
  }>;
  firstAid: Array<{
    document: string;
    expiryDate: Date;
    type: string; // new field for type/name
    isVerifyed: TDStatus;
    adminNote?: string;
  }>;
  workingWithChildren: {
    document: string;
    expiryDate: Date;
    isVerifyed: TDStatus;
    adminNote?: string;
  };
  vaccination: Array<{
    certificate: string;
    publishDate: Date;
    type: string; // new field for type/name
    isVerifyed: TDStatus;
    adminNote?: string;
  }>;
}
