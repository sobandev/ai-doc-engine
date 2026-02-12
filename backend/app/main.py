from fastapi import FastAPI, UploadFile, File, HTTPException, Body, Form
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import shutil
import os
import uuid
import json
import traceback
from .services import transcribe_audio, extract_placeholders, parse_transcript_with_ai, infer_and_fill_template, generate_filled_docx, get_template_text

app = FastAPI(title="Dynamic Document Generator API")

# Allow frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://ai-doc-engine.vercel.app",
        "https://ai-doc-engine-git-main-sobandev.vercel.app"
    ],
    allow_origin_regex="https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = "backend/uploads"
TEMPLATE_DIR = "backend/templates"
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(TEMPLATE_DIR, exist_ok=True)

@app.get("/")
async def root():
    return {"message": "API is running. Use /transcribe or /generate-docx"}

@app.post("/transcribe")
async def transcribe_endpoint(
    file: UploadFile = File(...),
    template_type: str = Form("doctor"),
    template_file: UploadFile = File(None)
):
    """
    1. Save uploaded audio
    2. Handle optional custom template
    3. Transcribe to text
    4. Parse with AI based on template placeholders + CONTEXT
    5. Return structured data + transcript + custom_template_id
    """
    try:
        # Handle Custom Template Logic
        custom_template_id = None
        if template_file:
            custom_template_id = str(uuid.uuid4())
            custom_filename = f"custom_{custom_template_id}.docx"
            tpl_path = os.path.join(TEMPLATE_DIR, custom_filename)
            with open(tpl_path, "wb") as buffer:
                shutil.copyfileobj(template_file.file, buffer)
        else:
            # Use default templates based on type
            if template_type == "hr":
                tpl_path = os.path.join(TEMPLATE_DIR, "hr_template.docx")
            else:
                tpl_path = os.path.join(TEMPLATE_DIR, "doctor_template.docx")

        if not os.path.exists(tpl_path):
            raise HTTPException(status_code=500, detail="Template file missing on server")

        # Save Audio
        file_id = str(uuid.uuid4())
        file_ext = os.path.splitext(file.filename)[1]
        save_path = os.path.join(UPLOAD_DIR, f"{file_id}{file_ext}")
        
        with open(save_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # 1. Transcribe
        transcript = transcribe_audio(save_path)
        if not transcript:
             raise HTTPException(status_code=500, detail="Transcription failed")

        # 2. Get placeholders AND full template context
        placeholders = extract_placeholders(tpl_path)
        template_text = get_template_text(tpl_path)
        
        # 3. Parse with AI
        api_key = os.environ.get("GROQ_API_KEY")
        if not api_key:
            raise HTTPException(status_code=500, detail="GROQ_API_KEY not set on server")
            
        if not placeholders:
            print("No placeholders found. Using Smart Replacement Mode.")
            # Smart Mode: Infer fields and values
            inferred_response = infer_and_fill_template(transcript, template_text, api_key)
            
            # Parse JSON safely
            try:
                if isinstance(inferred_response, str):
                    inferred_data = json.loads(inferred_response)
                else:
                    inferred_data = inferred_response
            except:
                inferred_data = {}
                print("Failed to parse inferred AI response")

            # Fallback: Force Date if AI missed it
            from datetime import datetime
            today_str = datetime.now().strftime("%Y-%m-%d")
            for k, v in inferred_data.items():
                if isinstance(v, dict):
                     new_val = v.get("new", "")
                     if "date" in k.lower() and (not new_val or new_val.lower() == "not mentioned"):
                         v["new"] = today_str

            # Save metadata for later generation (maps Field -> Original Text)
            if custom_template_id and inferred_data:
                meta_path = os.path.join(TEMPLATE_DIR, f"meta_{custom_template_id}.json")
                with open(meta_path, "w") as f:
                    json.dump(inferred_data, f)
            
            # Flatten for frontend: {"Field": "New Value"}
            parsed_data = {}
            for field, details in inferred_data.items():
                if isinstance(details, dict):
                    parsed_data[field] = details.get("new", "")
                else:
                    parsed_data[field] = str(details) # Fallback
            
            placeholders = list(parsed_data.keys())

        else:
            # Standard Placeholder Mode
            parsed_data = parse_transcript_with_ai(transcript, placeholders, api_key, template_text)
        
        # Final cleanup / Parse JSON string from AI response (for standard mode)
        if isinstance(parsed_data, str):
            try:
                parsed_data = json.loads(parsed_data)
            except:
                pass 
        
        # Flatten and ensure strings for consistent display
        if isinstance(parsed_data, dict):
            for k, v in parsed_data.items():
                if isinstance(v, (dict, list)):
                    # Special handling for lists like medical findings
                    if isinstance(v, list) and all(isinstance(x, str) for x in v):
                         parsed_data[k] = ", ".join(v)
                    else:
                        # Otherwise dump as JSON substring
                        parsed_data[k] = json.dumps(v, ensure_ascii=False)
                elif v is None:
                    parsed_data[k] = ""
                else:
                    parsed_data[k] = str(v)

        # Clean up audio file
        if os.path.exists(save_path):
            os.remove(save_path)
                
        return JSONResponse({
            "transcript": transcript,
            "data": parsed_data,
            "placeholders": placeholders,
            "custom_template_id": custom_template_id
        })

    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/generate-docx")
async def generate_docx_endpoint(data: dict = Body(...)):
    try:
        filled_data = data.get("data", {})
        template_type = data.get("template_type", "doctor")
        custom_template_id = data.get("custom_template_id")
        
        if custom_template_id:
            tpl_name = f"custom_{custom_template_id}.docx"
        elif template_type == "hr":
            tpl_name = "hr_template.docx"
        else:
            tpl_name = "doctor_template.docx"
            
        tpl_path = os.path.join(TEMPLATE_DIR, tpl_name)
        
        if not os.path.exists(tpl_path):
            raise HTTPException(status_code=500, detail=f"Template {tpl_name} missing")
            
        out_filename = f"generated_{uuid.uuid4()}.docx"
        out_path = os.path.join(UPLOAD_DIR, out_filename)
        
        # Check for metadata (replacements)
        replacements = None
        if custom_template_id:
            meta_path = os.path.join(TEMPLATE_DIR, f"meta_{custom_template_id}.json")
            if os.path.exists(meta_path):
                with open(meta_path, "r") as f:
                    replacements = json.load(f)
            
        generate_filled_docx(tpl_path, filled_data, out_path, replacements=replacements)
        
        # Determine filename for download
        if custom_template_id:
            download_name = "custom_document.docx"
        elif template_type == "hr":
            download_name = "hr_document.docx"
        else:
            download_name = "medical_note.docx"

        return FileResponse(out_path, filename=download_name, media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document")

    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
