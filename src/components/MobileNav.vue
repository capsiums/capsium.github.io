<script setup lang="ts">
import { ref } from 'vue';

interface NavLink {
  href: string;
  label: string;
}

defineProps<{
  links: NavLink[];
  current: string;
}>();

const open = ref(false);

function close() {
  open.value = false;
}
</script>

<template>
  <div class="lg:hidden">
    <button
      type="button"
      class="rounded-lg p-2 text-ink/70 transition-colors hover:bg-primary/10 hover:text-primary dark:text-cream/70 dark:hover:bg-white/10 dark:hover:text-cream"
      :aria-expanded="open"
      aria-controls="mobile-menu"
      aria-label="Toggle navigation menu"
      @click="open = !open"
    >
      <svg v-if="!open" class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
        <path d="M4 7h16M4 12h16M4 17h16" />
      </svg>
      <svg v-else class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
        <path d="M6 6l12 12M18 6L6 18" />
      </svg>
    </button>

    <Transition
      enter-active-class="transition duration-150 ease-out"
      enter-from-class="opacity-0 -translate-y-1"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition duration-100 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 -translate-y-1"
    >
      <div
        v-if="open"
        id="mobile-menu"
        class="absolute inset-x-0 top-16 border-b border-deep/10 bg-cream shadow-xl dark:border-white/10 dark:bg-night"
      >
        <nav class="container-site flex flex-col gap-1 py-4" aria-label="Mobile navigation">
          <a
            v-for="link in links"
            :key="link.href"
            :href="link.href"
            class="nav-link"
            :class="{ 'nav-link-active': current === link.href }"
            :aria-current="current === link.href ? 'page' : undefined"
            @click="close"
          >
            {{ link.label }}
          </a>
          <a
            href="https://github.com/capsiums"
            target="_blank"
            rel="noopener noreferrer"
            class="nav-link"
            @click="close"
          >
            GitHub
          </a>
        </nav>
      </div>
    </Transition>
  </div>
</template>
