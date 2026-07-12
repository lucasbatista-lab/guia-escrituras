export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status: number = 400,
    public readonly safeMessage?: string,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function toClientError(error: unknown): {
  status: number;
  code: string;
  message: string;
} {
  if (error instanceof AppError) {
    return {
      status: error.status,
      code: error.code,
      message: error.safeMessage ?? error.message,
    };
  }

  return {
    status: 500,
    code: "internal_error",
    message: "Algo deu errado. Tente novamente em instantes.",
  };
}
