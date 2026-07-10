'use client'

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { useBulkCreateEmployees } from '@/hooks/use-bulk-create-employees'
import { type CSVParseResult, parseEmployeeCSV } from '@/lib/csv-parser'
import { AlertCircle, CheckCircle, Download, FileUp, Loader2, UploadCloud, X } from 'lucide-react'
import { useRef, useState, useTransition } from 'react'
import { toast } from 'sonner'

interface CSVUploadModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CSVUploadModal({ open, onOpenChange }: Readonly<CSVUploadModalProps>) {
  const [file, setFile] = useState<File | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const [parseResult, setParseResult] = useState<CSVParseResult | null>(null)
  const [isParsing, startParsing] = useTransition()

  const fileInputRef = useRef<HTMLInputElement>(null)
  const bulkCreate = useBulkCreateEmployees()

  function handleClose() {
    setFile(null)
    setParseResult(null)
    onOpenChange(false)
  }

  function handleFile(selectedFile: File) {
    if (!selectedFile.name.endsWith('.csv')) {
      toast.error('Please upload a .csv file only.')
      return
    }
    setFile(selectedFile)
    startParsing(async () => {
      try {
        const result = await parseEmployeeCSV(selectedFile)
        setParseResult(result)
      } catch {
        toast.error('Failed to parse CSV file.')
        setFile(null)
      }
    })
  }

