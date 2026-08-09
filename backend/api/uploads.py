from fastapi import UploadFile
import pymupdf
from backend.rag.retrieval import insert_case_document

async def process_pdf(file: UploadFile, user_id: int):
    try:
        content = await file.read()
        filename = file.filename or "uploaded_document"
        
        if filename.endswith(".txt"):
            text = content.decode("utf-8", errors="ignore")
            insert_case_document(user_id, filename, text)
            pages = len(text.split("\n\n"))
            return {"status": "success", "filename": filename, "pages": pages}
            
        else:
            # Process as PDF
            doc = pymupdf.open(stream=content, filetype="pdf")
            text = ""
            for page in doc:
                text += page.get_text() + "\n"

            insert_case_document(user_id, filename, text)
            return {"status": "success", "filename": filename, "pages": len(doc)}
            
    except Exception as e:
        print(f"Error processing document upload: {e}")
        return {"error": str(e)}
