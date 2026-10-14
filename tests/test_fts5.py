from core.rag.fts5 import FTS5IndexManager


def test_fts5_indexing_and_bm25_search(db_session):
    # 1. Initialize FTS5 table
    FTS5IndexManager.init_fts5(db_session)

    # 2. Insert test chunks
    test_chunks = [
        {
            "id": "chk_quantum_1",
            "notebook_id": "nb_test_fts",
            "source_id": "src_physics",
            "content": "Quantum entanglement demonstrates non-local correlations between particles."
        },
        {
            "id": "chk_quantum_2",
            "notebook_id": "nb_test_fts",
            "source_id": "src_physics",
            "content": "Superconducting qubits require dilution refrigerators operating at millikelvin temperatures."
        },
        {
            "id": "chk_biology_1",
            "notebook_id": "nb_test_fts",
            "source_id": "src_biology",
            "content": "Mitochondria generate ATP through oxidative phosphorylation across inner cristae."
        },
        {
            "id": "chk_other_nb",
            "notebook_id": "nb_different",
            "source_id": "src_diff",
            "content": "Quantum algorithms like Shor's factor large integers in polynomial time."
        }
    ]
    FTS5IndexManager.sync_chunks_batch(db_session, test_chunks)

    # 3. Search for 'entanglement' scoped to 'nb_test_fts'
    results = FTS5IndexManager.search(
        db=db_session,
        query="entanglement",
        notebook_id="nb_test_fts"
    )
    assert len(results) >= 1
    assert results[0][0] == "chk_quantum_1"

    # 4. Search for 'qubits' - verify notebook isolation (should not return chk_other_nb)
    qubit_results = FTS5IndexManager.search(
        db=db_session,
        query="qubits",
        notebook_id="nb_test_fts"
    )
    assert len(qubit_results) == 1
    assert qubit_results[0][0] == "chk_quantum_2"

    # 5. Active source filter
    filtered = FTS5IndexManager.search(
        db=db_session,
        query="entanglement ATP",
        notebook_id="nb_test_fts",
        active_source_ids=["src_biology"]
    )
    assert len(filtered) == 1
    assert filtered[0][0] == "chk_biology_1"

    # 6. Delete source and verify
    FTS5IndexManager.delete_source_chunks(db_session, "src_biology")
    deleted_check = FTS5IndexManager.search(
        db=db_session,
        query="ATP",
        notebook_id="nb_test_fts"
    )
    assert len(deleted_check) == 0
