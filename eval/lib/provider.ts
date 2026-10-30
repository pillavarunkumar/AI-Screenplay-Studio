import type {
  NextLinesOutput,
  ShotListOutput,
} from "../../src/lib/schemas/scene";
import type { EvalSample } from "./samples";

export const EVAL_FEATURES = ["nextLines", "shotList"] as const;

export type EvalFeature = (typeof EVAL_FEATURES)[number];

export interface EvalOutputs {
  nextLines: NextLinesOutput;
  shotList: ShotListOutput;
}

/**
 * A provider only needs to answer the two scene features the eval measures.
 * Keeping this interface small makes it trivial to swap the deterministic stub
 * for the live `/api/llm` endpoint.
 */
export interface EvalProvider {
  readonly name: string;
  readonly model?: string;
  runNextLines(sample: EvalSample): Promise<NextLinesOutput>;
  runShotList(sample: EvalSample): Promise<ShotListOutput>;
}
