import { z } from "zod";

export const documentValidationSchema = z.object({
  passport: z
    .object({
      document: z.string(),
      expiryDate: z.string(),
    })
    .refine((data) => data.document.length > 0 && data.expiryDate.length > 0, {
      message: "Passport document and expiry date are required.", // Single message for passport
    }),

  checks: z
    .array(
      z.object({
        document: z.string(),
        publishDate: z.string(),
        type: z.string(),
      })
    )
    .refine(
      (data) =>
        data.every(
          (item) =>
            item.document.length > 0 &&
            item.publishDate.length > 0 &&
            item.type.length > 0
        ),
      {
        message:
          "Each police check entry must have a document, publish date, and type.", // Single message for policeCheck array
      }
    ),

  qualification: z
    .array(
      z.object({
        certificate: z.string(),
        expiryDate: z.string(),
        type: z.string(),
      })
    )
    .refine(
      (data) =>
        data.every(
          (item) =>
            item.certificate.length > 0 &&
            item.expiryDate.length > 0 &&
            item.type.length > 0
        ),
      {
        message:
          "Each qualification entry must have a certificate, expiry date, and type.", // Single message for qualification array
      }
    ),

  firstAid: z
    .array(
      z.object({
        document: z.string(),
        expiryDate: z.string(),
        type: z.string(),
      })
    )
    .refine(
      (data) =>
        data.every(
          (item) =>
            item.document.length > 0 &&
            item.expiryDate.length > 0 &&
            item.type.length > 0
        ),
      {
        message:
          "Each first aid entry must have a document, expiry date, and type.", // Single message for firstAid array
      }
    ),

  vaccination: z
    .array(
      z.object({
        certificate: z.string(),
        publishDate: z.string(),
        type: z.string(),
      })
    )
    .refine(
      (data) =>
        data.every(
          (item) =>
            item.certificate.length > 0 &&
            item.publishDate.length > 0 &&
            item.type.length > 0
        ),
      {
        message:
          "Each vaccination entry must have a certificate, publish date, and type.", // Single message for vaccination array
      }
    ),

  abn: z
    .object({
      abnNumber: z.string(),
      businessName: z.string(),
      gstRegistered: z.boolean().optional(),
    })
    .refine(
      (data) => data.abnNumber.length > 0 && data.businessName.length > 0,
      {
        message: "ABN Number and Business Name are required.", // Single message for ABN
      }
    ),

  bankDetails: z
    .object({
      bsbNumber: z.string(),
      accountNumber: z.string(),
    })
    .refine(
      (data) => data.bsbNumber.length > 0 && data.accountNumber.length > 0,
      {
        message: "BSB Number and Account Number are required.", // Single message for bank details
      }
    ),

  drivingLicense: z
    .object({
      frontDocument: z.string().optional(),
      backDocument: z.string().optional(),
      expiryDate: z.string().optional(),
    })
    .optional(),

  carInsuranceCertificate: z
    .object({
      certificate: z.string().optional(),
      expiryDate: z.string().optional(),
      type: z.string().optional(),
    })
    .optional(),

  workingWithChildren: z
    .object({
      document: z.string(),
      expiryDate: z.string(),
    })
    .optional(),
});
