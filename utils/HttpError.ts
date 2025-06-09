export class HttpError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "HttpError";
    this.status = status;

    // Optional tapi sangat membantu saat debug
    Error.captureStackTrace(this, this.constructor);
  }
}
