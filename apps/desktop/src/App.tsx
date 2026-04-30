import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ConfirmDialog } from "./components/ConfirmDialog";
import { CustomPromptDialog } from "./components/CustomPromptDialog";
import { Palette } from "./components/Palette";
import { SettingsPanel } from "./components/SettingsPanel";
import {
  getAutostartStatus,
  setAutostartEnabled,
  type AutostartStatus
} from "./lib/autostart";
import { copyText, hidePalette } from "./lib/clipboard";
import {
  resetWindowPosition,
  restoreWindowPosition,
  subscribeToWindowMoves
} from "./lib/windowPosition";
import {
  checkForUpdate,
  installUpdate,
  toUpdateInfo,
  type UpdateInfo,
  type UpdateProgress,
  type UpdateStatus
} from "./lib/updater";
import { buildCategoryIds, getVisiblePrompts, recentCategoryId } from "./lib/promptView";
import { getUiCopy } from "./lib/uiCopy";
import englishPackData from "../../../packs/en/beginner-rescue.json";
import zhTwPackData from "../../../packs/zh-TW/beginner-rescue.json";
import type { Update } from "@tauri-apps/plugin-updater";
import type { CustomPromptDraft, PromptPack, RescuePrompt } from "./types";

const packs = [zhTwPackData, englishPackData] as PromptPack[];
const defaultPackId = "beginner-rescue-zh-tw";
const defaultCategoryId = "start";
const customCategoryId = "custom";
const pointerResumeDelayMs = 700;
const copyNoticeDurationMs = 1800;

