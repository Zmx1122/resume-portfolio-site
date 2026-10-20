"""拆分合并在一起的 PDF（比如整套 Bewerbungsmappe），每份文件单独保存，并生成缩略图。

需要：Python 3 和 pypdf（`pip install pypdf`）。缩略图需要 pdftoppm（poppler）或 macOS 自带的 sips，
两者都没有时只拆分、不生成缩略图。

第一步：看每一页是什么
    python3 scripts/split_pdf.py 合并文件.pdf --list

    会列出每一页开头的文字。扫描件没有文字时显示"（扫描页，没有文字）"，
    这时用 --previews 生成每页的预览图（默认宽 1000 像素，扫描的信件也能看清），打开看一眼再判断：
    python3 scripts/split_pdf.py 合并文件.pdf --list --previews 输出文件夹

第二步：按文件拆分
    python3 scripts/split_pdf.py 合并文件.pdf --out 输出文件夹 \\
        "1:hackathon-certificate" "2-3:arbeitszeugnis:private" "4:urkunde" "5-6:muster-gmbh-zeugnis:private"

    每一项是"页码范围:文件名"，页码从 1 开始。每份文件会生成：
      输出文件夹/<文件名>.pdf          拆出来的 PDF
      输出文件夹/<文件名>-thumb.png    第一页的缩略图（用于网站上的文件卡片）

    不公开原件的文件（on-request、summary：工作证明、成绩单、学位证书……）在后面加 ":private"。
    这样缩略图只有 48 像素宽，放大也看不清任何字。网页上的模糊效果只是样式，图片文件本身是能下载的，
    清楚的缩略图会把出生日期、学号等泄露出去。

    **只给人看、不给人下载的文件**（证书、Urkunde、获奖证书……）在后面加 ":preview"，并用 --watermark 写上水印：
        python3 scripts/split_pdf.py 合并文件.pdf --out 输出文件夹 --watermark "Mingxi Zhang · zmx1122.github.io · Nur zur Ansicht" \\
            "1:hackathon-certificate:preview" "4:urkunde:preview"
    会生成：
      输出文件夹/<文件名>-preview.png  宽 1000 像素、水印直接画在图上的预览图（网站上点开看的就是它）
      输出文件夹/<文件名>-thumb.png    同样带水印的缩略图
    网站里只放这两张图，不放 PDF 原件。水印画在图片里，别人另存或截图也去不掉。需要 Pillow（pip install pillow）。

第三种用法：证书本来就是一张照片或图片（不是 PDF）
    python3 scripts/split_pdf.py --image 证书照片.jpg --out 输出文件夹 --name hackathon-certificate --watermark "…"

拆出来的文件先放在工作文件夹里（比如 我的简历网站/_work/materials/），
只有确定公开的文件才复制进 site/assets/docs/。
"""
import argparse
import os
import re
import shutil
import subprocess
import sys
import tempfile

try:
    from pypdf import PdfReader, PdfWriter
except ImportError:
    sys.exit("需要 pypdf：请运行 pip install pypdf（或 pip3 install pypdf），然后再试。")


PRIVATE_WIDTH = 48
PREVIEW_WIDTH = 1000
WATERMARK_TAG = "resume-portfolio-site watermark"  # 写进 PNG 的说明字段，检查脚本靠它确认图片带水印

FONT_CANDIDATES = [  # 能显示中文的字体优先
    "/System/Library/Fonts/PingFang.ttc", "/System/Library/Fonts/STHeiti Medium.ttc", "/System/Library/Fonts/Hiragino Sans GB.ttc",
    "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc", "/usr/share/fonts/noto-cjk/NotoSansCJK-Regular.ttc",
    "C:\\Windows\\Fonts\\msyh.ttc", "C:\\Windows\\Fonts\\simhei.ttf",
    "/System/Library/Fonts/Supplemental/Arial.ttf", "/Library/Fonts/Arial.ttf", "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", "C:\\Windows\\Fonts\\arial.ttf",
]


