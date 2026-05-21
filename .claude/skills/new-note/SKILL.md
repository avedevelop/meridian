---
name: new-note
description: Create a new markdown note in the Meridian demo vault with proper YAML frontmatter. Usage: /new-note <title>
---

Create a new markdown note file in `/Users/vladyslav/Desktop/dev/demo-vault/` with the following structure:

1. Filename: convert the title to kebab-case + `.md` (e.g. "My Note" → `my-note.md`)
2. Content template:
```
---
title: <title>
tags: 
date: <today's date in YYYY-MM-DD>
---

# <title>

```

Use the Write tool to create the file. Then confirm the path to the user.

Arguments: $ARGUMENTS
