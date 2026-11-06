/* Compatibilità Safari/iOS: pdf.js usa "for await" sugli stream e Promise.withResolvers, che i Safari meno recenti non hanno. */
if (typeof ReadableStream !== 'undefined' && !ReadableStream.prototype[Symbol.asyncIterator]) {
  ReadableStream.prototype[Symbol.asyncIterator] = function () {
    const reader = this.getReader();
    return {
      async next() {
        try {
          const r = await reader.read();
          if (r.done) reader.releaseLock();
          return r;
        } catch (e) { try { reader.releaseLock(); } catch { /* ignore */ } throw e; }
      },
      async return(value) {
        try { await reader.cancel(value); } catch { /* ignore */ }
        try { reader.releaseLock(); } catch { /* ignore */ }
        return { done: true, value };
      },
      [Symbol.asyncIterator]() { return this; },
    };
  };
  if (!ReadableStream.prototype.values) ReadableStream.prototype.values = ReadableStream.prototype[Symbol.asyncIterator];
}
if (typeof Promise.withResolvers !== 'function') {
  Promise.withResolvers = function () {
    let resolve, reject;
    const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
    return { promise, resolve, reject };
  };
}
