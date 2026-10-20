"""拆分合并在一起的 PDF（比如整套 Bewerbungsmappe），每份文件单独保存，并生成缩略图。

需要：Python 3 和 pypdf（`pip install pypdf`）。缩略图需要 pdftoppm（poppler）或 macOS 自带的 sips，
两者都没有时只拆分、不生成缩略图。

第一步：看每一页是什么
    python3 scripts/split_pdf.py 合并文件.pdf --list

    会列出每一页开头的文字。扫描件没有文字时显示"（扫描页，没有文字）"，
    这时用 --previews 生成每页的小图，打开看一眼再判断：
    python3 scripts/split_pdf.py 合并文件.pdf --list --previews 输出文件夹

第二步：按文件拆分
    python3 scripts/split_pdf.py 合并文件.pdf --out 输出文件夹 \\
        "1:aws-hackathon-certificate" "2-3:tum-arbeitszeugnis" "4:vdi-urkunde" "5-6:muster-gmbh-zeugnis"

    每一项是"页码范围:文件名"，页码从 1 开始。每份文件会生成：
      输出文件夹/<文件名>.pdf          拆出来的 PDF
      输出文件夹/<文件名>-thumb.png    第一页的缩略图（用于网站上的文件卡片）

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
    ap.add_argument("pdf")
    ap.add_argument("parts", nargs="*", help='"页码范围:文件名"，例如 "2-3:tum-arbeitszeugnis"')
    ap.add_argument("--list", action="store_true", help="列出每一页开头的文字")
    ap.add_argument("--previews", metavar="文件夹", help="和 --list 一起用：把每一页渲染成小图")
    ap.add_argument("--out", metavar="文件夹", help="拆分结果放在哪里")
    args = ap.parse_args()

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
                    ok = thumbnail(one, png, width=400)
                    print(f"  预览：{png if ok else '无法生成（需要 pdftoppm 或 sips）'}")
        return

    if not args.parts or not args.out:
        ap.error("拆分时需要 --out 和至少一个 \"页码范围:文件名\"；先用 --list 看看每页是什么")

    os.makedirs(args.out, exist_ok=True)
    used = set()
    for spec in args.parts:
        if ":" not in spec:
            ap.error(f"缺少文件名：{spec}（写成 \"页码范围:文件名\"）")
        rng, name = spec.split(":", 1)
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
        ok = thumbnail(pdf_path, thumb)
        print(f"第 {a}–{b} 页 → {pdf_path}" + (f"，缩略图 {thumb}" if ok else "（没有生成缩略图）"))

    left = [p for p in range(1, total + 1) if p not in used]
    if left:
        print(f"\n注意：第 {', '.join(map(str, left))} 页没有被拆分出来。确认这些页是不是遗漏了某份文件。")


if __name__ == "__main__":
    main()
