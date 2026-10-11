import { DocumentModel } from "./document.model";
import { IDocuments } from "./document.interface";
import mongoose, { Types } from "mongoose";

const uploadDocument = async (
  userId: string,
  documentData: Partial<IDocuments>
) => {
  const userIdObj = new mongoose.Types.ObjectId(userId);

  // Find existing document or create new if none exists
  let doc = await DocumentModel.findOne({ userId: userIdObj });

  if (!doc) {
    return await DocumentModel.create({ userId: userIdObj, ...documentData });
  }

  // Helper to merge objects while preserving verification fields
  const mergeObjects = (target: any, source: any) => {
    return {
      ...target,
      ...source,
      isVerifyed: target?.isVerifyed || "pending",
      adminNote: target?.adminNote || null,
    };
  };

  // Update top-level objects (passport, drivingLicense, etc.)
  const objectFields: (keyof IDocuments)[] = [
    "abn",
    "bankDetails",
    "passport",
    "drivingLicense",
    "carInsuranceCertificate",
    "workingWithChildren",
  ];

  objectFields.forEach((field) => {
    if (documentData[field]) {
      doc[field] = mergeObjects(doc[field], documentData[field]);
    }
  });

  // Update array fields (policeCheck, qualification, etc.)
  const arrayFields: (keyof IDocuments)[] = [
    "checks",
    "qualification",
    "firstAid",
    "vaccination",
  ];

  arrayFields.forEach((field) => {
    const newItems = documentData[field] as any[];
    if (newItems) {
      doc[field] = newItems.map((newItem, index) => {
        const existingItem = doc[field][index];
        return existingItem
          ? mergeObjects(existingItem, newItem) // Merge with existing
          : {
              ...newItem,
              isVerifyed: "pending", // New item
              adminNote: null,
            };
      });
    }
  });

  // Save and return updated document
  await doc.save();
  return doc;
};
const updateDocument = async (
  docId: Types.ObjectId,
  data: Partial<IDocuments>
) => {
  const doc = await DocumentModel.findOneAndUpdate(
    { _id: docId },
    { ...data },
    { new: true, runValidators: true }
  );
  return doc;
};
const getDocuments = async (userId: Types.ObjectId) => {
  const doc = await DocumentModel.findOne({ userId });
  return doc;
};

export const DocumentService = {
  uploadDocument,
  getDocuments,
  updateDocument,
};
