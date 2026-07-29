import sqlite3, subprocess
c = sqlite3.connect('/app/data/database.db')
c.execute('UPDATE Personal SET fecha_ingreso = '''' WHERE COALESCE(fecha_ingreso,'''')!=''''')
c.execute('UPDATE Personal SET fecha_egreso = '''' WHERE COALESCE(fecha_egreso,'''')!=''''')
c.commit()
print('ingreso:', c.execute('SELECT COUNT(*) FROM Personal WHERE COALESCE(fecha_ingreso,'''')!=''''').fetchone()[0])
print('egreso:', c.execute('SELECT COUNT(*) FROM Personal WHERE COALESCE(fecha_egreso,'''')!=''''').fetchone()[0])
c.close()
