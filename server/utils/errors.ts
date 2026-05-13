import { createError } from 'h3'

export const ApiError = {
  validation(details: Record<string, string>) {
    const fields = Object.keys(details).join(', ')
    const summary = fields ? `Validation failed: ${fields}` : 'Validation failed'
    return createError({ statusCode: 422, statusMessage: summary,
      data: { error: { code: 'validation', message: summary, details } } })
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
