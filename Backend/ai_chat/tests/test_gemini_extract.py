"""Tests for GeminiProvider._parse_task_array (pure JSON parsing, no AI call)."""
from django.test import SimpleTestCase

from ai_chat.providers.gemini import GeminiProvider


class ParseTaskArrayTests(SimpleTestCase):
    def test_parses_plain_json_array(self):
        result = GeminiProvider._parse_task_array('["Buy groceries", "Call dentist"]')
        self.assertEqual(result, ["Buy groceries", "Call dentist"])

    def test_parses_fenced_json_block(self):
        result = GeminiProvider._parse_task_array('```json\n["Exercise"]\n```')
        self.assertEqual(result, ["Exercise"])

    def test_empty_array_returns_empty_list(self):
        self.assertEqual(GeminiProvider._parse_task_array('[]'), [])

    def test_non_json_returns_empty_list(self):
        self.assertEqual(GeminiProvider._parse_task_array('I cannot help with that.'), [])

    def test_non_list_json_returns_empty_list(self):
        self.assertEqual(GeminiProvider._parse_task_array('{"task": "x"}'), [])

    def test_filters_blank_and_non_string_items(self):
        result = GeminiProvider._parse_task_array('["Task A", "", "  ", 5, "Task B"]')
        self.assertEqual(result, ["Task A", "Task B"])
