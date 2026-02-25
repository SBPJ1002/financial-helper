import { prisma } from '../config/prisma.js';
import { getCurrentRates } from './bcb.service.js';
import { calculateCurrentValue } from './yieldCalculator.service.js';

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export async function buildSystemPrompt(userId: string): Promise<string> {
  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Fetch all user data
  const [incomes, fixedExpenses, variableExpenses, investments, rates, bankAccounts, bankTransactions] = await Promise.all([
    prisma.income.findMany({ where: { userId } }),
    prisma.expense.findMany({
      where: { userId, type: 'FIXED' },
      include: { category: true, history: { orderBy: { month: 'asc' } }, goal: true },
    }),
    prisma.expense.findMany({
      where: { userId, type: 'VARIABLE', date: { gte: monthStart, lte: monthEnd } },
      include: { category: true },
    }),
    prisma.investment.findMany({
      where: { userId, status: 'ACTIVE' },
      include: { investmentType: true },
    }),
    getCurrentRates(),
    prisma.bankAccount.findMany({
      where: { bankConnection: { userId, status: 'ACTIVE' } },
      include: { bankConnection: { select: { connectorName: true } } },
    }),
    prisma.bankTransaction.findMany({
      where: {
        bankAccount: { bankConnection: { userId, status: 'ACTIVE' } },
        date: { gte: thirtyDaysAgo },
      },
      orderBy: { date: 'desc' },
      take: 20,
      include: { bankAccount: { select: { name: true } } },
    }),
  ]);

  const totalIncome = incomes
    .filter((i) => i.recurrence === 'MONTHLY' || (i.date >= monthStart && i.date <= monthEnd))
    .reduce((s, i) => s + i.amount, 0);

  const totalFixed = fixedExpenses.reduce((s, e) => s + e.amount, 0);
  const totalVar = variableExpenses.reduce((s, e) => s + e.amount, 0);
  const balance = totalIncome - totalFixed - totalVar;
  const commitRate = totalIncome > 0 ? (((totalFixed + totalVar) / totalIncome) * 100).toFixed(1) : '0';

  const totalInvested = investments.reduce((s, i) => s + i.amountInvested, 0);

  // Calculate current investment values
  const investmentLines = await Promise.all(
    investments.map(async (inv) => {
      const currentValue = await calculateCurrentValue(
        inv.amountInvested,
        inv.applicationDate,
        inv.yieldType,
        inv.yieldRate,
      );
      const valueStr = currentValue ? ` -> Current: ${formatCurrency(currentValue)}` : '';
      return `- ${inv.name}: ${formatCurrency(inv.amountInvested)} (${inv.investmentType.name}, ${inv.yieldDescription})${valueStr}`;
    }),
  );

  // Identify trends in fixed expenses with variable values
  const variableFixed = fixedExpenses.filter((e) => e.history.length > 0);
  const increasing = variableFixed.filter((e) => {
    const hist = e.history.slice(-3);
    if (hist.length < 2) return false;
    return hist[hist.length - 1].amount > hist[0].amount;
  });

  const overLimit = fixedExpenses.filter((e) => e.goal && e.amount > e.goal.limit);

  // Economic rates context
  const rateLines = Object.entries(rates)
    .map(([name, data]) => {
      if (name === 'DOLAR') return `- Dólar (PTAX): R$ ${data.value.toFixed(2)} (${data.date})`;
      return `- ${name}: ${data.value}% (${data.date})`;
    })
    .join('\n');

  // Bank accounts context
  let bankSection = '';
  if (bankAccounts.length > 0) {
    const bankLines = bankAccounts.map(
      (a) => `- ${a.bankConnection.connectorName} / ${a.name} (${a.type}): ${formatCurrency(a.balance)}`
    ).join('\n');
    const totalBankBalance = bankAccounts.reduce((s, a) => s + a.balance, 0);
    bankSection = `\n### Bank Accounts (Open Finance):\n${bankLines}\n- Total bank balance: ${formatCurrency(totalBankBalance)}`;
  }

  // Bank transactions context
  let txSection = '';
  if (bankTransactions.length > 0) {
    const txLines = bankTransactions.map(
      (tx) => `- ${new Date(tx.date).toLocaleDateString('pt-BR')} | ${tx.description}: ${tx.type === 'CREDIT' ? '+' : '-'}${formatCurrency(Math.abs(tx.amount))} (${tx.bankAccount.name})`
    ).join('\n');
    txSection = `\n### Recent Bank Transactions (last 30 days):\n${txLines}`;
  }

  return `You are Finley, a smart and friendly personal financial assistant.
You have access to the user's financial data and should use it to give
personalized, practical, and actionable advice.

Always respond in Brazilian Portuguese. Be direct but kind.
Use concrete examples based on the user's numbers.
Format responses with markdown when useful.
Never make up data — only use what is provided.

## User's Financial Data:

### Income:
${incomes.map((i) => `- ${i.description}: ${formatCurrency(i.amount)} (${i.recurrence})`).join('\n') || 'No income registered.'}

### Fixed Expenses (fixed value):
${fixedExpenses
  .filter((e) => e.history.length === 0)
  .map((e) => `- ${e.description}: ${formatCurrency(e.amount)} [${e.category.emoji} ${e.category.name}] (${e.status})`)
  .join('\n') || 'None'}

### Fixed Expenses (variable value) — with history:
${variableFixed
  .map((e) => {
    const hist = e.history
      .slice(-6)
      .map((h) => `${h.month}: ${formatCurrency(h.amount)}`)
      .join(', ');
    return `- ${e.description}: Current ${formatCurrency(e.amount)} [${e.category.emoji} ${e.category.name}] | History: ${hist}`;
  })
  .join('\n') || 'None'}

### Variable Expenses this month:
${variableExpenses.map((e) => `- ${e.description}: ${formatCurrency(e.amount)} [${e.category.emoji} ${e.category.name}]`).join('\n') || 'None'}

### Monthly Summary (${month}):
- Total income: ${formatCurrency(totalIncome)}
- Fixed expenses: ${formatCurrency(totalFixed)}
- Variable expenses: ${formatCurrency(totalVar)}
- Available balance: ${formatCurrency(balance)}
- Commitment rate: ${commitRate}%

### Investments:
${investmentLines.join('\n') || 'None'}
- Total invested: ${formatCurrency(totalInvested)}

### Current Economic Rates:
${rateLines || 'Not available'}
${bankSection}${txSection}

### Trends:
- Increasing expenses: ${increasing.map((e) => e.description).join(', ') || 'None'}
- Over limit: ${overLimit.map((e) => e.description).join(', ') || 'None'}`;
}
