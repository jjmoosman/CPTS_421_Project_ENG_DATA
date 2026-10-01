# CPTS_421_Project_ENG_DATA

## Project summary

### One-sentence description of the project

A desktop app that removes student and professor names from English papers, plus a website for studying how students' writing has changed over the last 5–10 years.

### Additional information about the project

The English department has years of student writing that could show how writing habits have changed over time. Those papers contain student names, student IDs, professor names and emails, so they can't be shared or studied until that information is removed (FERPA). This project has two parts.

**1. FERPA Compliance Tool (De-identifier):** A Python/PyQt6 desktop app. An instructor enters or imports a class roster and points the app at a folder of `.docx` and `.pdf` papers. The app writes a de-identified plain-text copy of each paper. It uses fuzzy matching, so it also catches misspellings, "Last, First" order, initials, middle names, titles such as "Dr." or "Prof.", and email addresses that contain a name. After writing each file, it checks the output to make sure none of the listed terms are left.

**2. Corpus analysis website:** A React + Vite web app similar to [AntConc](https://www.laurenceanthony.net/software/antconc/). Researchers load the de-identified `.txt` files and use it in the browser:
- **Keyword in Context (KWIC):** a concordance view that searches words or regular expressions, can sort by left or right context, and exports results to CSV
- **Annotate:** highlight passages and tag them with color-coded notes
- **Data Visualization:** bar charts, line charts, word clouds and results tables built from search results

The intended workflow: **raw papers → De-identifier → anonymized `.txt` files → website for analysis.**

---

## Installation

### Prerequisites

- [Git](https://git-scm.com/)
- **De-identifier:** [Python 3.9+](https://www.python.org/downloads/) with `pip`
- **Website:** [Node.js 18+](https://nodejs.org/) (includes `npm`)

> **Just want the De-identifier?** Prebuilt versions are available, so you don't need Python:
> - [Windows version](https://github.com/jjmoosman/CPTS_421_Project_ENG_DATA/releases/tag/windowsversion)
> - [Mac version](https://github.com/jjmoosman/CPTS_421_Project_ENG_DATA/releases/tag/macversion)

### Add-ons

**De-identifier (Python)**
| Package | Purpose |
|---|---|
| `PyQt6` | Desktop GUI |
| `pandas`, `openpyxl` | Read rosters from Excel (`.xlsx`) |
| `python-docx` | Read text from Word documents, including tables, headers and footers |
| `pymupdf` (`fitz`) | Read text from PDFs |
| `rapidfuzz` | Fuzzy matching, so misspelled or reformatted names are still caught |
| `numpy` | Needed by pandas |

**Website (JavaScript)**
| Package | Purpose |
|---|---|
| `react`, `react-dom` | UI framework |
| `react-router-dom` | Page routing (Dashboard, Document Manager, tools) |
| `recharts` | Charts for the Data Visualization tool |
| `vite`, `@vitejs/plugin-react` | Dev server and production build |

### Installation Steps

**Clone the repo**
```bash
git clone https://github.com/jjmoosman/CPTS_421_Project_ENG_DATA.git
cd CPTS_421_Project_ENG_DATA
```

**Run the De-identifier**
```bash
cd Code/TestApp
pip install -r requirements.txt
python app.py
```
*(Optional: to open older `.xls` rosters, also run `pip install xlrd`.)*

**Run the website (development)**
```bash
cd Code/Website/React_website
npm install
npm run dev
```
Then open the URL Vite prints, usually http://localhost:5173.

**Build the website for hosting**
```bash
npm run build
```
The static site is written to `Code/Website/React_website/dist/`. You can preview it with `npm run preview`.

---

## Functionality

### De-identifier walkthrough

1. **Step 1: Input names and IDs.** Type or paste professor names, student names and student IDs into their boxes. Entries can be separated by new lines, semicolons or tabs. "Last, First" is converted automatically, and titles such as "Dr." or "Prof." are removed from professor names. You can also click **📁 Load from Excel** to import a roster. The app looks for columns with "name" and "id" in the header. If it doesn't find them, it uses the first and second columns.
2. **Step 2: Custom file naming (optional).** Enter a prefix such as `ENGL101_Fall2025`. Output files are named `<prefix>_1.txt`, `<prefix>_2.txt`, and so on. The default prefix is `Student`.
3. **Step 3: Select student files.** Pick individual `.docx`/`.pdf` files or a whole folder. **🗑️ Clear Selection** starts over.
4. **Step 4: Select destination.** Choose an output folder. If you skip this step, the app creates a `Redacted_Output` folder next to the first selected file.
5. Click **🚀 DE-IDENTIFY.** A progress bar tracks the run. Matched names, IDs and emails are replaced with `[REDACTED]`. In PDFs, a header line that contains a name is replaced with `[REDACTED HEADER]`. If the check finds any term still in the output, the app shows a warning for that file.

### Website walkthrough

1. **Document Manager:** upload one or more `.txt` files (for example, the De-identifier's output). You can use the file picker or drag and drop.
2. **Dashboard:** choose one of the three tools.
3. **Keyword in Context:** enter a word or regex, set the number of context words (1–20), and turn on regex, case-sensitive or whole-word matching if needed. Click **Search**. Each hit is centered with context on both sides. You can sort by position, file, keyword or left/right context, and click a row to see more of the text. The page also shows hit counts per file and the matched word forms. Use **Export CSV** to download the results. The left sidebar controls which files are searched.
4. **Annotate:** select text in the document, type a note, and save it as a color-coded tag. Hover over a highlight to see its note. Click a tag to jump to each place it is used.
5. **Data Visualization:** run a search, then display the results as a bar chart, line chart, word cloud (top 100 non-stopwords) or results table.

---

## Known Problems

- **Output numbering is not reproducible (De-identifier).** `run_redaction` in `Code/TestApp/app.py` numbers files from `self.selected_files`, which is built from a `set` in `add_to_selected_files`. The order can change between runs, and no key file is written to link `Student_3.txt` back to its original paper.
- **`.txt` input is accepted but fails.** `add_to_selected_files` allows `.txt`, but `run_redaction` only processes `.docx` and `.pdf`, so a `.txt` file produces an "Unsupported file type" warning.
- **Formatting is lost.** All output is plain `.txt`.
- **Scanned PDFs are not supported.** There is no OCR, so a PDF made of images produces empty output.
- **Fuzzy matching can over-redact.** With a threshold of 80 in `fuzzy_replace`, names that are also common words (e.g., "Mark", "Grant", "Will") or are close to them will redact ordinary words too.
- **OneDrive import is not configured.** `DocumentManager` in `App.jsx` still has the placeholder `clientId: '<YOUR_ONEDRIVE_APP_CLIENT_ID>'`.
- **Website data is in memory only.** Uploaded files and annotations are lost when the page is refreshed, and annotations can't be exported yet. Annotations also reset when the file selection changes.
- **Some charts are placeholders.** In `DataVisualizationTool`, the bar chart shows one bar (the total match count), and the line chart plots generated values (`count: i + 1`), not real data.
- **Website hosting is not decided** ([issue #14](https://github.com/jjmoosman/CPTS_421_Project_ENG_DATA/issues/14)). GitHub Pages is being considered, pending client approval.
- **Old prototype files remain.** `Code/De_identifier.py` (an early PyQt5 prototype), `Code/TestApp/original_app.py`, `backup*.txt` and `Code/Website/Example_html/` are out of date and are not part of the current app.

---

## Contributing

1. Fork it!
2. Create your feature branch: `git checkout -b my-new-feature`
3. Commit your changes: `git commit -am 'Add some feature'`
4. Push to the branch: `git push origin my-new-feature`
5. Submit a pull request :D

---

## Additional Documentation

- **Sprint reports**
  - [Sprint 1](Sprints/Sprint_1/Sprint1_Report/Sprint1_Report.md)
  - [Sprint 2](Sprints/Sprint_2/Sprint2_Report/Sprint2_Report.md)
  - [Sprint 3](Sprints/Sprint_3/Sprint3_Report/Sprint3_Report.md)
  - [Sprint 4](Sprints/Sprint_4/Sprint4_Report/Sprint4_Report.md)
- **Releases / downloads:** [Deployment/Releases.md](Deployment/Releases.md)
- **Meeting minutes, slides and videos:** in each `Sprints/Sprint_N/` folder
- **Issue tracker:** https://github.com/jjmoosman/CPTS_421_Project_ENG_DATA/issues

---

## License

This project is licensed under the MIT License. See [LICENSE.txt](LICENSE.txt) for details.
