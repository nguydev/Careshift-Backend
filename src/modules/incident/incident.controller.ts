import { Request, Response } from "express";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import httpStatus from "http-status";
import { IncidentServices } from "./incident.service";
import paginationBuilder from "../../utils/paginationBuilder";
import { IncidentModel } from "./incident.model";

const addIncident = catchAsync(async (req: Request, res: Response) => {
  const result = await IncidentServices.addIncident(req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "New incident added.",
    data: result,
  });
});
const getIncidents = catchAsync(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const result = await IncidentServices.getIncidents(page, limit);
  const totalData = await IncidentModel.countDocuments({});
  const pagination = paginationBuilder({
    totalData: totalData,
    currentPage: page,
    limit: limit,
  });
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Get incidents.",
    pagination,
    data: result,
  });
});
export const IncidentController = { addIncident, getIncidents };
