import sqlite3
c = sqlite3.connect('/app/data/database.db')
c.execute("UPDATE Personal SET fecha_ingreso = '' WHERE COALESCE(fecha_ingreso, '') != ''")
c.execute("UPDATE Personal SET fecha_egreso = '' WHERE COALESCE(fecha_egreso, '') != ''")
c.commit()
r1 = c.execute("SELECT COUNT(*) FROM Personal WHERE COALESCE(fecha_ingreso, '') != ''").fetchone()[0]
r2 = c.execute("SELECT COUNT(*) FROM Personal WHERE COALESCE(fecha_egreso, '') != ''").fetchone()[0]
print('con_ingreso:', r1)
print('con_egreso:', r2)
