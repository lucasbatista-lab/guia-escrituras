export type SignUpClientCode =
  | "email_taken"
  | "email_invalid"
  | "password_weak"
  | "email_rate_limit"
  | "config_missing"
  | "unexpected";

export interface SignUpClientError {
  code: SignUpClientCode;
  message: string;
}

const SAFE_MESSAGES: Record<SignUpClientCode, string> = {
  email_taken:
    "Este e-mail já está cadastrado. Tente entrar ou recuperar a senha.",
  email_invalid: "Informe um e-mail válido.",
  password_weak:
    "A senha é muito fraca. Use pelo menos 8 caracteres, com letras e números.",
  email_rate_limit:
    "Limite de envio de e-mail atingido. Aguarde alguns minutos e tente de novo.",
  config_missing:
    "Cadastro indisponível: configuração do ambiente incompleta. Tente novamente mais tarde.",
  unexpected: "Não foi possível criar a conta agora. Tente novamente em instantes.",
};

export function safeSignUpMessage(code: SignUpClientCode): string {
  return SAFE_MESSAGES[code];
}

/** Mask local-part; never log a full email. */
export function maskEmail(email: string): string {
  const trimmed = email.trim();
  const at = trimmed.indexOf("@");
  if (at <= 0) return "(invalid)";
  const domain = trimmed.slice(at + 1);
  return `${trimmed[0]}***@${domain}`;
}

type AuthLikeError = {
  message?: string;
  code?: string;
  status?: number;
  name?: string;
};

export function mapSignUpAuthError(error: AuthLikeError): SignUpClientError {
  const code = (error.code ?? "").toLowerCase();
  const message = (error.message ?? "").toLowerCase();

  if (
    code === "email_exists" ||
    code === "user_already_exists" ||
    code === "identity_already_exists" ||
    message.includes("already registered") ||
    message.includes("already been registered") ||
    message.includes("user already exists")
  ) {
    return { code: "email_taken", message: SAFE_MESSAGES.email_taken };
  }

  if (
    code === "email_address_invalid" ||
    code === "validation_failed" ||
    message.includes("invalid email") ||
    message.includes("email address") && message.includes("invalid")
  ) {
    return { code: "email_invalid", message: SAFE_MESSAGES.email_invalid };
  }

  if (
    code === "weak_password" ||
    message.includes("password should be") ||
    message.includes("password is too weak") ||
    message.includes("at least") && message.includes("character")
  ) {
    return { code: "password_weak", message: SAFE_MESSAGES.password_weak };
  }

  if (
    code === "over_email_send_rate_limit" ||
    code === "over_request_rate_limit" ||
    message.includes("rate limit") ||
    message.includes("too many requests") ||
    message.includes("email rate")
  ) {
    return {
      code: "email_rate_limit",
      message: SAFE_MESSAGES.email_rate_limit,
    };
  }

  return { code: "unexpected", message: SAFE_MESSAGES.unexpected };
}

/**
 * Supabase may return 200 for an existing email when confirmations are on,
 * with an empty identities array and no session.
 */
export function isSignUpDuplicateSoftFail(payload: {
  user: { identities?: unknown[] | null } | null;
  session: unknown;
}): boolean {
  if (!payload.user) return false;
  if (payload.session) return false;
  const identities = payload.user.identities;
  return Array.isArray(identities) && identities.length === 0;
}
