// One submission attempt per open form. A confirmed ID is retained for read retries.
// An ambiguous create response must be reconciled in the order list, not resubmitted.
export function createOrderSubmission() {
  let busy = false, orderId = null, uncertain = false, complete = false;
  return {
    async run({create, read}) {
      if (busy) return {state:'busy'};
      if (complete) return {state:'complete'};
      if (uncertain) return {state:'uncertain'};
      busy = true;
      try {
        if (!orderId) {
          let result;
          try { result = await create(); }
          catch { uncertain = true; return {state:'uncertain'}; }
          if (!result || result.error) {
            // Fetch failures are returned (not always thrown) by the client.
            // Timeouts and server/proxy failures cannot prove the write rolled back.
            const rejected = result?.error && result.status >= 400
              && result.status < 500 && result.status !== 408;
            if (rejected) return {state:'rejected',error:result.error};
            uncertain = true;
            return {state:'uncertain'};
          }
          if (!result.id) { uncertain = true; return {state:'uncertain'}; }
          orderId = result.id;
        }
        try {
          const result = await read(orderId);
          if (result.error || !result.data) return {state:'read_failed',id:orderId};
          complete = true;
          return {state:'created',id:orderId,data:result.data};
        } catch { return {state:'read_failed',id:orderId}; }
      } finally { busy = false; }
    },
  };
}
