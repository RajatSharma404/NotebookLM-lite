from slowapi import Limiter
from slowapi.util import get_remote_address

# In-process rate limiter for local-first single-process architecture
limiter = Limiter(key_func=get_remote_address, default_limits=["180/minute"])
