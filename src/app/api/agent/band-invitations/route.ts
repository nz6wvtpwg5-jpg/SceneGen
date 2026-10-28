import { NextRequest, NextResponse } from 'next/server';
import { daySheetProxy } from '@/lib/daySheetProxy';
import { sendAuthEmail } from '@/lib/auth-email';
import { publicAppUrl } from '@/lib/public-app-url';

export async function GET(request: NextRequest) {
  return daySheetProxy(request, '/booking-agent/band-invitations');
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const response = await daySheetProxy(request, '/booking-agent/band-invitations', {
    method: 'POST', body: JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok || !data.token) return NextResponse.json(data, { status: response.status });
  const invitationUrl = `${publicAppUrl(request.nextUrl.origin)}/agent-band-invite/${encodeURIComponent(data.token)}`;
  let emailDelivered = false;
  try {
    await sendAuthEmail({
      to: data.invitation.recipientEmail,
      subject: `${data.agentName} invited ${data.invitation.bandName} to SceneGen`,
      eyebrow: 'Band workspace invitation',
      action: 'Review the band profile',
      introduction: `${data.agentName} created a provisional SceneGen profile for ${data.invitation.bandName}. Accept it to become the workspace owner and connect the booking agent.`,
      actionUrl: invitationUrl,
    });
    emailDelivered = true;
  } catch (error) {
    console.error('Band ownership invitation email failed:', error instanceof Error ? error.message : 'Unknown error');
  }
  return NextResponse.json({ invitation: data.invitation, invitationUrl, emailDelivered }, { status: 201 });
}
