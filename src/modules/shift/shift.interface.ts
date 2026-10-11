import { Types } from "mongoose";
import { TRole } from "../../config/role";

export enum EQualification {
  AIN = "Assistant in Nursing (AIN)",
  CERT_3_AGED_CARE = "Certificate 3 Aged Care",
  CERT_3_COMMUNITY_SERVICES = "Certificate 3 Community Services",
  CERT_3_DISABILITIES = "Certificate 3 in Disabilities",
  CERT_3_INDIVIDUAL_SUPPORT = "Certificate 3 Individual Support",
  CERT_3_HOME_COMMUNITY_CARE = "Certificate 3 in Home and Community Care",
  CERT_4_AGED_CARE = "Certificate 4 Aged Care",
  CERT_4_COMMUNITY_SERVICES = "Certificate 4 Community Services",
  CERT_4_DISABILITIES = "Certificate 4 in Disabilities",
  CERT_4_INDIVIDUAL_SUPPORT = "Certificate 4 Individual Support",
  CERT_4_HOME_COMMUNITY_CARE = "Certificate 4 in Home and Community Care",
  DEGREE_ALLIED_HEALTH = "Degree in Allied Health",
  DEGREE_NURSING = "Degree in Nursing",
  DEGREE_PSYCHOLOGY = "Degree in Psychology",
  DEGREE_SOCIAL_WORK = "Degree in Social Work",
  ENROLLED_NURSE = "Enrolled Nurse",
  REGISTERED_NURSE = "Registered Nurse",
}

export enum EFirstAidAndCPR {
  FIRST_AID_HLTAID011 = "First Aid (HLTAID011)",
  CPR_HLTAID009 = "CPR (HLTAID009)",
  FIRST_AID_CPR_COMBINED = "First Aid + CPR Combined",
  BASIC_EMERGENCY_LIFE_SUPPORT_HLTAID010 = "Basic Emergency Life Support (HLTAID010)",
  ADVANCED_FIRST_AID_HLTAID014 = "Advanced First Aid (HLTAID014)",
  ADVANCED_RESUSCITATION_HLTAID015 = "Advanced Resuscitation (HLTAID015)",
  MENTAL_HEALTH_FIRST_AID = "Mental Health First Aid",
  REMOTE_AREA_FIRST_AID = "Remote Area First Aid",
  CHILDCARE_FIRST_AID_HLTAID012 = "Childcare First Aid (HLTAID012)",
  OCCUPATIONAL_FIRST_AID_HLTSS00068 = "Occupational First Aid (HLTSS00068)",
  FIRST_AID_NON_ACCREDITED = "First Aid (Non-accredited)",
  CPR_NON_ACCREDITED = "CPR (Non-accredited)",
}

export enum EVaccination {
  COVID_19_VACCINATION = "COVID-19 Vaccination",
  COVID_19_VACCINATION_BOOSTER_1 = "COVID-19 Vaccination Booster 1",
  COVID_19_VACCINATION_BOOSTER_2 = "COVID-19 Vaccination Booster 2",
  COVID_19_VACCINE_EXEMPT = "COVID-19 Vaccine Exempt",
  FLU_VACCINATION = "Flu Vaccination",
  FLU_VACCINE_EXEMPT = "Flu Vaccine Exempt",
}

export enum EServices {
  BASIC_MEDICATION_SUPPORT = "Basic Medication Support",
  COMPANIONSHIP = "Companionship",
  DOMESTIC_ASSISTANCE = "Domestic Assistance",
  DRIVING_COMMUNITY_ACCESS = "Driving & Community Access",
  SHOWERING_BATHING_PARTIAL = "Showering & Bathing: Partial Assistance",
  YARD_MAINTENANCE = "Yard Maintenance",
}
export const EnumFrequency = ["one off", "weekly", "fortnight"];
export type TFrequency = "one off" | "weekly" | "fortnight";
export interface TShift {
  // Client Details
  clientFirstName: string;
  clientLastName: string;
  clientSuburb: string;
  clientState: string;
  clientPostcode: Number;
  clientFullAddress: string;
  clientPhoneNumber: number;
  clientImage: {
    publicFileURL: string;
    path: string;
  };
  workStartDate: Date;
  workType: "one-off" | "ongoing";
  // Shift Details
  workerRole: TRole;
  shiftSuburb: string;
  shiftState: string;
  description?: string;
  workingTimeStart: Date;
  workingTimeFinish: Date;
  totalShiftHours: number;
  applyedUsers: Types.ObjectId[];
  // Requirements
  drivingLicense: boolean;
  assigned: Types.ObjectId;
  policeCheck: boolean;
  ndidWorkerCheck: boolean;
  preferredGender: "Male" | "Female" | "Anyone";
  language?: string[];
  preferredQualification?: EQualification;
  firstAidAndCPR?: EFirstAidAndCPR;
  vaccination?: EVaccination;

  // Payment Information
  hourlyRate: number;
  travelRatePerKm: number;
  clientPayhourlyRate: number;
  clientPaytravelRatePerKm: number;

  // Services and Frequency
  services: EServices[];
  frequency: TFrequency;
  isDeleted: boolean;
}
export const requiredFields = [
  "clientFirstName",
  "clientLastName",
  "clientSuburb",
  "clientState",
  "clientPostcode",
  "clientFullAddress",
  "clientPhoneNumber",
  "clientImage",
  "workerRole",
  "shiftSuburb",
  "shiftState",
  "workStartDate",
  "workingTimeStart",
  "workingTimeFinish",
  "totalShiftHours",
  // "drivingLicense",
  // "policeCheck",
  // "ndidWorkerCheck",
  "preferredGender",
  "hourlyRate",
  "travelRatePerKm",
  "clientPayhourlyRate",
  "clientPaytravelRatePerKm",
  "services",
  "frequency",
];
export type TApplyShift = {
  user: Types.ObjectId;
  input: string;
  status: "pending" | "approved" | "canceled";
  shift: Types.ObjectId;
};
