import { prisma } from '../../config/prisma.js';
import { logger } from '../../config/logger.js';

const CATEGORIES = [
  { slug: 'tech', name: 'Tecnologia' },
  { slug: 'gaming', name: 'Games' },
  { slug: 'business', name: 'Negócios' },
  { slug: 'finance', name: 'Finanças' },
  { slug: 'health', name: 'Saúde' },
  { slug: 'fitness', name: 'Fitness' },
  { slug: 'education', name: 'Educação' },
  { slug: 'entertainment', name: 'Entretenimento' },
  { slug: 'music', name: 'Música' },
  { slug: 'sports', name: 'Esportes' },
  { slug: 'travel', name: 'Viagem' },
  { slug: 'food', name: 'Gastronomia' },
  { slug: 'lifestyle', name: 'Estilo de Vida' },
  { slug: 'beauty', name: 'Beleza' },
  { slug: 'fashion', name: 'Moda' },
  { slug: 'politics', name: 'Política' },
  { slug: 'science', name: 'Ciência' },
  { slug: 'crypto', name: 'Cripto' },
  { slug: 'ai', name: 'Inteligência Artificial' },
  { slug: 'news', name: 'Notícias' },
];

export async function seedCategories() {
  for (const c of CATEGORIES) {
    await prisma.category.upsert({
      where: { slug: c.slug },
      create: c,
      update: { name: c.name },
    });
  }
  logger.info({ count: CATEGORIES.length }, 'Categories seeded');
}
