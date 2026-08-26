import { onMounted, shallowRef, watch } from "vue";

export type Theme = "light" | "dark";

export function useTheme() {
  const theme = shallowRef<Theme>("light");

  onMounted(() => {
    const stored = window.localStorage.getItem("nisse-theme");
    if (stored === "dark" || stored === "light") theme.value = stored;
  });

  watch(theme, (value) => {
    document.documentElement.dataset.theme = value;
    window.localStorage.setItem("nisse-theme", value);
  }, { immediate: true });

  function toggleTheme() {
    theme.value = theme.value === "light" ? "dark" : "light";
  }

  return { theme, toggleTheme };
}
