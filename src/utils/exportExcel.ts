import * as XLSX from 'xlsx'
import type { IPerson } from '../api/familySearch.ts'

type Cell = string | number | boolean
type Row = Record<string, Cell>

// Keep only the scalar (string/number/boolean) top-level fields of a person;
// nested objects/arrays (e.g. nameConclusion) are skipped.
function personToRow(person: IPerson): Row {
  const row: Row = {}
  for (const [key, value] of Object.entries(person)) {
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      row[key] = value
    }
  }
  return row
}

// Build an .xlsx of all persons and trigger a browser download. The header is
// the union of scalar keys across rows, in first-seen order.
export function exportPersonsToExcel(
  persons: IPerson[],
  fileName = 'familysearch-contributions.xlsx',
): void {
  const rows = persons.map(personToRow)

  const header: string[] = []
  const seen = new Set<string>()
  for (const row of rows) {
    for (const key of Object.keys(row)) {
      if (!seen.has(key)) {
        seen.add(key)
        header.push(key)
      }
    }
  }

  const worksheet = XLSX.utils.json_to_sheet(rows, { header })
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Contributions')
  XLSX.writeFile(workbook, fileName)
}
