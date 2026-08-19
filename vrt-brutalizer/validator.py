import re


VALIDATION_RULES = {
    "pos": r"^[A-Z]+$",
    "morf": r"^[a-z]+(-[a-z]+)*$",
    "glossing": r".*",
    "lemma": r"^[a-z]+$",
    "es": r".*",
    "en": r".*",
}


def validate_field(field_name: str, value: str) -> tuple[bool, str | None]:
    regex = VALIDATION_RULES.get(field_name)

    if regex is None:
        return True, None

    if re.fullmatch(regex, value):
        return True, None

    return False, f"Invalid value for {field_name}"