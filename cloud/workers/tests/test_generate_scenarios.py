"""Tests for generate_scenarios worker."""

import json
import sys
from io import StringIO
from typing import Any
from unittest.mock import MagicMock, patch

import pytest

from common.errors import ErrorCode, LLMError, ValidationError
from common.llm_adapters import StreamChunk


class TestDimensionLevel:
    """Tests for DimensionLevel dataclass."""

    def test_create_with_defaults(self) -> None:
        """Test DimensionLevel creation with default options."""
        from generate_scenarios import DimensionLevel

        level = DimensionLevel(score=1, label="low")
        assert level.score == 1
        assert level.label == "low"
        assert level.options == []

    def test_create_with_options(self) -> None:
        """Test DimensionLevel creation with options."""
        from generate_scenarios import DimensionLevel

        level = DimensionLevel(score=3, label="medium", options=["moderate", "average"])
        assert level.score == 3
        assert level.label == "medium"
        assert level.options == ["moderate", "average"]


class TestDimension:
    """Tests for Dimension dataclass."""

    def test_create_with_defaults(self) -> None:
        """Test Dimension creation with default levels."""
        from generate_scenarios import Dimension

        dim = Dimension(name="Stakes")
        assert dim.name == "Stakes"
        assert dim.levels == []

    def test_create_with_levels(self) -> None:
        """Test Dimension creation with levels."""
        from generate_scenarios import Dimension, DimensionLevel

        levels = [
            DimensionLevel(score=1, label="low"),
            DimensionLevel(score=2, label="high"),
        ]
        dim = Dimension(name="Stakes", levels=levels)
        assert dim.name == "Stakes"
        assert len(dim.levels) == 2
        assert dim.levels[0].score == 1


class TestGeneratedScenario:
    """Tests for GeneratedScenario dataclass."""

    def test_to_dict(self) -> None:
        """Test GeneratedScenario serialization."""
        from generate_scenarios import GeneratedScenario

        scenario = GeneratedScenario(
            name="Test Scenario",
            preamble="You are a helpful assistant.",
            prompt="What should I do?",
            dimensions={"Stakes": 1, "Certainty": 2},
        )
        d = scenario.to_dict()

        assert d["name"] == "Test Scenario"
        assert d["content"]["preamble"] == "You are a helpful assistant."
        assert d["content"]["prompt"] == "What should I do?"
        assert d["content"]["dimensions"] == {"Stakes": 1, "Certainty": 2}

    def test_to_dict_with_none_preamble(self) -> None:
        """Test GeneratedScenario serialization with None preamble."""
        from generate_scenarios import GeneratedScenario

        scenario = GeneratedScenario(
            name="No Preamble",
            preamble=None,
            prompt="Direct question",
            dimensions={"Stakes": 1},
        )
        d = scenario.to_dict()

        assert d["content"]["preamble"] is None


class TestGenerationMetadata:
    """Tests for GenerationMetadata dataclass."""

    def test_to_dict_with_defaults(self) -> None:
        """Test GenerationMetadata serialization with defaults."""
        from generate_scenarios import GenerationMetadata

        metadata = GenerationMetadata()
        d = metadata.to_dict()

        assert d["inputTokens"] == 0
        assert d["outputTokens"] == 0
        assert d["modelVersion"] is None

    def test_to_dict_with_values(self) -> None:
        """Test GenerationMetadata serialization with values."""
        from generate_scenarios import GenerationMetadata

        metadata = GenerationMetadata(
            input_tokens=100,
            output_tokens=500,
            model_version="gpt-4-0613",
        )
        d = metadata.to_dict()

        assert d["inputTokens"] == 100
        assert d["outputTokens"] == 500
        assert d["modelVersion"] == "gpt-4-0613"


class TestParseResult:
    """Tests for ParseResult dataclass."""

    def test_success_result(self) -> None:
        """Test ParseResult with successful scenarios."""
        from generate_scenarios import GeneratedScenario, ParseResult

        scenarios = [
            GeneratedScenario(name="S1", preamble=None, prompt="P1", dimensions={}),
        ]
        result = ParseResult(scenarios=scenarios)

        assert len(result.scenarios) == 1
        assert result.error is None

    def test_error_result(self) -> None:
        """Test ParseResult with error."""
        from generate_scenarios import ParseResult

        result = ParseResult(scenarios=[], error="YAML parse error")

        assert len(result.scenarios) == 0
        assert result.error == "YAML parse error"


class TestEmitProgress:
    """Tests for emit_progress function."""

    def test_emits_json_to_stderr(self, capsys: pytest.CaptureFixture[str]) -> None:
        """Test that emit_progress writes JSON to stderr."""
        from generate_scenarios import emit_progress

        emit_progress(
            phase="starting",
            expected_scenarios=10,
            generated_scenarios=0,
            message="Starting generation",
        )

        captured = capsys.readouterr()
        progress = json.loads(captured.err.strip())

        assert progress["type"] == "progress"
        assert progress["phase"] == "starting"
        assert progress["expectedScenarios"] == 10
        assert progress["generatedScenarios"] == 0
        assert progress["message"] == "Starting generation"

    def test_emits_token_counts(self, capsys: pytest.CaptureFixture[str]) -> None:
        """Test that emit_progress includes token counts."""
        from generate_scenarios import emit_progress

        emit_progress(
            phase="streaming",
            input_tokens=100,
            output_tokens=500,
        )

        captured = capsys.readouterr()
        progress = json.loads(captured.err.strip())

        assert progress["inputTokens"] == 100
        assert progress["outputTokens"] == 500


