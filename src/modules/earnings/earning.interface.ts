import { Types } from "mongoose";

export type TEarnings = {
  user: Types.ObjectId;
  shift: Types.ObjectId;
  amount: number;
  isPaid: boolean;
} & Document;
