import type { Request, Response } from 'express'
import { logger } from '../lib/logger'
import { handleCallback } from '../lib/ussd-flow'
import { deleteSession, getSession, setSession } from '../lib/ussd-session'

export async function ussdCallbackHandler(req: Request, res: Response) {
  const callback = req.body
  logger.info(
    { sessionId: callback.sessionId, isNew: callback.new, network: callback.network },
    'ussd callback',
  )

  const currentSession = await getSession(callback.sessionId)
  const { response, nextSession } = handleCallback(callback, currentSession, new Date())

  if (nextSession === null) {
    await deleteSession(callback.sessionId)
  } else {
    await setSession(callback.sessionId, nextSession)
  }

  res.json(response)
}
