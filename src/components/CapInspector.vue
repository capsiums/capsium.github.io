<script setup lang="ts">
import { computed, ref } from 'vue';
import { strFromU8, unzipSync } from 'fflate';

interface CheckResult {
  path: string;
  status: 'verified' | 'mismatch' | 'missing';
}

interface Inspection {
  fileName: string;
  fileSize: number;
  entryCount: number;
  metadata: Record<string, unknown> | null;
  metadataPretty: string;
  routeCount: number | null;
  manifestCount: number | null;
  datasetCount: number | null;
  algorithm: string | null;
  checks: CheckResult[];
  uncoveredCount: number;
  signed: boolean;
}

const dragging = ref(false);
const busy = ref(false);
const error = ref<string | null>(null);
const result = ref<Inspection | null>(null);
const announced = ref('');

let dragDepth = 0;

const verifiedCount = computed(
  () => result.value?.checks.filter((c) => c.status === 'verified').length ?? 0,
);
const failedCount = computed(
  () =>
    result.value?.checks.filter((c) => c.status !== 'verified').length ?? 0,
);
const integrityState = computed<'none' | 'ok' | 'failed'>(() => {
  if (!result.value || result.value.algorithm === null) return 'none';
  return failedCount.value === 0 ? 'ok' : 'failed';
});

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function readJson(files: Record<string, Uint8Array>, name: string): unknown | null {
  const data = files[name];
  if (!data) return null;
  try {
    return JSON.parse(strFromU8(data));
  } catch {
    return null;
  }
}

async function inspect(file: File) {
  error.value = null;
  result.value = null;
  busy.value = true;
  announced.value = `Inspecting ${file.name}…`;

  try {
    let files: Record<string, Uint8Array>;
    try {
      files = unzipSync(new Uint8Array(await file.arrayBuffer()));
    } catch {
      throw new Error('This file is not a readable ZIP archive — a .cap package is a ZIP at heart.');
    }

    for (const key of Object.keys(files)) {
      if (key.endsWith('/')) delete files[key];
    }

    const metadata = readJson(files, 'metadata.json') as Record<string, unknown> | null;
    if (!metadata) {
      throw new Error('No metadata.json found — this ZIP is not a Capsium package.');
    }

    const manifest = readJson(files, 'manifest.json') as
      | { content?: unknown[] }
      | null;
    const routes = readJson(files, 'routes.json') as
      | { routes?: unknown[] }
      | null;
    const storage = readJson(files, 'storage.json') as
      | { datasets?: unknown[] }
      | null;
    const security = readJson(files, 'security.json') as
      | {
          security?: {
            integrityChecks?: { checksumAlgorithm?: string; checksums?: Record<string, string> };
            digitalSignatures?: { publicKey?: string; signatureFile?: string };
          };
        }
      | null;

    const integrity = security?.security?.integrityChecks ?? null;
    const checks: CheckResult[] = [];
    const covered = new Set<string>();

    if (integrity?.checksums) {
      const entries = Object.entries(integrity.checksums);
      if (window.crypto?.subtle) {
        for (const [path, expected] of entries) {
          covered.add(path);
          const data = files[path];
          if (!data) {
            checks.push({ path, status: 'missing' });
            continue;
          }
          const digest = await window.crypto.subtle.digest('SHA-256', data.slice().buffer);
          checks.push({
            path,
            status: toHex(digest) === String(expected).toLowerCase() ? 'verified' : 'mismatch',
          });
        }
      } else {
        throw new Error(
          'This browser context cannot run SHA-256 (WebCrypto needs HTTPS or localhost), so integrity cannot be verified here.',
        );
      }
    }

    checks.sort((a, b) => a.path.localeCompare(b.path));

    result.value = {
      fileName: file.name,
      fileSize: file.size,
      entryCount: Object.keys(files).length,
      metadata,
      metadataPretty: JSON.stringify(metadata, null, 2),
      routeCount: Array.isArray(routes?.routes) ? routes.routes.length : null,
      manifestCount: Array.isArray(manifest?.content) ? manifest.content.length : null,
      datasetCount: Array.isArray(storage?.datasets) ? storage.datasets.length : null,
      algorithm: integrity?.checksumAlgorithm ?? null,
      checks,
      uncoveredCount: Object.keys(files).filter(
        (name) => name !== 'security.json' && !covered.has(name),
      ).length,
      signed: Boolean(security?.security?.digitalSignatures?.signatureFile),
    };

    announced.value =
      integrityState.value === 'ok'
        ? `${file.name}: integrity verified, ${checks.length} files checked.`
        : integrityState.value === 'failed'
          ? `${file.name}: integrity check failed for ${failedCount.value} file(s).`
          : `${file.name}: package read, no security.json present.`;
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Could not read this file.';
    announced.value = error.value;
  } finally {
    busy.value = false;
    dragging.value = false;
    dragDepth = 0;
  }
}

