import unittest

from documents.parser import DocumentParser


class DocumentParserClauseTests(unittest.TestCase):
    def test_extracts_supported_clause_and_section_labels(self):
        parser = DocumentParser()
        self.assertEqual(parser._extract_clause_number("Clause 7 governs delivery."), "Clause 7")
        self.assertEqual(parser._extract_clause_number("Section 138 applies."), "Section 138")
        self.assertEqual(parser._extract_clause_number("Article 21 protects liberty."), "Article 21")

    def test_returns_empty_label_without_a_supported_reference(self):
        self.assertEqual(DocumentParser()._extract_clause_number("No statutory reference."), "")
