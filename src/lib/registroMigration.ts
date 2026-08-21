import { EntryRegistro, RegistroNota } from "../types";

/**
 * Normalizza flags.json al formato registro corrente (un EntryRegistro per
 * entryId, con `notes[]`). Il vecchio formato — una entry per ogni
 * "segnalazione" (id, entryId, note, status, createdAt) — può ancora
 * arrivare da GitHub finché il sito statico deployato non gira sul nuovo
 * codice: qui viene riconosciuto e raggruppato per entryId, così i dati
 * reali dei collaboratori non vengono mai persi né fanno crashare l'app.
 */
export function normalizeRegistro(raw: unknown): EntryRegistro[] {
  if (!Array.isArray(raw)) return [];
  const byEntry = new Map<string, EntryRegistro>();

  for (const item of raw) {
    if (!item || typeof item !== "object" || typeof (item as any).entryId !== "string") continue;
    const it = item as any;

    const nota: RegistroNota = Array.isArray(it.notes)
      ? null as any // handled below
      : {
          id: it.id || crypto.randomUUID(),
          author: typeof it.author === "string" ? it.author : "",
          testo: typeof it.note === "string" ? it.note : "",
          createdAt: it.createdAt || new Date().toISOString(),
        };

    const incomingNotes: RegistroNota[] = Array.isArray(it.notes) ? it.notes : [nota];
    const existing = byEntry.get(it.entryId);

    if (existing) {
      existing.notes.push(...incomingNotes);
      existing.entryLabel = it.entryLabel || existing.entryLabel;
      // Se una qualsiasi delle voci risulta ancora aperta, il registro resta aperto.
      if (it.status === "open" || existing.status === "open") {
        existing.status = "open";
        existing.resolvedAt = undefined;
      } else if (it.resolvedAt && (!existing.resolvedAt || it.resolvedAt > existing.resolvedAt)) {
        existing.resolvedAt = it.resolvedAt;
      }
      if (it.createdAt && it.createdAt < existing.createdAt) existing.createdAt = it.createdAt;
    } else {
      byEntry.set(it.entryId, {
        entryId: it.entryId,
        entryLabel: it.entryLabel || it.entryId,
        status: it.status === "resolved" ? "resolved" : "open",
        createdAt: it.createdAt || new Date().toISOString(),
        resolvedAt: it.status === "resolved" ? it.resolvedAt : undefined,
        notes: [...incomingNotes],
      });
    }
  }

  for (const registro of byEntry.values()) {
    registro.notes.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }
  return Array.from(byEntry.values());
}
