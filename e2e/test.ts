import { test as base, expect } from "@playwright/test";
import { loadRecording, replayNetwork, type ReplayOptions } from "./network";

type Fixtures = {
  /** Options de rejeu à surcharger par test (test.use). */
  replay: ReplayOptions;
  /** Requêtes jouées sans réponse enregistrée exacte. */
  networkMisses: string[];
};

/**
 * Recule l'horloge des pages à l'heure de l'enregistrement, en la laissant
 * avancer. page.clock ne convient pas : il remplace aussi performance, dont
 * l'appli lit les ressources chargées pour le service worker.
 */
function shiftClock(startAt: number) {
  const RealDate = Date;
  const offset = startAt - RealDate.now();
  class ShiftedDate extends RealDate {
    constructor(...args: unknown[]) {
      if (args.length === 0) super(RealDate.now() + offset);
      else super(...(args as [string]));
    }
    static now() {
      return RealDate.now() + offset;
    }
  }
  globalThis.Date = ShiftedDate as DateConstructor;
}

/**
 * Contexte commun : fuseau et langue de l'enregistrement, horloge reculée à
 * une minute après celui-ci, réseau externe rejoué, service worker bloqué (les
 * tests hors ligne le réactivent).
 */
export const test = base.extend<Fixtures>({
  replay: [{}, { option: true }],
  timezoneId: "Europe/Paris",
  locale: "fr-FR",
  serviceWorkers: "block",
  // auto : actif dans chaque test, même s'il ne lit pas networkMisses.
  networkMisses: [
    async ({ context, replay }, use) => {
      const { recording, misses } = await replayNetwork(context, replay);
      await context.addInitScript(shiftClock, new Date(recording.recordedAt).getTime() + 60_000);
      await use(misses);
    },
    { auto: true },
  ],
});

export { expect, loadRecording };

/** Ville du lien partagé utilisé dans plusieurs tests. */
export const NICE_URL = "/?ville=Nice&lat=43.7034&lon=7.2663&cp=06000&dep=06&pays=FR";
