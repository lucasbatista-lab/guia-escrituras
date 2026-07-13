export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status: number = 400,
    public readonly safeMessage?: string,
    public readonly retryAfterSeconds?: number,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function toClientError(error: unknown): {
  status: number;
  code: string;
  message: string;
  retryAfterSeconds?: number;
} {
  if (error instanceof AppError) {
    return {
      status: error.status,
      code: error.code,
      message: error.safeMessage ?? error.message,
      retryAfterSeconds: error.retryAfterSeconds,
    };
  }

  return {
    status: 500,
    code: "internal_error",
    message: "Algo deu errado. Tente novamente em instantes.",
  };
}
