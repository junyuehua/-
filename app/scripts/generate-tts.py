#!/usr/bin/env python3
"""信息卡正文转语音（edge-tts，免费·晓晓中文女声）。内容感知增量。

朗读文本 = 标题 + 正文（含引文，去掉 > 标记）；行内链接 [文字](url) 只留文字。
唯一输入：app/annotations.json（title_zh + body_zh）。
输出：
  - app/public/audio/<id>.mp3            每张卡一个
  - app/public/audio/.tts-manifest.json  每卡朗读文本的哈希（用于增量判断，勿手改）
  - app/src/generated/audioIds.ts        有语音的卡片 id 集合（前端判断）

用法（在 app/ 下）：python3 scripts/generate-tts.py [--force]
  默认**内容感知增量**：只重生成"文本变了 / 新卡 / mp3 缺失"的；删卡后自动清理孤儿 mp3；
    文本没变的跳过（对照 .tts-manifest.json 的哈希）。改声音也会因哈希变化自动全量重生成。
  --force：忽略哈希，全部重生成。
"""
import argparse
import asyncio
import hashlib
import json
import os
import re

import edge_tts

VOICE = "zh-CN-XiaoxiaoNeural"  # 晓晓·温暖女声（2026-07-13 用户选定）
CONCURRENCY = 8  # 并发上限，避免触发服务端限流

HERE = os.path.dirname(os.path.abspath(__file__))
APP = os.path.dirname(HERE)
OUT_DIR = os.path.join(APP, "public", "audio")
MANIFEST_JSON = os.path.join(OUT_DIR, ".tts-manifest.json")
MANIFEST_TS = os.path.join(APP, "src", "generated", "audioIds.ts")


def speech_text(a: dict) -> str:
    """卡片 → 朗读文本：标题（后加句号促成停顿）+ 正文；引文去 > 标记、链接只留文字。"""
    title = (a.get("title_zh") or "").strip()
    lines = []
    for line in (a.get("body_zh") or "").split("\n"):
        s = line.strip()
        if not s:
            continue
        s = re.sub(r"^>\s?", "", s)  # 引文标记
        s = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", s)  # 链接只留文字
        lines.append(s)
    body = "\n".join(lines)
    head = title + ("。" if title and title[-1] not in "。！？" else "")
    return (head + "\n" + body).strip() if body else head


def digest(text: str) -> str:
    """朗读文本 + 声音的哈希——声音变了也会失配触发重生成。"""
    return hashlib.sha1(f"{VOICE}\n{text}".encode("utf-8")).hexdigest()


async def synth(sem, text, path):
    async with sem:
        await edge_tts.Communicate(text, VOICE).save(path)


async def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--force", action="store_true", help="忽略哈希，全部重生成")
    args = ap.parse_args()

    ann = json.load(open(os.path.join(APP, "annotations.json"), encoding="utf-8"))
    os.makedirs(OUT_DIR, exist_ok=True)
    os.makedirs(os.path.dirname(MANIFEST_TS), exist_ok=True)
    old = {}
    if os.path.exists(MANIFEST_JSON):
        old = json.load(open(MANIFEST_JSON, encoding="utf-8"))

    sem = asyncio.Semaphore(CONCURRENCY)
    tasks, ids, new_hashes = [], [], {}
    n_new = n_changed = n_same = 0
    for a in ann:
        text = speech_text(a)
        if not text:
            continue  # 无标题无正文——不出音频（也不进 id 集合）
        cid = str(a["id"])
        ids.append(a["id"])
        h = digest(text)
        new_hashes[cid] = h
        path = os.path.join(OUT_DIR, f"{cid}.mp3")
        exists = os.path.exists(path)
        if not args.force and exists and old.get(cid) == h:
            n_same += 1
            continue
        n_new += 0 if exists else 1
        n_changed += 1 if exists else 0
        tasks.append(synth(sem, text, path))

    # 清理孤儿：annotations 里已不存在（删卡 / 卡的文本被清空）对应的 mp3
    keep = {f"{i}.mp3" for i in ids}
    orphans = [f for f in os.listdir(OUT_DIR) if f.endswith(".mp3") and f not in keep]
    for f in orphans:
        os.remove(os.path.join(OUT_DIR, f))

    print(
        f"卡片 {len(ids)} 张有朗读文本 | 新增 {n_new} · 变更 {n_changed} · 未变 {n_same} · "
        f"删除孤儿 {len(orphans)}{'（--force 全量）' if args.force else ''}"
    )
    if tasks:
        done = 0
        for coro in asyncio.as_completed(tasks):
            await coro
            done += 1
            if done % 20 == 0 or done == len(tasks):
                print(f"  已生成 {done}/{len(tasks)}")

    # 写回哈希 manifest + 前端 id 集合
    json.dump(new_hashes, open(MANIFEST_JSON, "w", encoding="utf-8"), ensure_ascii=False, indent=0)
    ids.sort()
    with open(MANIFEST_TS, "w", encoding="utf-8") as f:
        f.write("// 由 scripts/generate-tts.py 生成，勿手改。有语音的卡片 id 集合。\n")
        f.write(f"export const AUDIO_IDS = new Set<number>({json.dumps(ids)})\n")
    total = sum(os.path.getsize(os.path.join(OUT_DIR, f)) for f in os.listdir(OUT_DIR) if f.endswith(".mp3"))
    print(f"完成。audio/ 共 {total // 1024 // 1024}MB；manifest {len(ids)} 个 id")


if __name__ == "__main__":
    asyncio.run(main())
