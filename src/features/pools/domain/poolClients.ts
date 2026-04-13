import type { ClientDirectoryEntry } from '../ports';

function directoryEntryMatchesClientRef(c: ClientDirectoryEntry, clientId: string): boolean {
  return c.id === clientId || (c as { uid?: string }).uid === clientId;
}

export function resolveClientName(
  clients: ClientDirectoryEntry[],
  clientId?: string
): string | undefined {
  if (!clientId) return undefined;
  const c = clients.find((x) => directoryEntryMatchesClientRef(x, clientId));
  return c?.name;
}

/** Firestore `users` doc id to use in pool `clientId` and in `<select value>` when the pool still stores a legacy uid match. */
export function resolveClientDirectoryDocId(
  clients: ClientDirectoryEntry[],
  poolClientId?: string
): string {
  if (!poolClientId) return '';
  const c = clients.find((x) => directoryEntryMatchesClientRef(x, poolClientId));
  return c?.id ?? poolClientId;
}

export function isPoolClientInDirectory(clients: ClientDirectoryEntry[], poolClientId?: string): boolean {
  if (!poolClientId) return false;
  return clients.some((x) => directoryEntryMatchesClientRef(x, poolClientId));
}
