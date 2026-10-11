import { Document } from "mongoose";

export type TIncident = {
  name: string;
  email: string;
  role: "admin" | "carer" | "nurse" | "cleaner" | "client";
  phone: string;
  incidentDuringArrangedService: boolean;
  incidentDate: Date;
  incidentTime: String;
  incidentDetails: string;
  injuriesDetailsFromIncident: string;
  actionsTaken: string;
  witnessDetails: string;
  desiredActionByMable: string;
} & Document;
