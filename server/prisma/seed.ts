import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // --- Admin user ---
  const adminPassword = await bcrypt.hash('Admin@2024!', 12);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@financaapp.com' },
    update: {},
    create: {
      email: 'admin@financaapp.com',
      fullName: 'Administrator User',
      password: adminPassword,
      role: 'ADMIN',
    },
  });

  console.log(`Created admin user: ${admin.email}`);

  // --- UserSettings ---
  await prisma.userSettings.upsert({
    where: { userId: admin.id },
    update: {},
    create: { userId: admin.id },
  });
  console.log('Created user settings');

  // --- Default categories (for each user) ---
  const defaultCategories: Array<{ name: string; type: 'EXPENSE' | 'INCOME' | 'BOTH' }> = [
    // Expense categories
    { name: 'Moradia', type: 'EXPENSE' },
    { name: 'Alimentação', type: 'EXPENSE' },
    { name: 'Transporte', type: 'EXPENSE' },
    { name: 'Saúde', type: 'EXPENSE' },
    { name: 'Educação', type: 'EXPENSE' },
    { name: 'Entretenimento', type: 'EXPENSE' },
    { name: 'Vestuário', type: 'EXPENSE' },
    { name: 'Serviços', type: 'EXPENSE' },
    { name: 'Pessoal', type: 'EXPENSE' },
    { name: 'Assinaturas', type: 'EXPENSE' },
    { name: 'Imposto', type: 'EXPENSE' },
    { name: 'Viagem', type: 'EXPENSE' },
    { name: 'Restaurante', type: 'EXPENSE' },
    { name: 'Seguro', type: 'EXPENSE' },
    { name: 'Psicólogo(a)', type: 'EXPENSE' },
    { name: 'Outros', type: 'BOTH' },
    // Income categories
    { name: 'Salário', type: 'INCOME' },
    { name: 'Freelance', type: 'INCOME' },
    { name: 'Contrato', type: 'INCOME' },
    { name: 'Rendimentos', type: 'INCOME' },
    { name: 'Aluguel', type: 'INCOME' },
    { name: 'Outros (Receita)', type: 'INCOME' },
  ];

  // Apply default categories to ALL existing users
  const allUsers = await prisma.user.findMany({ select: { id: true } });
  for (const user of allUsers) {
    for (const cat of defaultCategories) {
      await prisma.category.upsert({
        where: { userId_name: { userId: user.id, name: cat.name } },
        update: { type: cat.type, emoji: '' },
        create: {
          userId: user.id,
          name: cat.name,
          emoji: '',
          isDefault: true,
          type: cat.type,
        },
      });
    }
  }

  console.log(`Created default categories for ${allUsers.length} user(s)`);

  // --- Normalize English category names → Portuguese ---
  const ENGLISH_TO_PORTUGUESE: Record<string, string> = {
    'Housing': 'Moradia', 'Food': 'Alimentação', 'Transport': 'Transporte',
    'Health': 'Saúde', 'Education': 'Educação', 'Entertainment': 'Entretenimento',
    'Clothing': 'Vestuário', 'Services': 'Serviços', 'Personal': 'Pessoal',
    'Subscriptions': 'Assinaturas', 'Tax': 'Imposto', 'Travel': 'Viagem',
    'Restaurant': 'Restaurante', 'Insurance': 'Seguro', 'Psychologist': 'Psicólogo(a)',
    'Other': 'Outros', 'Salary': 'Salário', 'Contract': 'Contrato',
    'Returns': 'Rendimentos', 'Rent': 'Aluguel', 'Other (Income)': 'Outros (Receita)',
  };

  const englishCats = await prisma.category.findMany({
    where: { name: { in: Object.keys(ENGLISH_TO_PORTUGUESE) } },
    include: { expenses: { select: { id: true } }, incomes: { select: { id: true } } },
  });

  for (const engCat of englishCats) {
    const ptName = ENGLISH_TO_PORTUGUESE[engCat.name];
    if (!ptName || ptName === engCat.name) continue;

    const ptCat = engCat.userId
      ? await prisma.category.findUnique({
          where: { userId_name: { userId: engCat.userId, name: ptName } },
        })
      : null;

    if (ptCat) {
      if (engCat.expenses.length > 0) {
        await prisma.expense.updateMany({ where: { categoryId: engCat.id }, data: { categoryId: ptCat.id } });
      }
      if (engCat.incomes.length > 0) {
        await prisma.income.updateMany({ where: { categoryId: engCat.id }, data: { categoryId: ptCat.id } });
      }
      await prisma.category.delete({ where: { id: engCat.id } });
    } else {
      await prisma.category.update({ where: { id: engCat.id }, data: { name: ptName } });
    }
  }

  if (englishCats.length > 0) {
    console.log(`Normalized ${englishCats.length} English-named categories to Portuguese`);
  }

  // --- Keyword Mappings for classification engine ---
  const keywordMappings: Array<{
    keyword: string;
    matchField: string;
    matchType?: string;
    transactionType: string;
    categoryName: string;
    confidenceBoost: number;
  }> = [
    // Receitas
    { keyword: 'salario', matchField: 'normalized_description', transactionType: 'income', categoryName: 'Salário', confidenceBoost: 0.70 },
    { keyword: 'pagamento folha', matchField: 'normalized_description', transactionType: 'income', categoryName: 'Salário', confidenceBoost: 0.70 },
    { keyword: 'holerite', matchField: 'normalized_description', transactionType: 'income', categoryName: 'Salário', confidenceBoost: 0.70 },
    { keyword: 'prolabore', matchField: 'normalized_description', transactionType: 'income', categoryName: 'Salário', confidenceBoost: 0.65 },

    // Gastos Fixos - Moradia
    { keyword: 'aluguel', matchField: 'normalized_description', transactionType: 'fixed_expense', categoryName: 'Moradia', confidenceBoost: 0.65 },
    { keyword: 'condominio', matchField: 'normalized_description', transactionType: 'fixed_expense', categoryName: 'Moradia', confidenceBoost: 0.65 },

    // Gastos Fixos - Energia
    { keyword: 'cpfl', matchField: 'normalized_description', transactionType: 'fixed_expense', categoryName: 'Moradia', confidenceBoost: 0.70 },
    { keyword: 'enel', matchField: 'normalized_description', transactionType: 'fixed_expense', categoryName: 'Moradia', confidenceBoost: 0.70 },
    { keyword: 'eletropaulo', matchField: 'normalized_description', transactionType: 'fixed_expense', categoryName: 'Moradia', confidenceBoost: 0.70 },
    { keyword: 'cemig', matchField: 'normalized_description', transactionType: 'fixed_expense', categoryName: 'Moradia', confidenceBoost: 0.70 },
    { keyword: 'light s.a', matchField: 'normalized_description', transactionType: 'fixed_expense', categoryName: 'Moradia', confidenceBoost: 0.70 },

    // Gastos Fixos - Água
    { keyword: 'sabesp', matchField: 'normalized_description', transactionType: 'fixed_expense', categoryName: 'Moradia', confidenceBoost: 0.70 },
    { keyword: 'copasa', matchField: 'normalized_description', transactionType: 'fixed_expense', categoryName: 'Moradia', confidenceBoost: 0.70 },
    { keyword: 'sanepar', matchField: 'normalized_description', transactionType: 'fixed_expense', categoryName: 'Moradia', confidenceBoost: 0.70 },

    // Gastos Fixos - Telecom/Internet
    { keyword: 'vivo', matchField: 'counterpart_name', transactionType: 'fixed_expense', categoryName: 'Serviços', confidenceBoost: 0.55 },
    { keyword: 'claro', matchField: 'counterpart_name', transactionType: 'fixed_expense', categoryName: 'Serviços', confidenceBoost: 0.55 },
    { keyword: 'tim', matchField: 'counterpart_name', transactionType: 'fixed_expense', categoryName: 'Serviços', confidenceBoost: 0.55 },
    { keyword: 'oi s.a', matchField: 'counterpart_name', transactionType: 'fixed_expense', categoryName: 'Serviços', confidenceBoost: 0.55 },

    // Gastos Fixos - Streaming/Assinaturas
    { keyword: 'netflix', matchField: 'normalized_description', transactionType: 'fixed_expense', categoryName: 'Assinaturas', confidenceBoost: 0.80 },
    { keyword: 'spotify', matchField: 'normalized_description', transactionType: 'fixed_expense', categoryName: 'Assinaturas', confidenceBoost: 0.80 },
    { keyword: 'disney', matchField: 'normalized_description', transactionType: 'fixed_expense', categoryName: 'Assinaturas', confidenceBoost: 0.75 },
    { keyword: 'hbo max', matchField: 'normalized_description', transactionType: 'fixed_expense', categoryName: 'Assinaturas', confidenceBoost: 0.75 },
    { keyword: 'amazon prime', matchField: 'normalized_description', transactionType: 'fixed_expense', categoryName: 'Assinaturas', confidenceBoost: 0.75 },
    { keyword: 'youtube premium', matchField: 'normalized_description', transactionType: 'fixed_expense', categoryName: 'Assinaturas', confidenceBoost: 0.75 },
    { keyword: 'apple.com/bill', matchField: 'normalized_description', transactionType: 'fixed_expense', categoryName: 'Assinaturas', confidenceBoost: 0.70 },
    { keyword: 'google storage', matchField: 'normalized_description', transactionType: 'fixed_expense', categoryName: 'Assinaturas', confidenceBoost: 0.70 },

    // Gastos Variáveis - Alimentação
    { keyword: 'ifood', matchField: 'normalized_description', transactionType: 'variable_expense', categoryName: 'Alimentação', confidenceBoost: 0.75 },
    { keyword: 'rappi', matchField: 'normalized_description', transactionType: 'variable_expense', categoryName: 'Alimentação', confidenceBoost: 0.75 },
    { keyword: 'uber eats', matchField: 'normalized_description', transactionType: 'variable_expense', categoryName: 'Alimentação', confidenceBoost: 0.75 },

    // Gastos Variáveis - Transporte
    { keyword: 'uber', matchField: 'normalized_description', transactionType: 'variable_expense', categoryName: 'Transporte', confidenceBoost: 0.60 },
    { keyword: '99 taxis', matchField: 'normalized_description', transactionType: 'variable_expense', categoryName: 'Transporte', confidenceBoost: 0.65 },
    { keyword: '99app', matchField: 'normalized_description', transactionType: 'variable_expense', categoryName: 'Transporte', confidenceBoost: 0.65 },

    // Gastos Variáveis - Compras
    { keyword: 'mercadolivre', matchField: 'normalized_description', transactionType: 'variable_expense', categoryName: 'Pessoal', confidenceBoost: 0.60 },
    { keyword: 'mercado livre', matchField: 'normalized_description', transactionType: 'variable_expense', categoryName: 'Pessoal', confidenceBoost: 0.60 },
    { keyword: 'amazon', matchField: 'normalized_description', transactionType: 'variable_expense', categoryName: 'Pessoal', confidenceBoost: 0.55 },
    { keyword: 'shopee', matchField: 'normalized_description', transactionType: 'variable_expense', categoryName: 'Pessoal', confidenceBoost: 0.65 },
    { keyword: 'magazine luiza', matchField: 'normalized_description', transactionType: 'variable_expense', categoryName: 'Pessoal', confidenceBoost: 0.60 },
    { keyword: 'magalu', matchField: 'normalized_description', transactionType: 'variable_expense', categoryName: 'Pessoal', confidenceBoost: 0.60 },

    // Saúde
    { keyword: 'farmacia', matchField: 'normalized_description', transactionType: 'variable_expense', categoryName: 'Saúde', confidenceBoost: 0.65 },
    { keyword: 'drogaria', matchField: 'normalized_description', transactionType: 'variable_expense', categoryName: 'Saúde', confidenceBoost: 0.65 },
    { keyword: 'droga raia', matchField: 'normalized_description', transactionType: 'variable_expense', categoryName: 'Saúde', confidenceBoost: 0.70 },
    { keyword: 'drogasil', matchField: 'normalized_description', transactionType: 'variable_expense', categoryName: 'Saúde', confidenceBoost: 0.70 },

    // Seguro
    { keyword: 'porto seguro', matchField: 'normalized_description', transactionType: 'fixed_expense', categoryName: 'Seguro', confidenceBoost: 0.70 },
    { keyword: 'sulamerica', matchField: 'normalized_description', transactionType: 'fixed_expense', categoryName: 'Seguro', confidenceBoost: 0.65 },
  ];

  for (const km of keywordMappings) {
    // Use keyword + matchField + transactionType as a unique-enough key for upsert-like behavior
    const existing = await prisma.keywordMapping.findFirst({
      where: { keyword: km.keyword, matchField: km.matchField },
    });

    if (!existing) {
      await prisma.keywordMapping.create({
        data: {
          keyword: km.keyword,
          matchField: km.matchField,
          matchType: km.matchType || 'contains',
          transactionType: km.transactionType,
          categoryName: km.categoryName,
          confidenceBoost: km.confidenceBoost,
          isActive: true,
        },
      });
    }
  }

  console.log(`Seeded ${keywordMappings.length} keyword mappings`);

  console.log('Seed completed!');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
