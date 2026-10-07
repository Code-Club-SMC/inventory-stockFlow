import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

// Same shape for login and /auth/me.
const toClientUser = (user) => ({
	id: user._id,
	email: user.email,
	name: user.name,
	role: {
		id: user.role?._id,
		name: user.role?.name,
		isSystemRole: Boolean(user.role?.isSystemRole),
		permissions: user.role?.permissions ?? [],
	},
});

export const login = async (req, res) => {
	try {
		const { email, password } = req.body;
		if (!email || !password) {
			return res.status(400).json({ success: false, message: 'Email and password are required' });
		}

		// password has select:false, so it must be asked for explicitly.
		const user = await User.findOne({ email: email.trim().toLowerCase() })
			.select('+password')
			.populate('role');

		const validPassword = user && (await bcrypt.compare(password, user.password));

		if (!validPassword) {
			return res.status(401).json({ success: false, message: 'Invalid email or password' });
		}

		// Checked after the password so we don't reveal which emails exist.
		if (user.isActive === false) {
			return res.status(403).json({ success: false, message: 'Your account has been disabled' });
		}

		// Token holds only the id. Permissions are read fresh from the role.
		const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
			expiresIn: '7d',
		});

		const clientUser = toClientUser(user);

		// `token` / `user` stay at the top level for existing code. `data` is what
		// the axios interceptor returns (it unwraps response.data.data).
		return res.status(200).json({
			success: true,
			message: 'Login successful',
			token,
			user: clientUser,
			data: { success: true, message: 'Login successful', token, user: clientUser },
		});
	} catch (error) {
		console.error('Login error:', error);
		return res.status(500).json({ success: false, message: 'Something went wrong. Please try again.' });
	}
};

// GET /auth/me (after requireAuth): the logged-in user and their role's permissions.
export const me = async (req, res) => {
	return res.status(200).json({ success: true, data: toClientUser(req.user) });
};

// Bootstrap only: creates the first admin using the secret header.
// Normal user creation goes through POST /users.
export const register = async (req, res) => {
	try {
		const secretKey = req.headers.xsecretkey;

		if (!secretKey || secretKey !== process.env.XSECRETKEY) {
			return res.status(401).json({ success: false, message: 'Invalid secret key' });
		}

		const { name, email, password, role } = req.body;

		if (!name || !email || !password || !role) {
			return res.status(400).json({
				success: false,
				message: 'Name, email, password, and role are required',
			});
		}

		const existingUser = await User.findOne({ email: email.trim().toLowerCase() });
		if (existingUser) {
			return res.status(409).json({ success: false, message: 'Email already registered' });
		}

		// Plain password: the model hashes it. Do not hash here (double hash).
		const user = await User.create({ name, email, password, role });

		return res.status(201).json({
			success: true,
			message: 'Registration successful',
			user: {
				id: user._id,
				name: user.name,
				email: user.email,
				role: user.role,
			},
		});
	} catch (error) {
		console.error('Register error:', error);
		return res.status(500).json({ success: false, message: 'Something went wrong. Please try again.' });
	}
};
