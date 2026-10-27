import { normalizeTrip } from '../domain/factories';
import type { ID, Trip } from '../domain/types';
import type { ClaudeDb, ClaudeDbError, CollectionRef } from '../platform/claude';
import { StorageQuotaError, type TripRepository } from './TripRepository';

/**
 * Persistência no banco do Artifact do claude.ai (capability `db`).
 *
 * Cada pessoa tem uma coleção privada `data/users/<id>`, com:
 * - um documento por viagem (`trip-<id>`, kind "trip");
 * - a capa em documento separado (`cover-<id>`, kind "cover"), porque cada
 *   documento aceita no máximo 256 KiB.
 * Os dados ficam na conta da pessoa e aparecem em qualquer dispositivo.
 */
export class ClaudeDbTripRepository implements TripRepository {
  private readonly col: CollectionRef;
  /** Uma gravação por vez em cada documento, como o banco recomenda. */
  private readonly queues = new Map<string, Promise<unknown>>();
  /** Última capa gravada por viagem, para não reenviar a imagem a cada alteração. */
  private readonly lastCover = new Map<string, string | null>();

  constructor(db: ClaudeDb, userId: string) {
    this.col = db.collection(`data/users/${userId}`);
  }

  private enqueue<T>(docId: string, task: () => Promise<T>): Promise<T> {
    const previous = this.queues.get(docId) ?? Promise.resolve();
    const next = previous.catch(() => undefined).then(task);
    this.queues.set(docId, next);
    return next;
  }

  async list(): Promise<Trip[]> {
    const [trips, covers] = await Promise.all([
      this.col.where('kind', '==', 'trip').get(),
      this.col.where('kind', '==', 'cover').get(),
    ]).catch(rethrow);
    const coverById = new Map<string, string>();
    for (const doc of covers.docs) {
      const body = doc.data();
      if (body && typeof body.tripId === 'string' && typeof body.image === 'string') coverById.set(body.tripId, body.image);
    }
    const list = trips.docs
      .map((doc) => doc.data()?.trip as Trip | undefined)
      .filter((t): t is Trip => Boolean(t))
      .map((t) => normalizeTrip({ ...t, coverImage: coverById.get(t.id) ?? null } as never));
    for (const t of list) this.lastCover.set(t.id, t.coverImage);
    return list;
  }

  async get(id: ID): Promise<Trip | null> {
    return (await this.list()).find((t) => t.id === id) ?? null;
  }

  async save(trip: Trip): Promise<Trip> {
    const saved = { ...trip, updatedAt: new Date().toISOString() };
    const { coverImage, ...rest } = saved;
    await Promise.all([
      this.enqueue(`trip-${trip.id}`, () =>
        this.col.doc(`trip-${trip.id}`).set({ kind: 'trip', trip: { ...rest, coverImage: null } }),
      ),
      this.saveCover(trip.id, coverImage),
    ]).catch(rethrow);
    return saved;
  }

  private async saveCover(tripId: ID, image: string | null) {
    if (this.lastCover.has(tripId) && this.lastCover.get(tripId) === image) return;
    const ref = this.col.doc(`cover-${tripId}`);
    await this.enqueue(`cover-${tripId}`, () => (image ? ref.set({ kind: 'cover', tripId, image }) : ref.delete()));
    this.lastCover.set(tripId, image);
  }

  async remove(id: ID): Promise<void> {
    await Promise.all([
      this.enqueue(`trip-${id}`, () => this.col.doc(`trip-${id}`).delete()),
      this.enqueue(`cover-${id}`, () => this.col.doc(`cover-${id}`).delete()),
    ]).catch(rethrow);
    this.lastCover.delete(id);
  }

  async replaceAll(trips: Trip[]): Promise<void> {
    const current = await this.list();
    for (const trip of current) {
      if (!trips.some((t) => t.id === trip.id)) await this.remove(trip.id);
    }
    for (const trip of trips) await this.save(normalizeTrip(trip as never));
  }
}

function rethrow(error: unknown): never {
  const code = (error as ClaudeDbError | undefined)?.code;
  if (code === 'quota_exceeded') throw new StorageQuotaError();
  if (code === 'invalid_argument') {
    throw new Error('Não foi possível salvar: esta viagem ficou grande demais. Tente uma imagem de capa menor.');
  }
  if (code === 'revoked' || code === 'not_granted') {
    throw new Error('Você não tem permissão para salvar alterações nesta página.');
  }
  throw new Error('Não foi possível salvar agora. Verifique a conexão e tente de novo.');
}
