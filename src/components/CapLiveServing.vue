<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { playgroundState } from './playground-state';

/**
 * Live serving: registers the swsws service worker at scope
 * /playground/~serve/, installs the parsed .cap into it (transferable
 * postMessage), then previews the served site in an iframe and renders the
 * §7 introspection endpoints as pretty JSON panels. Stopping unregisters
 * the worker and drops its persisted package from the Cache API.
 */
const SW_SCRIPT = '/playground/sw.js';
const SERVE_BASE = '/playground/~serve/';
const SAMPLE_URL = '/packages/capsium-demo-0.1.0.cap';
const SAMPLE_NAME = 'capsium-demo-0.1.0.cap';
const CACHE_NAME = 'capsium-swsws';
const ENDPOINTS = ['metadata', 'routes', 'content-hashes', 'content-validity'] as const;

type Phase = 'idle' | 'installing' | 'serving';

interface InstallResult {
  ok: boolean;
  name?: string;
  version?: string;
  error?: string;
}

const phase = ref<Phase>('idle');
const error = ref<string | null>(null);
const announced = ref('');
const sampleBusy = ref(false);
const supported = ref(true); // corrected on mount; SSR assumes the common case
const secure = ref(true);
const servingName = ref<string | null>(null);
const servingVersion = ref<string | null>(null);
const panels = ref<Record<string, string>>({});
const previewFrame = ref<HTMLIFrameElement | null>(null);

let registration: ServiceWorkerRegistration | null = null;

const parsed = computed(() => playgroundState.parsed);
const ready = computed(() => phase.value === 'idle' && parsed.value !== null);

function waitForActive(reg: ServiceWorkerRegistration): Promise<ServiceWorker> {
  if (reg.active) return Promise.resolve(reg.active);
  const worker = reg.installing ?? reg.waiting;
  if (!worker) return Promise.reject(new Error('the service worker did not start'));
  return new Promise((resolve, reject) => {
    worker.addEventListener('statechange', () => {
      if (worker.state === 'activated') resolve(worker);
      if (worker.state === 'redundant') {
        reject(new Error('the service worker became redundant before activating'));
      }
    });
  });
}

function postInstall(worker: ServiceWorker, buffer: ArrayBuffer): Promise<InstallResult> {
  return new Promise((resolve) => {
    const cleanup = () => {
      window.clearTimeout(timer);
      navigator.serviceWorker.removeEventListener('message', onMessage);
    };
    const timer = window.setTimeout(() => {
      cleanup();
      resolve({ ok: false, error: 'The service worker did not answer within 30 seconds.' });
    }, 30000);
    const onMessage = (event: MessageEvent) => {
      const data = event.data as { type?: string } | undefined;
      if (data?.type !== 'install-result') return;
      cleanup();
      resolve(data as unknown as InstallResult);
    };
    navigator.serviceWorker.addEventListener('message', onMessage);
    worker.postMessage({ type: 'install-package', cap: buffer }, [buffer]);
  });
}

/**
 * The introspection panels must be fetched by a CONTROLLED client — the
 * playground page is outside the worker's scope, so its own fetches bypass
 * the worker entirely. The preview iframe is in-scope and controlled, so
 * its window.fetch is answered by the reactor.
 */
async function loadPanels(): Promise<void> {
  const win = previewFrame.value?.contentWindow;
  if (!win) return;
  const entries = await Promise.all(
    ENDPOINTS.map(async (key) => {
      try {
        const response = await win.fetch(`${SERVE_BASE}api/v1/introspect/${key}`, {
          headers: { Accept: 'application/json' },
        });
        const data: unknown = await response.json();
        return [key, JSON.stringify(data, null, 2)] as const;
      } catch (e) {
        return [key, e instanceof Error ? e.message : String(e)] as const;
      }
    }),
  );
  panels.value = Object.fromEntries(entries);
}

/** Show the serving UI and fill the introspection panels once the preview loads. */
async function presentServing(name: string, version: string): Promise<void> {
  servingName.value = name;
  servingVersion.value = version;
  phase.value = 'serving';
  await nextTick();
  const frame = previewFrame.value;
  if (frame) {
    await new Promise((resolve) => {
      frame.addEventListener('load', resolve, { once: true });
    });
  }
  await loadPanels();
}

async function serve() {
  const pkg = parsed.value;
  if (!pkg || phase.value === 'installing') return;
  phase.value = 'installing';
  error.value = null;
  announced.value = `Installing ${pkg.name} into the service worker…`;
  try {
    const reg = await navigator.serviceWorker.register(SW_SCRIPT, { scope: SERVE_BASE });
    const worker = await waitForActive(reg);
    const buffer = await pkg.file.arrayBuffer();
    const result = await postInstall(worker, buffer);
    if (!result.ok) {
      throw new Error(result.error ?? 'the reactor rejected the package');
    }
    registration = reg;
    await presentServing(result.name ?? pkg.name, result.version ?? '');
    announced.value = `${servingName.value} is being served live at ${SERVE_BASE}.`;
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e);
    announced.value = `Live serving failed: ${error.value}`;
    phase.value = 'idle';
  }
}

