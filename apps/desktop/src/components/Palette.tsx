import { useEffect, useRef } from "react";
import { Check, Copy, Search, Settings, Star } from "lucide-react";
import type { Category, RescuePrompt } from "../types";

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
  onFavoriteToggle: (promptId: string) => void;
  onSettingsOpen: () => void;
  onPackChange: (packId: string) => void;
  onPointerActivity: () => boolean;
  onQueryChange: (query: string) => void;
  onSelectedIndexChange: (index: number) => void;
  paletteFocusRequest: number;
  searchShortcutLabel: string;
  shortcutLabel: string;
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
  onFavoriteToggle,
  onSettingsOpen,
  onPackChange,
  onPointerActivity,
  onQueryChange,
  onSelectedIndexChange,
  paletteFocusRequest,
  searchShortcutLabel,
  shortcutLabel
}: PaletteProps) {
  const paletteRef = useRef<HTMLElement | null>(null);
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
          <label className="packSelect">
            <span className="srOnly">Prompt pack</span>
            <select
              aria-label="Prompt pack"
              value={activePackId}
              onChange={(event) => onPackChange(event.target.value)}
            >
              {packs.map((pack) => (
                <option key={pack.id} value={pack.id}>
                  {pack.locale} · {pack.name}
                </option>
              ))}
            </select>
          </label>
          <span className="shortcut">{shortcutLabel}</span>
          <button
            className="iconButton"
            onClick={onSettingsOpen}
            title="開啟偏好設定"
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
          placeholder={`搜尋 ${packName}...  / 或 ${searchShortcutLabel}`}
          aria-label="Search rescue prompts"
        />
        {query.trim() ? <span className="searchScope">全部分類</span> : null}
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
          title="最近"
          type="button"
        >
          最近
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
            <p>{emptyStateTitle(activeCategory, query)}</p>
            <span>{emptyStateCopy(activeCategory, query)}</span>
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
                title={favorites.has(prompt.id) ? "取消收藏" : "收藏"}
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
        <span>Enter 複製</span>
        <span>Esc 關閉搜尋</span>
        <span>↑↓ 選取</span>
        <span>Home/End 跳轉</span>
        <span>←→ 分類</span>
        <span>/ 搜尋</span>
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

function emptyStateCopy(activeCategory: string, query: string) {
  if (query.trim()) return "換個關鍵字，或試試搜尋「計畫」、「下一步」、「檢查」。";
  if (activeCategory === "recent") return "複製幾句後，最近使用會出現在這裡。";
  return "試試搜尋「聽不懂」、「計畫」或「不行」。";
}

function emptyStateTitle(activeCategory: string, query: string) {
  if (activeCategory === "recent" && !query.trim()) return "還沒有最近使用。";
  return "找不到符合的句子。";
}
