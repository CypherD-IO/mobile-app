/**
 * Human-readable summaries for Cosmos sign-review (no raw JSON dumps).
 */

type Row = { label: string; value: string };

export function shortCosmosAddr(addr: string, head = 10, tail = 6): string {
  if (!addr || addr.length <= head + tail + 1) return addr;
  return `${addr.slice(0, head)}…${addr.slice(-tail)}`;
}

const shortAddr = shortCosmosAddr;

function formatDenom(denom: string): string {
  if (!denom) return '—';
  if (denom.startsWith('ibc/')) {
    const h = denom.slice(4);
    if (h.length <= 14) return `IBC / ${h}`;
    return `IBC / ${h.slice(0, 8)}…${h.slice(-4)}`;
  }
  return denom.toUpperCase();
}

function tryParseJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/** Parse memo if it's JSON or nested JSON strings (common on Skip routes). */
function parseMemoLoose(memo: unknown): unknown {
  if (memo == null) return null;
  if (typeof memo !== 'string' || memo.length === 0) return null;
  let cur: unknown = memo;
  for (let i = 0; i < 3; i++) {
    if (typeof cur !== 'string') break;
    const next = tryParseJson(cur);
    if (next == null) break;
    cur = next;
  }
  return cur;
}

function collectMemoHints(obj: unknown, maxDepth = 6): string[] {
  const hints: string[] = [];
  const seen = new Set<unknown>();

  function walk(node: unknown, depth: number) {
    if (depth > maxDepth || node == null) return;
    if (typeof node !== 'object') return;
    if (seen.has(node)) return;
    seen.add(node);

    if (Array.isArray(node)) {
      node.forEach(item => walk(item, depth + 1));
      return;
    }

    const rec = node as Record<string, unknown>;

    if (rec.ACTION_FEE && typeof rec.ACTION_FEE === 'object') {
      const af = rec.ACTION_FEE as Record<string, unknown>;
      const amt = af.amount != null ? String(af.amount) : '';
      const to = af.recipient_address != null ? shortAddr(String(af.recipient_address), 8, 4) : '';
      if (amt) hints.push(`Relay / action fee: ${amt}${to ? ` (to ${to})` : ''}`);
    }

    if (typeof rec.protocol === 'string' && rec.protocol) {
      hints.push(`Protocol: ${rec.protocol}`);
    }

    const s = JSON.stringify(rec);
    if (s.includes('PROTOCOL_CCTP') || s.includes('CCTP')) {
      hints.push('Uses CCTP (cross-chain USDC)');
    }
    if (s.includes('swap_and_action') || s.includes('swap_exact')) {
      hints.push('Includes a swap step on the destination chain');
    }
    if (rec.wasm && typeof rec.wasm === 'object') {
      hints.push('CosmWasm contract call in route');
    }
    if (Array.isArray(rec.pre_actions) && rec.pre_actions.length > 0) {
      hints.push(`${rec.pre_actions.length} preparatory action(s) in route`);
    }

    for (const v of Object.values(rec)) {
      if (v != null && typeof v === 'object') walk(v, depth + 1);
    }
  }

  walk(obj, 0);
  return [...new Set(hints)].slice(0, 6);
}

function summarizeMsgTransfer(
  body: Record<string, unknown>,
  chainId: string,
): { rows: Row[]; narrative: string; oneLiner: string } {
  const token = (body.token as Record<string, unknown>) || {};
  const amount = token.amount != null ? String(token.amount) : '—';
  const denom = formatDenom(token.denom != null ? String(token.denom) : '');
  const port = body.source_port != null ? String(body.source_port) : 'transfer';
  const channel = body.source_channel != null ? String(body.source_channel) : '—';
  const sender = body.sender != null ? String(body.sender) : '';
  const receiver = body.receiver != null ? String(body.receiver) : '';

  const memoHints: string[] = [];
  const memoParsed = parseMemoLoose(body.memo);
  if (memoParsed != null && typeof memoParsed === 'object') {
    memoHints.push(...collectMemoHints(memoParsed));
  } else if (typeof body.memo === 'string' && body.memo.length > 0) {
    const m = body.memo;
    if (m.includes('CCTP') || m.includes('cctp')) memoHints.push('Uses CCTP (cross-chain USDC)');
    if (m.includes('wasm') || m.includes('swap')) memoHints.push('Includes swap or contract logic in IBC memo');
  }

  const rows: Row[] = [
    { label: 'Action', value: 'IBC transfer' },
    { label: 'Channel', value: `${port} / ${channel}` },
    { label: 'Amount (raw)', value: amount },
    { label: 'Token', value: denom },
    { label: 'From', value: shortAddr(sender) },
    { label: 'To', value: shortAddr(receiver) },
  ];

  memoHints.forEach((h, i) =>
    rows.push({ label: i === 0 ? 'Route notes' : `Route note ${i + 1}`, value: h }),
  );

  const narrative = [
    `You are signing an IBC transfer on ${chainId}: send ${amount} units of ${denom} through ${channel} to ${shortAddr(receiver, 12, 6)}.`,
    memoHints.length > 0 ? `Route notes: ${memoHints.join(' · ')}` : null,
  ]
    .filter(Boolean)
    .join('\n\n');

  const oneLiner = `Send ${amount} ${denom} via ${channel} → ${shortAddr(receiver)}`;

  return { rows, narrative, oneLiner };
}

