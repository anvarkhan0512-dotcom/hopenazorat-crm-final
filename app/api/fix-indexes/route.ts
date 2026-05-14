import { NextResponse } from 'next/server'; 
import connectDB from '@/lib/db'; 
import mongoose from 'mongoose'; 
export const dynamic = 'force-dynamic'; 

export async function GET() { 
  try { 
    await connectDB(); 
    const db = mongoose.connection.db!; 
    const results: string[] = []; 

    const collections = [ 
      { name: 'users', index: 'username_1' }, 
      { name: 'groups', index: 'name_1' }, 
      { name: 'branches', index: 'name_1' }, 
    ]; 

    for (const col of collections) { 
      try { 
        await db.collection(col.name).dropIndex(col.index); 
        results.push(`✅ ${col.name}: ${col.index} dropped`); 
      } catch(e: any) { 
        results.push(`ℹ️ ${col.name}: ${e.message}`); 
      } 
    } 

    // Create correct compound indexes 
    try { 
      await db.collection('users').createIndex( 
        { centerId: 1, username: 1 }, 
        { unique: true, sparse: true } 
      ); 
      results.push('✅ users: compound index OK'); 
    } catch(e: any) { 
      results.push(`ℹ️ users compound: ${e.message}`); 
    } 

    try { 
      await db.collection('groups').createIndex( 
        { centerId: 1, name: 1 }, 
        { unique: true, sparse: true } 
      ); 
      results.push('✅ groups: compound index OK'); 
    } catch(e: any) { 
      results.push(`ℹ️ groups compound: ${e.message}`); 
    } 

    return NextResponse.json({ success: true, results }); 
  } catch(error: any) { 
    return NextResponse.json( 
      { error: error.message }, 
      { status: 500 } 
    ); 
  } 
} 
