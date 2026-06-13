import { internalAction } from "./_generated/server";
import { anyApi } from "convex/server";
import { internal } from "./_generated/api";

// ─── Inbound Queue Worker ─────────────────────────────────────────
// Processes one inbound message at a time from the queue.
// Handles locking, retries, dead-letter, and metrics.

export const processInboundQueue = internalAction({
  args: {},
  handler: async (ctx) => {
    const internalAny = anyApi;

    // 1. Check if there are items still in debounce window
    const debounceDelay = await ctx.runQuery(internalAny.queue.getPendingInboundDebounceDelay, {});
    if (debounceDelay !== null && debounceDelay > 0) {
      // Schedule retry after debounce expires
      await ctx.scheduler.runAfter(debounceDelay + 500, internal.queueWorkers.processInboundQueue);
      return { processed: false, reason: "debounce active", retryAfterMs: debounceDelay + 500 };
    }

    // 2. Get next pending item (past debounce window)
    const item = await ctx.runQuery(internalAny.queue.getNextPendingInbound, {});
    if (!item) return { processed: false, reason: "no pending items" };

    // 3. Mark as processing
    await ctx.runMutation(internalAny.queue.markInboundProcessing, { id: item._id });

    const startedAt = Date.now();

    try {
      // 4. Use batched text if available, otherwise use original text
      const effectiveText = item.batchedText || item.text;

      // 5. Download ALL batched media before calling bot
      let mediaStorageIds: string[] = [];

      // Download primary media if not already downloaded
      if (item.mediaUrl && !item.mediaStorageId) {
        const apiKey = process.env.YCLOUD_API_KEY;
        const headers: Record<string, string> = {};
        if (apiKey) headers["X-API-Key"] = apiKey;

        try {
          const res = await fetch(item.mediaUrl, { headers });
          if (res.ok) {
            const contentType = res.headers.get("content-type") ?? undefined;
            const arrayBuffer = await res.arrayBuffer();
            const blob = new Blob([arrayBuffer], contentType ? { type: contentType } : undefined);
            const storageId = await ctx.storage.store(blob);
            mediaStorageIds.push(storageId);
            console.log(`[queue-worker] Downloaded primary media: ${storageId}`);
          }
        } catch (err) {
          console.warn(`[queue-worker] Failed to download primary media: ${err}`);
        }
      } else if (item.mediaStorageId) {
        mediaStorageIds.push(String(item.mediaStorageId));
      }

      // Download batched media (additional files from same contact)
      const batchedUrls = item.batchedMediaUrls ?? [];
      const batchedTypes = item.batchedMediaTypes ?? [];
      for (let i = 0; i < batchedUrls.length; i++) {
        // Skip if it's the same URL as primary (already downloaded)
        if (batchedUrls[i] === item.mediaUrl) continue;

        const apiKey = process.env.YCLOUD_API_KEY;
        const headers: Record<string, string> = {};
        if (apiKey) headers["X-API-Key"] = apiKey;

        try {
          const res = await fetch(batchedUrls[i], { headers });
          if (res.ok) {
            const contentType = res.headers.get("content-type") ?? undefined;
            const arrayBuffer = await res.arrayBuffer();
            const blob = new Blob([arrayBuffer], contentType ? { type: contentType } : undefined);
            const storageId = await ctx.storage.store(blob);
            mediaStorageIds.push(storageId);
            console.log(`[queue-worker] Downloaded batched media ${i + 1}: ${storageId}`);
          }
        } catch (err) {
          console.warn(`[queue-worker] Failed to download batched media ${i + 1}: ${err}`);
        }
      }

      // 6. Delegate to the existing ycloudBot processor
      await ctx.runAction(internal.ycloudBot.processInboundMessage, {
        eventId: item.eventId,
        contactId: item.contactId,
        customerName: item.customerName,
        text: effectiveText,
        mediaUrl: undefined, // Already downloaded
        mediaId: undefined,
        mediaType: batchedTypes.length > 0 ? batchedTypes[0] : item.mediaType,
        mediaFilename: item.mediaFilename,
        mediaStorageIds: mediaStorageIds.length > 0 ? mediaStorageIds : undefined,
        attempt: 0,
      });

      // 6. Mark done
      await ctx.runMutation(internalAny.queue.markInboundDone, { id: item._id });

      // 7. Update metrics
      const period = await ctx.runQuery(internalAny.queue.getCurrentPeriod);
      if (period) {
        await ctx.runMutation(internalAny.queue.initMetricPeriod, { period });
        await ctx.runMutation(internalAny.queue.incrementMetric, {
          period,
          field: "inboundProcessed",
        });
      }

      // 8. Trigger outbound worker in case replies were queued
      await ctx.scheduler.runAfter(0, internal.queueWorkers.processOutboundQueue);

      // 9. Trigger next inbound item (chain processing)
      await ctx.scheduler.runAfter(0, internal.queueWorkers.processInboundQueue);

      const elapsed = Date.now() - startedAt;
      return { processed: true, itemId: item._id, elapsedMs: elapsed };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      // 10. Handle error (retry or dead-letter)
      const result = await ctx.runMutation(internalAny.queue.markInboundError, {
        id: item._id,
        error: errorMessage,
      });

      // 11. Update metrics
      const period = await ctx.runQuery(internalAny.queue.getCurrentPeriod);
      if (period) {
        await ctx.runMutation(internalAny.queue.initMetricPeriod, { period });
        await ctx.runMutation(internalAny.queue.incrementMetric, {
          period,
          field: "inboundErrored",
        });
      }

      // 12. If dead, move to dead letter queue
      if (result.dead) {
        await ctx.runMutation(internalAny.queue.moveToDeadLetter, {
          sourceTable: "inboundQueue",
          sourceId: String(item._id),
          eventId: item.eventId,
          contactId: item.contactId,
          payload: {
            contactId: item.contactId,
            text: item.batchedText || item.text,
            mediaType: item.mediaType,
            mediaUrl: item.mediaUrl,
          },
          error: errorMessage,
          attempts: item.attempts,
          firstEnqueuedAt: item.enqueuedAt,
        });

        if (period) {
          await ctx.runMutation(internalAny.queue.incrementMetric, {
            period,
            field: "inboundDead",
          });
        }

        console.error(
          `[inbound-queue] Message dead-lettered: eventId=${item.eventId} contactId=${item.contactId} error=${errorMessage}`
        );
      } else {
        console.warn(
          `[inbound-queue] Error processing item ${item._id}, requeuing (attempt ${item.attempts + 1})`
        );

        // Schedule retry after backoff
        if (result.nextRetryAt) {
          const delayMs = result.nextRetryAt - Date.now();
          if (delayMs > 0) {
            await ctx.scheduler.runAfter(delayMs, internal.queueWorkers.processInboundQueue);
          }
        }
      }

      return { processed: false, error: errorMessage, requeued: result.requeued };
    }
  },
});

