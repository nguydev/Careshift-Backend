import mongoose from "mongoose";
import { TIncident } from "./incident.interface";

const incidentSchema = new mongoose.Schema<TIncident>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    role: {
      type: String,
      required: true,
      trim: true,
      enum: ["admin", "carer", "nurse", "cleaner", "client"],
    },
    incidentDuringArrangedService: {
      type: Boolean,
      required: true,
      trim: true,
    },
    incidentDate: { type: Date, required: true, trim: true },
    incidentTime: { type: String, required: true, trim: true },
    incidentDetails: { type: String, required: true, trim: true },
    injuriesDetailsFromIncident: { type: String, required: true, trim: true },
    actionsTaken: { type: String, required: true, trim: true },
    witnessDetails: { type: String, required: true, trim: true },
    desiredActionByMable: { type: String, required: true, trim: true },
  },
  { timestamps: true },
);
export const IncidentModel = mongoose.model("incidents", incidentSchema);
