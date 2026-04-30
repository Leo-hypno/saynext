import { useEffect, useRef } from "react";
import {
  Check,
  ChevronDown,
  Copy,
  Pencil,
  Plus,
  Search,
  Settings,
  Star,
  Trash2
} from "lucide-react";
import type { Category, RescuePrompt, UiCopy } from "../types";

type PaletteProps = {
  activePackId: string;
  categories: Category[];
  packName: string;
  packs: Array<{
    id: string;
    locale: string;
    name: string;
  }>;
  prompts: RescuePrompt[];
  activeCategory: string;
  copiedPromptId: string | null;
  copyNotice: {
    kind: "success" | "error";
    text: string;
  } | null;
  favorites: Set<string>;
  keyboardMode: boolean;
  query: string;
  selectedIndex: number;
  searchFocusRequest: number;
  onCategoryChange: (category: string) => void;
  onCopy: (prompt: RescuePrompt) => void;
  onCustomPromptCreate: () => void;
  onCustomPromptDelete: (promptId: string) => void;
  onCustomPromptEdit: (prompt: RescuePrompt) => void;
  onFavoriteToggle: (promptId: string) => void;
  onSettingsOpen: () => void;
  onPackChange: (packId: string) => void;
  onPointerActivity: () => boolean;
  onQueryChange: (query: string) => void;
  onSelectedIndexChange: (index: number) => void;
  paletteFocusRequest: number;
  searchShortcutLabel: string;
  shortcutLabel: string;
  uiCopy: UiCopy;
};

