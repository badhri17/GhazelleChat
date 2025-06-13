import bg1 from "~/assets/images/bg1-dark.webp";
import bg2 from "~/assets/images/bg2-dark.webp";
import bg3 from "~/assets/images/bg3-dark.webp";

export const useBackground = () => {
  const availableBackgrounds = [
    {
      id: "bg1-dark",
      name: "Aurora",
      path: bg1,
    },
    {
      id: "bg2-dark",
      name: "Nebula",
      path: bg2,
    },
    {
      id: "bg3-dark",
      name: "Galaxy",
      path: bg3,
    },
  ];

  // Use cookies for SSR compatibility
  const backgroundCookie = useCookie('ghazelle-background', {
    default: () => 'bg1-dark',
    maxAge: 60 * 60 * 24 * 365, // 1 year
    sameSite: 'lax'
  });

  // Initialize useState with cookie value to prevent flickering
  const currentBackground = useState('background-selection', () => {
    // Get from cookie first (available on both server and client)
    const cookieValue = backgroundCookie.value;
    if (cookieValue && availableBackgrounds.find(bg => bg.id === cookieValue)) {
      return cookieValue;
    }
    
    // Fallback to localStorage on client (for migration from old storage)
    if (process.client) {
      try {
        const saved = localStorage.getItem("ghazelle-background");
        if (saved && availableBackgrounds.find(bg => bg.id === saved)) {
          // Migrate to cookie
          backgroundCookie.value = saved;
          localStorage.removeItem("ghazelle-background"); // Clean up old storage
          return saved;
        }
      } catch (error) {
        console.warn('Failed to migrate from localStorage:', error);
      }
    }
    
    return 'bg1-dark';
  });

  // Sync useState with cookie
  watch(currentBackground, (newValue) => {
    backgroundCookie.value = newValue;
    console.log('Background saved to cookie:', newValue);
  });

  // Also sync cookie changes back to state (in case cookie is changed externally)
  watch(backgroundCookie, (newValue) => {
    if (newValue && newValue !== currentBackground.value) {
      currentBackground.value = newValue;
    }
  });

  const setBackground = (backgroundId: string) => {
    if (availableBackgrounds.find((bg) => bg.id === backgroundId)) {
      currentBackground.value = backgroundId;
    }
  };

  const getCurrentBackgroundPath = computed(() => {
    const bg = availableBackgrounds.find(
      (bg) => bg.id === currentBackground.value
    );
    return bg?.path || availableBackgrounds[0].path;
  });

  return {
    availableBackgrounds,
    currentBackground: readonly(currentBackground),
    setBackground,
    getCurrentBackgroundPath,
  };
};
