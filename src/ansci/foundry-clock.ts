// Foundry clock configuration (FND-200).
//
// Reads the optional `clock` key of a Foundry suite/run configuration and
// builds the session clock source it names. Only fixture clocks are
// supported: a pinned instant makes time-sensitive turns reproducible,
// and the report records the pinning. Anything else is rejected so an
// unpinned run can never pass as pinned.

import { FixtureClockSource, type ClockSource } from "./timekeeping";

export interface FoundryClockConfig {
  fixture?: {
    instant?: string;
    timezone?: string;
    name?: string;
  };
}

export interface FoundryClock {
  source: ClockSource;
  retrievedFrom: string;
  description: string;
}

export function clockFromConfig(configuration: {
  clock?: FoundryClockConfig;
}): FoundryClock | null {
  const clock = configuration.clock;
  if (clock === undefined) return null;
  if (!clock || typeof clock !== "object" || Array.isArray(clock)) {
    throw new Error("configuration.clock must be an object with a fixture key");
  }
  const fixture = clock.fixture;
  if (!fixture || typeof fixture !== "object" || Array.isArray(fixture)) {
    throw new Error("configuration.clock must be an object with a fixture key");
  }
  if (typeof fixture.instant !== "string" || Number.isNaN(Date.parse(fixture.instant))) {
    throw new Error("configuration.clock.fixture.instant must be an ISO date string");
  }
  const source = new FixtureClockSource(
    fixture.name ?? "foundry fixture clock",
    fixture.timezone ?? "UTC",
  );
  source.set(new Date(fixture.instant).toISOString());
  return {
    source,
    retrievedFrom: "foundry-configuration",
    description: `pinned fixture clock ${source.name} at ${fixture.instant}`,
  };
}
