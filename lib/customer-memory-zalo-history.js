export const ZALO_HISTORY_BATCH_SIZE = 20;
export const ZALO_HISTORY_FILE_LIMIT = 16 * 1024 * 1024;

const REQUIRED = ["conversation_id", "conversation_name", "sent_at", "direction", "text"];
const COLUMNS = new Set([...REQUIRED, "message_id", "sender_name"]);
const IDENTIFIER = /^[0-9A-Za-z_.:-]{4,120}$/;
const UNSUPPORTED_TEXT = /[\0\uD800-\uDFFF]/u;
const NATIVE_MESSAGE_ID = /^[0-9A-Za-z_.:-]{1,160}$/;
const TIMESTAMP = /^(\d{4}-\d{2}-\d{2})T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,6})?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/;

export function normalizeZaloHistoryMessage(row) {
  if (typeof row?.sent_at !== "string" || !TIMESTAMP.test(row.sent_at)) return null;
  const at = Date.parse(row.sent_at);
  const date = Date.parse(row.sent_at.slice(0,10) + "T00:00:00Z");
  if (!Number.isFinite(at) || !Number.isFinite(date) ||
      new Date(date).toISOString().slice(0,10) !== row.sent_at.slice(0,10)) return null;
  if (!["inbound","outbound"].includes(row.direction)) return null;
  if (typeof row.text !== "string" || !row.text.trim() || row.text.length > 12000 || UNSUPPORTED_TEXT.test(row.text)) return null;
  const senderName = row.sender_name ?? "";
  const messageId = row.message_id ?? "";
  if (typeof senderName !== "string" || senderName.length > 160 || UNSUPPORTED_TEXT.test(senderName)) return null;
  if (typeof messageId !== "string" || (messageId && !NATIVE_MESSAGE_ID.test(messageId))) return null;
  return { sent_at:row.sent_at, direction:row.direction, text:row.text, message_id:messageId, sender_name:senderName.trim() };
}

export function validZaloHistoryThread(id, name) {
  return typeof id === "string" && IDENTIFIER.test(id) && typeof name === "string" &&
    !!name.trim() && name.length <= 160 && !UNSUPPORTED_TEXT.test(name);
}

function csvRows(csv) {
  const source = csv.replace(/^\uFEFF/, "");
  const rows = [];
  let cells = [], cell = "", quoted = false, closedQuote = false;
  function endCell() {
    cells.push(cell);
    cell = "";
    closedQuote = false;
  }
  function endRow() {
    endCell();
    if (cells.some(Boolean)) rows.push(cells);
    cells = [];
  }
  for (let i = 0; i < source.length; i++) {
    const c = source[i];
    if (quoted) {
      if (c !== '"') cell += c;
      else if (source[i+1] === '"') { cell += '"'; i++; }
      else { quoted = false; closedQuote = true; }
      continue;
    }
    if (c === ",") endCell();
    else if (c === "\n" || c === "\r") {
      endRow();
      if (c === "\r" && source[i+1] === "\n") i++;
    } else if (closedQuote || (c === '"' && cell)) throw new Error("csv_syntax");
    else if (c === '"') quoted = true;
    else cell += c;
  }
  if (quoted) throw new Error("csv_syntax");
  endRow();
  return rows;
}

export function parseZaloHistoryCsv(csv) {
  const [header,...rows] = csvRows(csv);
  const columns = header?.map(value => value.trim()) || [];
  if (!REQUIRED.every(name => columns.includes(name)) || !columns.every(name => COLUMNS.has(name)) ||
      new Set(columns).size !== columns.length) throw new Error("csv_columns");
  if (!rows.length) throw new Error("csv_empty");

  const threads = new Map();
  rows.forEach((cells,index) => {
    const raw = Object.fromEntries(columns.map((column,i) => [column, cells[i]]));
    const id = raw.conversation_id?.trim(), name = raw.conversation_name?.trim();
    const message = normalizeZaloHistoryMessage(raw);
    if (cells.length !== columns.length || !validZaloHistoryThread(id,name) || !message ||
        (threads.has(id) && threads.get(id).name !== name)) throw new Error("csv_row:" + (index+2));
    if (!threads.has(id)) threads.set(id,{id,name,messages:[]});
    threads.get(id).messages.push(message);
  });
  return {threads:[...threads.values()], messages:rows.length};
}
