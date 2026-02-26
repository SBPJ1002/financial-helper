import { prisma } from '../config/prisma.js';

type Section = 'incomes' | 'expenses' | 'categories';

export async function exportData(userId: string, format: 'json' | 'csv', sections: Section[]) {
  const data: Record<string, any[]> = {};

  if (sections.includes('categories')) {
    data.categories = await prisma.category.findMany({
      where: { OR: [{ userId }, { userId: null }] },
      select: { name: true, emoji: true, type: true },
      orderBy: { name: 'asc' },
    });
  }

  if (sections.includes('incomes')) {
    data.incomes = await prisma.income.findMany({
      where: { userId },
      include: { category: { select: { name: true, emoji: true } } },
      orderBy: { date: 'desc' },
    });
  }

  if (sections.includes('expenses')) {
    data.expenses = await prisma.expense.findMany({
      where: { userId },
      include: {
        category: { select: { name: true, emoji: true } },
        history: true,
        goal: true,
      },
      orderBy: { date: 'desc' },
    });
  }

  if (format === 'json') {
    return { contentType: 'application/json', filename: 'finhelper-export.json', content: JSON.stringify(data, null, 2) };
  }

  // CSV format — one section at a time, joined with headers
  const csvParts: string[] = [];

  if (data.categories) {
    csvParts.push('--- CATEGORIES ---');
    csvParts.push('name,emoji,type');
    for (const c of data.categories) {
      csvParts.push(`${csvEscape(c.name)},${csvEscape(c.emoji)},${c.type}`);
    }
    csvParts.push('');
  }

  if (data.incomes) {
    csvParts.push('--- INCOMES ---');
    csvParts.push('description,amount,date,recurrence,category,recurrenceDay,contractMonths');
    for (const i of data.incomes) {
      csvParts.push([
        csvEscape(i.description), i.amount, i.date.toISOString().slice(0, 10),
        i.recurrence, csvEscape(i.category?.name || ''), i.recurrenceDay || '', i.contractMonths || '',
      ].join(','));
    }
    csvParts.push('');
  }

  if (data.expenses) {
    csvParts.push('--- EXPENSES ---');
    csvParts.push('description,amount,date,type,category,status,dueDay,fixedAmountType,paymentMethod');
    for (const e of data.expenses) {
      csvParts.push([
        csvEscape(e.description), e.amount, e.date.toISOString().slice(0, 10),
        e.type, csvEscape(e.category?.name || ''), e.status, e.dueDay || '',
        e.fixedAmountType || '', e.paymentMethod || '',
      ].join(','));
    }
  }

  return { contentType: 'text/csv', filename: 'finhelper-export.csv', content: csvParts.join('\n') };
}

function csvEscape(val: string): string {
  if (val.includes(',') || val.includes('"') || val.includes('\n')) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}
