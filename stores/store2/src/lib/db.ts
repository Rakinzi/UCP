import { DataSource, EntitySchema } from 'typeorm';

export type Category = {
  id: string;
  name: string;
  description?: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type Product = {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  imageUrl?: string | null;
  stock: number;
  categoryId: string;
  createdAt: Date;
  updatedAt: Date;
};

export type Challenge = {
  id: string;
  challenge: string;
  orderTotal?: number | null;
  expiresAt: Date;
  createdAt: Date;
};

export const CategorySchema = new EntitySchema<Category>({
  name: 'Category',
  tableName: 'categories',
  columns: {
    id: { type: String, primary: true },
    name: { type: String, unique: true },
    description: { type: String, nullable: true },
    createdAt: { type: Date, createDate: true },
    updatedAt: { type: Date, updateDate: true },
  },
});

export const ProductSchema = new EntitySchema<Product>({
  name: 'Product',
  tableName: 'products',
  columns: {
    id: { type: String, primary: true },
    name: { type: String },
    description: { type: String, nullable: true },
    price: { type: Number },
    imageUrl: { type: String, nullable: true },
    stock: { type: Number, default: 0 },
    categoryId: { type: String },
    createdAt: { type: Date, createDate: true },
    updatedAt: { type: Date, updateDate: true },
  },
  relations: {
    category: {
      type: 'many-to-one',
      target: 'Category',
      joinColumn: { name: 'categoryId' },
    },
  },
});

export const ChallengeSchema = new EntitySchema<Challenge>({
  name: 'Challenge',
  tableName: 'challenges',
  columns: {
    id: { type: String, primary: true },
    challenge: { type: String, unique: true },
    orderTotal: { type: Number, nullable: true },
    expiresAt: { type: Date },
    createdAt: { type: Date, createDate: true },
  },
});

let dataSource: DataSource | null = null;

export async function getDataSource() {
  if (dataSource?.isInitialized) return dataSource;

  const envUrl = process.env.DATABASE_URL;
  const url =
    envUrl && envUrl.trim().length > 0
      ? envUrl
      : 'postgres://postgres:postgres@host.docker.internal:5432/ucp';

  dataSource = new DataSource({
    type: 'postgres',
    url,
    entities: [CategorySchema, ProductSchema, ChallengeSchema],
    synchronize: true,
  });

  await dataSource.initialize();
  return dataSource;
}
