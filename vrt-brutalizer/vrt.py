from dataclasses import dataclass, field
from typing import Optional


FIELDS = {
    "word": {
        "label": "Word",
        "editable": False,
    },
    "pos": {
        "label": "Part of Speech",
        "editable": True,
        "type": "text",
    },
    "morf": {
        "label": "Morphological Segmentation",
        "editable": True,
        "type": "text",
    },
    "glossing": {
        "label": "Gloss",
        "editable": True,
        "type": "text",
    },
    "lemma": {
        "label": "Lemma",
        "editable": True,
        "type": "text",
    },
    "es": {
        "label": "Spanish",
        "editable": True,
        "type": "text",
    },
    "en": {
        "label": "English",
        "editable": True,
        "type": "text",
    },
}

FIELD_NAMES = list(FIELDS.keys())


@dataclass
class Token:
    word: str
    pos: str = "_"
    morf: str = "_"
    glossing: str = "_"
    lemma: str = "_"
    es: str = "_"
    en: str = "_"

    def to_dict(self):
        return {
            "word": self.word,
            "pos": self.pos,
            "morf": self.morf,
            "glossing": self.glossing,
            "lemma": self.lemma,
            "es": self.es,
            "en": self.en,
        }

    def to_vrt(self):
        return "\t".join([
            self.word,
            self.pos,
            self.morf,
            self.glossing,
            self.lemma,
            self.es,
            self.en,
        ])


@dataclass
class Sentence:
    tokens: list[Token] = field(default_factory=list)

    def to_dict(self):
        return {
            "tokens": [token.to_dict() for token in self.tokens]
        }


@dataclass
class Paragraph:
    sentences: list[Sentence] = field(default_factory=list)


@dataclass
class Corpus:
    lines: list[str]
    sentences: list[Sentence]



def parse_vrt(content: str) -> Corpus:
    lines = content.splitlines(keepends=True)

    sentences = []
    current_sentence = None

    for line in lines:
        stripped = line.strip()

        if stripped == "<s>":
            current_sentence = Sentence()
            continue

        if stripped == "</s>":
            if current_sentence is not None:
                sentences.append(current_sentence)
                current_sentence = None
            continue

        if not stripped:
            continue

        if stripped.startswith("<") or stripped.startswith("#"):
            continue

        if current_sentence is None:
            continue

        fields = stripped.split("\t")

        if len(fields) != len(FIELD_NAMES):
            raise ValueError(
                f"Expected {len(FIELD_NAMES)} fields, "
                f"found {len(fields)}: {stripped}"
            )

        token = Token(
            word=fields[0],
            pos=fields[1],
            morf=fields[2],
            glossing=fields[3],
            lemma=fields[4],
            es=fields[5],
            en=fields[6],
        )

        current_sentence.tokens.append(token)

    return Corpus(
        lines=lines,
        sentences=sentences,
    )