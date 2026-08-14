#!/usr/bin/env python3
"""Analyze WeChat official account article data from CSV or XLSX files."""

from __future__ import annotations

import argparse
import csv
import datetime as dt
import math
import re
import statistics
import sys
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any


FIELD_ALIASES = {
    "title": ["标题", "文章标题", "图文标题", "内容标题", "title", "headline"],
    "publish_time": ["发布时间", "发表时间", "推送时间", "发布日期", "日期", "时间", "publish_time", "date"],
    "views": ["阅读量", "阅读人数", "阅读次数", "总阅读", "阅读", "views", "read_count", "reads"],
    "shares": ["分享", "分享次数", "转发", "转发次数", "shares", "share_count"],
    "favorites": ["收藏", "收藏次数", "favorites", "saves", "save_count"],
    "likes": ["点赞", "点赞数", "在看", "看一看", "likes", "like_count"],
    "comments": ["评论", "留言", "评论数", "留言数", "comments", "comment_count"],
    "open_rate": ["打开率", "送达打开率", "open_rate"],
    "click_rate": ["点击率", "原文点击率", "菜单点击率", "ctr", "click_rate"],
    "completion_rate": ["完读率", "读完率", "completion_rate", "finish_rate"],
    "impressions": ["送达人数", "曝光", "曝光量", "impressions", "delivered"],
}

NUMERIC_FIELDS = {
    "views",
    "shares",
    "favorites",
    "likes",
    "comments",
    "open_rate",
    "click_rate",
    "completion_rate",
    "impressions",
}

STOPWORDS = {
    "一个",
    "一种",
    "如何",
    "为什么",
    "什么",
    "我们",
    "你们",
    "他们",
    "这些",
    "那些",
    "这个",
    "那个",
    "真的",
    "不是",
    "没有",
    "可以",
    "可能",
    "应该",
}


def normalize_header(value: Any) -> str:
    return str(value or "").strip().lower().replace(" ", "").replace("_", "")


def build_field_map(headers: list[str]) -> dict[str, str]:
    normalized = {normalize_header(header): header for header in headers}
    result = {}
    for canonical, aliases in FIELD_ALIASES.items():
        for alias in aliases:
            key = normalize_header(alias)
            if key in normalized:
                result[canonical] = normalized[key]
                break
    return result


def parse_number(value: Any) -> float | None:
    if value is None:
        return None
    if isinstance(value, (int, float)):
        if isinstance(value, float) and math.isnan(value):
            return None
        return float(value)
    text = str(value).strip()
    if not text or text in {"-", "--", "无", "null", "None"}:
        return None
    is_percent = "%" in text
    text = text.replace(",", "").replace("，", "").replace("%", "")
    multiplier = 1.0
    if text.endswith("万"):
        multiplier = 10000.0
        text = text[:-1]
    elif text.endswith("k") or text.endswith("K"):
        multiplier = 1000.0
        text = text[:-1]
    try:
        number = float(text) * multiplier
    except ValueError:
        match = re.search(r"-?\d+(?:\.\d+)?", text)
        if not match:
            return None
        number = float(match.group(0)) * multiplier
    if is_percent:
        return number / 100.0
    return number


def parse_datetime(value: Any) -> dt.datetime | None:
    if value is None:
        return None
    if isinstance(value, dt.datetime):
        return value
    if isinstance(value, dt.date):
        return dt.datetime.combine(value, dt.time())
    text = str(value).strip()
    if not text:
        return None
    for fmt in (
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%d %H:%M",
        "%Y/%m/%d %H:%M:%S",
        "%Y/%m/%d %H:%M",
        "%Y-%m-%d",
        "%Y/%m/%d",
        "%Y.%m.%d",
    ):
        try:
            return dt.datetime.strptime(text, fmt)
        except ValueError:
            pass
    return None


def load_csv(path: Path, encoding: str | None) -> list[dict[str, Any]]:
    encodings = [encoding] if encoding else ["utf-8-sig", "gb18030", "utf-8"]
    last_error: Exception | None = None
    for enc in encodings:
        try:
            with path.open("r", encoding=enc, newline="") as handle:
                return list(csv.DictReader(handle))
        except UnicodeDecodeError as exc:
            last_error = exc
    raise RuntimeError(f"无法读取 CSV 编码: {last_error}")


def load_xlsx(path: Path, sheet: str | None) -> list[dict[str, Any]]:
    try:
        import openpyxl
    except ImportError as exc:
        raise RuntimeError("读取 XLSX 需要 openpyxl。请改用 CSV，或在当前 Python 环境安装 openpyxl。") from exc

    workbook = openpyxl.load_workbook(path, data_only=True, read_only=True)
    worksheet = workbook[sheet] if sheet else workbook.active
    rows = list(worksheet.iter_rows(values_only=True))
    if not rows:
        return []
    headers = [str(cell or "").strip() for cell in rows[0]]
    records = []
    for row in rows[1:]:
        record = {headers[i]: row[i] if i < len(row) else None for i in range(len(headers))}
        if any(value not in (None, "") for value in record.values()):
            records.append(record)
    return records