export function App() {
  const copyTimerRef = useRef<number | undefined>(undefined);
  const noticeTimerRef = useRef<number | undefined>(undefined);
  const lastKeyboardNavigationRef = useRef(0);
  const pendingUpdateRef = useRef<Update | null>(null);
  const [activePackId, setActivePackId] = useState(() =>
    readStoredString("saynext.activePackId", defaultPackId)
  );
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState(defaultCategoryId);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [keyboardMode, setKeyboardMode] = useState(false);
  const [copiedPromptId, setCopiedPromptId] = useState<string | null>(null);
  const [copyNotice, setCopyNotice] = useState<CopyNotice | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [customPromptDialogOpen, setCustomPromptDialogOpen] = useState(false);
  const [editingCustomPrompt, setEditingCustomPrompt] = useState<RescuePrompt | null>(null);
  const [deletePromptId, setDeletePromptId] = useState<string | null>(null);
  const [searchFocusRequest, setSearchFocusRequest] = useState(0);
  const [paletteFocusRequest, setPaletteFocusRequest] = useState(0);
  const [autoHideAfterCopy, setAutoHideAfterCopy] = useState(
    () => readStoredBoolean("saynext.autoHideAfterCopy", true)
  );
  const [autostartStatus, setAutostartStatus] = useState<AutostartStatus>("checking");
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>("idle");
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [updateProgress, setUpdateProgress] = useState<UpdateProgress | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<Set<string>>(
    () => new Set(readStoredStringArray("saynext.favorites"))
  );
  const [recentIds, setRecentIds] = useState<string[]>(
    () => readStoredStringArray("saynext.recentIds")
  );
  const [customPrompts, setCustomPrompts] = useState<RescuePrompt[]>(
    () => readStoredCustomPrompts("saynext.customPrompts")
  );
  const platform = useMemo(getPlatformMeta, []);

  const pack = useMemo(
    () => packs.find((candidate) => candidate.id === activePackId) ?? packs[0],
    [activePackId]
  );
  const uiCopy = useMemo(() => getUiCopy(pack.locale), [pack.locale]);

  const categories = useMemo(() => {
    const [firstCategory, ...otherCategories] = pack.categories;
    const customCategory = { id: customCategoryId, name: uiCopy.categoryCustom };
    return firstCategory
      ? [firstCategory, customCategory, ...otherCategories]
      : [customCategory];
  }, [pack.categories, uiCopy.categoryCustom]);

  const prompts = useMemo(
    () => [
      ...pack.prompts.map((prompt) => ({ ...prompt, source: "built-in" as const })),
      ...customPrompts
    ],
    [customPrompts, pack.prompts]
  );

  const categoryIds = useMemo(() => {
    return buildCategoryIds(categories);
  }, [categories]);

  const visiblePrompts = useMemo(() => {
    return getVisiblePrompts({
      activeCategory,
      categories,
      favorites,
      prompts,
      query,
      recentIds
    });
  }, [activeCategory, categories, favorites, prompts, query, recentIds]);

  const enableKeyboardMode = useCallback(() => {
    lastKeyboardNavigationRef.current = Date.now();
    setKeyboardMode(true);
  }, []);

  const handlePointerActivity = useCallback(() => {
    if (Date.now() - lastKeyboardNavigationRef.current < pointerResumeDelayMs) {
      return false;
    }

    setKeyboardMode(false);
    return true;
  }, []);

  useEffect(() => {
    if (activePackId !== pack.id) {
      setActivePackId(pack.id);
    }
  }, [activePackId, pack.id]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [activeCategory, activePackId, query]);

  useEffect(() => {
    setSelectedIndex((index) => {
      if (visiblePrompts.length === 0) return 0;
      return Math.min(index, visiblePrompts.length - 1);
    });
  }, [visiblePrompts.length]);

  useEffect(() => {
    if (categoryIds.length > 0 && !categoryIds.includes(activeCategory)) {
      setActiveCategory(categoryIds[0]);
    }
  }, [activeCategory, categoryIds]);

  useEffect(() => {
    localStorage.setItem("saynext.activePackId", activePackId);
  }, [activePackId]);

  useEffect(() => {
    localStorage.setItem("saynext.favorites", JSON.stringify([...favorites]));
  }, [favorites]);

  useEffect(() => {
    localStorage.setItem("saynext.recentIds", JSON.stringify(recentIds));
  }, [recentIds]);

  useEffect(() => {
    localStorage.setItem("saynext.customPrompts", JSON.stringify(customPrompts));
  }, [customPrompts]);

  useEffect(() => {
    localStorage.setItem("saynext.autoHideAfterCopy", JSON.stringify(autoHideAfterCopy));
  }, [autoHideAfterCopy]);

  useEffect(() => {
    void getAutostartStatus().then(setAutostartStatus);
  }, []);

  useEffect(() => {
    void restoreWindowPosition();
    let cleanup: (() => void) | undefined;

    void subscribeToWindowMoves().then((unlisten) => {
      cleanup = unlisten;
    });

    return () => {
      cleanup?.();
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        if (settingsOpen) {
          setSettingsOpen(false);
          return;
        }

        if (customPromptDialogOpen) {
          setCustomPromptDialogOpen(false);
          setEditingCustomPrompt(null);
          return;
        }

        if (deletePromptId) {
          setDeletePromptId(null);
          return;
        }

        if (query) {
          setQuery("");
          setPaletteFocusRequest((request) => request + 1);
          return;
        }

        if (isTextEditingTarget(event.target)) {
          if (event.target instanceof HTMLElement) {
            event.target.blur();
            setPaletteFocusRequest((request) => request + 1);
          }
        }
        return;
      }

      if (settingsOpen || customPromptDialogOpen || deletePromptId) return;

      if (
        event.key.toLowerCase() === "f" &&
        (event.metaKey || event.ctrlKey)
      ) {
        event.preventDefault();
        setSearchFocusRequest((request) => request + 1);
        return;
      }

      if (event.key === "/" && !isTextEditingTarget(event.target)) {
        event.preventDefault();
        setSearchFocusRequest((request) => request + 1);
        return;
      }

      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        if (isTextEditingTarget(event.target)) return;

        event.preventDefault();
        enableKeyboardMode();
        if (query) {
          setQuery("");
        }
        setActiveCategory((current) => {
          if (categoryIds.length === 0) return current;
          const currentIndex = Math.max(categoryIds.indexOf(current), 0);
          const direction = event.key === "ArrowRight" ? 1 : -1;
          const nextIndex =
            (currentIndex + direction + categoryIds.length) % categoryIds.length;
          return categoryIds[nextIndex];
        });
      }

      if (event.key === "ArrowDown") {
        event.preventDefault();
        enableKeyboardMode();
        setSelectedIndex((index) =>
          visiblePrompts.length === 0 ? 0 : Math.min(index + 1, visiblePrompts.length - 1)
        );
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        enableKeyboardMode();
        setSelectedIndex((index) => Math.max(index - 1, 0));
      }

      if (
        (event.key === "Home" || event.key === "End") &&
        !isTextEditingTarget(event.target)
      ) {
        event.preventDefault();
        enableKeyboardMode();
        setSelectedIndex(event.key === "Home" ? 0 : Math.max(visiblePrompts.length - 1, 0));
      }

      if (
        (event.key === "PageDown" || event.key === "PageUp") &&
        !isTextEditingTarget(event.target)
      ) {
        event.preventDefault();
        enableKeyboardMode();
        setSelectedIndex((index) => {
          if (visiblePrompts.length === 0) return 0;
          const direction = event.key === "PageDown" ? 1 : -1;
          return Math.min(
            Math.max(index + direction * 5, 0),
            visiblePrompts.length - 1
          );
        });
      }

      if (event.key === "Enter" && visiblePrompts[selectedIndex]) {
        event.preventDefault();
        void handleCopy(visiblePrompts[selectedIndex]);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    categoryIds,
    customPromptDialogOpen,
    deletePromptId,
    enableKeyboardMode,
    query,
    selectedIndex,
    settingsOpen,
    visiblePrompts
  ]);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) {
        window.clearTimeout(copyTimerRef.current);
      }
      if (noticeTimerRef.current) {
        window.clearTimeout(noticeTimerRef.current);
      }
    };
  }, []);

  function showNotice(notice: CopyNotice, duration = 1800) {
    if (copyTimerRef.current) {
      window.clearTimeout(copyTimerRef.current);
      copyTimerRef.current = undefined;
    }
    if (noticeTimerRef.current) {
      window.clearTimeout(noticeTimerRef.current);
    }

    setCopyNotice(notice);
    noticeTimerRef.current = window.setTimeout(() => {
      setCopyNotice(null);
    }, duration);
  }

  async function handleCopy(prompt: RescuePrompt) {
    if (copyTimerRef.current) {
      window.clearTimeout(copyTimerRef.current);
    }
    if (noticeTimerRef.current) {
      window.clearTimeout(noticeTimerRef.current);
      noticeTimerRef.current = undefined;
    }

    try {
      await copyText(prompt.text);
      setCopiedPromptId(prompt.id);
      setCopyNotice({ kind: "success", text: `已複製：${prompt.title}` });
      setRecentIds((ids) => {
        if (activeCategory === recentCategoryId && ids.includes(prompt.id)) {
          return ids;
        }
        return [prompt.id, ...ids.filter((id) => id !== prompt.id)].slice(0, 8);
      });
      copyTimerRef.current = window.setTimeout(() => {
        setCopiedPromptId(null);
        setCopyNotice(null);
        if (autoHideAfterCopy) {
          void hidePalette();
        }
      }, autoHideAfterCopy ? 650 : copyNoticeDurationMs);
    } catch {
      setCopiedPromptId(null);
      setCopyNotice({ kind: "error", text: "複製失敗，請再試一次。" });
      copyTimerRef.current = window.setTimeout(() => setCopyNotice(null), 2200);
    }
  }

  function handlePackChange(packId: string) {
    if (!packs.some((candidate) => candidate.id === packId)) return;

    setActivePackId(packId);
    const nextPack = packs.find((candidate) => candidate.id === packId);
    setActiveCategory(nextPack?.categories[0]?.id ?? defaultCategoryId);
    setQuery("");
  }

  function handleCategoryChange(categoryId: string) {
    setKeyboardMode(false);
    setQuery("");
    setActiveCategory(categoryId);
  }

  function handleCustomPromptCreate() {
    setEditingCustomPrompt(null);
    setCustomPromptDialogOpen(true);
  }

  function handleCustomPromptEdit(prompt: RescuePrompt) {
    setEditingCustomPrompt(prompt);
    setCustomPromptDialogOpen(true);
  }

  function handleCustomPromptDelete(promptId: string) {
    setDeletePromptId(promptId);
  }

  function confirmCustomPromptDelete() {
    if (!deletePromptId) return;
    const promptId = deletePromptId;
    const promptTitle =
      customPrompts.find((prompt) => prompt.id === promptId)?.title ?? uiCopy.categoryCustom;
    setDeletePromptId(null);
    setCustomPrompts((prompts) => prompts.filter((prompt) => prompt.id !== promptId));
    setFavorites((current) => {
      const next = new Set(current);
      next.delete(promptId);
      return next;
    });
    setRecentIds((ids) => ids.filter((id) => id !== promptId));
    setQuery("");
    setActiveCategory(customCategoryId);
    showNotice({ kind: "success", text: uiCopy.noticeDeleted(promptTitle) });
  }

  function handleCustomPromptSave(draft: CustomPromptDraft) {
    const title = draft.title.trim();
    const text = draft.text.trim();
    const tags = draft.tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);

    if (!title || !text) return;

    if (editingCustomPrompt) {
      setCustomPrompts((prompts) =>
        prompts.map((prompt) =>
          prompt.id === editingCustomPrompt.id
            ? { ...prompt, tags, text, title }
            : prompt
        )
      );
      showNotice({ kind: "success", text: uiCopy.noticeUpdated(title) });
    } else {
      setCustomPrompts((prompts) => [
        {
          category: customCategoryId,
          id: createCustomPromptId(),
          source: "custom",
          tags,
          text,
          title
        },
        ...prompts
      ]);
      setActiveCategory(customCategoryId);
      setQuery("");
      showNotice({ kind: "success", text: uiCopy.noticeAdded(title) });
    }

    setCustomPromptDialogOpen(false);
    setEditingCustomPrompt(null);
  }

  function handleFavoriteToggle(promptId: string) {
    setFavorites((current) => {
      const next = new Set(current);
      if (next.has(promptId)) {
        next.delete(promptId);
      } else {
        next.add(promptId);
      }
      return next;
    });
  }

  async function handleAutostartToggle(enabled: boolean) {
    setAutostartStatus(enabled ? "enabled" : "disabled");
    try {
      await setAutostartEnabled(enabled);
      setAutostartStatus(await getAutostartStatus());
    } catch {
      setAutostartStatus("unavailable");
    }
  }

  async function handleUpdateCheck() {
    pendingUpdateRef.current = null;
    setUpdateInfo(null);
    setUpdateProgress(null);
    setUpdateError(null);
    setUpdateStatus("checking");

    try {
      const update = await checkForUpdate();
      if (!update) {
        setUpdateStatus("notAvailable");
        return;
      }

      pendingUpdateRef.current = update;
      setUpdateInfo(toUpdateInfo(update));
      setUpdateStatus("available");
    } catch {
      setUpdateStatus("error");
      setUpdateError("目前無法檢查更新。請確認網路連線，或稍後再試。");
    }
  }

  async function handleUpdateInstall() {
    const update = pendingUpdateRef.current;
    if (!update) {
      await handleUpdateCheck();
      return;
    }

    setUpdateStatus("downloading");
    setUpdateError(null);
    setUpdateProgress({ downloaded: 0 });

    try {
      await installUpdate(update, setUpdateProgress);
      setUpdateStatus("restarting");
    } catch {
      setUpdateStatus("error");
      setUpdateError("更新安裝失敗。請重新檢查更新，或到 GitHub 下載最新版本。");
    }
  }

  return (
    <div className="appShell">
      <Palette
        activeCategory={activeCategory}
        activePackId={pack.id}
        categories={categories}
        copiedPromptId={copiedPromptId}
        copyNotice={copyNotice}
        favorites={favorites}
        keyboardMode={keyboardMode}
        onCategoryChange={handleCategoryChange}
        onCopy={handleCopy}
        onCustomPromptCreate={handleCustomPromptCreate}
        onCustomPromptDelete={handleCustomPromptDelete}
        onCustomPromptEdit={handleCustomPromptEdit}
        onFavoriteToggle={handleFavoriteToggle}
        onSettingsOpen={() => setSettingsOpen(true)}
        onPackChange={handlePackChange}
        onPointerActivity={handlePointerActivity}
        onQueryChange={setQuery}
        onSelectedIndexChange={setSelectedIndex}
        paletteFocusRequest={paletteFocusRequest}
        packName={pack.name}
        packs={packs.map((candidate) => ({
          id: candidate.id,
          locale: candidate.locale,
          name: candidate.name
        }))}
        prompts={visiblePrompts}
        query={query}
        searchFocusRequest={searchFocusRequest}
        selectedIndex={selectedIndex}
        searchShortcutLabel={platform.searchShortcutLabel}
        shortcutLabel={platform.shortcutLabel}
        uiCopy={uiCopy}
      />
      {settingsOpen ? (
        <SettingsPanel
          autoHideAfterCopy={autoHideAfterCopy}
          autostartStatus={autostartStatus}
          updateError={updateError}
          updateInfo={updateInfo}
          updateProgress={updateProgress}
          updateStatus={updateStatus}
          onAutoHideAfterCopyChange={setAutoHideAfterCopy}
          onAutostartToggle={handleAutostartToggle}
          onClose={() => setSettingsOpen(false)}
          onResetWindowPosition={() => void resetWindowPosition()}
          onUpdateCheck={handleUpdateCheck}
          onUpdateInstall={handleUpdateInstall}
          platformName={platform.name}
          shortcutLabel={platform.shortcutLabel}
        />
      ) : null}
      {deletePromptId ? (
        <ConfirmDialog
          body={uiCopy.deleteCustomPromptBody(
            customPrompts.find((prompt) => prompt.id === deletePromptId)?.title ??
              uiCopy.categoryCustom
          )}
          confirmLabel={uiCopy.delete}
          title={uiCopy.deleteCustomPrompt}
          cancelLabel={uiCopy.cancel}
          confirmEyebrow={uiCopy.confirm}
          onCancel={() => setDeletePromptId(null)}
          onConfirm={confirmCustomPromptDelete}
        />
      ) : null}
      {customPromptDialogOpen ? (
        <CustomPromptDialog
          editingPrompt={editingCustomPrompt}
          uiCopy={uiCopy}
          onClose={() => {
            setCustomPromptDialogOpen(false);
            setEditingCustomPrompt(null);
          }}
          onSave={handleCustomPromptSave}
        />
      ) : null}
    </div>
  );
}

