import { json, type RequestHandler } from '@sveltejs/kit';
import nacl from 'tweetnacl';
import { getDataSource, ChallengeSchema } from '$lib/db';
import { env } from '$env/dynamic/private';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const mandate = request.headers.get('X-UCP-Mandate');
    if (!mandate) {
      return json({ error: 'Missing X-UCP-Mandate header' }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const challenge = body.challenge;
    const orderTotal = body.order_total ?? body.orderTotal;

    if (!challenge || typeof orderTotal !== 'number') {
      return json({ error: 'Invalid request body' }, { status: 400 });
    }

    // Find the challenge in DB
    const db = await getDataSource();
    const repo = db.getRepository(ChallengeSchema);
    const storedChallenge = await repo.findOne({ where: { challenge } });

    if (!storedChallenge) {
      return json({ error: 'Invalid challenge' }, { status: 400 });
    }

    if (storedChallenge.expiresAt < new Date()) {
      return json({ error: 'Challenge expired' }, { status: 400 });
    }

    if (storedChallenge.orderTotal !== null && storedChallenge.orderTotal !== undefined) {
      if (Number(storedChallenge.orderTotal) !== Number(orderTotal)) {
        return json({ error: 'Order total mismatch' }, { status: 400 });
      }
    }

    // Verify signature
    const publicKeyHex = env.AGENT_PUBLIC_KEY;
    if (!publicKeyHex) {
      return json({ error: 'Missing AGENT_PUBLIC_KEY' }, { status: 500 });
    }

    const message = Buffer.concat([
      Buffer.from(challenge, 'base64'),
      Buffer.from(orderTotal.toString()),
    ]);
    const signature = Buffer.from(mandate, 'base64');
    const publicKey = Buffer.from(publicKeyHex, 'hex');

    const isValid = nacl.sign.detached.verify(
      new Uint8Array(message),
      new Uint8Array(signature),
      new Uint8Array(publicKey),
    );

    if (!isValid) {
      return json({ error: 'Invalid signature' }, { status: 400 });
    }

    // Delete the challenge
    await repo.delete({ challenge });

    // Here, create the order or something, but for now, just confirm
    return json({ message: 'Payment confirmed' }, { status: 201 });
  } catch (error) {
    console.error(error);
    return json({ error: 'Failed to complete payment' }, { status: 500 });
  }
};
