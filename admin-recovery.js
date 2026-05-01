const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const fs = require('fs');

dotenv.config();
dotenv.config({ path: '.env.local' });

function logToFile(msg) {
  fs.appendFileSync('recovery-log.txt', msg + '\n');
}

// User modeli (oddiy schema bilan)
const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'manager', 'teacher', 'parent', 'student'], default: 'student' },
  displayName: String,
  revealablePassword: String,
}, { timestamps: true });

const User = mongoose.models.User || mongoose.model('User', UserSchema);

async function recovery() {
  logToFile('JS Script started at ' + new Date().toISOString());
  const uri = 'mongodb+srv://umarxonu53_db_user:HopeStudy2026@cluster0.0evfh1f.mongodb.net/crm?retryWrites=true&w=majority';
  if (!uri) {
    logToFile('Error: MONGODB_URI is not defined');
    process.exit(1);
  }
  logToFile('URI found: ' + uri.substring(0, 20) + '...');

  try {
    await mongoose.connect(uri);
    logToFile('Connected to MongoDB...');

    const username = 'Munisa';
    const plainPassword = '8751';
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    const updateData = {
      username,
      password: hashedPassword,
      role: 'admin',
      displayName: 'Munisa',
      revealablePassword: plainPassword,
    };

    const user = await User.findOneAndUpdate(
      { username },
      { $set: updateData },
      { upsert: true, new: true }
    );

    logToFile('Munisa uchun yangi parol o\'rnatildi');
    console.log('Munisa uchun yangi parol o\'rnatildi');
    
    await mongoose.disconnect();
    logToFile('Disconnected from MongoDB.');
  } catch (error) {
    logToFile('Error during recovery: ' + error.message);
    process.exit(1);
  }
}

recovery();
