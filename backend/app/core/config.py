import os
from typing import List, Union
from pydantic import AnyHttpUrl, BeforeValidator
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing_extensions import Annotated

def parse_cors(v: Union[str, List[str]]) -> List[str]:
    if isinstance(v, str) and not v.startswith("["):
        return [i.strip() for i in v.split(",")]
    elif isinstance(v, (list, str)):
        return v
    raise ValueError(v)

class Settings(BaseSettings):
    PROJECT_NAME: str = "Sentinel"
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = "SUPER_SECRET_KEY_CHANGE_THIS_IN_PRODUCTION"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 8  # 8 days for simplicity in development

    # Shared token the dispatcher dashboard presents when opening the incident
    # WebSocket. This is a demo credential, not real authentication - swap in JWT
    # signature and expiry checks (see core/websocket_manager.py) before any
    # non-demo deployment.
    WS_ACCESS_TOKEN: str = "sentinel-demo-ws-token"
    
    # Database
    POSTGRES_SERVER: str = "localhost"
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = "postgres"
    POSTGRES_DB: str = "sentinel"
    POSTGRES_PORT: str = "5432"
    
    @property
    def SQLALCHEMY_DATABASE_URI(self) -> str:
        return f"postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_SERVER}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"

    # Redis & Celery
    REDIS_HOST: str = "localhost"
    REDIS_PORT: str = "6379"
    
    @property
    def CELERY_BROKER_URL(self) -> str:
        return f"redis://{self.REDIS_HOST}:{self.REDIS_PORT}/0"
        
    @property
    def CELERY_RESULT_BACKEND(self) -> str:
        return f"redis://{self.REDIS_HOST}:{self.REDIS_PORT}/0"

    # MinIO
    MINIO_ENDPOINT: str = "localhost:9000"
    MINIO_ROOT_USER: str = "minioadmin"
    MINIO_ROOT_PASSWORD: str = "minioadmin"
    MINIO_SECURE: bool = False
    MINIO_BUCKET_NAME: str = "sentinel-media"

    # CORS
    BACKEND_CORS_ORIGINS: Annotated[
        List[str], BeforeValidator(parse_cors)
    ] = ["http://localhost:5173", "http://127.0.0.1:5173"]

    # AI Config
    AI_PROVIDER: str = "llamacpp"  # llamacpp, lmstudio, openai

    # Echo every SQL statement to stdout. Off by default: the log includes
    # incident descriptions and reporter phone numbers.
    SQL_ECHO: bool = False
    LLAMA_MODEL_PATH: str = "models/gemma-4-e4b-qat.gguf"
    LMSTUDIO_API_URL: str = "http://localhost:1234/v1"
    OPENAI_API_KEY: str = ""
    OPENAI_API_URL: str = "https://api.openai.com/v1"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_ignore_empty=True,
        extra="ignore",
    )

settings = Settings()