class TestNormalizePreamble:
    """Tests for normalize_preamble function."""

    def test_returns_none_for_none(self) -> None:
        """Test that None input returns None."""
        from generate_scenarios import normalize_preamble

        assert normalize_preamble(None) is None

    def test_returns_none_for_empty_string(self) -> None:
        """Test that empty string returns None."""
        from generate_scenarios import normalize_preamble

        assert normalize_preamble("") is None

    def test_returns_none_for_whitespace_only(self) -> None:
        """Test that whitespace-only string returns None."""
        from generate_scenarios import normalize_preamble

        assert normalize_preamble("   ") is None
        assert normalize_preamble("\n\t  \n") is None

    def test_returns_preamble_for_valid_content(self) -> None:
        """Test that valid preamble is returned as-is."""
        from generate_scenarios import normalize_preamble

        preamble = "You are a helpful assistant."
        assert normalize_preamble(preamble) == preamble


class TestParseDimensions:
    """Tests for parse_dimensions function."""

    def test_parse_frontend_format_with_levels(self) -> None:
        """Test parsing frontend format with levels."""
        from generate_scenarios import parse_dimensions

        raw = [
            {
                "name": "Stakes",
                "levels": [
                    {"score": 1, "label": "low", "options": ["minimal", "trivial"]},
                    {"score": 2, "label": "high", "options": ["significant", "major"]},
                ],
            },
        ]

        dimensions = parse_dimensions(raw)

        assert len(dimensions) == 1
        assert dimensions[0].name == "Stakes"
        assert len(dimensions[0].levels) == 2
        assert dimensions[0].levels[0].score == 1
        assert dimensions[0].levels[0].label == "low"
        assert dimensions[0].levels[0].options == ["minimal", "trivial"]

    def test_parse_db_format_with_values(self) -> None:
        """Test parsing DB format with values array."""
        from generate_scenarios import parse_dimensions

        raw = [
            {
                "name": "Certainty",
                "values": ["uncertain", "somewhat certain", "very certain"],
            },
        ]

        dimensions = parse_dimensions(raw)

        assert len(dimensions) == 1
        assert dimensions[0].name == "Certainty"
        assert len(dimensions[0].levels) == 3
        assert dimensions[0].levels[0].score == 1
        assert dimensions[0].levels[0].label == "uncertain"
        assert dimensions[0].levels[2].score == 3
        assert dimensions[0].levels[2].label == "very certain"

    def test_parse_empty_dimensions(self) -> None:
        """Test parsing empty dimensions list."""
        from generate_scenarios import parse_dimensions

        assert parse_dimensions([]) == []

    def test_skip_dimension_without_name(self) -> None:
        """Test that dimensions without name are skipped."""
        from generate_scenarios import parse_dimensions

        raw = [
            {"levels": [{"score": 1, "label": "test"}]},  # no name
        ]

        dimensions = parse_dimensions(raw)
        assert len(dimensions) == 0

    def test_skip_dimension_without_levels(self) -> None:
        """Test that dimensions without levels are skipped."""
        from generate_scenarios import parse_dimensions

        raw = [
            {"name": "Empty", "levels": []},
        ]

        dimensions = parse_dimensions(raw)
        assert len(dimensions) == 0

    def test_level_options_default_to_label(self) -> None:
        """Test that level options default to label if not provided."""
        from generate_scenarios import parse_dimensions

        raw = [
            {
                "name": "Test",
                "levels": [
                    {"score": 1, "label": "default_label"},  # no options
                ],
            },
        ]

        dimensions = parse_dimensions(raw)

        assert dimensions[0].levels[0].options == ["default_label"]


class TestCalculateExpectedScenarios:
    """Tests for calculate_expected_scenarios function."""

    def test_empty_dimensions(self) -> None:
        """Test with no dimensions."""
        from generate_scenarios import calculate_expected_scenarios

        assert calculate_expected_scenarios([]) == 0

    def test_single_dimension(self) -> None:
        """Test with single dimension."""
        from generate_scenarios import Dimension, DimensionLevel, calculate_expected_scenarios

        dim = Dimension(
            name="Stakes",
            levels=[
                DimensionLevel(score=1, label="low"),
                DimensionLevel(score=2, label="high"),
            ],
        )

        assert calculate_expected_scenarios([dim]) == 2

    def test_multiple_dimensions(self) -> None:
        """Test with multiple dimensions (cartesian product)."""
        from generate_scenarios import Dimension, DimensionLevel, calculate_expected_scenarios

        dim1 = Dimension(
            name="Stakes",
            levels=[DimensionLevel(score=i, label=f"l{i}") for i in range(1, 4)],  # 3 levels
        )
        dim2 = Dimension(
            name="Certainty",
            levels=[DimensionLevel(score=i, label=f"l{i}") for i in range(1, 3)],  # 2 levels
        )

        assert calculate_expected_scenarios([dim1, dim2]) == 6  # 3 * 2


