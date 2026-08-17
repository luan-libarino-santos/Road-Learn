from django.test import Client, TestCase


class SaudeTests(TestCase):
    def test_saude(self):
        r = Client().get("/api/v1/saude")
        self.assertEqual(r.status_code, 200)
        self.assertTrue(r.json()["ok"])
        self.assertEqual(r.json()["app"], "road-learn")
