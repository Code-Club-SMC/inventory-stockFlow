import mongoose from "mongoose";
import Category from "../models/Category.js";
import InventoryItem from "../models/InventoryItem.js";

// Same collation as the unique index, so lookups ignore case too.
const CASE_INSENSITIVE = { locale: "en", strength: 2 };

const invalidId = (res) =>
  res.status(400).json({ success: false, message: "Invalid category id" });

const notFound = (res) =>
  res.status(404).json({ success: false, message: "Category not found" });

const duplicateName = (res, name) =>
  res.status(409).json({
    success: false,
    message: `A category named "${name}" already exists.`,
  });

const inUse = (res, action, count) =>
  res.status(409).json({
    success: false,
    message: `Can't ${action}: ${count} inventory entr${count === 1 ? "y uses" : "ies use"} this category.`,
  });

export const getCategories = async (req, res) => {
  try {
    const filter = {};
    if (["Active", "Inactive"].includes(req.query.status)) {
      filter.status = req.query.status;
    }

    const categories = await Category.find(filter).sort({ createdAt: -1 }).lean();
    return res.status(200).json({ success: true, data: categories });
  } catch (error) {
    console.error("Error fetching categories:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong while fetching categories",
    });
  }
};

export const getCategory = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return invalidId(res);

    const category = await Category.findById(req.params.id).lean();
    if (!category) return notFound(res);

    return res.status(200).json({ success: true, data: category });
  } catch (error) {
    console.error("Error fetching category:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong while fetching the category",
    });
  }
};

export const createCategory = async (req, res) => {
  try {
    const { name, description, status } = req.body;

    const exists = await Category.findOne({ name }).collation(CASE_INSENSITIVE);
    if (exists) return duplicateName(res, name);

    const category = await Category.create({ name, description, status });
    return res.status(201).json({ success: true, data: category });
  } catch (error) {
    if (error.code === 11000) return duplicateName(res, req.body.name);

    console.error("Error creating category:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong while creating the category",
    });
  }
};

export const updateCategory = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return invalidId(res);

    const { name, description, status } = req.body;

    const current = await Category.findById(req.params.id);
    if (!current) return notFound(res);

    // Inventory stores the category name, so renaming would split its stock.
    if (name !== current.name) {
      const used = await InventoryItem.countDocuments({ category: current.name });
      if (used > 0) return inUse(res, "rename", used);
    }

    const taken = await Category.findOne({
      name,
      _id: { $ne: req.params.id },
    }).collation(CASE_INSENSITIVE);
    if (taken) return duplicateName(res, name);

    current.name = name;
    current.description = description;
    current.status = status;
    const updated = await current.save();

    return res.status(200).json({ success: true, data: updated });
  } catch (error) {
    if (error.code === 11000) return duplicateName(res, req.body.name);

    console.error("Error updating category:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong while updating the category",
    });
  }
};

export const deleteCategory = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return invalidId(res);

    const category = await Category.findById(req.params.id);
    if (!category) return notFound(res);

    const used = await InventoryItem.countDocuments({ category: category.name });
    if (used > 0) return inUse(res, "delete", used);

    await Category.deleteOne({ _id: category._id });
    return res.status(200).json({ success: true, data: category });
  } catch (error) {
    console.error("Error deleting category:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong while deleting the category",
    });
  }
};
