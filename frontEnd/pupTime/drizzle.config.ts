import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/DB/schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
  driver: 'expo', // Generates the compatible 'migrations.js' file
});