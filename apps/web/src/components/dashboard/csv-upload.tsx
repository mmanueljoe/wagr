'use client'

import { Button } from '@/components/ui/button'
import { useBulkCreateEmployees } from '@/hooks/use-bulk-create-employees'
import { type ParseResult, TEMPLATE_CSV, parseEmployeeFile } from '@/lib/csv-parser'
import { UploadCloud, X } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

function downloadTemplate() {
  const blob = new Blob([TEMPLATE_CSV], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'wagr-employee-template.csv'
  a.click()
  URL.revokeObjectURL(url)
}

export function CsvUpload() {
  const [isDragging, setIsDragging] = useState(false)
  const [isParsing, setIsParsing] = useState(false)
  const [fileName, setFileName] = useState<string | null>(null)
  const [parseResult, setParseResult] = useState<ParseResult | null>(null)
  const bulkCreate = useBulkCreateEmployees()

  async function handleFile(file: File) {
    if (!file.name.match(/\.(csv|xlsx?)$/i)) {
      toast.error('Only CSV and XLSX files are accepted')
      return
    }
    setIsParsing(true)
    setFileName(file.name)
    setParseResult(null)
    try {
      const result = await parseEmployeeFile(file)
      setParseResult(result)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not read file')
      setFileName(null)
    } finally {
      setIsParsing(false)
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) void handleFile(file)
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) void handleFile(file)
    e.target.value = ''
  }

  function reset() {
    setParseResult(null)
    setFileName(null)
    bulkCreate.reset()
  }

  function upload() {
    if (!parseResult || parseResult.valid.length === 0) return
    bulkCreate.mutate(parseResult.valid, {
      onSuccess: (result) => {
        const added = result.inserted
        const apiFailCount = result.failed.length
        if (added === 0) {
          toast.error('No workers were added — check the errors below')
        } else {
          toast.success(
            apiFailCount > 0
              ? `${added} added, ${apiFailCount} failed`
              : `${added} worker${added === 1 ? '' : 's'} added`,
          )
        }
      },
      onError: (err) => toast.error(err.message),
    })
  }

  // ── Post-upload summary ────────────────────────────────────────────────
  if (bulkCreate.isSuccess && bulkCreate.data) {
    const { inserted, failed: apiFailed } = bulkCreate.data
    const clientFailed = parseResult?.invalid ?? []
    const totalFailed = apiFailed.length + clientFailed.length

    return (
      <div className="space-y-3">
        <p className="text-sm font-medium text-wagr-navy">Upload complete</p>
        <div className="space-y-1 text-sm text-wagr-gray">
          <p>
            <span className="font-medium text-green-700">{inserted}</span> worker
            {inserted === 1 ? '' : 's'} added
          </p>
          {totalFailed > 0 && (
            <p>
              <span className="font-medium text-destructive">{totalFailed}</span> rows failed
            </p>
          )}
        </div>

        {apiFailed.length > 0 && (
          <ul className="max-h-32 space-y-1 overflow-y-auto rounded border border-red-200 bg-red-50 p-3 text-xs text-destructive">
            {apiFailed.map((item) => (
              <li key={`api-${item.index}`}>
                Row {item.index + 2}: {item.reason}
              </li>
            ))}
          </ul>
        )}

        <Button variant="outline" onClick={reset} className="w-full">
          Upload another file
        </Button>
      </div>
    )
  }

  // ── Pre-upload: show parse results before submitting ───────────────────
  if (parseResult) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-wagr-navy">{fileName}</p>
          <button
            type="button"
            onClick={reset}
            className="text-wagr-gray hover:text-wagr-navy"
            aria-label="Clear file selection"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-1 text-sm text-wagr-gray">
          <p>
            <span className="font-medium text-green-700">{parseResult.valid.length}</span> valid
            rows ready to upload
          </p>
          {parseResult.invalid.length > 0 && (
            <p>
              <span className="font-medium text-destructive">{parseResult.invalid.length}</span>{' '}
              rows have errors and will be skipped
            </p>
          )}
        </div>

        {parseResult.invalid.length > 0 && (
          <ul className="max-h-32 space-y-1 overflow-y-auto rounded border border-red-200 bg-red-50 p-3 text-xs text-destructive">
            {parseResult.invalid.map((item) => (
              <li key={`${item.row}-${item.reason}`}>
                {item.row > 1 ? `Row ${item.row}: ` : ''}
                {item.reason}
              </li>
            ))}
          </ul>
        )}

        {parseResult.valid.length > 0 ? (
          <Button onClick={upload} disabled={bulkCreate.isPending} className="w-full">
            {bulkCreate.isPending
              ? 'Uploading…'
              : `Upload ${parseResult.valid.length} worker${parseResult.valid.length === 1 ? '' : 's'}`}
          </Button>
        ) : (
          <p className="text-xs text-destructive">Fix the errors above and upload a new file.</p>
        )}
      </div>
    )
  }

  // ── Dropzone ───────────────────────────────────────────────────────────
  return (
    <div className="space-y-3">
      <label
        htmlFor="csv-file-input"
        aria-label="Upload employee CSV or XLSX"
        className={[
          'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-wagr border-2 border-dashed p-8 transition-colors',
          isDragging
            ? 'border-wagr-navy bg-wagr-navy/5'
            : 'border-wagr-gray-light hover:border-wagr-navy',
        ].join(' ')}
        onDragOver={(e) => {
          e.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
      >
        <UploadCloud className="h-8 w-8 text-wagr-gray" />
        <p className="text-sm font-medium text-wagr-navy">
          {isParsing ? 'Reading file…' : 'Drag and drop your CSV or XLSX here'}
        </p>
        {!isParsing && <p className="text-xs text-wagr-gray">or click to browse</p>}
        <input
          id="csv-file-input"
          type="file"
          accept=".csv,.xlsx,.xls"
          className="sr-only"
          onChange={onFileChange}
        />
      </label>

      <p className="text-xs text-wagr-gray">
        Required columns: full_name, momo_number, network, monthly_salary, start_date · Max 500 rows
      </p>

      <button
        type="button"
        onClick={downloadTemplate}
        className="text-xs text-wagr-navy underline hover:no-underline"
      >
        Download template CSV
      </button>
    </div>
  )
}
