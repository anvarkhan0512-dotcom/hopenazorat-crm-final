import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    const uploadDir = join(process.cwd(), 'public', 'uploads');
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    const uploadedFiles = [];

    for (const file of files) {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      
      const uniqueName = `${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
      const filePath = join(uploadDir, uniqueName);
      
      await writeFile(filePath, buffer);
      
      uploadedFiles.push({
        name: file.name,
        url: `/uploads/${uniqueName}`,
        type: file.type,
        size: file.size
      });
    }

    return NextResponse.json({ files: uploadedFiles });
  } catch (error) {
    console.error('Upload API error:', error);
    return NextResponse.json({ error: 'File upload failed' }, { status: 500 });
  }
}
