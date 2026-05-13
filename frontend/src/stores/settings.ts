import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { settings as settingsApi } from '../api/client';

export const useSettingsStore = defineStore('settings', () => {
  const data = ref<Record<string, string>>({});
  const initialized = ref(false);

  const princessUserId = computed(() =>
    (data.value['princess_user_id'] ?? '').trim()
  );

  async function fetchSettings(): Promise<void> {
    if (initialized.value) return;
    try {
      const result = await settingsApi.get();
      if (result) data.value = result;
    } catch {
      // Settings are optional — silently ignore errors
    } finally {
      initialized.value = true;
    }
  }

  function setLocal(key: string, value: string): void {
    data.value = { ...data.value, [key]: value };
  }

  return { data, princessUserId, fetchSettings, setLocal, initialized };
});
