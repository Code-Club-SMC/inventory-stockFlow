import mongoose from 'mongoose';
import User from '../models/User.js';
import Role from '../models/Role.js';

const invalidId = (res) =>
	res.status(400).json({ success: false, message: 'Invalid user id' });

const notFound = (res) =>
	res.status(404).json({ success: false, message: 'User not found' });

const duplicateEmail = (res) =>
	res.status(409).json({
		success: false,
		message: 'A user with this email already exists.',
	});

const serverError = (res, action, error) => {
	console.error(`Error ${action} user:`, error);
	return res.status(500).json({
		success: false,
		message: `Something went wrong while ${action} the user`,
	});
};

// Fields the table needs. The password is never selected (select: false).
const populateRole = { path: 'role', select: 'name isSystemRole' };

// Id of the logged-in user. requireAuth (added later) will set req.user.
// Until then this is undefined and the "self" rules are simply skipped.
const getSelfId = (req) => {
	const u = req.user;
	return u ? String(u._id || u.id) : null;
};

// True if this user is the only active holder of a system role (e.g. Super Admin).
const isLastSystemUser = async (user) => {
	const role = await Role.findById(user.role);
	if (!role?.isSystemRole) return false;

	const others = await User.countDocuments({
		role: user.role,
		_id: { $ne: user._id },
		isActive: { $ne: false },
	});
	return others === 0;
};

export const getUsers = async (req, res) => {
	try {
		const users = await User.find()
			.populate(populateRole)
			.sort({ createdAt: -1 });
		return res.status(200).json({ success: true, data: users });
	} catch (error) {
		return serverError(res, 'fetching', error);
	}
};

export const createUser = async (req, res) => {
	try {
		const { name, email, password, role } = req.body;

		const roleDoc = await Role.findById(role);
		if (!roleDoc) {
			return res
				.status(400)
				.json({ success: false, message: 'Selected role does not exist.' });
		}

		if (await User.findOne({ email })) return duplicateEmail(res);

		// Plain password: the model's pre-save hook hashes it.
		const created = await User.create({ name, email, password, role });
		const user = await User.findById(created._id).populate(populateRole);

		return res.status(201).json({ success: true, data: user });
	} catch (error) {
		if (error.code === 11000) return duplicateEmail(res);
		return serverError(res, 'creating', error);
	}
};

export const updateUser = async (req, res) => {
	try {
		if (!mongoose.isValidObjectId(req.params.id)) return invalidId(res);

		const { name, email, password, role, isActive } = req.body;

		const user = await User.findById(req.params.id);
		if (!user) return notFound(res);

		const isSelf = getSelfId(req) === String(user._id);
		const roleChanging = String(user.role) !== String(role);
		const deactivating = isActive === false && user.isActive !== false;

		if (isSelf && roleChanging) {
			return res.status(403).json({
				success: false,
				message: "You can't change your own role.",
			});
		}
		if (isSelf && deactivating) {
			return res.status(403).json({
				success: false,
				message: "You can't deactivate your own account.",
			});
		}

		if ((roleChanging || deactivating) && (await isLastSystemUser(user))) {
			return res.status(403).json({
				success: false,
				message:
					"This is the last user with the protected role. It can't be changed or deactivated.",
			});
		}

		if (roleChanging && !(await Role.exists({ _id: role }))) {
			return res
				.status(400)
				.json({ success: false, message: 'Selected role does not exist.' });
		}

		if (email !== user.email) {
			const taken = await User.findOne({ email, _id: { $ne: user._id } });
			if (taken) return duplicateEmail(res);
		}

		user.name = name;
		user.email = email;
		user.role = role;
		if (isActive !== undefined) user.isActive = isActive;
		// Blank password was turned into undefined by the schema = keep current.
		if (password) user.password = password;

		await user.save();

		const updated = await User.findById(user._id).populate(populateRole);
		return res.status(200).json({ success: true, data: updated });
	} catch (error) {
		if (error.code === 11000) return duplicateEmail(res);
		return serverError(res, 'updating', error);
	}
};

export const deleteUser = async (req, res) => {
	try {
		if (!mongoose.isValidObjectId(req.params.id)) return invalidId(res);

		const user = await User.findById(req.params.id);
		if (!user) return notFound(res);

		if (getSelfId(req) === String(user._id)) {
			return res.status(403).json({
				success: false,
				message: "You can't delete your own account.",
			});
		}

		if (await isLastSystemUser(user)) {
			return res.status(403).json({
				success: false,
				message: "This is the last user with the protected role. It can't be deleted.",
			});
		}

		await User.findByIdAndDelete(user._id);
		return res.status(200).json({ success: true, data: { _id: user._id } });
	} catch (error) {
		return serverError(res, 'deleting', error);
	}
};
