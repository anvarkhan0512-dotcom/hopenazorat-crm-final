import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { User } from './models/User';

dotenv.config(); // Bu .env faylini o'qiydi
// Agar .env.local mavjud bo'lsa uni ham sinab ko'ramiz
dotenv.config({ path: '.env.local' });

import fs from 'fs';

function logToFile(msg: string) {
  fs.appendFileSync('recovery-log.txt', msg + '\n');
}

async function recovery() {
  logToFile('Script started at ' + new Date().toISOString());
  const uri = process.env.MONGODB_URI;
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
  } catch (error: any) {
    logToFile('Error during recovery: ' + error.message);
    process.exit(1);
  }
}

recovery();
