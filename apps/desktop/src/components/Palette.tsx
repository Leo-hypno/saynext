import { useEffect, useRef } from "react";
import {
  Check,
  ChevronDown,
  Clock,
  Copy,
  FileText,
  Pencil,
  Plus,
  Settings,
  Star,
  Trash2
} from "lucide-react";
import { customCategoryId, favoritesCategoryId, recentCategoryId } from "../lib/promptView";
import type { Category, RescuePrompt, UiCopy } from "../types";

type PaletteProps = {
  activePackId: string;
  categories: Category[];
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
  recentCount: number;
  selectedIndex: number;
  onCategoryChange: (category: string) => void;
  onCopy: (prompt: RescuePrompt) => void;
  onCustomPromptCreate: () => void;
  onCustomPromptDelete: (promptId: string) => void;
  onCustomPromptEdit: (prompt: RescuePrompt) => void;
  onCustomPromptMove: (promptId: string, category: string) => void;
  onFavoriteToggle: (promptId: string) => void;
  onSettingsOpen: () => void;
  onPackChange: (packId: string) => void;
  onPointerActivity: () => boolean;
  onSelectedIndexChange: (index: number) => void;
  paletteFocusRequest: number;
  shortcutLabel: string;
  uiCopy: UiCopy;
};

export function Palette({
  activePackId,
  categories,
  packs,
  prompts,
  activeCategory,
  copiedPromptId,
  copyNotice,
  favorites,
  keyboardMode,
  recentCount,
  selectedIndex,
  onCategoryChange,
  onCopy,
  onCustomPromptCreate,
  onCustomPromptDelete,
  onCustomPromptEdit,
  onCustomPromptMove,
  onFavoriteToggle,
  onSettingsOpen,
  onPackChange,
  onPointerActivity,
  onSelectedIndexChange,
  paletteFocusRequest,
  shortcutLabel,
  uiCopy
}: PaletteProps) {
  const paletteRef = useRef<HTMLElement | null>(null);
  const languageMenuRef = useRef<HTMLDetailsElement | null>(null);

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
      ?.querySelector(".categoryTabs button.active, .personalTabs button.active")
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
          <p className="eyebrow">{uiCopy.appEyebrow}</p>
          <h1>{uiCopy.appTitle}</h1>
        </div>
        <div className="headerActions" onMouseDown={(event) => event.stopPropagation()}>
          <details className="languageMenu" ref={languageMenuRef}>
            <summary aria-label={uiCopy.language}>
              <span className="languageSummaryText">
                <em>{uiCopy.language}</em>
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
            onClick={() => {
              languageMenuRef.current?.removeAttribute("open");
              onCustomPromptCreate();
            }}
            title={uiCopy.addCustomPrompt}
            type="button"
          >
            <Plus size={15} />
            {uiCopy.addCustomPrompt}
          </button>
          <button
            className="iconButton"
            onClick={() => {
              languageMenuRef.current?.removeAttribute("open");
              onSettingsOpen();
            }}
            title={uiCopy.settings}
            type="button"
          >
            <Settings size={17} />
          </button>
        </div>
      </header>

      <nav className="personalTabs" aria-label="Personal prompt shortcuts">
        <button
          className={activeCategory === recentCategoryId ? "active" : ""}
          onClick={() => onCategoryChange(recentCategoryId)}
          title={recentCount > 0 ? uiCopy.categoryRecent : uiCopy.categoryRecentEmpty}
          type="button"
        >
          <Clock size={14} />
          {recentCount > 0 ? uiCopy.categoryRecent : uiCopy.categoryRecentEmpty}
        </button>
        <button
          className={activeCategory === favoritesCategoryId ? "active" : ""}
          onClick={() => onCategoryChange(favoritesCategoryId)}
          title={uiCopy.categoryFavorites}
          type="button"
        >
          <Star size={14} />
          {uiCopy.categoryFavorites}
        </button>
        <button
          className={activeCategory === customCategoryId ? "active" : ""}
          onClick={() => onCategoryChange(customCategoryId)}
          title={uiCopy.categoryCustom}
          type="button"
        >
          <FileText size={14} />
          {uiCopy.categoryCustom}
        </button>
      </nav>

      <nav className="categoryTabs" aria-label="Prompt categories">
        {categories.map((category) => (
          <button
            className={activeCategory === category.id ? "active" : ""}
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
            <p>{emptyStateTitle(activeCategory, uiCopy)}</p>
            <span>{emptyStateCopy(activeCategory, uiCopy)}</span>
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
                  {prompt.source === "custom" ? (
                    <span className="customBadge">{uiCopy.customPromptBadge}</span>
                  ) : null}
                  <span>{categoryName(categories, prompt.category, uiCopy)}</span>
                </div>
                <p>{prompt.text}</p>
              </div>
              <div className="copyState">
                {prompt.source === "custom" ? (
                  <>
                    <select
                      aria-label={uiCopy.labelPlacement}
                      className="rowCategorySelect"
                      onClick={(event) => event.stopPropagation()}
                      onChange={(event) => {
                        event.stopPropagation();
                        onCustomPromptMove(prompt.id, event.target.value);
                      }}
                      title={uiCopy.labelPlacement}
                      value={prompt.category}
                    >
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
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
        <span>{uiCopy.footerFavorite}</span>
        <span>{uiCopy.footerSelect}</span>
        <span>{uiCopy.footerJump}</span>
        <span>{uiCopy.footerCategory}</span>
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

function categoryName(categories: Category[], categoryId: string, uiCopy: UiCopy) {
  if (categoryId === customCategoryId) return uiCopy.categoryCustom;
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

function emptyStateCopy(activeCategory: string, uiCopy: UiCopy) {
  if (activeCategory === recentCategoryId) return uiCopy.emptyRecentCopy;
  if (activeCategory === favoritesCategoryId) return uiCopy.emptyFavoritesCopy;
  if (activeCategory === customCategoryId) return uiCopy.emptyCustomCopy;
  return uiCopy.emptyCategoryCopy;
}

function emptyStateTitle(activeCategory: string, uiCopy: UiCopy) {
  if (activeCategory === recentCategoryId) return uiCopy.emptyRecentTitle;
  if (activeCategory === favoritesCategoryId) return uiCopy.emptyFavoritesTitle;
  if (activeCategory === customCategoryId) return uiCopy.emptyCustomTitle;
  return uiCopy.emptyCategoryTitle;
}
