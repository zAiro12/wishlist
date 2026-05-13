import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { settings as settingsApi } from '../api/client';

export const useSettingsStore = defineStore('settings', () => {
  const data = ref<Record<string, string>>({});
  const initialized = ref(false);

  const princessUserId = computed(() =>
    (data.value['princess_user_id'] ?? '').trim()
  );

  async function fetchSettings(force = false): Promise<void> {
    if (initialized.value && !force) return;
    try {
      const result = await settingsApi.get();
      if (result) data.value = result;
      initialized.value = true;
    } catch {
      // Settings are optional — silently ignore errors
    }
  }

  return { data, princessUserId, fetchSettings, initialized };
});
