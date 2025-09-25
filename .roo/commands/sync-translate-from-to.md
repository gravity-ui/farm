---
description: "Sync docs translations"
---

# Sync Translate From To

**Note:** This is not a Bash command and should not be executed in the terminal.

A command to synchronize the structure and content of documentation between two languages.

## Purpose

This command is used to synchronize texts in documents of one language based on documents of another language.
It is used to update translated documents (Target) based on original documents (Source), while preserving the existing translation. The synchronization is unidirectional - from Source to Target only.

**Key concept:**
- Source = Master document (original language) - drives changes
- Target = Translation document (target language) - gets updated based on source

When synchronizing:
- Content is ADDED to Target if it exists in Source but not in Target
- Content is REMOVED from Target if it doesn't exist in Source
- Existing translations in Target are PRESERVED where content matches

## Parameters

The command takes two parameters:

- `source` - path to the source directory or file (original/master document)
- `target` - path to the target directory or file (translation document to be updated)

## Logic of operation

1. If directories are specified:
   - Compares the file structure in both directories
   - For each file in the source directory, finds the corresponding file in the target directory
   - Synchronizes the document structure while preserving the existing translation

2. If files are specified:
   - Synchronizes the document structure while preserving the existing translation

3. If a source file is specified but the target is a directory:
   - Creates the corresponding file in the target directory
   - Synchronizes the document structure while preserving the existing translation
   - This allows for creating new translations when they don't yet exist in the target language

4. During synchronization:
   - Preserves the existing text translation
   - Adds new elements from the original (headings, lists, etc.)
   - Removes elements that no longer exist in the original
   - Updates the document structure according to the original

5. For content modifications:
   - Uses the `apply_diff` tool to make precise, targeted modifications to files
   - Searches for specific sections of content and replaces them while preserving the rest of the document
   - Ensures surgical edits without affecting unrelated parts of the translation

6. For reviewing changes:
   - You can use `git diff` to view and compare the changes made to files
   - This allows you to see exactly what content was added, removed, or modified
   - Helps verify that the synchronization process worked as expected and preserves existing translations

**Important**: The synchronization is unidirectional from Source to Target. The Target files are updated based on the Source files, not vice versa.

## Usage examples

```md
# Synchronize all documents from Russian (source) to English (target)
/sync-translate-from-to from docs/ru to docs/en

# Synchronize a specific file from Russian (source) to English (target)
/sync-translate-from-to from docs/ru/start.md to docs/en/start.md

# Synchronize a specific file from Russian (source) to a target directory (file will be created)
/sync-translate-from-to from docs/ru/start.md to docs/en

# Synchronize all documents from English (source) to Russian (target)
/sync-translate-from-to from docs/en to docs/ru

# Synchronize a specific file from English (source) to Russian (target)
/sync-translate-from-to from docs/en/start.md to docs/ru/start.md

# Synchronize a specific file from English (source) to a target directory (file will be created)
/sync-translate-from-to from docs/en/start.md to docs/ru

# Create new translation file from source to target directory
/sync-translate-from-to from docs/en/new-feature.md to docs/en/new-feature.md

# Add content from source file to existing target file
/sync-translate-from-to from docs/en/updates.md to docs/ru/updates.md
```

## Common scenarios

1. **Adding new content**: When new sections are added to the source document, they will be added to the target document (in the source language, requiring manual translation).

2. **Removing obsolete content**: When sections are removed from the source document, they will be removed from the target document.

3. **Preserving translations**: Existing translated content in the target document is preserved where the structure matches the source document.

4. **Creating new translations**: When a source file is specified with a target directory, a new file is created in the target directory with the same name as the source file, allowing for new translations to be created.
