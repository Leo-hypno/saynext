import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ConfirmDialog } from "./components/ConfirmDialog";
import { CustomCategoryDialog } from "./components/CustomCategoryDialog";
import { CustomPromptDialog } from "./components/CustomPromptDialog";
import { Palette } from "./components/Palette";
import { SettingsPanel } from "./components/SettingsPanel";
import {
  createCustomCategory,
  customCategoriesEqual,
  mergeCustomCategoriesForImport,
  normalizeCustomCategoriesWithRemap
} from "./lib/customCategories";
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
  favoritesCategoryId,
  getVisiblePrompts,
  recentCategoryId
} from "./lib/promptView";
import { getUiCopy } from "./lib/uiCopy";
import germanPackData from "../../../packs/de/beginner-rescue.json";
import englishPackData from "../../../packs/en/beginner-rescue.json";
import spanishPackData from "../../../packs/es/beginner-rescue.json";
import frenchPackData from "../../../packs/fr/beginner-rescue.json";
import japanesePackData from "../../../packs/ja/beginner-rescue.json";
import koreanPackData from "../../../packs/ko/beginner-rescue.json";
import portugueseBrazilPackData from "../../../packs/pt-BR/beginner-rescue.json";
import zhTwPackData from "../../../packs/zh-TW/beginner-rescue.json";
import type { Update } from "@tauri-apps/plugin-updater";
import type {
  Category,
  CustomCategory,
  CustomPromptDraft,
  PromptPack,
  RescuePrompt,
  ThemeMode,
  UpdateErrorCode
} from "./types";

const packs = [
  englishPackData,
  zhTwPackData,
  japanesePackData,
  koreanPackData,
  spanishPackData,
  frenchPackData,
  germanPackData,
  portugueseBrazilPackData
] as PromptPack[];
const defaultPackId = "beginner-rescue-en";
const defaultCategoryId = "start";
const pointerResumeDelayMs = 700;
const copyNoticeDurationMs = 1800;
const activePackStorageKey = "saynext.activePackId";
const customCategoriesStorageKey = "saynext.customCategories";
const customPromptsStorageKey = "saynext.customPrompts";
const onboardingDismissedKey = "saynext.onboardingDismissed";
const surfaceCategoryOrder = [
  "start",
  "confused",
  "improve",
  "research-planning",
  "execute",
  "review"
];
const allBuiltInCategoryIds = new Set(
  packs.flatMap((pack) => pack.categories.map((category) => category.id))
);
const allBuiltInPromptIds = new Set(
  packs.flatMap((pack) => pack.prompts.map((prompt) => prompt.id))
);
const reservedCustomCategoryIds = new Set([
  ...allBuiltInCategoryIds,
  recentCategoryId,
  favoritesCategoryId,
  customCategoryId
]);
const customPromptCategoryAliases = new Map([
  ["refused", "improve"],
  ["planning", "research"],
  ["research-planning", "research"],
  ["next", "execute"]
]);

type SurfaceCategoryGroup = {
  categoryIds: string[];
  hint: string;
  id: string;
  kind: "core" | "custom";
  name: string;
};

