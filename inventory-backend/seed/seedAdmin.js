// Run once (and any time you add a module):  node src/seed/seedAdmin.js
// .env needs: MONGO_URI, SEED_ADMIN_EMAIL, and (only for a NEW user) SEED_ADMIN_PASSWORD.
// Optional: SEED_ADMIN_NAME.
import "dotenv/config";
import dns from "node:dns";
import mongoose from "mongoose";
import Role from "../models/Role.js";
import User from "../models/User.js";
import { MODULES, isViewOnly } from "../validations/roleSchema.js";

// Same DNS fix as server.js: this script runs on its own, so it needs it too.
// Remove these two lines if your network resolves mongodb+srv:// fine without them.
dns.setServers(["8.8.8.8", "1.1.1.1"]);

const ROLE_NAME = "Super Admin";

// Everything on, except create/edit/delete for the view-only modules.
const fullAccess = () =>
  MODULES.map((module) => ({
    module,
    view: true,
    create: !isViewOnly(module),
    edit: !isViewOnly(module),
    delete: !isViewOnly(module),
  }));

async function run() {
  const { MONGO_URI, SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD, SEED_ADMIN_NAME } = process.env;
  if (!MONGO_URI) throw new Error("MONGO_URI is missing in .env");

  await mongoose.connect(MONGO_URI);

  // 1. The protected role
  let role = await Role.findOne({ name: ROLE_NAME });
  if (role) {
    role.isSystemRole = true;
    role.permissions = fullAccess();
    await role.save();
    console.log(`Updated role "${ROLE_NAME}" with access to all ${MODULES.length} modules.`);
  } else {
    role = await Role.create({
      name: ROLE_NAME,
      description: "Full access to every module",
      isSystemRole: true,
      permissions: fullAccess(),
    });
    console.log(`Created role "${ROLE_NAME}".`);
  }

  // 2. The first admin user
  const email = SEED_ADMIN_EMAIL?.trim().toLowerCase();
  if (!email) {
    console.log("SEED_ADMIN_EMAIL is not set, so no user was changed.");
  } else {
    const user = await User.findOne({ email });
    if (user) {
      user.role = role._id;
      user.isActive = true;
      await user.save(); // password untouched, so it is not re-hashed
      console.log(`Existing user ${email} is now "${ROLE_NAME}".`);
    } else {
      if (!SEED_ADMIN_PASSWORD) {
        throw new Error("SEED_ADMIN_PASSWORD is required to create a new user.");
      }
      await User.create({
        name: SEED_ADMIN_NAME || "Super Admin",
        email,
        password: SEED_ADMIN_PASSWORD, // the model hashes it
        role: role._id,
      });
      console.log(`Created user ${email} as "${ROLE_NAME}".`);
    }
  }

  await mongoose.disconnect();
}

run().catch(async (error) => {
  console.error("Seed failed:", error.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});