# Biblion — MEDLINE / PubMed Portal & Word Citation Add-in

**Biblion** is a modern scientific literature discovery and citation management tool. It functions both as an interactive **Microsoft Word Taskpane Add-in** (via Office.js) and as a **standalone web application**, enabling researchers and medical writers to search PubMed, inspect structured abstracts, insert synchronized in-text citations, and format bibliographies in multiple citation styles directly within Microsoft Word.

---

## Table of Contents

- [Key Features](#key-features)
  - [1. PubMed Search & Literature Discovery](#1-pubmed-search--literature-discovery)
  - [2. Microsoft Word Add-in Integration](#2-microsoft-word-add-in-integration)
  - [3. Live Cursor Reference Inspector](#3-live-cursor-reference-inspector)
  - [4. Citation Representation Styles & Reformatting](#4-citation-representation-styles--reformatting)
  - [5. Standalone Web Fallback Mode](#5-standalone-web-fallback-mode)
- [Prerequisites](#prerequisites)
- [Local Deployment & Development](#local-deployment--development)
  - [A. Running in Standalone Web Mode](#a-running-in-standalone-web-mode)
  - [B. Running as a Word Desktop Add-in on macOS](#b-running-as-a-word-desktop-add-in-on-macos)
    - [Step 1: SSL Certificate Setup (macOS)](#step-1-ssl-certificate-setup-macos)
    - [Step 2: Start HTTPS Dev Server](#step-2-start-https-dev-server-macos)
    - [Step 3: Sideload Manifest into Word (macOS)](#step-3-sideload-manifest-into-word-macos)
    - [Step 4: Launch and Use Add-in in Word (macOS)](#step-4-launch-and-use-add-in-in-word-macos)
    - [Step 5: Unsideload / Clean Up (macOS)](#step-5-unsideload--clean-up-macos)
  - [C. Running as a Word Desktop Add-in on Windows](#c-running-as-a-word-desktop-add-in-on-windows)
    - [Step 1: SSL Certificate Setup (Windows)](#step-1-ssl-certificate-setup-windows)
    - [Step 2: Start HTTPS Dev Server (Windows)](#step-2-start-https-dev-server-windows)
    - [Step 3: Sideload Manifest into Word (Windows)](#step-3-sideload-manifest-into-word-windows)
    - [Step 4: Launch and Use Add-in in Word (Windows)](#step-4-launch-and-use-add-in-in-word-windows)
    - [Step 5: Unsideload / Clean Up (Windows)](#step-5-unsideload--clean-up-windows)
- [Troubleshooting Local Word Deployment](#troubleshooting-local-word-deployment)
  - [macOS Troubleshooting](#macos-troubleshooting)
  - [Windows Troubleshooting](#windows-troubleshooting)
- [Available npm Scripts](#available-npm-scripts)
- [Tech Stack & Architecture](#tech-stack--architecture)
- [License](#license)

---

## Key Features

### 1. PubMed Search & Literature Discovery
- **Direct NCBI Entrez API Integration**: Queries NCBI E-utilities (`esearch` + `esummary`/`efetch`) directly with XML parsing for rich metadata extraction.
- **Search Flexibility**: Full text keyword search, curated sample scientific queries (CRISPR-Cas9, mRNA oncology, CAR-T, etc.), pagination, and configurable per-page result sizes (5, 10, 15, 20, 25).
- **Interactive 3D Flip Cards**:
  - **Front Face**: Displays article title (with rich italic/markup preservation), authors, journal name, year, volume/issue, PMID link, and DOI badge.
  - **Back Face**: Displays full structured abstracts split into sections (Objective, Background, Methods, Results, Conclusions), full author listings, and source metadata.
- **Quick Links**: One-click "Show on PubMed" to open the paper directly on `pubmed.ncbi.nlm.nih.gov`.

### 2. Microsoft Word Add-in Integration
- **Contextual In-Text Citations**: Click **"Insert Citation"** on any PubMed card to inject a styled in-text citation at your active Word document cursor position.
- **Content Control Enclosure**: Citations are embedded in Word `ContentControl` objects tagged with structured JSON (`biblion-citation`), tracking PMIDs, metadata, and citation indices.
- **Automatic Grouping & Merging**: If you insert citations adjacent to existing citations in the document, Biblion detects proximity and automatically groups them (e.g., `(Watson & Crick, 1953; Smith et al., 2021)` or superscript `¹˒²`).
- **Automated References Section**: Inserting an in-text citation automatically ensures a "References" section exists at the end of the document (`biblion-bibliography`), adding the reference entry without duplicating existing entries.
- **Seamless De-duplication**: Re-citing an article in multiple places reuses the existing reference index in numeric styles.

### 3. Live Cursor Reference Inspector
- **Real-Time Cursor Tracking**: When running inside Word, the app actively tracks selection changes and cursor movement through the document.
- **Sentence & Paragraph Inspection**: Identifies any citations existing at the cursor location or within the surrounding sentence/paragraph.
- **Live References Nav Badge**: Shows a live badge counter in the top navigation indicating how many citations are adjacent to the active cursor.
- **Citation Removal**: Remove individual citations directly from the inspector interface, automatically triggering document and bibliography synchronization.

### 4. Citation Representation Styles & Reformatting
- **Built-in Support for 6 Major Styles**:
  1. **APA 7th Edition** — Author-Date format: `(Watson & Crick, 1953)`, sorted alphabetically.
  2. **IEEE Style** — Bracketed numeric format: `[1]`, `[1, 2]`, ordered by appearance.
  3. **AMA 11th Edition** — Superscript numeric format: `¹`, `¹˒²`, `¹⁻³`, clinical medicine standard.
  4. **Vancouver / NLM** — Numeric format: `(1)`, `(1, 2)`, ICMJE / National Library of Medicine standard.
  5. **Nature Standard** — Superscript format: `¹`, `¹⁻⁴`, Nature journal family style.
  6. **Harvard Style** — Author-Date format without ampersands: `(Watson and Crick 1953)`.
- **Interactive Style Switcher**: Dropdown in the header allows previewing single in-text, grouped in-text, and bibliography entry representations in real-time.
- **Reformat Entire Document**: With one click (**"Reformat All Citations in Word Document"**), Biblion re-scans the entire document, re-indexes references, applies sorting rules (alphabetical or order-of-appearance), and updates both in-text callouts and the bibliography section to match the selected style.

### 5. Standalone Web Fallback Mode
- Runs standalone in any modern web browser without requiring Microsoft Word.
- When running outside Word:
  - Search and flip cards remain fully functional.
  - "Insert Citation" and "Copy Citation" gracefully fall back to copying the formatted citation and bibliography entry to the system clipboard.
  - The UI automatically adapts, hiding Word-specific controls while showing standalone status indicators.

---

## Prerequisites

- **Node.js**: **v22.22.3**, **v24.15.0+**, or **v26.0.0+** (Angular 22 requires Node.js 22+).
- **npm**: v10+ or v11+ (bundled with modern Node.js).
- **Microsoft Word** (Optional, for Word Add-in features):
  - **macOS**: Microsoft Word for Mac (v16.x+).
  - **Windows**: Microsoft Word for Windows (Office 365, Word 2019, or Word 2021).
  - **Web**: Office on the web via Microsoft 365.

---

## Local Deployment & Development

Clone the repository and install project dependencies:

```bash
cd biblion-app
npm install
```

### A. Running in Standalone Web Mode

To run Biblion as a standalone web application in your browser:

```bash
npm start
```

Open [http://localhost:4200](http://localhost:4200) in your browser. Any source file edits will trigger automatic hot reload.

---

### B. Running as a Word Desktop Add-in on macOS

Microsoft Word runs add-ins in an isolated sandbox requiring a **trusted HTTPS connection** on `localhost:4200` and a sideloaded `manifest.xml`.

#### Step 1: SSL Certificate Setup (macOS)

Office desktop applications reject self-signed certificates unless they are installed and trusted in the system keychain.

##### Option 1 (Recommended): Using `office-addin-dev-certs`

Generate and install trusted developer certificates:

```bash
npx office-addin-dev-certs install
```

This creates certificates at `~/.office-addin-dev-certs/localhost.crt` and `~/.office-addin-dev-certs/localhost.key`, automatically registering trust with the macOS Keychain.

##### Option 2: Using `mkcert`

```bash
# 1. Install mkcert via Homebrew
brew install mkcert

# 2. Install local CA to your user keychain
mkcert -install

# 3. Create localhost certs in ~/.office-addin-dev-certs
mkdir -p ~/.office-addin-dev-certs
mkcert -cert-file ~/.office-addin-dev-certs/localhost.crt -key-file ~/.office-addin-dev-certs/localhost.key localhost 127.0.0.1 ::1

# 4. Trust mkcert Root CA in macOS System Keychain (required for Word sandbox)
sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain "$(mkcert -CAROOT)/rootCA.pem"
```

#### Step 2: Start HTTPS Dev Server (macOS)

Start the development server with SSL enabled:

```bash
npm run start:ssl
```

This launches the server at `https://localhost:4200/`. Verify in Safari or Chrome that visiting `https://localhost:4200` displays a valid, trusted SSL lock icon.

#### Step 3: Sideload Manifest into Word (macOS)

In a second terminal window, run the sideload script:

```bash
npm run sideload
```

*Under the hood, this copies `manifest.xml` into Word's local WEF container: `~/Library/Containers/com.microsoft.Word/Data/Documents/wef/manifest.xml`.*

Alternatively, you can use the official Office Addin Debugger CLI:

```bash
npm run sideload:cli
```

#### Step 4: Launch and Use Add-in in Word (macOS)

1. Launch **Microsoft Word** and open any blank or existing document.
2. Locate the **Biblion** button:
   - Check the **Home** tab ribbon for the **Biblio Development** button (`CommandsGroup`), or
   - Go to **Insert** > **My Add-ins** > Under **Developer Add-ins**, select **Biblio-Dev**.
3. The Biblion taskpane will open on the right side of your Word document.
4. Place your cursor anywhere in the document text, search for papers in Biblion, and click **"Insert Citation"** to test live insertion!

#### Step 5: Unsideload / Clean Up (macOS)

When finished developing or testing:

```bash
npm run unsideload
```

---

### C. Running as a Word Desktop Add-in on Windows

On Windows, Microsoft Word executes add-ins inside an Edge WebView2 runtime. Sideloading registers the manifest either via the Windows Developer Registry or via a Trusted Shared Folder Catalog.

#### Step 1: SSL Certificate Setup (Windows)

Open **PowerShell** or **Command Prompt** (CMD) as Administrator or standard user:

```powershell
npx office-addin-dev-certs install
```

1. This generates `localhost.crt` and `localhost.key` in `%USERPROFILE%\.office-addin-dev-certs\`.
2. A Windows Security dialog will pop up: *"Do you want to install this certificate?"* — Click **Yes** to trust the certificate in the Windows **Trusted Root Certification Authorities** store.

#### Step 2: Start HTTPS Dev Server (Windows)

Start the Angular server with SSL:

```powershell
npm run start:ssl
```

This script automatically resolves `%USERPROFILE%\.office-addin-dev-certs\` on Windows and starts `https://localhost:4200/`.
Verify that opening `https://localhost:4200` in Microsoft Edge or Google Chrome displays a trusted secure connection without certificate warnings.

#### Step 3: Sideload Manifest into Word (Windows)

You can choose any of the three methods below:

##### Method 1 (Recommended): Using PowerShell Sideload Script

In a separate PowerShell terminal window, run:

```powershell
npm run sideload:win
```

*Or run the PowerShell script directly:*

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\sideload.ps1 install
```

This registers `manifest.xml` into the Windows Office Developer Registry at:
`HKCU:\Software\Microsoft\Office\16.0\WEF\Developer`

##### Method 2: Using the Office Addin Debugger CLI

```powershell
npm run sideload:cli
```

*Or via npx:*

```powershell
npx office-addin-debugging start manifest.xml desktop --app word
```

This automatically registers the manifest and launches Microsoft Word with the add-in preloaded.

##### Method 3: Using a Network Shared Folder Catalog (Manual / Enterprise)

If registry changes are restricted on your machine:
1. Create a local folder, for example `C:\AddinManifests`.
2. Copy `manifest.xml` into `C:\AddinManifests\manifest.xml`.
3. Right-click `C:\AddinManifests` > **Properties** > **Sharing** tab > **Share...** > Share with your user account (Read permissions) > Click **Share**.
4. Note the Network Path (e.g. `\\localhost\AddinManifests` or `\\YOUR-PC\AddinManifests`).
5. Open Microsoft Word: Go to **File** > **Options** > **Trust Center** > **Trust Center Settings...** > **Trusted Add-in Catalogs**.
6. In **Catalog Url**, type the network path: `\\localhost\AddinManifests`.
7. Check **Show in Menu**, then click **Add Catalog**.
8. Click **OK**, close Word, and restart it.

#### Step 4: Launch and Use Add-in in Word (Windows)

1. Open **Microsoft Word** on Windows and open a document.
2. Access the add-in:
   - On the **Home** tab ribbon, click the **Biblio Development** button, or
   - Go to **Insert** > **My Add-ins** > click the **Shared Folder** or **Developer Add-ins** tab > select **Biblio-Dev**.
3. The Biblion taskpane appears on the right panel powered by Microsoft Edge WebView2.
4. Search PubMed and click **"Insert Citation"** to verify citation insertion and bibliography generation.

#### Step 5: Unsideload / Clean Up (Windows)

When finished:

```powershell
npm run unsideload:win
```

*Or if you used `office-addin-debugging`:*

```powershell
npm run unsideload:cli
```

---

## Troubleshooting Local Word Deployment

### macOS Troubleshooting

#### "Content is blocked because it isn't signed by a valid security certificate"
1. Fully quit Word: Press `Cmd + Q` (closing document windows is not enough).
2. Verify that `https://localhost:4200/` loads without any SSL warning in Safari and Chrome.
3. If needed, reinstall developer certificates:
   ```bash
   npx office-addin-dev-certs uninstall
   npx office-addin-dev-certs install
   ```

#### Add-in Taskpane Shows Blank Page or Cached Old Code (macOS)
Word aggressively caches web extensions on macOS. Clear the cache:

```bash
killall "Microsoft Word" 2>/dev/null || true
rm -rf ~/Library/Containers/com.microsoft.Word/Data/Library/Caches/*
rm -rf ~/Library/Containers/com.microsoft.Word/Data/Documents/wef/*
npm run sideload
```

#### Inspecting Developer Tools in Word Taskpane (macOS)
1. Enable WebKit developer tools for Office in Terminal:
   ```bash
   defaults write com.microsoft.Word OfficeWebAddinDeveloperExtras -bool true
   ```
2. Re-open Word, right-click anywhere inside the Biblion taskpane, and select **Inspect Element**.

---

### Windows Troubleshooting

#### "Certificate Security Warning" or "Navigation to webpage was canceled"
1. Make sure you clicked **Yes** on the Windows Security Warning dialog when installing certificates.
2. Verify certificate installation:
   - Press `Win + R`, type `certmgr.msc`, and press **Enter**.
   - Navigate to **Trusted Root Certification Authorities** > **Certificates**.
   - Confirm that a certificate named **localhost** issued by `developer.microsoft.com` exists.
3. If missing, run in an elevated PowerShell prompt:
   ```powershell
   npx office-addin-dev-certs install
   ```

#### Clearing WebView2 Runtime Cache in Word (Windows)
If Word displays an old cached build or a blank white screen on Windows:

1. Close all Microsoft Word windows.
2. Run the cache cleanup command via PowerShell:
   ```powershell
   npm run sideload:win -- clean-cache
   ```
   *Or manually remove the cache folder:*
   ```powershell
   Remove-Item -Recurse -Force "$env:LOCALAPPDATA\Microsoft\Office\16.0\Wef\*"
   ```
3. Restart Word.

#### Opening Microsoft Edge DevTools in Word Taskpane (Windows)
Since Word on Windows uses the Microsoft Edge WebView2 control:
1. **Right-Click Inspect**: Right-click anywhere in the Biblion taskpane and choose **Inspect**.
2. **Microsoft Edge DevTools Preview**:
   - Install **Microsoft Edge DevTools Preview** from the [Microsoft Store](https://www.microsoft.com/p/microsoft-edge-devtools-preview/9mzbfrmz0mnj).
   - Launch the DevTools app while Word is open; your Biblion taskpane will be detected as a debuggable target.
3. **Registry Flag** (if Right-Click Inspect is disabled):
   Run in Command Prompt:
   ```cmd
   reg add "HKCU\Software\Microsoft\Office\16.0\WEF" /v "EnableDevTools" /t REG_DWORD /d 1 /f
   ```

---

## Available npm Scripts

| Command | Platform | Description |
|---|---|---|
| `npm start` | All | Starts local development server on `http://localhost:4200` (standalone browser mode) |
| `npm run start:ssl` | All | Starts local HTTPS dev server on `https://localhost:4200` (resolves certificates cross-platform) |
| `npm run sideload` | macOS | Sideloads `manifest.xml` into Microsoft Word for Mac (`wef/` directory) |
| `npm run sideload:word` | macOS | Alias for `npm run sideload` |
| `npm run sideload:win` | Windows | Sideloads manifest into Windows Office Developer Registry via PowerShell |
| `npm run sideload:excel` | macOS | Sideloads manifest for Excel testing |
| `npm run sideload:cli` | All | Uses `office-addin-debugging` tool to sideload and launch desktop Word |
| `npm run unsideload` | macOS | Cleans up and removes sideloaded manifest from Word WEF directory on Mac |
| `npm run unsideload:win` | Windows | Removes sideloaded manifest from Windows Office Developer Registry |
| `npm run unsideload:cli` | All | Stops `office-addin-debugging` session and unregisters manifest |
| `npm run build` | All | Compiles production artifacts to `dist/biblion-app` |
| `npm run watch` | All | Compiles and watches for changes in development mode |
| `npm test` | All | Runs unit test suite via Vitest |

---

## Tech Stack & Architecture

- **Frontend Framework**: [Angular 22](https://angular.dev/) (Standalone Components, Signals, Computed Values, `@if` / `@for` control flow syntax).
- **Office Integration**: [Office.js](https://learn.microsoft.com/en-us/office/dev/add-ins/) (Word JavaScript API v1.3+, Content Controls, Word Document Body traversal).
- **Literature API**: [NCBI Entrez E-utilities](https://www.ncbi.nlm.nih.gov/books/NBK25501/) (`esearch`, `esummary`, `efetch`).
- **Styling**: SCSS with custom responsive layout, CSS variables, 3D card flip transforms, and Microsoft Office theme alignment.
- **Testing**: [Vitest](https://vitest.dev/) test runner.
- **Tooling**: `@angular/cli`, `office-addin-dev-certs`, `office-addin-debugging`.

---

## License

This project is licensed under the **PolyForm Noncommercial License 1.0.0**.

Under this license, you are free to use, copy, modify, and distribute the software for **noncommercial purposes**—including personal study, academic research, experiment, education, and non-monetized work for non-profit organizations. Any use for commercial advantage or monetary compensation requires a separate commercial license from the authors.

See the [LICENSE](LICENSE) file for the full license terms.
