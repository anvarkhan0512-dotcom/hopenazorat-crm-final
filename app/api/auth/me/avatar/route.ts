import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';
import { getAuthUser } from '@/lib/auth-server';
import connectDB from '@/lib/db';
import { User } from '@/models/User';

export const dynamic = 'force-dynamic';

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp']);

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthUser(request);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const form = await request.formData();
    const file = form.get('file');
    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ error: 'file kerak' }, { status: 400 });
    }
    if (!ALLOWED.has(file.type)) {
      return NextResponse.json({ error: 'Faqat JPEG, PNG yoki WebP' }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: 'Fayl 5MB dan kichik bo‘lishi kerak' }, { status: 400 });
    }

    const buf = Buffer.from(await file.arrayBuffer());
    const ext =
      file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
    const name = `${crypto.randomUUID()}.${ext}`;
    const dir = path.join(process.cwd(), 'public', 'uploads', 'avatars');
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, name), buf);

    const url = `/uploads/avatars/${name}`;
    await connectDB();
    await User.updateOne({ _id: auth._id }, { $set: { avatarUrl: url } });

    return NextResponse.json({ url });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Yuklashda xato' }, { status: 500 });
  }
}