export function App() {
  const isPackAvailable = useCallback((packId: string) => {
    return packs.some((pack) => pack.id === packId);
  }, []);

  const copyTimerRef = useRef<number | undefined>(undefined);
  const noticeTimerRef = useRef<number | undefined>(undefined);
  const lastKeyboardNavigationRef = useRef(0);
  const pendingSelectedPromptIdRef = useRef<string | null>(null);
  const pendingUpdateRef = useRef<Update | null>(null);
  const initialStoredCustomDataRef = useRef<{
    categories: CustomCategory[];
    prompts: RescuePrompt[];
  } | null>(null);
  if (initialStoredCustomDataRef.current === null) {
    initialStoredCustomDataRef.current = readStoredCustomData(getStoredPackLocale());
  }
  const [activePackId, setActivePackId] = useState(() =>
    (() => {
      const storedPackId = readStoredString(activePackStorageKey, defaultPackId);
      return packs.some((pack) => pack.id === storedPackId) ? storedPackId : defaultPackId;
    })()
  );
  const [languageChoiceOpen, setLanguageChoiceOpen] = useState(() => {
    const storedPackId = localStorage.getItem(activePackStorageKey);
    return storedPackId === null || !packs.some((pack) => pack.id === storedPackId);
  });
  const [activeCategory, setActiveCategory] = useState(defaultCategoryId);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [keyboardMode, setKeyboardMode] = useState(false);
  const [copiedPromptId, setCopiedPromptId] = useState<string | null>(null);
  const [copyNotice, setCopyNotice] = useState<CopyNotice | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [customPromptDialogOpen, setCustomPromptDialogOpen] = useState(false);
  const [editingCustomPrompt, setEditingCustomPrompt] = useState<RescuePrompt | null>(null);
  const [customCategoryDialogOpen, setCustomCategoryDialogOpen] = useState(false);
  const [editingCustomCategory, setEditingCustomCategory] = useState<CustomCategory | null>(null);
  const [managedCustomCategoryId, setManagedCustomCategoryId] = useState<string | null>(null);
  const [deletePromptId, setDeletePromptId] = useState<string | null>(null);
  const [deleteCustomCategoryId, setDeleteCustomCategoryId] = useState<string | null>(null);
  const [categoryDialogSource, setCategoryDialogSource] = useState<"manager" | "prompt" | null>(
    null
  );
  const [categoryDialogLocale, setCategoryDialogLocale] = useState<string | null>(null);
  const [promptDialogSelectedCategoryId, setPromptDialogSelectedCategoryId] = useState<
    string | null
  >(null);
  const [paletteFocusRequest, setPaletteFocusRequest] = useState(0);
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => readStoredThemeMode("saynext.themeMode"));
  const [autostartStatus, setAutostartStatus] = useState<AutostartStatus>("checking");
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>("idle");
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [updateProgress, setUpdateProgress] = useState<UpdateProgress | null>(null);
  const [updateError, setUpdateError] = useState<UpdateErrorCode | null>(null);
  const [favorites, setFavorites] = useState<Set<string>>(
    () => new Set(readStoredStringArray("saynext.favorites"))
  );
  const [recentIds, setRecentIds] = useState<string[]>(
    () => readStoredStringArray("saynext.recentIds")
  );
  const [customCategories, setCustomCategories] = useState<CustomCategory[]>(() =>
    initialStoredCustomDataRef.current?.categories ?? []
  );
  const [customPrompts, setCustomPrompts] = useState<RescuePrompt[]>(() =>
    initialStoredCustomDataRef.current?.prompts ?? []
  );
  const [onboardingVisible, setOnboardingVisible] = useState(
    () => localStorage.getItem(onboardingDismissedKey) !== "true"
  );
  const platform = useMemo(getPlatformMeta, []);

  const pack = useMemo(() => {
    if (isPackAvailable(activePackId)) {
      return packs.find((candidate) => candidate.id === activePackId) ?? packs[0];
    }
    return packs[0];
  }, [activePackId, isPackAvailable]);
  const uiCopy = useMemo(() => getUiCopy(pack.locale), [pack.locale]);

  const builtInCategories = useMemo(() => pack.categories, [pack.categories]);
  const customCategoryLookup = useMemo(
    () => [...customCategories].sort((left, right) => left.createdAt.localeCompare(right.createdAt)),
    [customCategories]
  );
  const currentLocaleCustomCategories = useMemo(
    () =>
      customCategoryLookup
        .filter((category) => category.locale === pack.locale)
        .sort((left, right) => left.createdAt.localeCompare(right.createdAt)),
    [customCategoryLookup, pack.locale]
  );
  const categoryLookup = useMemo(
    () => [...builtInCategories, ...customCategoryLookup],
    [builtInCategories, customCategoryLookup]
  );

  const surfaceCategories = useMemo(() => {
    const coreGroups: SurfaceCategoryGroup[] = [
      {
        categoryIds: ["start"],
        hint: uiCopy.tabStartHint,
        id: "start",
        kind: "core",
        name: uiCopy.tabStart
      },
      {
        categoryIds: ["confused"],
        hint: uiCopy.tabConfusedHint,
        id: "confused",
        kind: "core",
        name: uiCopy.tabConfused
      },
      {
        categoryIds: ["improve", "refused"],
        hint: uiCopy.tabImproveHint,
        id: "improve",
        kind: "core",
        name: uiCopy.tabImprove
      },
      {
        categoryIds: ["research", "planning"],
        hint: uiCopy.tabResearchPlanningHint,
        id: "research-planning",
        kind: "core",
        name: uiCopy.tabResearchPlanning
      },
      {
        categoryIds: ["execute", "next"],
        hint: uiCopy.tabExecuteHint,
        id: "execute",
        kind: "core",
        name: uiCopy.tabExecute
      },
      {
        categoryIds: ["review"],
        hint: uiCopy.tabReviewHint,
        id: "review",
        kind: "core",
        name: uiCopy.tabReview
      }
    ];

    const builtInSurfaceCategories = coreGroups
      .map((group) => {
        const categoryIds = group.categoryIds.filter((categoryId) =>
          builtInCategories.some((category) => category.id === categoryId)
        );
        return categoryIds.length === 0 ? null : { ...group, categoryIds };
      })
      .filter((group): group is SurfaceCategoryGroup => group !== null);

    const customSurfaceCategories = currentLocaleCustomCategories.map((category) => ({
      categoryIds: [category.id],
      hint: uiCopy.manageCustomCategoriesDescription,
      id: category.id,
      kind: "custom" as const,
      name: category.name
    }));

    return [...builtInSurfaceCategories, ...customSurfaceCategories];
  }, [builtInCategories, currentLocaleCustomCategories, uiCopy]);

  const surfaceCategoryGroupMap = useMemo(
    () => Object.fromEntries(surfaceCategories.map((category) => [category.id, category.categoryIds])),
    [surfaceCategories]
  );
  const builtInPlacementCategories = useMemo(
    () =>
      surfaceCategories
        .filter((category) => category.kind === "core")
        .map((category) => ({
          id: category.categoryIds[0] ?? category.id,
          name: category.name
        })),
    [surfaceCategories]
  );
  const categoryDisplayLookup = useMemo(() => {
    const displayCategories = surfaceCategories
      .filter((category) => category.kind === "core")
      .flatMap((category) =>
        category.categoryIds.map((categoryId) => ({
          id: categoryId,
          name: category.name
        }))
      );
    const displayedIds = new Set(displayCategories.map((category) => category.id));

    return [
      ...displayCategories,
      ...builtInCategories.filter((category) => !displayedIds.has(category.id)),
      ...customCategoryLookup
    ];
  }, [builtInCategories, customCategoryLookup, surfaceCategories]);
  const surfaceCategoryIds = useMemo(
    () => surfaceCategories.map((category) => category.id),
    [surfaceCategories]
  );

  const visibleCustomPrompts = useMemo(
    () => customPrompts.filter((prompt) => prompt.locale === pack.locale),
    [customPrompts, pack.locale]
  );
  const customPromptLocale = editingCustomPrompt?.locale ?? pack.locale;
  const dialogCustomCategories = useMemo(
    () => customCategoryLookup.filter((category) => category.locale === customPromptLocale),
    [customCategoryLookup, customPromptLocale]
  );
  const customCategoryLocales = useMemo(
    () => new Map(customCategoryLookup.map((category) => [category.id, category.locale])),
    [customCategoryLookup]
  );
  const localizedBuiltInPrompts = useMemo(
    () => pack.prompts.map((prompt) => ({ ...prompt, source: "built-in" as const })),
    [pack.prompts]
  );
  const prompts = useMemo(
    () => [...localizedBuiltInPrompts, ...visibleCustomPrompts],
    [localizedBuiltInPrompts, visibleCustomPrompts]
  );
  const personalPrompts = useMemo(
    () => [...localizedBuiltInPrompts, ...customPrompts],
    [customPrompts, localizedBuiltInPrompts]
  );

  const categoryIds = useMemo(() => {
    const fallbackCategory = builtInCategories[0]?.id || defaultCategoryId;
    return buildCategoryIds(surfaceCategoryIds, fallbackCategory);
  }, [builtInCategories, surfaceCategoryIds]);

  const customPromptDefaultCategory = useMemo(() => {
    if (surfaceCategoryGroupMap[activeCategory]?.length) {
      return surfaceCategoryGroupMap[activeCategory][0];
    }

    return categoryLookup.some((category) => category.id === activeCategory)
      ? activeCategory
      : builtInCategories[0]?.id ?? defaultCategoryId;
  }, [activeCategory, builtInCategories, categoryLookup, surfaceCategoryGroupMap]);

  const visiblePrompts = useMemo(() => {
    return getVisiblePrompts({
      activeCategory,
      allCustomPrompts: customPrompts,
      categoryGroups: surfaceCategoryGroupMap,
      categories: builtInCategories,
      favorites,
      personalPrompts,
      prompts,
      recentIds
    });
  }, [
    activeCategory,
    builtInCategories,
    customPrompts,
    favorites,
    personalPrompts,
    prompts,
    recentIds,
    surfaceCategoryGroupMap
  ]);

  const recentPromptCount = useMemo(() => {
    return recentIds.filter((id) => personalPrompts.some((prompt) => prompt.id === id)).length;
  }, [personalPrompts, recentIds]);

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
    const { categories: normalized, categoryIdMap } = normalizeCustomCategoriesWithRemap(
      customCategories,
      pack.locale,
      { reservedIds: reservedCustomCategoryIds }
    );
    if (!customCategoriesEqual(customCategories, normalized)) {
      setCustomCategories(normalized);
    }
    if (hasCategoryIdRemap(categoryIdMap)) {
      setCustomPrompts((current) => remapCustomPromptCategories(current, categoryIdMap));
    }
  }, [customCategories, pack.locale]);

  useEffect(() => {
    const validCategoryIds = new Set([
      ...allBuiltInCategoryIds,
      ...customCategories.map((category) => category.id)
    ]);
    const fallbackCategory = builtInCategories[0]?.id ?? defaultCategoryId;

    setCustomPrompts((current) => {
      const next = normalizeCustomPrompts(current, {
        fallbackCategory,
        fallbackLocale: pack.locale,
        customCategoryLocales,
        reservedIds: allBuiltInPromptIds,
        validCategoryIds
      });

      return customPromptListsEqual(current, next) ? current : next;
    });
  }, [builtInCategories, customCategories, customCategoryLocales, pack.locale]);

  useEffect(() => {
    if (!languageChoiceOpen) {
      localStorage.setItem(activePackStorageKey, activePackId);
    }
  }, [activePackId, languageChoiceOpen]);

  useEffect(() => {
    localStorage.setItem("saynext.favorites", JSON.stringify([...favorites]));
  }, [favorites]);

  useEffect(() => {
    localStorage.setItem("saynext.recentIds", JSON.stringify(recentIds));
  }, [recentIds]);

  useEffect(() => {
    localStorage.setItem(customCategoriesStorageKey, JSON.stringify(customCategories));
  }, [customCategories]);

  useEffect(() => {
    localStorage.setItem(customPromptsStorageKey, JSON.stringify(customPrompts));
  }, [customPrompts]);

  useEffect(() => {
    document.documentElement.dataset.theme = themeMode;
    localStorage.setItem("saynext.themeMode", themeMode);
  }, [themeMode]);

  useEffect(() => {
    if (currentLocaleCustomCategories.length === 0) {
      if (managedCustomCategoryId !== null) {
        setManagedCustomCategoryId(null);
      }
      return;
    }

    if (!currentLocaleCustomCategories.some((category) => category.id === managedCustomCategoryId)) {
      setManagedCustomCategoryId(currentLocaleCustomCategories[0].id);
    }
  }, [currentLocaleCustomCategories, managedCustomCategoryId]);

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

        if (customCategoryDialogOpen) {
          closeCustomCategoryDialog();
          return;
        }

        if (customPromptDialogOpen) {
          closeCustomPromptDialog();
          return;
        }

        if (deleteCustomCategoryId) {
          setDeleteCustomCategoryId(null);
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

      if (languageChoiceOpen) return;
      if (
        settingsOpen ||
        customPromptDialogOpen ||
        customCategoryDialogOpen ||
        deletePromptId ||
        deleteCustomCategoryId
      ) {
        return;
      }

      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        if (isTextEditingTarget(event.target)) return;

        event.preventDefault();
        enableKeyboardMode();
        setActiveCategory((current) => {
          if (categoryIds.length === 0) return current;
          const currentIndex = Math.max(categoryIds.indexOf(current), 0);
          const direction = event.key === "ArrowRight" ? 1 : -1;
          const nextIndex = (currentIndex + direction + categoryIds.length) % categoryIds.length;
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

      if ((event.key === "Home" || event.key === "End") && !isTextEditingTarget(event.target)) {
        event.preventDefault();
        enableKeyboardMode();
        setSelectedIndex(event.key === "Home" ? 0 : Math.max(visiblePrompts.length - 1, 0));
      }

      if ((event.key === "PageDown" || event.key === "PageUp") && !isTextEditingTarget(event.target)) {
        event.preventDefault();
        enableKeyboardMode();
        setSelectedIndex((index) => {
          if (visiblePrompts.length === 0) return 0;
          const direction = event.key === "PageDown" ? 1 : -1;
          return Math.min(Math.max(index + direction * 5, 0), visiblePrompts.length - 1);
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
    customCategoryDialogOpen,
    customPromptDialogOpen,
    deleteCustomCategoryId,
    deletePromptId,
    enableKeyboardMode,
    languageChoiceOpen,
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

  function closeCustomPromptDialog() {
    setCustomPromptDialogOpen(false);
    setEditingCustomPrompt(null);
    setPromptDialogSelectedCategoryId(null);
  }

  function openCustomCategoryDialog(source: "manager" | "prompt", category?: CustomCategory | null) {
    setCategoryDialogSource(source);
    setEditingCustomCategory(category ?? null);
    setCategoryDialogLocale(category?.locale ?? (source === "prompt" ? customPromptLocale : pack.locale));
    setCustomCategoryDialogOpen(true);
  }

  function closeCustomCategoryDialog() {
    setCustomCategoryDialogOpen(false);
    setEditingCustomCategory(null);
    setCategoryDialogSource(null);
    setCategoryDialogLocale(null);
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
      setCopyNotice({ kind: "success", text: uiCopy.noticeCopied(prompt.title) });
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
      setCopyNotice({ kind: "error", text: uiCopy.noticeCopyFailed });
      copyTimerRef.current = window.setTimeout(() => setCopyNotice(null), 2200);
    }
  }

  function handlePackChange(packId: string) {
    if (!packs.some((candidate) => candidate.id === packId)) return;

    setActivePackId(packId);
    const nextPack = packs.find((candidate) => candidate.id === packId);
    const fallbackCategory = nextPack?.categories?.[0]?.id ?? defaultCategoryId;
    const nextPackCategoryIds = new Set(nextPack?.categories?.map((category) => category.id) ?? []);
    const nextActiveCategory =
      surfaceCategoryOrder.find((categoryId) => nextPackCategoryIds.has(categoryId)) ??
      fallbackCategory;

    setActiveCategory(nextActiveCategory);
  }

  function handleInitialLanguageSelect(packId: string) {
    handlePackChange(packId);
    localStorage.setItem(activePackStorageKey, packId);
    setLanguageChoiceOpen(false);
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
    setPromptDialogSelectedCategoryId(null);
    setCustomPromptDialogOpen(true);
  }

  function handleCustomPromptEdit(prompt: RescuePrompt) {
    setEditingCustomPrompt(prompt);
    setPromptDialogSelectedCategoryId(null);
    setCustomPromptDialogOpen(true);
  }

  function handleCustomPromptMove(promptId: string, category: string) {
    if (!categoryLookup.some((candidate) => candidate.id === category)) return;
    const targetCustomCategory = customCategoryLookup.find((candidate) => candidate.id === category);
    const promptLocale = customPrompts.find((prompt) => prompt.id === promptId)?.locale ?? pack.locale;
    if (targetCustomCategory && targetCustomCategory.locale !== promptLocale) return;

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
            ? {
                ...prompt,
                category: draft.category || customCategoryId,
                locale: editingCustomPrompt.locale ?? pack.locale,
                tags,
                text,
                title
              }
            : prompt
        )
      );
      showNotice({ kind: "success", text: uiCopy.noticeUpdated(title) });
    } else {
      setCustomPrompts((prompts) => [
        {
          category: draft.category || customCategoryId,
          id: createCustomPromptId(),
          locale: pack.locale,
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

    closeCustomPromptDialog();
  }

  function handleCustomCategoryCreate() {
    openCustomCategoryDialog("manager");
  }

  function handleCustomCategoryCreateFromPromptDialog() {
    openCustomCategoryDialog("prompt");
  }

  function handleCustomCategoryEdit(categoryId: string) {
    const category = customCategories.find((candidate) => candidate.id === categoryId);
    if (!category) return;
    openCustomCategoryDialog("manager", category);
  }

  function handleCustomCategoryDelete(categoryId: string) {
    setDeleteCustomCategoryId(categoryId);
  }

  function handleCustomCategorySave(name: string) {
    if (editingCustomCategory) {
      setCustomCategories((current) =>
        current.map((category) =>
          category.id === editingCustomCategory.id ? { ...category, name } : category
        )
      );
      setManagedCustomCategoryId(editingCustomCategory.id);
      showNotice({ kind: "success", text: uiCopy.noticeCategoryUpdated(name) });
      closeCustomCategoryDialog();
      return;
    }

    const createdCategory = createCustomCategory(
      name,
      categoryDialogLocale ?? pack.locale,
      new Set(customCategories.map((category) => category.id))
    );
    setCustomCategories((current) => [...current, createdCategory]);
    setManagedCustomCategoryId(createdCategory.id);
    if (categoryDialogSource === "prompt") {
      setPromptDialogSelectedCategoryId(createdCategory.id);
    } else {
      setActiveCategory(createdCategory.id);
    }
    showNotice({ kind: "success", text: uiCopy.noticeCategoryAdded(createdCategory.name) });
    closeCustomCategoryDialog();
  }

  function confirmCustomCategoryDelete() {
    if (!deleteCustomCategoryId) return;

    const categoryId = deleteCustomCategoryId;
    const category = customCategories.find((candidate) => candidate.id === categoryId);
    if (!category) {
      setDeleteCustomCategoryId(null);
      return;
    }

    const fallbackCategory = builtInCategories[0]?.id ?? defaultCategoryId;
    setDeleteCustomCategoryId(null);
    setCustomCategories((current) => current.filter((candidate) => candidate.id !== categoryId));
    setCustomPrompts((current) =>
      current.map((prompt) =>
        prompt.category === categoryId ? { ...prompt, category: fallbackCategory } : prompt
      )
    );
    setActiveCategory(customCategoryId);
    setManagedCustomCategoryId(null);
    setPromptDialogSelectedCategoryId(null);
    showNotice({ kind: "success", text: uiCopy.noticeCategoryDeleted(category.name) });
  }

  function handleCustomPromptsExport() {
    const data = {
      app: "SayNext",
      categories: customCategories.map(({ createdAt, id, locale, name }) => ({
        createdAt,
        id,
        locale,
        name
      })),
      exportedAt: new Date().toISOString(),
      prompts: customPrompts.map(({ category, id, locale, tags, text, title }) => ({
        category,
        id,
        locale,
        tags,
        text,
        title
      })),
      version: 2
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
      const {
        categories: importedCategories,
        categoryIdMap: normalizedImportedCategoryIdMap
      } = normalizeCustomCategoriesWithRemap(getImportCategoryItems(parsed), pack.locale, {
        reservedIds: reservedCustomCategoryIds
      });
      const { categories: mergedCategories, importedCategoryIdMap } =
        mergeCustomCategoriesForImport(customCategories, importedCategories);
      const validCategoryIds = new Set([
        ...allBuiltInCategoryIds,
        ...mergedCategories.map((category) => category.id)
      ]);
      const rawImportedPrompts = remapRawPromptCategoryIds(
        remapRawPromptCategoryIds(getImportPromptItems(parsed), normalizedImportedCategoryIdMap),
        importedCategoryIdMap
      );
      const normalizedImportedPrompts = normalizeCustomPrompts(rawImportedPrompts, {
        fallbackCategory: builtInCategories[0]?.id ?? defaultCategoryId,
        fallbackLocale: pack.locale,
        customCategoryLocales: new Map(
          mergedCategories.map((category) => [category.id, category.locale])
        ),
        reservedIds: allBuiltInPromptIds,
        validCategoryIds
      });

      if (importedCategories.length === 0 && normalizedImportedPrompts.length === 0) {
        showNotice({ kind: "error", text: uiCopy.noticeImportFailed });
        return;
      }

      if (importedCategories.length > 0) {
        setCustomCategories(mergedCategories);
      }
      if (normalizedImportedPrompts.length > 0) {
        setCustomPrompts((current) => mergeCustomPrompts(current, normalizedImportedPrompts));
      }

      setActiveCategory(customCategoryId);
      showNotice({
        kind: "success",
        text: uiCopy.noticeImported(normalizedImportedPrompts.length)
      });
    } catch {
      showNotice({ kind: "error", text: uiCopy.noticeImportFailed });
    }
  }

  function handleFavoriteToggle(promptId: string) {
    const promptTitle =
      personalPrompts.find((prompt) => prompt.id === promptId)?.title ?? uiCopy.categoryFavorites;
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
      setUpdateError("checkFailed");
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
      setUpdateError("installFailed");
    }
  }

  const deleteCustomCategoryPromptCount = deleteCustomCategoryId
    ? customPrompts.filter((prompt) => prompt.category === deleteCustomCategoryId).length
    : 0;

  return (
    <div className="appShell" data-theme={themeMode}>
      {languageChoiceOpen ? (
        <LanguageChoice
          packs={packs.map((candidate) => ({
            id: candidate.id,
            locale: candidate.locale,
            name: candidate.name
          }))}
          onSelect={handleInitialLanguageSelect}
        />
      ) : (
        <Palette
          activeCategory={activeCategory}
          activePackId={pack.id}
          allCustomCategories={customCategoryLookup}
          builtInCategories={builtInPlacementCategories}
          categories={categoryDisplayLookup}
          customCategories={currentLocaleCustomCategories}
          surfaceCategories={surfaceCategories}
          copiedPromptId={copiedPromptId}
          copyNotice={copyNotice}
          favorites={favorites}
          keyboardMode={keyboardMode}
          managedCustomCategoryId={managedCustomCategoryId}
          onboardingVisible={onboardingVisible}
          recentCount={recentPromptCount}
          onCategoryChange={handleCategoryChange}
          onCopy={handleCopy}
          onCustomCategoryCreate={handleCustomCategoryCreate}
          onCustomCategoryDelete={handleCustomCategoryDelete}
          onCustomCategoryEdit={handleCustomCategoryEdit}
          onCustomPromptCreate={handleCustomPromptCreate}
          onCustomPromptDelete={handleCustomPromptDelete}
          onCustomPromptEdit={handleCustomPromptEdit}
          onCustomPromptMove={handleCustomPromptMove}
          onFavoriteToggle={handleFavoriteToggle}
          onManagedCustomCategoryChange={setManagedCustomCategoryId}
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
      )}
      {!languageChoiceOpen && settingsOpen ? (
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
      {!languageChoiceOpen && deletePromptId ? (
        <ConfirmDialog
          body={uiCopy.deleteCustomPromptBody(
            customPrompts.find((prompt) => prompt.id === deletePromptId)?.title ??
              uiCopy.categoryCustom
          )}
          cancelLabel={uiCopy.cancel}
          confirmEyebrow={uiCopy.confirm}
          confirmLabel={uiCopy.delete}
          title={uiCopy.deleteCustomPrompt}
          onCancel={() => setDeletePromptId(null)}
          onConfirm={confirmCustomPromptDelete}
        />
      ) : null}
      {!languageChoiceOpen && deleteCustomCategoryId ? (
        <ConfirmDialog
          body={uiCopy.deleteCustomCategoryBody(
            customCategories.find((category) => category.id === deleteCustomCategoryId)?.name ??
              uiCopy.categoryCustom,
            deleteCustomCategoryPromptCount
          )}
          cancelLabel={uiCopy.cancel}
          confirmEyebrow={uiCopy.confirm}
          confirmLabel={uiCopy.delete}
          title={uiCopy.deleteCustomCategory}
          onCancel={() => setDeleteCustomCategoryId(null)}
          onConfirm={confirmCustomCategoryDelete}
        />
      ) : null}
      {!languageChoiceOpen && customPromptDialogOpen ? (
        <CustomPromptDialog
          builtInCategories={builtInPlacementCategories}
          customCategories={customCategoryLookup}
          defaultCategory={customPromptDefaultCategory}
          editingPrompt={editingCustomPrompt}
          locale={customPromptLocale}
          selectedCategoryId={promptDialogSelectedCategoryId}
          uiCopy={uiCopy}
          onCreateCategoryRequest={handleCustomCategoryCreateFromPromptDialog}
          onClose={closeCustomPromptDialog}
          onSave={handleCustomPromptSave}
        />
      ) : null}
      {!languageChoiceOpen && customCategoryDialogOpen ? (
        <CustomCategoryDialog
          categories={dialogCustomCategories}
          editingCategory={editingCustomCategory}
          locale={categoryDialogLocale ?? pack.locale}
          uiCopy={uiCopy}
          onClose={closeCustomCategoryDialog}
          onSave={handleCustomCategorySave}
        />
      ) : null}
    </div>
  );
}

type CopyNotice = {
  kind: "success" | "error";
  text: string;
};

type LanguageChoiceProps = {
  packs: Array<{
    id: string;
    locale: string;
    name: string;
  }>;
  onSelect: (packId: string) => void;
};

function LanguageChoice({ packs, onSelect }: LanguageChoiceProps) {
  const orderedPacks = [...packs].sort((left, right) => {
    if (left.locale === "en") return -1;
    if (right.locale === "en") return 1;
    return 0;
  });

  return (
    <section className="languageChoice" aria-labelledby="language-choice-title">
      <p className="eyebrow">SAYNEXT</p>
      <h1 id="language-choice-title">Choose your language</h1>
      <p className="languageChoiceLead">選擇語言後，就會進入 SayNext。</p>
      <div className="languageChoiceGrid">
        {orderedPacks.map((pack) => (
          <button
            autoFocus={pack.locale === "en"}
            className={pack.locale === "en" ? "recommended" : ""}
            key={pack.id}
            onClick={() => onSelect(pack.id)}
            type="button"
          >
            <span>{languageChoiceName(pack.locale)}</span>
            <strong>{pack.name}</strong>
            {pack.locale === "en" ? <em>Default</em> : null}
          </button>
        ))}
      </div>
    </section>
  );
}

function languageChoiceName(locale: string) {
  if (locale === "zh-TW") return "繁體中文";
  if (locale === "en") return "English";
  if (locale === "ja") return "日本語";
  if (locale === "ko") return "한국어";
  if (locale === "es") return "Español";
  if (locale === "fr") return "Français";
  if (locale === "de") return "Deutsch";
  if (locale === "pt-BR") return "Português do Brasil";
  return locale;
}

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

function getStoredPackLocale() {
  const storedPackId = readStoredString(activePackStorageKey, defaultPackId);
  return packs.find((pack) => pack.id === storedPackId)?.locale ?? packs[0].locale;
}

function readStoredCustomData(fallbackLocale: string) {
  const {
    categories,
    categoryIdMap
  } = readStoredCustomCategoriesWithRemap(customCategoriesStorageKey, fallbackLocale);
  const validCategoryIds = new Set([
    ...allBuiltInCategoryIds,
    ...categories.map((category) => category.id)
  ]);
  const customCategoryLocales = new Map(categories.map((category) => [category.id, category.locale]));
  const rawPrompts = readStoredJsonArray(customPromptsStorageKey);
  const remappedPrompts = remapRawPromptCategoryIds(rawPrompts, categoryIdMap);
  const prompts = normalizeCustomPrompts(remappedPrompts, {
    fallbackCategory: defaultCategoryId,
    fallbackLocale,
    customCategoryLocales,
    reservedIds: allBuiltInPromptIds,
    validCategoryIds
  });

  return { categories, prompts };
}

function readStoredCustomCategoriesWithRemap(key: string, fallbackLocale: string) {
  try {
    const value = JSON.parse(localStorage.getItem(key) ?? "[]");
    return normalizeCustomCategoriesWithRemap(value, fallbackLocale, {
      reservedIds: reservedCustomCategoryIds
    });
  } catch {
    return {
      categories: [],
      categoryIdMap: new Map<string, string>()
    };
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

function readStoredJsonArray(key: string) {
  try {
    const value = JSON.parse(localStorage.getItem(key) ?? "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function getImportCategoryItems(value: unknown) {
  if (
    value &&
    typeof value === "object" &&
    "categories" in value &&
    Array.isArray((value as { categories?: unknown }).categories)
  ) {
    return (value as { categories: unknown[] }).categories;
  }
  return [];
}

function normalizeCustomPrompts(
  value: unknown,
  options: {
    fallbackCategory: string;
    fallbackLocale: string;
    customCategoryLocales?: Map<string, string>;
    reservedIds?: Set<string>;
    validCategoryIds?: Set<string>;
  }
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
      locale?: unknown;
      tags?: unknown;
      text: string;
      title: string;
    };
    const requestedId = rawPrompt.id.trim();
    const title = rawPrompt.title.trim();
    const text = rawPrompt.text.trim();

    if (!requestedId || !title || !text) continue;

    const locale =
      typeof rawPrompt.locale === "string" && rawPrompt.locale.trim().length > 0
        ? rawPrompt.locale.trim()
        : options.fallbackLocale;
    const requestedCategory =
      typeof rawPrompt.category === "string" ? rawPrompt.category : options.fallbackCategory;
    const normalizedCategory = normalizeCustomPromptCategory(requestedCategory);
    const categoryLocale = options.customCategoryLocales?.get(normalizedCategory);
    const category =
      (!options.validCategoryIds || options.validCategoryIds.has(normalizedCategory)) &&
      (!categoryLocale || categoryLocale === locale)
        ? normalizedCategory
        : options.fallbackCategory;
    const id = usedIds.has(requestedId) ? createCustomPromptId(usedIds) : requestedId;
    usedIds.add(id);

    prompts.push({
      category,
      id,
      locale,
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

function normalizeCustomPromptCategory(category: string) {
  return customPromptCategoryAliases.get(category) ?? category;
}

function mergeCustomPrompts(current: RescuePrompt[], imported: RescuePrompt[]) {
  const importedIds = new Set(imported.map((prompt) => prompt.id));
  return [...imported, ...current.filter((prompt) => !importedIds.has(prompt.id))];
}

function remapRawPromptCategoryIds(
  value: unknown[],
  categoryIdMap: Map<string, string>
) {
  if (categoryIdMap.size === 0) return value;

  return value.map((item) => {
    if (!item || typeof item !== "object") return item;
    const rawPrompt = item as { category?: unknown };
    if (
      typeof rawPrompt.category === "string" &&
      categoryIdMap.has(rawPrompt.category)
    ) {
      return {
        ...rawPrompt,
        category: categoryIdMap.get(rawPrompt.category)
      };
    }
    return item;
  });
}

function remapCustomPromptCategories(
  prompts: RescuePrompt[],
  categoryIdMap: Map<string, string>
) {
  if (!hasCategoryIdRemap(categoryIdMap)) return prompts;

  let changed = false;
  const next = prompts.map((prompt) => {
    const nextCategory = categoryIdMap.get(prompt.category);
    if (!nextCategory || nextCategory === prompt.category) {
      return prompt;
    }
    changed = true;
    return { ...prompt, category: nextCategory };
  });

  return changed ? next : prompts;
}

function hasCategoryIdRemap(categoryIdMap: Map<string, string>) {
  for (const [from, to] of categoryIdMap) {
    if (from !== to) return true;
  }
  return false;
}

function customPromptListsEqual(left: RescuePrompt[], right: RescuePrompt[]) {
  if (left.length !== right.length) return false;

  return left.every((prompt, index) => {
    const other = right[index];
    return (
      other &&
      prompt.category === other.category &&
      prompt.id === other.id &&
      prompt.locale === other.locale &&
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
