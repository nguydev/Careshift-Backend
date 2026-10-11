import mongoose from "mongoose";
import { TEarnings } from "./earning.interface";

const EarningSchema = new mongoose.Schema<TEarnings>(
  {
    shift: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shift",
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      trim: true,
      default: 0,
    },
    isPaid: {
      type: Boolean,
      required: true,
      default: false,
    },
  },
  { timestamps: true }
);

export const Earnings = mongoose.model("earnings", EarningSchema);
