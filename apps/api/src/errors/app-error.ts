// Single error class for everything we throw at the api boundary. The global
// error handler reads code + statusCode and shapes the response. Anything
// that's not an AppError becomes a 500 INTERNAL by default.

export class AppError extends Error {
  public readonly code: string
  public readonly statusCode: number

  constructor(code: string, statusCode: number, message: string) {
    super(message)
    this.name = 'AppError'
    this.code = code
    this.statusCode = statusCode
  }
}