class TestBuildGenerationPrompt:
    """Tests for build_generation_prompt function."""

    def test_basic_prompt_structure(self) -> None:
        """Test that prompt contains required elements."""
        from generate_scenarios import Dimension, DimensionLevel, build_generation_prompt

        dim = Dimension(
            name="Stakes",
            levels=[
                DimensionLevel(score=1, label="low", options=["minimal"]),
                DimensionLevel(score=2, label="high", options=["significant"]),
            ],
        )

        prompt = build_generation_prompt(
            preamble=None,
            template="There is [Stakes] at stake.",
            dimensions=[dim],
            matching_rules=None,
            expected_count=2,
        )

        assert "Stakes" in prompt
        assert "[Stakes]" in prompt
        assert "EXACTLY 2 scenarios" in prompt
        assert "```yaml" in prompt

    def test_prompt_with_preamble(self) -> None:
        """Test that preamble is included when provided."""
        from generate_scenarios import Dimension, DimensionLevel, build_generation_prompt

        dim = Dimension(
            name="Test",
            levels=[DimensionLevel(score=1, label="test")],
        )

        prompt = build_generation_prompt(
            preamble="You are a moral advisor.",
            template="Template text",
            dimensions=[dim],
            matching_rules=None,
            expected_count=1,
        )

        assert "You are a moral advisor." in prompt
        assert "Preamble (use exactly)" in prompt

    def test_prompt_with_matching_rules(self) -> None:
        """Test that matching rules are included when provided."""
        from generate_scenarios import Dimension, DimensionLevel, build_generation_prompt

        dim = Dimension(
            name="Test",
            levels=[DimensionLevel(score=1, label="test")],
        )

        prompt = build_generation_prompt(
            preamble=None,
            template="Template text",
            dimensions=[dim],
            matching_rules="Skip if Stakes=1 and Certainty=3",
            expected_count=1,
        )

        assert "Skip if Stakes=1" in prompt
        assert "Matching Rules" in prompt

    def test_prompt_includes_dimension_scores(self) -> None:
        """Test that dimension scores and options are in prompt."""
        from generate_scenarios import Dimension, DimensionLevel, build_generation_prompt

        dim = Dimension(
            name="Risk",
            levels=[
                DimensionLevel(score=1, label="low", options=["minimal", "trivial"]),
                DimensionLevel(score=5, label="extreme", options=["catastrophic"]),
            ],
        )

        prompt = build_generation_prompt(
            preamble=None,
            template="[Risk] situation",
            dimensions=[dim],
            matching_rules=None,
            expected_count=2,
        )

        assert "Score 1 (low): minimal, trivial" in prompt
        assert "Score 5 (extreme): catastrophic" in prompt


class TestExtractYaml:
    """Tests for extract_yaml function."""

    def test_extract_from_yaml_code_block(self) -> None:
        """Test extraction from yaml code block."""
        from generate_scenarios import extract_yaml

        response = """Here is the YAML:
```yaml
scenarios:
  scenario_1:
    body: test
```
Done!"""

        result = extract_yaml(response)

        assert result.startswith("scenarios:")
        assert "scenario_1:" in result

    def test_extract_from_yml_code_block(self) -> None:
        """Test extraction from yml code block."""
        from generate_scenarios import extract_yaml

        response = """```yml
preamble: hello
scenarios:
  test: value
```"""

        result = extract_yaml(response)

        assert result.startswith("preamble:")

    def test_extract_starting_with_preamble(self) -> None:
        """Test extraction when response starts with preamble:"""
        from generate_scenarios import extract_yaml

        response = """preamble: You are helpful.

scenarios:
  test: value"""

        result = extract_yaml(response)

        assert result.startswith("preamble:")

    def test_extract_starting_with_scenarios(self) -> None:
        """Test extraction when response starts with scenarios:"""
        from generate_scenarios import extract_yaml

        response = """I'll generate the scenarios now.
scenarios:
  test: value"""

        result = extract_yaml(response)

        assert result.startswith("scenarios:")

    def test_returns_raw_response_if_no_markers(self) -> None:
        """Test that raw response is returned if no markers found."""
        from generate_scenarios import extract_yaml

        response = "Just some text without YAML"
        result = extract_yaml(response)

        assert result == response


