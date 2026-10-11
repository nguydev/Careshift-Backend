import mongoose, { Document } from "mongoose";
export type ISupport = {
  firstName: string;
  lastName: string;
  email: string;
  msg: string;
  createdAt: Date;
  isDeleted: boolean;
} & Document;
