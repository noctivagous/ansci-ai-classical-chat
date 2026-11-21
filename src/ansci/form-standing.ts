/**
 * form-standing.ts — the standing register (Form programme,
 * 2026-11-20): a FormRegister with the holdings the design
 * note itself enters, composed from the three members.
 *
 * What stands in it, and what does not:
 *  - the named proportions the note holds — doubling and
 *    the half (form-proportions.ts, §4.2);
 *  - the known cycles — the generating and controlling
 *    cycles, the seasons, the dayparts — as pattern records
 *    citing the constants and conventions that already hold
 *    them (form-repetition.ts, §5.2);
 *  - NO preset canon. The note's §3.2 does not invent one
 *    and no §10 ruling has entered one, so the standing
 *    register's preset register stands empty and preset
 *    names decline D1 in it, exactly as designed.
 *
 * A bare `new FormRegister()` holds none of this — the
 * standing holdings are entered, with their provenance,
 * never smuggled in as defaults.
 */
import { FormRegister } from "./form";
import { enterStandingProportions } from "./form-proportions";
import { enterKnownCycles } from "./form-repetition";

export function standingFormRegister(now?: () => Date): FormRegister {
  const register = new FormRegister(now);
  enterStandingProportions(register);
  enterKnownCycles(register);
  return register;
}
