import type { APIEvent } from '@solidjs/start/server';
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { requireAuth } from '~/lib/middleware';
import { IMAGE_TYPES, MAX_IMAGE_SIZE, isAllowedImagePath } from '~/lib/image-upload';

export async function POST(event: APIEvent) {
  let body: HandleUploadBody;
  try {
    body = await event.request.json();
    if (!body || body.type !== 'blob.generate-client-token' || typeof body.payload?.pathname !== 'string') {
      return Response.json({ error: 'Invalid upload request.' }, { status: 400 });
    }
  } catch {
    return Response.json({ error: 'Invalid upload request.' }, { status: 400 });
  }

  let user;
  try {
    user = await requireAuth(event);
  } catch {
    return Response.json({ error: 'Sign in to upload recipe images.' }, { status: 401 });
  }
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return Response.json({ error: 'Image uploads are not configured. Set BLOB_READ_WRITE_TOKEN on the server.' }, { status: 503 });
  }

  try {
    const result = await handleUpload({
      body,
      request: event.request,
      onBeforeGenerateToken: async (pathname) => {
        // The session above authorizes this upload; the signed token restricts
        // writes to this user's folder, image content types, and size limit.
        if (!isAllowedImagePath(pathname, user.id)) {
          throw new Error('Invalid image upload path.');
        }
        return {
          allowedContentTypes: Object.keys(IMAGE_TYPES),
          maximumSizeInBytes: MAX_IMAGE_SIZE,
          addRandomSuffix: true,
          allowOverwrite: false,
          validUntil: Date.now() + 10 * 60 * 1000,
        };
      },
      // No completion webhook: the URL is attached when the recipe is saved.
    });
    return Response.json(result, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return Response.json({
      error: 'Unable to authorize this image upload. Please try again.',
    }, { status: 400 });
  }
}
