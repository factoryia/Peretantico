import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export type ScenarioLogStep = {
  input: string;
  expected: unknown;
  actual: unknown;
  pass: boolean;
};

export type ScenarioLog = {
  scenario: string;
  steps: ScenarioLogStep[];
};

const OUTPUT_DIR = join(process.cwd(), ".atl", "test-logs");

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function writeScenarioLog(log: ScenarioLog): string {
  mkdirSync(OUTPUT_DIR, { recursive: true });
  const filePath = join(OUTPUT_DIR, `${slugify(log.scenario)}.json`);
  writeFileSync(filePath, `${JSON.stringify(log, null, 2)}\n`, "utf8");
  return filePath;
}

export function createScenarioRecorder(scenario: string) {
  const steps: ScenarioLogStep[] = [];

  return {
    push(step: ScenarioLogStep) {
      steps.push(step);
    },
    flush() {
      return writeScenarioLog({ scenario, steps });
    },
  };
}
