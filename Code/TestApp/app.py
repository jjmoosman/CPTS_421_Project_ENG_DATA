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

        # Step 3: select files
        layout.addWidget(QLabel("<br><b>Step 3: Select Student Files</b>"))

        file_btn_layout = QVBoxLayout()

        # individual file selection
        btn_files = QPushButton("📄 Select Individual Files")
        btn_files.clicked.connect(self.select_files)
        file_btn_layout.addWidget(btn_files)

        # folder selection (all .docx/.pdf in folder)
        btn_folder = QPushButton("📂 Select Folder (All .docx/.pdf)")
        btn_folder.clicked.connect(self.select_folder)
        file_btn_layout.addWidget(btn_folder)
        layout.addLayout(file_btn_layout)

        # Clear button to reset selection
        btn_clear = QPushButton("🗑️ Clear Selection")
        btn_clear.clicked.connect(self.clear_selection)
        btn_clear.setStyleSheet("color: #d32f2f; font-size: 11px; border: 1px solid #d32f2f;")
        file_btn_layout.addWidget(btn_clear)

        self.file_list_label = QLabel("No files selected")
        layout.addWidget(self.file_list_label)

        # Step 4: select destination
        layout.addWidget(QLabel("<br><b>Step 4: Select Destination Folder</b>"))
        btn_files = QPushButton("Select Destination")
        btn_files.clicked.connect(self.select_destination)
        layout.addWidget(btn_files)

        self.selected_destination_label = QLabel("No destination selected")
        layout.addWidget(self.selected_destination_label)

        # de-identify button
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
            self.add_to_selected_files(files)

    def select_folder(self):
        folder_path = QFileDialog.getExistingDirectory(self, "Select Folder of Student Writings")
        if folder_path:
            folder = Path(folder_path)
            found_files = []
            # Searching for common extensions
            for ext in ["*.pdf", "*.docx", "*.PDF", "*.DOCX"]:
                found_files.extend([str(f) for f in folder.glob(ext)])
            
            if found_files:
                self.add_to_selected_files(found_files)
            else:
                QMessageBox.warning(self, "No Files Found", "No PDF or DOCX files found in that folder.")

    def add_to_selected_files(self, new_files):
        """Merges new selections with existing ones and prevents duplicates."""
        combined = set(self.selected_files) | set(new_files)
        self.selected_files = list(combined)
        self.file_list_label.setText(f"Total files selected: {len(self.selected_files)}")
        
        if not self.output_dir and self.selected_files:
            self.temp_output_dir = Path(self.selected_files[0]).parent / "Redacted_Output"
            self.selected_destination_label.setText(f"Default Destination: {self.temp_output_dir}")

    def clear_selection(self):
        self.selected_files = []
        self.file_list_label.setText("No files selected")
        
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

    def fuzzy_replace(self, text, term, threshold=75):
        """Enhanced to catch all name variations without removing entire lines"""
        name_parts = term.lower().split()
        if len(name_parts) < 2:
            return text

        first = name_parts[0]
        last = name_parts[-1]
        first_initial = first[0]
    
        # Common titles
        titles = ['dr', 'mr', 'mrs', 'ms', 'prof', 'professor', 'doc', 'doctor']
    
        # Create abbreviation versions
        first_abbrev = first[:3] if len(first) > 3 else first
        first_abbrev4 = first[:4] if len(first) > 4 else first
    
        # Escape special characters
        first_escaped = re.escape(first)
        last_escaped = re.escape(last)
        first_initial_escaped = re.escape(first_initial)
        first_abbrev_escaped = re.escape(first_abbrev)
        first_abbrev4_escaped = re.escape(first_abbrev4)

        redacted_text = text
    
        # --- TITLE + LAST NAME PATTERNS ---
        for title in titles:
            title_escaped = re.escape(title)
            # Dr. Moore, Dr Moore - only replace the title + last name, not the whole line
            pattern_title = rf'\b{title_escaped}\.?\s+{last_escaped}\b'
            # Use a lambda to preserve surrounding text
            redacted_text = re.sub(pattern_title, "[REDACTED]", redacted_text, flags=re.IGNORECASE)
    
        # --- LAST NAME ONLY PATTERNS ---
        common_words = {'the', 'and', 'for', 'but', 'not', 'are', 'all', 'was', 'had', 
                        'has', 'have', 'with', 'from', 'this', 'that', 'more', 'most'}
    
        if last not in common_words and len(last) > 2:
            # Only redact standalone last names, not parts of other words
            pattern_last = rf'(?<!\w){last_escaped}(?!\w)'
            redacted_text = re.sub(pattern_last, "[REDACTED]", redacted_text, flags=re.IGNORECASE)
    
        # --- STANDARD NAME PATTERNS ---
        # These patterns only match the exact name, not surrounding text
    
        # First Last (including abbreviations)
        patterns = [
            rf'\b{first_escaped}\s+{last_escaped}\b',
            rf'\b{first_abbrev_escaped}\s+{last_escaped}\b',
        ]
    
        if first_abbrev4 != first_abbrev:
            patterns.append(rf'\b{first_abbrev4_escaped}\s+{last_escaped}\b')
    
        # With separators
        patterns.extend([
            rf'\b{first_escaped}[._-]{last_escaped}\b',
            rf'\b{first_abbrev_escaped}[._-]{last_escaped}\b',
            rf'\b{first_escaped}{last_escaped}\b',  # joined
            rf'\b{first_abbrev_escaped}{last_escaped}\b',
        ])
    
        # With initials
        patterns.extend([
            rf'\b{first_initial_escaped}\.?\s+{last_escaped}\b',
            rf'\b{first_initial_escaped}{last_escaped}\b',
        ])
    
        # Reversed format
        patterns.extend([
            rf'\b{last_escaped}\s*,\s*{first_escaped}\b',
            rf'\b{last_escaped}\s*,\s*{first_abbrev_escaped}\b',
        ])
    
        # Apply all patterns
        for pattern in patterns:
            redacted_text = re.sub(pattern, "[REDACTED]", redacted_text, flags=re.IGNORECASE)
    
        # --- WORD-BY-WORD FUZZY MATCHING ---
        # This handles misspellings and ensures we only redact the exact name span
        temp_text = redacted_text
        words = list(re.finditer(r'\b\w+\b', temp_text))
        redaction_positions = []
    
        i = 0
        while i < len(words):
            word_match = words[i]
            word = word_match.group()
            word_clean = re.sub(r'[^a-zA-Z]', '', word).lower()
            word_start, word_end = word_match.start(), word_match.end()
        
            # Check for title + last name
            if word_clean in titles and i + 1 < len(words):
                next_word = words[i + 1].group()
                next_clean = re.sub(r'[^a-zA-Z]', '', next_word).lower()
            
                if fuzz.ratio(next_clean, last) >= threshold:
                    # Only redact the title and last name, not surrounding words
                    start = word_start
                    end = words[i + 1].end()
                
                    # Check if this span is already redacted
                    span_text = temp_text[start:end]
                    if span_text != "[REDACTED]":
                        temp_text = temp_text[:start] + "[REDACTED]" + temp_text[end:]
                        redaction_positions.append((start, start + len("[REDACTED]")))
                        words = list(re.finditer(r'\b\w+\b', temp_text))
                        i = -1
                        i += 1
                        continue
        
            # Check for first name + last name pattern
            first_ratio = fuzz.ratio(word_clean, first)
            abbrev_ratio = fuzz.ratio(word_clean, first_abbrev)
        
            if first_ratio >= threshold or abbrev_ratio >= threshold:
                found_match = False
                for j in range(i + 1, min(i + 4, len(words))):
                    last_match = words[j]
                    last_word = last_match.group()
                    last_clean = re.sub(r'[^a-zA-Z]', '', last_word).lower()
                
                    if fuzz.ratio(last_clean, last) >= threshold:
                        # Only redact from first word to last word of the name
                        start = word_start
                        end = last_match.end()
                    
                        # Check if this span is already redacted
                        span_text = temp_text[start:end]
                        if span_text != "[REDACTED]":
                            overlap = any(r_start <= start < r_end or r_start < end <= r_end 
                                        for r_start, r_end in redaction_positions)
                        
                            if not overlap:
                                temp_text = temp_text[:start] + "[REDACTED]" + temp_text[end:]
                                redaction_positions.append((start, start + len("[REDACTED]")))
                                words = list(re.finditer(r'\b\w+\b', temp_text))
                                found_match = True
                                break
            
                if found_match:
                    i = -1
        
            # Check for standalone last name (but only if it's not part of a longer name we already caught)
            last_ratio = fuzz.ratio(word_clean, last)
            if last_ratio >= threshold + 5 and word_clean not in common_words and len(word_clean) > 2:
                # Make sure this isn't part of a first+last pattern we missed
                is_part_of_name = False
            
                # Check previous word
                if i > 0:
                    prev_word = words[i-1].group()
                    prev_clean = re.sub(r'[^a-zA-Z]', '', prev_word).lower()
                    if fuzz.ratio(prev_clean, first) >= threshold or fuzz.ratio(prev_clean, first_abbrev) >= threshold:
                        is_part_of_name = True
            
                # Check next word
                if i < len(words) - 1 and not is_part_of_name:
                    next_word = words[i+1].group()
                    # If next word is a common word, probably not part of a name
                    if next_word.lower() not in common_words:
                        is_part_of_name = True
            
                if not is_part_of_name:
                    start = word_start
                    end = word_end
                
                    span_text = temp_text[start:end]
                    if span_text != "[REDACTED]":
                        overlap = any(r_start <= start < r_end or r_start < end <= r_end 
                                    for r_start, r_end in redaction_positions)
                    
                        if not overlap:
                            temp_text = temp_text[:start] + "[REDACTED]" + temp_text[end:]
                            redaction_positions.append((start, start + len("[REDACTED]")))
                            words = list(re.finditer(r'\b\w+\b', temp_text))
                            i = -1
        
            i += 1
    
        if temp_text != redacted_text:
            redacted_text = temp_text
    
        return redacted_text
        
    def redact_emails(self, text, threshold=80):
        """Simplified email redaction"""
        email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b'
        emails = re.findall(email_pattern, text)
    
        # Also find usernames (LinkedIn profiles, etc.)
        username_pattern = r'\b[A-Za-z0-9][A-Za-z0-9._-]{2,}[A-Za-z0-9]\b'
        usernames = re.findall(username_pattern, text)
    
        redacted_text = text
    
        for term in self.blacklisted_terms:
            name_parts = term.lower().split()
            if len(name_parts) < 2:
                continue
        
            first = name_parts[0]
            last = name_parts[-1]
            first_initial = first[0]
        
            # Define all possible email/username patterns to check
            patterns = [
                f"{first}.{last}",     # jake.milly
                f"{first}-{last}",      # jake-milly
                f"{first}_{last}",      # jake_milly
                f"{first}{last}",       # jakemilly
                f"{first_initial}.{last}",  # j.milly
                f"{first_initial}{last}",   # jmilly
                f"{last}.{first}",      # milly.jake
                f"{last}-{first}",      # milly-jake
                f"{last}_{first}",      # milly_jake
            ]
        
            # Check emails
            for email in emails:
                local = email.split('@')[0].lower()
            
                # Check each pattern
                for pattern in patterns:
                    if pattern in local:
                        redacted_text = redacted_text.replace(email, "[REDACTED]")
                        break
                else:
                    # Fuzzy check if local part contains both names
                    if fuzz.partial_ratio(local, first) >= threshold and \
                    fuzz.partial_ratio(local, last) >= threshold:
                        redacted_text = redacted_text.replace(email, "[REDACTED]")
        
            # Check usernames (same logic)
            for username in usernames:
                if '@' in username:
                    continue
                
                username_lower = username.lower()
            
                for pattern in patterns:
                    if pattern in username_lower:
                        redacted_text = redacted_text.replace(username, "[REDACTED]")
                        break
                else:
                    if fuzz.partial_ratio(username_lower, first) >= threshold and \
                    fuzz.partial_ratio(username_lower, last) >= threshold:
                        redacted_text = redacted_text.replace(username, "[REDACTED]")
    
        return redacted_text

    def redact_docx(self, input_path, output_path):
        doc = Document(input_path)
        
        # Helper for run-level replacement (preserves images/formatting)
        def replace_in_element(element):
            for para in element.paragraphs:
                # combines all runs (targeting split names)
                full_text = "".join(run.text for run in para.runs)

                #normalize text 
                #normalized_text = self.normalize_text(full_text)
                redacted_text = full_text
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
            # Get all text blocks with their positions
            blocks = page.get_text("dict")["blocks"]
        
            for block in blocks:
                if "lines" in block:
                    for line in block["lines"]:
                        for span in line["spans"]:
                            original_text = span["text"]
                        
                            # Apply redaction to this span's text
                            redacted_text = original_text
                        
                            # Apply fuzzy replacement for names
                            for term in self.blacklisted_terms:
                                redacted_text = self.fuzzy_replace(redacted_text, term)
                        
                            # Apply email redaction
                            redacted_text = self.redact_emails(redacted_text)
                        
                            # If text was changed, redact this span
                            if redacted_text != original_text:
                                # Get the rectangle for this span
                                rect = fitz.Rect(span["bbox"])
                                page.add_redact_annot(rect, fill=(0, 0, 0))
        
            # Also check for specific email patterns that might span multiple spans
            email_pattern = r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b"
            page_text = page.get_text("text")
            emails = re.findall(email_pattern, page_text)
        
            for email in emails:
                # Check if email contains any blacklisted terms
                should_redact = False
                email_lower = email.lower()
            
                for term in self.blacklisted_terms:
                    name_parts = term.lower().split()
                    if len(name_parts) < 2:
                        continue
                
                    first = name_parts[0]
                    last = name_parts[-1]
                
                    # Check various email formats
                    local_part = email.split("@")[0].lower()
                
                    # Check for first.last, first_last, firstlast, etc.
                    if (f"{first}.{last}" in local_part or
                        f"{first}-{last}" in local_part or
                        f"{first}_{last}" in local_part or
                        f"{first}{last}" in local_part or
                        (local_part.startswith(first[0]) and last in local_part)):
                        should_redact = True
                        break
            
                if should_redact:
                    areas = page.search_for(email)
                    for rect in areas:
                        page.add_redact_annot(rect, fill=(0, 0, 0))
        
            # Apply all redactions
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