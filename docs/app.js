"use strict";

const DATABASE_NAME = "catatan-keuangan-hp";
const DATABASE_VERSION = 1;
const STORE_NAME = "transactions";
const transactionForm = document.querySelector("#transaction-form");
const monthInput = document.querySelector("#month");
const transactionList = document.querySelector("#transaction-list");
const emptyState = document.querySelector("#empty-state");
const message = document.querySelector("#message");
const backupFileInput = document.querySelector("#backup-file");
const MAX_BACKUP_SIZE = 10 * 1024 * 1024;
const MAX_BACKUP_TRANSACTIONS = 50000;
const currency = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

function localDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, {
          keyPath: "id",
          autoIncrement: true,
        });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Database HP tidak dapat dibuka."));
  });
}

function getTransactions(database) {
  return new Promise((resolve, reject) => {
    const request = database
      .transaction(STORE_NAME, "readonly")
      .objectStore(STORE_NAME)
      .getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Catatan tidak dapat dibaca."));
  });
}

function saveTransaction(database, transactionData) {
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    const request = transaction.objectStore(STORE_NAME).add(transactionData);
    let savedId;
    request.onsuccess = () => {
      savedId = request.result;
    };
    request.onerror = () => reject(request.error || new Error("Catatan tidak dapat disimpan."));
    transaction.oncomplete = () => resolve(savedId);
    transaction.onerror = () => reject(transaction.error || new Error("Penyimpanan transaksi gagal."));
    transaction.onabort = () => reject(transaction.error || new Error("Penyimpanan transaksi dibatalkan."));
  });
}

function validateBackup(backup) {
  if (
    !backup
    || backup.format !== "catatan-keuangan-backup"
    || backup.version !== 1
    || !Array.isArray(backup.transactions)
    || backup.transactions.length > MAX_BACKUP_TRANSACTIONS
  ) {
    throw new Error("Format cadangan tidak dikenal atau jumlah catatan terlalu banyak.");
  }

  const seenIds = new Set();
  return backup.transactions.map((item) => {
    if (
      !item
      || !Number.isSafeInteger(item.id)
      || item.id < 1
      || seenIds.has(item.id)
      || typeof item.date !== "string"
      || !/^\d{4}-\d{2}-\d{2}$/.test(item.date)
      || Number.isNaN(Date.parse(`${item.date}T00:00:00.000Z`))
      || new Date(`${item.date}T00:00:00.000Z`).toISOString().slice(0, 10) !== item.date
      || !["pemasukan", "pengeluaran"].includes(item.type)
      || !Number.isSafeInteger(item.amount)
      || item.amount <= 0
      || typeof item.description !== "string"
      || !item.description.trim()
      || item.description.trim().length > 120
    ) {
      throw new Error("Ada catatan yang tidak valid di file cadangan. Tidak ada data yang diubah.");
    }

    seenIds.add(item.id);
    return {
      id: item.id,
      date: item.date,
      type: item.type,
      amount: item.amount,
      description: item.description.trim(),
    };
  });
}

function sameTransaction(left, right) {
  return left.date === right.date
    && left.type === right.type
    && left.amount === right.amount
    && left.description === right.description;
}

function importTransactions(database, importedTransactions) {
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const readRequest = store.getAll();
    const result = { added: 0, duplicates: 0, conflicts: 0 };

    readRequest.onsuccess = () => {
      const currentTransactions = readRequest.result;
      const existingById = new Map(
        currentTransactions.map((item) => [item.id, item]),
      );
      let maxId = 0;
      for (const item of currentTransactions) {
        maxId = Math.max(maxId, item.id);
      }
      for (const item of importedTransactions) {
        maxId = Math.max(maxId, item.id);
        const existing = existingById.get(item.id);
        if (existing && !sameTransaction(existing, item)) {
          result.conflicts += 1;
        }
      }

      let nextId = maxId + 1;
      if (
        result.conflicts > 0
        && (!Number.isSafeInteger(nextId)
          || !Number.isSafeInteger(nextId + result.conflicts - 1))
      ) {
        result.error = new Error("ID catatan terlalu besar untuk membuat salinan saat pemulihan.");
        transaction.abort();
        return;
      }

      for (const imported of importedTransactions) {
        const existing = existingById.get(imported.id);
        if (existing && sameTransaction(existing, imported)) {
          result.duplicates += 1;
          continue;
        }

        const record = existing ? { ...imported, id: nextId++ } : imported;
        result.added += 1;
        store.add(record);
      }
    };

    readRequest.onerror = () => reject(readRequest.error || new Error("Data lokal tidak dapat dibaca."));
    transaction.oncomplete = () => resolve(result);
    transaction.onerror = () => reject(transaction.error || new Error("Pemulihan cadangan gagal."));
    transaction.onabort = () => reject(
      result.error || transaction.error || new Error("Pemulihan cadangan dibatalkan."),
    );
  });
}

function showMessage(text, kind) {
  message.textContent = text;
  message.className = `message ${kind}`;
  message.hidden = false;
}

function formatDate(value) {
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(year, month - 1, day));
}

function makeElement(tag, className, text) {
  const element = document.createElement(tag);
  element.className = className;
  element.textContent = text;
  return element;
}

