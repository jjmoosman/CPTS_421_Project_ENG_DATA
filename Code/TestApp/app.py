import sys
import re
import pandas as pd
from pathlib import Path
from rapidfuzz import fuzz
from PyQt6.QtWidgets import (QApplication, QMainWindow, QPushButton, QVBoxLayout, 
                             QWidget, QTextEdit, QLineEdit, QFileDialog, QLabel, QProgressBar, QMessageBox)
from docx import Document
import fitz  # PyMuPDF

class RedactorApp(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("FERPA Compliance Tool")
        self.setMinimumSize(600, 750)
        self.initUI()
        self.blacklisted_terms = set()
        self.selected_files = []
        self.output_dir = None
        self.temp_output_dir = None

    def initUI(self):
        layout = QVBoxLayout()

        # step 1: input names/ids
        layout.addWidget(QLabel("<b>Step 1: Input Names/IDs to Remove</b>"))
        self.name_input = QTextEdit()
        layout.addWidget(self.name_input)
        
        btn_excel = QPushButton("📁 Load from Excel")
        btn_excel.clicked.connect(self.load_excel)
        layout.addWidget(btn_excel)

        # step 2: custom file naming
        layout.addWidget(QLabel("<br><b>Step 2: Custom File Naming (Optional)</b>"))
        self.prefix_input = QLineEdit()
        self.prefix_input.setPlaceholderText("Enter file prefix (e.g. Class_Semester)")
        layout.addWidget(self.prefix_input)

        layout.addWidget(QLabel("<br><b>Step 3: Select Student Files</b>"))
        btn_files = QPushButton("📄 Select Files")
        btn_files.clicked.connect(self.select_files)
        layout.addWidget(btn_files)

        self.file_list_label = QLabel("No files selected")
        layout.addWidget(self.file_list_label)

        layout.addWidget(QLabel("<br><b>Step 4: Select Destination Folder</b>"))
        btn_files = QPushButton("Select Destination")
        btn_files.clicked.connect(self.select_destination)
        layout.addWidget(btn_files)

        self.selected_destination_label = QLabel("No destination selected")
        layout.addWidget(self.selected_destination_label)

        self.process_btn = QPushButton("🚀 DE-IDENTIFY")
        self.process_btn.clicked.connect(self.run_redaction)
        self.process_btn.setStyleSheet("background-color: #2E7D32; color: white; font-weight: bold; height: 40px;")
        layout.addWidget(self.process_btn)

        self.progress = QProgressBar()
        layout.addWidget(self.progress)
        
        container = QWidget()
        container.setLayout(layout)
        self.setCentralWidget(container)

    def load_excel(self):
        file_path, _ = QFileDialog.getOpenFileName(self, "Open Excel", "", "Excel Files (*.xlsx *.xls)")
        if file_path:
            df = pd.read_excel(file_path)
            items = df.values.flatten().astype(str)
            self.name_input.append("\n".join([i.strip() for i in items if i.lower() != 'nan']))

    def select_files(self):
        files, _ = QFileDialog.getOpenFileNames(self, "Select Files", "", "Documents (*.docx *.pdf)")
        if files:
            self.selected_files = files
            self.file_list_label.setText(f"Files selected: {len(files)}")
            
            #set default destination if no destination set yet
            if (self.output_dir == None):
                self.temp_output_dir = Path(self.selected_files[0]).parent / "Redacted_Output"
                self.selected_destination_label.setText(f"Destination selected: {self.temp_output_dir}")

    def select_destination(self):
        folder_path = QFileDialog.getExistingDirectory(self, "Select Destination Folder")
        if folder_path:
            self.output_dir = Path(folder_path) / "Redacted_Output" # make additional folder automatically?
            self.selected_destination_label.setText(f"Destination selected: {self.output_dir}")

    def run_redaction(self):
        raw_text = self.name_input.toPlainText().split('\n')
        self.blacklisted_terms = {t.strip() for t in raw_text if len(t.strip()) > 1}
        
        if not self.selected_files or not self.blacklisted_terms:
            QMessageBox.warning(self, "Missing Data", "Need files and names!")
            return
        
        # Determine prefix
        custom_prefix = self.prefix_input.text().strip()
        file_prefix = custom_prefix if custom_prefix else "Student"

        if (self.output_dir == None):
            self.output_dir = self.temp_output_dir
        self.output_dir.mkdir(exist_ok=True)
        
        self.progress.setMaximum(len(self.selected_files))

        for i, f_path in enumerate(self.selected_files):
            file_path = Path(f_path)
            # Rename file to Student_X to hide identity in title
            out_path = self.output_dir / f"{file_prefix}_{i+1}{file_path.suffix}"
            
            if file_path.suffix.lower() == ".docx":
                self.redact_docx(file_path, out_path)
            elif file_path.suffix.lower() == ".pdf":
                self.redact_pdf(file_path, out_path)
            
            self.progress.setValue(i + 1)
        
        QMessageBox.information(self, "Finished", f"Saved to: {self.output_dir}")

    def normalize_text(self, text):
        text = text.replace("\n", " ")
        text = re.sub(r"[._-]", " ", text)
        text = re.sub(r"\s+", " ", text)
        
        return text.strip()


    def fuzzy_replace(self, text, term, threshold=92):
        norm_text = re.sub(r"[._-]", " ", text)
        words = norm_text.split()

        text_lower = text.lower()
        term_lower = term.lower()

        name_parts = term_lower.split()
        if len(name_parts) < 2:
            return text
        
        first = name_parts[0]
        last = name_parts[-1]

        for i in range(len(words)):
            word1 = re.sub(r'[^a-zA-Z]', '', words[i]).lower()
            if fuzz.ratio(word1, first) < threshold:
                continue

            for j in range(i + 1, min(i + 4, len(words))):
                word2 = re.sub(r'[^a-zA-Z]', '', words[j]).lower()
                if fuzz.ratio(word2, last) >= threshold:
                    # Redact the entire span (includes middle name/initials)
                    span = " ".join(words[i:j+1])
                    text = text.replace(span, "[REDACTED]")
                    break

                # # allow small window for middle name/initial
                # w1 = re.sub(r'[^a-zA-Z]', '', words[i]).lower()
                # w2 = re.sub(r'[^a-zA-Z]', '', words[j]).lower()

                # first_match = fuzz.ratio(w1, first) >= threshold
                # last_match = fuzz.ratio(w2, last) >= threshold

                # if first_match and last_match:
                #     # redact entire span including middle name
                #     span = " ".join(words[i:j+1])
                #     text = text.replace(span, "[REDACTED]")
        combined_words = re.sub(r"[^a-zA-Z]", "", text_lower)
        combined_name = re.sub(r"[^a-zA-Z]", "", first + last)
        if fuzz.ratio(combined_words, combined_name) >= threshold:
            text = re.sub(re.escape(text), "[REDACTED]", text, flags=re.IGNORECASE)
        return text
    
    def redact_emails(self, text, threshold=90):
        email_pattern = r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b"
        profile_pattern = r"\b[A-Za-z0-9._-]+\b"  # catches linkedin-style usernames
        emails = re.findall(email_pattern, text)
        usernames = re.findall(profile_pattern, text)

        for term in self.blacklisted_terms:
            name_parts = term.lower().split()
            if len(name_parts) < 2:
                continue
            first = name_parts[0]
            last = name_parts[-1]

            #email matching
            for email in emails:
                local_part = email.split("@")[0]
                # Normalize separators
                cleaned = re.sub(r"[._-]", " ", local_part).lower()
                # Split into words (handles middle initials)
                local_words = cleaned.split()
                # Check if first + last appear fuzzy in local part
                first_match = any(fuzz.ratio(w, first) >= threshold for w in local_words)
                last_match = any(fuzz.ratio(w, last) >= threshold for w in local_words)

                # Also check first initial + last name (mjohnson)
                first_initial_last = any(
                    w[0] == first[0] and fuzz.ratio(w[1:], last) >= threshold
                    for w in local_words if len(w) > 1 
                )
                if (first_match and last_match) or first_initial_last:
                    text = text.replace(email, "[REDACTED]")
            for username in usernames:
                cleaned = re.sub(r"[._-]", " ", username).lower()
                local_words = cleaned.split()
                first_match = any(fuzz.ratio(w, first) >= threshold for w in local_words)
                last_match = any(fuzz.ratio(w, last) >= threshold for w in local_words)
                first_initial_last = any(
                    w[0] == first[0] and fuzz.ratio(w[1:], last) >= threshold
                    for w in local_words if len(w) > 1
                )
                if (first_match and last_match) or first_initial_last:
                    text = text.replace(username, "[REDACTED]")


        # for email in emails:
        #     local_part = email.split("@")[0]

        #     # normalize separators
        #     local_part_clean = re.sub(r"[._-]", " ", local_part)
        #     local_words = local_part_clean.split()

        #     for term in self.blacklisted_terms:
        #         name_parts = term.lower().split()
        #         if len(name_parts) < 2:
        #             continue

        #         first = name_parts[0]
        #         last = name_parts[-1]

        #         # email matching
        #         for email in emails:
        #             local_part = email.split("@")[0]
        #             cleaned = re.sub(r"[._-]", " ", local_part).lower()

        #             if fuzz.partial_ratio(cleaned, first) >= threshold and \
        #             fuzz.partial_ratio(cleaned, last) >= threshold:
        #                 text = text.replace(email, "[REDACTED]")
                
        #         # --- Username / LinkedIn matching ---
        #         for username in usernames:
        #             cleaned = re.sub(r"[._-]", " ", username).lower()
        #             if fuzz.partial_ratio(cleaned, first) >= threshold and \
        #             fuzz.partial_ratio(cleaned, last) >= threshold:
        #                 text = text.replace(username, "[REDACTED]")

        return text

    def redact_docx(self, input_path, output_path):
        doc = Document(input_path)
        
        # Helper for run-level replacement (preserves images/formatting)
        def replace_in_element(element):
            for para in element.paragraphs:
                # combines all runs (targeting split names)
                full_text = "".join(run.text for run in para.runs)

                #normalize text 
                normalized_text = self.normalize_text(full_text)

                redacted_text = normalized_text
                # fuzzy matching for edge cases
                for term in self.blacklisted_terms:
                    redacted_text = self.fuzzy_replace(redacted_text, term)
                
                redacted_text = self.redact_emails(redacted_text)
                
                #if content is changed, overwrite the paragraph
                if redacted_text != full_text:
                    #clear runs
                    for run in para.runs:
                        run.text = ""
                    para.runs[0].text = redacted_text


        # 1. Process Main Body
        replace_in_element(doc)

        # 2. Process Headers and Footers
        for section in doc.sections:
            replace_in_element(section.header)
            replace_in_element(section.footer)

        # 3. Process Tables
        for table in doc.tables:
            for row in table.rows:
                for cell in row.cells:
                    replace_in_element(cell)

        self.docx_to_txt(doc, output_path)

    def docx_to_txt(self, doc, output_path):
        txt_output_path = Path(output_path).with_suffix(".txt")

        with open(txt_output_path, "w", encoding="utf-8") as f:
            for paragraph in doc.paragraphs:
                f.write(paragraph.text + "\n")

            for table in doc.tables:
                for row in table.rows:
                    row_text = []
                    for cell in row.cells:
                        for paragraph in cell.paragraphs:
                            row_text.append(paragraph.text)
                    f.write(" | ".join(row_text) + "\n")

            for section in doc.sections:
                for paragraph in section.header.paragraphs:
                    f.write(paragraph.text + "\n")
                for paragraph in section.footer.paragraphs:
                    f.write(paragraph.text + "\n")

    def redact_pdf(self, input_path, output_path):
        doc = fitz.open(input_path)
        for page in doc:

            words = page.get_text("words")
            # --- Fuzzy name redaction ---
            for term in self.blacklisted_terms:
                name_parts = term.lower().split()
                if len(name_parts) < 2:
                    continue
                first = name_parts[0]
                last = name_parts[-1]

                for i in range(len(words)):
                    word1 = re.sub(r'[^a-zA-Z]', '', words[i][4]).lower()
                    if fuzz.ratio(word1, first) < 90:
                        continue

                    # look ahead for last name (allow middle initial)
                    for j in range(i + 1, min(i + 4, len(words))):
                        word2 = re.sub(r'[^a-zA-Z]', '', words[j][4]).lower()

                        if fuzz.ratio(word2, last) >= 90:
                            x0 = min(words[i][0], words[j][0])
                            y0 = min(words[i][1], words[j][1])
                            x1 = max(words[i][2], words[j][2])
                            y1 = max(words[i][3], words[j][3])

                            rect = fitz.Rect(x0, y0, x1, y1)
                            page.add_redact_annot(rect, fill=(0, 0, 0))
                            break
            # --- Email redaction ---
            email_pattern = r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b"
            page_text = page.get_text("text")
            emails = re.findall(email_pattern, page_text)

            for email in emails:
               local_part = email.split("@")[0]
               cleaned = re.sub(r"[._-]", " ", local_part).lower()

               for term in self.blacklisted_terms:
                   name_parts = term.lower().split()
                   if len(name_parts) < 2:
                       continue
                   first = name_parts[0]
                   last = name_parts[-1]

                   if fuzz.partial_ratio(cleaned, first) >= 90 and \
                   fuzz.partial_ratio(cleaned, last) >= 90:
                       
                       areas = page.search_for(email)
                       for rect in areas:
                           page.add_redact_annot(rect, fill=(0, 0, 0))
                        
            page.apply_redactions()

        doc.save(output_path)

        self.pdf_to_txt(doc, output_path)

    def pdf_to_txt(self, doc, output_path):
        txt_output_path = Path(output_path).with_suffix(".txt")

        with open(txt_output_path, "w", encoding="utf-8") as f:
            for page in doc:
                text = page.get_text("text")
                text = re.sub(r'(?<!\n)\n(?!\n)', ' ', text) # removes new line after each line
                f.write(text)

        doc.close()

if __name__ == "__main__":
    app = QApplication(sys.argv)
    window = RedactorApp()
    window.show()
    sys.exit(app.exec())