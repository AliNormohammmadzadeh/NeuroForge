from fastapi.testclient import TestClient

from api.main import create_app
from api.search import reciprocal_rank_fusion


def test_rrf_prefers_items_ranked_by_both_lists() -> None:
    fused = reciprocal_rank_fusion([["a", "b", "c"], ["b", "c", "a"]], k=60)
    assert fused[0][0] == "b"


def test_health_models_and_home() -> None:
    client = TestClient(create_app())
    assert client.get("/healthz").json()["status"] == "ok"
    models = client.get("/api/v1/models").json()
    slugs = {item["slug"] for item in models}
    assert {"eeg-conformer", "tcn", "lfads", "brain-gnn"} <= slugs
    assert all(item["param_count"] > 0 for item in models)
    missing = client.get("/api/v1/models/nope")
    assert missing.status_code == 404
    hits = client.get("/api/v1/discover", params={"q": "spike"}).json()
    assert any(hit["slug"] == "lfads" for hit in hits)
    page = client.get("/")
    assert page.status_code == 200
    assert "EEG-Conformer" in page.text
    assert "cannot leak the subject" in page.text
