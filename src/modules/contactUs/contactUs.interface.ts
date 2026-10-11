import { Document } from "mongoose";

export type IContactUs = {
  message: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  createdAt: Date;
  isDeleted: boolean;
} & Document;
