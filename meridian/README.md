# Meridian

[![Meridian CI](https://github.com/bvsmma/meridian/actions/workflows/meridian-ci.yml/badge.svg?branch=main)](https://github.com/bvsmma/meridian/actions/workflows/meridian-ci.yml)
[![Latest release](https://img.shields.io/github/v/release/bvsmma/meridian?display_name=tag)](https://github.com/bvsmma/meridian/releases/latest)

Local-first notes app inspired by Obsidian — not a drop-in replacement. Built with Electron 39 + React 18 + TypeScript.

## Установка (macOS)

1. Скачай свежий DMG из [Releases](https://github.com/bvsmma/meridian/releases/latest).
2. Открой DMG, перетащи Meridian в Applications.
3. **Первый запуск:** DMG не подписан Apple — Gatekeeper заблокирует обычный двойной клик. Правый клик по приложению → **Open** → подтверди один раз. Дальше запускается как любое другое.
4. Хочешь подписанный билд — следи за релизами или собери сам (`npm run build:mac` в `meridian/`).

---

## Запуск

```bash
cd meridian
npm install
npm run dev
```

> **Dev не стартует?**
>
> Если видишь `TypeError: Cannot read properties of undefined (reading 'registerSchemesAsPrivileged')` —
> среда (Cursor, VS Code) выставляет `ELECTRON_RUN_AS_NODE=1`, из-за чего Electron запускается как обычный Node.
>
> Скрипт `npm run dev` уже содержит `env -u ELECTRON_RUN_AS_NODE`, но если ошибка всё равно возникает:
>
> ```bash
> unset ELECTRON_RUN_AS_NODE && npm run dev
> ```
>
> Если порт 5173 занят прошлым процессом:
>
> ```bash
> npm run dev:kill   # убивает процесс на :5173
> npm run dev
> ```

---

## Что умеет Meridian

### Редактор

- Markdown с подсветкой синтаксиса (CodeMirror 6)
- Wiki-ссылки `[[Note Name]]` с автодополнением
- Мультипанельный редактор (Split Screen — горизонтальный и вертикальный)
- Перетаскивание вкладок между панелями
- Auto-save (по задержке / при потере фокуса / при Alt+Tab)
- **Slash commands** — напечатай `/` в начале строки → меню вставки заголовков, списков, таблиц, callout-блоков

### Превью Markdown

- Живой рендеринг рядом с редактором
- **Wiki-embed изображений** — `![[photo.png]]` рендерится как `<img>`
- **Embed заметок** — `![[Other Note]]` вставляет содержимое другой заметки inline
- **Callout-блоки** в стиле Obsidian:
  > [!NOTE] Информация
  > Поддерживаются: note, tip, warning, danger, success, question и другие
- **==Highlighted text==** — двойные знаки равно дают жёлтый фон
- **Mermaid диаграммы** — ````mermaid` блоки рендерятся как SVG
- Таблицы (GitHub Flavored Markdown)
- Изображения через `vault://` протокол (локальные файлы)

### Файловое дерево

- Создание / переименование / удаление файлов и папок
- **Drag-drop файлов И папок** между директориями
- **Сортировка**: A→Z, Z→A, по дате изменения (кнопка в сайдбаре)
- Контекстное меню: Reveal in Finder, Copy Path, Copy Relative Path

### Поиск и навигация

- Полнотекстовый поиск по vault (MiniSearch)
- **Command Palette** (⌘K) — поиск файлов + команды (`>` для команд)
- **Недавние файлы** — верхняя секция в палитре показывает 5 последних открытых
- Бэклинки, теги, Table of Contents в правой панели
- Локальный граф связей для текущей заметки

### Теги

- Инлайн-теги `#tag` в тексте
- **Теги из frontmatter** — `tags: [work, ideas]` или YAML-список попадают в Tags Panel

### Properties (Frontmatter)

- Вкладка **Props** в правой панели
- Показывает и редактирует YAML frontmatter как поля формы
- Кнопка «+ Add property»

### Шаблоны

- Создай `.md` файлы в папке `_templates/` в vault
- В палитре (⌘K → `>`) → «Insert Template…» → выбери шаблон
- Плейсхолдеры: `{{date}}`, `{{title}}`

### Экспорт

- **HTML** (⌘E) — экспорт заметки как самодостаточный HTML файл со стилями
- **PDF** (⌘⇧E) — экспорт через Electron `printToPDF`, диалог сохранения

### Canvas и Sketchpad

- Infinite Canvas с карточками (Konva) — `.canvas` файлы
- Sketchpad — рисование карандашом, фигурами, текстом — `.excalidraw` файлы
- Ластик стирает участки всех типов фигур (частичное стирание)
- Undo (⌘Z) в обоих режимах

### Graph View

- D3 force-directed граф всего vault
- Анимация timeline
- Экспорт как WebM видео

### Настройки (⌘,)

- 8 тем: dark, midnight, indigo, cyberpunk, forest, nord, dracula, obsidian
- 5 акцентных цветов
- Шрифты редактора: Georgia, Inter, Fira Code, JetBrains Mono, system-ui
- Размер шрифта, межстрочный интервал, ширина строки
- Переключатели: перенос строк, нумерация, подсветка скобок, slash commands
- Auto-save режимы, Git backup

### Git Backup (плагин)

- Автокоммит каждые 5 минут + при сворачивании окна
- Работает если vault — git репозиторий

---

## Клавиши

| Шорткат | Действие                         |
| ------- | -------------------------------- |
| ⌘K      | Command Palette                  |
| ⌘S      | Сохранить                        |
| ⌘E      | Экспорт в HTML                   |
| ⌘⇧E     | Экспорт в PDF                    |
| ⌘D      | Daily Note                       |
| ⌘W      | Закрыть вкладку                  |
| ⌘Z      | Undo (в Canvas / Sketchpad)      |
| ⌘,      | Настройки                        |
| ⌘⇧G     | Graph View                       |
| /       | Slash Commands (в начале строки) |
| >       | Режим команд в Command Palette   |

---

## Структура vault

```
your-vault/
├── _templates/        ← шаблоны для вставки
│   └── daily.md
├── assets/            ← изображения (вставка пастой)
├── Daily/             ← Daily Notes (⌘D)
└── ваши заметки...
```

---

## Сборка

```bash
npm run build:mac    # macOS DMG
npm run build:win    # Windows NSIS
npm run build:linux  # Linux AppImage
```

## Тесты

```bash
npm run test         # Vitest (158 тестов)
npm run typecheck    # TypeScript (node + web проекты)
npm run check-lines  # лимиты строк по компонентам (см. ARCHITECTURE.md)
```

Перед коммитом или PR прогоняй все три: `typecheck && test && check-lines`.
