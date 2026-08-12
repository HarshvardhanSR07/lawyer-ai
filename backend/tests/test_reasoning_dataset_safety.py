import asyncio
import unittest

from ai.reasoning import ReasoningEngine


class ReasoningDatasetSafetyTests(unittest.TestCase):
    def test_illustrative_dataset_without_primary_source_is_fail_closed(self):
        engine = ReasoningEngine()
        result = asyncio.run(
            engine.verify(
                response="A draft conclusion based on an example.",
                legal_sources=[
                    {
                        "source": "Indian Lawyer Dataset — Illustrative Example",
                        "authority_level": "illustrative_dataset",
                        "text": "Non-authoritative example",
                    }
                ],
                evidence_sources=[],
            )
        )

        self.assertFalse(result["safe_to_deliver"])
        self.assertEqual(result["verdict"], "flagged")
        self.assertIn("authoritative legal source", result["unsupported_claims"][0])

    def test_authoritative_retrieval_reaches_and_can_pass_the_verification_gate(self):
        engine = ReasoningEngine()

        async def verified_response(*_args, **_kwargs):
            return '{"verdict":"approved","unsupported_claims":[],"citation_mismatches":[],"logical_issues":[],"safe_to_deliver":true}'

        engine._call_llm = verified_response
        result = asyncio.run(
            engine.verify(
                response="A conclusion tied to the supplied statute.",
                legal_sources=[
                    {
                        "source": "Indian Contract Act, 1872",
                        "section": "Section 10",
                        "authority_level": "primary",
                        "text": "All agreements are contracts if made by free consent.",
                    }
                ],
                evidence_sources=[],
            )
        )

        self.assertTrue(result["safe_to_deliver"])
        self.assertEqual(result["verdict"], "approved")


if __name__ == "__main__":
    unittest.main()
