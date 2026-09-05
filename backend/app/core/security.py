import os
import logging
from typing import Optional
import httpx

logger = logging.getLogger(__name__)

TURNSTILE_SECRET_KEY = os.getenv("TURNSTILE_SECRET_KEY", "")
TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify"

async def verify_turnstile_token(token: Optional[str] = None, remote_ip: Optional[str] = None) -> bool:
    """
    Verify a Cloudflare Turnstile anti-bot token.

    Disabled entirely when TURNSTILE_SECRET_KEY is unset, which is the default
    and the state this project runs in. That is a deliberate open door, not a
    check that happens to pass.

    The condition used to be `not TURNSTILE_SECRET_KEY or not token`, which made
    the check unenforceable even once configured: any client that simply omitted
    the token took the bypass branch, and a bot omits it for free. Turnstile only
    stops anything if a *missing* token is a failure, so now it is.

    Consequence worth knowing before setting the key: no Turnstile widget exists
    in the frontend yet, so nothing currently sends a token. Setting
    TURNSTILE_SECRET_KEY without first adding the widget will reject every
    incident report with a 403.
    """
    if not TURNSTILE_SECRET_KEY:
        logger.debug("Turnstile disabled: TURNSTILE_SECRET_KEY is not set.")
        return True

    if not token:
        logger.warning("Turnstile is enabled but the request carried no token - rejecting.")
        return False

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
