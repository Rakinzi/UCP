import { randomUUID } from 'node:crypto';
import { getDataSource, CategorySchema, ProductSchema } from './lib/db';

async function main() {
  const db = await getDataSource();
  const categoryRepo = db.getRepository(CategorySchema);
  const productRepo = db.getRepository(ProductSchema);

  const electronics =
    (await categoryRepo.findOne({ where: { name: 'Electronics' } })) ??
    (await categoryRepo.save({
      id: randomUUID(),
      name: 'Electronics',
      description: 'Electronic devices and gadgets',
    }));

  const accessories =
    (await categoryRepo.findOne({ where: { name: 'Accessories' } })) ??
    (await categoryRepo.save({
      id: randomUUID(),
      name: 'Accessories',
      description: 'Everyday tech accessories',
    }));

  await productRepo.save([
    {
      id: 'store1-laptop',
      name: 'NovaBook 14',
      description: 'Portable 14-inch laptop',
      price: 999.99,
      stock: 10,
      categoryId: electronics.id,
    },
    {
      id: 'store1-headphones',
      name: 'Pulse Headphones',
      description: 'Noise-cancelling over-ear headphones',
      price: 199.5,
      stock: 25,
      categoryId: accessories.id,
    },
  ]);

  console.log('Seeded store1 database');
  await db.destroy();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