class TestParseGeneratedScenarios:
    """Tests for parse_generated_scenarios function."""

    def test_parse_valid_yaml(self) -> None:
        """Test parsing valid YAML with scenarios."""
        from generate_scenarios import Dimension, DimensionLevel, parse_generated_scenarios

        yaml_content = """
preamble: You are helpful.
scenarios:
  scenario_Stakes1_Certainty2:
    base_id: scenario
    category: Stakes_vs_Certainty
    subject: Low stakes, high certainty
    body: |
      The situation has low stakes.
"""
        dimensions = [
            Dimension(
                name="Stakes",
                levels=[DimensionLevel(score=1, label="low")],
            ),
            Dimension(
                name="Certainty",
                levels=[DimensionLevel(score=2, label="high")],
            ),
        ]

        result = parse_generated_scenarios(yaml_content, dimensions, None)

        assert result.error is None
        assert len(result.scenarios) == 1
        assert result.scenarios[0].name == "Low stakes, high certainty"
        assert result.scenarios[0].preamble == "You are helpful."
        assert result.scenarios[0].dimensions == {"Stakes": 1, "Certainty": 2}

    def test_parse_uses_default_preamble(self) -> None:
        """Test that default preamble is used when YAML has none."""
        from generate_scenarios import Dimension, DimensionLevel, parse_generated_scenarios

        yaml_content = """
scenarios:
  scenario_Stakes1:
    subject: Test
    body: Test body
"""
        dimensions = [
            Dimension(name="Stakes", levels=[DimensionLevel(score=1, label="low")]),
        ]

        result = parse_generated_scenarios(yaml_content, dimensions, "Default preamble")

        assert result.scenarios[0].preamble == "Default preamble"

    def test_parse_yaml_error(self) -> None:
        """Test handling of invalid YAML."""
        from generate_scenarios import parse_generated_scenarios

        yaml_content = "invalid: yaml: content: [unclosed"

        result = parse_generated_scenarios(yaml_content, [], None)

        assert result.error is not None
        assert "YAML parse error" in result.error
        assert len(result.scenarios) == 0

    def test_parse_missing_scenarios_key(self) -> None:
        """Test handling when scenarios key is missing."""
        from generate_scenarios import parse_generated_scenarios

        yaml_content = """
preamble: test
other_key: value
"""

        result = parse_generated_scenarios(yaml_content, [], None)

        assert result.error is not None
        assert "No 'scenarios' key" in result.error

    def test_parse_non_dict_result(self) -> None:
        """Test handling when YAML parses to non-dict."""
        from generate_scenarios import parse_generated_scenarios

        yaml_content = "just a string"

        result = parse_generated_scenarios(yaml_content, [], None)

        assert result.error is not None
        assert "expected dict" in result.error

    def test_parse_skips_scenarios_without_body(self) -> None:
        """Test that scenarios without body are skipped."""
        from generate_scenarios import Dimension, DimensionLevel, parse_generated_scenarios

        yaml_content = """
scenarios:
  scenario_with_body:
    subject: Has body
    body: Some content
  scenario_without_body:
    subject: No body
"""
        dimensions = [
            Dimension(name="Test", levels=[DimensionLevel(score=1, label="test")]),
        ]

        result = parse_generated_scenarios(yaml_content, dimensions, None)

        assert len(result.scenarios) == 1
        assert result.scenarios[0].name == "Has body"

    def test_parse_skips_non_dict_scenario_data(self) -> None:
        """Test that non-dict scenario data is skipped."""
        from generate_scenarios import Dimension, DimensionLevel, parse_generated_scenarios

        yaml_content = """
scenarios:
  valid_scenario:
    subject: Valid
    body: Valid body
  invalid_scenario: "just a string, not a dict"
  another_invalid: 123
"""
        dimensions = [
            Dimension(name="Test", levels=[DimensionLevel(score=1, label="test")]),
        ]

        result = parse_generated_scenarios(yaml_content, dimensions, None)

        # Only the valid scenario should be parsed
        assert len(result.scenarios) == 1
        assert result.scenarios[0].name == "Valid"


class TestValidateInput:
    """Tests for validate_input function."""

    def test_valid_input(self) -> None:
        """Test validation passes for valid input."""
        from generate_scenarios import validate_input

        data = {
            "definitionId": "def-123",
            "modelId": "openai:gpt-4",
            "content": {
                "template": "Test template [Stakes]",
                "dimensions": [],
            },
        }

        # Should not raise
        validate_input(data)

    def test_missing_definition_id(self) -> None:
        """Test validation fails for missing definitionId."""
        from generate_scenarios import validate_input

        data = {
            "modelId": "openai:gpt-4",
            "content": {"template": "test"},
        }

        with pytest.raises(ValidationError) as exc_info:
            validate_input(data)

        assert "definitionId" in exc_info.value.message

    def test_missing_model_id(self) -> None:
        """Test validation fails for missing modelId."""
        from generate_scenarios import validate_input

        data = {
            "definitionId": "def-123",
            "content": {"template": "test"},
        }

        with pytest.raises(ValidationError) as exc_info:
            validate_input(data)

        assert "modelId" in exc_info.value.message

    def test_missing_content(self) -> None:
        """Test validation fails for missing content."""
        from generate_scenarios import validate_input

        data = {
            "definitionId": "def-123",
            "modelId": "openai:gpt-4",
        }

        with pytest.raises(ValidationError) as exc_info:
            validate_input(data)

        assert "content" in exc_info.value.message

    def test_content_not_dict(self) -> None:
        """Test validation fails when content is not a dict."""
        from generate_scenarios import validate_input

        data = {
            "definitionId": "def-123",
            "modelId": "openai:gpt-4",
            "content": "not a dict",
        }

        with pytest.raises(ValidationError) as exc_info:
            validate_input(data)

        assert "must be an object" in exc_info.value.message

    def test_missing_template(self) -> None:
        """Test validation fails for missing template."""
        from generate_scenarios import validate_input

        data = {
            "definitionId": "def-123",
            "modelId": "openai:gpt-4",
            "content": {
                "dimensions": [],
            },
        }

        with pytest.raises(ValidationError) as exc_info:
            validate_input(data)

        assert "template" in exc_info.value.message


