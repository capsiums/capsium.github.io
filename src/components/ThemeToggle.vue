<script setup lang="ts">
import { onMounted, ref } from 'vue';

const isDark = ref(false);

function apply(dark: boolean) {
  isDark.value = dark;
  document.documentElement.classList.toggle('dark', dark);
  localStorage.setItem('theme', dark ? 'dark' : 'light');
}

onMounted(() => {
  isDark.value = document.documentElement.classList.contains('dark');
});
</script>

<template>
  <button
    type="button"
    class="rounded-lg p-2 text-ink/70 transition-colors hover:bg-primary/10 hover:text-primary dark:text-cream/70 dark:hover:bg-white/10 dark:hover:text-cream"
    :aria-label="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
    :aria-pressed="isDark"
    @click="apply(!isDark)"
  >
    <svg v-if="isDark" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
    <svg v-else class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />
    </svg>
  </button>
</template>
