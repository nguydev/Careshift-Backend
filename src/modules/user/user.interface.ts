import mongoose, { Document } from "mongoose";
import { TRole } from "../../config/role";
export const stateEnum = ["New South Wales", "Queensland"];

// stateType.ts
export type TState = "New South Wales" | "Queensland" | null;
export type TRelationship =
  | "Parent"
  | "Spouse / Partner"
  | "Sibling"
  | "Child"
  | "Relative"
  | "Housemate"
  | "Neighbor"
  | "Co-worker"
  | "Manager / Supervisor"
  | "Other"
  | null;
export const RelationshipEnum = [
  "Parent",
  "Spouse / Partner",
  "Sibling",
  "Child",
  "Relative",
  "Housemate",
  "Neighbor",
  "Co-worker",
  "Manager / Supervisor",
  "Other",
  null,
];

export const ReferralSourceEnum = [
  "Google Search",
  "Facebook",
  "Instagram",
  "TikTok",
  "Referral from a Friend",
  "LinkedIn",
  "WhatsApp Group",
  "Another Cares/Nurse",
  "NDIS Provider",
  "Job Board (e.g. Seek, Indeed)",
  "Flyer or Poster",
  "Community Group or Event",
  "Other",
  null,
];
export type TReferralSource =
  | "Google Search"
  | "Facebook"
  | "Instagram"
  | "TikTok"
  | "Referral from a Friend"
  | "LinkedIn"
  | "WhatsApp Group"
  | "Another Cares/Nurse"
  | "NDIS Provider"
  | "Job Board (e.g. Seek, Indeed)"
  | "Flyer or Poster"
  | "Community Group or Event"
  | "Other";
export const languageEnum = [
  "English",
  "Spanish",
  "Punjabi",
  "Hindi",
  "Greek",
  "Italian",
  "Cantonese",
  "Vietnamese",
  "Mandarin",
  "Arabic",
];
export type TLanguages = [
  | "English"
  | "Spanish"
  | "Punjabi"
  | "Hindi"
  | "Greek"
  | "Italian"
  | "Cantonese"
  | "Vietnamese"
  | "Mandarin"
  | "Arabic",
];
export type IUser = {
  // Personal Details
  firstName?: string;
  lastName?: string;
  gender?: string;
  dateOfBirth?: Date;
  phoneNumber?: string;
  residentialAddress?: string;
  suburb?: string;
  state?: TState;
  languagesSpoken: TLanguages;
  // Emergency Contact
  emergencyContactFirstName?: string;
  emergencyContactLastName?: string;
  emergencyContactRelationship?: TRelationship;
  emergencyContactPhoneNumber?: string;
  // ...existing fields...
  email: string;
  password: string;
  profile_status?: boolean;
  image?: {
    publicFileURL?: string;
    path?: string;
  };
  isVerified?: boolean;
  blockStatus?: Date | null;
  role?: TRole;
  isRequest?: "approve" | "deny" | "send";
  isDeleted?: boolean;
  lastLogin: Date | null;
  verifyedByAdmin: boolean | null;
  fcmToken?: string;
  referralSourceEnum?: TReferralSource;
} & Document;

export type IOTP = {
  email: string;
  otp: string;
  expiresAt: Date;
} & Document;

export interface IDocuments {
  userId: mongoose.Types.ObjectId;
  abn: {
    abnNumber: string;
    businessName: string;
    gstRegistered?: boolean;
  };
  bankDetails: {
    bsbNumber: string;
    accountNumber: string;
  };
  passport: {
    expiryDate?: Date;
    document: string;
  };
  drivingLicense: {
    frontDocument: string;
    expiryDate?: Date;
  };
  carInsuranceCertificate: {
    certificate?: string;
    expiryDate?: Date;
  };
  policeCheck: {
    document: string;
    publishDate?: Date;
  };
  qualification: {
    certificate?: string;
    expiryDate?: Date;
  };
  firstAid: {
    document?: string;
    expiryDate?: Date;
  };
  workingWithChildren: {
    document?: string;
    expiryDate?: Date;
  };
  vaccination: {
    certificate?: string;
    publishDate?: Date;
  };
  createdAt?: Date;
}

// Remove user_mood, jurnals, chat_history_with_ai, ageRange, address, conections from the schema if not present in the interface.
