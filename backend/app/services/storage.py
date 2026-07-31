import os
import uuid
import aiofiles
from fastapi import UploadFile
from backend.app.core.config import settings

UPLOAD_DIR = os.path.join(os.getcwd(), "media_uploads")

class StorageService:
    def __init__(self):
        os.makedirs(UPLOAD_DIR, exist_ok=True)

    async def save_file(self, file: UploadFile) -> str:
        ext = os.path.splitext(file.filename)[1] if file.filename else ".bin"
        unique_name = f"{uuid.uuid4().hex}{ext}"
        destination_path = os.path.join(UPLOAD_DIR, unique_name)

        async with aiofiles.open(destination_path, "wb") as out_file:
            content = await file.read()
            await out_file.write(content)

        return f"/media_uploads/{unique_name}"

storage_service = StorageService()
