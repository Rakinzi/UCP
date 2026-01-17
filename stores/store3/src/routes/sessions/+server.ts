import { json, type RequestHandler } from '@sveltejs/kit';
import { randomBytes, randomUUID } from 'node:crypto';
import { getDataSource, ChallengeSchema } from '$lib/db';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json().catch(() => ({}));
    const orderTotal = body.order_total ?? body.orderTotal ?? null;

    // Generate random 32-byte challenge and base64 encode for header safety
    const challenge = randomBytes(32).toString('base64');

    // Store in DB with expiration in 5 minutes
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    const db = await getDataSource();
    const repo = db.getRepository(ChallengeSchema);
    await repo.save({
      id: randomUUID(),
      challenge,
      orderTotal,
      expiresAt,
    });

    // Return 402 Payment Required with challenge header
    return new Response('Payment Required', {
      status: 402,
      headers: {
        'X-UCP-Challenge': challenge,
      },
    });
  } catch (error) {
    console.error(error);
    return json({ error: 'Failed to create session' }, { status: 500 });
  }
};
