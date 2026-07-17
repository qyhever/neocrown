import type { Request } from 'express'

interface RequestUser {
  id?: string | number
}

export interface RequestWithContext extends Request {
  requestId: string
  user?: RequestUser
}
