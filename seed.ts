/**
 * Initial DB bootstrap only (credentials must not appear in UI).
 * Run: npm run seed
 */
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { User } from './models/User';

const MONGODB_URI = process.env.MONGODB_URI;

const ADMIN_USERNAME = '+998955558751';
const ADMIN_PASSWORD = 'Komila8751';

async function main() {
  if (!MONGODB_URI) {
    throw new Error('MONGODB_URI environment variable is not set');
  }

  await mongoose.connect(MONGODB_URI);
  console.log('MongoDB ga ulandi.');

  const hash = await bcrypt.hash(ADMIN_PASSWORD, 10);
  const existing = await User.findOne({ username: ADMIN_USERNAME });

  if (existing) {
    existing.password = hash;
    existing.role = 'admin';
    if (!existing.displayName) existing.displayName = 'HOPE STUDY';
    await existing.save();
    console.log("Seed: admin akkaunt yangilandi.");
  } else {
    await User.create({
      username: ADMIN_USERNAME,
      password: hash,
      role: 'admin',
      displayName: 'HOPE STUDY',
      linkedStudentIds: [],
    });
    console.log("Seed: boshlang'ich admin akkaunt yaratildi.");
  }

  await mongoose.disconnect();
  console.log('MongoDB dan uzildi.');
  process.exit(0);
}

main().catch((e) => {
  console.error('Seed xatoligi:', e);
  process.exit(1);
});