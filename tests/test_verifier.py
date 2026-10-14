from core.rag.verifier import CitationVerifier


def test_citation_verifier_supported_and_unsupported():
    citations = [
        {
            "index": 1,
            "source_title": "Quantum Computing.pdf",
            "page_number": 3,
            "snippet": "Superconducting qubits operate in dilution refrigerators at millikelvin temperatures.",
            "content": "Superconducting qubits operate in dilution refrigerators at millikelvin temperatures."
        },
        {
            "index": 2,
            "source_title": "Biology.txt",
            "page_number": 1,
            "snippet": "Photosynthesis converts light energy into chemical energy stored in glucose.",
            "content": "Photosynthesis converts light energy into chemical energy stored in glucose."
        }
    ]

    # Valid supported claim
    text_supported = "Qubits operate at millikelvin temperatures in dilution refrigerators [1]."
    res = CitationVerifier.verify(text_supported, citations)
    assert res["overall_status"] == "verified"
    assert res["citation_map"]["1"]["status"] == "verified"
    assert res["citation_map"]["1"]["score"] >= 0.5

    # Unsupported citation number [99]
    text_unsupported = "Some claim with imaginary source citation [99]."
    res_unsupported = CitationVerifier.verify(text_unsupported, citations)
    assert res_unsupported["citation_map"]["99"]["status"] == "unsupported"
    assert res_unsupported["citation_map"]["99"]["score"] == 0.0

    # Mixed claims
    mixed = "Superconducting qubits need dilution fridges [1]. Also extraterrestrial aliens exist [99]."
    res_mixed = CitationVerifier.verify(mixed, citations)
    assert "1" in res_mixed["citation_map"]
    assert "99" in res_mixed["citation_map"]
    assert res_mixed["citation_map"]["1"]["status"] in ["verified", "partial"]
    assert res_mixed["citation_map"]["99"]["status"] == "unsupported"
