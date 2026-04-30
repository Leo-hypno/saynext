export type Category = {
  id: string;
  name: string;
};

export type RescuePrompt = {
  id: string;
  category: string;
  title: string;
  text: string;
  tags: string[];
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
