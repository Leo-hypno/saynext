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
import { copyText } from "./lib/clipboard";
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
import {
  buildCategoryIds,
  customCategoryId,
  getVisiblePrompts,
  recentCategoryId
} from "./lib/promptView";
import { getUiCopy } from "./lib/uiCopy";
import englishPackData from "../../../packs/en/beginner-rescue.json";
import zhTwPackData from "../../../packs/zh-TW/beginner-rescue.json";
import type { Update } from "@tauri-apps/plugin-updater";
import type { CustomPromptDraft, PromptPack, RescuePrompt, ThemeMode } from "./types";

const packs = [zhTwPackData, englishPackData] as PromptPack[];
const defaultPackId = "beginner-rescue-zh-tw";
const defaultCategoryId = "start";
const pointerResumeDelayMs = 700;
const copyNoticeDurationMs = 1800;
const onboardingDismissedKey = "saynext.onboardingDismissed";

export function App() {
  const copyTimerRef = useRef<number | undefined>(undefined);
  const noticeTimerRef = useRef<number | undefined>(undefined);
  const lastKeyboardNavigationRef = useRef(0);
  const pendingSelectedPromptIdRef = useRef<string | null>(null);
  const pendingUpdateRef = useRef<Update | null>(null);
  const [activePackId, setActivePackId] = useState(() =>
    readStoredString("saynext.activePackId", defaultPackId)
  );
  const [activeCategory, setActiveCategory] = useState(defaultCategoryId);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [keyboardMode, setKeyboardMode] = useState(false);
  const [copiedPromptId, setCopiedPromptId] = useState<string | null>(null);
  const [copyNotice, setCopyNotice] = useState<CopyNotice | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [customPromptDialogOpen, setCustomPromptDialogOpen] = useState(false);
  const [editingCustomPrompt, setEditingCustomPrompt] = useState<RescuePrompt | null>(null);
  const [deletePromptId, setDeletePromptId] = useState<string | null>(null);
  const [paletteFocusRequest, setPaletteFocusRequest] = useState(0);
  const [themeMode, setThemeMode] = useState<ThemeMode>(
    () => readStoredThemeMode("saynext.themeMode")
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
  const [onboardingVisible, setOnboardingVisible] = useState(
    () => localStorage.getItem(onboardingDismissedKey) !== "true"
  );
  const platform = useMemo(getPlatformMeta, []);

  const pack = useMemo(
    () => packs.find((candidate) => candidate.id === activePackId) ?? packs[0],
    [activePackId]
  );
  const uiCopy = useMemo(() => getUiCopy(pack.locale), [pack.locale]);

  const categories = useMemo(() => {
    return pack.categories;
  }, [pack.categories]);

  const prompts = useMemo(
    () => [
      ...pack.prompts.map((prompt) => ({ ...prompt, source: "built-in" as const })),
      ...customPrompts
    ],
    [customPrompts, pack.prompts]
  );

  const builtInPromptIds = useMemo(() => {
    return new Set(pack.prompts.map((prompt) => prompt.id));
  }, [pack.prompts]);

  const categoryIds = useMemo(() => {
    return buildCategoryIds(categories);
  }, [categories]);

  const customPromptDefaultCategory = useMemo(() => {
    return categories.some((category) => category.id === activeCategory)
      ? activeCategory
      : categories[0]?.id ?? defaultCategoryId;
  }, [activeCategory, categories]);

  const visiblePrompts = useMemo(() => {
    return getVisiblePrompts({
      activeCategory,
      categories,
      favorites,
      prompts,
      recentIds
    });
  }, [activeCategory, categories, favorites, prompts, recentIds]);

  const recentPromptCount = useMemo(() => {
    return recentIds.filter((id) => prompts.some((prompt) => prompt.id === id)).length;
  }, [prompts, recentIds]);

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
  }, [activeCategory, activePackId]);

  useEffect(() => {
    setSelectedIndex((index) => {
      const pendingPromptId = pendingSelectedPromptIdRef.current;
      if (pendingPromptId) {
        pendingSelectedPromptIdRef.current = null;
        const nextIndex = visiblePrompts.findIndex((prompt) => prompt.id === pendingPromptId);
        if (nextIndex >= 0) {
          return nextIndex;
        }
      }

      if (visiblePrompts.length === 0) return 0;
      return Math.min(index, visiblePrompts.length - 1);
    });
  }, [visiblePrompts]);

  useEffect(() => {
    if (categoryIds.length > 0 && !categoryIds.includes(activeCategory)) {
      setActiveCategory(categoryIds[0]);
    }
  }, [activeCategory, categoryIds]);

  useEffect(() => {
    const validCategoryIds = new Set(categories.map((category) => category.id));
    const fallbackCategory = categories[0]?.id ?? defaultCategoryId;

    setCustomPrompts((current) => {
      const next = normalizeCustomPrompts(current, {
        fallbackCategory,
        reservedIds: builtInPromptIds,
        validCategoryIds
      });

      return customPromptListsEqual(current, next) ? current : next;
    });
  }, [builtInPromptIds, categories]);

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
    document.documentElement.dataset.theme = themeMode;
    localStorage.setItem("saynext.themeMode", themeMode);
  }, [themeMode]);

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

        if (isTextEditingTarget(event.target)) {
          if (event.target instanceof HTMLElement) {
            event.target.blur();
            setPaletteFocusRequest((request) => request + 1);
          }
        }
        return;
      }

      if (settingsOpen || customPromptDialogOpen || deletePromptId) return;

      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        if (isTextEditingTarget(event.target)) return;

        event.preventDefault();
        enableKeyboardMode();
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

      if (
        event.key.toLowerCase() === "f" &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.altKey &&
        !isTextEditingTarget(event.target) &&
        visiblePrompts[selectedIndex]
      ) {
        event.preventDefault();
        enableKeyboardMode();
        handleFavoriteToggle(visiblePrompts[selectedIndex].id);
      }

      if (
        event.key === "Enter" &&
        !isInteractiveTarget(event.target) &&
        visiblePrompts[selectedIndex]
      ) {
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
      }, copyNoticeDurationMs);
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
  }

  function handleCategoryChange(categoryId: string) {
    setKeyboardMode(false);
    setActiveCategory(categoryId);
  }

  function handleOnboardingDismiss() {
    localStorage.setItem(onboardingDismissedKey, "true");
    setOnboardingVisible(false);
  }

  function handleCustomPromptCreate() {
    setEditingCustomPrompt(null);
    setCustomPromptDialogOpen(true);
  }

  function handleCustomPromptEdit(prompt: RescuePrompt) {
    setEditingCustomPrompt(prompt);
    setCustomPromptDialogOpen(true);
  }

  function handleCustomPromptMove(promptId: string, category: string) {
    if (!categories.some((candidate) => candidate.id === category)) return;

    const promptTitle =
      customPrompts.find((prompt) => prompt.id === promptId)?.title ?? uiCopy.categoryCustom;
    setCustomPrompts((prompts) =>
      prompts.map((prompt) => (prompt.id === promptId ? { ...prompt, category } : prompt))
    );
    showNotice({ kind: "success", text: uiCopy.noticeUpdated(promptTitle) });
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
            ? { ...prompt, category: draft.category || customCategoryId, tags, text, title }
            : prompt
        )
      );
      showNotice({ kind: "success", text: uiCopy.noticeUpdated(title) });
    } else {
      setCustomPrompts((prompts) => [
        {
          category: draft.category || customCategoryId,
          id: createCustomPromptId(),
          source: "custom",
          tags,
          text,
          title
        },
        ...prompts
      ]);
      setActiveCategory(draft.category || customCategoryId);
      showNotice({ kind: "success", text: uiCopy.noticeAdded(title) });
    }

    setCustomPromptDialogOpen(false);
    setEditingCustomPrompt(null);
  }

  function handleCustomPromptsExport() {
    const data = {
      app: "SayNext",
      exportedAt: new Date().toISOString(),
      version: 1,
      prompts: customPrompts.map(({ category, id, tags, text, title }) => ({
        category,
        id,
        tags,
        text,
        title
      }))
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.download = `saynext-prompts-${new Date().toISOString().slice(0, 10)}.json`;
    link.href = url;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
    showNotice({ kind: "success", text: uiCopy.noticeExported(customPrompts.length) });
  }

  async function handleCustomPromptsImport(file: File) {
    try {
      const parsed = JSON.parse(await file.text()) as unknown;
      const categoryIds = new Set(categories.map((category) => category.id));
      const imported = normalizeCustomPrompts(getImportPromptItems(parsed), {
        fallbackCategory: categories[0]?.id ?? defaultCategoryId,
        reservedIds: builtInPromptIds,
        validCategoryIds: categoryIds
      });

      if (imported.length === 0) {
        showNotice({ kind: "error", text: uiCopy.noticeImportFailed });
        return;
      }

      setCustomPrompts((current) => mergeCustomPrompts(current, imported));
      setActiveCategory(customCategoryId);
      showNotice({ kind: "success", text: uiCopy.noticeImported(imported.length) });
    } catch {
      showNotice({ kind: "error", text: uiCopy.noticeImportFailed });
    }
  }

  function handleFavoriteToggle(promptId: string) {
    const promptTitle =
      prompts.find((prompt) => prompt.id === promptId)?.title ?? uiCopy.categoryFavorites;
    const wasFavorite = favorites.has(promptId);

    pendingSelectedPromptIdRef.current = promptId;
    setFavorites((current) => {
      const next = new Set(current);
      if (next.has(promptId)) {
        next.delete(promptId);
      } else {
        next.add(promptId);
      }
      return next;
    });
    showNotice({
      kind: "success",
      text: wasFavorite
        ? uiCopy.noticeFavoriteRemoved(promptTitle)
        : uiCopy.noticeFavoriteAdded(promptTitle)
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
    <div className="appShell" data-theme={themeMode}>
      <Palette
        activeCategory={activeCategory}
        activePackId={pack.id}
        categories={categories}
        copiedPromptId={copiedPromptId}
        copyNotice={copyNotice}
        favorites={favorites}
        keyboardMode={keyboardMode}
        onboardingVisible={onboardingVisible}
        recentCount={recentPromptCount}
        onCategoryChange={handleCategoryChange}
        onCopy={handleCopy}
        onCustomPromptCreate={handleCustomPromptCreate}
        onCustomPromptDelete={handleCustomPromptDelete}
        onCustomPromptEdit={handleCustomPromptEdit}
        onCustomPromptMove={handleCustomPromptMove}
        onFavoriteToggle={handleFavoriteToggle}
        onOnboardingDismiss={handleOnboardingDismiss}
        onSettingsOpen={() => setSettingsOpen(true)}
        onPackChange={handlePackChange}
        onPointerActivity={handlePointerActivity}
        onSelectedIndexChange={setSelectedIndex}
        paletteFocusRequest={paletteFocusRequest}
        packs={packs.map((candidate) => ({
          id: candidate.id,
          locale: candidate.locale,
          name: candidate.name
        }))}
        prompts={visiblePrompts}
        selectedIndex={selectedIndex}
        shortcutLabel={platform.shortcutLabel}
        uiCopy={uiCopy}
      />
      {settingsOpen ? (
        <SettingsPanel
          autostartStatus={autostartStatus}
          themeMode={themeMode}
          updateError={updateError}
          updateInfo={updateInfo}
          updateProgress={updateProgress}
          updateStatus={updateStatus}
          onAutostartToggle={handleAutostartToggle}
          onClose={() => setSettingsOpen(false)}
          onCustomPromptsExport={handleCustomPromptsExport}
          onCustomPromptsImport={(file) => void handleCustomPromptsImport(file)}
          onResetWindowPosition={() => void resetWindowPosition()}
          onThemeModeChange={setThemeMode}
          onUpdateCheck={handleUpdateCheck}
          onUpdateInstall={handleUpdateInstall}
          platformName={platform.name}
          shortcutLabel={platform.shortcutLabel}
          uiCopy={uiCopy}
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
          categories={categories}
          defaultCategory={customPromptDefaultCategory}
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

function readStoredThemeMode(key: string): ThemeMode {
  const value = readStoredString(key, "system");
  return value === "light" || value === "dark" || value === "system" ? value : "system";
}

function readStoredCustomPrompts(key: string): RescuePrompt[] {
  try {
    const value = JSON.parse(localStorage.getItem(key) ?? "[]");
    return normalizeCustomPrompts(value, { fallbackCategory: defaultCategoryId });
  } catch {
    return [];
  }
}

function getImportPromptItems(value: unknown) {
  if (Array.isArray(value)) return value;
  if (
    value &&
    typeof value === "object" &&
    "prompts" in value &&
    Array.isArray((value as { prompts?: unknown }).prompts)
  ) {
    return (value as { prompts: unknown[] }).prompts;
  }
  return [];
}

function normalizeCustomPrompts(
  value: unknown,
  options: { fallbackCategory: string; reservedIds?: Set<string>; validCategoryIds?: Set<string> }
): RescuePrompt[] {
  if (!Array.isArray(value)) return [];
  const usedIds = new Set(options.reservedIds ?? []);
  const prompts: RescuePrompt[] = [];

  for (const item of value) {
    if (
      !item ||
      typeof item !== "object" ||
      typeof (item as { id?: unknown }).id !== "string" ||
      typeof (item as { title?: unknown }).title !== "string" ||
      typeof (item as { text?: unknown }).text !== "string"
    ) {
      continue;
    }

    const rawPrompt = item as {
      category?: unknown;
      id: string;
      tags?: unknown;
      text: string;
      title: string;
    };
    const requestedId = rawPrompt.id.trim();
    const title = rawPrompt.title.trim();
    const text = rawPrompt.text.trim();

    if (!requestedId || !title || !text) continue;

    const category =
      typeof rawPrompt.category === "string" &&
      (!options.validCategoryIds || options.validCategoryIds.has(rawPrompt.category))
        ? rawPrompt.category
        : options.fallbackCategory;
    const id = usedIds.has(requestedId) ? createCustomPromptId(usedIds) : requestedId;
    usedIds.add(id);

    prompts.push({
      category,
      id,
      source: "custom" as const,
      tags: Array.isArray(rawPrompt.tags)
        ? rawPrompt.tags
            .filter((tag: unknown): tag is string => typeof tag === "string")
            .map((tag) => tag.trim())
            .filter(Boolean)
        : [],
      text,
      title
    });
  }

  return prompts;
}

function mergeCustomPrompts(current: RescuePrompt[], imported: RescuePrompt[]) {
  const importedIds = new Set(imported.map((prompt) => prompt.id));
  return [...imported, ...current.filter((prompt) => !importedIds.has(prompt.id))];
}

function customPromptListsEqual(left: RescuePrompt[], right: RescuePrompt[]) {
  if (left.length !== right.length) return false;

  return left.every((prompt, index) => {
    const other = right[index];
    return (
      other &&
      prompt.category === other.category &&
      prompt.id === other.id &&
      prompt.text === other.text &&
      prompt.title === other.title &&
      prompt.tags.length === other.tags.length &&
      prompt.tags.every((tag, tagIndex) => tag === other.tags[tagIndex])
    );
  });
}

function createCustomPromptId(existingIds = new Set<string>()) {
  let id = "";
  do {
    id = `custom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  } while (existingIds.has(id));
  return id;
}

function isTextEditingTarget(target: EventTarget | null) {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    (target instanceof HTMLElement && target.isContentEditable)
  );
}

function isInteractiveTarget(target: EventTarget | null) {
  return (
    isTextEditingTarget(target) ||
    target instanceof HTMLButtonElement ||
    target instanceof HTMLAnchorElement ||
    target instanceof HTMLDetailsElement ||
    (target instanceof HTMLElement &&
      Boolean(target.closest("button, a, select, summary, details, [role='button']")))
  );
}

function getPlatformMeta() {
  const platform = navigator.platform.toLowerCase();
  const userAgent = navigator.userAgent.toLowerCase();
  const isMac = platform.includes("mac") || userAgent.includes("mac os");
  const isWindows = platform.includes("win") || userAgent.includes("windows");

  return {
    name: isMac ? "macOS" : isWindows ? "Windows" : "桌面系統",
    shortcutLabel: isMac ? "⌘ ⇧ H" : "Ctrl Shift H"
  };
}