  function handleDrag(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    const dropped = e.dataTransfer.files?.[0]
    if (dropped) {
      handleFile(dropped)
    }
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0]
    if (selected) {
      handleFile(selected)
    }
  }

  function onButtonClick() {
    fileInputRef.current?.click()
  }

  function downloadTemplate() {
    const headers = 'full_name,momo_number,network,monthly_salary,start_date\n'
    const row1 = 'Abena Mensah,0244123456,MTN,2200.00,2025-11-03\n'
    const row2 = 'Kojo Asante,0270000003,AirtelTigo,1800.00,2025-08-18\n'
    const csvContent = `data:text/csv;charset=utf-8,${encodeURIComponent(headers + row1 + row2)}`

    const link = document.createElement('a')
    link.setAttribute('href', csvContent)
    link.setAttribute('download', 'wagr_employee_template.csv')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  function handleUpload() {
    if (!parseResult || parseResult.valid.length === 0) return

    bulkCreate.mutate(
      { employees: parseResult.valid },
      {
        onSuccess: (res) => {
          if (res.failed.length > 0) {
            toast.warning(
              `Uploaded ${res.inserted} workers. ${res.failed.length} failed database checks.`,
            )
            // Capture failed list as state for display or show custom toast
          } else {
            toast.success(`Successfully uploaded all ${res.inserted} workers.`)
          }
          handleClose()
        },
        onError: (err) => {
          toast.error(err.message || 'Failed to upload employees.')
        },
      },
    )
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="sm:max-w-xl max-h-[90vh] flex flex-col p-6 overflow-hidden">
        <AlertDialogHeader className="relative pr-6">
          <AlertDialogTitle className="text-xl font-heading text-wagr-navy">
            Upload employee list
          </AlertDialogTitle>
          <AlertDialogDescription className="text-sm text-wagr-gray">
            Add multiple workers at once using a CSV file.
          </AlertDialogDescription>
          <button
            type="button"
            onClick={handleClose}
            className="absolute top-0 right-0 p-1 text-wagr-gray hover:text-wagr-navy rounded-full transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </AlertDialogHeader>

        <div className="flex-1 py-4 overflow-y-auto min-h-0">
          {!file && (
            <div className="space-y-4">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileInput}
                className="hidden"
              />
              <button
                type="button"
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={onButtonClick}
                className={`flex w-full flex-col items-center justify-center border-2 border-dashed rounded-lg p-8 cursor-pointer transition-colors ${
                  dragActive
                    ? 'border-wagr-gold bg-wagr-gold/5'
                    : 'border-wagr-gray-light hover:border-wagr-gold hover:bg-wagr-navy/5'
                }`}
              >
                <UploadCloud className="h-10 w-10 text-wagr-gray mb-3" />
                <p className="text-sm font-medium text-wagr-navy">Drag and drop your CSV here</p>
                <p className="text-xs text-wagr-gray mt-1">or click to browse from files</p>
              </button>

              <div className="rounded-md bg-wagr-navy/5 p-4 text-xs text-wagr-gray space-y-2">
                <p className="font-semibold text-wagr-navy">Required columns:</p>
                <code className="block bg-white p-2 rounded border border-wagr-gray-light overflow-x-auto text-wagr-navy">
                  full_name, momo_number, network, monthly_salary, start_date
                </code>
                <ul className="list-disc pl-4 space-y-1 mt-2">
                  <li>
                    <strong>network:</strong> MTN, Telecel, or AirtelTigo (case-insensitive)
                  </li>
                  <li>
                    <strong>monthly_salary:</strong> Gross amount in GHS, e.g. 2500.00
                  </li>
                  <li>
                    <strong>start_date:</strong> YYYY-MM-DD or DD/MM/YYYY format
                  </li>
                </ul>
              </div>

              <div className="flex justify-start">
                <Button variant="outline" size="sm" onClick={downloadTemplate} className="text-xs">
                  <Download className="h-3 w-3 mr-2" />
                  Download template CSV
                </Button>
              </div>
            </div>
          )}

          {file && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-wagr-navy/5 rounded-md border border-wagr-gray-light">
                <FileUp className="h-8 w-8 text-wagr-navy shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-wagr-navy truncate">{file.name}</p>
                  <p className="text-xs text-wagr-gray">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
                {!bulkCreate.isPending && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setFile(null)
                      setParseResult(null)
                    }}
                    className="text-wagr-gray hover:text-wagr-navy"
                  >
                    Clear
                  </Button>
                )}
              </div>

              {isParsing && (
                <div className="flex items-center justify-center py-6 text-sm text-wagr-gray">
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  Parsing file...
                </div>
              )}

              {!isParsing && parseResult && (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <div className="flex items-center text-sm text-green-700 bg-green-50 px-3 py-2 rounded">
                      <CheckCircle className="h-4 w-4 mr-2 shrink-0" />
                      <span>{parseResult.valid.length} workers ready to add.</span>
                    </div>

                    {parseResult.errors.length > 0 && (
                      <div className="flex items-center text-sm text-amber-700 bg-amber-50 px-3 py-2 rounded">
                        <AlertCircle className="h-4 w-4 mr-2 shrink-0" />
                        <span>
                          {parseResult.errors.length} rows contain errors and will be skipped.
                        </span>
                      </div>
                    )}
                  </div>

                  {parseResult.errors.length > 0 && (
                    <div className="border border-wagr-gray-light rounded-md overflow-hidden">
                      <div className="bg-wagr-navy/5 px-3 py-2 border-b border-wagr-gray-light text-xs font-semibold text-wagr-navy">
                        Row validation errors
                      </div>
                      <div className="max-h-48 overflow-y-auto p-3 text-xs font-mono space-y-1.5 bg-white divide-y divide-wagr-gray-light">
                        {parseResult.errors.map((err, i) => (
                          <div
                            key={`${err.row}-${i}`}
                            className="pt-1.5 first:pt-0 text-destructive"
                          >
                            <span className="font-semibold">Row {err.row}:</span> {err.reason}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <AlertDialogFooter className="border-t border-wagr-gray-light pt-4 flex gap-2 flex-wrap">
          <Button variant="secondary" onClick={handleClose} disabled={bulkCreate.isPending}>
            Cancel
          </Button>
          {file && parseResult && parseResult.valid.length > 0 && (
            <Button
              onClick={handleUpload}
              disabled={bulkCreate.isPending || isParsing}
              className="flex-1"
            >
              {bulkCreate.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Uploading...
                </>
              ) : (
                `Add ${parseResult.valid.length} workers`
              )}
            </Button>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
