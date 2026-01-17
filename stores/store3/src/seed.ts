import { randomUUID } from 'node:crypto';
import { getDataSource, CategorySchema, ProductSchema } from './lib/db';

async function main() {
  const db = await getDataSource();
  const categoryRepo = db.getRepository(CategorySchema);
  const productRepo = db.getRepository(ProductSchema);

  const apparel =
    (await categoryRepo.findOne({ where: { name: 'Apparel' } })) ??
    (await categoryRepo.save({
      id: randomUUID(),
      name: 'Apparel',
      description: 'Everyday wear and basics',
    }));

  const fitness =
    (await categoryRepo.findOne({ where: { name: 'Fitness' } })) ??
    (await categoryRepo.save({
      id: randomUUID(),
      name: 'Fitness',
      description: 'Gym and fitness gear',
    }));

  await productRepo.save([
    {
      id: 'store3-hoodie',
      name: 'Core Hoodie',
      description: 'Soft fleece hoodie',
      price: 64.0,
      stock: 30,
      categoryId: apparel.id,
    },
    {
      id: 'store3-dumbbells',
      name: 'IronGrip 20lb',
      description: 'Pair of 20lb dumbbells',
      price: 79.0,
      stock: 12,
      categoryId: fitness.id,
    },
  ]);

  console.log('Seeded store3 database');
  await db.destroy();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