function summarizeBankSend(body: Record<string, unknown>): { rows: Row[]; narrative: string; oneLiner: string } {
  const rows: Row[] = [{ label: 'Action', value: 'Bank send' }];
  let amount = '—';
  let denom = '';
  let from = '';
  let toAddr = '';

  // Standard bank MsgSend (from_address / to_address / amount[])
  const fa = body.from_address;
  const ta = body.to_address;
  const amtArr = body.amount as unknown[] | undefined;
  if (typeof fa === 'string' && fa) from = fa;
  if (typeof ta === 'string' && ta) toAddr = ta;
  if (Array.isArray(amtArr) && amtArr[0] && typeof amtArr[0] === 'object') {
    const c = amtArr[0] as { denom?: string; amount?: string };
    amount = c.amount != null ? String(c.amount) : '—';
    denom = formatDenom(c.denom != null ? String(c.denom) : '');
  }

  // x/bank multi-send style (inputs / outputs)
  if (!from || !toAddr) {
    const inputs = body.inputs as unknown[] | undefined;
    const outputs = body.outputs as unknown[] | undefined;
    if (!from && Array.isArray(inputs) && inputs[0] && typeof inputs[0] === 'object') {
      from = String((inputs[0] as { address?: string }).address ?? '');
    }
    if (!toAddr && Array.isArray(outputs) && outputs[0] && typeof outputs[0] === 'object') {
      const o = outputs[0] as { address?: string; coins?: unknown[] };
      if (o.address) toAddr = o.address;
      if (!denom && Array.isArray(o.coins) && o.coins[0] && typeof o.coins[0] === 'object') {
        const c = o.coins[0] as { denom?: string; amount?: string };
        amount = c.amount != null ? String(c.amount) : amount;
        denom = formatDenom(c.denom != null ? String(c.denom) : '');
      }
    }
  }

  if (from) rows.push({ label: 'From', value: shortAddr(from) });
  if (toAddr) rows.push({ label: 'To', value: shortAddr(toAddr) });
  if (denom) {
    rows.push({ label: 'Amount', value: amount }, { label: 'Denom', value: denom });
  }

  const oneLiner =
    toAddr && denom
      ? `Send ${amount} ${denom} → ${shortAddr(toAddr)}`
      : toAddr
        ? `Bank send → ${shortAddr(toAddr)}`
        : 'Bank send';
  return {
    rows,
    narrative: 'You are signing a native bank send on this chain.',
    oneLiner,
  };
}

function summarizeWasmExecute(body: Record<string, unknown>): { rows: Row[]; narrative: string; oneLiner: string } {
  const contract = body.contract != null ? String(body.contract) : '—';
  const sender = body.sender != null ? String(body.sender) : '';
  const msg = body.msg;
  let action = 'Contract execution';
  if (typeof msg === 'string') {
    const p = tryParseJson(msg);
    if (p && typeof p === 'object') {
      const keys = Object.keys(p as object);
      if (keys.length === 1) action = keys[0].replace(/_/g, ' ');
    }
  } else if (msg && typeof msg === 'object') {
    const keys = Object.keys(msg as object);
    if (keys.length === 1) action = keys[0].replace(/_/g, ' ');
  }

  const rows: Row[] = [
    { label: 'Action', value: action },
    { label: 'Contract', value: shortAddr(contract, 14, 6) },
  ];
  if (sender) rows.push({ label: 'Sender', value: shortAddr(sender) });

  return {
    rows,
    narrative: `You are signing a CosmWasm transaction targeting contract ${shortAddr(contract, 12, 6)} (${action}).`,
    oneLiner: `${action} @ ${shortAddr(contract, 8, 4)}`,
  };
}

function humanType(typeUrl: string): string {
  const base = typeUrl.split('.').pop() ?? typeUrl;
  return base.replace(/^Msg/, '').replace(/([A-Z])/g, ' $1').trim() || typeUrl;
}

/** Compact amount + counterparty for inline bridge sign UI. */
export type CosmosInlineSignDetail = {
  messageType: string;
  amountLabel: string;
  amountValue: string;
  recipientLabel?: string;
  recipientValue?: string;
};

