// Offline-first helper flow: a Seva Kendra helper with no signal can still start clocks. Requests are saved on the device and
// replayed when online. Each request carries an explicit receivedOn (from the slip), so a late sync does not move the deadline.
export const QUEUE_KEY = 'samay.queue.v1';
export function createQueue(storage = globalThis.localStorage) {
  const read = () => { try { return JSON.parse(storage.getItem(QUEUE_KEY) ?? '[]'); } catch { return []; } };
  const write = (q) => storage.setItem(QUEUE_KEY, JSON.stringify(q));
  return {
    all: read,
    add(payload) { const q = read(); const item = { localId: `q-${Date.now()}-${q.length}`, payload, addedAt: new Date().toISOString() }; q.push(item); write(q); return item; },
    /** send(payload) must resolve on success, throw {duplicate:true} if the server already has it, or throw anything else to keep it queued. */
    async flush(send) {
      const remaining = [], done = [];
      for (const item of read()) {
        try { await send(item.payload); done.push(item); }
        catch (e) { if (e?.duplicate) done.push(item); else remaining.push(item); }
      }
      write(remaining); return { synced: done.length, remaining: remaining.length };
    },
  };
}
export const isNetworkError = (e) => e instanceof TypeError || /Failed to fetch|NetworkError|Load failed/i.test(e?.message ?? '');
