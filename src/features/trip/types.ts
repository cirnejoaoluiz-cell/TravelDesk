import type { Trip } from '../../domain/types';

/** Props comuns a todas as abas da viagem. */
export interface TabProps {
  trip: Trip;
  update(updater: (trip: Trip) => Trip): Promise<boolean>;
}
