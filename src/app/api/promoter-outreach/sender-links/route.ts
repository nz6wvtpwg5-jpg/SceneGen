import type {NextRequest} from 'next/server';
import {daySheetProxy} from '@/lib/daySheetProxy';
export function GET(request:NextRequest){return daySheetProxy(request,'/promoter-outreach/sender-links');}