// ─── Outbound Queue Worker ────────────────────────────────────────
// Sends WhatsApp messages from the outbound queue.

export const processOutboundQueue = internalAction({
  args: {},
  handler: async (ctx) => {
    const internalAny = anyApi;

    // 1. Get next pending item
    const item = await ctx.runQuery(internalAny.queue.getNextPendingOutbound, {});
    if (!item) return { processed: false, reason: "no pending items" };

    // 2. Mark as processing
    await ctx.runMutation(internalAny.queue.markOutboundProcessing, { id: item._id });

    try {
      // 3. Send via YCloud API
      const apiKey = process.env.YCLOUD_API_KEY;
      const fromNumber = process.env.YCLOUD_PHONE_NUMBER;

      if (!apiKey || !fromNumber) {
        throw new Error("YCLOUD_API_KEY or YCLOUD_PHONE_NUMBER not configured");
      }

      const toRaw = item.contactId.replace(/^whatsapp:/, "").trim().replace(/\s/g, "");
      const to = toRaw.startsWith("+") ? toRaw : `+${toRaw}`;
      const fromRaw = fromNumber.trim().replace(/\s/g, "");
      const from = fromRaw.startsWith("+") ? fromRaw : `+${fromRaw}`;

      const payload = JSON.stringify({
        from,
        to,
        type: "text",
        text: { body: item.content.trim() },
      });

      const res = await fetch("https://api.ycloud.com/v2/whatsapp/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": apiKey,
        },
        body: payload,
      });

      const data = (await res.json()) as { id?: string; status?: string; message?: string };

      if (!res.ok) {
        throw new Error(data.message ?? data.status ?? res.statusText);
      }

      // 4. Mark done
      await ctx.runMutation(internalAny.queue.markOutboundDone, {
        id: item._id,
        providerMessageId: data.id,
      });

      // 5. Also persist to ycloudMessages for history
      await ctx.runMutation(internalAny.ycloudState.addOutboundMessage, {
        contactId: item.contactId,
        content: item.content,
        providerMessageId: data.id,
      });

      // 6. Update conversation last message
      await ctx.runMutation(internalAny.conversationState.updateLastMessage, {
        contactId: item.contactId,
        direction: "OUTBOUND",
        content: item.content,
        createdAt: Date.now(),
      });

      // 7. Update metrics
      const period = await ctx.runQuery(internalAny.queue.getCurrentPeriod);
      if (period) {
        await ctx.runMutation(internalAny.queue.initMetricPeriod, { period });
        await ctx.runMutation(internalAny.queue.incrementMetric, {
          period,
          field: "outboundProcessed",
        });
      }

      // 8. Process next outbound item
      await ctx.scheduler.runAfter(0, internal.queueWorkers.processOutboundQueue);

      return { processed: true, itemId: item._id, providerMessageId: data.id };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      // 9. Handle error (retry or dead-letter)
      const result = await ctx.runMutation(internalAny.queue.markOutboundError, {
        id: item._id,
        error: errorMessage,
      });

      // 10. Update metrics
      const period = await ctx.runQuery(internalAny.queue.getCurrentPeriod);
      if (period) {
        await ctx.runMutation(internalAny.queue.initMetricPeriod, { period });
        await ctx.runMutation(internalAny.queue.incrementMetric, {
          period,
          field: "outboundErrored",
        });
      }

      // 11. If dead, move to dead letter queue
      if (result.dead) {
        await ctx.runMutation(internalAny.queue.moveToDeadLetter, {
          sourceTable: "outboundQueue",
          sourceId: String(item._id),
          contactId: item.contactId,
          payload: {
            contactId: item.contactId,
            content: item.content,
          },
          error: errorMessage,
          attempts: item.attempts,
          firstEnqueuedAt: item.enqueuedAt,
        });

        if (period) {
          await ctx.runMutation(internalAny.queue.incrementMetric, {
            period,
            field: "outboundDead",
          });
        }

        console.error(
          `[outbound-queue] Message dead-lettered: contactId=${item.contactId} error=${errorMessage}`
        );
      } else {
        console.warn(
          `[outbound-queue] Error sending item ${item._id}, requeuing (attempt ${item.attempts + 1})`
        );

        // Schedule retry after backoff
        if (result.nextRetryAt) {
          const delayMs = result.nextRetryAt - Date.now();
          if (delayMs > 0) {
            await ctx.scheduler.runAfter(delayMs, internal.queueWorkers.processOutboundQueue);
          }
        }
      }

      return { processed: false, error: errorMessage, requeued: result.requeued };
    }
  },
});

// ─── Cleanup Worker ───────────────────────────────────────────────
// Runs periodically to clean up old queue items.

export const cleanupQueue = internalAction({
  args: {},
  handler: async (ctx) => {
    const internalAny = anyApi;

    // Clean done inbound items older than 24h
    const inboundResult = await ctx.runMutation(internalAny.queue.cleanupDoneInbound, {});

    // Clean done outbound items older than 24h
    const outboundResult = await ctx.runMutation(internalAny.queue.cleanupDoneOutbound, {});

    // Clean expired processing locks
    const locksResult = await ctx.runMutation(internalAny.queue.cleanupExpiredLocks, {});

    // Clean old processed events (heuristic: oldest first)
    const eventsResult = await ctx.runMutation(internalAny.queue.cleanupProcessedEvents, {
      limit: 500,
    });

    // Clean dead letters older than 7 days
    const deadResult = await ctx.runMutation(internalAny.queue.cleanupDeadLetters, {});

    return {
      inboundCleaned: inboundResult.deleted,
      outboundCleaned: outboundResult.deleted,
      locksCleaned: locksResult.deleted,
      eventsCleaned: eventsResult.deleted,
      deadCleaned: deadResult.deleted,
    };
  },
});