def load_records(path: Path, sheet: str | None, encoding: str | None) -> list[dict[str, Any]]:
    suffix = path.suffix.lower()
    if suffix == ".csv":
        return load_csv(path, encoding)
    if suffix in {".xlsx", ".xlsm"}:
        return load_xlsx(path, sheet)
    raise RuntimeError("仅支持 .csv、.xlsx、.xlsm 文件")


def clean_records(records: list[dict[str, Any]], field_map: dict[str, str]) -> list[dict[str, Any]]:
    cleaned = []
    for row in records:
        item: dict[str, Any] = {}
        for canonical, source in field_map.items():
            value = row.get(source)
            if canonical in NUMERIC_FIELDS:
                value = parse_number(value)
            elif canonical == "publish_time":
                value = parse_datetime(value)
            elif canonical == "title":
                value = str(value or "").strip()
            item[canonical] = value
        if item.get("title") or any(item.get(field) is not None for field in NUMERIC_FIELDS):
            cleaned.append(item)
    return cleaned


def average(values: list[float]) -> float | None:
    valid = [value for value in values if value is not None]
    return statistics.mean(valid) if valid else None


def fmt_number(value: float | None, rate: bool = False) -> str:
    if value is None:
        return "-"
    if rate:
        return f"{value * 100:.1f}%"
    if abs(value) >= 10000:
        return f"{value / 10000:.1f}万"
    if float(value).is_integer():
        return str(int(value))
    return f"{value:.1f}"


def score_item(item: dict[str, Any]) -> float:
    weights = {
        "views": 1.0,
        "shares": 12.0,
        "favorites": 8.0,
        "likes": 4.0,
        "comments": 6.0,
    }
    score = 0.0
    for field, weight in weights.items():
        value = item.get(field)
        if value is not None:
            score += value * weight
    return score


def title_features(title: str) -> set[str]:
    features = set()
    if re.search(r"\d", title):
        features.add("数字型")
    if any(mark in title for mark in ["？", "?"]):
        features.add("提问型")
    if any(word in title for word in ["如何", "怎么", "方法", "指南", "清单"]):
        features.add("方法型")
    if any(word in title for word in ["为什么", "真相", "本质", "底层"]):
        features.add("解释型")
    if any(word in title for word in ["避坑", "别再", "不要", "警惕"]):
        features.add("避坑型")
    if any(word in title for word in ["普通人", "新手", "小白", "作者"]):
        features.add("人群型")
    if not features:
        features.add("常规型")
    return features


def extract_keywords(titles: list[str]) -> list[tuple[str, int]]:
    counter: Counter[str] = Counter()
    for title in titles:
        words = re.findall(r"[\u4e00-\u9fff]{2,6}|[A-Za-z][A-Za-z0-9+.#-]{1,}", title)
        for word in words:
            if word in STOPWORDS:
                continue
            if len(word) > 6 and re.fullmatch(r"[\u4e00-\u9fff]+", word):
                for i in range(0, len(word) - 1, 2):
                    piece = word[i : i + 4]
                    if len(piece) >= 2 and piece not in STOPWORDS:
                        counter[piece] += 1
            else:
                counter[word] += 1
    return counter.most_common(12)


def group_publish_time(items: list[dict[str, Any]], metric: str) -> tuple[list[tuple[str, float, int]], list[tuple[str, float, int]]]:
    weekdays: dict[str, list[float]] = defaultdict(list)
    hours: dict[str, list[float]] = defaultdict(list)
    names = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"]
    for item in items:
        published = item.get("publish_time")
        value = item.get(metric)
        if not published or value is None:
            continue
        weekdays[names[published.weekday()]].append(value)
        hours[f"{published.hour:02d}:00"].append(value)
    weekday_rank = sorted(((key, average(vals) or 0, len(vals)) for key, vals in weekdays.items()), key=lambda row: row[1], reverse=True)
    hour_rank = sorted(((key, average(vals) or 0, len(vals)) for key, vals in hours.items()), key=lambda row: row[1], reverse=True)
    return weekday_rank[:5], hour_rank[:5]


def markdown_table(headers: list[str], rows: list[list[str]]) -> str:
    lines = ["| " + " | ".join(headers) + " |", "| " + " | ".join(["---"] * len(headers)) + " |"]
    for row in rows:
        lines.append("| " + " | ".join(row) + " |")
    return "\n".join(lines)


