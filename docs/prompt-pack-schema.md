# Prompt Pack Schema

Prompt packs are JSON files that define categories and prompts.

## Minimal Example

```json
{
  "id": "beginner-rescue-en",
  "name": "Beginner Rescue Prompts",
  "description": "Short prompts for people who get stuck while talking to AI.",
  "locale": "en",
  "version": "0.1.0",
  "author": "SayNext contributors",
  "categories": [
    {
      "id": "start",
      "name": "Getting Started"
    }
  ],
  "prompts": [
    {
      "id": "start-ask-questions-first",
      "category": "start",
      "title": "Ask me first",
      "text": "Ask me the necessary questions first, then help me do it.",
      "tags": ["beginner", "clarify"]
    }
  ]
}
```

## Fields

`id`: Stable pack id in lowercase kebab-case.

`name`: Human-readable pack name.

`description`: Short explanation of the pack.

`locale`: BCP 47 locale code, such as `en`, `zh-TW`, or `ja`.

`version`: Pack version.

`author`: Author or contributor group.

`categories`: Prompt categories.

`prompts`: Rescue prompts.

## Prompt Rules

- Keep `title` short.
- Put the exact copied text in `text`.
- Keep tags lowercase.
- Every prompt category must exist in `categories`.
- Do not use `recent` as a category id. SayNext reserves it for the built-in recent tab.
