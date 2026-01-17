import { json, type RequestHandler } from '@sveltejs/kit';
import { getDataSource, ProductSchema } from '$lib/db';

export const GET: RequestHandler = async ({ url }) => {
  try {
    const q = url.searchParams.get('q')?.trim();
    const db = await getDataSource();
    const repo = db.getRepository(ProductSchema);

    const qb = repo.createQueryBuilder('product').leftJoinAndSelect('product.category', 'category');
    if (q) {
      qb.where('product.name ILIKE :q OR product.description ILIKE :q', { q: `%${q}%` });
    }
    const products = await qb.getMany();
    return json(products);
  } catch (error) {
    console.error(error);
    return json({ error: 'Failed to fetch products' }, { status: 500 });
  }
};
