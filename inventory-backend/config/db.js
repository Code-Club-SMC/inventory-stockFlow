import mongoose from 'mongoose';

const connectDB = async () => {
	try {

		await mongoose.connect(process.env.MONGO_URI);
		// await mongoose.connection.db.collection("wallets").deleteMany({});
		// await mongoose.connection.db.collection("walletentries").deleteMany({});
		// await mongoose.connection.db.collection("invoices").deleteMany({});
		// await mongoose.connection.db.collection("transactions").deleteMany({});
		// await mongoose.connection.db.collection("counters").deleteMany({});
		console.log('MongoDB connected');
	} catch (error) {
		console.error('MongoDB connection failed:', error.message);
		process.exit(1);
	}
};

export default connectDB;

