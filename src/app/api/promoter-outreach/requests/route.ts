import type { NextRequest } from 'next/server';
import { daySheetProxy } from '@/lib/daySheetProxy';
export async function POST(request:NextRequest){return daySheetProxy(request,'/promoter-outreach/requests',{method:'POST',body:await request.text()});}
