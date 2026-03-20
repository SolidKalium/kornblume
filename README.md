<div align="center">

[![logo](https://raw.githubusercontent.com/windbow27/kornblume/refs/heads/main/public/images/items/common/logo.webp)](https://github.com/windbow27/kornblume)

# Kornblume - Reverse: 1999 Toolsite

</div>

A simple, easy-to-use, yet beautiful and mobile-friendly toolsite designed to assist with most Reverse: 1999 progression-related tasks.

All contributions are welcome. Feel free to raise an issue or open a PR in the project.

If you find the site useful, please share it with others. A ☆ would also be greatly appreciated.

## Usage
The tool is currently deployed at [kornblume](https://windbow27.github.io/kornblume/)

## Main Features
- Resource Planner
- Summon Tracker
- Arcanist Materials Database
- Items Database
- Stages Database

## Acknowledgments
- [Huiji Wiki](https://res1999.huijiwiki.com/wiki/%E9%A6%96%E9%A1%B5) (Arcanist Information)
- [必要的记录](https://www.kdocs.cn/l/cd5MWeCl5bKw) (Drop Data)
- [ArkPlanner](https://penguin-stats.io/planner) (Farming Route Algorithm)

For the full list, please check the site's Credits.

## Help Us Translate
We are translating Kornblume to other languages and we need your help! [Help us translate](https://github.com/windbow27/kornblume/blob/main/lang/README.md).


## Development
### Recommended IDE Setup

- [VSCode](https://code.visualstudio.com/)
- [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (and disable Vetur)
- [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint)
      **Strongly recommend setting up ESLint to auto-fix on save, please [see DigitalOcean's tutorial](https://www.digitalocean.com/community/tutorials/workflow-auto-eslinting#step-4-adding-code-actions-on-save)**.
- [i18n Ally](https://marketplace.visualstudio.com/items?itemName=lokalise.i18n-ally)

### Customize configuration

See [Vite Configuration Reference](https://vitejs.dev/config/).

### Project Setup: Install Dependencies

```sh
npm install
```

#### Compile and Hot-Reload for Development

```sh
npm run dev
```

To enable access from another device on your network, use `npm run dev -- --host`. This is great for testing on a real mobile device.

#### Compile and Minify for Production

```sh
npm run build
```

#### Deploy to Your Github Pages

This is one way to manually test any changes on a device that isn't on the same network as the development machine.

- Build the project and push it to a gh-pages branch of your repository.
  - In Windows CMD or PowerShell: `npm run deploy`
  - In POSIX-compliant shells: `npm run deploy-linux`
- Configure the branch to be served:
  - Enable GitHub pages in Settings > Pages.
  - Choose source *Deploy from a branch* and select the `gh-pages` branch

#### Create .env file

This app optionally uses the Google API to sync data using Google Drive. You can acquire credentials from the [Google Cloud Console](https://console.cloud.google.com/auth/).
- Create an **OAuth 2.0 Client ID** of type *Web Application*.
- Under "Authorized JavaScript origins," add your development URIs (e.g., `http://localhost:5173` or `https://[username].github.io`).
- Data Access permissions requested should include `.../auth/userinfo.email`, `.../auth/drive.file`, and `.../auth/drive.appdata`. Note that Kornblume doesn't currently use the appData permission, which is why the app's data is visible in Google Drive.
- Add your API Key and Client ID to your `.env` file, based on `.env.example`