async function stop() {
  try {
    await registration?.unregister();
  } catch {
    // already gone — clearing local state anyway
  }
  registration = null;
  try {
    await caches.delete(CACHE_NAME);
  } catch {
    // Cache API unavailable or already empty — nothing more to clear
  }
  phase.value = 'idle';
  servingName.value = null;
  servingVersion.value = null;
  panels.value = {};
  announced.value = 'Stopped serving — the service worker was unregistered and its package cache cleared.';
}

async function trySample() {
  if (sampleBusy.value) return;
  sampleBusy.value = true;
  error.value = null;
  announced.value = 'Fetching the sample package…';
  try {
    const response = await fetch(SAMPLE_URL);
    if (!response.ok) throw new Error(`sample package answered HTTP ${response.status}`);
    const blob = await response.blob();
    playgroundState.inspectRequest = new File([blob], SAMPLE_NAME, { type: 'application/zip' });
  } catch (e) {
    sampleBusy.value = false;
    error.value = e instanceof Error ? e.message : String(e);
    announced.value = `Could not fetch the sample package: ${error.value}`;
  }
}

watch(parsed, (pkg) => {
  if (sampleBusy.value && pkg) sampleBusy.value = false;
});
watch(
  () => playgroundState.lastError,
  (message) => {
    if (sampleBusy.value && message) {
      sampleBusy.value = false;
      error.value = message;
    }
  },
);

onMounted(async () => {
  supported.value = 'serviceWorker' in navigator && typeof caches !== 'undefined';
  secure.value = window.isSecureContext;
  if (!supported.value) return;
  // Resume the card when a worker from an earlier visit is still registered.
  // The page cannot fetch introspection itself (it is outside the scope), so
  // the package name is read back from the panels once the preview loads.
  try {
    const reg = await navigator.serviceWorker.getRegistration(SERVE_BASE);
    if (!reg?.active) return;
    registration = reg;
    await presentServing('previous session', '');
    const metadata = panels.value.metadata ?? '';
    try {
      const first = (JSON.parse(metadata) as { packages?: Array<{ name?: string; version?: string }> })
        .packages?.[0];
      if (first?.name) {
        servingName.value = first.name;
        servingVersion.value = first.version ?? '';
        announced.value = `${first.name} is still being served by the service worker from your earlier visit.`;
      } else {
        // Registered but nothing installed: tidy up and stay idle.
        await stop();
      }
    } catch {
      await stop();
    }
  } catch {
    // no live session to resume — stay idle
  }
});
</script>

