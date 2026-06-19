import type { CreateEmployeeInput, EmployeeNetwork } from '@wagr/types'
import Papa from 'papaparse'

const MAX_ROWS = 500

// Canonical aliases for what employers type in the network column
const NETWORK_MAP: Record<string, EmployeeNetwork> = {
  mtn: 'mtn',
  telecel: 'telecel',
  airteltigo: 'at',
  at: 'at',
}

// MoMo prefixes for cross-field validation (matches apps/api/src/lib/validators.ts)
const MOMO_PREFIXES: Record<EmployeeNetwork, string[]> = {
  mtn: ['024', '054', '055', '059'],
  telecel: ['020', '050'],
  at: ['026', '056', '027', '057'],
}

export interface ParsedRow {
  valid: true
  data: CreateEmployeeInput
}

export interface InvalidRow {
  valid: false
  row: number
  reason: string
}

export interface ParseResult {
  valid: CreateEmployeeInput[]
  invalid: { row: number; reason: string }[]
  totalRows: number
}

function normalizeMoMo(raw: string): string {
  const s = raw.trim().replace(/\s+/g, '')
  if (s.startsWith('+233')) return `0${s.slice(4)}`
  if (s.startsWith('233')) return `0${s.slice(3)}`
  return s
}

function normalizeDate(raw: string): string | null {
  const s = raw.trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (m) return `${m[3]}-${m[2]}-${m[1]}`
  return null
}

function validateRow(raw: Record<string, string>, rowIndex: number): ParsedRow | InvalidRow {
  const fail = (reason: string): InvalidRow => ({ valid: false, row: rowIndex, reason })

  const fullName = raw.full_name?.trim() ?? ''
  if (fullName.length < 2) return fail('full_name must be at least 2 characters')

  const rawMomo = raw.momo_number ?? ''
  const momo = normalizeMoMo(rawMomo)
  if (!/^0\d{9}$/.test(momo))
    return fail(`momo_number "${rawMomo}" is not a valid 10-digit Ghana number`)

  const rawNetwork = raw.network ?? ''
  const network = NETWORK_MAP[rawNetwork.trim().toLowerCase().replace(/\s+/g, '')]
  if (!network) return fail(`network "${rawNetwork}" must be MTN, Telecel, or AirtelTigo`)

  const prefixes = MOMO_PREFIXES[network]
  if (!prefixes.some((p) => momo.startsWith(p))) {
    return fail(`MoMo number ${momo} does not match network ${rawNetwork}`)
  }

  const rawSalary = raw.monthly_salary ?? ''
  const salaryNum = Number(rawSalary.trim().replace(/,/g, ''))
  if (Number.isNaN(salaryNum) || salaryNum <= 0) {
    return fail(`monthly_salary "${rawSalary}" must be a positive number`)
  }

  const rawDate = raw.start_date ?? ''
  const startDate = normalizeDate(rawDate)
  if (!startDate) return fail(`start_date "${rawDate}" must be YYYY-MM-DD or DD/MM/YYYY`)

  return {
    valid: true,
    data: {
      full_name: fullName,
      momo_number: momo,
      network,
      monthly_salary_pesewas: Math.round(salaryNum * 100),
      start_date: startDate,
    },
  }
}

const REQUIRED_COLS = ['full_name', 'momo_number', 'network', 'monthly_salary', 'start_date']

function processRows(rawRows: Record<string, unknown>[]): ParseResult {
  const [firstRow] = rawRows
  if (!firstRow) {
    return { valid: [], invalid: [{ row: 0, reason: 'File has no data rows' }], totalRows: 0 }
  }

  // Check all required columns exist (case-insensitive header)
  const headers = Object.keys(firstRow).map((k) => k.toLowerCase().trim())
  const missing = REQUIRED_COLS.filter((c) => !headers.includes(c))
  if (missing.length > 0) {
    return {
      valid: [],
      invalid: [{ row: 0, reason: `Missing required columns: ${missing.join(', ')}` }],
      totalRows: rawRows.length,
    }
  }

  const valid: CreateEmployeeInput[] = []
  const invalid: { row: number; reason: string }[] = []

  for (const [i, raw] of rawRows.slice(0, MAX_ROWS).entries()) {
    // Normalize column names to lowercase for uniform lookup
    const normalized: Record<string, string> = {}
    for (const [k, v] of Object.entries(raw)) {
      normalized[k.toLowerCase().trim()] = String(v ?? '').trim()
    }

    const result = validateRow(normalized, i + 2) // +2: row 1 is the header
    if (result.valid) {
      valid.push(result.data)
    } else {
      invalid.push({ row: result.row, reason: result.reason })
    }
  }

  if (rawRows.length > MAX_ROWS) {
    invalid.unshift({
      row: 0,
      reason: `File has ${rawRows.length} rows — only the first ${MAX_ROWS} were processed`,
    })
  }

  return { valid, invalid, totalRows: rawRows.length }
}

function parseCsv(file: File): Promise<ParseResult> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => resolve(processRows(results.data as Record<string, unknown>[])),
      error: (err) => reject(new Error(`CSV parse error: ${err.message}`)),
    })
  })
}

async function parseXlsx(file: File): Promise<ParseResult> {
  // Dynamic import keeps xlsx out of the initial bundle — only loaded when
  // an XLSX file is actually selected.
  const XLSX = await import('xlsx')
  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: 'array' })
  const sheetName = workbook.SheetNames[0]
  if (!sheetName)
    return { valid: [], invalid: [{ row: 0, reason: 'XLSX has no sheets' }], totalRows: 0 }
  const sheet = workbook.Sheets[sheetName]
  if (!sheet)
    return { valid: [], invalid: [{ row: 0, reason: 'Could not read sheet' }], totalRows: 0 }
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' })
  return processRows(rows)
}

export function parseEmployeeFile(file: File): Promise<ParseResult> {
  const ext = file.name.split('.').pop()?.toLowerCase()
  if (ext === 'xlsx' || ext === 'xls') return parseXlsx(file)
  return parseCsv(file)
}

export const TEMPLATE_CSV =
  'full_name,momo_number,network,monthly_salary,start_date\nAma Owusu,0244123456,MTN,3000,2025-01-01\n'
