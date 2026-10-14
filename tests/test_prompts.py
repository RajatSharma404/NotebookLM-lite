import re

import pytest

from core.prompts import (
    GROUNDING_SYSTEM_TEMPLATE_V1,
    PODCAST_SCRIPT_PROMPT_V1,
    STUDIO_PROMPTS_V1,
)


@pytest.mark.eval
def test_grounding_prompt_structure():
    """Validates that grounding prompt v1 contains all invariant grounding rules."""
    prompt = GROUNDING_SYSTEM_TEMPLATE_V1
    assert "CORE GROUNDING RULES:" in prompt
    assert "[1]" in prompt
    assert "--- SOURCE CONTEXT BEGIN ---" in prompt
    assert "--- SOURCE CONTEXT END ---" in prompt
    assert "{context}" in prompt
    assert "Based on the provided sources, there is no information" in prompt

@pytest.mark.eval
def test_studio_prompts_structure():
    """Validates that all studio prompt types exist and maintain markdown structure."""
    expected_types = {"study_guide", "briefing_doc", "faq", "timeline"}
    assert set(STUDIO_PROMPTS_V1.keys()) == expected_types

    for p_type, template in STUDIO_PROMPTS_V1.items():
        assert len(template.strip()) > 100, f"Template for {p_type} is suspiciously short!"
        assert "# " in template, f"Template for {p_type} missing H1 header markdown!"

@pytest.mark.eval
def test_podcast_prompt_structure():
    """Validates that podcast prompt v1 enforces strict JSON schema and dual host personas."""
    prompt = PODCAST_SCRIPT_PROMPT_V1
    assert "Alex" in prompt
    assert "Morgan" in prompt
    assert "en-US-GuyNeural" in prompt
    assert "en-US-JennyNeural" in prompt
    assert '"speaker":' in prompt
    assert '"voice_id":' in prompt
    assert '"text":' in prompt

@pytest.mark.eval
def test_prompt_semantic_drift_invariants():
    """
    Enforces negative constraints to prevent prompt drift:
    - Never allow model to use external knowledge
    - Enforce bracket format [n]
    """
    grounding = GROUNDING_SYSTEM_TEMPLATE_V1
    assert "NEVER invent facts" in grounding
    # Verify bracket citation regex match
    bracket_pattern = re.compile(r'\[1\]')
    assert bracket_pattern.search(grounding) is not None
