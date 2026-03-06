/**
 * LogicPay Management System - Backend API (v2.1)
 * Google Apps Script
 */

const CONFIG = {
  SHEET_ID: 'YOUR_GOOGLE_SHEET_ID_HERE', 
  TABS: {
    STORES: 'Stores',
    EMPLOYEES: 'Employees',
    PAYROLL: 'Payroll_Cycles',
    HISTORICO: 'Nomina_Historico',
    LOGS: 'Logs'
  }
};

/**
 * Endpoint principal para recibir datos del Frontend
 */
function doPost(e) {
  try {
    const request = JSON.parse(e.postData.contents);
    const action = request.action;
    let response;

    switch (action) {
      case 'getStores':
        response = getTableData(CONFIG.TABS.STORES);
        break;
      case 'getEmployees':
        response = getTableData(CONFIG.TABS.EMPLOYEES);
        break;
      case 'processPayroll':
        response = processMultiStorePayroll(request.data);
        break;
      case 'saveStore':
        response = saveRecord(CONFIG.TABS.STORES, request.data);
        break;
      case 'saveEmployee':
        response = saveRecord(CONFIG.TABS.EMPLOYEES, request.data);
        break;
      default:
        throw new Error('Acción no reconocida: ' + action);
    }
    
    return createJsonResponse({ status: 'success', data: response });
    
  } catch (error) {
    return createJsonResponse({ status: 'error', message: error.toString() });
  }
}

function createJsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Obtener datos de cualquier tabla
 */
function getTableData(tabName) {
  const ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
  const sheet = ss.getSheetByName(tabName);
  if (!sheet) return [];
  
  const values = sheet.getDataRange().getValues();
  if (values.length < 1) return [];
  
  const headers = values[0];
  return values.slice(1).map(row => {
    const obj = {};
    headers.forEach((header, i) => obj[header] = row[i]);
    return obj;
  });
}

/**
 * Motor de cálculo multitienda con roles específicos
 */
function processMultiStorePayroll(payrollData) {
  const employees = getTableData(CONFIG.TABS.EMPLOYEES);
  const stores = getTableData(CONFIG.TABS.STORES);
  
  const employeesMap = {};
  employees.forEach(emp => employeesMap[emp.Nombre] = emp);
  
  const storesMap = {};
  stores.forEach(s => storesMap[s.Nombre] = s);

  const processed = payrollData.map(item => {
    const empInfo = employeesMap[item.empleado];
    if (!empInfo) return { ...item, error: 'Empleado no encontrado' };

    const storeInfo = storesMap[empInfo.Tienda];
    
    // Lógica de cálculo basada en cargo (Janitorial vs Utility)
    let rate = parseFloat(empInfo.TarifaHora) || 0;
    
    // Si el empleado no tiene tarifa fija, usamos la de la tienda según su cargo
    if (rate === 0 && storeInfo) {
      if (empInfo.Cargo === 'Janitorial') rate = parseFloat(storeInfo.Salario_Janitorial) || 0;
      else if (empInfo.Cargo === 'Utiliti') rate = parseFloat(storeInfo.Salario_Utiliti) || 0;
    }

    const regularPay = item.horasRegulares * rate;
    const overtimePay = item.horasExtra * rate * 1.5;
    const total = regularPay + overtimePay;

    return {
      ...item,
      tienda: empInfo.Tienda,
      cargo: empInfo.Cargo,
      tarifa: rate,
      totalPagar: total,
      alertaHoras: storeInfo && (item.horasRegulares + item.horasExtra > storeInfo.Max_Horas)
    };
  });

  return processed;
}

/**
 * Guardar o actualizar registro
 */
function saveRecord(tabName, data) {
  const ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
  const sheet = ss.getSheetByName(tabName);
  
  // Si los encabezados no existen, los creamos basados en el primer objeto
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(Object.keys(data));
  }
  
  sheet.appendRow(Object.values(data));
  return { message: 'Registro guardado exitosamente en ' + tabName };
}
