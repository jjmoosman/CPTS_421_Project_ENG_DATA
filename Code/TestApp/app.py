import sys
import re
import pandas as pd
from pathlib import Path
from PyQt6.QtWidgets import (QApplication, QMainWindow, QPushButton, QVBoxLayout, 
                             QWidget, QTextEdit, QFileDialog, QLabel, QProgressBar, QMessageBox)
from docx import Document
import fitz  # PyMuPDF

class RedactorApp(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("FERPA Compliance Tool")
        self.setMinimumSize(600, 700)
        self.initUI()
        self.blacklisted_terms = set()
        self.selected_files = []

    def initUI(self):
        layout = QVBoxLayout()
        layout.addWidget(QLabel("<b>Step 1: Input Names/IDs to Remove</b>"))
        self.name_input = QTextEdit()
        layout.addWidget(self.name_input)
        
        btn_excel = QPushButton("📁 Load from Excel")
        btn_excel.clicked.connect(self.load_excel)
        layout.addWidget(btn_excel)

        layout.addWidget(QLabel("<br><b>Step 2: Select Student Files</b>"))
        btn_files = QPushButton("📄 Select Files")
        btn_files.clicked.connect(self.select_files)
        layout.addWidget(btn_files)
        
        self.file_list_label = QLabel("No files selected")
        layout.addWidget(self.file_list_label)

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

    def run_redaction(self):
        raw_text = self.name_input.toPlainText().split('\n')
        self.blacklisted_terms = {t.strip() for t in raw_text if len(t.strip()) > 1}
        
        if not self.selected_files or not self.blacklisted_terms:
            QMessageBox.warning(self, "Missing Data", "Need files and names!")
            return

        output_dir = Path(self.selected_files[0]).parent / "Redacted_Output"
        output_dir.mkdir(exist_ok=True)
        
        self.progress.setMaximum(len(self.selected_files))

        for i, f_path in enumerate(self.selected_files):
            file_path = Path(f_path)
            # Rename file to Student_X to hide identity in title
            out_path = output_dir / f"Student_{i+1}{file_path.suffix}"
            
            if file_path.suffix.lower() == ".docx":
                self.redact_docx(file_path, out_path)
            elif file_path.suffix.lower() == ".pdf":
                self.redact_pdf(file_path, out_path)
            
            self.progress.setValue(i + 1)
        
        QMessageBox.information(self, "Finished", f"Saved to: {output_dir}")

    def redact_docx(self, input_path, output_path):
        doc = Document(input_path)
        
        # Helper for run-level replacement (preserves images/formatting)
        def replace_in_element(element):
            for para in element.paragraphs:
                for run in para.runs:
                    original_text = run.text
                    new_text = original_text
                    for term in sorted(self.blacklisted_terms, key=len, reverse=True):
                        pattern = re.compile(re.escape(term), re.IGNORECASE)
                        new_text = pattern.sub("[REDACTED]", new_text)
                    if new_text != original_text:
                        run.text = new_text

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

        doc.save(output_path)

    def redact_pdf(self, input_path, output_path):
        doc = fitz.open(input_path)
        for page in doc:
            for term in self.blacklisted_terms:
                # search_for is case-insensitive by default in newer PyMuPDF
                areas = page.search_for(term)
                for rect in areas:
                    page.add_redact_annot(rect, fill=(0, 0, 0))
            page.apply_redactions()
        doc.save(output_path)
        doc.close()

if __name__ == "__main__":
    app = QApplication(sys.argv)
    window = RedactorApp()
    window.show()
    sys.exit(app.exec())