function renderTransaction(transaction) {
  const row = document.createElement("article");
  row.className = "transaction";

  const icon = makeElement(
    "span",
    `transaction-icon ${transaction.type}`,
    transaction.type === "pemasukan" ? "↙" : "↗",
  );
  icon.setAttribute("aria-hidden", "true");

  const info = document.createElement("div");
  info.className = "transaction-info";
  info.append(
    makeElement("strong", "", transaction.description),
    makeElement("span", "", `${transaction.type === "pemasukan" ? "Pemasukan" : "Pengeluaran"} · ${formatDate(transaction.date)}`),
  );

  const prefix = transaction.type === "pemasukan" ? "+" : "−";
  const amount = makeElement(
    "strong",
    `transaction-amount ${transaction.type}`,
    `${prefix} ${currency.format(transaction.amount)}`,
  );
  row.append(icon, info, amount);
  return row;
}

async function refreshReport(database) {
  const selectedMonth = monthInput.value;
  const transactions = (await getTransactions(database))
    .filter((transaction) => transaction.date.startsWith(`${selectedMonth}-`))
    .sort((left, right) => right.date.localeCompare(left.date) || right.id - left.id);
  const income = transactions
    .filter((transaction) => transaction.type === "pemasukan")
    .reduce((sum, transaction) => sum + transaction.amount, 0);
  const expense = transactions
    .filter((transaction) => transaction.type === "pengeluaran")
    .reduce((sum, transaction) => sum + transaction.amount, 0);

  document.querySelector("#income").textContent = currency.format(income);
  document.querySelector("#expense").textContent = currency.format(expense);
  document.querySelector("#balance").textContent = currency.format(income - expense);
  document.querySelector("#report-footnote").textContent = `Laporan untuk ${selectedMonth}`;
  transactionList.replaceChildren(...transactions.map(renderTransaction));
  emptyState.hidden = transactions.length > 0;
  transactionList.hidden = transactions.length === 0;
}

async function startApp() {
  const database = await openDatabase();
  const today = localDateString();
  document.querySelector("#transaction_date").value = today;
  monthInput.value = today.slice(0, 7);
  await refreshReport(database);

  document.querySelector("#export-backup").addEventListener("click", async () => {
    try {
      const backup = {
        format: "catatan-keuangan-backup",
        version: 1,
        exportedAt: new Date().toISOString(),
        transactions: await getTransactions(database),
      };
      const file = new Blob([`${JSON.stringify(backup, null, 2)}\n`], {
        type: "application/json",
      });
      const downloadUrl = URL.createObjectURL(file);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = `cadangan-catatan-keuangan-${localDateString()}.json`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
      showMessage(`${backup.transactions.length} catatan dicadangkan. Simpan file ini di tempat yang aman.`, "success");
    } catch (error) {
      showMessage(`Cadangan gagal dibuat: ${error.message}`, "error");
    }
  });

  document.querySelector("#choose-backup").addEventListener("click", () => {
    backupFileInput.click();
  });

  backupFileInput.addEventListener("change", async () => {
    const file = backupFileInput.files?.[0];
    if (!file) {
      return;
    }
    try {
      if (file.size > MAX_BACKUP_SIZE) {
        throw new Error("Ukuran file cadangan melebihi 10 MB.");
      }
      const backup = JSON.parse(await file.text());
      const importedTransactions = validateBackup(backup);
      const result = await importTransactions(database, importedTransactions);
      await refreshReport(database);
      const details = [
        `${result.added} catatan ditambahkan`,
        `${result.duplicates} duplikat dilewati`,
      ];
      if (result.conflicts > 0) {
        details.push(`${result.conflicts} ID bentrok disimpan sebagai catatan baru`);
      }
      showMessage(`Pemulihan selesai: ${details.join(", ")}.`, "success");
    } catch (error) {
      showMessage(`Cadangan gagal dipulihkan: ${error.message}`, "error");
    } finally {
      backupFileInput.value = "";
    }
  });

  monthInput.addEventListener("change", () => {
    refreshReport(database).catch((error) => {
      showMessage(`Laporan gagal dimuat: ${error.message}`, "error");
    });
  });

  transactionForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(transactionForm);
    const date = String(formData.get("transaction_date") || "");
    const type = String(formData.get("transaction_type") || "");
    const amount = Number(formData.get("amount"));
    const description = String(formData.get("description") || "").trim();

    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(date)
      || !["pemasukan", "pengeluaran"].includes(type)
      || !Number.isSafeInteger(amount)
      || amount <= 0
      || !description
      || description.length > 120
    ) {
      showMessage("Periksa tanggal, tipe transaksi, nominal, dan keterangan (maksimal 120 karakter).", "error");
      return;
    }

    try {
      await saveTransaction(database, { date, type, amount, description });
      transactionForm.reset();
      document.querySelector("#transaction_date").value = today;
      monthInput.value = date.slice(0, 7);
      await refreshReport(database);
      showMessage("Transaksi tersimpan di HP ini.", "success");
    } catch (error) {
      showMessage(`Transaksi gagal disimpan: ${error.message}`, "error");
    }
  });
}

startApp().catch((error) => {
  showMessage(`Aplikasi gagal dibuka: ${error.message}`, "error");
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js").catch((error) => {
      showMessage(`Mode offline gagal disiapkan: ${error.message}`, "error");
    });
  });
}
