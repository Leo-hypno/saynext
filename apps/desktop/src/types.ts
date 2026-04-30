export type Category = {
  id: string;
  name: string;
};

export type RescuePrompt = {
  id: string;
  category: string;
  source?: "built-in" | "custom";
  title: string;
  text: string;
  tags: string[];
};

export type CustomPromptDraft = {
  title: string;
  text: string;
  tags: string;
};

export type UiCopy = {
  addCustomPrompt: string;
  allCategories: string;
  cancel: string;
  categoryCustom: string;
  categoryRecent: string;
  close: string;
  confirm: string;
  delete: string;
  deleteCustomPrompt: string;
  deleteCustomPromptBody: (title: string) => string;
  editCustomPrompt: string;
  favorite: string;
  emptyCategoryCopy: string;
  emptyCategoryTitle: string;
  emptyCustomCopy: string;
  emptyCustomTitle: string;
  emptyRecentCopy: string;
  emptyRecentTitle: string;
  footerCategory: string;
  footerCopy: string;
  footerJump: string;
  footerSearch: string;
  footerSearchClose: string;
  footerSelect: string;
  labelContent: string;
  labelTags: string;
  labelTitle: string;
  language: string;
  myPromptsEyebrow: string;
  newCustomPrompt: string;
  noticeAdded: (title: string) => string;
  noticeDeleted: (title: string) => string;
  noticeUpdated: (title: string) => string;
  placeholderContent: string;
  placeholderSearchSamples: string;
  placeholderTags: string;
  placeholderTitle: string;
  save: string;
  searchAriaLabel: string;
  searchPlaceholder: (packName: string, shortcut: string) => string;
  settings: string;
  unfavorite: string;
};

export type PromptPack = {
  id: string;
  name: string;
  description: string;
  locale: string;
  version: string;
  author: string;
  categories: Category[];
  prompts: RescuePrompt[];
};
