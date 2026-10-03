from neuroforge.training.cli import main
from neuroforge.training.leakage_demo import run_leakage_demo


def test_window_split_looks_solved_and_subject_split_does_not() -> None:
    report = run_leakage_demo()
    assert report["leaky_shared_subjects"] == 8
    assert report["safe_shared_subjects"] == 0
    assert report["leaky_accuracy"] >= 0.95
    assert report["safe_accuracy"] <= 0.6
    assert report["leaky_accuracy"] - report["safe_accuracy"] >= 0.3
    assert run_leakage_demo() == report


def test_demo_command_prints_both_scores(capsys) -> None:
    main(["demo"])
    out = capsys.readouterr().out
    assert "scores 1.00" in out
    assert "scores 0.50" in out
    assert "memorized the person" in out
