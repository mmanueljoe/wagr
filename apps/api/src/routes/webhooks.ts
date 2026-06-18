import { Router } from 'express'
import { moolreWebhookHandler } from '../controllers/webhook-controller'

export const webhooksRouter: Router = Router()

// No requireAuth — the webhook's authentication is the `secret` field in
// the payload, checked inside moolreWebhookHandler.
webhooksRouter.post('/webhooks/moolre', moolreWebhookHandler)
