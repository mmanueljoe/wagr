import { type CreateEmployeeInput, createEmployeeSchema, parseGhs } from '@wagr/types'
import Papa from 'papaparse'

export interface CSVRow {
  full_name?: string
  momo_number?: string
  network?: string
  monthly_salary?: string
  start_date?: string
  [key: string]: string | undefined
}

export interface CSVParseResult {
  valid: CreateEmployeeInput[]
  errors: { row: number; reason: string }[]
}

export function parseEmployeeCSV(file: File): Promise<CSVParseResult> {
  return new Promise((resolve) => {
    Papa.parse<CSVRow>(file, {
      header: true,
      skipEmptyLines: 'greedy',
      complete: (results) => {
        const valid: CreateEmployeeInput[] = []
        const errors: { row: number; reason: string }[] = []

        if (results.data.length === 0) {
          resolve({ valid, errors: [{ row: 1, reason: 'The file contains no records.' }] })
          return
        }

        if (results.data.length > 500) {
          resolve({
            valid,
            errors: [
              { row: 0, reason: `Maximum 500 rows allowed, found ${results.data.length} rows.` },
            ],
          })
          return
        }

        // Helper to find key case-insensitively
        const findValue = (row: CSVRow, possibleKeys: string[]): string | undefined => {
          for (const key of Object.keys(row)) {
            if (possibleKeys.includes(key.trim().toLowerCase())) {
              return row[key]?.trim()
            }
          }
          return undefined
        }

        results.data.forEach((row, index) => {
          const rowNumber = index + 2 // 1-indexed header + 1-indexed data row

          const fullName = findValue(row, ['full_name', 'fullname', 'name'])
          const momoNumber = findValue(row, ['momo_number', 'momonumber', 'phone', 'mobile'])
          const networkRaw = findValue(row, ['network', 'provider', 'carrier'])
          const monthlySalaryRaw = findValue(row, ['monthly_salary', 'monthlysalary', 'salary'])
          const startDateRaw = findValue(row, ['start_date', 'startdate', 'date'])

          const missingFields: string[] = []
          if (!fullName) missingFields.push('full_name')
          if (!momoNumber) missingFields.push('momo_number')
          if (!networkRaw) missingFields.push('network')
          if (!monthlySalaryRaw) missingFields.push('monthly_salary')
          if (!startDateRaw) missingFields.push('start_date')

          if (!fullName || !momoNumber || !networkRaw || !monthlySalaryRaw || !startDateRaw) {
            errors.push({
              row: rowNumber,
              reason: `Missing required columns: ${missingFields.join(', ')}`,
            })
            return
          }

          // Clean momo number format
          let cleanMomo = momoNumber.replace(/\s+/g, '')
          if (cleanMomo.startsWith('+233')) {
            cleanMomo = `0${cleanMomo.slice(4)}`
          } else if (cleanMomo.startsWith('233')) {
            cleanMomo = `0${cleanMomo.slice(3)}`
          }

          // Network mapping
          let cleanNetwork: 'mtn' | 'telecel' | 'at' | undefined
          const netLower = networkRaw.toLowerCase().trim()
          if (['mtn', 'mtn ghana'].includes(netLower)) {
            cleanNetwork = 'mtn'
          } else if (['telecel', 'vodafone', 'telecel ghana'].includes(netLower)) {
            cleanNetwork = 'telecel'
          } else if (['airteltigo', 'at', 'airtel', 'tigo'].includes(netLower)) {
            cleanNetwork = 'at'
          }

          if (!cleanNetwork) {
            errors.push({
              row: rowNumber,
              reason: `Invalid network: "${networkRaw}". Must be MTN, Telecel, or AirtelTigo.`,
            })
            return
          }

          // Salary parsing
          const salaryPesewas = parseGhs(monthlySalaryRaw)
          if (salaryPesewas === null || salaryPesewas <= 0) {
            errors.push({
              row: rowNumber,
              reason: `Invalid monthly salary: "${monthlySalaryRaw}". Must be a positive number.`,
            })
            return
          }

          // Date format normalize (YYYY-MM-DD or DD/MM/YYYY)
          let dateStr = startDateRaw.trim()
          const slashParts = dateStr.split('/')
          if (slashParts.length === 3) {
            const [day, month, year] = slashParts
            if (day && month && year) {
              const dStr = day.padStart(2, '0')
              const mStr = month.padStart(2, '0')
              const yStr = year.length === 2 ? `20${year}` : year
              dateStr = `${yStr}-${mStr}-${dStr}`
            }
          }

          // Validate date pattern
          const dateMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/)
          if (!dateMatch) {
            errors.push({
              row: rowNumber,
              reason: `Invalid start date: "${startDateRaw}". Use YYYY-MM-DD or DD/MM/YYYY format.`,
            })
            return
          }

          const [_, year, month, day] = dateMatch
          const dateObj = new Date(Number(year), Number(month) - 1, Number(day))
          if (
            dateObj.getFullYear() !== Number(year) ||
            dateObj.getMonth() !== Number(month) - 1 ||
            dateObj.getDate() !== Number(day)
          ) {
            errors.push({
              row: rowNumber,
              reason: `Invalid start date: "${startDateRaw}" (does not exist).`,
            })
            return
          }

          const parsedObj = {
            full_name: fullName,
            momo_number: cleanMomo,
            network: cleanNetwork,
            monthly_salary_pesewas: salaryPesewas,
            start_date: dateStr,
          }

          // Verify with schema
          const validation = createEmployeeSchema.safeParse(parsedObj)
          if (!validation.success) {
            errors.push({
              row: rowNumber,
              reason: validation.error.errors[0]?.message ?? 'Invalid row data',
            })
            return
          }

          valid.push(validation.data)
        })

        resolve({ valid, errors })
      },
      error: (err) => {
        resolve({
          valid: [],
          errors: [{ row: 0, reason: `Failed to parse file: ${err.message}` }],
        })
      },
    })
  })
}
