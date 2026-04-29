import { createError } from 'h3'

export const ApiError = {
  validation(details: Record<string, string>) {
    return createError({ statusCode: 422, statusMessage: 'Validation failed',
      data: { error: { code: 'validation', message: 'Validation failed', details } } })
  },
  notFound(resource: string) {
    return createError({ statusCode: 404, statusMessage: 'Not found',
      data: { error: { code: 'not_found', message: `${resource} not found` } } })
  },
  forbidden(reason = 'Forbidden') {
    return createError({ statusCode: 403, statusMessage: 'Forbidden',
      data: { error: { code: 'forbidden', message: reason } } })
  },
  conflict(reason: string) {
    return createError({ statusCode: 409, statusMessage: 'Conflict',
      data: { error: { code: 'conflict', message: reason } } })
  },
  unauthorized(reason = 'Unauthorized') {
    return createError({ statusCode: 401, statusMessage: 'Unauthorized',
      data: { error: { code: 'unauthorized', message: reason } } })
  },
}
