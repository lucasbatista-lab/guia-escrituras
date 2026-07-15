export type SignUpClientCode =
  | "email_taken"
  | "email_invalid"
  | "password_weak"
  | "email_rate_limit"
  | "email_service_unavailable"
  | "config_missing"
  | "terms_required"
  | "invalid_plan"
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
    "Muitas tentativas de envio de e-mail. Aguarde alguns minutos e tente de novo.",
  email_service_unavailable:
    "Não foi possível enviar o e-mail de confirmação agora. Tente reenviar em alguns minutos.",
  config_missing:
    "Cadastro indisponível: configuração do ambiente incompleta. Tente novamente mais tarde.",
  terms_required:
    "Aceite os Termos de Uso e a Política de Privacidade para continuar.",
  invalid_plan:
    "Plano inválido. Escolha um plano disponível em /planos.",
  unexpected:
    "Não foi possível criar a conta agora. Tente novamente em instantes.",
};

export function safeSignUpMessage(code: SignUpClientCode): string {
  return SAFE_MESSAGES[code];
}

/**
 * Public check-email copy after signup — identical for new and existing emails
 * so the client cannot enumerate accounts.
 */
export const SIGNUP_CHECK_EMAIL_PUBLIC_MESSAGE =
  "Confira seu e-mail para continuar. Caso já exista uma conta, você receberá as orientações disponíveis para esse endereço.";

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
    (message.includes("email address") && message.includes("invalid"))
  ) {
    return { code: "email_invalid", message: SAFE_MESSAGES.email_invalid };
  }

  if (
    code === "weak_password" ||
    message.includes("password should be") ||
    message.includes("password is too weak") ||
    (message.includes("at least") && message.includes("character"))
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

  // SMTP / mailer failures — never label these as rate limit.
  // Do not treat bare unexpected_failure alone as SMTP.
  if (
    code.includes("smtp") ||
    message.includes("smtp") ||
    message.includes("error sending confirmation email") ||
    message.includes("error sending email") ||
    message.includes("unable to send") ||
    message.includes("failed to send") ||
    message.includes("confirmation email") ||
    message.includes("mailer") ||
    message.includes("email provider") ||
    (message.includes("sending") && message.includes("email"))
  ) {
    return {
      code: "email_service_unavailable",
      message: SAFE_MESSAGES.email_service_unavailable,
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

export type ResendConfirmationClientCode =
  | "email_invalid"
  | "email_rate_limit"
  | "email_service_unavailable"
  | "config_missing"
  | "unexpected";

const RESEND_MESSAGES: Record<ResendConfirmationClientCode, string> = {
  email_invalid: SAFE_MESSAGES.email_invalid,
  email_rate_limit: SAFE_MESSAGES.email_rate_limit,
  email_service_unavailable: SAFE_MESSAGES.email_service_unavailable,
  config_missing: SAFE_MESSAGES.config_missing,
  unexpected:
    "Não foi possível reenviar o e-mail agora. Tente novamente em instantes.",
};

export function safeResendMessage(code: ResendConfirmationClientCode): string {
  return RESEND_MESSAGES[code];
}

export function mapResendAuthError(
  error: AuthLikeError,
): { code: ResendConfirmationClientCode; message: string } {
  const mapped = mapSignUpAuthError(error);
  if (
    mapped.code === "email_invalid" ||
    mapped.code === "email_rate_limit" ||
    mapped.code === "email_service_unavailable" ||
    mapped.code === "config_missing"
  ) {
    return { code: mapped.code, message: RESEND_MESSAGES[mapped.code] };
  }
  return { code: "unexpected", message: RESEND_MESSAGES.unexpected };
}
