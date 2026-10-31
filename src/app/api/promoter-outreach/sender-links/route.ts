import type {NextRequest} from 'next/server';
import {daySheetProxy} from '@/lib/daySheetProxy';
export function GET(request:NextRequest){return daySheetProxy(request,'/promoter-outreach/sender-links');}
export async function PUT(request:NextRequest){return daySheetProxy(request,'/promoter-outreach/sender-links',{method:'PUT',body:await request.text()});}
