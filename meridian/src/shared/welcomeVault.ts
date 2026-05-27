export type WelcomeVaultPlatform = 'macos' | 'windows'
export type WelcomeVaultLanguage = 'en' | 'ru'

export interface WelcomeVaultFile {
  path: string
  content: string
}

const shortcuts = {
  macos: {
    search: 'Cmd+K',
    newNote: 'Cmd+N',
    settings: 'Cmd+,',
    save: 'Cmd+S'
  },
  windows: {
    search: 'Ctrl+K',
    newNote: 'Ctrl+N',
    settings: 'Ctrl+,',
    save: 'Ctrl+S'
  }
}

function en(platform: WelcomeVaultPlatform): WelcomeVaultFile[] {
  const keys = shortcuts[platform]
  return [
    {
      path: 'Welcome.md',
      content: `---
type: project
status: active
related: [Projects/Meridian Tour.md]
tags: [welcome]
---

# Welcome to Meridian

Meridian is a local-first Markdown workspace for notes, projects, tasks, relationships, views, history, and read-only questions.

- Search notes with ${keys.search}
- Create a note with ${keys.newNote}
- Open settings with ${keys.settings}
- Save with ${keys.save}

Start with [[Projects/Meridian Tour]] or open the Ask Vault panel on the right.`
    },
    {
      path: 'Projects/Meridian Tour.md',
      content: `---
type: project
status: active
related: [Welcome.md, Views/Saved Views.md]
tags: [tour, meridian]
---

# Meridian Tour

This vault demonstrates the foundation features:

- Properties in YAML frontmatter
- Note types and templates
- Relationships between notes
- Saved views for projects, tasks, daily notes, and inbox
- Per-note Git history after the vault is initialized as a repository
- Ask Vault for local read-only questions with cited source notes`
    },
    {
      path: 'Views/Saved Views.md',
      content: `---
type: reference
related: [Projects/Meridian Tour.md]
tags: [views]
---

# Saved Views

Open the Views section in the left sidebar to browse Inbox, Projects, Tasks, and Daily views. Views are built from note properties and task checkboxes.`
    },
    {
      path: 'Daily/2026-05-27.md',
      content: `---
type: daily
date: 2026-05-27
tags: [daily]
---

# Daily Note

- [ ] Try Ask Vault
- [ ] Open note history after creating a Git commit`
    }
  ]
}

function ru(platform: WelcomeVaultPlatform): WelcomeVaultFile[] {
  const keys = shortcuts[platform]
  return [
    {
      path: 'Welcome.md',
      content: `---
type: project
status: active
related: [Projects/Meridian Tour.md]
tags: [welcome]
---

# Добро пожаловать в Meridian

Meridian - локальное Markdown-пространство для заметок, проектов, задач, связей, представлений, истории и вопросов в режиме только чтения.

- Поиск заметок: ${keys.search}
- Новая заметка: ${keys.newNote}
- Настройки: ${keys.settings}
- Сохранение: ${keys.save}

Начните с [[Projects/Meridian Tour]] или откройте Ask Vault в правой панели.`
    },
    {
      path: 'Projects/Meridian Tour.md',
      content: `---
type: project
status: active
related: [Welcome.md, Views/Saved Views.md]
tags: [tour, meridian]
---

# Meridian Tour

В этом хранилище показаны базовые возможности:

- Свойства в YAML frontmatter
- Типы заметок и шаблоны
- Связи между заметками
- Saved Views для проектов, задач, daily notes и inbox
- История заметки через Git после первого коммита
- Ask Vault для локальных вопросов только на чтение с источниками`
    },
    {
      path: 'Views/Saved Views.md',
      content: `---
type: reference
related: [Projects/Meridian Tour.md]
tags: [views]
---

# Saved Views

Откройте Views в левой панели, чтобы увидеть Inbox, Projects, Tasks и Daily. Представления строятся из свойств заметок и чекбоксов задач.`
    },
    {
      path: 'Daily/2026-05-27.md',
      content: `---
type: daily
date: 2026-05-27
tags: [daily]
---

# Daily Note

- [ ] Попробовать Ask Vault
- [ ] Открыть историю заметки после Git-коммита`
    }
  ]
}

export function getBundledWelcomeVaultFiles(
  platform: WelcomeVaultPlatform,
  language: WelcomeVaultLanguage
): WelcomeVaultFile[] {
  return language === 'ru' ? ru(platform) : en(platform)
}
