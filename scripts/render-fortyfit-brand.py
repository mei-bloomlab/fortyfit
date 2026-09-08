#!/usr/bin/env python3
"""Render FORTYFIT brand marks, wordmarks, lockups, and presentation boards."""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

REPO = Path(__file__).resolve().parents[1]
ROOT = REPO / "brand" / "fortyfit"
SVG = ROOT / "svg"
PNG = ROOT / "png"
ARTIFACTS = Path("/opt/cursor/artifacts")
FONT_PATH = Path("/tmp/fortyfit-fonts/Outfit.ttf")

BLACK = (28, 26, 23, 255)  # #1C1A17
OLIVE = (58, 70, 48, 255)  # #3A4630
NAVY = (28, 42, 58, 255)  # #1C2A3A
CLAY = (139, 110, 78, 255)  # #8B6E4E
PAPER = (244, 240, 232, 255)  # #F4F0E8
WHITE = (255, 255, 255, 255)
MUTED = (120, 112, 102, 255)


def font(size: int, weight: int = 560) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(FONT_PATH), size=size)


def new_canvas(w: int, h: int, color: tuple[int, int, int, int]) -> Image.Image:
    return Image.new("RGBA", (w, h), color)


def draw_cantilever(
    draw: ImageDraw.ImageDraw,
    box: tuple[int, int, int, int],
    fill: tuple[int, int, int, int],
) -> None:
    x, y, s, _ = box[0], box[1], box[2], box[3]
    # Geometry in 100-unit space, scaled into a square of size s.
    beam = scale_rect(x, y, s, 14, 22, 72, 18)
    post = scale_rect(x, y, s, 32, 40, 18, 38)
    draw.rectangle(beam, fill=fill)
    draw.rectangle(post, fill=fill)


def draw_stance(
    draw: ImageDraw.ImageDraw,
    box: tuple[int, int, int, int],
    fill: tuple[int, int, int, int],
) -> None:
    x, y, s, _ = box[0], box[1], box[2], box[3]
    draw.rectangle(scale_rect(x, y, s, 16, 20, 68, 16), fill=fill)
    draw.rectangle(scale_rect(x, y, s, 38, 36, 24, 34), fill=fill)
    draw.rectangle(scale_rect(x, y, s, 26, 70, 18, 10), fill=fill)
    draw.rectangle(scale_rect(x, y, s, 56, 70, 18, 10), fill=fill)


def draw_keystone(
    draw: ImageDraw.ImageDraw,
    box: tuple[int, int, int, int],
    fill: tuple[int, int, int, int],
) -> None:
    x, y, s, _ = box[0], box[1], box[2], box[3]

    def p(u: float, v: float) -> tuple[int, int]:
        return (round(x + u / 100 * s), round(y + v / 100 * s))

    draw.polygon(
        [p(34, 20), p(66, 20), p(84, 80), p(62, 80), p(62, 68), p(38, 68), p(38, 80), p(16, 80)],
        fill=fill,
    )


MARKS = {
    "cantilever": draw_cantilever,
    "stance": draw_stance,
    "keystone": draw_keystone,
}


def scale_rect(
    x: int, y: int, s: int, u: float, v: float, w: float, h: float
) -> tuple[int, int, int, int]:
    left = round(x + u / 100 * s)
    top = round(y + v / 100 * s)
    right = round(x + (u + w) / 100 * s)
    bottom = round(y + (v + h) / 100 * s)
    return (left, top, right, bottom)


HERO_NAMES = {
    "FORTYFIT-cantilever-primary.png",
    "FORTYFIT-cantilever-lockup.png",
    "board-cantilever.png",
    "system-cantilever.png",
    "lockup-horizontal-cantilever-black-on-paper.png",
    "lockup-stacked-cantilever-black-on-paper.png",
    "mark-cantilever-black-on-paper-1024.png",
    "mark-cantilever-white-on-black-1024.png",
    "wordmark-black-on-paper.png",
}