function onDrop(event: DragEvent) {
  dragging.value = false;
  dragDepth = 0;
  const file = event.dataTransfer?.files?.[0];
  if (file) void inspect(file);
}

function onPick(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (file) void inspect(file);
  input.value = '';
}

function reset() {
  result.value = null;
  error.value = null;
  announced.value = '';
}
</script>

<template>
  <div>
    <p class="sr-only" aria-live="polite">{{ announced }}</p>

    <!-- Drop zone -->
    <label
      v-if="!result"
      class="group relative flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-16 text-center transition-all duration-200 sm:py-20"
      :class="
        dragging
          ? 'border-glow bg-primary/10 shadow-xl shadow-primary/20'
          : 'border-ink/20 bg-white/50 hover:border-primary/50 hover:bg-primary/5 dark:border-white/15 dark:bg-white/[0.03] dark:hover:border-glow/50 dark:hover:bg-primary/10'
      "
      @dragenter.prevent="dragDepth += 1; dragging = true"
      @dragover.prevent
      @dragleave.prevent="dragDepth -= 1; if (dragDepth <= 0) { dragging = false; dragDepth = 0; }"
      @drop.prevent="onDrop"
    >
      <input type="file" accept=".cap,.zip,application/zip" class="sr-only" @change="onPick" />
      <span
        class="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-transform duration-200 group-hover:scale-105 dark:bg-glow/10 dark:text-glow"
      >
        <svg v-if="!busy" class="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M12 3v12m0-12 4 4m-4-4-4 4" />
          <path d="M4 15v3a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-3" />
        </svg>
        <svg v-else class="h-7 w-7 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
          <path d="M21 12a9 9 0 1 1-6.2-8.56" />
        </svg>
      </span>
      <span class="mt-5 font-display text-lg font-semibold text-ink dark:text-white">
        {{ busy ? 'Inspecting package…' : 'Drop a .cap package here' }}
      </span>
      <span class="mt-1.5 text-sm text-ink/60 dark:text-cream/55">
        or <span class="font-semibold text-primary underline underline-offset-2 dark:text-glow">choose a file</span>
        — parsed entirely in your browser
      </span>
      <span class="mt-3 font-mono text-xs text-ink/45 dark:text-cream/40">
        metadata.json · manifest.json · routes.json · storage.json · security.json
      </span>
    </label>

    <!-- Error -->
    <div
      v-if="error"
      class="mt-4 flex items-start gap-3 rounded-xl border border-pepper/40 bg-pepper/10 px-4 py-3.5 text-sm text-pepper"
      role="alert"
    >
      <svg class="mt-0.5 h-4.5 w-4.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 8v4m0 4h.01" />
      </svg>
      <p>{{ error }}</p>
    </div>

    <!-- Results -->
    <div v-if="result" class="space-y-6">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div class="min-w-0">
          <p class="truncate font-mono text-lg font-semibold text-ink dark:text-white">
            {{ result.fileName }}
          </p>
          <p class="mt-1 text-sm text-ink/60 dark:text-cream/55">
            {{ formatSize(result.fileSize) }} · {{ result.entryCount }} files inside
          </p>
        </div>
        <div class="flex items-center gap-3">
          <span
            v-if="integrityState === 'ok'"
            class="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary dark:border-glow/40 dark:text-glow"
          >
            <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
              <path d="m9 12 2 2 4-4" />
            </svg>
            Integrity verified
          </span>
          <span
            v-else-if="integrityState === 'failed'"
            class="inline-flex items-center gap-1.5 rounded-full border border-pepper/50 bg-pepper/10 px-3 py-1.5 text-xs font-semibold text-pepper"
          >
            <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M12 9v4m0 4h.01" />
              <path d="M10.3 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.7 3.86a2 2 0 0 0-3.4 0Z" />
            </svg>
            Integrity check failed
          </span>
          <span
            v-else
            class="inline-flex items-center gap-1.5 rounded-full border border-sun/40 bg-sun/10 px-3 py-1.5 text-xs font-semibold text-sun"
          >
            No security.json — unsigned
          </span>
          <button
            type="button"
            class="rounded-full border border-ink/15 px-4 py-1.5 text-xs font-semibold text-ink/70 transition-colors hover:border-primary/50 hover:text-primary dark:border-white/15 dark:text-cream/70 dark:hover:border-glow/50 dark:hover:text-glow"
            @click="reset"
          >
            Inspect another
          </button>
        </div>
      </div>

      <!-- Stat cards -->
      <dl class="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div class="rounded-xl border border-ink/10 bg-white p-4 dark:border-white/10 dark:bg-white/[0.04]">
          <dt class="text-xs font-medium uppercase tracking-wider text-ink/50 dark:text-cream/45">Package</dt>
          <dd class="mt-1.5 truncate font-mono text-sm font-semibold text-ink dark:text-white">
            {{ result.metadata.name ?? '—' }}
            <span class="text-ink/50 dark:text-cream/50">v{{ result.metadata.version ?? '?' }}</span>
          </dd>
        </div>
        <div class="rounded-xl border border-ink/10 bg-white p-4 dark:border-white/10 dark:bg-white/[0.04]">
          <dt class="text-xs font-medium uppercase tracking-wider text-ink/50 dark:text-cream/45">Routes</dt>
          <dd class="mt-1.5 font-mono text-sm font-semibold text-ink dark:text-white">
            {{ result.routeCount ?? '—' }}
          </dd>
        </div>
        <div class="rounded-xl border border-ink/10 bg-white p-4 dark:border-white/10 dark:bg-white/[0.04]">
          <dt class="text-xs font-medium uppercase tracking-wider text-ink/50 dark:text-cream/45">Manifest files</dt>
          <dd class="mt-1.5 font-mono text-sm font-semibold text-ink dark:text-white">
            {{ result.manifestCount ?? '—' }}
          </dd>
        </div>
        <div class="rounded-xl border border-ink/10 bg-white p-4 dark:border-white/10 dark:bg-white/[0.04]">
          <dt class="text-xs font-medium uppercase tracking-wider text-ink/50 dark:text-cream/45">Datasets</dt>
          <dd class="mt-1.5 font-mono text-sm font-semibold text-ink dark:text-white">
            {{ result.datasetCount ?? '—' }}
          </dd>
        </div>
      </dl>

      <div class="grid gap-6 lg:grid-cols-2">
        <!-- metadata.json -->
        <div class="code-block max-h-80 overflow-auto">
          <p class="mb-3 font-display text-xs font-semibold uppercase tracking-wider text-glow">
            metadata.json
          </p>
          <pre class="text-[13px] leading-relaxed">{{ result.metadataPretty }}</pre>
        </div>

        <!-- Integrity details -->
        <div class="rounded-xl border border-ink/10 bg-white p-5 dark:border-white/10 dark:bg-white/[0.04]">
          <p class="font-display text-xs font-semibold uppercase tracking-wider text-ink/50 dark:text-cream/45">
            Integrity — {{ result.algorithm ?? 'not covered' }}
          </p>
          <template v-if="result.algorithm">
            <p class="mt-2 text-sm text-ink/65 dark:text-cream/60">
              {{ verifiedCount }} of {{ result.checks.length }} checksummed files verified
              <template v-if="result.uncoveredCount > 0">
                · {{ result.uncoveredCount }} file(s) not covered by checksums
              </template>
              <template v-if="result.signed"> · digitally signed</template>
            </p>
            <ul class="mt-3 max-h-56 space-y-1 overflow-auto pr-1 font-mono text-xs">
              <li
                v-for="check in result.checks"
                :key="check.path"
                class="flex items-center gap-2 rounded-md px-2 py-1"
                :class="check.status === 'verified' ? 'text-ink/60 dark:text-cream/55' : 'bg-pepper/10 text-pepper'"
              >
                <svg v-if="check.status === 'verified'" class="h-3.5 w-3.5 shrink-0 text-primary dark:text-glow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
                <svg v-else class="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
                <span class="truncate">{{ check.path }}</span>
                <span v-if="check.status !== 'verified'" class="ml-auto shrink-0 font-sans font-semibold uppercase">
                  {{ check.status }}
                </span>
              </li>
            </ul>
          </template>
          <p v-else class="mt-2 text-sm leading-relaxed text-ink/65 dark:text-cream/60">
            This package carries no <code class="font-mono">security.json</code>, so a
            reactor has no checksums to verify. Pack it with the current Capsium
            CLI to get SHA-256 integrity built in.
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
