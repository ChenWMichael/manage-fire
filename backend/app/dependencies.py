import json

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt

from app.config import settings

security = HTTPBearer()


def _load_jwt_key() -> tuple:
    """Return (key, algorithm) from SUPABASE_JWT_SECRET.

    Supports four formats:
      - JWKS ({"keys": [...]})  → RS256 using first key
      - Single JWK object       → RS256
      - PEM public key          → RS256
      - HS256 secret string     → HS256
    """
    raw = settings.supabase_jwt_secret
    try:
        parsed = json.loads(raw)
        # JWKS format — extract the first key
        key = parsed["keys"][0] if "keys" in parsed else parsed
        # Read algorithm from the JWK itself; fall back based on key type
        alg = key.get("alg") or ("RS256" if key.get("kty") == "RSA" else "ES256")
        return key, alg
    except (json.JSONDecodeError, ValueError, KeyError, IndexError):
        key = raw.replace("\\n", "\n")
        algorithm = "RS256" if key.startswith("-----BEGIN") else "HS256"
        return key, algorithm


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict:
    token = credentials.credentials
    try:
        key, algorithm = _load_jwt_key()
        payload = jwt.decode(
            token,
            key,
            algorithms=[algorithm],
            audience="authenticated",
        )
        user_id: str = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
        return {"id": user_id, "email": payload.get("email", "")}
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
        )