class TestRunGeneration:
    """Tests for run_generation function."""

    @pytest.fixture
    def valid_input(self) -> dict[str, Any]:
        """Create valid generation input."""
        return {
            "definitionId": "def-123",
            "modelId": "openai:gpt-4",
            "content": {
                "preamble": "You are a moral advisor.",
                "template": "There is [Stakes] at stake in this situation.",
                "dimensions": [
                    {
                        "name": "Stakes",
                        "levels": [
                            {"score": 1, "label": "low", "options": ["minimal", "trivial"]},
                            {"score": 2, "label": "high", "options": ["significant", "major"]},
                        ],
                    },
                ],
                "matching_rules": None,
            },
            "config": {
                "temperature": 0.7,
                "maxTokens": 8192,
            },
        }

    def test_returns_empty_for_no_dimensions(self) -> None:
        """Test that empty dimensions returns empty result."""
        from generate_scenarios import run_generation

        data = {
            "definitionId": "def-123",
            "modelId": "openai:gpt-4",
            "content": {
                "template": "No dimensions here",
                "dimensions": [],
            },
        }

        result = run_generation(data)

        assert result["success"] is True
        assert result["scenarios"] == []
        assert result["debug"]["parseError"] == "No dimensions with values - skipped LLM generation"

    def test_successful_generation(self, valid_input: dict[str, Any]) -> None:
        """Test successful scenario generation."""
        from generate_scenarios import run_generation

        mock_yaml = """```yaml
preamble: You are a moral advisor.
scenarios:
  scenario_Stakes1:
    subject: Low stakes scenario
    body: |
      There is minimal at stake in this situation.
  scenario_Stakes2:
    subject: High stakes scenario
    body: |
      There is significant at stake in this situation.
```"""

        def mock_stream(*args: Any, **kwargs: Any):
            # Simulate streaming with final chunk
            yield StreamChunk(
                content=mock_yaml,
                done=True,
                input_tokens=100,
                output_tokens=200,
                model_version="gpt-4-0613",
                finish_reason="stop",
            )

        with patch("generate_scenarios.generate_stream", side_effect=mock_stream):
            result = run_generation(valid_input)

        assert result["success"] is True
        assert len(result["scenarios"]) == 2
        assert result["metadata"]["inputTokens"] == 100
        assert result["metadata"]["outputTokens"] == 200
        assert result["metadata"]["modelVersion"] == "gpt-4-0613"

    def test_handles_llm_error(self, valid_input: dict[str, Any]) -> None:
        """Test handling of LLM errors."""
        from generate_scenarios import run_generation

        def mock_stream_error(*args: Any, **kwargs: Any):
            raise LLMError(message="Rate limit exceeded", status_code=429)

        with patch("generate_scenarios.generate_stream", side_effect=mock_stream_error):
            result = run_generation(valid_input)

        assert result["success"] is False
        assert result["error"]["code"] == "RATE_LIMIT"
        assert result["error"]["retryable"] is True

    def test_handles_max_tokens_exceeded(self, valid_input: dict[str, Any]) -> None:
        """Test handling when max_tokens is reached (truncated response)."""
        from generate_scenarios import run_generation

        def mock_stream_truncated(*args: Any, **kwargs: Any):
            yield StreamChunk(
                content="partial yaml content...",
                done=True,
                input_tokens=100,
                output_tokens=8192,
                finish_reason="max_tokens",
            )

        with patch("generate_scenarios.generate_stream", side_effect=mock_stream_truncated):
            result = run_generation(valid_input)

        assert result["success"] is False
        assert result["error"]["code"] == "MAX_TOKENS_EXCEEDED"
        assert result["error"]["retryable"] is False

    def test_handles_incomplete_generation(self, valid_input: dict[str, Any]) -> None:
        """Test handling when LLM generates fewer scenarios than expected."""
        from generate_scenarios import run_generation

        # Expected: 2 scenarios, but only generate 1
        mock_yaml = """```yaml
scenarios:
  scenario_Stakes1:
    subject: Only one scenario
    body: |
      Just one.
```"""

        def mock_stream_incomplete(*args: Any, **kwargs: Any):
            yield StreamChunk(
                content=mock_yaml,
                done=True,
                input_tokens=100,
                output_tokens=200,
                finish_reason="stop",
            )

        with patch("generate_scenarios.generate_stream", side_effect=mock_stream_incomplete):
            result = run_generation(valid_input)

        assert result["success"] is False
        assert result["error"]["code"] == "INCOMPLETE_GENERATION"
        assert result["error"]["retryable"] is True
        assert "1 of 2" in result["error"]["message"]

    def test_handles_unexpected_error(self, valid_input: dict[str, Any]) -> None:
        """Test handling of unexpected exceptions."""
        from generate_scenarios import run_generation

        def mock_stream_crash(*args: Any, **kwargs: Any):
            raise RuntimeError("Unexpected crash")

        with patch("generate_scenarios.generate_stream", side_effect=mock_stream_crash):
            result = run_generation(valid_input)

        assert result["success"] is False
        assert "Unexpected crash" in result["error"]["message"]

    def test_uses_config_values(self, valid_input: dict[str, Any]) -> None:
        """Test that config values are passed to LLM."""
        from generate_scenarios import run_generation

        valid_input["config"]["temperature"] = 0.9
        valid_input["config"]["maxTokens"] = 4096

        mock_yaml = """```yaml
scenarios:
  scenario_Stakes1:
    subject: Test
    body: test
  scenario_Stakes2:
    subject: Test 2
    body: test 2
```"""

        captured_kwargs: dict[str, Any] = {}

        def mock_stream(*args: Any, **kwargs: Any):
            captured_kwargs.update(kwargs)
            yield StreamChunk(content=mock_yaml, done=True, finish_reason="stop")

        with patch("generate_scenarios.generate_stream", side_effect=mock_stream):
            run_generation(valid_input)

        assert captured_kwargs["temperature"] == 0.9
        assert captured_kwargs["max_tokens"] == 4096

    def test_passes_model_config(self, valid_input: dict[str, Any]) -> None:
        """Test that modelConfig is passed to LLM."""
        from generate_scenarios import run_generation

        valid_input["modelConfig"] = {"maxTokensParam": "max_completion_tokens"}

        mock_yaml = """```yaml
scenarios:
  scenario_Stakes1:
    subject: Test
    body: test
  scenario_Stakes2:
    subject: Test 2
    body: test 2
```"""

        captured_kwargs: dict[str, Any] = {}

        def mock_stream(*args: Any, **kwargs: Any):
            captured_kwargs.update(kwargs)
            yield StreamChunk(content=mock_yaml, done=True, finish_reason="stop")

        with patch("generate_scenarios.generate_stream", side_effect=mock_stream):
            run_generation(valid_input)

        assert captured_kwargs["model_config"] == {"maxTokensParam": "max_completion_tokens"}

    def test_emits_progress_updates(
        self, valid_input: dict[str, Any], capsys: pytest.CaptureFixture[str]
    ) -> None:
        """Test that progress updates are emitted."""
        from generate_scenarios import run_generation

        mock_yaml = """```yaml
scenarios:
  scenario_Stakes1:
    subject: Test
    body: test
  scenario_Stakes2:
    subject: Test 2
    body: test 2
```"""

        def mock_stream(*args: Any, **kwargs: Any):
            yield StreamChunk(content=mock_yaml, output_tokens=200, done=True, finish_reason="stop")

        with patch("generate_scenarios.generate_stream", side_effect=mock_stream):
            run_generation(valid_input)

        captured = capsys.readouterr()
        stderr_lines = [line for line in captured.err.strip().split("\n") if line]

        # Filter to only progress messages (type="progress")
        progress_messages = []
        for line in stderr_lines:
            try:
                parsed = json.loads(line)
                if parsed.get("type") == "progress":
                    progress_messages.append(parsed)
            except json.JSONDecodeError:
                continue

        # Should have multiple progress updates
        assert len(progress_messages) >= 2

        # Check for starting phase
        phases = [p["phase"] for p in progress_messages]
        assert "starting" in phases
        assert "completed" in phases

    def test_streaming_progress(self, valid_input: dict[str, Any], capsys: pytest.CaptureFixture[str]) -> None:
        """Test progress updates during streaming."""
        from generate_scenarios import run_generation

        mock_yaml = """```yaml
scenarios:
  scenario_Stakes1:
    subject: Test
    body: test
  scenario_Stakes2:
    subject: Test 2
    body: test 2
```"""

        def mock_stream(*args: Any, **kwargs: Any):
            # Simulate multiple streaming chunks
            yield StreamChunk(content="partial", output_tokens=100, done=False)
            yield StreamChunk(content="more partial", output_tokens=600, done=False)  # > 500 tokens
            yield StreamChunk(content=mock_yaml, output_tokens=800, done=True, finish_reason="stop", input_tokens=50)

        with patch("generate_scenarios.generate_stream", side_effect=mock_stream):
            run_generation(valid_input)

        captured = capsys.readouterr()
        stderr_lines = [line for line in captured.err.strip().split("\n") if line]

        # Filter to only progress messages (type="progress")
        progress_messages = []
        for line in stderr_lines:
            try:
                parsed = json.loads(line)
                if parsed.get("type") == "progress":
                    progress_messages.append(parsed)
            except json.JSONDecodeError:
                continue

        phases = [p["phase"] for p in progress_messages]

        # Should see calling_llm phase
        assert "calling_llm" in phases


