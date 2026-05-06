import { ref, computed, nextTick } from 'vue';

export function useDateInput(initialIso: string = '') {
  const day = ref(initialIso ? initialIso.split('-')[2] : '');
  const month = ref(initialIso ? initialIso.split('-')[1] : '');
  const year = ref(initialIso ? initialIso.split('-')[0] : '');
  const dateInput = ref(
    initialIso
      ? `${initialIso.split('-')[2]}/${initialIso.split('-')[1]}/${initialIso.split('-')[0]}`
      : ''
  );

  const composedIso = computed(() => {
    if (!day.value || !month.value || !year.value) return '';
    const d = String(day.value).padStart(2, '0');
    const m = String(month.value).padStart(2, '0');
    const y = String(year.value);
    return `${y}-${m}-${d}`;
  });

  function handleDateInput(event: Event) {
    const el = event.target as HTMLInputElement;
    const digits = el.value.replace(/\D/g, '').slice(0, 8);

    let formatted = digits;
    if (digits.length > 4) {
      formatted = `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
    } else if (digits.length > 2) {
      formatted = `${digits.slice(0, 2)}/${digits.slice(2)}`;
    }

    dateInput.value = formatted;
    nextTick(() => { el.setSelectionRange(formatted.length, formatted.length); });

    day.value = digits.length >= 2 ? digits.slice(0, 2) : '';
    month.value = digits.length >= 4 ? digits.slice(2, 4) : '';
    year.value = digits.length === 8 ? digits.slice(4, 8) : '';
  }

  function validateDate(): string | null {
    if (!composedIso.value) return 'Inserisci una data completa nel formato GG/MM/AAAA.';
    const d = parseInt(day.value, 10);
    const m = parseInt(month.value, 10);
    const y = parseInt(year.value, 10);
    if (d < 1 || d > 31 || m < 1 || m > 12 || y < 1900 || y > 2099) {
      return 'Inserisci una data valida (GG/MM/AAAA, anno tra 1900 e 2099).';
    }
    return null;
  }

  return { day, month, year, dateInput, composedIso, handleDateInput, validateDate };
}
