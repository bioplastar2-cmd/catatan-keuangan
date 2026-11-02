import json
import unittest

from app import create_app


class FinanceAppTests(unittest.TestCase):
    def setUp(self):
        self.app = create_app({"TESTING": True})
        self.client = self.app.test_client()

    def test_serves_mobile_transaction_form(self):
        response = self.client.get("/")
        self.assertEqual(response.status_code, 200)
        self.assertIn(b'name="description"', response.data)
        self.assertIn(b'type="month"', response.data)
        self.assertIn(b"Ringkasan bulanan", response.data)
        self.assertIn(b'>Bulan</label>', response.data)
        self.assertIn(b"Catatan keuangan", response.data)
        self.assertIn(b"./app.js", response.data)
        self.assertIn(b"Unduh cadangan", response.data)
        self.assertIn(b"Pulihkan cadangan", response.data)
        self.assertIn(b'id="cancel-edit"', response.data)
        self.assertIn(b'id="form-heading">Tambah transaksi', response.data)
        self.assertIn(b'role="status"', response.data)
        self.assertIn(b'id="message" class="message"', response.data)
        response.close()

    def test_serves_installable_app_manifest(self):
        response = self.client.get("/manifest.webmanifest")
        self.assertEqual(response.status_code, 200)
        manifest = json.loads(response.get_data(as_text=True))
        response.close()
        self.assertEqual(manifest["name"], "Catatan Keuangan")
        self.assertEqual(manifest["display"], "standalone")
        self.assertEqual(manifest["start_url"], "./")

    def test_serves_service_worker_with_root_scope(self):
        response = self.client.get("/service-worker.js")
        self.assertEqual(response.status_code, 200)
        self.assertIn(b"catatan-keuangan-shell-v7", response.data)
        response.close()

    def test_serves_local_storage_logic(self):
        response = self.client.get("/app.js")
        self.assertEqual(response.status_code, 200)
        self.assertIn(b"indexedDB.open", response.data)
        self.assertIn(b"objectStore(STORE_NAME).add", response.data)
        self.assertIn(b"validateBackup", response.data)
        self.assertIn(b"importTransactions", response.data)
        self.assertIn(b"updateTransaction", response.data)
        self.assertIn(b"data-edit-id", response.data)
        self.assertIn(b"Ringkasan laporan ${selectedMonth}", response.data)
        self.assertIn(b"Transaksi berhasil disimpan", response.data)
        self.assertIn(b"setSubmitBusy", response.data)
        self.assertIn(b"Menyimpan...", response.data)
        self.assertIn(b"refreshReport", response.data)
        response.close()


if __name__ == "__main__":
    unittest.main()
