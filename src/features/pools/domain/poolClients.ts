import type { ClientDirectoryEntry } from '../ports';

export function resolveClientName(
  clients: ClientDirectoryEntry[],
  clientId?: string
): string | undefined {
  if (!clientId) return undefined;
  const c = clients.find((x) => x.id === clientId || (x as { uid?: string }).uid === clientId);
  return c?.name;
}
