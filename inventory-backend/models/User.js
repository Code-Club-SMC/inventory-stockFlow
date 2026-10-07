import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
	{
		name: {
			type: String,
			required: [true, 'Name is required'],
			trim: true,
		},
		email: {
			type: String,
			required: true,
			unique: true,
			lowercase: true,
			trim: true,
		},
		// Never returned by queries unless asked for with .select('+password').
		password: {
			type: String,
			required: true,
			select: false,
		},
		// Pointer to the Role document. Permissions are read from the role.
		role: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Role',
			required: true,
		},
		// Disable an account without deleting it (keeps sales/invoice history).
		isActive: {
			type: Boolean,
			default: true,
		},
	},
	{ timestamps: true }
);

// Hash the password whenever it is set or changed, on every code path.
// Callers must pass the plain password and must NOT hash it themselves.
userSchema.pre('save', async function () {
	if (!this.isModified('password')) return;
	this.password = await bcrypt.hash(this.password, 10);
});

export default mongoose.model('User', userSchema);
