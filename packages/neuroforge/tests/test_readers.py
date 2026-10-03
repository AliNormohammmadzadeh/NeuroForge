from datetime import UTC, datetime
from uuid import uuid4

import mne
import numpy as np
import pytest
from mne_bids import BIDSPath, write_raw_bids
from pynwb import NWBHDF5IO, NWBFile
from pynwb.ecephys import ElectricalSeries

from neuroforge.data.readers import BIDSReader, NWBReader, recording_from_mne
from neuroforge.data.types import RecordingKey


def test_mne_raw_becomes_volts() -> None:
    data = np.ones((2, 50), dtype=np.float64) * 1e-6
    info = mne.create_info(["C3", "C4"], 100.0, ch_types="eeg")
    raw = mne.io.RawArray(data, info, verbose=False)
    raw.info["bads"] = ["C4"]
    recording = recording_from_mne(raw, RecordingKey("toy", "sub-01"))
    recording.validate()
    assert recording.units == "V"
    assert recording.bad_channels == ["C4"]
    assert np.allclose(recording.data, data)


def test_bids_roundtrip(tmp_path) -> None:
    data = np.random.default_rng(0).normal(size=(2, 200)) * 1e-6
    info = mne.create_info(["C3", "C4"], 100.0, ch_types="eeg")
    raw = mne.io.RawArray(data, info, verbose=False)
    raw.set_annotations(mne.Annotations([0.2], [0.1], ["left"]))
    bids_path = BIDSPath(subject="01", task="mi", datatype="eeg", root=tmp_path, extension=".vhdr")
    write_raw_bids(
        raw,
        bids_path,
        overwrite=True,
        format="BrainVision",
        allow_preload=True,
        verbose=False,
    )
    recordings = BIDSReader(tmp_path).recordings()
    assert len(recordings) == 1
    assert recordings[0].key.subject_id == "01"
    recordings[0].validate()


def test_nwb_electrical_and_units(tmp_path) -> None:
    start = datetime.now(UTC)
    nwb = NWBFile(session_description="tiny", identifier=str(uuid4()), session_start_time=start)
    device = nwb.create_device("probe")
    group = nwb.create_electrode_group("shank", description="d", location="cortex", device=device)
    for i in range(2):
        nwb.add_electrode(
            id=i, x=0.0, y=0.0, z=0.0, imp=np.nan, location="cortex", filtering="none", group=group
        )
    region = nwb.create_electrode_table_region([0, 1], "all")
    series = ElectricalSeries(
        name="ElectricalSeries",
        data=np.ones((20, 2), dtype=np.float32) * 1e-5,
        electrodes=region,
        rate=100.0,
        conversion=1.0,
    )
    nwb.add_acquisition(series)
    nwb.add_unit(spike_times=[0.01, 0.02])
    nwb.add_trial(start_time=0.0, stop_time=0.1)
    path = tmp_path / "tiny.nwb"
    with NWBHDF5IO(path, "w") as io:
        io.write(nwb)

    key = RecordingKey("dandi-fixture", "sub-01")
    reader = NWBReader(path)
    continuous = reader.continuous(key)
    spikes = reader.spikes(key)
    assert len(continuous) == 1
    assert continuous[0].data.shape == (2, 20)
    assert continuous[0].ch_names == ["ch0", "ch1"]
    assert spikes is not None
    assert len(spikes.spike_times) == 1
    assert spikes.trials is not None and spikes.trials.shape == (1, 2)


def test_to_volts_rejects_unknown_unit() -> None:
    from neuroforge.data.readers import _to_volts

    with pytest.raises(ValueError):
        _to_volts(np.ones(3), "furlongs")
