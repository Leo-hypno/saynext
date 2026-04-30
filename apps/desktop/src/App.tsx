import { useEffect, useMemo, useRef, useState } from "react";
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
import { buildCategoryIds, getVisiblePrompts, recentCategoryId } from "./lib/promptView";
import englishPackData from "../../../packs/en/beginner-rescue.json";
import zhTwPackData from "../../../packs/zh-TW/beginner-rescue.json";
import type { PromptPack, RescuePrompt } from "./types";

const packs = [zhTwPackData, englishPackData] as PromptPack[];
const defaultPackId = "beginner-rescue-zh-tw";
const defaultCategoryId = "start";

export function App() {
  const copyTimerRef = useRef<number | undefined>(undefined);
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
  const [searchFocusRequest, setSearchFocusRequest] = useState(0);
  const [paletteFocusRequest, setPaletteFocusRequest] = useState(0);
  const [autoHideAfterCopy, setAutoHideAfterCopy] = useState(
    () => readStoredBoolean("saynext.autoHideAfterCopy", true)
  );
  const [autostartStatus, setAutostartStatus] = useState<AutostartStatus>("checking");
  const [favorites, setFavorites] = useState<Set<string>>(
    () => new Set(readStoredStringArray("saynext.favorites"))
  );
  const [recentIds, setRecentIds] = useState<string[]>(
    () => readStoredStringArray("saynext.recentIds")
  );

  const pack = useMemo(
    () => packs.find((candidate) => candidate.id === activePackId) ?? packs[0],
    [activePackId]
  );

  const categoryIds = useMemo(() => {
    return buildCategoryIds(pack.categories);
  }, [pack.categories]);

  const visiblePrompts = useMemo(() => {
    return getVisiblePrompts({
      activeCategory,
      categories: pack.categories,
      favorites,
      prompts: pack.prompts,
      query,
      recentIds
    });
  }, [activeCategory, favorites, pack.prompts, query, recentIds]);

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

        if (isTextEditingTarget(event.target)) {
          if (query) {
            setQuery("");
          } else if (event.target instanceof HTMLElement) {
            event.target.blur();
            setPaletteFocusRequest((request) => request + 1);
          }
        }
        return;
      }

      if (settingsOpen) return;

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
        setKeyboardMode(true);
        setActiveCategory((current) => {
          const currentIndex = Math.max(categoryIds.indexOf(current), 0);
          const direction = event.key === "ArrowRight" ? 1 : -1;
          const nextIndex =
            (currentIndex + direction + categoryIds.length) % categoryIds.length;
          return categoryIds[nextIndex];
        });
      }

      if (event.key === "ArrowDown") {
        event.preventDefault();
        setKeyboardMode(true);
        setSelectedIndex((index) =>
          visiblePrompts.length === 0 ? 0 : Math.min(index + 1, visiblePrompts.length - 1)
        );
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        setKeyboardMode(true);
        setSelectedIndex((index) => Math.max(index - 1, 0));
      }

      if (
        (event.key === "Home" || event.key === "End") &&
        !isTextEditingTarget(event.target)
      ) {
        event.preventDefault();
        setKeyboardMode(true);
        setSelectedIndex(event.key === "Home" ? 0 : Math.max(visiblePrompts.length - 1, 0));
      }

      if (
        (event.key === "PageDown" || event.key === "PageUp") &&
        !isTextEditingTarget(event.target)
      ) {
        event.preventDefault();
        setKeyboardMode(true);
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
  }, [categoryIds, query, selectedIndex, settingsOpen, visiblePrompts]);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) {
        window.clearTimeout(copyTimerRef.current);
      }
    };
  }, []);

  async function handleCopy(prompt: RescuePrompt) {
    if (copyTimerRef.current) {
      window.clearTimeout(copyTimerRef.current);
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
      }, 650);
    } catch {
      setCopiedPromptId(null);
      setCopyNotice({ kind: "error", text: "複製失敗，請再試一次。" });
      copyTimerRef.current = window.setTimeout(() => setCopyNotice(null), 2200);
    }
  }

  function handlePackChange(packId: string) {
    setActivePackId(packId);
    const nextPack = packs.find((candidate) => candidate.id === packId);
    setActiveCategory(nextPack?.categories[0]?.id ?? defaultCategoryId);
    setQuery("");
  }

  function handleCategoryChange(categoryId: string) {
    setKeyboardMode(false);
    setActiveCategory(categoryId);
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

  return (
    <div className="appShell">
      <Palette
        activeCategory={activeCategory}
        activePackId={pack.id}
        categories={pack.categories}
        copiedPromptId={copiedPromptId}
        copyNotice={copyNotice}
        favorites={favorites}
        keyboardMode={keyboardMode}
        onCategoryChange={handleCategoryChange}
        onCopy={handleCopy}
        onFavoriteToggle={handleFavoriteToggle}
        onSettingsOpen={() => setSettingsOpen(true)}
        onPackChange={handlePackChange}
        onPointerActivity={() => setKeyboardMode(false)}
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
      />
      {settingsOpen ? (
        <SettingsPanel
          autoHideAfterCopy={autoHideAfterCopy}
          autostartStatus={autostartStatus}
          onAutoHideAfterCopyChange={setAutoHideAfterCopy}
          onAutostartToggle={handleAutostartToggle}
          onClose={() => setSettingsOpen(false)}
          onResetWindowPosition={() => void resetWindowPosition()}
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

function isTextEditingTarget(target: EventTarget | null) {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    (target instanceof HTMLElement && target.isContentEditable)
  );
}
