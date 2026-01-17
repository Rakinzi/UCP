import { json, type RequestHandler } from '@sveltejs/kit';
import { getDataSource, ProductSchema } from '$lib/db';

export const GET: RequestHandler = async ({ params }) => {
  try {
    const db = await getDataSource();
    const repo = db.getRepository(ProductSchema);
    const product = await repo.findOne({
      where: { id: params.id },
      relations: ['category'],
    });

    if (!product) {
      return json({ error: 'Product not found' }, { status: 404 });
    }

    return json(product);
  } catch (error) {
    console.error(error);
    return json({ error: 'Failed to fetch product' }, { status: 500 });
  }
};
