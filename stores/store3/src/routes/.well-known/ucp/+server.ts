import { json, type RequestHandler } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

export const GET: RequestHandler = async () => {
  return json({
    name: env.STORE_NAME ?? 'Store-Alpha',
    capabilities: ['dev.ucp.shopping.ap2'],
    endpoints: {
      products: '/api/products',
      sessions: '/sessions',
      complete: '/complete',
    },
  });
};
