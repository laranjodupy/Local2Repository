/**
 * Computes the YouTube API quota "day" a given instant falls into.
 *
 * The quota resets at midnight Pacific Time (docs/SPEC.md section 3: "O
 * reset ocorre à meia-noite do horário do Pacífico"). This returns a
 * YYYY-MM-DD string in that timezone, suitable as a key for local quota
 * counters (docs/SPEC.md section 9, QuotaGovernor).
 *
 * KNOWN LIMITATION (not verified in this session): this relies on
 * `Intl.DateTimeFormat` with a named IANA timeZone, which requires the JS
 * engine to ship full ICU timezone data. Node (used for these tests) has
 * this by default. Hermes — the engine React Native actually runs on
 * Android — may or may not, depending on how `expo-intl`/`hermes-engine`
 * bundles ICU for this Expo SDK version. The spec explicitly calls this out
 * (section 9: "Validar Intl com fuso no Hermes ou usar biblioteca de
 * datas."). This must be verified on-device in Fase 0 before relying on it;
 * if Hermes lacks full ICU, swap this for a date library (e.g. `date-fns-tz`
 * or `luxon`) instead of hand-rolled offset math.
 */
export function quotaDayKey(instant: Date): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Los_Angeles',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  // en-CA formats as YYYY-MM-DD, which is what we want as a sortable key.
  return formatter.format(instant);
}
