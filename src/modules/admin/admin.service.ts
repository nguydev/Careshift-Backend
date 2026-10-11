import mongoose, { Types } from "mongoose";
import { UserModel } from "../user/user.model";
import ApiError from "../../errors/ApiError";
import httpStatus from "http-status";
import moment from "moment";
import { ArticalsModel } from "../articals/articals.model";
import { FAQModel } from "../faq/faq.model";
import { Shift } from "../shift/shift.model";
import { DocumentModel } from "../document/document.model";
import { Earnings } from "../earnings/earning.model";

// admin.service.ts
const updateStatus = async (userId: Types.ObjectId, days: number) => {
  let extendDays = new Date();
  extendDays.setDate(extendDays.getDate() + days);
  const user = await UserModel.findByIdAndUpdate(
    userId,
    {
      lockUntil: days ? extendDays : null,
    },
    { new: true }
  ).select("lockUntil");

  return user;
};
const getUsers = async (query: object) => {
  console.log(query);
  const clients = await UserModel.find(query).select(
    "frist_name last_name email phone city"
  );
  return clients;
};
const getUserWithDocs = async (query: object) => {
  const document = await DocumentModel.findOne(query).populate(
    "userId",
    "-password"
  );
  console.log(document);
  const response = {
    docId: document?._id,
    parsonalDetails: {
      first_name: document?.userId?.firstName || "",
      last_name: document?.userId?.lastName || "",
      email: document?.userId?.email || "",
      role: document?.userId?.role || "",
      phone: document?.userId?.phoneNumber || "",
      gender: document?.userId?.gender || "",
      address: document?.userId?.residentialAddress || "",
      dob: document?.userId?.dateOfBirth || "",
      language: document?.userId?.languagesSpoken || [],
      hear_our_app: document?.userId?.referralSourceEnum || "",
      verifyedByAdmin: document?.userId?.verifyedByAdmin ? true : false,
      image: document?.userId?.image.publicFileURL || "",
    },
    emergencyContact: {
      firstName: document?.userId?.emergencyContactFirstName || "",
      lastName: document?.userId?.emergencyContactLastName || "",
      phone: document?.userId?.emergencyContactPhoneNumber || "",
      relation: document?.userId?.emergencyContactRelationship || "",
    },
    document: {
      passport: document?.passport,
      drivingLicense: document?.drivingLicense,
      carInsuranceCertificate: document?.carInsuranceCertificate,
      policeCheck: document?.checks,
      firstAid: document?.firstAid,
      workingWithChildren: document?.workingWithChildren,
      vaccination: document?.vaccination,
    },
    qualification: document?.qualification,
    bankDetails: document?.bankDetails,
    abnDetails: document?.abn,
  };
  return response;
};
const createArtical = async (body: Object, file: any) => {
  const result = await ArticalsModel.create({
    ...body,
    image: {
      publicFileURL: `public\\images\\${file?.filename}`, // This is a bug
      path: `/images/${file?.filename}`,
    },
  });
  return result;
};
const updateArtical = async (
  body: Object,
  file: any,
  articalId: Types.ObjectId
) => {
  let query = {};
  if (file) {
    query = {
      ...body,
      image: {
        publicFileURL: `public\\images\\${file?.filename}`, // This is a bug
        path: `/images/${file?.filename}`,
      },
    };
  } else {
    query = {
      ...body,
    };
  }

  const result = await ArticalsModel.findByIdAndUpdate(articalId, query, {
    new: true,
  });
  return result;
};
const createFAQ = async (body: Object) => {
  const result = await FAQModel.create(body);
  return result;
};
const updateFAQ = async (body: Object, faqId: Types.ObjectId) => {
  const result = await FAQModel.findByIdAndUpdate(faqId, body, {
    new: true,
  });
  return result;
};

