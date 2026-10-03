"""Stream one NWB asset from DANDI without downloading the whole file.

    uv run python examples/stream_dandi.py --dandiset 000128 --asset PATH/IN/DANDISET.nwb

This needs the remote extra: ``uv sync --all-packages --extra remote``.
"""

from __future__ import annotations

import argparse

from neuroforge.data.remote import open_dandi_nwb


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dandiset", required=True)
    parser.add_argument("--asset", required=True)
    parser.add_argument("--version", default="draft")
    args = parser.parse_args()
    handle = open_dandi_nwb(args.dandiset, args.asset, args.version)
    nwb = handle.read()
    print(f"Opened {args.dandiset} {args.asset}: {nwb.session_description}")
    handle.close()


if __name__ == "__main__":
    main()
