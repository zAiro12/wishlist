import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { settings as settingsApi } from '../api/client';
import { admin as adminApi, ApiError } from '../api/client';
import { useAuthStore } from './auth';

export const useSettingsStore = defineStore('settings', () => {
  const data = ref<Record<string, string>>({});
  const initialized = ref(false);

  const princessUserId = computed(() =>
    (data.value['princess_user_id'] ?? '').trim()
  );

  async function fetchSettings(force = false): Promise<void> {
    if (initialized.value && !force) return;
    try {
      let result = await settingsApi.get();
      if (!result) {
        result = await adminApi.settings.get();
      }
      if (result) data.value = result;
      initialized.value = true;
    } catch (err) {
      const auth = useAuthStore();
      if (err instanceof ApiError && auth.isAdmin) {
        try {
          const adminResult = await adminApi.settings.get();
          if (adminResult) data.value = adminResult;
          initialized.value = true;
          return;
        } catch {
          // fall through to silent ignore below
        }
      }
      // Settings are optional — silently ignore errors
    }
  }

  return { data, princessUserId, fetchSettings, initialized };
});
