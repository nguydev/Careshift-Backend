import { TIncident } from "./incident.interface";
import { IncidentModel } from "./incident.model";

const addIncident = async (body: TIncident) => {
  const result = await IncidentModel.create(body);
  return result;
};
const getIncidents = async (page: number, limit: number) => {
  const skip = (page - 1) * limit;
  const result = await IncidentModel.find({})
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  return result;
};
export const IncidentServices = { addIncident, getIncidents };
