<template>
  <span :class="badgeClass">{{ label }}</span>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { ItemStatus } from '../types';

const props = defineProps<{ status: ItemStatus | string }>();

const badgeClass = computed(() => {
  if (props.status === 'PRENOTATO') return 'badge badge-prenotato';
  if (props.status === 'COMPRATO') return 'badge badge-comprato';
  return 'badge badge-disponibile';
});

const label = computed(() => {
  if (props.status === 'PRENOTATO') return 'Reserved';
  if (props.status === 'COMPRATO') return 'Purchased';
  return 'Available';
});
</script>
