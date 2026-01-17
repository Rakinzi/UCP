import { randomUUID } from 'node:crypto';
import { getDataSource, CategorySchema, ProductSchema } from './lib/db';

async function main() {
  const db = await getDataSource();
  const categoryRepo = db.getRepository(CategorySchema);
  const productRepo = db.getRepository(ProductSchema);

  const home =
    (await categoryRepo.findOne({ where: { name: 'Home' } })) ??
    (await categoryRepo.save({
      id: randomUUID(),
      name: 'Home',
      description: 'Smart home essentials',
    }));

  const kitchen =
    (await categoryRepo.findOne({ where: { name: 'Kitchen' } })) ??
    (await categoryRepo.save({
      id: randomUUID(),
      name: 'Kitchen',
      description: 'Kitchen gear and tools',
    }));

  await productRepo.save([
    {
      id: 'store2-speaker',
      name: 'Halo Speaker',
      description: 'Voice-controlled smart speaker',
      price: 129.0,
      stock: 40,
      categoryId: home.id,
    },
    {
      id: 'store2-blender',
      name: 'BlendPro 900',
      description: 'High-speed countertop blender',
      price: 149.99,
      stock: 18,
      categoryId: kitchen.id,
    },
  ]);

  console.log('Seeded store2 database');
  await db.destroy();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
