import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Mapping from English category names → Portuguese canonical names.
 * Categories in the DB should always be stored in Portuguese;
 * the frontend handles translation to the user's configured language.
 */
const ENGLISH_TO_PORTUGUESE: Record<string, string> = {
  // Expense categories
  'Housing': 'Moradia',
  'Food': 'Alimentação',
  'Transport': 'Transporte',
  'Health': 'Saúde',
  'Education': 'Educação',
  'Entertainment': 'Entretenimento',
  'Clothing': 'Vestuário',
  'Services': 'Serviços',
  'Personal': 'Pessoal',
  'Subscriptions': 'Assinaturas',
  'Tax': 'Imposto',
  'Travel': 'Viagem',
  'Restaurant': 'Restaurante',
  'Insurance': 'Seguro',
  'Psychologist': 'Psicólogo(a)',
  // Both
  'Other': 'Outros',
  // Income categories
  'Salary': 'Salário',
  'Freelance': 'Freelance', // same in both languages
  'Contract': 'Contrato',
  'Returns': 'Rendimentos',
  'Rent': 'Aluguel',
  'Other (Income)': 'Outros (Receita)',
};

async function main() {
  console.log('Normalizing category names (English → Portuguese)...\n');

  const englishNames = Object.keys(ENGLISH_TO_PORTUGUESE);

  // Find all categories that have English names
  const englishCategories = await prisma.category.findMany({
    where: { name: { in: englishNames } },
    include: { expenses: { select: { id: true } }, incomes: { select: { id: true } } },
  });

  if (englishCategories.length === 0) {
    console.log('No English-named categories found. Database is already normalized.');
    return;
  }

  console.log(`Found ${englishCategories.length} English-named category record(s) to normalize.\n`);

  let renamed = 0;
  let merged = 0;
  let expensesMoved = 0;
  let incomesMoved = 0;

  for (const engCat of englishCategories) {
    const portugueseName = ENGLISH_TO_PORTUGUESE[engCat.name];
    if (!portugueseName || portugueseName === engCat.name) continue; // skip "Freelance" etc.

    // Check if this user already has the Portuguese version
    const ptCat = engCat.userId
      ? await prisma.category.findUnique({
          where: { userId_name: { userId: engCat.userId, name: portugueseName } },
        })
      : null;

    if (ptCat) {
      // User has BOTH English and Portuguese versions → merge into Portuguese
      console.log(
        `  User ${engCat.userId}: Merging "${engCat.name}" (${engCat.id}) → "${portugueseName}" (${ptCat.id})`
      );

      // Move expenses from English category to Portuguese category
      if (engCat.expenses.length > 0) {
        const result = await prisma.expense.updateMany({
          where: { categoryId: engCat.id },
          data: { categoryId: ptCat.id },
        });
        expensesMoved += result.count;
        console.log(`    Moved ${result.count} expense(s)`);
      }

      // Move incomes from English category to Portuguese category
      if (engCat.incomes.length > 0) {
        const result = await prisma.income.updateMany({
          where: { categoryId: engCat.id },
          data: { categoryId: ptCat.id },
        });
        incomesMoved += result.count;
        console.log(`    Moved ${result.count} income(s)`);
      }

      // Delete the English duplicate
      await prisma.category.delete({ where: { id: engCat.id } });
      merged++;
    } else {
      // User only has the English version → rename it
      console.log(
        `  User ${engCat.userId}: Renaming "${engCat.name}" → "${portugueseName}" (${engCat.id})`
      );
      await prisma.category.update({
        where: { id: engCat.id },
        data: { name: portugueseName },
      });
      renamed++;
    }
  }

  console.log(`\nNormalization complete!`);
  console.log(`  Renamed: ${renamed}`);
  console.log(`  Merged (duplicates removed): ${merged}`);
  console.log(`  Expenses reassigned: ${expensesMoved}`);
  console.log(`  Incomes reassigned: ${incomesMoved}`);
}

main()
  .catch((e) => {
    console.error('Normalization error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
