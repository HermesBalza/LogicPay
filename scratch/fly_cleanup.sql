UPDATE Personal SET fecha_ingreso = '' WHERE COALESCE(fecha_ingreso, '') != '';
UPDATE Personal SET fecha_egreso = '' WHERE COALESCE(fecha_egreso, '') != '';
SELECT 'con_ingreso: ' || COUNT(*) FROM Personal WHERE COALESCE(fecha_ingreso, '') != '';
SELECT 'con_egreso: ' || COUNT(*) FROM Personal WHERE COALESCE(fecha_egreso, '') != '';
