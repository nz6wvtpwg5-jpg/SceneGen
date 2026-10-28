import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { disconnectCalendar } from '@/lib/calendar-connection';
export async function POST() { const session = await auth(); if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); await disconnectCalendar(session.user.id); return NextResponse.json({ disconnected: true }); }