<template>
  <div
    class="relative overflow-hidden rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/10 to-transparent p-6 sm:p-8 dark:border-glow/25 dark:from-glow/10"
  >
    <p class="sr-only" aria-live="polite">{{ announced }}</p>

    <div class="flex flex-wrap items-start gap-5">
      <span class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary dark:bg-glow/15 dark:text-glow">
        <svg class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14Z" />
        </svg>
      </span>
      <div class="min-w-0 flex-1">
        <div class="flex flex-wrap items-center gap-3">
          <h2 class="font-display text-xl font-semibold tracking-tight text-ink dark:text-white">
            Live serving via service worker
          </h2>
          <span v-if="phase === 'serving'" class="chip">Live</span>
          <span v-else-if="phase === 'installing'" class="chip">Installing…</span>
        </div>

        <p class="mt-2 max-w-2xl leading-relaxed text-ink/70 dark:text-cream/65">
          A service-worker reactor installs your package, verifies every byte against
          <code class="font-mono text-sm">security.json</code>, and serves its routes right
          here under <code class="font-mono text-sm">{{ SERVE_BASE }}</code> — no server, no install.
        </p>

        <!-- Unsupported / insecure context -->
        <div
          v-if="!supported"
          class="mt-4 flex items-start gap-3 rounded-xl border border-sun/40 bg-sun/10 px-4 py-3.5 text-sm text-ink/80 dark:text-cream/80"
          role="note"
        >
          <p>
            This browser does not support service workers, so the live preview is
            unavailable. The inspector above still works — parsing needs no worker.
          </p>
        </div>
        <div
          v-else-if="!secure"
          class="mt-4 flex items-start gap-3 rounded-xl border border-sun/40 bg-sun/10 px-4 py-3.5 text-sm text-ink/80 dark:text-cream/80"
          role="note"
        >
          <p>
            Service workers require a secure context: serve this page over HTTPS, or
            use <code class="font-mono">localhost</code>, which browsers treat as secure.
          </p>
        </div>

        <!-- Error (install rejected, sample fetch failed, …) -->
        <div
          v-if="error"
          class="mt-4 flex items-start gap-3 rounded-xl border border-pepper/40 bg-pepper/10 px-4 py-3.5 text-sm text-pepper"
          role="alert"
        >
          <svg class="mt-0.5 h-4.5 w-4.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v4m0 4h.01" />
          </svg>
          <p>
            <span class="font-semibold">The reactor refused the package.</span>
            {{ error }}
          </p>
        </div>

        <!-- Idle: sample + hint -->
        <div v-if="phase === 'idle' && supported" class="mt-5 flex flex-wrap items-center gap-3">
          <button
            v-if="!ready"
            type="button"
            class="btn-primary motion-safe:hover:-translate-y-0.5"
            :disabled="sampleBusy"
            @click="trySample"
          >
          <svg v-if="sampleBusy" class="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
            <path d="M21 12a9 9 0 1 1-6.2-8.56" />
          </svg>
            {{ sampleBusy ? 'Fetching sample…' : 'Try the sample package' }}
          </button>
          <button
            v-else
            type="button"
            class="btn-primary motion-safe:hover:-translate-y-0.5"
            @click="serve"
          >
            Serve live
            <span class="font-mono text-xs font-normal opacity-80">{{ parsed?.name }}</span>
          </button>
          <p v-if="!ready" class="text-sm text-ink/60 dark:text-cream/55">
            or inspect a .cap above, then serve it live.
          </p>
        </div>

        <!-- Installing -->
        <p v-if="phase === 'installing'" class="mt-5 inline-flex items-center gap-2.5 text-sm text-ink/70 dark:text-cream/65">
          <svg class="h-4 w-4 animate-spin text-primary dark:text-glow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
            <path d="M21 12a9 9 0 1 1-6.2-8.56" />
          </svg>
          Verifying checksums and installing into the service worker…
        </p>

        <p v-if="phase !== 'serving' && supported && secure" class="mt-4 text-xs text-ink/50 dark:text-cream/45">
          Everything stays on your device: the worker persists the package in the
          Cache API until you stop serving. Requires HTTPS or localhost.
        </p>
      </div>
    </div>

    <!-- Serving: toolbar + preview + introspection -->
    <div v-if="phase === 'serving'" class="mt-6">
      <div
        class="flex flex-wrap items-center gap-3 rounded-t-xl border border-ink/10 bg-white/60 px-4 py-2.5 dark:border-white/10 dark:bg-night/80"
      >
        <span class="relative flex h-2.5 w-2.5">
          <span class="absolute inline-flex h-full w-full rounded-full bg-primary opacity-60 motion-safe:animate-ping dark:bg-glow"></span>
          <span class="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary dark:bg-glow"></span>
        </span>
        <span class="min-w-0 flex-1 truncate font-mono text-xs text-ink/70 dark:text-cream/70" :title="SERVE_BASE">
          {{ SERVE_BASE }} — {{ servingName }}<template v-if="servingVersion">@{{ servingVersion }}</template>
        </span>
        <a
          :href="SERVE_BASE"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex items-center gap-1.5 rounded-lg border border-ink/15 px-3 py-1.5 text-xs font-semibold text-ink/70 transition-colors hover:border-primary/50 hover:text-primary dark:border-white/15 dark:text-cream/70 dark:hover:border-glow/50 dark:hover:text-glow"
        >
          <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <path d="M15 3h6v6" />
            <path d="M10 14 21 3" />
          </svg>
          Open full tab
        </a>
        <button
          type="button"
          class="inline-flex items-center gap-1.5 rounded-lg border border-pepper/40 px-3 py-1.5 text-xs font-semibold text-pepper transition-colors hover:bg-pepper/10"
          @click="stop"
        >
          <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <rect x="6" y="6" width="12" height="12" rx="2" />
          </svg>
          Stop serving
        </button>
      </div>
      <iframe
        ref="previewFrame"
        :src="SERVE_BASE"
        title="Live preview of the package served by the service worker"
        class="h-[26rem] w-full rounded-b-xl border border-t-0 border-ink/10 bg-white shadow-2xl shadow-primary/10 dark:border-white/10 dark:bg-night dark:shadow-primary/20"
      ></iframe>

      <div class="mt-6">
        <p class="font-display text-xs font-semibold uppercase tracking-wider text-ink/50 dark:text-cream/45">
          §7 introspection — answered by the worker
        </p>
        <div class="mt-3 grid gap-4 lg:grid-cols-2">
          <div v-for="endpoint in ENDPOINTS" :key="endpoint" class="code-block flex max-h-64 flex-col">
            <div class="mb-2 flex items-center justify-between gap-2">
              <span class="font-mono text-xs text-glow">/api/v1/introspect/{{ endpoint }}</span>
              <a
                :href="`${SERVE_BASE}api/v1/introspect/${endpoint}`"
                target="_blank"
                rel="noopener noreferrer"
                class="shrink-0 text-[11px] font-semibold text-cream/50 transition-colors hover:text-glow"
              >raw ↗</a>
            </div>
            <pre class="min-h-0 flex-1 overflow-auto text-[12px] leading-relaxed">{{ panels[endpoint] ?? '…' }}</pre>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