def save(img: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    img.save(path, "PNG")
    if path.name in HERO_NAMES:
        dest = ARTIFACTS / "assets" / path.name
        dest.parent.mkdir(parents=True, exist_ok=True)
        img.save(dest, "PNG")


def mark_on_ground(
    name: str,
    size: int,
    fill: tuple[int, int, int, int],
    ground: tuple[int, int, int, int],
    pad_ratio: float = 0.18,
) -> Image.Image:
    img = new_canvas(size, size, ground)
    draw = ImageDraw.Draw(img)
    pad = int(size * pad_ratio)
    MARKS[name](draw, (pad, pad, size - pad * 2, size - pad * 2), fill)
    return img


def wordmark_width(text: str, fnt: ImageFont.FreeTypeFont) -> int:
    dummy = ImageDraw.Draw(new_canvas(10, 10, PAPER))
    box = dummy.textbbox((0, 0), text, font=fnt)
    return box[2] - box[0]


def wordmark_height(text: str, fnt: ImageFont.FreeTypeFont) -> int:
    dummy = ImageDraw.Draw(new_canvas(10, 10, PAPER))
    box = dummy.textbbox((0, 0), text, font=fnt)
    return box[3] - box[1]


def draw_wordmark(
    draw: ImageDraw.ImageDraw,
    xy: tuple[int, int],
    fill: tuple[int, int, int, int],
    size: int,
) -> tuple[int, int]:
    fnt = font(size)
    draw.text(xy, "fortyfit", font=fnt, fill=fill)
    return wordmark_width("fortyfit", fnt), wordmark_height("fortyfit", fnt)


def horizontal_lockup(
    name: str,
    fill: tuple[int, int, int, int],
    ground: tuple[int, int, int, int],
    height: int = 360,
) -> Image.Image:
    mark_s = int(height * 0.42)
    text_s = int(height * 0.17)
    gap = int(height * 0.08)
    fnt = font(text_s)
    tw = wordmark_width("fortyfit", fnt)
    pad_x = int(height * 0.28)
    pad_y = int(height * 0.29)
    width = pad_x * 2 + mark_s + gap + tw
    img = new_canvas(width, height, ground)
    draw = ImageDraw.Draw(img)
    MARKS[name](draw, (pad_x, (height - mark_s) // 2, mark_s, mark_s), fill)
    # Optical vertical align of lowercase wordmark to mark center.
    tb = ImageDraw.Draw(new_canvas(10, 10, PAPER)).textbbox((0, 0), "fortyfit", font=fnt)
    text_h = tb[3] - tb[1]
    text_x = pad_x + mark_s + gap
    text_y = (height - text_h) // 2 - tb[1]
    draw.text((text_x, text_y), "fortyfit", font=fnt, fill=fill)
    return img


def stacked_lockup(
    name: str,
    fill: tuple[int, int, int, int],
    ground: tuple[int, int, int, int],
    height: int = 720,
) -> Image.Image:
    mark_s = int(height * 0.38)
    text_s = int(height * 0.09)
    gap = int(height * 0.06)
    fnt = font(text_s)
    tw = wordmark_width("fortyfit", fnt)
    width = max(int(height * 0.92), tw + int(height * 0.28))
    img = new_canvas(width, height, ground)
    draw = ImageDraw.Draw(img)
    mark_x = (width - mark_s) // 2
    mark_y = int(height * 0.22)
    MARKS[name](draw, (mark_x, mark_y, mark_s, mark_s), fill)
    tb = ImageDraw.Draw(new_canvas(10, 10, PAPER)).textbbox((0, 0), "fortyfit", font=fnt)
    text_x = (width - tw) // 2
    text_y = mark_y + mark_s + gap - tb[1]
    draw.text((text_x, text_y), "fortyfit", font=fnt, fill=fill)
    return img


def wordmark_only(
    fill: tuple[int, int, int, int],
    ground: tuple[int, int, int, int],
    height: int = 280,
) -> Image.Image:
    text_s = int(height * 0.38)
    fnt = font(text_s)
    tw = wordmark_width("fortyfit", fnt)
    pad_x = int(height * 0.35)
    img = new_canvas(tw + pad_x * 2, height, ground)
    draw = ImageDraw.Draw(img)
    tb = draw.textbbox((0, 0), "fortyfit", font=fnt)
    draw.text((pad_x, (height - (tb[3] - tb[1])) // 2 - tb[1]), "fortyfit", font=fnt, fill=fill)
    return img


def labeled(draw: ImageDraw.ImageDraw, text: str, xy: tuple[int, int]) -> None:
    draw.text(xy, text, font=font(22, 450), fill=MUTED)


def presentation_board(name: str, title: str) -> Image.Image:
    w, h = 2400, 1350
    img = new_canvas(w, h, PAPER)
    draw = ImageDraw.Draw(img)
    draw.text((80, 56), f"FORTYFIT  /  {title}", font=font(28, 500), fill=MUTED)

    # Large mark
    MARKS[name](draw, (120, 180, 420, 420), BLACK)
    # Wordmark beside it
    fnt = font(92)
    tb = draw.textbbox((0, 0), "fortyfit", font=fnt)
    draw.text((620, 180 + (420 - (tb[3] - tb[1])) // 2 - tb[1]), "fortyfit", font=fnt, fill=BLACK)

    # Horizontal lockup
    lock = horizontal_lockup(name, BLACK, PAPER, height=220)
    img.alpha_composite(lock, (80, 700))

    # Stacked lockup
    stacked = stacked_lockup(name, BLACK, PAPER, height=520)
    img.alpha_composite(stacked, (1580, 160))

    # Small sizes
    for i, s in enumerate((128, 64, 32, 16)):
        small = mark_on_ground(name, s, BLACK, PAPER, pad_ratio=0.08)
        img.alpha_composite(small, (80 + i * 150, 1040))
        draw.text((80 + i * 150, 1040 + s + 10), f"{s}px", font=font(18), fill=MUTED)

    # Reverse chip
    chip = mark_on_ground(name, 128, WHITE, BLACK, pad_ratio=0.18)
    img.alpha_composite(chip, (820, 1000))
    draw.text((820, 1140), "reverse", font=font(18), fill=MUTED)

    olive = mark_on_ground(name, 128, OLIVE, PAPER, pad_ratio=0.18)
    img.alpha_composite(olive, (980, 1000))
    draw.text((980, 1140), "olive", font=font(18), fill=MUTED)

    return img


def system_sheet(name: str, title: str) -> Image.Image:
    w, h = 2400, 1350
    img = new_canvas(w, h, PAPER)
    draw = ImageDraw.Draw(img)
    draw.text((80, 48), f"FORTYFIT  /  {title}  /  SYSTEM", font=font(26), fill=MUTED)

    # Row 1 primary
    MARKS[name](draw, (80, 130, 180, 180), BLACK)
    fnt = font(54)
    tb = draw.textbbox((0, 0), "fortyfit", font=fnt)
    draw.text((300, 130 + (180 - (tb[3] - tb[1])) // 2 - tb[1]), "fortyfit", font=fnt, fill=BLACK)
    lock = horizontal_lockup(name, BLACK, PAPER, 160)
    img.alpha_composite(lock, (1100, 140))
    labeled(draw, "primary  /  charcoal on paper", (80, 330))

    # Row 2 black
    draw.rectangle((80, 380, 2320, 620), fill=(236, 231, 222, 255))
    MARKS[name](draw, (120, 420, 140, 140), BLACK)
    lock_b = horizontal_lockup(name, BLACK, (236, 231, 222, 255), 140)
    img.alpha_composite(lock_b, (320, 420))
    wm = wordmark_only(BLACK, (236, 231, 222, 255), 140)
    img.alpha_composite(wm, (1400, 420))
    labeled(draw, "one-color black", (120, 580))

    # Row 3 reverse
    draw.rectangle((80, 660, 2320, 920), fill=BLACK)
    MARKS[name](draw, (120, 700, 140, 140), WHITE)
    lock_w = horizontal_lockup(name, WHITE, BLACK, 140)
    img.alpha_composite(lock_w, (320, 700))
    wm_w = wordmark_only(WHITE, BLACK, 140)
    img.alpha_composite(wm_w, (1400, 700))
    draw.text((120, 860), "reversed  /  white on charcoal", font=font(22), fill=(180, 174, 166, 255))

    # Row 4 color + swatches
    MARKS[name](draw, (80, 980, 140, 140), OLIVE)
    lock_o = horizontal_lockup(name, OLIVE, PAPER, 140)
    img.alpha_composite(lock_o, (280, 980))
    swatches = [
        ("#1C1A17", BLACK),
        ("#3A4630", OLIVE),
        ("#1C2A3A", NAVY),
        ("#8B6E4E", CLAY),
        ("#F4F0E8", PAPER),
    ]
    for i, (hex_label, color) in enumerate(swatches):
        sx = 1500 + i * 160
        draw.rectangle((sx, 1000, sx + 130, 1130), fill=color, outline=BLACK if color == PAPER else None)
        draw.text((sx, 1144), hex_label, font=font(16), fill=MUTED)
    labeled(draw, "brand color  /  olive", (80, 1144))
    return img


def write_color_svgs() -> None:
    variants = {
        "black": "#1C1A17",
        "white": "#FFFFFF",
        "olive": "#3A4630",
        "navy": "#1C2A3A",
    }
    bodies = {
        "cantilever": """  <g fill="{c}">
    <rect x="14" y="22" width="72" height="18" />
    <rect x="32" y="40" width="18" height="38" />
  </g>""",
        "stance": """  <g fill="{c}">
    <rect x="16" y="20" width="68" height="16" />
    <rect x="38" y="36" width="24" height="34" />
    <rect x="26" y="70" width="18" height="10" />
    <rect x="56" y="70" width="18" height="10" />
  </g>""",
        "keystone": """  <path fill="{c}" d="M34 20 H66 L84 80 H62 V68 H38 V80 H16 Z" />""",
    }
    for mark, body in bodies.items():
        for name, color in variants.items():
            (SVG / f"mark-{mark}-{name}.svg").write_text(
                f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" role="img" aria-label="FORTYFIT {mark} mark">
  <title>FORTYFIT</title>
{body.format(c=color)}
</svg>
''',
                encoding="utf-8",
            )


def write_lockup_svgs() -> None:
    # Horizontal lockup: mark + wordmark as SVG (text remains live Outfit fallback).
    for mark in ("cantilever", "stance", "keystone"):
        href = f"mark-{mark}.svg"
        (SVG / f"lockup-horizontal-{mark}.svg").write_text(
            f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 120" role="img" aria-label="fortyfit">
  <title>fortyfit</title>
  <svg x="8" y="18" width="84" height="84" viewBox="0 0 100 100">
    <use href="{href}#root" />
  </svg>
  <image href="{href}" x="8" y="18" width="84" height="84" />
  <text x="108" y="76" font-family="Outfit, Avenir Next, Avenir, Helvetica Neue, sans-serif" font-size="56" font-weight="560" fill="#1C1A17">fortyfit</text>
</svg>
''',
            encoding="utf-8",
        )
        (SVG / f"lockup-stacked-{mark}.svg").write_text(
            f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 280 280" role="img" aria-label="fortyfit">
  <title>fortyfit</title>
  <image href="{href}" x="90" y="28" width="100" height="100" />
  <text x="140" y="196" text-anchor="middle" font-family="Outfit, Avenir Next, Avenir, Helvetica Neue, sans-serif" font-size="36" font-weight="560" fill="#1C1A17">fortyfit</text>
</svg>
''',
            encoding="utf-8",
        )


def main() -> None:
    PNG.mkdir(parents=True, exist_ok=True)
    ARTIFACTS.mkdir(parents=True, exist_ok=True)
    write_color_svgs()
    write_lockup_svgs()

    grounds = {
        "paper": PAPER,
        "black": BLACK,
        "transparent": (0, 0, 0, 0),
    }
    fills = {
        "black": BLACK,
        "white": WHITE,
        "olive": OLIVE,
        "navy": NAVY,
    }

    for mark in MARKS:
        for fill_name, fill in fills.items():
            for ground_name, ground in grounds.items():
                if fill_name == "white" and ground_name == "paper":
                    continue
                if fill_name != "white" and ground_name == "black":
                    continue
                if fill_name == "white" and ground_name == "transparent":
                    # keep a transparent white mark for dark UIs
                    pass
                img = mark_on_ground(mark, 1024, fill, ground, pad_ratio=0.14)
                save(img, PNG / f"mark-{mark}-{fill_name}-on-{ground_name}-1024.png")
            # favicon / avatar sizes
            for size in (512, 256, 128, 64, 32):
                save(
                    mark_on_ground(mark, size, BLACK, PAPER, pad_ratio=0.14),
                    PNG / f"mark-{mark}-black-on-paper-{size}.png",
                )
                save(
                    mark_on_ground(mark, size, WHITE, BLACK, pad_ratio=0.14),
                    PNG / f"mark-{mark}-white-on-black-{size}.png",
                )

        save(horizontal_lockup(mark, BLACK, PAPER), PNG / f"lockup-horizontal-{mark}-black-on-paper.png")
        save(horizontal_lockup(mark, WHITE, BLACK), PNG / f"lockup-horizontal-{mark}-white-on-black.png")
        save(horizontal_lockup(mark, OLIVE, PAPER), PNG / f"lockup-horizontal-{mark}-olive-on-paper.png")
        save(stacked_lockup(mark, BLACK, PAPER), PNG / f"lockup-stacked-{mark}-black-on-paper.png")
        save(stacked_lockup(mark, WHITE, BLACK), PNG / f"lockup-stacked-{mark}-white-on-black.png")
        save(presentation_board(mark, mark.upper()), PNG / f"board-{mark}.png")
        save(system_sheet(mark, mark.upper()), PNG / f"system-{mark}.png")

    save(wordmark_only(BLACK, PAPER), PNG / "wordmark-black-on-paper.png")
    save(wordmark_only(WHITE, BLACK), PNG / "wordmark-white-on-black.png")
    save(wordmark_only(OLIVE, PAPER), PNG / "wordmark-olive-on-paper.png")

    # Master download board: recommended cantilever at usable sizes
    hero = mark_on_ground("cantilever", 1600, BLACK, PAPER, pad_ratio=0.16)
    save(hero, PNG / "FORTYFIT-cantilever-primary.png")
    hero_lock = horizontal_lockup("cantilever", BLACK, PAPER, height=480)
    save(hero_lock, PNG / "FORTYFIT-cantilever-lockup.png")
    print("rendered", len(list(PNG.glob("*.png"))), "pngs")


if __name__ == "__main__":
    main()