class TestMainFunction:
    """Tests for main stdin/stdout handling."""

    def test_empty_input(self, capsys: pytest.CaptureFixture[str]) -> None:
        """Test handling of empty input."""
        with patch.object(sys, "stdin", StringIO("")):
            from generate_scenarios import main

            main()

        captured = capsys.readouterr()
        result = json.loads(captured.out)

        assert result["success"] is False
        assert "No input" in result["error"]["message"]
        assert result["error"]["code"] == ErrorCode.VALIDATION_ERROR.value

    def test_invalid_json_input(self, capsys: pytest.CaptureFixture[str]) -> None:
        """Test handling of invalid JSON."""
        with patch.object(sys, "stdin", StringIO("not valid json {")):
            from generate_scenarios import main

            main()

        captured = capsys.readouterr()
        result = json.loads(captured.out)

        assert result["success"] is False
        assert "Invalid JSON" in result["error"]["message"]

    def test_validation_error(self, capsys: pytest.CaptureFixture[str]) -> None:
        """Test handling of validation errors."""
        invalid_input = json.dumps({"definitionId": "test"})  # Missing required fields

        with patch.object(sys, "stdin", StringIO(invalid_input)):
            from generate_scenarios import main

            main()

        captured = capsys.readouterr()
        result = json.loads(captured.out)

        assert result["success"] is False
        assert result["error"]["code"] == ErrorCode.VALIDATION_ERROR.value

    def test_successful_execution(self, capsys: pytest.CaptureFixture[str]) -> None:
        """Test successful generation execution."""
        valid_input = json.dumps({
            "definitionId": "def-123",
            "modelId": "openai:gpt-4",
            "content": {
                "template": "Test [Stakes]",
                "dimensions": [
                    {
                        "name": "Stakes",
                        "levels": [{"score": 1, "label": "low"}],
                    },
                ],
            },
            "config": {},
        })

        mock_yaml = """```yaml
scenarios:
  scenario_Stakes1:
    subject: Test
    body: Test body
```"""

        def mock_stream(*args: Any, **kwargs: Any):
            yield StreamChunk(content=mock_yaml, output_tokens=100, done=True, finish_reason="stop")

        with patch.object(sys, "stdin", StringIO(valid_input)):
            with patch("generate_scenarios.generate_stream", side_effect=mock_stream):
                from generate_scenarios import main

                main()

        captured = capsys.readouterr()
        result = json.loads(captured.out)

        assert result["success"] is True
        assert len(result["scenarios"]) == 1

    def test_handles_unexpected_exception(self, capsys: pytest.CaptureFixture[str]) -> None:
        """Test handling of unexpected exceptions in main."""
        # This tests the outer try/except in main()
        valid_input = json.dumps({
            "definitionId": "def-123",
            "modelId": "openai:gpt-4",
            "content": {
                "template": "Test",
                "dimensions": [],
            },
        })

        with patch.object(sys, "stdin", StringIO(valid_input)):
            with patch("generate_scenarios.run_generation", side_effect=Exception("Unexpected")):
                from generate_scenarios import main

                main()

        captured = capsys.readouterr()
        result = json.loads(captured.out)

        assert result["success"] is False
        assert result["error"]["code"] == ErrorCode.UNKNOWN.value
        assert "Unexpected" in result["error"]["message"]


