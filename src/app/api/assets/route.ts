import { NextRequest, NextResponse } from 'next/server';
import { getBackendUrl } from '@/lib/backend';

const allowedTypes = new Set([
    'application/pdf', 'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain', 'image/jpeg', 'image/png', 'image/webp'
]);

export async function POST(request: NextRequest) {
    const authorization = request.headers.get('authorization');
    if (!authorization) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    try {
        const form = await request.formData();
        const file = form.get('file');
        const entityId = String(form.get('entityId') || '');
        const fileId = String(form.get('fileId') || '');
        if (!(file instanceof File) || !/^[0-9a-f-]{36}$/i.test(entityId) ||
                !/^[a-zA-Z0-9_-]{1,100}$/.test(fileId) || !allowedTypes.has(file.type) ||
                file.size < 1 || file.size > 10 * 1024 * 1024) {
            return NextResponse.json({ error: 'Invalid file, entity, or file type' }, { status: 422 });
        }
        const data = Buffer.from(await file.arrayBuffer()).toString('base64');
        const response = await fetch(`${getBackendUrl()}/api/assets`, {
            method: 'POST',
            headers: { Authorization: authorization, 'X-Entity-Id': entityId, 'Content-Type': 'application/json' },
            body: JSON.stringify({ entityId, fileId, fileName: file.name, mimeType: file.type, data }),
            cache: 'no-store'
        });
        return NextResponse.json(await response.json(), { status: response.status });
    } catch (error) {
        console.error('Asset upload failed:', error instanceof Error ? error.message : 'Unknown error');
        return NextResponse.json({ error: 'Failed to upload asset' }, { status: 500 });
    }
}
