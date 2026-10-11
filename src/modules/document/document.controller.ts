import { Request, Response } from "express";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import ApiError from "../../errors/ApiError";
import httpStatus from "http-status";
import { DocumentService } from "./document.service";
import { documentValidationSchema } from "./document.validation";
import { z } from "zod";
import mongoose from "mongoose";
import { DocumentModel } from "./document.model";
const uploadDocument = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user && (req.user as any).id?.toString();
  if (!userId) {
    throw new ApiError(httpStatus.UNAUTHORIZED, "Unauthorized");
  }
  // Validate request body
  console.log(req.body);
  try {
    documentValidationSchema.parse(req.body); // Attempt to parse and validate the request body
  } catch (error) {
    if (error instanceof z.ZodError) {
      // Check if the error is an instance of ZodError
      const errorList = error?.errors?.map((err: any) => {
        return err?.message;
      });
      throw new ApiError(httpStatus.BAD_REQUEST, errorList[0]?.toString());
    }
  }
  const documentData = req.body;
  const result = await DocumentService.uploadDocument(userId, documentData);
  return sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Document uploaded successfully.",
    data: result,
  });
});
const updateDocument = catchAsync(async (req: Request, res: Response) => {
  const docId = new mongoose.Types.ObjectId(req.params.docId);

  let data: any = {};
  const body = req.body;
  const field = req.body?.field;

  if (field === "passport") {
    if (body?.isVerifyed === "canceled") {
      if (!body?.adminNote?.trim()) {
        throw new ApiError(
          httpStatus.NOT_FOUND,
          "Admin note is required for passport cancellation"
        );
      }

      // Ensure passport object exists
      data.passport = data.passport || {};
      data.passport.isVerifyed = body?.isVerifyed; // Fix typo here
      data.passport.adminNote = body?.adminNote;
      await DocumentModel.findByIdAndUpdate(docId, {
        $set: {
          "passport.isVerifyed": data.passport.isVerifyed,
        },
      });
    } else {
      // Ensure passport object exists
      data.passport = data.passport || {};
      data.passport.isVerifyed = body?.isVerifyed; // Fix typo here
      await DocumentModel.findByIdAndUpdate(docId, {
        $set: {
          "passport.isVerifyed": data.passport.isVerifyed,
        },
      });
    }
  }
  if (field === "drivingLicense") {
    if (body?.isVerifyed === "canceled") {
      if (!body?.adminNote?.trim()) {
        throw new ApiError(
          httpStatus.NOT_FOUND,
          "Admin note is required for driving License cancellation"
        );
      }

      // Ensure passport object exists
      data.drivingLicense = data.drivingLicense || {};
      data.drivingLicense.isVerifyed = body?.isVerifyed; // Fix typo here
      data.drivingLicense.adminNote = body?.adminNote;
      await DocumentModel.findByIdAndUpdate(docId, {
        $set: {
          "drivingLicense.isVerifyed": data.drivingLicense.isVerifyed,
        },
      });
    } else {
      // Ensure passport object exists
      data.drivingLicense = data.drivingLicense || {};
      data.drivingLicense.isVerifyed = body?.isVerifyed;
      await DocumentModel.findByIdAndUpdate(docId, {
        $set: {
          "drivingLicense.isVerifyed": data.drivingLicense.isVerifyed,
        },
      });
    }
  }
  if (field === "carInsuranceCertificate") {
    if (body?.isVerifyed === "canceled") {
      if (!body?.adminNote?.trim()) {
        throw new ApiError(
          httpStatus.NOT_FOUND,
          "Admin note is required for carInsurance certificate cancellation"
        );
      }

      // Ensure passport object exists
      data.carInsuranceCertificate = data.carInsuranceCertificate || {};
      data.carInsuranceCertificate.isVerifyed = body?.isVerifyed; // Fix typo here
      data.carInsuranceCertificate.adminNote = body?.adminNote;
      await DocumentModel.findByIdAndUpdate(docId, {
        $set: {
          "carInsuranceCertificate.isVerifyed":
            data.carInsuranceCertificate.isVerifyed,
        },
      });
    } else {
      // Ensure passport object exists
      data.carInsuranceCertificate = data.carInsuranceCertificate || {};
      data.carInsuranceCertificate.isVerifyed = body?.isVerifyed; // Fix typo here
      await DocumentModel.findByIdAndUpdate(docId, {
        $set: {
          "carInsuranceCertificate.isVerifyed":
            data.carInsuranceCertificate.isVerifyed,
        },
      });
    }
  }
  if (field === "bankDetails") {
    if (body?.isVerifyed === "canceled") {
      if (!body?.adminNote?.trim()) {
        throw new ApiError(
          httpStatus.NOT_FOUND,
          "Admin note is required for bank details cancellation"
        );
      }

      // Ensure passport object exists
      data.bankDetails = data.bankDetails || {};
      data.bankDetails.isVerifyed = body?.isVerifyed; // Fix typo here
      data.bankDetails.adminNote = body?.adminNote;
      await DocumentModel.findByIdAndUpdate(docId, {
        $set: {
          "bankDetails.isVerifyed": data.bankDetails.isVerifyed,
        },
      });
    } else {
      // Ensure passport object exists
      data.bankDetails = data.bankDetails || {};
      data.bankDetails.isVerifyed = body?.isVerifyed; // Fix typo here
      await DocumentModel.findByIdAndUpdate(docId, {
        $set: {
          "bankDetails.isVerifyed": data.bankDetails.isVerifyed,
        },
      });
    }
  }
  if (field === "workingWithChildren") {
    if (body?.isVerifyed === "canceled") {
      if (!body?.adminNote?.trim()) {
        throw new ApiError(
          httpStatus.NOT_FOUND,
          "Admin note is required for working With Children cancellation"
        );
      }

      // Ensure passport object exists
      data.workingWithChildren = data.workingWithChildren || {};
      data.workingWithChildren.isVerifyed = body?.isVerifyed; // Fix typo here
      data.workingWithChildren.adminNote = body?.adminNote;
      await DocumentModel.findByIdAndUpdate(docId, {
        $set: {
          "workingWithChildren.isVerifyed": data.workingWithChildren.isVerifyed,
        },
      });
    } else {
      // Ensure passport object exists
      data.workingWithChildren = data.workingWithChildren || {};
      data.workingWithChildren.isVerifyed = body?.isVerifyed; // Fix typo here
      await DocumentModel.findByIdAndUpdate(docId, {
        $set: {
          "workingWithChildren.isVerifyed": data.workingWithChildren.isVerifyed,
        },
      });
    }
  }
  if (field === "abn") {
    if (body?.isVerifyed === "canceled") {
      if (!body?.adminNote?.trim()) {
        throw new ApiError(
          httpStatus.NOT_FOUND,
          "Admin note is required for abn cancellation"
        );
      }

      // Ensure passport object exists
      data.abn = data.abn || {};
      data.abn.isVerifyed = body?.isVerifyed; // Fix typo here
      data.abn.adminNote = body?.adminNote;
      await DocumentModel.findByIdAndUpdate(docId, {
        $set: {
          "abn.isVerifyed": data.abn.isVerifyed,
        },
      });
    } else {
      // Ensure passport object exists
      data.abn = data.abn || {};
      data.abn.isVerifyed = body?.isVerifyed; // Fix typo here
      await DocumentModel.findByIdAndUpdate(docId, {
        $set: {
          "abn.isVerifyed": data.abn.isVerifyed,
        },
      });
    }
  }

  if (field === "policeCheck") {
    if (!body?.id?.trim()) {
      throw new ApiError(httpStatus.NOT_FOUND, "policeCheck updated id needed");
    }
    if (body?.isVerifyed === "canceled") {
      if (!body?.adminNote?.trim()) {
        throw new ApiError(
          httpStatus.NOT_FOUND,
          "Admin note is required for police check cancellation"
        );
      }

      await DocumentModel.findByIdAndUpdate(
        docId,
        {
          $set: {
            "checks.$[elem].isVerifyed": body?.isVerifyed,
            "checks.$[elem].adminNote": body?.adminNote,
          },
        },
        {
          arrayFilters: [{ "elem._id": new mongoose.Types.ObjectId(body?.id) }],
          new: true,
        }
      );
    }
    await DocumentModel.findByIdAndUpdate(
      docId,
      {
        $set: {
          "checks.$[elem].isVerifyed": body?.isVerifyed,
        },
      },
      {
        arrayFilters: [{ "elem._id": new mongoose.Types.ObjectId(body?.id) }],
        new: true,
      }
    );
  }
  if (field === "qualification") {
    if (!body?.id?.trim()) {
      throw new ApiError(
        httpStatus.NOT_FOUND,
        "qualification updated id needed"
      );
    }
    if (body?.isVerifyed === "canceled") {
      if (!body?.adminNote?.trim()) {
        throw new ApiError(
          httpStatus.NOT_FOUND,
          "Admin note is required for qualification cancellation"
        );
      }

      await DocumentModel.findByIdAndUpdate(
        docId,
        {
          $set: {
            "qualification.$[elem].isVerifyed": body?.isVerifyed,
            "qualification.$[elem].adminNote": body?.adminNote,
          },
        },
        {
          arrayFilters: [{ "elem._id": new mongoose.Types.ObjectId(body?.id) }],
          new: true,
        }
      );
    }
    await DocumentModel.findByIdAndUpdate(
      docId,
      {
        $set: {
          "qualification.$[elem].isVerifyed": body?.isVerifyed,
        },
      },
      {
        arrayFilters: [{ "elem._id": new mongoose.Types.ObjectId(body?.id) }],
        new: true,
      }
    );
  }

  if (field === "vaccination") {
    if (!body?.id?.trim()) {
      throw new ApiError(httpStatus.NOT_FOUND, "vaccination updated id needed");
    }
    if (body?.isVerifyed === "canceled") {
      if (!body?.adminNote?.trim()) {
        throw new ApiError(
          httpStatus.NOT_FOUND,
          "Admin note is required for vaccination cancellation"
        );
      }

      await DocumentModel.findByIdAndUpdate(
        docId,
        {
          $set: {
            "vaccination.$[elem].isVerifyed": body?.isVerifyed,
            "vaccination.$[elem].adminNote": body?.adminNote,
          },
        },
        {
          arrayFilters: [{ "elem._id": new mongoose.Types.ObjectId(body?.id) }],
          new: true,
        }
      );
    }
    await DocumentModel.findByIdAndUpdate(
      docId,
      {
        $set: {
          "vaccination.$[elem].isVerifyed": body?.isVerifyed,
        },
      },
      {
        arrayFilters: [{ "elem._id": new mongoose.Types.ObjectId(body?.id) }],
        new: true,
      }
    );
  }

  if (field === "firstAid") {
    if (!body?.id?.trim()) {
      throw new ApiError(httpStatus.NOT_FOUND, "firstAid updated id needed");
    }
    if (body?.isVerifyed === "canceled") {
      if (!body?.adminNote?.trim()) {
        throw new ApiError(
          httpStatus.NOT_FOUND,
          "Admin note is required for firstAid cancellation"
        );
      }

      await DocumentModel.findByIdAndUpdate(
        docId,
        {
          $set: {
            "firstAid.$[elem].isVerifyed": body?.isVerifyed,
            "firstAid.$[elem].adminNote": body?.adminNote,
          },
        },
        {
          arrayFilters: [{ "elem._id": new mongoose.Types.ObjectId(body?.id) }],
          new: true,
        }
      );
    }
    await DocumentModel.findByIdAndUpdate(
      docId,
      {
        $set: {
          "firstAid.$[elem].isVerifyed": body?.isVerifyed,
        },
      },
      {
        arrayFilters: [{ "elem._id": new mongoose.Types.ObjectId(body?.id) }],
        new: true,
      }
    );
  }
  return sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Document status updated successfully.",
    data: data,
  });
});
const getDocuments = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user && (req.user as any).id?.toString();
  if (!userId) {
    throw new ApiError(httpStatus.UNAUTHORIZED, "Unauthorized");
  }
  const result = await DocumentService.getDocuments(userId);
  return sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Documents fetched successfully.",
    data: result,
  });
});
const uploadFile = catchAsync(async (req: Request, res: Response) => {
  let image: any = {
    path: "",
    publicFileURL: "",
  };
  if (req.file) {
    const imagePath = `public\\images\\${req.file.filename}`;
    const publicFileURL = `/images/${req.file.filename}`;
    image = {
      path: imagePath,
      publicFileURL: publicFileURL,
    };
  }

  return sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "File uploaded successfully.",
    data: image,
  });
});
export const DocumentController = {
  uploadDocument,
  getDocuments,
  uploadFile,
  updateDocument,
};
