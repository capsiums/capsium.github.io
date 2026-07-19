<script setup lang="ts">
import { computed, ref } from 'vue';

type Side = 'packager' | 'capsule' | 'reactors' | null;

const active = ref<Side>(null);
const activeReactor = ref<string | null>(null);

const contractFiles = [
  'metadata.json',
  'manifest.json',
  'routes.json',
  'storage.json',
  'security.json',
];

const reactors = [
  { id: 'ruby', name: 'Ruby reactor' },
  { id: 'nginx', name: 'nginx / OpenResty' },
  { id: 'extension', name: 'Browser extension' },
  { id: 'worker', name: 'Service worker' },
];

const caption = computed(() => {
  if (active.value === 'packager') {
    return 'Anyone can package: author metadata.json, fill content/ and data/, run capsium package pack — the packager generates the rest of the contract.';
  }
  if (active.value === 'capsule') {
    return 'One .cap file: a checksummed ZIP whose five JSON files form the contract that every conformant reactor understands.';
  }
  if (active.value === 'reactors') {
    const name = reactors.find((r) => r.id === activeReactor.value)?.name ?? 'A reactor';
    return `${name}: verifies the SHA-256 checksums, mounts the routes, and serves the package — byte for byte, anywhere.`;
  }
  return 'The packager and the deployer never have to agree on a runtime — only on the contract inside the capsule.';
});

function setSide(side: Side, reactor: string | null = null) {
  active.value = side;
  activeReactor.value = reactor;
}

function clearSide(side: Side) {
  if (active.value === side) {
    active.value = null;
    activeReactor.value = null;
  }
}
</script>

<template>
  <div>
    <div class="grid items-center gap-3 md:grid-cols-[minmax(0,1fr)_auto_auto_auto_minmax(0,1fr)]">
      <!-- Packager -->
      <button
        type="button"
        class="group rounded-2xl border p-5 text-left transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        :class="
          active === 'packager'
            ? 'border-primary/60 bg-primary/10 shadow-lg shadow-primary/20'
            : 'border-ink/10 bg-white hover:border-primary/40 dark:border-white/10 dark:bg-white/[0.04] dark:hover:border-primary/40'
        "
        aria-label="Packager — who builds a capsule"
        @mouseenter="setSide('packager')"
        @mouseleave="clearSide('packager')"
        @focus="setSide('packager')"
        @blur="clearSide('packager')"
      >
        <div class="flex items-center gap-3">
          <span
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors"
            :class="active === 'packager' ? 'bg-primary/20 text-primary dark:text-glow' : 'bg-primary/10 text-primary dark:bg-glow/10 dark:text-glow'"
          >
            <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
              <path d="M3.3 7 12 12l8.7-5" />
              <path d="M12 22V12" />
            </svg>
          </span>
          <div>
            <p class="font-display font-semibold text-ink dark:text-white">Packager</p>
            <p class="mt-0.5 text-xs text-ink/60 dark:text-cream/55">capsium gem · capsium-js</p>
          </div>
        </div>
      </button>

      <!-- Connector: packager → capsule -->
      <div class="flex items-center justify-center md:px-1" aria-hidden="true">
        <svg
          class="h-6 w-6 rotate-90 md:h-8 md:w-14 md:rotate-0"
          viewBox="0 0 56 24"
          fill="none"
        >
          <path
            d="M2 12h48m0 0-6-6m6 6-6 6"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="transition-colors duration-200"
            :class="active === 'packager' ? 'text-glow' : 'text-ink/25 dark:text-white/20'"
          />
        </svg>
      </div>

      <!-- Capsule -->
      <button
        type="button"
        class="group relative rounded-3xl border p-5 text-center transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary md:px-7"
        :class="
          active === 'capsule'
            ? 'border-glow/70 bg-primary/10 shadow-xl shadow-primary/25'
            : 'border-primary/30 bg-gradient-to-b from-primary/10 to-transparent shadow-lg shadow-primary/10 hover:border-glow/50 dark:from-primary/15'
        "
        aria-label="A .cap capsule — the contract"
        @mouseenter="setSide('capsule')"
        @mouseleave="clearSide('capsule')"
        @focus="setSide('capsule')"
        @blur="clearSide('capsule')"
      >
        <div
          class="pointer-events-none absolute -inset-2 rounded-[2rem] bg-primary/15 blur-xl transition-opacity duration-300"
          :class="active === 'capsule' ? 'opacity-100' : 'opacity-0'"
          aria-hidden="true"
        ></div>
        <div class="relative">
          <p class="font-mono text-sm font-semibold text-glow">my-site.cap</p>
          <p class="mt-1 text-[11px] font-medium uppercase tracking-[0.18em] text-ink/50 dark:text-cream/45">
            one whole capsule
          </p>
          <ul class="mt-4 flex flex-wrap justify-center gap-1.5">
            <li
              v-for="file in contractFiles"
              :key="file"
              class="rounded-md border border-primary/25 bg-night/5 px-2 py-1 font-mono text-[11px] text-primary dark:border-glow/25 dark:bg-night/60 dark:text-glow"
            >
              {{ file }}
            </li>
          </ul>
        </div>
      </button>

      <!-- Connector: capsule → reactors -->
      <div class="flex items-center justify-center md:px-1" aria-hidden="true">
        <svg
          class="h-6 w-6 rotate-90 md:h-8 md:w-14 md:rotate-0"
          viewBox="0 0 56 24"
          fill="none"
        >
          <path
            d="M2 12h48m0 0-6-6m6 6-6 6"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="transition-colors duration-200"
            :class="active === 'reactors' ? 'text-glow' : 'text-ink/25 dark:text-white/20'"
          />
        </svg>
      </div>

      <!-- Reactors -->
      <div
        class="rounded-2xl border p-4 transition-all duration-200"
        :class="
          active === 'reactors'
            ? 'border-primary/60 bg-primary/10 shadow-lg shadow-primary/20'
            : 'border-ink/10 bg-white dark:border-white/10 dark:bg-white/[0.04]'
        "
        @mouseleave="clearSide('reactors')"
      >
        <p class="px-1 pb-2.5 font-display text-sm font-semibold text-ink dark:text-white">
          Reactors
        </p>
        <div class="grid grid-cols-2 gap-1.5 md:grid-cols-1 lg:grid-cols-2">
          <button
            v-for="reactor in reactors"
            :key="reactor.id"
            type="button"
            class="rounded-lg border px-2.5 py-2 text-left text-xs font-medium transition-all duration-150 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary"
            :class="
              active === 'reactors' && activeReactor === reactor.id
                ? 'border-glow/60 bg-glow/10 text-primary dark:text-glow'
                : 'border-ink/10 text-ink/70 hover:border-primary/40 hover:text-primary dark:border-white/10 dark:text-cream/70 dark:hover:border-glow/40 dark:hover:text-glow'
            "
            @mouseenter="setSide('reactors', reactor.id)"
            @focus="setSide('reactors', reactor.id)"
            @blur="clearSide('reactors')"
          >
            {{ reactor.name }}
          </button>
        </div>
      </div>
    </div>

    <p
      class="mx-auto mt-6 max-w-2xl text-center text-sm leading-relaxed text-ink/65 dark:text-cream/60"
      aria-live="polite"
    >
      {{ caption }}
    </p>
  </div>
</template>
