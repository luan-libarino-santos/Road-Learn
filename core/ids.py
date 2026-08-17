import random
import time

_ALPH = "0123456789abcdefghijklmnopqrstuvwxyz"


def _to36(n: int) -> str:
    if n <= 0:
        return "0"
    chars = []
    while n:
        n, r = divmod(n, 36)
        chars.append(_ALPH[r])
    return "".join(reversed(chars))


def gerar_id() -> str:
    return _to36(int(time.time() * 1000)) + "".join(random.choice(_ALPH) for _ in range(5))
