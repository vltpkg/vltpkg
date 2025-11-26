import { definePlugin } from 'nitro'
import type { HTTPEvent } from 'nitro/h3'
import type { SpanContext } from '../telemetry.ts'
import {
  initTelemetry,
  logger,
  captureException,
  startRequestTransaction,
} from '../telemetry.ts'

// Initialize telemetry on plugin load
initTelemetry()

// WeakMap to track request transactions
const requestTransactions = new WeakMap<HTTPEvent, SpanContext>()

export default definePlugin(nitro => {
  nitro.hooks.hook('request', (event: HTTPEvent) => {
    event.context.requestId = crypto.randomUUID()
    const method = event.req.method
    const url = event.req.url

    logger.info('request_start', {
      'request.id': event.context.requestId,
      'http.method': method,
      'http.url': url,
    })

    // Start a transaction for this request
    const transaction = startRequestTransaction(method, url)
    requestTransactions.set(event, transaction)
  })

  nitro.hooks.hook('response', (res: Response, event: HTTPEvent) => {
    const transaction = requestTransactions.get(event)
    if (transaction) {
      transaction.setStatus('ok')
      transaction.end()
      requestTransactions.delete(event)
    }

    logger.info('request_end', {
      'request.id': event.context.requestId,
      'http.method': event.req.method,
      'http.url': event.req.url,
    })
  })

  nitro.hooks.hook(
    'error',
    (err: Error, event?: { event?: HTTPEvent }) => {
      logger.error('nitro_error', {
        message: err.message,
        stack: err.stack,
      })
      captureException(err)

      // End the transaction with error status if available
      const httpEvent = event?.event
      if (httpEvent) {
        const transaction = requestTransactions.get(httpEvent)
        if (transaction) {
          transaction.setStatus('error', err.message)
          transaction.end()
          requestTransactions.delete(httpEvent)
        }
      }
    },
  )
})
