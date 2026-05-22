const fs = require('fs');
const https = require('https');

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

function fetchCsv(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

async function analyze() {
  let totalCells = 0;
  for (const [name, url] of Object.entries(urls)) {
    try {
      const csv = await fetchCsv(url);
      const lines = csv.split('\n').filter(l => l.trim() !== '');
      if (lines.length === 0) {
        console.log(name + ': 0 lines');
        continue;
      }
      
      const maxCols = Math.max(...lines.map(l => l.split(',').length));
      const cells = lines.length * maxCols;
      totalCells += cells;
      console.log(name + ': ' + lines.length + ' rows x ' + maxCols + ' cols = ' + cells + ' cells');
    } catch (err) {
      console.error('Error fetching ' + name, err);
    }
  }
  console.log('\nTotal Cells Occupied: ' + totalCells);
}

analyze();
