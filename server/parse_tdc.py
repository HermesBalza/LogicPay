import sys
import json
from numbers_parser import Document

def parse_tdc(filepath):
    doc = Document(filepath)
    sheet = doc.sheets[0]
    table = sheet.tables[0]

    headers = []
    for c in range(table.num_cols):
        cell = table.cell(0, c)
        headers.append(str(cell.value) if cell else '')

    transactions = []
    for r in range(table.num_header_rows, table.num_rows):
        row = {}
        for c in range(table.num_cols):
            cell = table.cell(r, c)
            value = cell.value if cell else ''
            if value is None:
                value = ''
            row[headers[c]] = str(value)
        # Limpiar 'None' strings
        if row.get('Memo') == 'None':
            row['Memo'] = ''
        if row.get('Category') == 'None':
            row['Category'] = ''
        transactions.append(row)

    print(json.dumps(transactions, ensure_ascii=False))

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print('[]')
        sys.exit(0)
    parse_tdc(sys.argv[1])
