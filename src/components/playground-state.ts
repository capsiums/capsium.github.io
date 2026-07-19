import { reactive } from 'vue';

/**
 * Shared playground state between the two islands on /playground:
 * CapInspector publishes every successfully parsed package, CapLiveServing
 * consumes it for the "Serve live" flow. In the other direction, the
 * serving card hands the inspector a File to inspect (the sample package).
 * Both islands share the page's module graph, so this reactive object is
 * a singleton across them.
 */
export interface ParsedPackage {
  name: string;
  file: File;
}

export const playgroundState = reactive<{
  /** Last successfully parsed package (from drop, picker, or sample). */
  parsed: ParsedPackage | null;
  /** One-shot request for the inspector to parse this File (sample flow). */
  inspectRequest: File | null;
  /** Last parse failure message, so the sample flow can surface it too. */
  lastError: string | null;
}>({
  parsed: null,
  inspectRequest: null,
  lastError: null,
});
