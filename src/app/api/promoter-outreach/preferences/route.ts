import type { NextRequest } from 'next/server';
import { daySheetProxy } from '@/lib/daySheetProxy';
export function GET(request:NextRequest){return daySheetProxy(request,'/promoter-outreach/preferences');}
export async function PUT(request:NextRequest){return daySheetProxy(request,'/promoter-outreach/preferences',{method:'PUT',body:await request.text()});}
