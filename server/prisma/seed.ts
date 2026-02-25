import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // --- Users ---
  const adminPassword = await bcrypt.hash('Admin@2024!', 12);
  const demoPassword = await bcrypt.hash('Demo@2024!', 12);

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

  const demo = await prisma.user.upsert({
    where: { email: 'demo@financaapp.com' },
    update: {},
    create: {
      email: 'demo@financaapp.com',
      fullName: 'Demo User',
      password: demoPassword,
      role: 'USER',
    },
  });

  console.log(`Created users: ${admin.email}, ${demo.email}`);

  // --- UserSettings ---
  for (const user of [admin, demo]) {
    await prisma.userSettings.upsert({
      where: { userId: user.id },
      update: {},
      create: { userId: user.id },
    });
  }
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

  // --- Investment types ---
  const investmentTypes = [
    { name: 'CDB', category: 'FIXED_INCOME' as const },
    { name: 'LCI', category: 'FIXED_INCOME' as const },
    { name: 'LCA', category: 'FIXED_INCOME' as const },
    { name: 'Treasury Selic', category: 'FIXED_INCOME' as const },
    { name: 'Treasury IPCA+', category: 'FIXED_INCOME' as const },
    { name: 'Treasury Prefixed', category: 'FIXED_INCOME' as const },
    { name: 'Treasury Renda+', category: 'FIXED_INCOME' as const },
    { name: 'Treasury Educa+', category: 'FIXED_INCOME' as const },
    { name: 'CRI', category: 'FIXED_INCOME' as const },
    { name: 'CRA', category: 'FIXED_INCOME' as const },
    { name: 'Stocks', category: 'VARIABLE_INCOME' as const },
    { name: 'FII', category: 'VARIABLE_INCOME' as const },
    { name: 'ETF', category: 'VARIABLE_INCOME' as const },
    { name: 'BDR', category: 'VARIABLE_INCOME' as const },
    { name: 'Crypto', category: 'VARIABLE_INCOME' as const },
    { name: 'Savings', category: 'OTHER' as const },
    { name: 'Private Pension', category: 'OTHER' as const },
    { name: 'Debentures', category: 'FIXED_INCOME' as const },
    { name: 'Investment Funds', category: 'OTHER' as const },
    { name: 'COE', category: 'OTHER' as const },
    { name: 'Other', category: 'OTHER' as const },
  ];

  for (const it of investmentTypes) {
    await prisma.investmentType.upsert({
      where: { name: it.name },
      update: {},
      create: { name: it.name, category: it.category, isDefault: true },
    });
  }

  console.log('Created investment types');

  // --- Assets ---
  const assetsData: Array<{
    ticker: string; name: string; type: 'STOCK' | 'FII' | 'ETF' | 'BDR' | 'CRYPTO';
    sector?: string; basePrice: number; volatility: number;
  }> = [
    // Stocks
    { ticker: 'PETR4', name: 'Petrobras PN', type: 'STOCK', sector: 'Petróleo', basePrice: 38.50, volatility: 0.08 },
    { ticker: 'VALE3', name: 'Vale ON', type: 'STOCK', sector: 'Mineração', basePrice: 62.30, volatility: 0.07 },
    { ticker: 'ITUB4', name: 'Itaú Unibanco PN', type: 'STOCK', sector: 'Bancos', basePrice: 32.15, volatility: 0.05 },
    { ticker: 'BBDC4', name: 'Bradesco PN', type: 'STOCK', sector: 'Bancos', basePrice: 14.80, volatility: 0.06 },
    { ticker: 'ABEV3', name: 'Ambev ON', type: 'STOCK', sector: 'Bebidas', basePrice: 12.90, volatility: 0.04 },
    { ticker: 'WEGE3', name: 'WEG ON', type: 'STOCK', sector: 'Indústria', basePrice: 48.70, volatility: 0.06 },
    { ticker: 'RENT3', name: 'Localiza ON', type: 'STOCK', sector: 'Locação', basePrice: 42.50, volatility: 0.07 },
    { ticker: 'MGLU3', name: 'Magazine Luiza ON', type: 'STOCK', sector: 'Varejo', basePrice: 9.85, volatility: 0.15 },
    { ticker: 'BBAS3', name: 'Banco do Brasil ON', type: 'STOCK', sector: 'Bancos', basePrice: 28.40, volatility: 0.05 },
    { ticker: 'SUZB3', name: 'Suzano ON', type: 'STOCK', sector: 'Papel/Celulose', basePrice: 55.20, volatility: 0.06 },
    // FIIs
    { ticker: 'HGLG11', name: 'CSHG Logística', type: 'FII', sector: 'Logística', basePrice: 162.50, volatility: 0.03 },
    { ticker: 'XPML11', name: 'XP Malls', type: 'FII', sector: 'Shopping', basePrice: 98.30, volatility: 0.04 },
    { ticker: 'MXRF11', name: 'Maxi Renda', type: 'FII', sector: 'Papel', basePrice: 10.45, volatility: 0.02 },
    { ticker: 'KNRI11', name: 'Kinea Renda', type: 'FII', sector: 'Híbrido', basePrice: 138.70, volatility: 0.03 },
    { ticker: 'VISC11', name: 'Vinci Shopping', type: 'FII', sector: 'Shopping', basePrice: 108.20, volatility: 0.04 },
    { ticker: 'HGRE11', name: 'CSHG Real Estate', type: 'FII', sector: 'Lajes', basePrice: 132.80, volatility: 0.03 },
    { ticker: 'BTLG11', name: 'BTG Logística', type: 'FII', sector: 'Logística', basePrice: 97.60, volatility: 0.03 },
    { ticker: 'PVBI11', name: 'VBI Prime', type: 'FII', sector: 'Lajes', basePrice: 85.40, volatility: 0.04 },
    // ETFs
    { ticker: 'BOVA11', name: 'iShares Ibovespa', type: 'ETF', sector: 'Índice', basePrice: 118.50, volatility: 0.05 },
    { ticker: 'IVVB11', name: 'iShares S&P 500', type: 'ETF', sector: 'Índice EUA', basePrice: 285.30, volatility: 0.04 },
    { ticker: 'SMAL11', name: 'iShares Small Cap', type: 'ETF', sector: 'Small Caps', basePrice: 98.70, volatility: 0.06 },
    // BDRs
    { ticker: 'AAPL34', name: 'Apple', type: 'BDR', sector: 'Tecnologia', basePrice: 52.40, volatility: 0.05 },
    { ticker: 'AMZO34', name: 'Amazon', type: 'BDR', sector: 'Tecnologia', basePrice: 48.90, volatility: 0.06 },
    { ticker: 'GOGL34', name: 'Alphabet/Google', type: 'BDR', sector: 'Tecnologia', basePrice: 68.30, volatility: 0.05 },
    { ticker: 'MSFT34', name: 'Microsoft', type: 'BDR', sector: 'Tecnologia', basePrice: 72.15, volatility: 0.04 },
    { ticker: 'NVDC34', name: 'NVIDIA', type: 'BDR', sector: 'Tecnologia', basePrice: 38.80, volatility: 0.12 },
    // Crypto
    { ticker: 'BTC', name: 'Bitcoin', type: 'CRYPTO', sector: 'Criptomoeda', basePrice: 530000, volatility: 0.15 },
    { ticker: 'ETH', name: 'Ethereum', type: 'CRYPTO', sector: 'Criptomoeda', basePrice: 16500, volatility: 0.18 },
    { ticker: 'SOL', name: 'Solana', type: 'CRYPTO', sector: 'Criptomoeda', basePrice: 780, volatility: 0.20 },
    { ticker: 'ADA', name: 'Cardano', type: 'CRYPTO', sector: 'Criptomoeda', basePrice: 3.85, volatility: 0.22 },
    { ticker: 'BNB', name: 'Binance Coin', type: 'CRYPTO', sector: 'Criptomoeda', basePrice: 1950, volatility: 0.15 },
    { ticker: 'XRP', name: 'Ripple', type: 'CRYPTO', sector: 'Criptomoeda', basePrice: 12.50, volatility: 0.20 },
    { ticker: 'DOT', name: 'Polkadot', type: 'CRYPTO', sector: 'Criptomoeda', basePrice: 42, volatility: 0.18 },
    { ticker: 'MATIC', name: 'Polygon', type: 'CRYPTO', sector: 'Criptomoeda', basePrice: 4.20, volatility: 0.22 },
  ];

  // Seed a deterministic random
  function seededRandom(seed: number) {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  }

  for (const assetData of assetsData) {
    const asset = await prisma.asset.upsert({
      where: { ticker: assetData.ticker },
      update: {},
      create: {
        ticker: assetData.ticker,
        name: assetData.name,
        type: assetData.type,
        sector: assetData.sector,
      },
    });

    // Generate 6 months of price history
    const now = new Date();
    let currentPrice = assetData.basePrice * (1 - assetData.volatility * 0.5); // Start lower

    for (let m = 5; m >= 0; m--) {
      const date = new Date(now.getFullYear(), now.getMonth() - m, 1);
      date.setHours(0, 0, 0, 0);

      // Simulate price movement
      const seed = assetData.ticker.charCodeAt(0) * 100 + m;
      const change = (seededRandom(seed) - 0.45) * assetData.volatility * 2;
      currentPrice = currentPrice * (1 + change);
      currentPrice = Math.max(currentPrice, assetData.basePrice * 0.5); // Floor

      // Last month = base price
      if (m === 0) currentPrice = assetData.basePrice;

      await prisma.assetPrice.upsert({
        where: { assetId_date: { assetId: asset.id, date } },
        update: { price: Math.round(currentPrice * 100) / 100 },
        create: {
          assetId: asset.id,
          price: Math.round(currentPrice * 100) / 100,
          date,
          source: 'SEED',
        },
      });
    }
  }

  console.log(`Created ${assetsData.length} assets with price history`);

  // --- Demo data for demo user ---
  const categories = await prisma.category.findMany({ where: { userId: demo.id } });
  const catMap = Object.fromEntries(categories.map((c) => [c.name, c.id]));

  const types = await prisma.investmentType.findMany();
  const typeMap = Object.fromEntries(types.map((t) => [t.name, t.id]));

  // Income
  await prisma.income.upsert({
    where: { id: 'demo-income-1' },
    update: {},
    create: {
      id: 'demo-income-1',
      userId: demo.id,
      description: 'Monthly Salary',
      amount: 8500,
      date: new Date('2025-01-05'),
      recurrence: 'MONTHLY',
    },
  });

  console.log('Created demo income');

  // Fixed expenses
  const fixedExpenses = [
    { desc: 'Aluguel', amount: 1800, day: 5, cat: 'Moradia' },
    { desc: 'Plano de Saúde', amount: 450, day: 10, cat: 'Saúde' },
    { desc: 'Internet', amount: 120, day: 15, cat: 'Serviços' },
    { desc: 'Academia', amount: 89.9, day: 5, cat: 'Saúde' },
    { desc: 'Streaming', amount: 55.9, day: 1, cat: 'Assinaturas' },
  ];

  for (let i = 0; i < fixedExpenses.length; i++) {
    const fe = fixedExpenses[i];
    await prisma.expense.upsert({
      where: { id: `demo-fixed-${i + 1}` },
      update: {},
      create: {
        id: `demo-fixed-${i + 1}`,
        userId: demo.id,
        description: fe.desc,
        amount: fe.amount,
        type: 'FIXED',
        categoryId: catMap[fe.cat],
        date: new Date('2025-01-01'),
        dueDay: fe.day,
        status: 'PAID',
      },
    });
  }

  // Fixed expenses with variable values (have history)
  const variableFixed = [
    { desc: 'Energia', cat: 'Moradia', day: 20, amounts: [185, 210, 195, 220, 178, 203] },
    { desc: 'Água', cat: 'Moradia', day: 22, amounts: [65, 72, 68, 75, 63, 70] },
    { desc: 'Gás', cat: 'Moradia', day: 18, amounts: [45, 52, 48, 55, 42, 50] },
    { desc: 'Celular', cat: 'Serviços', day: 12, amounts: [79.9, 85, 79.9, 92, 79.9, 85] },
  ];

  const months = ['2024-07', '2024-08', '2024-09', '2024-10', '2024-11', '2024-12'];

  for (let i = 0; i < variableFixed.length; i++) {
    const vf = variableFixed[i];
    const lastAmount = vf.amounts[vf.amounts.length - 1];
    const expenseId = `demo-varfixed-${i + 1}`;

    await prisma.expense.upsert({
      where: { id: expenseId },
      update: {},
      create: {
        id: expenseId,
        userId: demo.id,
        description: vf.desc,
        amount: lastAmount,
        type: 'FIXED',
        categoryId: catMap[vf.cat],
        date: new Date('2025-01-01'),
        dueDay: vf.day,
        status: 'PENDING',
      },
    });

    for (let j = 0; j < months.length; j++) {
      await prisma.expenseHistory.upsert({
        where: { expenseId_month: { expenseId, month: months[j] } },
        update: {},
        create: {
          expenseId,
          month: months[j],
          amount: vf.amounts[j],
        },
      });
    }
  }

  console.log('Created demo fixed expenses with history');

  // Variable expenses
  const variableExpenses = [
    { desc: 'Supermercado', amount: 450, cat: 'Alimentação', method: 'DEBIT' as const, date: '2025-01-08' },
    { desc: 'Uber', amount: 85, cat: 'Transporte', method: 'PIX' as const, date: '2025-01-10' },
    { desc: 'Jantar', amount: 120, cat: 'Restaurante', method: 'CREDIT' as const, date: '2025-01-12' },
    { desc: 'Farmácia', amount: 65, cat: 'Saúde', method: 'DEBIT' as const, date: '2025-01-15' },
  ];

  for (let i = 0; i < variableExpenses.length; i++) {
    const ve = variableExpenses[i];
    await prisma.expense.upsert({
      where: { id: `demo-variable-${i + 1}` },
      update: {},
      create: {
        id: `demo-variable-${i + 1}`,
        userId: demo.id,
        description: ve.desc,
        amount: ve.amount,
        type: 'VARIABLE',
        categoryId: catMap[ve.cat],
        date: new Date(ve.date),
        paymentMethod: ve.method,
        status: 'PAID',
      },
    });
  }

  console.log('Created demo variable expenses');

  // --- Demo investments (updated with new fields) ---
  const petr4 = await prisma.asset.findUnique({ where: { ticker: 'PETR4' } });
  const hglg11 = await prisma.asset.findUnique({ where: { ticker: 'HGLG11' } });
  const btc = await prisma.asset.findUnique({ where: { ticker: 'BTC' } });

  // PETR4 - 100 shares
  if (petr4) {
    await prisma.investment.upsert({
      where: { id: 'demo-inv-petr4' },
      update: {},
      create: {
        id: 'demo-inv-petr4',
        userId: demo.id,
        name: 'PETR4 - Petrobras PN',
        investmentTypeId: typeMap['Stocks'],
        amountInvested: 3550,
        applicationDate: new Date('2024-03-15'),
        yieldDescription: 'Variable',
        yieldType: 'VARIABLE',
        institution: 'XP Investimentos',
        assetId: petr4.id,
        quantity: 100,
        averagePrice: 35.50,
        purchaseDate: new Date('2024-03-15'),
      },
    });
  }

  // HGLG11 - 20 units
  if (hglg11) {
    await prisma.investment.upsert({
      where: { id: 'demo-inv-hglg11' },
      update: {},
      create: {
        id: 'demo-inv-hglg11',
        userId: demo.id,
        name: 'HGLG11 - CSHG Logística',
        investmentTypeId: typeMap['FII'],
        amountInvested: 3100,
        applicationDate: new Date('2024-06-01'),
        yieldDescription: 'Variable',
        yieldType: 'VARIABLE',
        institution: 'Nubank',
        assetId: hglg11.id,
        quantity: 20,
        averagePrice: 155,
        purchaseDate: new Date('2024-06-01'),
      },
    });
  }

  // BTC - 0.005
  if (btc) {
    await prisma.investment.upsert({
      where: { id: 'demo-inv-btc' },
      update: {},
      create: {
        id: 'demo-inv-btc',
        userId: demo.id,
        name: 'Bitcoin',
        investmentTypeId: typeMap['Crypto'],
        amountInvested: 1700,
        applicationDate: new Date('2024-09-10'),
        yieldDescription: 'Variable',
        yieldType: 'VARIABLE',
        institution: 'Binance',
        assetId: btc.id,
        quantity: 0.005,
        averagePrice: 340000,
        purchaseDate: new Date('2024-09-10'),
      },
    });
  }

  // Treasury Selic 2029
  await prisma.investment.upsert({
    where: { id: 'demo-inv-tselic' },
    update: {},
    create: {
      id: 'demo-inv-tselic',
      userId: demo.id,
      name: 'Treasury Selic 2029',
      investmentTypeId: typeMap['Treasury Selic'],
      amountInvested: 15000,
      applicationDate: new Date('2024-01-01'),
      maturityDate: new Date('2029-03-01'),
      yieldDescription: 'SELIC + 0.0546%',
      yieldType: 'SELIC',
      yieldRate: null,
      institution: 'Treasury Direct',
      treasuryTitle: 'Treasury Selic 2029',
      treasuryRate: 0.0546,
      treasuryIndex: 'SELIC',
    },
  });

  // CDB Nubank 120% CDI
  await prisma.investment.upsert({
    where: { id: 'demo-inv-cdb' },
    update: {},
    create: {
      id: 'demo-inv-cdb',
      userId: demo.id,
      name: 'CDB Nubank 120% CDI',
      investmentTypeId: typeMap['CDB'],
      amountInvested: 5000,
      applicationDate: new Date('2024-04-15'),
      maturityDate: new Date('2026-04-15'),
      yieldDescription: '120% CDI',
      yieldType: 'CDI_PERCENTAGE',
      yieldRate: 120,
      institution: 'Nubank',
    },
  });

  console.log('Created demo investments');

  // Initial economic rates
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const initialRates = [
    { type: 'SELIC', value: 13.25 },
    { type: 'CDI', value: 13.15 },
    { type: 'IPCA', value: 4.56 },
    { type: 'POUPANCA', value: 7.43 },
    { type: 'TR', value: 0.15 },
    { type: 'IGPM', value: 3.50 },
    { type: 'DOLAR', value: 5.85 },
  ];

  for (const rate of initialRates) {
    await prisma.economicRate.upsert({
      where: { type_date: { type: rate.type, date: today } },
      update: {},
      create: {
        type: rate.type,
        value: rate.value,
        date: today,
        source: 'SEED',
      },
    });
  }

  console.log('Created initial economic rates');

  // NOTE: No simulation scenarios seeded — simulator starts empty

  // --- Normalize English category names → Portuguese ---
  // Some users may have been registered when defaults were in English.
  // The frontend translates via i18n, but DB should store Portuguese names.
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

  console.log('Seed completed!');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
