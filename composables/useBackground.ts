// Dark versions
import bg1Dark from "~/assets/images/dark/bg1-dark.webp";
import bg2Dark from "~/assets/images/dark/bg2-dark.webp";
import bg3Dark from "~/assets/images/dark/bg3-dark.webp";
import bg4Dark from "~/assets/images/dark/bg4-dark.webp";
import bg5Dark from "~/assets/images/dark/bg5-dark.webp";

// Light versions
import bg1Light from "~/assets/images/light/bg1-light.webp";
import bg2Light from "~/assets/images/light/bg2-light.webp";
import bg3Light from "~/assets/images/light/bg3-light.webp";
import bg4Light from "~/assets/images/light/bg4-light.webp";
import bg5Light from "~/assets/images/light/bg5-light.webp";

import { computed, watch } from 'vue';
import { useColorMode, useCookie } from '#imports';

export const useBackground = () => {
  /**
   * We keep a base id (e.g. "bg1") and map to the corresponding
   * dark / light file. This allows us to seamlessly swap the image
   * when the global color mode (from @nuxtjs/color-mode) changes.
   */
  const baseBackgrounds = [
    {
      id: "bg1",
      name: "Aurora",
      dark: bg1Dark,
      light: bg1Light,
    },
    {
      id: "bg2",
      name: "Ember",
      dark: bg2Dark,
      light: bg2Light,
    },
    {
      id: "bg3",
      name: "Spectrum",
      dark: bg3Dark,
      light: bg3Light,
    },
    {
      id: "bg4",
      name: "Midnight",
      dark: bg4Dark,
      light: bg4Light,
    },
    {
      id: "bg5",
      name: "Eclipse",
      dark: bg5Dark,
      light: bg5Light,
    },
  ] as const;

  const colorMode = useColorMode();
  // Directly read the color-mode cookie for 1st paint (SSR + immediate CSR)
  const themeCookie = useCookie<string>('nuxt_color_mode');
  const currentTheme = computed(() => themeCookie.value || colorMode.preference || colorMode.value);

  // Keep cookie in sync if theme changes through toggle
  watch(() => colorMode.preference || colorMode.value, (val) => {
    if (val && themeCookie.value !== val) themeCookie.value = val as any;
  });

  // Expose a computed array that automatically picks the right image
  const availableBackgrounds = computed(() =>
    baseBackgrounds.map((bg) => ({
      id: bg.id,
      name: bg.name,
      path: currentTheme.value === "dark" ? bg.dark : bg.light,
    }))
  );

  // Use cookies for SSR compatibility
  const backgroundCookie = useCookie('ghazelle-background', {
    // store only the base id (no -dark / -light suffix)
    default: () => 'bg1',
    maxAge: 60 * 60 * 24 * 365, // 1 year
    sameSite: 'lax'
  });

  const normalizeId = (val?: string | null) => (val ?? '').replace(/-(dark|light)$/i, '');

  const currentBackground = useState('background-selection', () => {
    const cookieValue = normalizeId(backgroundCookie.value);
    if (cookieValue && baseBackgrounds.find(bg => bg.id === cookieValue)) {
      return cookieValue;
    }

    if (process.client) {
      try {
        const saved = normalizeId(localStorage.getItem("ghazelle-background"));
        if (saved && baseBackgrounds.find(bg => bg.id === saved)) {
          backgroundCookie.value = saved;
          localStorage.removeItem("ghazelle-background");
          return saved;
        }
      } catch (error) {
        console.warn('Failed to migrate from localStorage:', error);
      }
    }

    return 'bg1';
  });

  watch(currentBackground, (newValue) => {
    backgroundCookie.value = newValue;
    console.log('Background saved to cookie:', newValue);
  });

  watch(backgroundCookie, (newValue) => {
    if (newValue && newValue !== currentBackground.value) {
      currentBackground.value = newValue;
    }
  });

  const setBackground = (backgroundId: string) => {
    if (baseBackgrounds.find((bg) => bg.id === backgroundId)) {
      currentBackground.value = backgroundId;
    }
  };

  const getCurrentBackgroundPath = computed(() => {
    const bg = baseBackgrounds.find((bg) => bg.id === currentBackground.value);
    if (!bg) {
      return baseBackgrounds[0].dark; // fallback – shouldn't really happen
    }
    return currentTheme.value === 'dark' ? bg.dark : bg.light;
  });

  return {
    availableBackgrounds,
    currentBackground: readonly(currentBackground),
    setBackground,
    getCurrentBackgroundPath,
  };
};
