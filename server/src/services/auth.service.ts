import crypto from 'crypto';
import { prisma } from '../config/prisma.js';
import { hashPassword, comparePassword } from '../utils/password.js';
import { signToken, getTokenExpiresAt } from '../utils/jwt.js';
import { ApiError } from '../utils/apiError.js';
import { encrypt } from '../utils/encryption.js';
import { cleanCPF, validateCPF } from '../utils/cpf.js';
import type { RegisterInput, LoginInput } from '../validators/auth.validator.js';

function hashCPF(cpf: string): string {
  return crypto.createHash('sha256').update(cpf).digest('hex');
}

export async function register(input: RegisterInput) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw ApiError.conflict('Email already registered');
  }

  let cpfEncrypted: string | undefined;
  let cpfHashed: string | undefined;

  if (input.cpf) {
    const cleaned = cleanCPF(input.cpf);
    if (!validateCPF(cleaned)) {
      throw ApiError.badRequest('Invalid CPF');
    }
    cpfHashed = hashCPF(cleaned);

    const existingCpf = await prisma.user.findUnique({ where: { cpfHash: cpfHashed } });
    if (existingCpf) {
      throw ApiError.conflict('CPF already registered');
    }

    cpfEncrypted = encrypt(cleaned);
  }

  const hashed = await hashPassword(input.password);
  const user = await prisma.user.create({
    data: {
      fullName: input.fullName,
      email: input.email,
      password: hashed,
      cpf: cpfEncrypted,
      cpfHash: cpfHashed,
      birthDate: input.birthDate ? new Date(input.birthDate) : undefined,
      gender: input.gender as any,
      zipCode: input.zipCode,
      street: input.street,
      addressNumber: input.addressNumber,
      complement: input.complement,
      neighborhood: input.neighborhood,
      city: input.city,
      state: input.state,
    },
    select: { id: true, fullName: true, email: true, role: true, plan: true, createdAt: true },
  });

  // Create default categories for the new user
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

  await prisma.category.createMany({
    data: defaultCategories.map((c) => ({
      userId: user.id,
      name: c.name,
      emoji: '',
      type: c.type,
      isDefault: true,
    })),
  });

  const token = signToken({ userId: user.id, role: user.role });
  const expiresAt = getTokenExpiresAt();

  await prisma.session.create({
    data: { userId: user.id, token, expiresAt },
  });

  return { user, token };
}

export async function login(input: LoginInput) {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user) {
    throw ApiError.unauthorized('Invalid email or password');
  }

  if (!user.isActive) {
    throw ApiError.unauthorized('Account is deactivated');
  }

  const valid = await comparePassword(input.password, user.password);
  if (!valid) {
    throw ApiError.unauthorized('Invalid email or password');
  }

  const token = signToken({ userId: user.id, role: user.role });
  const expiresAt = getTokenExpiresAt();

  await prisma.session.create({
    data: { userId: user.id, token, expiresAt },
  });

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  return {
    user: {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      plan: user.plan,
      createdAt: user.createdAt,
    },
    token,
  };
}

export async function logout(token: string) {
  await prisma.session.deleteMany({ where: { token } });
}

export async function updatePlan(userId: string, plan: 'FREE' | 'AI_AGENT') {
  const user = await prisma.user.update({
    where: { id: userId },
    data: { plan },
    select: { id: true, fullName: true, email: true, role: true, plan: true, createdAt: true },
  });

  return user;
}

export async function getMe(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      fullName: true,
      email: true,
      role: true,
      plan: true,
      createdAt: true,
      financialProfile: { select: { onboardingCompleted: true } },
    },
  });

  if (!user) {
    throw ApiError.notFound('User not found');
  }

  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    plan: user.plan,
    createdAt: user.createdAt,
    onboardingCompleted: user.financialProfile?.onboardingCompleted ?? false,
  };
}
