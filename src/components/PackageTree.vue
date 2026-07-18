<script setup lang="ts">
import { computed, ref } from 'vue';

interface TreeNode {
  name: string;
  kind: 'file' | 'dir';
  depth: number;
  badge?: 'handwritten' | 'generated';
  description: string;
}

const nodes: TreeNode[] = [
  {
    name: 'metadata.json',
    kind: 'file',
    depth: 1,
    badge: 'handwritten',
    description:
      'The one file you always write yourself: package name, version, description, license, repository, dependencies, and a readOnly flag.',
  },
  {
    name: 'manifest.json',
    kind: 'file',
    depth: 1,
    badge: 'generated',
    description:
      'Generated at pack time. An inventory of every file in the package — path, size, and media type — so reactors know exactly what they are serving.',
  },
  {
    name: 'routes.json',
    kind: 'file',
    depth: 1,
    badge: 'generated',
    description:
      'Generated at pack time. Maps URL paths to content files or data endpoints, so any reactor can mount the package consistently.',
  },
  {
    name: 'storage.json',
    kind: 'file',
    depth: 1,
    badge: 'generated',
    description:
      'Generated at pack time. Defines the package datasets: their sources, formats, and schemas.',
  },
  {
    name: 'security.json',
    kind: 'file',
    depth: 1,
    badge: 'generated',
    description:
      'Generated at pack time. SHA-256 checksums for every file in the package, with optional RSA signatures — reactors verify integrity before serving a single byte.',
  },
  {
    name: 'content/',
    kind: 'dir',
    depth: 1,
    description:
      'The static payload: HTML, CSS, JavaScript, images, fonts. Everything a reactor serves over HTTP lives here.',
  },
  {
    name: 'index.html',
    kind: 'file',
    depth: 2,
    description: 'An example content file — the site entry point, routed to "/" in routes.json.',
  },
  {
    name: 'data/',
    kind: 'dir',
    depth: 1,
    description:
      'Structured data files (YAML, JSON, CSV) exposed as datasets through storage.json.',
  },
  {
    name: 'animals.yaml',
    kind: 'file',
    depth: 2,
    description: 'An example dataset — served as a data endpoint by the reactor.',
  },
];

const selected = ref(0);
const current = computed(() => nodes[selected.value]);
</script>

<template>
  <div class="grid gap-6 md:grid-cols-2">
    <!-- Tree -->
    <div class="code-block" role="list" aria-label="Capsium package file tree">
      <div class="mb-2 flex items-center gap-2 font-semibold text-sun" role="listitem">
        <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="m12 2 8.5 4.9v9.8L12 21.6l-8.5-4.9V6.9L12 2Z" />
        </svg>
        my-site.cap
      </div>
      <button
        v-for="(node, i) in nodes"
        :key="node.name"
        type="button"
        role="listitem"
        class="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left font-mono text-sm transition-colors"
        :class="[
          selected === i ? 'bg-aqua/25 text-white' : 'text-cream/75 hover:bg-white/10',
        ]"
        :style="{ paddingLeft: `${0.5 + node.depth * 1.25}rem` }"
        :aria-pressed="selected === i"
        @click="selected = i"
      >
        <svg v-if="node.kind === 'dir'" class="h-4 w-4 shrink-0 text-sand" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
        </svg>
        <svg v-else class="h-4 w-4 shrink-0 text-aqua" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
          <path d="M14 2v4a2 2 0 0 0 2 2h4" />
        </svg>
        <span>{{ node.name }}</span>
        <span
          v-if="node.badge"
          class="ml-auto rounded-full px-2 py-0.5 font-sans text-[10px] font-semibold uppercase tracking-wide"
          :class="node.badge === 'generated' ? 'bg-aqua/20 text-aqua' : 'bg-sun/20 text-sun'"
        >
          {{ node.badge === 'generated' ? 'generated' : 'handwritten' }}
        </span>
      </button>
    </div>

    <!-- Detail panel -->
    <div class="card flex flex-col justify-center" aria-live="polite">
      <p class="font-mono text-sm font-semibold text-primary dark:text-sun">
        {{ current.name }}
      </p>
      <p class="mt-3 leading-relaxed text-ink/80 dark:text-cream/80">
        {{ current.description }}
      </p>
    </div>
  </div>
</template>