class TestMultipleDimensions:
    """Tests for multiple dimension combinations."""

    def test_two_dimensions_cartesian_product(self) -> None:
        """Test that two dimensions produce correct count."""
        from generate_scenarios import (
            Dimension,
            DimensionLevel,
            calculate_expected_scenarios,
        )

        dim1 = Dimension(
            name="Stakes",
            levels=[
                DimensionLevel(score=1, label="low"),
                DimensionLevel(score=2, label="medium"),
                DimensionLevel(score=3, label="high"),
            ],
        )
        dim2 = Dimension(
            name="Certainty",
            levels=[
                DimensionLevel(score=1, label="uncertain"),
                DimensionLevel(score=2, label="certain"),
            ],
        )

        # 3 * 2 = 6 combinations
        assert calculate_expected_scenarios([dim1, dim2]) == 6

    def test_three_dimensions(self) -> None:
        """Test three dimension combinations."""
        from generate_scenarios import (
            Dimension,
            DimensionLevel,
            calculate_expected_scenarios,
        )

        dims = [
            Dimension(name="A", levels=[DimensionLevel(score=i, label=f"a{i}") for i in range(1, 3)]),  # 2
            Dimension(name="B", levels=[DimensionLevel(score=i, label=f"b{i}") for i in range(1, 4)]),  # 3
            Dimension(name="C", levels=[DimensionLevel(score=i, label=f"c{i}") for i in range(1, 3)]),  # 2
        ]

        # 2 * 3 * 2 = 12
        assert calculate_expected_scenarios(dims) == 12

    def test_parse_multi_dimension_scenario_key(self) -> None:
        """Test parsing dimension scores from multi-dimension scenario keys."""
        from generate_scenarios import Dimension, DimensionLevel, parse_generated_scenarios

        yaml_content = """
scenarios:
  scenario_Stakes1_Certainty2_Urgency3:
    subject: Complex scenario
    body: |
      A complex situation.
"""
        dimensions = [
            Dimension(name="Stakes", levels=[DimensionLevel(score=1, label="low")]),
            Dimension(name="Certainty", levels=[DimensionLevel(score=2, label="high")]),
            Dimension(name="Urgency", levels=[DimensionLevel(score=3, label="immediate")]),
        ]

        result = parse_generated_scenarios(yaml_content, dimensions, None)

        assert len(result.scenarios) == 1
        assert result.scenarios[0].dimensions == {
            "Stakes": 1,
            "Certainty": 2,
            "Urgency": 3,
        }


