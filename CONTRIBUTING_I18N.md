# Contributing to Languages 🌍

This guide explains how to add new languages or modify existing ones in OpenWatch.

## 🛠 Project Structure for i18n

- **Locale Files**: `src/locales/*.json` (e.g., `en.json`, `ro.json`)
- **i18n Logic**: `src/app/lib/i18n.tsx`
- **Language Switcher UI**: `src/app/components/language-switcher.tsx`

---

## ➕ Adding a New Language

To add a new language (e.g., French - `fr`), follow these steps:

### 1. Create the Locale File

Create a new JSON file in `src/locales/fr.json`. It's best to copy `src/locales/en.json` and translate the values.

```json
{
  "common": {
    "search": "Rechercher",
    ...
  }
}
```

### 2. Register in i18n Engine

Open `src/app/lib/i18n.tsx` and:

1. Import your new JSON file.
2. Add it to the `translations` object.

```tsx
import fr from '../../locales/fr.json';

const translations: Record<string, any> = {
	en,
	ro,
	fr // Add here
};
```

### 3. Add to UI Switcher

Open `src/app/components/language-switcher.tsx` and add your language to the `languages` array:

```tsx
const languages = [
	{ code: 'en', name: 'English' },
	{ code: 'ro', name: 'Română' },
	{ code: 'fr', name: 'Français' } // Add here
];
```

---

## 📝 Modifying Existing Languages

### To change a translation:

1. Open the relevant file in `src/locales/` (e.g., `en.json`).
2. Find the key you want to change (e.g., `"search": "Search"`).
3. Update the value.

### To add a new key:

1. Add the key to `en.json` (our primary language).
2. Add the same key to all other locale files to ensure consistency.
3. If a key is missing in a specific language, the system will automatically fallback to the English version.

---

## 💡 Best Practices

- **Placeholders**: Use curly braces for dynamic values: `"welcome": "Welcome, {name}!"`.
- **Nesting**: Keep the structure organized (e.g., `common`, `studio`, `console`).
- **Missing Keys**: Always check if your new key needs to be added to all files.
- **Verification**: Test the language switch in the browser to ensure no layout breaks occur with longer translations.
