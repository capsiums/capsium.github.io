# capsium.github.io

The Capsium project website — <https://www.capsium.org>

Capsium is the **C**ommon **a**rchitecture for **p**ortable **s**ecure
**i**nformation interchange and **u**nified **m**anagement: an open-source
framework for packaging static sites into portable, secure `.cap` packages and
serving them through reactors on any platform.

## Stack

- [Astro](https://astro.build) 7 — static site generator (Vite 8)
- [Tailwind CSS](https://tailwindcss.com) 4 — via `@tailwindcss/vite`, CSS-first
  config in `src/styles/global.css` (`@theme` design tokens, no
  `tailwind.config.js`)
- [Vue](https://vuejs.org) 3 — interactive islands via `@astrojs/vue`
  (mobile nav, theme toggle, copy buttons, package-structure explorer)
- `@astrojs/sitemap`, `@astrojs/check` + TypeScript (strict)
- [Fraunces Variable](https://fontsource.org/fonts/fraunces-variable) display
  font, self-hosted via Fontsource

## Commands

| Command           | Action                                            |
| :---------------- | :------------------------------------------------ |
| `npm install`     | Install dependencies                              |
| `npm run dev`     | Start the dev server at `localhost:4321`          |
| `npm run build`   | Build the production site to `./dist/`            |
| `npm run preview` | Preview the built site locally                    |
| `npm run check`   | Type-check with `astro check`                     |

## Structure

```
src/
├── components/    # Header, Footer, Vue islands (MobileNav, ThemeToggle,
│                  # CopyButton, PackageTree), CommandBlock
├── data/          # Ecosystem repo data shared across pages
├── layouts/       # Base.astro — <html>, SEO meta, header, footer
├── pages/         # index, features, how-it-works, install, learn,
│                  # specifications, ecosystem, about, 404
└── styles/        # global.css — Tailwind 4 + @theme palette tokens
public/            # favicons, og-image.jpg, images/, robots.txt
```

## Deployment

The site deploys to GitHub Pages via
[`.github/workflows/build_deploy.yml`](.github/workflows/build_deploy.yml):
every push to `main` runs `npm ci && npm run build` and publishes `dist/`
with `actions/deploy-pages`. Pull requests get a build-only check.

Internal links are checked on every push/PR by the
[`links.yml`](.github/workflows/links.yml) workflow (lychee, offline mode
against the built `dist/`).

## License

Content and code are open source under the MIT license, maintained by
[Ribose](https://www.ribose.com).
