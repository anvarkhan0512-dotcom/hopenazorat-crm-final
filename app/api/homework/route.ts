import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { getAuthUser, requireTeacher } from '@/lib/auth-server';
import { Homework } from '@/models/Homework';
import { HomeworkSubmission } from '@/models/HomeworkSubmission';
import { Group } from '@/models/Group';

async function seedSubmissions(homeworkId: unknown, groupId: unknown) {
  const group = await Group.findById(groupId).select('studentIds').lean();
  if (!group?.studentIds?.length) return;
  for (const sid of group.studentIds) {
    await HomeworkSubmission.updateOne(
      { homeworkId, studentId: sid },
      { $setOnInsert: { status: 'not_submitted' } },
      { upsert: true }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthUser(request);
    const denied = requireTeacher(auth);
    if (denied) return NextResponse.json({ error: denied.error }, { status: denied.status });

    await connectDB();
    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get('groupId');

    const q: Record<string, unknown> = {};
    if (auth!.role === 'teacher') {
      const groupDocs = await Group.find({ teacherUserId: auth!._id }).select('_id').lean();
      const gids = groupDocs.map((g) => g._id);
      if (groupId) {
        if (!gids.some((g) => g.toString() === groupId)) {
          return NextResponse.json([]);
        }
        q.groupId = groupId;
      } else {
        q.groupId = { $in: gids };
      }
    } else if (groupId) {
      q.groupId = groupId;
    }

    const list = await Homework.find(q).sort({ createdAt: -1 }).limit(100).lean();
    return NextResponse.json(list);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthUser(request);
    const denied = requireTeacher(auth);
    if (denied) return NextResponse.json({ error: denied.error }, { status: denied.status });

    const body = await request.json();
    const { groupId, title, description, imageUrl, dueDate } = body;
    if (!groupId || !title) {
      return NextResponse.json({ error: 'groupId va title majburiy' }, { status: 400 });
    }

    await connectDB();

    const group = await Group.findById(groupId);
    if (!group) return NextResponse.json({ error: 'Guruh topilmadi' }, { status: 404 });

    if (auth!.role === 'teacher' && group.teacherUserId?.toString() !== auth!.id) {
      return NextResponse.json({ error: 'Bu guruh sizga biriktirilmagan' }, { status: 403 });
    }

    const hw = await Homework.create({
      groupId,
      title,
      description: description || '',
      imageUrl: imageUrl || '',
      dueDate: dueDate ? new Date(dueDate) : undefined,
      createdBy: auth!._id,
    });

    await seedSubmissions(hw._id, groupId);

    return NextResponse.json(hw.toObject(), { status: 201 });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
