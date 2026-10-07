import mongoose from "mongoose";
import InventoryItem from "../models/InventoryItem.js";
import Transaction from "../models/Transaction.js";
import Category from "../models/Category.js";
import { nextReference } from "../utils/reference.js";

const CASE_INSENSITIVE = { locale: "en", strength: 2 };

const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

const send = (res, status, message) =>
  res.status(status).json({ success: false, message });

const invalidId = (res) => send(res, 400, "Invalid inventory id");

/* -------------------------------------------------------------------------- */
/* List / read                                                                */
/* -------------------------------------------------------------------------- */

export const getInventory = async (req, res) => {
  try {
    const filter = {};
    if (req.query.category) filter.category = req.query.category;

    const inventory = await InventoryItem.find(filter)
      .sort({ date: -1, createdAt: -1 })
      .lean();

    return res.status(200).json({ success: true, data: inventory });
  } catch (error) {
    console.error("Error fetching inventory:", error);
    return send(res, 500, "Something went wrong while fetching inventory");
  }
};

export const getInventoryItem = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return invalidId(res);

    const item = await InventoryItem.findById(req.params.id).lean();
    if (!item) return send(res, 404, "Inventory item not found");

    return res.status(200).json({ success: true, data: item });
  } catch (error) {
    console.error("Error fetching inventory item:", error);
    return send(res, 500, "Something went wrong while fetching the inventory item");
  }
};

export const getStockByCategory = async (req, res) => {
  try {
    const rows = await InventoryItem.aggregate([
      {
        $group: {
          _id: "$category",
          currentStock: { $sum: "$currentStock" },
          quantity: { $sum: "$quantity" },
          unit: { $first: "$unit" },
        },
      },
      {
        $project: { _id: 0, category: "$_id", currentStock: 1, quantity: 1, unit: 1 },
      },
      { $sort: { category: 1 } },
    ]);

    return res.status(200).json({ success: true, data: rows });
  } catch (error) {
    console.error("Error fetching stock summary:", error);
    return send(res, 500, "Something went wrong while fetching the stock summary");
  }
};

/* -------------------------------------------------------------------------- */
/* Create: the batch and its "Stock In" ledger row are saved together         */
/* -------------------------------------------------------------------------- */

export const createInventoryItem = async (req, res) => {
  const { category, quantity, unit, stockInPrice, date, description } = req.body;

  try {
    // The category must exist and be Active. Use its stored spelling.
    const cat = await Category.findOne({ name: category }).collation(CASE_INSENSITIVE);
    if (!cat) return send(res, 400, `Category "${category}" does not exist.`);
    if (cat.status !== "Active") {
      return send(res, 400, `Category "${cat.name}" is inactive.`);
    }

    const session = await mongoose.startSession();
    let item = null;

    try {
      await session.withTransaction(async () => {
        const [created] = await InventoryItem.create(
          [
            {
              category: cat.name,
              quantity,
              unit,
              stockInPrice,
              date,
              description,
              currentStock: quantity,
            },
          ],
          { session }
        );

        const reference = await nextReference("PO", date, session);

        await Transaction.create(
          [
            {
              date,
              category: cat.name,
              type: "Stock In",
              quantity,
              price: stockInPrice,
              description,
              reference,
              source: "inventory",
              inventoryItem: created._id,
            },
          ],
          { session }
        );

        item = created;
      });
    } finally {
      await session.endSession();
    }

    return res.status(201).json({ success: true, data: item });
  } catch (error) {
    console.error("Error creating inventory item:", error);
    return send(res, 500, "Something went wrong while adding the stock");
  }
};

/* -------------------------------------------------------------------------- */
/* Update: quantity can't go below what was already sold                      */
/* -------------------------------------------------------------------------- */

export const updateInventoryItem = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return invalidId(res);

  const { category, quantity, unit, stockInPrice, date, description } = req.body;

  try {
    const session = await mongoose.startSession();
    let failure = null;
    let saved = null;

    try {
      await session.withTransaction(async () => {
        failure = null;
        saved = null;

        const item = await InventoryItem.findById(req.params.id).session(session);
        if (!item) {
          failure = [404, "Inventory item not found"];
          return;
        }

        if (category.toLowerCase() !== item.category.toLowerCase()) {
          failure = [
            400,
            "The category can't be changed. Delete this stock entry and add it again.",
          ];
          return;
        }

        const sold = round2(item.quantity - item.currentStock);
        if (quantity < sold) {
          failure = [
            400,
            `Quantity can't be less than the amount already sold (${sold}).`,
          ];
          return;
        }

        // Once part of a batch is sold, its date can't move later than it was.
        if (sold > 0 && date > item.date) {
          failure = [
            409,
            "The date can't be moved later after part of this stock was sold.",
          ];
          return;
        }

        item.quantity = quantity;
        item.currentStock = round2(quantity - sold);
        item.unit = unit;
        item.stockInPrice = stockInPrice;
        item.date = date;
        item.description = description;
        saved = await item.save({ session });

        // Keep the ledger row in step with the batch.
        await Transaction.updateOne(
          { inventoryItem: item._id, type: "Stock In" },
          {
            $set: {
              quantity,
              price: stockInPrice,
              totalPrice: round2(quantity * stockInPrice),
              date,
              description,
            },
          },
          { session }
        );
      });
    } finally {
      await session.endSession();
    }

    if (failure) return send(res, failure[0], failure[1]);
    return res.status(200).json({ success: true, data: saved });
  } catch (error) {
    console.error("Error updating inventory item:", error);
    return send(res, 500, "Something went wrong while updating the stock");
  }
};

/* -------------------------------------------------------------------------- */
/* Delete: only if none of the batch has been sold                            */
/* -------------------------------------------------------------------------- */

export const deleteInventoryItem = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return invalidId(res);

  try {
    const session = await mongoose.startSession();
    let failure = null;
    let removed = null;

    try {
      await session.withTransaction(async () => {
        failure = null;
        removed = null;

        const item = await InventoryItem.findById(req.params.id).session(session);
        if (!item) {
          failure = [404, "Inventory item not found"];
          return;
        }

        const sold = round2(item.quantity - item.currentStock);
        if (sold > 0) {
          failure = [
            409,
            `Can't delete: ${sold} of this stock has already been sold.`,
          ];
          return;
        }

        await Transaction.deleteMany({ inventoryItem: item._id }, { session });
        await InventoryItem.deleteOne({ _id: item._id }, { session });
        removed = item;
      });
    } finally {
      await session.endSession();
    }

    if (failure) return send(res, failure[0], failure[1]);
    return res.status(200).json({ success: true, data: removed });
  } catch (error) {
    console.error("Error deleting inventory item:", error);
    return send(res, 500, "Something went wrong while deleting the stock");
  }
};
