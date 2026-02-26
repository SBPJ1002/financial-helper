import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    // Query all the counts
    const bankConnections = await prisma.bankConnection.count();
    const bankAccounts = await prisma.bankAccount.count();
    const bankTransactions = await prisma.bankTransaction.count();
    const expensesWithBank = await prisma.expense.count({ where: { bankTransactionId: { not: null } } });
    const incomesWithBank = await prisma.income.count({ where: { bankTransactionId: { not: null } } });
    const investmentsWithPluggy = await prisma.investment.count({ where: { pluggyInvestmentId: { not: null } } });
    const recurrenceGroups = await prisma.recurrenceGroup.count();
    const classificationRules = await prisma.classificationRule.count();
    const keywordMappings = await prisma.keywordMapping.count();

    console.log('Bank Connections:', bankConnections);
    console.log('Bank Accounts:', bankAccounts);
    console.log('Bank Transactions:', bankTransactions);
    console.log('Expenses with Bank Transaction:', expensesWithBank);
    console.log('Incomes with Bank Transaction:', incomesWithBank);
    console.log('Investments with Pluggy ID:', investmentsWithPluggy);
    console.log('Recurrence Groups:', recurrenceGroups);
    console.log('Classification Rules:', classificationRules);
    console.log('Keyword Mappings:', keywordMappings);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
