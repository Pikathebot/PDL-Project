import os
import uuid
import aiofiles
from fastapi import UploadFile
from backend.app.core.config import settings

UPLOAD_DIR = os.path.join(os.getcwd(), "media_uploads")

class StorageService:
    def __init__(self):
        os.makedirs(UPLOAD_DIR, exist_ok=True)

    async def save_file(self, file: UploadFile) -> tuple[str, int]:
        ext = os.path.splitext(file.filename)[1] if file.filename else ".bin"
        unique_name = f"{uuid.uuid4().hex}{ext}"
        destination_path = os.path.join(UPLOAD_DIR, unique_name)

        async with aiofiles.open(destination_path, "wb") as out_file:
            content = await file.read()
            await out_file.write(content)

        return f"/media_uploads/{unique_name}", len(content)

    def resolve_path(self, file_url: str) -> str:
        """
        Map a stored URL path back to a filesystem path.

        save_file returns a *URL* ("/media_uploads/<uuid>.jpg"), which is what
        gets persisted on MediaAttachment.file_path. Handing that straight to
        os.path.exists always returns False, so anything doing filesystem work on
        an attachment (YOLO detection, EXIF verification) silently fell through to
        its "file not found" branch no matter what was installed.
        """
        return os.path.join(UPLOAD_DIR, os.path.basename(file_url))


storage_service = StorageService()
