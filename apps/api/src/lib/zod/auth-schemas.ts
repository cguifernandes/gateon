import { z } from 'zod';

export const registerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Este campo é obrigatório.')
    .min(2, 'Informe seu nome.'),
  email: z
    .string()
    .email('Informe um e-mail válido.')
    .trim()
    .min(1, 'Este campo é obrigatório.'),
  password: z
    .string()
    .min(1, 'Este campo é obrigatório.')
    .min(8, 'A senha deve ter pelo menos 8 caracteres.'),
});

export const loginSchema = z.object({
  email: z
    .string()
    .email('Informe um e-mail válido.')
    .trim()
    .min(1, 'Este campo é obrigatório.'),
  password: z
    .string()
    .min(1, 'Este campo é obrigatório.')
    .min(8, 'A senha deve ter pelo menos 8 caracteres.'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;

export const deleteAccountSchema = z.object({
  confirm: z.literal(true, {
    errorMap: () => ({ message: 'Confirmação obrigatória.' }),
  }),
});

export type DeleteAccountInput = z.infer<typeof deleteAccountSchema>;

export const updateProfileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Informe seu nome.')
    .max(120, 'Nome muito longo.')
    .optional(),
  image: z
    .union([z.string().url('Informe uma URL válida.'), z.literal(''), z.null()])
    .optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const PASSWORD_RESET_GENERIC_MESSAGE =
  'Se o e-mail existir na nossa base, você receberá instruções para redefinir sua senha em instantes.';

export const passwordResetRequestSchema = z.object({
  email: z
    .string()
    .email('Informe um e-mail válido.')
    .trim()
    .min(1, 'Este campo é obrigatório.'),
});

export const passwordResetConfirmSchema = z
  .object({
    token: z.string().trim().min(1, 'Link de redefinição inválido.'),
    password: z
      .string()
      .min(1, 'Este campo é obrigatório.')
      .min(8, 'A senha deve ter pelo menos 8 caracteres.'),
    confirmPassword: z
      .string()
      .min(1, 'Confirme sua nova senha.')
      .min(8, 'A senha deve ter pelo menos 8 caracteres.'),
  })
  .superRefine((values, ctx) => {
    if (values.password !== values.confirmPassword) {
      ctx.addIssue({
        code: 'custom',
        message: 'As senhas não conferem.',
        path: ['confirmPassword'],
      });
    }
  });

export type PasswordResetRequestInput = z.infer<
  typeof passwordResetRequestSchema
>;
export type PasswordResetConfirmInput = z.infer<
  typeof passwordResetConfirmSchema
>;

export const profileAccountDtoSchema = z.object({
  id: z.string(),
  providerId: z.string(),
  label: z.string(),
  linkedAt: z.string(),
  hasPassword: z.boolean(),
});

export const profileSessionDtoSchema = z.object({
  id: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  expiresAt: z.string(),
  isCurrent: z.boolean(),
  hasIpMetadata: z.boolean(),
  hasUserAgentMetadata: z.boolean(),
});

export const profileStatsDtoSchema = z.object({
  telegramGroups: z.number().int().nonnegative(),
  members: z.number().int().nonnegative(),
  alerts: z.number().int().nonnegative(),
  stripeConnections: z.number().int().nonnegative(),
});

export const userProfileDtoSchema = z.object({
  user: z.object({
    id: z.string(),
    email: z.string(),
    name: z.string().nullable(),
    image: z.string().nullable(),
    emailVerified: z.boolean(),
    planId: z.enum(['free', 'starter', 'pro']),
    createdAt: z.string(),
    updatedAt: z.string(),
  }),
  accounts: z.array(profileAccountDtoSchema),
  sessions: z.array(profileSessionDtoSchema),
  stats: profileStatsDtoSchema,
});

export type UserProfileDto = z.infer<typeof userProfileDtoSchema>;
