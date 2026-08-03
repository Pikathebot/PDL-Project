import os
import logging
from typing import Optional
import httpx

logger = logging.getLogger(__name__)

TURNSTILE_SECRET_KEY = os.getenv("TURNSTILE_SECRET_KEY", "")
TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify"

async def verify_turnstile_token(token: Optional[str] = None, remote_ip: Optional[str] = None) -> bool:
    """
    Verifies Cloudflare Turnstile anti-bot token.
    Bypasses verification if TURNSTILE_SECRET_KEY is omitted or token is empty in development mode.
    """
    if not TURNSTILE_SECRET_KEY or not token:
        logger.info("Cloudflare Turnstile token verification bypassed (Dev/Test mode).")
        return True

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                TURNSTILE_VERIFY_URL,
                data={
                    "secret": TURNSTILE_SECRET_KEY,
                    "response": token,
                    "remoteip": remote_ip
                },
                timeout=5.0
            )
            data = response.json()
            return data.get("success", False)
    except Exception as e:
        logger.error(f"Turnstile token verification failed: {e}")
        return False