export function Palette({
  activePackId,
  categories,
  packName,
  packs,
  prompts,
  activeCategory,
  copiedPromptId,
  copyNotice,
  favorites,
  keyboardMode,
  query,
  selectedIndex,
  searchFocusRequest,
  onCategoryChange,
  onCopy,
  onCustomPromptCreate,
  onCustomPromptDelete,
  onCustomPromptEdit,
  onFavoriteToggle,
  onSettingsOpen,
  onPackChange,
  onPointerActivity,
  onQueryChange,
  onSelectedIndexChange,
  paletteFocusRequest,
  searchShortcutLabel,
  shortcutLabel,
  uiCopy
}: PaletteProps) {
  const paletteRef = useRef<HTMLElement | null>(null);
  const languageMenuRef = useRef<HTMLDetailsElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const searching = Boolean(query.trim());

  useEffect(() => {
    paletteRef.current?.focus();
  }, []);

  useEffect(() => {
    const focusPalette = () => {
      if (
        document.activeElement === document.body ||
        document.activeElement === null
      ) {
        paletteRef.current?.focus();
      }
    };

    window.addEventListener("focus", focusPalette);
    return () => window.removeEventListener("focus", focusPalette);
  }, []);

  useEffect(() => {
    if (searchFocusRequest > 0) {
      searchInputRef.current?.focus();
    }
  }, [searchFocusRequest]);

  useEffect(() => {
    if (paletteFocusRequest > 0) {
      paletteRef.current?.focus();
    }
  }, [paletteFocusRequest]);

  useEffect(() => {
    paletteRef.current
      ?.querySelector(".promptRow.selected")
      ?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  useEffect(() => {
    paletteRef.current
      ?.querySelector(".categoryTabs button.active")
      ?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [activeCategory]);

  useEffect(() => {
    const closeLanguageMenu = (event: MouseEvent) => {
      if (
        languageMenuRef.current?.open &&
        event.target instanceof Node &&
        !languageMenuRef.current.contains(event.target)
      ) {
        languageMenuRef.current.open = false;
      }
    };

    document.addEventListener("mousedown", closeLanguageMenu);
    return () => document.removeEventListener("mousedown", closeLanguageMenu);
  }, []);

  return (
    <main
      ref={paletteRef}
      className={`palette ${keyboardMode ? "keyboardMode" : ""}`}
      aria-label="SayNext rescue prompt palette"
      onPointerDown={onPointerActivity}
      onPointerMove={onPointerActivity}
      tabIndex={-1}
    >
      <header className="paletteHeader">
        <div className="paletteTitle">
          <p className="eyebrow">SayNext</p>
          <h1>AI 下一句</h1>
        </div>
        <div className="headerActions" onMouseDown={(event) => event.stopPropagation()}>
          <details className="languageMenu" ref={languageMenuRef}>
            <summary aria-label={uiCopy.language}>
              <span>
                <strong>{languageName(activeLocale(activePackId, packs))}</strong>
              </span>
              <ChevronDown size={15} />
            </summary>
            <div className="languageMenuPanel">
              {packs.map((pack) => (
                <button
                  className={pack.id === activePackId ? "active" : ""}
                  key={pack.id}
                  onClick={(event) => {
                    event.currentTarget.closest("details")?.removeAttribute("open");
                    onPackChange(pack.id);
                  }}
                  type="button"
                >
                  <strong>{languageName(pack.locale)}</strong>
                </button>
              ))}
            </div>
          </details>
          <span className="shortcut">{shortcutLabel}</span>
          <button
            className="compactButton headerAddButton"
            onClick={onCustomPromptCreate}
            title={uiCopy.addCustomPrompt}
            type="button"
          >
            <Plus size={15} />
            {uiCopy.addCustomPrompt}
          </button>
          <button
            className="iconButton"
            onClick={onSettingsOpen}
            title={uiCopy.settings}
            type="button"
          >
            <Settings size={17} />
          </button>
        </div>
      </header>

      <label className="searchBox">
        <Search size={18} aria-hidden="true" />
        <input
          ref={searchInputRef}
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder={uiCopy.searchPlaceholder(packName, searchShortcutLabel)}
          aria-label={uiCopy.searchAriaLabel}
        />
        {query.trim() ? <span className="searchScope">{uiCopy.allCategories}</span> : null}
      </label>

      <nav className="categoryTabs" aria-label="Prompt categories">
        {categories[0] ? (
          <button
            className={!searching && activeCategory === categories[0].id ? "active" : ""}
            onClick={() => onCategoryChange(categories[0].id)}
            title={categories[0].name}
            type="button"
          >
            {categories[0].name}
          </button>
        ) : null}
        <button
          className={!searching && activeCategory === "recent" ? "active" : ""}
          onClick={() => onCategoryChange("recent")}
          title={uiCopy.categoryRecent}
          type="button"
        >
          {uiCopy.categoryRecent}
        </button>
        {categories.slice(1).map((category) => (
          <button
            className={!searching && activeCategory === category.id ? "active" : ""}
            key={category.id}
            onClick={() => onCategoryChange(category.id)}
            title={category.name}
            type="button"
          >
            {category.name}
          </button>
        ))}
      </nav>

      <section className="promptList" aria-label="Rescue prompts" role="listbox">
        {prompts.length === 0 ? (
          <div className="emptyState">
            <p>{emptyStateTitle(activeCategory, query, uiCopy)}</p>
            <span>{emptyStateCopy(activeCategory, query, uiCopy)}</span>
          </div>
        ) : (
          prompts.map((prompt, index) => (
            <article
              aria-selected={index === selectedIndex}
              className={`promptRow ${index === selectedIndex ? "selected" : ""}`}
              key={prompt.id}
              onClick={() => onCopy(prompt)}
              onPointerEnter={() => {
                if (onPointerActivity()) {
                  onSelectedIndexChange(index);
                }
              }}
              role="option"
            >
              <button
                className="iconButton"
                onClick={(event) => {
                  event.stopPropagation();
                  onFavoriteToggle(prompt.id);
                }}
                title={favorites.has(prompt.id) ? uiCopy.unfavorite : uiCopy.favorite}
                type="button"
              >
                <Star
                  fill={favorites.has(prompt.id) ? "currentColor" : "none"}
                  size={17}
                />
              </button>
              <div className="promptBody">
                <div className="promptMeta">
                  <strong>{prompt.title}</strong>
                  <span>{categoryName(categories, prompt.category)}</span>
                </div>
                <p>{prompt.text}</p>
              </div>
              <div className="copyState">
                {prompt.source === "custom" ? (
                  <>
                    <button
                      className="iconButton rowAction"
                      onClick={(event) => {
                        event.stopPropagation();
                        onCustomPromptEdit(prompt);
                      }}
                      title={uiCopy.editCustomPrompt}
                      type="button"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      className="iconButton rowAction danger"
                      onClick={(event) => {
                        event.stopPropagation();
                        onCustomPromptDelete(prompt.id);
                      }}
                      title={uiCopy.delete}
                      type="button"
                    >
                      <Trash2 size={15} />
                    </button>
                  </>
                ) : null}
                {copiedPromptId === prompt.id ? (
                  <Check size={18} />
                ) : (
                  <Copy size={18} />
                )}
              </div>
            </article>
          ))
        )}
      </section>

      <footer className="paletteFooter">
        <span>{uiCopy.footerCopy}</span>
        <span>{uiCopy.footerSearchClose}</span>
        <span>{uiCopy.footerSelect}</span>
        <span>{uiCopy.footerJump}</span>
        <span>{uiCopy.footerCategory}</span>
        <span>{uiCopy.footerSearch}</span>
        <span
          aria-live="polite"
          className={`copyNotice ${copyNotice?.kind ?? ""}`}
          role="status"
        >
          {copyNotice?.text ?? ""}
        </span>
      </footer>
    </main>
  );
}

function categoryName(categories: Category[], categoryId: string) {
  return categories.find((category) => category.id === categoryId)?.name ?? categoryId;
}

function languageName(locale: string) {
  if (locale === "zh-TW") return "繁體中文";
  if (locale === "en") return "English";
  return locale;
}

function activeLocale(activePackId: string, packs: PaletteProps["packs"]) {
  return packs.find((pack) => pack.id === activePackId)?.locale ?? "";
}

function emptyStateCopy(activeCategory: string, query: string, uiCopy: UiCopy) {
  if (query.trim()) return uiCopy.placeholderSearchSamples;
  if (activeCategory === "recent") return uiCopy.emptyRecentCopy;
  if (activeCategory === "custom") return uiCopy.emptyCustomCopy;
  return uiCopy.emptyCategoryCopy;
}

function emptyStateTitle(activeCategory: string, query: string, uiCopy: UiCopy) {
  if (activeCategory === "recent" && !query.trim()) return uiCopy.emptyRecentTitle;
  if (activeCategory === "custom" && !query.trim()) return uiCopy.emptyCustomTitle;
  return uiCopy.emptyCategoryTitle;
}