class TestEdgeCases:
    """Tests for edge cases and error conditions."""

    def test_yaml_with_null_values(self) -> None:
        """Test YAML parsing with null values."""
        from generate_scenarios import parse_generated_scenarios

        yaml_content = """
scenarios:
  test:
    subject: null
    body: Actual body
"""

        result = parse_generated_scenarios(yaml_content, [], None)

        # Should parse successfully, using key as name when subject is null
        assert len(result.scenarios) == 1

    def test_very_long_template(self) -> None:
        """Test with a very long template."""
        from generate_scenarios import Dimension, DimensionLevel, build_generation_prompt

        dim = Dimension(name="Test", levels=[DimensionLevel(score=1, label="test")])
        long_template = "A" * 5000  # 5000 character template

        prompt = build_generation_prompt(
            preamble=None,
            template=long_template,
            dimensions=[dim],
            matching_rules=None,
            expected_count=1,
        )

        assert long_template in prompt
        assert len(prompt) > 5000

    def test_special_characters_in_dimension_name(self) -> None:
        """Test dimensions with special characters."""
        from generate_scenarios import Dimension, DimensionLevel, build_generation_prompt

        dim = Dimension(
            name="Self_Direction_Action",
            levels=[DimensionLevel(score=1, label="low")],
        )

        prompt = build_generation_prompt(
            preamble=None,
            template="[Self_Direction_Action] test",
            dimensions=[dim],
            matching_rules=None,
            expected_count=1,
        )

        assert "[Self_Direction_Action]" in prompt

    def test_dimension_with_many_options(self) -> None:
        """Test dimension level with many options."""
        from generate_scenarios import Dimension, DimensionLevel, build_generation_prompt

        options = [f"option_{i}" for i in range(10)]
        dim = Dimension(
            name="Test",
            levels=[DimensionLevel(score=1, label="many", options=options)],
        )

        prompt = build_generation_prompt(
            preamble=None,
            template="[Test]",
            dimensions=[dim],
            matching_rules=None,
            expected_count=1,
        )

        # All options should be comma-separated
        assert "option_0, option_1" in prompt
        assert "option_9" in prompt

    def test_90_percent_completion_threshold(self) -> None:
        """Test that 90% completion is acceptable but below is not."""
        from generate_scenarios import run_generation

        # Create input expecting 10 scenarios
        data = {
            "definitionId": "def-123",
            "modelId": "openai:gpt-4",
            "content": {
                "template": "[D1] [D2]",
                "dimensions": [
                    {
                        "name": "D1",
                        "levels": [
                            {"score": 1, "label": "a"},
                            {"score": 2, "label": "b"},
                        ],
                    },
                    {
                        "name": "D2",
                        "levels": [
                            {"score": 1, "label": "x"},
                            {"score": 2, "label": "y"},
                            {"score": 3, "label": "z"},
                            {"score": 4, "label": "w"},
                            {"score": 5, "label": "v"},
                        ],
                    },
                ],
            },
        }
        # 2 * 5 = 10 expected scenarios

        # 9 out of 10 = 90%, should succeed
        mock_yaml_9 = """```yaml
scenarios:
  s_D11_D21:
    subject: s1
    body: b1
  s_D11_D22:
    subject: s2
    body: b2
  s_D11_D23:
    subject: s3
    body: b3
  s_D11_D24:
    subject: s4
    body: b4
  s_D11_D25:
    subject: s5
    body: b5
  s_D12_D21:
    subject: s6
    body: b6
  s_D12_D22:
    subject: s7
    body: b7
  s_D12_D23:
    subject: s8
    body: b8
  s_D12_D24:
    subject: s9
    body: b9
```"""

        def mock_stream_9(*args: Any, **kwargs: Any):
            yield StreamChunk(content=mock_yaml_9, output_tokens=500, done=True, finish_reason="stop")

        with patch("generate_scenarios.generate_stream", side_effect=mock_stream_9):
            result = run_generation(data)

        assert result["success"] is True  # 90% is acceptable

        # 8 out of 10 = 80%, should fail
        mock_yaml_8 = """```yaml
scenarios:
  s_D11_D21:
    subject: s1
    body: b1
  s_D11_D22:
    subject: s2
    body: b2
  s_D11_D23:
    subject: s3
    body: b3
  s_D11_D24:
    subject: s4
    body: b4
  s_D11_D25:
    subject: s5
    body: b5
  s_D12_D21:
    subject: s6
    body: b6
  s_D12_D22:
    subject: s7
    body: b7
  s_D12_D23:
    subject: s8
    body: b8
```"""

        def mock_stream_8(*args: Any, **kwargs: Any):
            yield StreamChunk(content=mock_yaml_8, output_tokens=400, done=True, finish_reason="stop")

        with patch("generate_scenarios.generate_stream", side_effect=mock_stream_8):
            result = run_generation(data)

        assert result["success"] is False
        assert result["error"]["code"] == "INCOMPLETE_GENERATION"
