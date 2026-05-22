const urls = {
  TIENDAS: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRmguU2NSjx_0AYEm-ii6-okYMAI0-6GduSKkFZwgiluFUXASsjtnwMpUkuWEFPoAwX7STMTBMfBUtg/pub?gid=0&single=true&output=csv',
  PERSONAL: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRmguU2NSjx_0AYEm-ii6-okYMAI0-6GduSKkFZwgiluFUXASsjtnwMpUkuWEFPoAwX7STMTBMfBUtg/pub?gid=866070317&single=true&output=csv',
  NOMINA_HISTORICO: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRmguU2NSjx_0AYEm-ii6-okYMAI0-6GduSKkFZwgiluFUXASsjtnwMpUkuWEFPoAwX7STMTBMfBUtg/pub?gid=1638753782&single=true&output=csv',
  NOMINA_DETALLE: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRmguU2NSjx_0AYEm-ii6-okYMAI0-6GduSKkFZwgiluFUXASsjtnwMpUkuWEFPoAwX7STMTBMfBUtg/pub?gid=2051911153&single=true&output=csv',
  PROYECTOS_ESPECIALES: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRmguU2NSjx_0AYEm-ii6-okYMAI0-6GduSKkFZwgiluFUXASsjtnwMpUkuWEFPoAwX7STMTBMfBUtg/pub?gid=1493142803&single=true&output=csv',
  WOS: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRmguU2NSjx_0AYEm-ii6-okYMAI0-6GduSKkFZwgiluFUXASsjtnwMpUkuWEFPoAwX7STMTBMfBUtg/pub?gid=2145273754&single=true&output=csv',
  VARIABLES: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRmguU2NSjx_0AYEm-ii6-okYMAI0-6GduSKkFZwgiluFUXASsjtnwMpUkuWEFPoAwX7STMTBMfBUtg/pub?gid=1498387162&single=true&output=csv',
  CSG_SERVICIOS: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRmguU2NSjx_0AYEm-ii6-okYMAI0-6GduSKkFZwgiluFUXASsjtnwMpUkuWEFPoAwX7STMTBMfBUtg/pub?gid=2143511492&single=true&output=csv',
  CSG_NOMINA: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRmguU2NSjx_0AYEm-ii6-okYMAI0-6GduSKkFZwgiluFUXASsjtnwMpUkuWEFPoAwX7STMTBMfBUtg/pub?gid=1084319831&single=true&output=csv',
  WOS_CSG: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRmguU2NSjx_0AYEm-ii6-okYMAI0-6GduSKkFZwgiluFUXASsjtnwMpUkuWEFPoAwX7STMTBMfBUtg/pub?gid=1138492526&single=true&output=csv',
  PERSONAL_ADMIN: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRmguU2NSjx_0AYEm-ii6-okYMAI0-6GduSKkFZwgiluFUXASsjtnwMpUkuWEFPoAwX7STMTBMfBUtg/pub?gid=1116522598&single=true&output=csv',
  ADMIN_NOMINA_HISTORICO: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRmguU2NSjx_0AYEm-ii6-okYMAI0-6GduSKkFZwgiluFUXASsjtnwMpUkuWEFPoAwX7STMTBMfBUtg/pub?gid=947149744&single=true&output=csv'
};

async function analyze() {
  let totalCells = 0;
  for (const [name, url] of Object.entries(urls)) {
    try {
      const res = await fetch(url);
      const csv = await res.text();
      
      // Parse CSV properly to handle newlines inside quotes
      let rows = 0;
      let maxCols = 0;
      let currentCols = 1;
      let inQuote = false;
      
      for(let i = 0; i < csv.length; i++) {
        if (csv[i] === '"') {
          inQuote = !inQuote;
        } else if (csv[i] === ',' && !inQuote) {
          currentCols++;
        } else if (csv[i] === '\n' && !inQuote) {
          rows++;
          if (currentCols > maxCols) maxCols = currentCols;
          currentCols = 1;
        }
      }
      // Add last row if it didn't end with a newline
      if (csv.length > 0 && csv[csv.length-1] !== '\n') {
          rows++;
          if (currentCols > maxCols) maxCols = currentCols;
      }

      if (rows === 0) {
        console.log(name + ': 0 lines');
        continue;
      }
      
      const cells = rows * maxCols;
      totalCells += cells;
      console.log(name + ': ' + rows + ' rows x ' + maxCols + ' cols = ' + cells + ' cells');
    } catch (err) {
      console.error('Error fetching ' + name, err);
    }
  }
  console.log('\nTotal Cells Occupied: ' + totalCells);
}

analyze();
