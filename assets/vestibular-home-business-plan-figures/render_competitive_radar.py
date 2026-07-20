from __future__ import annotations

import csv
import math
import sys
from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np
from PIL import Image


ROOT = Path(__file__).resolve().parents[2]
SKILL_SCRIPTS = ROOT / ".agents/skills/scipilot-figure-skill/scripts"
sys.path.insert(0, str(SKILL_SCRIPTS))

from setup_style import setup_style  # noqa: E402
from visual_qa import audit_layout, print_report, render_preview  # noqa: E402


HERE = Path(__file__).resolve().parent
TMP_DIR = ROOT / ".tmp/figures/vestibular-home-business-plan"
CSV_PATH = HERE / "competitive-positioning-six-dimensions.csv"
OUT_BASE = HERE / "competitive-positioning-six-dimensions"

FIELDS = [
    "clinical_depth",
    "home_accessibility",
    "continuous_monitoring",
    "rehab_continuity",
    "physician_workflow",
    "affordability",
]
LABELS = [
    "临床检测深度",
    "居家可及性",
    "连续监测能力",
    "康复连续性",
    "医生工作流",
    "可负担性",
]


def load_rows() -> list[dict[str, str]]:
    with CSV_PATH.open(encoding="utf-8") as handle:
        return list(csv.DictReader(handle))


def main() -> None:
    TMP_DIR.mkdir(parents=True, exist_ok=True)
    setup_style(journal="general", lang="zh")
    plt.rcParams.update(
        {
            "font.size": 9,
            "axes.titlesize": 14,
            "axes.titleweight": "bold",
            "svg.fonttype": "none",
            "pdf.fonttype": 42,
        }
    )

    rows = load_rows()
    angles = np.linspace(0, 2 * math.pi, len(FIELDS), endpoint=False).tolist()
    closed_angles = angles + angles[:1]

    styles = {
        "专业前庭实验室": dict(color="#6B7280", marker="s", linestyle="--", linewidth=1.8),
        "院内康复设备": dict(color="#D55E00", marker="^", linestyle=":", linewidth=1.8),
        "通用居家康复": dict(color="#999999", marker="D", linestyle="-.", linewidth=1.8),
        "本项目": dict(color="#0072B2", marker="o", linestyle="-", linewidth=3.0),
    }

    fig, ax = plt.subplots(figsize=(7.2, 5.6), subplot_kw={"polar": True})
    fig.set_layout_engine(None)
    ax.set_position([0.14, 0.23, 0.72, 0.60])
    ax.set_theta_offset(math.pi / 2)
    ax.set_theta_direction(-1)
    ax.set_xticks(angles)
    ax.set_xticklabels(LABELS, fontsize=9.5, fontweight="medium")
    ax.tick_params(axis="x", pad=12)
    ax.set_ylim(0, 5)
    ax.set_yticks([1, 2, 3, 4, 5])
    ax.set_yticklabels(["1", "2", "3", "4", "5"], fontsize=7, color="#6B7280")
    ax.set_rlabel_position(10)
    ax.grid(color="#CBD5E1", linewidth=0.75, alpha=0.85)
    ax.spines["polar"].set_color("#94A3B8")
    ax.spines["polar"].set_linewidth(0.9)

    for row in rows:
        name = row["product"]
        values = [float(row[field]) for field in FIELDS]
        closed_values = values + values[:1]
        style = styles[name]
        ax.plot(
            closed_angles,
            closed_values,
            label=name,
            color=style["color"],
            marker=style["marker"],
            markersize=5.5,
            markerfacecolor="white" if name != "本项目" else style["color"],
            markeredgewidth=1.1,
            linestyle=style["linestyle"],
            linewidth=style["linewidth"],
            zorder=5 if name == "本项目" else 3,
        )
        if name == "本项目":
            ax.fill(closed_angles, closed_values, color=style["color"], alpha=0.13, zorder=2)

    fig.suptitle("六维产品定位比较", y=0.985)
    fig.text(
        0.5,
        0.945,
        "重点能力：居家连续管理、康复疗程与医生复核",
        ha="center",
        va="top",
        fontsize=9.2,
        color="#475569",
    )
    legend = ax.legend(
        loc="lower center",
        bbox_to_anchor=(0.5, -0.28),
        ncol=4,
        frameon=False,
        fontsize=8.2,
        handlelength=2.6,
        columnspacing=1.7,
    )
    for text in legend.get_texts():
        if text.get_text() == "本项目":
            text.set_fontweight("bold")
            text.set_color("#0072B2")

    fig.text(
        0.5,
        0.018,
        "相对评分：1 = 较弱，5 = 较强。评分基于当前产品定位与公开产品能力的启发式比较，并非第三方实测。",
        ha="center",
        va="bottom",
        fontsize=7.3,
        color="#64748B",
    )
    preview = TMP_DIR / "competitive-positioning-six-dimensions-preview.png"
    render_preview(fig, str(preview), dpi=150)
    print_report(audit_layout(fig))

    fig.savefig(OUT_BASE.with_suffix(".png"), dpi=320, bbox_inches="tight", facecolor="white")
    fig.savefig(OUT_BASE.with_suffix(".svg"), bbox_inches="tight", facecolor="white")
    fig.savefig(
        TMP_DIR / "competitive-positioning-six-dimensions.pdf",
        bbox_inches="tight",
        facecolor="white",
    )
    plt.close(fig)

    with Image.open(OUT_BASE.with_suffix(".png")) as image:
        image.convert("L").save(TMP_DIR / "competitive-positioning-six-dimensions-grayscale.png")


if __name__ == "__main__":
    main()
