#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
批量把产品原图压缩为 WebP 缩略图（最长边 800px，质量 80）。

用法：
    python3 convert_webp.py --src <原图目录> --out <输出目录>

说明：
- 递归扫描 --src 下的 .png/.jpg/.jpeg，排除 .venv、输出目录等噪声；
- 输出到 --out，文件名去掉原扩展名、改为 .webp；目录结构按相对路径保留；
- 原图最长边已小于 800px 时不放大，仅重新编码；
- 运行后把输出目录里的 .webp 按站点现有 images/ 的组织方式放好即可；
  app.js 已配置 WebP 优先、缺失自动回退同名 PNG，未转 WebP 的图不受影响。
"""
import argparse
import os
import sys
from pathlib import Path

from PIL import Image

MAX_EDGE = 800
QUALITY = 80
EXTS = {".png", ".jpg", ".jpeg"}
SKIP_DIRS = {".venv", "node_modules", "输出", "output", "__pycache__"}


def iter_images(src: Path):
    for p in src.rglob("*"):
        if not p.is_file():
            continue
        if any(part in SKIP_DIRS for part in p.parts):
            continue
        if p.suffix.lower() in EXTS:
            yield p


def convert_one(src: Path, dst: Path) -> tuple[int, int]:
    im = Image.open(src)
    # 保留透明通道；WebP 支持 RGBA
    if im.mode not in ("RGB", "RGBA"):
        im = im.convert("RGBA" if im.mode in ("P", "LA", "PA") else "RGB")
    w, h = im.size
    scale = min(1.0, MAX_EDGE / max(w, h))
    if scale < 1.0:
        im = im.resize((round(w * scale), round(h * scale)), Image.LANCZOS)
    dst.parent.mkdir(parents=True, exist_ok=True)
    im.save(dst, "WEBP", quality=QUALITY, method=6)
    return src.stat().st_size, dst.stat().st_size


def main():
    global MAX_EDGE, QUALITY
    ap = argparse.ArgumentParser()
    ap.add_argument("--src", required=True, help="原图目录")
    ap.add_argument("--out", required=True, help="WebP 输出目录")
    ap.add_argument("--max-edge", type=int, default=MAX_EDGE)
    ap.add_argument("--quality", type=int, default=QUALITY)
    args = ap.parse_args()

    MAX_EDGE, QUALITY = args.max_edge, args.quality

    src_root = Path(args.src).resolve()
    out_root = Path(args.out).resolve()
    if not src_root.is_dir():
        print(f"[错误] 源目录不存在: {src_root}")
        sys.exit(1)

    images = list(iter_images(src_root))
    if not images:
        print("[提示] 未找到可转换的图片")
        return

    total_src = total_dst = 0
    ok = failed = 0
    for i, src in enumerate(images, 1):
        rel = src.relative_to(src_root)
        dst = out_root / rel.with_suffix(".webp")
        try:
            s, d = convert_one(src, dst)
            total_src += s
            total_dst += d
            ok += 1
        except Exception as e:
            failed += 1
            print(f"[失败] {src.name}: {e}")
        if i % 50 == 0:
            print(f"  进度 {i}/{len(images)}")

    def mb(x):
        return f"{x / 1048576:.1f}MB"

    print(f"\n完成: 成功 {ok} 张, 失败 {failed} 张")
    print(f"体积: 原图 {mb(total_src)} -> WebP {mb(total_dst)}", end="")
    if total_src:
        print(f"（节省 {100 * (1 - total_dst / total_src):.0f}%）")
    else:
        print()
    print(f"输出目录: {out_root}")


if __name__ == "__main__":
    main()
#（注：内容由AI生成）
