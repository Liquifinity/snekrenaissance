# SNEK RENAISSANCE

conquer the space

**PLAY · INSTALL · FORK**

SNEK RENAISSANCE is a three-dimensional browser game built with TypeScript, Three.js and Vite. The same build can be played on the web, installed as a Progressive Web App (PWA), or forked and evolved from this repository.

SNEK RENAISSANCE is an independent experimental project. It is not affiliated with, endorsed by, or presented as an official OpenAI or ChatGPT product.

## Play

https://liquifinity.github.io/snekrenaissance/

## Install

Open the game in a compatible browser and use that browser or platform's install-app action. The installed PWA opens as a standalone application and supports offline relaunch after its assets have been cached.

Installation UI and availability vary by browser and platform. There is no separate `.exe`, Electron or Tauri build: the browser version and the installed version are the same application.

## Fork

Fork this repository when you want to change the game or publish your own SNEK.

```bash
npm install
npm run dev
```

The GitHub Pages workflow derives its deployment base path automatically from the repository name, so a renamed Fork does not need the original `/snekrenaissance/` path hard-coded into its build.

## Build and test

```bash
npm run build
npm test
npm run test:e2e
```

The project also contains the preserved Worker/ranking seam and its validation tooling. Those components are not required to open the local browser game.

## License

SNEK RENAISSANCE is released under the MIT License. See [`LICENSE`](LICENSE).
