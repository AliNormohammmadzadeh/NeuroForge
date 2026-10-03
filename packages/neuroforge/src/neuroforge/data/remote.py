"""Anonymous streaming helpers for DANDI and OpenNeuro.

These functions are not called by the test suite. They need the ``remote``
extra (``dandi``, ``remfile``, ``s3fs``) and outbound network.
"""

from __future__ import annotations

from typing import Any


def open_dandi_nwb(dandiset_id: str, asset_path: str, version: str = "draft") -> object:
    """Open an NWB file by HTTP range requests. The asset is not fully downloaded."""
    import h5py
    import remfile
    from dandi.dandiapi import DandiAPIClient
    from pynwb import NWBHDF5IO

    with DandiAPIClient() as client:
        asset = client.get_dandiset(dandiset_id, version).get_asset_by_path(asset_path)
        url = asset.get_content_url(follow_redirects=1, strip_query=True)
    remote = remfile.File(url)
    hdf = h5py.File(remote, "r")
    return NWBHDF5IO(file=hdf, mode="r", load_namespaces=True)


def openneuro_fs() -> Any:
    """Return an anonymous S3 filesystem rooted at the OpenNeuro public bucket."""
    import s3fs

    return s3fs.S3FileSystem(anon=True)


def list_openneuro_dataset(dataset_id: str, limit: int = 50) -> list[str]:
    fs = openneuro_fs()
    prefix = f"openneuro.org/{dataset_id}"
    matches = fs.glob(f"{prefix}/**")
    return list(matches)[:limit]