const dashboardUserChart = async (year: number) => {
  const months = [
    { Month: "January", Value: 1 },
    { Month: "February", Value: 2 },
    { Month: "March", Value: 3 },
    { Month: "April", Value: 4 },
    { Month: "May", Value: 5 },
    { Month: "June", Value: 6 },
    { Month: "July", Value: 7 },
    { Month: "August", Value: 8 },
    { Month: "September", Value: 9 },
    { Month: "October", Value: 10 },
    { Month: "November", Value: 11 },
    { Month: "December", Value: 12 },
  ];

  const result = await UserModel.aggregate([
    // Filter documents by year
    {
      $match: {
        createdAt: {
          $gte: new Date(`${year}-01-01`),
          $lt: new Date(`${year + 1}-01-01`),
        },
      },
    },
    {
      $project: {
        month: { $month: "$createdAt" },
      },
    },

    {
      $group: {
        _id: "$month",
        count: { $sum: 1 },
      },
    },
    // Generate all 12 months and merge with counts
    {
      $facet: {
        counts: [],
        allMonths: [
          { $project: { months: { $range: [1, 13] } } },
          { $unwind: "$months" },
        ],
      },
    },

    {
      $project: {
        months: {
          $map: {
            input: "$allMonths.months",
            as: "m",
            in: {
              month: "$$m",
              count: {
                $let: {
                  vars: {
                    matched: {
                      $filter: {
                        input: "$counts",
                        as: "c",
                        cond: { $eq: ["$$c._id", "$$m"] },
                      },
                    },
                  },
                  in: {
                    $cond: {
                      if: { $gt: [{ $size: "$$matched" }, 0] },
                      then: { $arrayElemAt: ["$$matched.count", 0] },
                      else: 0,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    // Unwind and format final output
    { $unwind: "$months" },
    { $replaceRoot: { newRoot: "$months" } },
    { $sort: { month: 1 } },
  ]);

  // Create a map for quick lookup of counts by month number
  const countMap = new Map();
  result.forEach((item) => {
    countMap.set(item.month, item.count);
  });

  // Map to final response with month names
  const response = months.map((month) => ({
    Month: month.Month,
    Value: countMap.get(month.Value) || 0,
  }));

  return response;
  // return result;
};
const workers = async (query: any, page: number, limit: number) => {
  const skip = (page - 1) * limit;
  const result = await UserModel.aggregate([
    {
      $match: { ...query },
    },
    {
      $sort: { createdAt: -1 },
    },
    {
      $skip: skip,
    },
    {
      $limit: limit,
    },
    {
      $lookup: {
        from: "documents",
        localField: "_id",
        foreignField: "userId",
        as: "docummentData",
      },
    },
    {
      $project: {
        _id: 1,
        email: 1,
        residentialAddress: 1,
        firstName: 1,
        lastName: 1,
        verifyedByAdmin: 1,
        lastLogin: 1,
        docummentData: {
          _id: 1,
          drivingLicense: 1,
          carInsuranceCertificate: 1,
        },
      },
    },
  ]);

  const response = result.map((data) => {
    // Use valid document data if exists
    const validDocument = data.docummentData?.find(
      (doc: any) => doc?.drivingLicense || doc?.carInsuranceCertificate
    );

    return {
      _id: data?._id,
      name: `${data.firstName || ""} ${data.lastName || ""}`.trim(), // Fixed property names
      email: data.email,
      address: data.residentialAddress || "",
      drivingLicense:
        validDocument?.drivingLicense?.frontDocument &&
        validDocument?.drivingLicense?.backDocument &&
        validDocument?.drivingLicense?.expiryDate
          ? true
          : false,
      carInsurance: validDocument?.carInsuranceCertificate?.type || "N/A",
      lastLogin: data.lastLogin || "N/A",
      adminVerifyed: data.verifyedByAdmin || false, // Fixed property name
    };
  });

  return response;
};
const workersForNotification = async (
  query: any,
  page: number,
  limit: number
) => {
  const skip = (page - 1) * limit;
  const result = await UserModel.find(query)
    .skip(skip)
    .limit(limit)
    .select("firstName lastName suburb");

  const response = result.map((data) => {
    // Use valid document data if exists

    return {
      _id: data?._id,
      name: `${data.firstName || ""} ${data.lastName || ""}`.trim(), // Fixed property names
      suburb: data.suburb,
    };
  });

  return response;
};
const updateWorkerStatus = async (query: any, status: string) => {
  const result = await UserModel.findOneAndUpdate(
    query,
    {
      verifyedByAdmin: status,
    },
    { new: true }
  );
  return true;
};
const monthlyEarning = async (query: any = {}) => {
  const aggregatedData = await Earnings.aggregate([
    {
      $match: query,
    },
    {
      $addFields: {
        year: { $year: "$createdAt" },
        month: { $month: "$createdAt" },
        day: { $dayOfMonth: "$createdAt" },
        monthName: { $dateToString: { format: "%B", date: "$createdAt" } },
        // Correct lastDayOfMonth calculation
        lastDayOfMonth: {
          $dayOfMonth: {
            $dateFromParts: {
              year: { $year: "$createdAt" },
              month: { $add: [{ $month: "$createdAt" }, 1] },
              day: 0,
              timezone: "UTC",
            },
          },
        },
      },
    },
    {
      $group: {
        _id: {
          year: "$year",
          month: "$month",
          periodType: {
            $cond: [{ $lte: ["$day", 15] }, "first", "second"],
          },
        },
        monthName: { $first: "$monthName" },
        year: { $first: "$year" },
        numericMonth: { $first: "$month" },
        lastDayOfMonth: { $first: "$lastDayOfMonth" },
        amount: { $sum: "$amount" },
        // Handle payment status aggregation
        allPaid: { $push: "$isPaid" },
      },
    },
    {
      $group: {
        _id: { year: "$_id.year", month: "$_id.month" },
        monthName: { $first: "$monthName" },
        year: { $first: "$year" },
        numericMonth: { $first: "$numericMonth" },
        lastDayOfMonth: { $first: "$lastDayOfMonth" },
        periods: {
          $push: {
            periodType: "$_id.periodType",
            amount: "$amount",
            paymentStatuses: "$allPaid",
          },
        },
      },
    },
    {
      $project: {
        monthName: 1,
        year: 1,
        periods: {
          $map: {
            input: "$periods",
            as: "p",
            in: {
              label: {
                $cond: [
                  { $eq: ["$$p.periodType", "first"] },
                  { $concat: ["1 ", "$monthName", " - 15 ", "$monthName"] },
                  {
                    $concat: [
                      "16 ",
                      "$monthName",
                      " - ",
                      { $toString: "$lastDayOfMonth" },
                      " ",
                      "$monthName",
                    ],
                  },
                ],
              },
              amount: "$$p.amount",
              // Determine payment status
              status: {
                $cond: [
                  { $allElementsTrue: "$$p.paymentStatuses" },
                  "Paid",
                  {
                    $cond: [
                      {
                        $anyElementTrue: {
                          $map: {
                            input: "$$p.paymentStatuses",
                            as: "s",
                            in: { $not: "$$s" },
                          },
                        },
                      },
                      "Mixed",
                      "Paid",
                    ],
                  },
                ],
              },
              // Generate UTC midnight dates
              startDate: {
                $cond: [
                  { $eq: ["$$p.periodType", "first"] },
                  {
                    $dateFromParts: {
                      year: "$year",
                      month: "$numericMonth",
                      day: 1,
                      hour: 0,
                      minute: 0,
                      second: 0,
                      timezone: "UTC",
                    },
                  },
                  {
                    $dateFromParts: {
                      year: "$year",
                      month: "$numericMonth",
                      day: 16,
                      hour: 0,
                      minute: 0,
                      second: 0,
                      timezone: "UTC",
                    },
                  },
                ],
              },
              endDate: {
                $cond: [
                  { $eq: ["$$p.periodType", "first"] },
                  {
                    $dateFromParts: {
                      year: "$year",
                      month: "$numericMonth",
                      day: 15,
                      hour: 0,
                      minute: 0,
                      second: 0,
                      timezone: "UTC",
                    },
                  },
                  {
                    $dateFromParts: {
                      year: "$year",
                      month: "$numericMonth",
                      day: "$lastDayOfMonth",
                      hour: 0,
                      minute: 0,
                      second: 0,
                      timezone: "UTC",
                    },
                  },
                ],
              },
            },
          },
        },
      },
    },
    {
      $sort: { year: 1, numericMonth: 1 },
    },
  ]);

  return aggregatedData.map((data: any) => ({
    header: `Earnings - ${data.monthName}, ${data.year}`,
    periods: data.periods,
  }));
};
export const AdminService = {
  getUsers,
  updateStatus,
  createFAQ,
  updateFAQ,
  updateArtical,
  createArtical,
  dashboardUserChart,
  workers,
  getUserWithDocs,
  updateWorkerStatus,
  monthlyEarning,
  workersForNotification,
};
