"use client";

import { useMemo, useState } from "react";
import type { TransactionRecord, TransactionType } from "@/types/transactions";
import { type TaxPlatform, exportTransactionsToCsv } from "@/utils/csvExport";
interface TransactionExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: TransactionRecord[];
}

const TRANSACTION_TYPES: TransactionType[] = [
  "swap",
  "liquidity",
  "remittance",
];

export default function TransactionExportModal({
  isOpen,
  onClose,
  transactions,
}: TransactionExportModalProps) {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedTypes, setSelectedTypes] = useState<TransactionType[]>([
    ...TRANSACTION_TYPES,
  ]);
  const [format, setFormat] = useState<"csv" | "json">("csv");
  const [platform, setPlatform] = useState<TaxPlatform>("standard");
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState("");

  const filteredTransactions = useMemo(() => {
    return transactions.filter((transaction) => {
      const date = new Date(transaction.date);
      const start = startDate ? new Date(`${startDate}T00:00:00`) : null;
      const end = endDate ? new Date(`${endDate}T23:59:59.999`) : null;

      return (
        (!start || date >= start) &&
        (!end || date <= end) &&
        selectedTypes.includes(transaction.type)
      );
    });
  }, [transactions, startDate, endDate, selectedTypes]);

  if (!isOpen) return null;

  function toggleType(type: TransactionType) {
    setSelectedTypes((current) =>
      current.includes(type)
        ? current.filter((item) => item !== type)
        : [...current, type],
    );
  }

  async function handleExport() {
    setError("");

    if (startDate && endDate && startDate > endDate) {
      setError("Start date must be before the end date.");
      return;
    }

    if (filteredTransactions.length === 0) {
      setError("No transactions match your selected filters.");
      return;
    }

    setIsExporting(true);

    try {
      if (format === "csv") {
        await exportTransactionsToCsv(filteredTransactions, { platform });
      } else {
        const blob = new Blob([JSON.stringify(filteredTransactions, null, 2)], {
          type: "application/json;charset=utf-8",
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `stellarflow_transactions_${new Date()
          .toISOString()
          .slice(0, 10)}.json`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
      }

      onClose();
    } catch {
      setError("Export failed. Please try again.");
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="transaction-export-title"
        className="w-full max-w-lg rounded-xl bg-white p-6 text-gray-900 shadow-xl dark:bg-gray-900 dark:text-white"
        onClick={(event) => event.stopPropagation()}
      >
        {" "}
        <div className="mb-6 flex items-center justify-between">
          {" "}
          <h2 id="transaction-export-title" className="text-xl font-semibold">
            Export transaction history{" "}
          </h2>{" "}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close export dialog"
            className="rounded-md px-3 py-1 text-2xl hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            ×{" "}
          </button>{" "}
        </div>
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="text-sm">
              Start date
              <input
                type="date"
                value={startDate}
                max={endDate || undefined}
                onChange={(event) => setStartDate(event.target.value)}
                className="mt-2 block w-full rounded-lg border border-gray-300 bg-transparent p-2 dark:border-gray-700"
              />
            </label>

            <label className="text-sm">
              End date
              <input
                type="date"
                value={endDate}
                min={startDate || undefined}
                onChange={(event) => setEndDate(event.target.value)}
                className="mt-2 block w-full rounded-lg border border-gray-300 bg-transparent p-2 dark:border-gray-700"
              />
            </label>
          </div>

          <fieldset>
            <legend className="mb-3 text-sm font-medium">
              Transaction types
            </legend>
            <div className="flex flex-wrap gap-4">
              {TRANSACTION_TYPES.map((type) => (
                <label key={type} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={selectedTypes.includes(type)}
                    onChange={() => toggleType(type)}
                  />
                  <span className="capitalize">{type}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <label className="block text-sm">
            Export format
            <select
              value={format}
              onChange={(event) =>
                setFormat(event.target.value as "csv" | "json")
              }
              className="mt-2 block w-full rounded-lg border border-gray-300 bg-transparent p-2 dark:border-gray-700"
            >
              <option value="csv">CSV</option>
              <option value="json">JSON</option>
            </select>
          </label>

          {format === "csv" && (
            <label className="block text-sm">
              CSV format
              <select
                value={platform}
                onChange={(event) =>
                  setPlatform(event.target.value as TaxPlatform)
                }
                className="mt-2 block w-full rounded-lg border border-gray-300 bg-transparent p-2 dark:border-gray-700"
              >
                <option value="standard">Standard</option>
                <option value="koinly">Koinly</option>
                <option value="cointracker">CoinTracker</option>
              </select>
            </label>
          )}

          <p className="text-sm text-gray-500 dark:text-gray-400">
            {filteredTransactions.length} transaction
            {filteredTransactions.length === 1 ? "" : "s"} will be exported.
          </p>

          {error && (
            <p role="alert" className="text-sm text-red-600">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 px-4 py-2 dark:border-gray-700"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleExport}
              disabled={isExporting}
              className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {isExporting ? "Exporting..." : "Download export"}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
