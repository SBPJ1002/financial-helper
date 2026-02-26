import { prisma } from '../config/prisma.js';

export async function getSummary(userId: string, month: string) {
  // month format: YYYY-MM
  const [year, mon] = month.split('-').map(Number);
  const startDate = new Date(year, mon - 1, 1);
  const endDate = new Date(year, mon, 0, 23, 59, 59);

  // Total income (monthly recurring + one-time in this month + active contracts)
  const allIncomes = await prisma.income.findMany({ where: { userId } });
  const incomes = allIncomes.filter(inc => {
    if (inc.recurrence === 'MONTHLY') return true;
    if (inc.recurrence === 'ONE_TIME') {
      return inc.date >= startDate && inc.date <= endDate;
    }
    if (inc.recurrence === 'CONTRACT') {
      if (!inc.contractStartDate || !inc.contractMonths) return false;
      const contractEnd = new Date(inc.contractStartDate);
      contractEnd.setMonth(contractEnd.getMonth() + inc.contractMonths);
      return inc.contractStartDate <= endDate && contractEnd > startDate;
    }
    return false;
  });
  const totalIncome = incomes.reduce((sum, i) => sum + i.amount, 0);

  // Fixed expenses — filter by month for imported ones, show all manual ones
  const fixedExpenses = await prisma.expense.findMany({
    where: {
      userId,
      type: 'FIXED',
      OR: [
        { stdTransactionId: null },
        { date: { gte: startDate, lte: endDate } },
      ],
    },
    include: {
      category: true,
      history: true,
      stdTransaction: { select: { stdAccountId: true, stdAccount: { select: { sourceType: true } } } },
    },
  });
  // Deduplicate manual fixed by description (only count once per month)
  const seenManualFixed = new Set<string>();
  const dedupedFixed = fixedExpenses.filter(e => {
    if (e.stdTransactionId) return true;
    const key = e.description;
    if (seenManualFixed.has(key)) return false;
    seenManualFixed.add(key);
    return true;
  });
  // For VARIABLE_AMOUNT expenses: use history entry for this month if available
  const totalFixed = dedupedFixed.reduce((sum, e) => {
    if (e.fixedAmountType === 'VARIABLE_AMOUNT') {
      const historyEntry = e.history.find(h => h.month === month);
      return sum + (historyEntry?.amount ?? e.amount);
    }
    return sum + e.amount;
  }, 0);

  // Variable expenses this month
  const variableExpenses = await prisma.expense.findMany({
    where: {
      userId,
      type: 'VARIABLE',
      date: { gte: startDate, lte: endDate },
    },
    include: {
      category: true,
      stdTransaction: { select: { stdAccountId: true, stdAccount: { select: { sourceType: true } } } },
    },
  });
  const totalVariable = variableExpenses.reduce((sum, e) => sum + e.amount, 0);

  const totalExpenses = totalFixed + totalVariable;
  const balance = totalIncome - totalExpenses;
  const savingsRate = totalIncome > 0 ? (balance / totalIncome) * 100 : 0;

  // Category breakdown
  const allExpenses = [...dedupedFixed, ...variableExpenses];
  const categoryMap = new Map<string, { name: string; emoji: string; total: number }>();
  for (const exp of allExpenses) {
    const key = exp.categoryId;
    const existing = categoryMap.get(key);
    if (existing) {
      existing.total += exp.amount;
    } else {
      categoryMap.set(key, {
        name: exp.category.name,
        emoji: exp.category.emoji,
        total: exp.amount,
      });
    }
  }
  const categoryBreakdown = Array.from(categoryMap.values()).sort((a, b) => b.total - a.total);

  // Top expenses
  const topExpenses = allExpenses
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5)
    .map((e) => ({
      description: e.description,
      amount: e.amount,
      category: e.category.name,
      emoji: e.category.emoji,
    }));

  // Source breakdown: fixed/variable by bank vs credit card vs manual
  const fixedBySource = { bank: 0, creditCard: 0, manual: 0 };
  const variableBySource = { bank: 0, creditCard: 0, manual: 0 };

  for (const exp of allExpenses) {
    const target = exp.type === 'FIXED' ? fixedBySource : variableBySource;
    if (!exp.stdTransactionId) {
      target.manual += exp.amount;
    } else {
      const sourceType = exp.stdTransaction?.stdAccount?.sourceType;
      if (sourceType === 'CREDIT') target.creditCard += exp.amount;
      else target.bank += exp.amount;
    }
  }

  // Invoice total
  const invoicePayments = await prisma.invoicePayment.findMany({
    where: { userId, month },
  });
  const invoiceTotal = invoicePayments.reduce((sum, ip) => sum + ip.amount, 0);

  // Declaration match rate
  const activeDeclarations = await prisma.fixedExpenseDeclaration.count({
    where: { userId, isActive: true },
  });
  const matchedDeclarations = await prisma.declarationMatch.count({
    where: { month, declaration: { userId, isActive: true } },
  });
  const declarationMatchRate = activeDeclarations > 0
    ? Math.round((matchedDeclarations / activeDeclarations) * 100) / 100
    : 0;

  return {
    month,
    totalIncome,
    totalFixed,
    totalVariable,
    totalExpenses,
    balance,
    savingsRate: Math.round(savingsRate * 100) / 100,
    categoryBreakdown,
    topExpenses,
    fixedBySource,
    variableBySource,
    invoiceTotal,
    declarationMatchRate,
  };
}
