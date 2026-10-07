import mongoose from "mongoose";

import { MODULES } from "../validations/roleSchema.js";

const modulePermissionSchema = new mongoose.Schema(
  {
    module: {
      type: String,
      enum: MODULES,
      required: true,
    },
    view: { type: Boolean, default: false },
    create: { type: Boolean, default: false },
    edit: { type: Boolean, default: false },
    delete: { type: Boolean, default: false },
  },
  { _id: false }
);

const roleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    description: {
      type: String,
      trim: true,
    },
    permissions: {
      type: [modulePermissionSchema],
      default: [],
    },
    isSystemRole: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

const Role = mongoose.model("Role", roleSchema);
export default Role;
export { MODULES };
