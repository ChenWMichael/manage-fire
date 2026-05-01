import json
from typing import List
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    supabase_url: str = ""
    supabase_service_key: str = ""
    supabase_jwt_secret: str = ""  # RS256 public key PEM or HS256 legacy secret
    cors_origins: str = '["http://localhost:5173"]'

    def get_cors_origins(self) -> List[str]:
        return json.loads(self.cors_origins)

    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()