def watermark(src, out_preview, out_thumb, text):
    """把图片缩到 1000 像素宽，斜着铺满半透明水印，底部再加一条清楚的水印，另存一张同样带水印的缩略图。"""
    try:
        from PIL import Image, ImageDraw, ImageFont
        from PIL.PngImagePlugin import PngInfo
    except ImportError:
        print("需要 Pillow 才能加水印：请运行 pip install pillow（或 pip3 install pillow），然后再试。")
        return False
    im = Image.open(src).convert("RGB")
    if im.width != PREVIEW_WIDTH:
        im = im.resize((PREVIEW_WIDTH, round(im.height * PREVIEW_WIDTH / im.width)))
    def font(size):
        for f in FONT_CANDIDATES:
            if os.path.exists(f):
                try:
                    return ImageFont.truetype(f, size)
                except OSError:
                    pass
        try:
            return ImageFont.load_default(size=size)
        except TypeError:
            return ImageFont.load_default()
    # 斜向平铺的浅色水印
    tile_font = font(30)
    layer = Image.new("RGBA", (im.width * 2, im.height * 2), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    step_x, step_y = max(420, len(text) * 16), 170
    for y in range(0, layer.height, step_y):
        for x in range(-step_x if (y // step_y) % 2 else 0, layer.width, step_x):
            d.text((x, y), text, font=tile_font, fill=(120, 120, 120, 70))
    layer = layer.rotate(28, resample=Image.BICUBIC)
    left, top = (layer.width - im.width) // 2, (layer.height - im.height) // 2
    layer = layer.crop((left, top, left + im.width, top + im.height))
    out = Image.alpha_composite(im.convert("RGBA"), layer)
    # 底部一条清楚的水印
    band_font = font(26)
    band_h = 52
    d = ImageDraw.Draw(out)
    d.rectangle([0, out.height - band_h, out.width, out.height], fill=(20, 20, 20, 210))
    d.text((24, out.height - band_h + 12), text, font=band_font, fill=(255, 255, 255, 255))
    out = out.convert("RGB")
    info = PngInfo()
    info.add_text("Software", WATERMARK_TAG)
    out.save(out_preview, pnginfo=info)
    thumb = out.resize((600, round(out.height * 600 / out.width)))
    thumb.save(out_thumb, pnginfo=info)
    return True



def thumbnail(pdf_path, png_path, width=600):
    """把 PDF 第一页渲染成 PNG。成功返回 True。"""
    if shutil.which("pdftoppm"):
        base = png_path[:-4]
        r = subprocess.run(["pdftoppm", "-png", "-singlefile", "-f", "1", "-l", "1", "-scale-to-x", str(width),
                            "-scale-to-y", "-1", pdf_path, base], capture_output=True)
        return r.returncode == 0 and os.path.exists(png_path)
    if shutil.which("sips"):
        r = subprocess.run(["sips", "-s", "format", "png", "--resampleWidth", str(width), pdf_path, "--out", png_path],
                           capture_output=True)
        return r.returncode == 0 and os.path.exists(png_path)
    return False


def parse_range(spec, total):
    m = re.fullmatch(r"\s*(\d+)\s*(?:-\s*(\d+))?\s*", spec)
    if not m:
        raise ValueError(f"页码写法不对：{spec}（例如 3 或 2-4）")
    a = int(m.group(1)); b = int(m.group(2) or a)
    if not (1 <= a <= b <= total):
        raise ValueError(f"页码超出范围：{spec}（这个 PDF 一共 {total} 页）")
    return a, b


def main():
    ap = argparse.ArgumentParser(description="拆分合并的 PDF")
    ap.add_argument("pdf", nargs="?")
    ap.add_argument("parts", nargs="*", help='"页码范围:文件名"，例如 "2-3:tum-arbeitszeugnis"')
    ap.add_argument("--list", action="store_true", help="列出每一页开头的文字")
    ap.add_argument("--previews", metavar="文件夹", help="和 --list 一起用：把每一页渲染成预览图")
    ap.add_argument("--preview-width", type=int, default=1000, help="预览图宽度（像素），默认 1000")
    ap.add_argument("--out", metavar="文件夹", help="拆分结果放在哪里")
    ap.add_argument("--watermark", metavar="文字", default="Nur zur Ansicht · View only · 仅供查看",
                    help='":preview" 文件的水印文字，建议写上姓名和网站网址')
    ap.add_argument("--image", metavar="图片", help="给一张图片（证书照片）生成带水印的预览图和缩略图，和 --out、--name 一起用")
    ap.add_argument("--name", metavar="文件名", help="和 --image 一起用：输出文件名")
    args = ap.parse_args()

    if args.image:
        if not args.out or not args.name:
            ap.error("--image 需要 --out 和 --name")
        os.makedirs(args.out, exist_ok=True)
        name = re.sub(r"[^a-z0-9-]+", "-", args.name.strip().lower()).strip("-")
        pv, th = os.path.join(args.out, f"{name}-preview.png"), os.path.join(args.out, f"{name}-thumb.png")
        if watermark(args.image, pv, th, args.watermark):
            print(f"{args.image} → {pv}，缩略图 {th}（带水印：{args.watermark}）")
        return
    if not args.pdf:
        ap.error("请给出 PDF 文件")

    reader = PdfReader(args.pdf)
    total = len(reader.pages)

    if args.list:
        print(f"{args.pdf}：共 {total} 页")
        for i, page in enumerate(reader.pages, 1):
            text = re.sub(r"\s+", " ", page.extract_text() or "").strip()
            print(f"  第 {i:>2} 页：{text[:160] if text else '（扫描页，没有文字）'}")
        if args.previews:
            os.makedirs(args.previews, exist_ok=True)
            with tempfile.TemporaryDirectory() as tmp:
                for i in range(total):
                    w = PdfWriter(); w.add_page(reader.pages[i])
                    one = os.path.join(tmp, f"p{i+1}.pdf")
                    with open(one, "wb") as f:
                        w.write(f)
                    png = os.path.join(args.previews, f"page-{i+1:02d}.png")
                    ok = thumbnail(one, png, width=args.preview_width)
                    print(f"  预览：{png if ok else '无法生成（需要 pdftoppm 或 sips）'}")
        return

    if not args.parts or not args.out:
        ap.error("拆分时需要 --out 和至少一个 \"页码范围:文件名\"；先用 --list 看看每页是什么")

    os.makedirs(args.out, exist_ok=True)
    used = set()
    for spec in args.parts:
        if ":" not in spec:
            ap.error(f"缺少文件名：{spec}（写成 \"页码范围:文件名\"）")
        bits = spec.split(":")
        rng, name = bits[0], bits[1]
        mode = bits[2].strip().lower() if len(bits) > 2 else ""
        private = mode == "private"
        preview = mode == "preview"
        name = re.sub(r"[^a-z0-9-]+", "-", name.strip().lower()).strip("-")
        if not name:
            ap.error(f"文件名只能用英文字母、数字和连字符：{spec}")
        a, b = parse_range(rng, total)
        used.update(range(a, b + 1))
        w = PdfWriter()
        for i in range(a - 1, b):
            w.add_page(reader.pages[i])
        pdf_path = os.path.join(args.out, f"{name}.pdf")
        with open(pdf_path, "wb") as f:
            w.write(f)
        thumb = os.path.join(args.out, f"{name}-thumb.png")
        if preview:
            with tempfile.TemporaryDirectory() as tmp:
                big = os.path.join(tmp, "page.png")
                if not thumbnail(pdf_path, big, width=PREVIEW_WIDTH * 2):
                    print(f"第 {a}–{b} 页 → {pdf_path}（无法渲染预览图，需要 pdftoppm 或 sips）")
                    continue
                pv = os.path.join(args.out, f"{name}-preview.png")
                if watermark(big, pv, thumb, args.watermark):
                    print(f"第 {a}–{b} 页 → {pdf_path}，带水印的预览图 {pv} 和缩略图 {thumb}（网站里只放这两张图，不放 PDF）")
            continue
        ok = thumbnail(pdf_path, thumb, width=PRIVATE_WIDTH if private else 600)
        kind = "（不公开的文件：缩略图只有 48 像素宽）" if private else ""
        print(f"第 {a}–{b} 页 → {pdf_path}" + (f"，缩略图 {thumb}{kind}" if ok else "（没有生成缩略图）"))

    left = [p for p in range(1, total + 1) if p not in used]
    if left:
        print(f"\n注意：第 {', '.join(map(str, left))} 页没有被拆分出来。确认这些页是不是遗漏了某份文件。")


if __name__ == "__main__":
    main()
