import PyPDF2
import sys

def extract_text(pdf_path):
    try:
        with open(pdf_path, 'rb') as file:
            reader = PyPDF2.PdfReader(file)
            text = ""
            for i, page in enumerate(reader.pages):
                page_text = page.extract_text()
                # To prevent overloading, just grab first 10 pages for now or everything if we want
                text += f"\n--- Page {i+1} ---\n{page_text}"
            
            with open('pdf_content.txt', 'w', encoding='utf-8') as out:
                 out.write(text)
            print("Extracted successfully to pdf_content.txt")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    extract_text(sys.argv[1])