export function buildCosmosInlineSignDetail(
  msgTypeUrl: string,
  rawMsg: string,
): CosmosInlineSignDetail {
  const parsed = tryParseJson(rawMsg);
  if (!parsed || typeof parsed !== 'object') {
    return {
      messageType: humanType(msgTypeUrl),
      amountLabel: 'Details',
      amountValue: 'Could not read this message',
    };
  }

  const body = parsed as Record<string, unknown>;

  if (msgTypeUrl.includes('MsgTransfer') || msgTypeUrl.includes('transfer.v1.MsgTransfer')) {
    const token = (body.token as Record<string, unknown>) || {};
    const amount = token.amount != null ? String(token.amount) : '—';
    const denom = formatDenom(token.denom != null ? String(token.denom) : '');
    const channel = body.source_channel != null ? String(body.source_channel) : '';
    const receiver = body.receiver != null ? String(body.receiver) : '';
    const channelBit = channel ? ` · ${channel}` : '';
    return {
      messageType: 'IBC transfer',
      amountLabel: 'Amount',
      amountValue: `${amount} ${denom}${channelBit}`,
      recipientLabel: 'To',
      recipientValue: receiver ? shortAddr(receiver, 14, 10) : '—',
    };
  }

  if (msgTypeUrl.includes('MsgSend') && msgTypeUrl.includes('bank')) {
    const s = summarizeBankSend(body);
    const toRow = s.rows.find(r => r.label === 'To');
    const amountRow = s.rows.find(r => r.label === 'Amount');
    const denomRow = s.rows.find(r => r.label === 'Denom');
    const amtCombined =
      amountRow && denomRow ? `${amountRow.value} ${denomRow.value}` : s.oneLiner;
    return {
      messageType: 'Bank send',
      amountLabel: 'Amount',
      amountValue: amtCombined,
      recipientLabel: toRow ? 'To' : undefined,
      recipientValue: toRow?.value,
    };
  }

  if (msgTypeUrl.includes('MsgExecuteContract')) {
    const s = summarizeWasmExecute(body);
    const contractRow = s.rows.find(r => r.label === 'Contract');
    const actionRow = s.rows.find(r => r.label === 'Action');
    return {
      messageType: 'CosmWasm',
      amountLabel: 'Action',
      amountValue: actionRow?.value ?? 'Contract call',
      recipientLabel: 'Contract',
      recipientValue: contractRow?.value,
    };
  }

  return {
    messageType: humanType(msgTypeUrl),
    amountLabel: 'Details',
    amountValue: 'Complex message — confirm only if you trust this route',
  };
}

/**
 * Build summary rows + short narrative for one cosmos message.
 */
export function summarizeCosmosMessage(
  msgTypeUrl: string,
  rawMsg: string,
  chainId: string,
): { shortTitle: string; rows: Row[]; narrative: string; oneLiner: string } {
  const parsed = tryParseJson(rawMsg);
  if (!parsed || typeof parsed !== 'object') {
    return {
      shortTitle: humanType(msgTypeUrl),
      rows: [{ label: 'Type', value: msgTypeUrl }],
      narrative:
        'We could not parse this message. Only sign if you trust this bridge route.',
      oneLiner: humanType(msgTypeUrl),
    };
  }

  const body = parsed as Record<string, unknown>;

  if (msgTypeUrl.includes('MsgTransfer') || msgTypeUrl.includes('transfer.v1.MsgTransfer')) {
    const s = summarizeMsgTransfer(body, chainId);
    return { shortTitle: 'IBC transfer', rows: s.rows, narrative: s.narrative, oneLiner: s.oneLiner };
  }

  if (msgTypeUrl.includes('MsgSend') && msgTypeUrl.includes('bank')) {
    const s = summarizeBankSend(body);
    return { shortTitle: 'Bank send', rows: s.rows, narrative: s.narrative, oneLiner: s.oneLiner };
  }

  if (msgTypeUrl.includes('MsgExecuteContract')) {
    const s = summarizeWasmExecute(body);
    return { shortTitle: 'CosmWasm', rows: s.rows, narrative: s.narrative, oneLiner: s.oneLiner };
  }

  const keys = Object.keys(body).slice(0, 5);
  return {
    shortTitle: humanType(msgTypeUrl),
    rows: [
      { label: 'Message type', value: msgTypeUrl.split('/').pop() ?? msgTypeUrl },
      ...keys.map(k => ({
        label: k.replace(/_/g, ' '),
        value:
          typeof body[k] === 'object'
            ? '(complex)'
            : String(body[k]).slice(0, 120),
      })),
    ],
    narrative: `You are signing ${humanType(msgTypeUrl)} on ${chainId}. Confirm only if you trust this route.`,
    oneLiner: humanType(msgTypeUrl),
  };
}
