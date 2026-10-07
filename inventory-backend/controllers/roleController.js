import mongoose from "mongoose";
import Role from "../models/Role.js";
import User from "../models/User.js";

const invalidId = (res) =>
  res.status(400).json({ success: false, message: "Invalid role id" });

const duplicateName = (res, name) =>
  res.status(409).json({
    success: false,
    message: `A role named "${name}" already exists.`,
  });

export const getRoles = async (req, res) => {
  try {
    const roles = await Role.find().sort({ createdAt: 1 });
    return res.status(200).json({ success: true, data: roles });
  } catch (error) {
    console.error("Error fetching roles:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong while fetching roles",
    });
  }
};

export const getRole = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return invalidId(res);

    const role = await Role.findById(req.params.id);
    if (!role) {
      return res.status(404).json({ success: false, message: "Role not found" });
    }
    return res.status(200).json({ success: true, data: role });
  } catch (error) {
    console.error("Error fetching role:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong while fetching the role",
    });
  }
};

export const createRole = async (req, res) => {
  try {
    const { name, description, permissions } = req.body;

    const existing = await Role.findOne({ name });
    if (existing) return duplicateName(res, name);

    const role = await Role.create({ name, description, permissions });
    return res.status(201).json({ success: true, data: role });
  } catch (error) {
    // Two requests with the same name at the same moment hit the unique index.
    if (error.code === 11000) return duplicateName(res, req.body.name);

    console.error("Error creating role:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong while creating the role",
    });
  }
};

export const updateRole = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return invalidId(res);

    const { name, description, permissions } = req.body;

    const role = await Role.findById(req.params.id);
    if (!role) {
      return res.status(404).json({ success: false, message: "Role not found" });
    }

    // System roles (e.g. Super Admin): no rename, and no permission can be removed.
    if (role.isSystemRole) {
      if (name !== role.name) {
        return res.status(403).json({
          success: false,
          message: "This role is protected and can't be renamed.",
        });
      }

      const ACTIONS = ["view", "create", "edit", "delete"];
      const removesAccess = role.permissions.some((old) => {
        const next = permissions.find((p) => p.module === old.module);
        return ACTIONS.some((a) => old[a] && !next?.[a]);
      });

      if (removesAccess) {
        return res.status(403).json({
          success: false,
          message: "This role is protected. Its permissions can't be removed.",
        });
      }
    }

    if (name !== role.name) {
      const nameTaken = await Role.findOne({ name, _id: { $ne: role._id } });
      if (nameTaken) return duplicateName(res, name);
      role.name = name;
    }

    if (description !== undefined) role.description = description;
    if (permissions) role.permissions = permissions;

    const updated = await role.save();
    // Employees only store a reference to the role, so they pick up the
    // change immediately.
    return res.status(200).json({ success: true, data: updated });
  } catch (error) {
    if (error.code === 11000) return duplicateName(res, req.body.name);

    console.error("Error updating role:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong while updating the role",
    });
  }
};

export const deleteRole = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return invalidId(res);

    const role = await Role.findById(req.params.id);
    if (!role) {
      return res.status(404).json({ success: false, message: "Role not found" });
    }

    if (role.isSystemRole) {
      return res.status(403).json({
        success: false,
        message: "This role is protected and can't be deleted.",
      });
    }

    const employeeCount = await User.countDocuments({ role: role._id });
    if (employeeCount > 0) {
      return res.status(409).json({
        success: false,
        message: `Can't delete: ${employeeCount} employee(s) are still assigned this role. Reassign them first.`,
      });
    }

    await Role.findByIdAndDelete(req.params.id);
    return res.status(200).json({ success: true, data: role });
  } catch (error) {
    console.error("Error deleting role:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong while deleting the role",
    });
  }
};