def build_report(items: list[dict[str, Any]], field_map: dict[str, str], top_n: int) -> str:
    available_metrics = [
        field
        for field in ["views", "shares", "favorites", "likes", "comments", "open_rate", "click_rate", "completion_rate"]
        if any(item.get(field) is not None for item in items)
    ]
    primary_metric = "views" if "views" in available_metrics else (available_metrics[0] if available_metrics else None)

    lines = ["# 公众号数据分析报告", ""]
    lines.append(f"- 样本数：{len(items)} 篇")
    lines.append(f"- 识别字段：{', '.join(field_map.keys()) if field_map else '未识别'}")
    if not primary_metric:
        lines.append("- 未识别可分析的数值指标，请补充阅读量、分享、收藏、打开率等字段。")
        return "\n".join(lines) + "\n"

    lines.extend(["", "## 核心指标", ""])
    metric_rows = []
    for metric in available_metrics:
        values = [item.get(metric) for item in items if item.get(metric) is not None]
        is_rate = metric.endswith("_rate")
        metric_rows.append([metric, fmt_number(average(values), is_rate), fmt_number(max(values) if values else None, is_rate), str(len(values))])
    lines.append(markdown_table(["指标", "平均值", "最高值", "有效样本"], metric_rows))

    ranked = sorted(items, key=score_item, reverse=True)
    lines.extend(["", "## 高表现文章", ""])
    top_rows = []
    for item in ranked[:top_n]:
        top_rows.append(
            [
                item.get("title", "(无标题)")[:60],
                fmt_number(item.get("views")),
                fmt_number(item.get("shares")),
                fmt_number(item.get("favorites")),
                f"{score_item(item):.0f}",
            ]
        )
    lines.append(markdown_table(["标题", "阅读", "分享", "收藏", "综合分"], top_rows))

    lines.extend(["", "## 需要优化的文章", ""])
    low_rows = []
    metric_values = [item.get(primary_metric) for item in items if item.get(primary_metric) is not None]
    threshold = statistics.median(metric_values) if metric_values else 0
    low_items = [item for item in items if item.get(primary_metric) is not None and item.get(primary_metric) < threshold]
    for item in sorted(low_items, key=lambda row: row.get(primary_metric) or 0)[:top_n]:
        low_rows.append(
            [
                item.get("title", "(无标题)")[:60],
                fmt_number(item.get(primary_metric), primary_metric.endswith("_rate")),
                "优先检查标题承诺、开头进入速度和分发话术",
            ]
        )
    lines.append(markdown_table(["标题", primary_metric, "建议"], low_rows or [["-", "-", "样本不足"]]))

    lines.extend(["", "## 标题模式", ""])
    feature_values: dict[str, list[float]] = defaultdict(list)
    for item in items:
        title = item.get("title") or ""
        value = item.get(primary_metric)
        if value is None:
            continue
        for feature in title_features(title):
            feature_values[feature].append(value)
    feature_rows = []
    for feature, values in feature_values.items():
        feature_rows.append([feature, fmt_number(average(values), primary_metric.endswith("_rate")), str(len(values))])
    lines.append(markdown_table(["标题类型", f"平均 {primary_metric}", "样本数"], feature_rows))

    titles = [item.get("title", "") for item in ranked[: max(top_n, 10)] if item.get("title")]
    keywords = extract_keywords(titles)
    lines.extend(["", "## 高频主题词", ""])
    lines.append(", ".join([f"{word}({count})" for word, count in keywords]) if keywords else "样本不足")

    weekday_rank, hour_rank = group_publish_time(items, primary_metric)
    if weekday_rank or hour_rank:
        lines.extend(["", "## 发布时间倾向", ""])
        if weekday_rank:
            lines.append(markdown_table(["星期", f"平均 {primary_metric}", "样本数"], [[day, fmt_number(value, primary_metric.endswith("_rate")), str(count)] for day, value, count in weekday_rank]))
        if hour_rank:
            lines.append("")
            lines.append(markdown_table(["小时", f"平均 {primary_metric}", "样本数"], [[hour, fmt_number(value, primary_metric.endswith("_rate")), str(count)] for hour, value, count in hour_rank]))

    lines.extend(["", "## 内容动作建议", ""])
    lines.append("1. 把高表现文章拆成选题系列，优先复用其中的读者痛点和标题结构。")
    lines.append("2. 对低表现文章先改标题和开头，再判断是否需要重写正文。")
    lines.append("3. 收藏高但分享低的文章适合做工具包、清单或资料合集。")
    lines.append("4. 分享高的文章适合二次分发，提炼朋友圈和社群转发话术。")
    lines.append("5. 样本数少于 20 时，只把结果当作线索，不要当成稳定规律。")

    return "\n".join(lines) + "\n"


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description="Analyze WeChat official account article data.")
    parser.add_argument("file", help="CSV/XLSX data file")
    parser.add_argument("--sheet", help="XLSX sheet name")
    parser.add_argument("--encoding", help="CSV encoding, for example utf-8-sig or gb18030")
    parser.add_argument("--top", type=int, default=10, help="number of rows in top lists")
    parser.add_argument("--output", help="write Markdown report to this file")
    args = parser.parse_args(argv)

    path = Path(args.file)
    if not path.exists():
        print(f"文件不存在: {path}", file=sys.stderr)
        return 2

    try:
        raw_records = load_records(path, args.sheet, args.encoding)
        if not raw_records:
            raise RuntimeError("文件没有可分析的数据行")
        headers = list(raw_records[0].keys())
        field_map = build_field_map(headers)
        items = clean_records(raw_records, field_map)
        report = build_report(items, field_map, max(1, args.top))
    except Exception as exc:
        print(f"分析失败: {exc}", file=sys.stderr)
        return 1

    if args.output:
        Path(args.output).write_text(report, encoding="utf-8")
    else:
        print(report)
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))