type CopyNotice = {
  kind: "success" | "error";
  text: string;
};

function readStoredString(key: string, fallback: string) {
  return localStorage.getItem(key) ?? fallback;
}

function readStoredBoolean(key: string, fallback: boolean) {
  try {
    const value = localStorage.getItem(key);
    return value === null ? fallback : Boolean(JSON.parse(value));
  } catch {
    return fallback;
  }
}

function readStoredStringArray(key: string) {
  try {
    const value = JSON.parse(localStorage.getItem(key) ?? "[]");
    return Array.isArray(value)
      ? value.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}

function readStoredCustomPrompts(key: string): RescuePrompt[] {
  try {
    const value = JSON.parse(localStorage.getItem(key) ?? "[]");
    if (!Array.isArray(value)) return [];
    const seenIds = new Set<string>();

    return value
      .filter((item) => {
        return (
          item &&
          typeof item.id === "string" &&
          typeof item.title === "string" &&
          typeof item.text === "string"
        );
      })
      .filter((item) => {
        if (seenIds.has(item.id)) return false;
        seenIds.add(item.id);
        return true;
      })
      .map((item) => ({
        category: customCategoryId,
        id: item.id,
        source: "custom" as const,
        tags: Array.isArray(item.tags)
          ? item.tags.filter((tag: unknown): tag is string => typeof tag === "string")
          : [],
        text: item.text,
        title: item.title
      }));
  } catch {
    return [];
  }
}

function createCustomPromptId() {
  return `custom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function isTextEditingTarget(target: EventTarget | null) {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    (target instanceof HTMLElement && target.isContentEditable)
  );
}

function getPlatformMeta() {
  const platform = navigator.platform.toLowerCase();
  const userAgent = navigator.userAgent.toLowerCase();
  const isMac = platform.includes("mac") || userAgent.includes("mac os");
  const isWindows = platform.includes("win") || userAgent.includes("windows");

  return {
    name: isMac ? "macOS" : isWindows ? "Windows" : "桌面系統",
    searchShortcutLabel: isMac ? "⌘F" : "Ctrl F",
    shortcutLabel: isMac ? "⌘ ⇧ H" : "Ctrl Shift H"
  };
}
