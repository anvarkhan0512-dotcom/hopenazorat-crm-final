import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { getAuthUser, requireParentOnly, requireStudent } from '@/lib/auth-server';
import { HomeworkSubmission } from '@/models/HomeworkSubmission';

export async function PATCH(request: NextRequest) {
  try {
    const auth = await getAuthUser(request);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { homeworkId, studentId, status, submissionImageUrl } = body as {
      homeworkId?: string;
      studentId?: string;
      status?: string;
      submissionImageUrl?: string;
    };

    if (!homeworkId || !studentId || !['submitted', 'not_submitted'].includes(status || '')) {
      return NextResponse.json(
        { error: 'homeworkId, studentId, status (submitted|not_submitted)' },
        { status: 400 }
      );
    }

    if (auth.role === 'student') {
      const denied = requireStudent(auth);
      if (denied) return NextResponse.json({ error: denied.error }, { status: denied.status });
      const sid = auth.linkedStudentIds[0].toString();
      if (studentId !== sid) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    } else {
      const denied = requireParentOnly(auth);
      if (denied) return NextResponse.json({ error: denied.error }, { status: denied.status });
      const allowed = auth!.linkedStudentIds.some((id) => id.toString() === studentId);
      if (!allowed) {
        return NextResponse.json({ error: 'Bu talaba sizga biriktirilmagan' }, { status: 403 });
      }
    }

    await connectDB();

    const setDoc: Record<string, unknown> = { status };
    if (auth.role === 'student') {
      if (status === 'submitted' && typeof submissionImageUrl === 'string' && submissionImageUrl.trim()) {
        setDoc.submissionImageUrl = submissionImageUrl.trim();
      }
      if (status === 'not_submitted') {
        setDoc.submissionImageUrl = '';
      }
    }

    const sub = await HomeworkSubmission.findOneAndUpdate(
      { homeworkId, studentId },
      { $set: setDoc },
      { upsert: true, new: true }
    ).lean();

    return NextResponse.json(sub);
  } catch (error: unknown) {
    console.error(error);
    const msg = error instanceof Error ? error.message : 'Server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
