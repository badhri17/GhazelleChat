<template>
  <CommandDialog v-model:open="open" >
    <CommandInput placeholder="Search conversations..." v-model="searchQuery">
      <template #icon>
        <Icon
          v-if="loading"
          name="lucide:loader-2"
          class="size-4 shrink-0 opacity-50 animate-spin"
        />
        <Icon
          v-else
          name="lucide:search"
          class="size-4 shrink-0 opacity-50"
        />
      </template>
    </CommandInput>
    <CommandList>
      <CommandEmpty v-if="listItems.length === 0">
        <div class="text-center py-6">
          <Icon
            name="lucide:search"
            class="w-8 h-8 mx-auto mb-2 text-muted-foreground"
          />
          <p class="text-sm text-muted-foreground">No conversations found.</p>
        </div>
      </CommandEmpty>

      <div v-if="listItems.length > 0" class="p-1">
        <div v-if="groupHeading" class="px-2 py-1.5 text-xs font-medium text-muted-foreground">
          {{ groupHeading }}
        </div>
        <div
          v-for="(conversation, idx) in listItems"
          :key="conversation.id"
          :data-result-index="idx"
          @click="selectConversation(conversation.id)"
          :class="[
            'flex cursor-pointer items-center gap-3 rounded-md p-3 hover:bg-accent',
            idx === selectedIndex ? 'bg-accent' : ''
          ]"
        >
          <Icon
            name="lucide:message-circle"
            class="w-4 h-4 text-muted-foreground"
          />
          <div class="flex-1 min-w-0">
            <div class="font-medium text-sm truncate">
              {{ conversation.title }}
            </div>
            <div class="text-xs text-muted-foreground">
              {{ formatDate(conversation.updatedAt) }}
            </div>
          </div>
         
        </div>
      </div>
    </CommandList>
  </CommandDialog>
</template>

<script setup lang="ts">
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
} from "@/components/ui/command";

interface Conversation {
  id: string;
  title: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

interface Props {
  open: boolean;
}

interface Emits {
  "update:open": [value: boolean];
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const open = computed({
  get: () => props.open,
  set: (value) => emit("update:open", value),
});

const searchQuery = ref("");
const conversations = ref<Conversation[]>([]);
const loading = ref(false);
const listItems = ref<Conversation[]>([]);
const groupHeading = ref('Recent Conversations');
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
const selectedIndex = ref(-1);

function toDate(val: string | number): Date {
  const num = typeof val === 'string' ? Number(val) : val;
  if (!Number.isNaN(num) && num < 1e12) {
    // seconds -> ms
    return new Date(num * 1000);
  }
  return new Date(val as any);
}

async function fetchConversations() {
  try {
    loading.value = true;
    const data = await $fetch("/api/conversations");
    conversations.value =
      data?.conversations?.map((conv: any) => ({
        id: conv.id,
        title: conv.title,
        createdAt: toDate(conv.createdAt),
        updatedAt: toDate(conv.updatedAt),
      })) || [];
  } catch (error) {
    console.error("Failed to fetch conversations:", error);
    conversations.value = [];
  } finally {
    loading.value = false;
  }
}

watchEffect(async () => {
  if (props.open && conversations.value.length === 0) {
    await fetchConversations();
    const recents = conversations.value
      .sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      )
      .slice(0, 5);
    listItems.value = recents;
  }
});

watch(searchQuery, (q) => {
  if (debounceTimer) clearTimeout(debounceTimer);

  debounceTimer = setTimeout(async () => {
    const query = q.trim();
    if (!query) {
      const recents = conversations.value
        .sort(
          (a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        )
        .slice(0, 5);
      listItems.value = recents;
      groupHeading.value = 'Recent Conversations';
      return;
    }

    try {
      loading.value = true;
      groupHeading.value = 'All Conversations';
      const data = await $fetch("/api/search", { query: { q: query } });
      listItems.value = (data?.conversations || []).map((conv: any) => ({
        id: conv.id,
        title: conv.title,
        createdAt: toDate(conv.createdAt),
        updatedAt: toDate(conv.updatedAt),
      }));
    } catch (e) {
      console.error("Search error", e);
      listItems.value = [];
    } finally {
      loading.value = false;
    }
  }, 300);
});

function selectConversation(conversationId: string) {
  open.value = false;
  searchQuery.value = "";
  navigateTo(`/chat/${conversationId}`);
}

function formatDate(date: Date | string) {
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } else if (diffDays === 1) {
    return "Yesterday";
  } else if (diffDays < 7) {
    return d.toLocaleDateString([], { weekday: "short" });
  } else {
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  }
}

function formatRelativeTime(date: Date | string) {
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return "Today";
  } else if (diffDays === 1) {
    return "1d";
  } else if (diffDays < 7) {
    return `${diffDays}d`;
  } else if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `${weeks}w`;
  } else {
    const months = Math.floor(diffDays / 30);
    return `${months}mo`;
  }
}
watch(open, (isOpen) => {
  if (!isOpen) {
    searchQuery.value = "";
  }
});

watch([open, listItems], ([isOpen]) => {
  if (isOpen && listItems.value.length) {
    selectedIndex.value = 0;
  } else {
    selectedIndex.value = -1;
  }
});

// Ensure highlighted row is visible
watch(selectedIndex, () => {
  nextTick(() => {
    const el = document.querySelector(`[data-result-index="${selectedIndex.value}"]`) as HTMLElement | null;
    if (el) el.scrollIntoView({ block: "nearest" });
  });
});

function moveSelection(dir: 1 | -1) {
  if (!open.value || listItems.value.length === 0) return;
  if (selectedIndex.value === -1) selectedIndex.value = 0;
  else {
    const len = listItems.value.length;
    selectedIndex.value = (selectedIndex.value + dir + len) % len;
  }
}

function handleNavKey(e: KeyboardEvent) {
  if (!open.value) return;
  if (e.key === "ArrowDown") {
    e.preventDefault();
    moveSelection(1);
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    moveSelection(-1);
  } else if (e.key === "Enter") {
    if (selectedIndex.value >= 0 && selectedIndex.value < listItems.value.length) {
      e.preventDefault();
      selectConversation(listItems.value[selectedIndex.value].id);
    }
  }
}

onMounted(() => {
  document.addEventListener("keydown", handleNavKey);
});

onUnmounted(() => {
  document.removeEventListener("keydown", handleNavKey);
});
</script>
