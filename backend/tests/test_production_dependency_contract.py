from pathlib import Path
import unittest


PROJECT_ROOT = Path(__file__).resolve().parents[2]


class ProductionDependencyContractTests(unittest.TestCase):
    def test_qdrant_requirement_is_the_supported_published_release(self):
        requirements = (PROJECT_ROOT / "backend" / "requirements.txt").read_text().splitlines()
        self.assertIn("qdrant-client==1.19.0", requirements)
        self.assertNotIn("qdrant-client==2.7.0", requirements)

    def test_docker_uses_the_python_311_compatible_node_bookworm_base(self):
        dockerfile = (PROJECT_ROOT / "Dockerfile").read_text()
        self.assertIn("FROM node:22-bookworm-slim", dockerfile)
        self.assertIn("python3 -m pip install --no-cache-dir --break-system-packages -r backend/requirements.txt", dockerfile)
