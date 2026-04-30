import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';
import { getAuthUser, requireTeacher } from '@/lib/auth-server';

export const dynamic = 'force-dynamic';

const MAX_BYTES = 15 * 1024 * 1024;
const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']);

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthUser(request);
    const denied = requireTeacher(auth);
    if (denied) return NextResponse.json({ error: denied.error }, { status: denied.status });

    const form = await request.formData();
    const file = form.get('file');
    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ error: 'file kerak' }, { status: 400 });
    }
    if (!ALLOWED.has(file.type)) {
      return NextResponse.json({ error: 'JPEG, PNG, WebP yoki PDF' }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: 'Fayl 15MB dan kichik bo‘lishi kerak' }, { status: 400 });
    }

    const buf = Buffer.from(await file.arrayBuffer());
    const ext =
      file.type === 'image/png'
        ? 'png'
        : file.type === 'image/webp'
          ? 'webp'
          : file.type === 'application/pdf'
            ? 'pdf'
            : 'jpg';
    const name = `${crypto.randomUUID()}.${ext}`;
    const dir = path.join(process.cwd(), 'public', 'uploads', 'homework-files');
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, name), buf);

    const url = `/uploads/homework-files/${name}`;
    return NextResponse.json({ url });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Yuklashda xato' }, { status: 500 });
  }
}
