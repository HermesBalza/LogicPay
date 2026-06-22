import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Search, Plus, X, Phone, Briefcase, Users, Building2, DollarSign, Calendar, CheckCircle, AlertCircle, Edit3, Trash2, Save, UserPlus, Upload, Download, Globe } from 'lucide-react';

const API_BASE = '/api/data';
const API_WRITE = '/api/write';

const ESTADOS_CANDIDATO = ['Nuevo', 'Contactado', 'Entrevistado', 'Contratado', 'Rechazado', 'No Interesado'];
const ESTADOS_PROYECTO = ['Cotizando', 'Cotizado', 'En Ejecucion', 'Completado', 'Cancelado'];
const ESTADOS_COTIZACION = ['Pendiente', 'Recibida', 'Aprobada', 'Rechazada'];
const FUENTES = ['Referencia', 'Anuncio', 'Redes Sociales', 'Web', 'Recomendación', 'Bolsa de Trabajo', 'Otro'];

const US_STATES = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware',
  'District of Columbia', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa',
  'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota',
  'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey',
  'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon',
  'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota', 'Tennessee', 'Texas', 'Utah',
  'Vermont', 'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming'
];

const US_CITIES = {
  'Alabama': ['Birmingham', 'Montgomery', 'Mobile', 'Huntsville', 'Tuscaloosa'],
  'Alaska': ['Anchorage', 'Fairbanks', 'Juneau', 'Sitka', 'Ketchikan'],
  'Arizona': ['Phoenix', 'Tucson', 'Mesa', 'Chandler', 'Scottsdale', 'Glendale', 'Tempe'],
  'Arkansas': ['Little Rock', 'Fort Smith', 'Fayetteville', 'Springdale', 'Jonesboro'],
  'California': ['Los Angeles', 'San Diego', 'San Jose', 'San Francisco', 'Fresno', 'Sacramento', 'Long Beach', 'Oakland', 'Bakersfield', 'Anaheim', 'Santa Ana', 'Riverside', 'Stockton', 'Irvine', 'Chula Vista', 'Fremont', 'Santa Clarita', 'San Bernardino', 'Modesto', 'Fontana', 'Moreno Valley', 'Oxnard', 'Huntington Beach', 'Glendale', 'Ontario', 'Rancho Cucamonga', 'Oceanside', 'Garden Grove'],
  'Colorado': ['Denver', 'Colorado Springs', 'Aurora', 'Fort Collins', 'Lakewood', 'Thornton', 'Arvada', 'Westminster', 'Pueblo', 'Boulder'],
  'Connecticut': ['Bridgeport', 'New Haven', 'Stamford', 'Hartford', 'Waterbury', 'Norwalk', 'Danbury'],
  'Delaware': ['Wilmington', 'Dover', 'Newark', 'Middletown', 'Smyrna'],
  'District of Columbia': ['Washington'],
  'Florida': ['Miami', 'Orlando', 'Tampa', 'Jacksonville', 'Fort Lauderdale', 'Tallahassee', 'St. Petersburg', 'Hialeah', 'Port St. Lucie', 'Cape Coral', 'Pembroke Pines', 'Hollywood', 'Miramar', 'Gainesville', 'Coral Springs', 'Clearwater', 'Miami Gardens', 'Palm Bay', 'West Palm Beach', 'Lakeland', 'Davie', 'Boca Raton'],
  'Georgia': ['Atlanta', 'Augusta', 'Columbus', 'Savannah', 'Athens', 'Sandy Springs', 'Macon', 'Roswell', 'Johns Creek', 'Albany'],
  'Hawaii': ['Honolulu', 'Hilo', 'Kailua', 'Kapolei', 'Kaneohe', 'Pearl City', 'Waipahu', 'Mililani', 'Kahului'],
  'Idaho': ['Boise', 'Meridian', 'Nampa', 'Idaho Falls', 'Pocatello', 'Caldwell', "Coeur d'Alene"],
  'Illinois': ['Chicago', 'Aurora', 'Rockford', 'Joliet', 'Naperville', 'Springfield', 'Peoria', 'Elgin', 'Waukegan', 'Champaign', 'Bloomington', 'Decatur', 'Evanston', 'Schaumburg', 'Arlington Heights'],
  'Indiana': ['Indianapolis', 'Fort Wayne', 'Evansville', 'South Bend', 'Carmel', 'Fishers', 'Bloomington', 'Hammond', 'Gary', 'Lafayette'],
  'Iowa': ['Des Moines', 'Cedar Rapids', 'Davenport', 'Sioux City', 'Iowa City', 'Waterloo', 'Ames', 'West Des Moines', 'Council Bluffs', 'Ankeny'],
  'Kansas': ['Wichita', 'Overland Park', 'Kansas City', 'Olathe', 'Topeka', 'Lawrence', 'Shawnee', 'Manhattan', 'Lenexa', 'Salina'],
  'Kentucky': ['Louisville', 'Lexington', 'Bowling Green', 'Owensboro', 'Covington', 'Richmond', 'Georgetown', 'Florence', 'Hopkinsville', 'Nicholasville'],
  'Louisiana': ['New Orleans', 'Baton Rouge', 'Shreveport', 'Lafayette', 'Lake Charles', 'Kenner', 'Bossier City', 'Monroe', 'Alexandria', 'Houma'],
  'Maine': ['Portland', 'Lewiston', 'Bangor', 'South Portland', 'Auburn', 'Biddeford', 'Sanford', 'Saco', 'Augusta', 'Westbrook'],
  'Maryland': ['Baltimore', 'Columbia', 'Germantown', 'Silver Spring', 'Waldorf', 'Glen Burnie', 'Ellicott City', 'Frederick', 'Dundalk', 'Rockville', 'Bethesda', 'Gaithersburg', 'Bowie'],
  'Massachusetts': ['Boston', 'Worcester', 'Springfield', 'Cambridge', 'Lowell', 'Brockton', 'Quincy', 'Lynn', 'New Bedford', 'Fall River', 'Lawrence', 'Newton', 'Somerville', 'Framingham'],
  'Michigan': ['Detroit', 'Grand Rapids', 'Warren', 'Sterling Heights', 'Ann Arbor', 'Lansing', 'Flint', 'Dearborn', 'Livonia', 'Troy', 'Westland', 'Farmington Hills', 'Kalamazoo', 'Wyoming', 'Rochester Hills', 'Southfield'],
  'Minnesota': ['Minneapolis', 'Saint Paul', 'Rochester', 'Duluth', 'Bloomington', 'Brooklyn Park', 'Plymouth', 'St. Cloud', 'Lakeville', 'Woodbury', 'Maple Grove', 'Eagan', 'Eden Prairie', 'Coon Rapids', 'Burnsville', 'Blaine'],
  'Mississippi': ['Jackson', 'Gulfport', 'Southaven', 'Hattiesburg', 'Biloxi', 'Meridian', 'Tupelo', 'Olive Branch', 'Greenville', 'Horn Lake'],
  'Missouri': ['Kansas City', 'St. Louis', 'Springfield', 'Columbia', 'Independence', 'Lee\'s Summit', "O'Fallon", 'St. Charles', 'St. Joseph', 'Blue Springs', 'St. Peters', 'Joplin', 'Florissant', 'Chesterfield'],
  'Montana': ['Billings', 'Missoula', 'Great Falls', 'Bozeman', 'Butte', 'Helena', 'Kalispell', 'Belgrade', 'Havre', 'Anaconda'],
  'Nebraska': ['Omaha', 'Lincoln', 'Bellevue', 'Grand Island', 'Kearney', 'Fremont', 'Hastings', 'Norfolk', 'North Platte', 'Columbus'],
  'Nevada': ['Las Vegas', 'Henderson', 'Reno', 'North Las Vegas', 'Sparks', 'Carson City', 'Elko', 'Boulder City', 'Mesquite', 'Fernley'],
  'New Hampshire': ['Manchester', 'Nashua', 'Concord', 'Derry', 'Dover', 'Rochester', 'Salem', 'Merrimack', 'Hudson', 'Londonderry'],
  'New Jersey': ['Newark', 'Jersey City', 'Paterson', 'Elizabeth', 'Trenton', 'Clifton', 'Camden', 'Passaic', 'Union City', 'Bayonne', 'East Orange', 'Vineland', 'New Brunswick', 'Hoboken', 'Perth Amboy', 'West New York'],
  'New Mexico': ['Albuquerque', 'Las Cruces', 'Rio Rancho', 'Santa Fe', 'Roswell', 'Farmington', 'Clovis', 'Hobbs', 'Alamogordo', 'Carlsbad'],
  'New York': ['New York City', 'Buffalo', 'Rochester', 'Yonkers', 'Syracuse', 'Albany', 'New Rochelle', 'Mount Vernon', 'Schenectady', 'Utica', 'White Plains', 'Hempstead', 'Troy', 'Niagara Falls', 'Binghamton', 'Freeport', 'Valley Stream', 'Long Beach', 'Spring Valley', 'Poughkeepsie'],
  'North Carolina': ['Charlotte', 'Raleigh', 'Greensboro', 'Durham', 'Winston-Salem', 'Fayetteville', 'Cary', 'Wilmington', 'High Point', 'Concord', 'Greenville', 'Asheville', 'Gastonia', 'Jacksonville', 'Chapel Hill', 'Burlington', 'Huntersville', 'Apex'],
  'North Dakota': ['Fargo', 'Bismarck', 'Grand Forks', 'Minot', 'West Fargo', 'Williston', 'Dickinson', 'Mandan', 'Jamestown', 'Wahpeton'],
  'Ohio': ['Columbus', 'Cleveland', 'Cincinnati', 'Toledo', 'Akron', 'Dayton', 'Parma', 'Canton', 'Youngstown', 'Lorain', 'Hamilton', 'Springfield', 'Kettering', 'Elyria', 'Lakewood', 'Newark', 'Mentor', 'Cuyahoga Falls', 'Middletown', 'Dublin'],
  'Oklahoma': ['Oklahoma City', 'Tulsa', 'Norman', 'Broken Arrow', 'Edmond', 'Lawton', 'Moore', 'Midwest City', 'Enid', 'Stillwater', 'Muskogee', 'Bartlesville', 'Owasso', 'Shawnee'],
  'Oregon': ['Portland', 'Salem', 'Eugene', 'Gresham', 'Hillsboro', 'Beaverton', 'Bend', 'Medford', 'Springfield', 'Corvallis', 'Albany', 'Tigard', 'Lake Oswego', 'Keizer'],
  'Pennsylvania': ['Philadelphia', 'Pittsburgh', 'Allentown', 'Erie', 'Reading', 'Scranton', 'Bethlehem', 'Lancaster', 'Harrisburg', 'York', 'Wilkes-Barre', 'Chester', 'Williamsport', 'Easton', 'Lebanon', 'Hazleton', 'New Castle', 'Johnstown', 'Altoona'],
  'Rhode Island': ['Providence', 'Warwick', 'Cranston', 'Pawtucket', 'East Providence', 'Woonsocket', 'Newport', 'Central Falls', 'Westerly', 'Cumberland'],
  'South Carolina': ['Columbia', 'Charleston', 'North Charleston', 'Mount Pleasant', 'Rock Hill', 'Greenville', 'Summerville', 'Goose Creek', 'Sumter', 'Florence', 'Spartanburg', 'Hilton Head Island', 'Myrtle Beach', 'Aiken', 'Anderson'],
  'South Dakota': ['Sioux Falls', 'Rapid City', 'Aberdeen', 'Brookings', 'Watertown', 'Mitchell', 'Yankton', 'Pierre', 'Huron', 'Spearfish'],
  'Tennessee': ['Nashville', 'Memphis', 'Knoxville', 'Chattanooga', 'Clarksville', 'Murfreesboro', 'Franklin', 'Jackson', 'Johnson City', 'Bartlett', 'Hendersonville', 'Kingsport', 'Collierville', 'Cleveland', 'Brentwood', 'Germantown'],
  'Texas': ['Houston', 'San Antonio', 'Dallas', 'Austin', 'Fort Worth', 'El Paso', 'Arlington', 'Corpus Christi', 'Plano', 'Laredo', 'Lubbock', 'Garland', 'Irving', 'Amarillo', 'Grand Prairie', 'Brownsville', 'Pasadena', 'McKinney', 'Mesquite', 'McAllen', 'Killeen', 'Frisco', 'Waco', 'Carrollton', 'Midland', 'Abilene', 'Pearland', 'Round Rock', 'College Station', 'The Woodlands', 'Richardson', 'Beaumont', 'Odessa', 'Sugar Land', 'Tyler', 'Lewisville', 'Wichita Falls', 'Allen', 'San Angelo', 'League City'],
  'Utah': ['Salt Lake City', 'West Valley City', 'Provo', 'West Jordan', 'Orem', 'Sandy', 'Ogden', 'St. George', 'Layton', 'South Jordan', 'Lehi', 'Millcreek', 'Taylorsville', 'Logan', 'Murray'],
  'Vermont': ['Burlington', 'South Burlington', 'Rutland', 'Essex', 'Barre', 'Montpelier', 'Winooski', 'St. Albans', 'Newport', 'Brattleboro'],
  'Virginia': ['Virginia Beach', 'Norfolk', 'Chesapeake', 'Richmond', 'Newport News', 'Alexandria', 'Hampton', 'Roanoke', 'Portsmouth', 'Suffolk', 'Lynchburg', 'Harrisonburg', 'Charlottesville', 'Danville', 'Manassas', 'Leesburg', 'Blacksburg', 'Fairfax'],
  'Washington': ['Seattle', 'Spokane', 'Tacoma', 'Vancouver', 'Bellevue', 'Kent', 'Everett', 'Renton', 'Spokane Valley', 'Federal Way', 'Yakima', 'Kirkland', 'Bellingham', 'Kennewick', 'Auburn', 'Pasco', 'Redmond', 'Marysville', 'Sammamish', 'Lakewood'],
  'West Virginia': ['Charleston', 'Huntington', 'Morgantown', 'Parkersburg', 'Wheeling', 'Weirton', 'Fairmont', 'Martinsburg', 'Beckley', 'Clarksburg'],
  'Wisconsin': ['Milwaukee', 'Madison', 'Green Bay', 'Kenosha', 'Racine', 'Appleton', 'Waukesha', 'Oshkosh', 'Eau Claire', 'Janesville', 'West Allis', 'La Crosse', 'Sheboygan', 'Wauwatosa', 'Fond du Lac', 'New Berlin', 'Brookfield'],
  'Wyoming': ['Cheyenne', 'Casper', 'Laramie', 'Gillette', 'Rock Springs', 'Sheridan', 'Green River', 'Evanston', 'Riverton', 'Jackson']
};

const toMMDDYYYY = (isoStr) => {
  if (!isoStr) return '';
  const match = isoStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) return `${match[2]}/${match[3]}/${match[1]}`;
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(isoStr)) return isoStr;
  return isoStr;
};

const formatDateInput = (value) => {
  const clean = value.replace(/\D/g, '');
  let r = clean;
  if (clean.length > 2) r = clean.slice(0, 2) + '/' + clean.slice(2);
  if (clean.length > 4) r = clean.slice(0, 2) + '/' + clean.slice(2, 4) + '/' + clean.slice(4, 8);
  return r;
};

const toISOFormat = (mmddStr) => {
  if (!mmddStr) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(mmddStr)) return mmddStr;
  const parts = mmddStr.split('/');
  if (parts.length === 3) return `${parts[2]}-${parts[0].padStart(2,'0')}-${parts[1].padStart(2,'0')}`;
  return mmddStr;
};

const BADGE_CLASSES = {
  'Nuevo': 'bg-blue-50 text-blue-600 border-blue-100',
  'Contactado': 'bg-amber-50 text-amber-600 border-amber-100',
  'Entrevistado': 'bg-purple-50 text-purple-600 border-purple-100',
  'Contratado': 'bg-[#6bbdb7]/10 text-[#6bbdb7] border-[#6bbdb7]/20',
  'Rechazado': 'bg-red-50 text-red-600 border-red-100',
  'No Interesado': 'bg-gray-50 text-gray-400 border-gray-100',
  'Cotizando': 'bg-amber-50 text-amber-600 border-amber-100',
  'Cotizado': 'bg-purple-50 text-purple-600 border-purple-100',
  'En Ejecucion': 'bg-[#6bbdb7]/10 text-[#6bbdb7] border-[#6bbdb7]/20',
  'Completado': 'bg-green-50 text-green-600 border-green-100',
  'Cancelado': 'bg-red-50 text-red-600 border-red-100',
  'Pendiente': 'bg-blue-50 text-blue-600 border-blue-100',
  'Recibida': 'bg-amber-50 text-amber-600 border-amber-100',
  'Aprobada': 'bg-green-50 text-green-600 border-green-100',
  'Rechazada': 'bg-red-50 text-red-600 border-red-100',
};

function Badge({ estado }) {
  const cls = BADGE_CLASSES[estado] || 'bg-gray-50 text-gray-400 border-gray-100';
  return <span className={`inline-block px-2.5 py-1 rounded-full border text-[9px] font-black uppercase tracking-widest ${cls}`}>{estado}</span>;
}

const inputCls = 'w-full bg-[#f9f9f9] border-2 border-gray-100 rounded-2xl px-5 py-4 text-sm font-bold text-[#303a7f] outline-none focus:border-[#6bbdb7] transition-all placeholder:text-gray-300';
const selectCls = 'w-full bg-[#f9f9f9] border-2 border-gray-100 rounded-2xl px-5 py-4 text-sm font-bold text-[#303a7f] outline-none focus:border-[#6bbdb7] transition-all appearance-none cursor-pointer';

const ModalOverlay = ({ children, onClose, className = '' }) => (
  <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={onClose}>
    <div className="absolute inset-0 bg-[#303a7f]/20 backdrop-blur-sm animate-in fade-in duration-300" />
    <div className={`relative w-full max-w-2xl bg-white rounded-[2.5rem] shadow-2xl animate-in zoom-in-95 duration-300 flex flex-col max-h-[85vh] overflow-hidden ${className}`} onClick={e => e.stopPropagation()}>
      {children}
    </div>
  </div>
);

export default function CRMView({ currentUser, pendingCandidatoId, onClearPendingCandidato, pendingProveedorId, onClearPendingProveedor, onCandidatoContratado }) {
  const [activeTab, setActiveTab] = useState('candidatos');
  const [proveedoresSubTab, setProveedoresSubTab] = useState('proyectos');

  // Data states
  const [candidatos, setCandidatos] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [proyectos, setProyectos] = useState([]);
  const [cotizaciones, setCotizaciones] = useState([]);
  const [stores, setStores] = useState([]);

  // UI states
  const [searchCandidato, setSearchCandidato] = useState('');
  const [filterEstadoCandidato, setFilterEstadoCandidato] = useState('');
  const [searchProveedor, setSearchProveedor] = useState('');
  const [filterProveedorEstado, setFilterProveedorEstado] = useState('');
  const [filterProveedorCiudad, setFilterProveedorCiudad] = useState('');
  const [searchProyecto, setSearchProyecto] = useState('');

  // Modal states
  const [selectedCandidato, setSelectedCandidato] = useState(null);
  const [selectedProveedor, setSelectedProveedor] = useState(null);
  const [selectedProyecto, setSelectedProyecto] = useState(null);
  const [showNewCandidato, setShowNewCandidato] = useState(false);
  const [showNewProveedor, setShowNewProveedor] = useState(false);
  const [showNewProyecto, setShowNewProyecto] = useState(false);
  const [showNewCotizacion, setShowNewCotizacion] = useState(false);
  const [selectedCotizacion, setSelectedCotizacion] = useState(null);
  const [showBuscarProveedores, setShowBuscarProveedores] = useState(false);
  const [buscando, setBuscando] = useState(false);
  const [resultadosBusqueda, setResultadosBusqueda] = useState([]);

  // Sidebar resizable state
  const [sidebarWidth, setSidebarWidth] = useState('20%');
  const isDraggingRef = useRef(false);

  // Registrar llamada states
  const [showRegistrarLlamada, setShowRegistrarLlamada] = useState(false);
  const [llamadaContext, setLlamadaContext] = useState('candidato');
  const [llamadaTipo, setLlamadaTipo] = useState('');
  const [llamadaNota, setLlamadaNota] = useState('');

  // Form states
  const [formCandidato, setFormCandidato] = useState({ nombre: '', telefono: '', email: '', direccion: '', fecha_contacto: '', estado: 'Nuevo', ultima_llamada: '', proxima_llamada: '', notas: '', fuente: '', creado_por: '' });
  const [formProveedor, setFormProveedor] = useState({ nombre: '', contacto: '', telefono: '', email: '', especialidad: '', estado: '', ciudad: '', ultima_llamada: '', proxima_llamada: '', notas: '', creado_por: '' });
  const [formProyecto, setFormProyecto] = useState({ nombre: '', tienda: '', cliente: 'KBS', descripcion: '', fecha_solicitud: '', estado: 'Cotizando', notas: '' });
  const [formCotizacion, setFormCotizacion] = useState({ proveedor_id: '', monto: '', fecha_cotizacion: '', estado: 'Recibida', notas: '' });
  const [formBuscarProveedores, setFormBuscarProveedores] = useState({ estado: '', ciudad: '', descripcion: '' });
  const [fileUploading, setFileUploading] = useState(false);

  const [notification, setNotification] = useState({ show: false, message: '', type: '' });
  const [deleteConfirm, setDeleteConfirm] = useState({ show: false, message: '', onConfirm: null });

  // Fetch all data
  const fetchData = useCallback(async () => {
    try {
      const [cRes, pRes, prRes, ctzRes, sRes] = await Promise.all([
        fetch(`${API_BASE}/CRM_Candidatos`),
        fetch(`${API_BASE}/CRM_Proveedores`),
        fetch(`${API_BASE}/CRM_Proyectos`),
        fetch(`${API_BASE}/CRM_Cotizaciones`),
        fetch(`${API_BASE}/Tiendas`),
      ]);
      if (cRes.ok) setCandidatos(await cRes.json());
      if (pRes.ok) setProveedores(await pRes.json());
      if (prRes.ok) setProyectos(await prRes.json());
      if (ctzRes.ok) setCotizaciones(await ctzRes.json());
      if (sRes.ok) setStores(await sRes.json());
    } catch (e) {
      console.error('Error fetching CRM data:', e);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (pendingCandidatoId) {
      const c = candidatos.find(c => c.id === pendingCandidatoId);
      if (c) {
        setSelectedCandidato(c);
        setFormCandidato({ ...c });
        setShowNewCandidato(false);
        onClearPendingCandidato();
      }
    }
  }, [pendingCandidatoId, candidatos, onClearPendingCandidato]);

  useEffect(() => {
    if (pendingProveedorId) {
      const p = proveedores.find(p => p.id === pendingProveedorId);
      if (p) {
        handleEditProveedor(p);
        setActiveTab('proveedores');
        setProveedoresSubTab('proveedores');
        onClearPendingProveedor();
      }
    }
  }, [pendingProveedorId, proveedores, onClearPendingProveedor]);

  const openFileFromBase64 = (dataUrl) => {
    try {
      const [header, base64] = dataUrl.split(',');
      const mimeMatch = header.match(/:(.*?);/);
      if (!mimeMatch) throw new Error('MIME type no encontrado');
      const mimeType = mimeMatch[1];
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: mimeType });
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, '_blank', 'noopener,noreferrer');
    } catch (e) {
      console.error('Error opening file:', e);
    }
  };

  const showNotif = (message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: '', type: '' }), 3000);
  };

  const syncToDatabase = async (action, data, sheetName, matchKeys = []) => {
    try {
      const res = await fetch(API_WRITE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, data, sheetName, matchKeys, userId: currentUser?.id, userName: currentUser?.nombre })
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      console.error('Error syncing to database:', e);
      showNotif('Error al guardar en la base de datos', 'error');
      return null;
    }
  };

  // ─── CANDIDATES ───────────────────────────────────────

  const resetFormCandidato = () => setFormCandidato({ nombre: '', telefono: '', email: '', direccion: '', fecha_contacto: toMMDDYYYY(new Date().toISOString().split('T')[0]), estado: 'Nuevo', ultima_llamada: '', proxima_llamada: '', notas: '', fuente: '', creado_por: '' });

  const handleNewCandidato = () => { resetFormCandidato(); setShowNewCandidato(true); };

  const handleEditCandidato = (c) => {
    setFormCandidato({ nombre: c.nombre || '', telefono: c.telefono || '', email: c.email || '', direccion: c.direccion || '', fecha_contacto: toMMDDYYYY(c.fecha_contacto || ''), estado: c.estado || 'Nuevo', ultima_llamada: toMMDDYYYY(c.ultima_llamada || ''), proxima_llamada: toMMDDYYYY(c.proxima_llamada || ''), notas: c.notas || '', fuente: c.fuente || '', creado_por: c.creado_por || '' });
    setSelectedCandidato(c);
  };

  const saveCandidato = async () => {
    if (!formCandidato.nombre.trim()) { showNotif('El nombre es obligatorio', 'error'); return; }
    const data = { ...formCandidato };
    const now = new Date().toISOString();
    data.updated_at = now;

    if (selectedCandidato) {
      data.id = selectedCandidato.id;
      if (formCandidato.estado === 'Contratado' && selectedCandidato._creado_en_personal !== '1' && selectedCandidato._pendiente_en_personal !== '1') {
        data._pendiente_en_personal = '1';
      }
      const res = await syncToDatabase('upsert', data, 'CRM_Candidatos', ['id']);
      if (res?.success) {
        if (formCandidato.estado === 'Contratado' && selectedCandidato._creado_en_personal !== '1') {
          onCandidatoContratado?.();
        }
        showNotif(formCandidato.estado === 'Contratado' && selectedCandidato._creado_en_personal !== '1' ? 'Candidato contratado. Ve a Gestión de Personal para registrarlo como empleado.' : 'Candidato actualizado exitosamente');
        fetchData();
        setSelectedCandidato(null);
      }
    } else {
      data.fecha_contacto = data.fecha_contacto || toMMDDYYYY(new Date().toISOString().split('T')[0]);
      data.created_at = now;
      data.creado_por = currentUser?.nombre || '';
      const res = await syncToDatabase('upsert', data, 'CRM_Candidatos');
      if (res?.success) {
        showNotif('Candidato creado exitosamente');
        fetchData();
        setShowNewCandidato(false);
        setSelectedCandidato(null);
      }
    }
  };

  const registrarLlamada = (tipo = 'candidato') => {
    if (tipo === 'candidato' && !selectedCandidato) return;
    if (tipo === 'proveedor' && !selectedProveedor) return;
    setLlamadaContext(tipo);
    setLlamadaTipo('');
    setLlamadaNota('');
    setShowRegistrarLlamada(true);
  };

  const saveRegistroLlamada = async () => {
    if (!llamadaTipo) { showNotif('Seleccione el tipo de interacción', 'error'); return; }
    const now = new Date();
    const dateStr = toMMDDYYYY(now.toISOString().split('T')[0]);
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    const entry = `\n[${dateStr} ${timeStr}] ${llamadaTipo}` + (llamadaNota.trim() ? ` - ${llamadaNota.trim()}` : '');
    const isCandidato = llamadaContext === 'candidato';
    const entity = isCandidato ? selectedCandidato : selectedProveedor;
    const formNotas = isCandidato ? formCandidato.notas : formProveedor.notas;
    const sheetName = isCandidato ? 'CRM_Candidatos' : 'CRM_Proveedores';
    const formSetter = isCandidato ? setFormCandidato : setFormProveedor;
    const data = {
      id: entity.id,
      ultima_llamada: dateStr,
      notas: (formNotas || '') + entry,
      updated_at: now.toISOString(),
    };
    const res = await syncToDatabase('upsert', data, sheetName, ['id']);
    if (res?.success) {
      showNotif('Llamada registrada exitosamente');
      formSetter(f => ({ ...f, notas: (f.notas || '') + entry, ultima_llamada: dateStr }));
      fetchData();
      setShowRegistrarLlamada(false);
    }
  };

  const deleteCandidato = async (c) => {
    const res = await syncToDatabase('delete', { id: c.id }, 'CRM_Candidatos', ['id']);
    if (res?.success) {
      showNotif('Candidato eliminado');
      fetchData();
      setSelectedCandidato(null);
    }
  };

  const filteredCandidatos = useMemo(() => {
    return candidatos.filter(c => {
      const matchSearch = !searchCandidato || c.nombre?.toLowerCase().includes(searchCandidato.toLowerCase()) || c.telefono?.includes(searchCandidato);
      const matchEstado = !filterEstadoCandidato || c.estado === filterEstadoCandidato;
      return matchSearch && matchEstado;
    });
  }, [candidatos, searchCandidato, filterEstadoCandidato]);

  // ─── PROVIDERS ────────────────────────────────────────

  const resetFormProveedor = () => setFormProveedor({ nombre: '', contacto: '', telefono: '', email: '', especialidad: '', estado: '', ciudad: '', ultima_llamada: '', proxima_llamada: '', notas: '', creado_por: '' });

  const handleNewProveedor = () => { resetFormProveedor(); setShowNewProveedor(true); };

  const handleEditProveedor = (p) => {
    setFormProveedor({ nombre: p.nombre || '', contacto: p.contacto || '', telefono: p.telefono || '', email: p.email || '', especialidad: p.especialidad || '', estado: p.estado || '', ciudad: p.ciudad || '', ultima_llamada: toMMDDYYYY(p.ultima_llamada || ''), proxima_llamada: toMMDDYYYY(p.proxima_llamada || ''), notas: p.notas || '', creado_por: p.creado_por || '' });
    setSelectedProveedor(p);
  };

  const saveProveedor = async () => {
    if (!formProveedor.nombre.trim()) { showNotif('El nombre del proveedor es obligatorio', 'error'); return; }
    const data = { ...formProveedor, updated_at: new Date().toISOString() };
    if (selectedProveedor) {
      data.id = selectedProveedor.id;
      const res = await syncToDatabase('upsert', data, 'CRM_Proveedores', ['id']);
      if (res?.success) { showNotif('Proveedor actualizado'); fetchData(); setSelectedProveedor(null); }
    } else {
      data.created_at = new Date().toISOString();
      data.creado_por = currentUser?.nombre || '';
      const res = await syncToDatabase('upsert', data, 'CRM_Proveedores');
      if (res?.success) { showNotif('Proveedor creado'); fetchData(); setShowNewProveedor(false); }
    }
  };

  const deleteProveedor = async (p) => {
    const res = await syncToDatabase('delete', { id: p.id }, 'CRM_Proveedores', ['id']);
    if (res?.success) { showNotif('Proveedor eliminado'); fetchData(); setSelectedProveedor(null); }
  };

  const filteredProveedores = useMemo(() => {
    return proveedores.filter(p => {
      const matchSearch = !searchProveedor || p.nombre?.toLowerCase().includes(searchProveedor.toLowerCase()) || p.contacto?.toLowerCase().includes(searchProveedor.toLowerCase()) || p.especialidad?.toLowerCase().includes(searchProveedor.toLowerCase());
      const matchEstado = !filterProveedorEstado || p.estado === filterProveedorEstado;
      const matchCiudad = !filterProveedorCiudad || p.ciudad?.toLowerCase().includes(filterProveedorCiudad.toLowerCase());
      return matchSearch && matchEstado && matchCiudad;
    });
  }, [proveedores, searchProveedor, filterProveedorEstado, filterProveedorCiudad]);

  // ─── PROJECTS ─────────────────────────────────────────

  const resetFormProyecto = () => setFormProyecto({ nombre: '', tienda: '', cliente: 'KBS', descripcion: '', fecha_solicitud: toMMDDYYYY(new Date().toISOString().split('T')[0]), estado: 'Cotizando', notas: '' });

  const handleNewProyecto = () => { resetFormProyecto(); setShowNewProyecto(true); };

  const handleEditProyecto = (p) => {
    setFormProyecto({ nombre: p.nombre || '', tienda: p.tienda || '', cliente: p.cliente || 'KBS', descripcion: p.descripcion || '', fecha_solicitud: toMMDDYYYY(p.fecha_solicitud || ''), estado: p.estado || 'Cotizando', notas: p.notas || '' });
    setSelectedProyecto(p);
  };

  const saveProyecto = async () => {
    if (!formProyecto.nombre.trim()) { showNotif('El nombre del proyecto es obligatorio', 'error'); return; }
    const data = { ...formProyecto, updated_at: new Date().toISOString() };
    if (selectedProyecto) {
      data.id = selectedProyecto.id;
      const res = await syncToDatabase('upsert', data, 'CRM_Proyectos', ['id']);
      if (res?.success) { showNotif('Proyecto actualizado'); fetchData(); setSelectedProyecto(null); }
    } else {
      data.created_at = new Date().toISOString();
      const res = await syncToDatabase('upsert', data, 'CRM_Proyectos');
      if (res?.success) { showNotif('Proyecto creado'); fetchData(); setShowNewProyecto(false); }
    }
  };

  const selectBestProvider = async (proyecto, proveedorId) => {
    const data = { id: proyecto.id, proveedor_seleccionado_id: proveedorId, estado: 'En Ejecucion', updated_at: new Date().toISOString() };
    const res = await syncToDatabase('upsert', data, 'CRM_Proyectos', ['id']);
    if (res?.success) {
      // Mark the selected quote as approved
      const ctzs = cotizaciones.filter(c => c.proyecto_id === proyecto.id && c.proveedor_id === proveedorId);
      for (const c of ctzs) {
        await syncToDatabase('upsert', { id: c.id, estado: 'Aprobada', updated_at: new Date().toISOString() }, 'CRM_Cotizaciones', ['id']);
      }
      showNotif('Proveedor seleccionado. Proyecto en ejecución.');
      fetchData();
    }
  };

  const deleteProyecto = async (p) => {
    await syncToDatabase('delete', { proyecto_id: p.id }, 'CRM_Cotizaciones', ['proyecto_id']);
    const res = await syncToDatabase('delete', { id: p.id }, 'CRM_Proyectos', ['id']);
    if (res?.success) { showNotif('Proyecto eliminado'); fetchData(); setSelectedProyecto(null); }
  };

  // ─── QUOTES ─────────────────────────────────────────

  const resetFormCotizacion = (proyectoId) => setFormCotizacion({ proveedor_id: '', monto: '', fecha_cotizacion: toMMDDYYYY(new Date().toISOString().split('T')[0]), estado: 'Recibida', notas: '', archivo: '', _archivo_nombre: '', _proyecto_id: proyectoId });

  const handleNewCotizacion = (proyectoId) => { resetFormCotizacion(proyectoId); setShowNewCotizacion(true); };

  const deleteCotizacion = async (ctz) => {
    const res = await syncToDatabase('delete', { id: ctz.id }, 'CRM_Cotizaciones', ['id']);
    if (res?.success) { showNotif('Cotización eliminada'); fetchData(); }
  };

  const handleEditCotizacion = (ctz, e) => {
    if (e) e.stopPropagation();
    setFormCotizacion({
      proveedor_id: String(ctz.proveedor_id),
      monto: ctz.monto ? String(ctz.monto) : '',
      fecha_cotizacion: toMMDDYYYY(ctz.fecha_cotizacion || ''),
      estado: ctz.estado || 'Recibida',
      notas: ctz.notas || '',
      archivo: ctz.archivo || '',
      _archivo_nombre: '',
      _proyecto_id: ctz.proyecto_id,
    });
    setSelectedCotizacion(ctz);
    setShowNewCotizacion(true);
  };

  const saveCotizacion = async () => {
    if (!formCotizacion.proveedor_id) { showNotif('Seleccione un proveedor', 'error'); return; }
    const data = {
      proyecto_id: formCotizacion._proyecto_id,
      proveedor_id: parseInt(formCotizacion.proveedor_id),
      monto: formCotizacion.monto ? parseFloat(formCotizacion.monto) : null,
      fecha_cotizacion: formCotizacion.fecha_cotizacion || toMMDDYYYY(new Date().toISOString().split('T')[0]),
      estado: formCotizacion.estado,
      notas: formCotizacion.notas,
      archivo: formCotizacion.archivo || '',
      updated_at: new Date().toISOString(),
    };
    if (selectedCotizacion) {
      data.id = selectedCotizacion.id;
      const res = await syncToDatabase('upsert', data, 'CRM_Cotizaciones', ['id']);
      if (res?.success) { showNotif('Cotización actualizada'); fetchData(); setShowNewCotizacion(false); setSelectedCotizacion(null); }
    } else {
      data.created_at = new Date().toISOString();
      const res = await syncToDatabase('upsert', data, 'CRM_Cotizaciones');
      if (res?.success) { showNotif('Cotización agregada'); fetchData(); setShowNewCotizacion(false); }
    }
  };

  const getCotizacionesByProyecto = (proyectoId) => cotizaciones.filter(c => c.proyecto_id === proyectoId);

  const getProveedorById = (id) => proveedores.find(p => p.id === id);

  const filteredProyectos = useMemo(() => {
    return proyectos.filter(p => !searchProyecto || p.nombre?.toLowerCase().includes(searchProyecto.toLowerCase()) || p.tienda?.toLowerCase().includes(searchProyecto.toLowerCase()));
  }, [proyectos, searchProyecto]);

  const handleSidebarMouseDown = useCallback((e) => {
    e.preventDefault();
    isDraggingRef.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDraggingRef.current) return;
      const sidebar = document.getElementById('candidato-sidebar');
      if (!sidebar) return;
      const parent = sidebar.parentElement;
      if (!parent) return;
      const parentRect = parent.getBoundingClientRect();
      const minWidth = parentRect.width * 0.2;
      let newWidth = e.clientX - parentRect.left;
      if (newWidth < minWidth) newWidth = minWidth;
      setSidebarWidth(`${newWidth}px`);
    };
    const handleMouseUp = () => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const renderCandidatoModal = () => {
    if (!selectedCandidato && !showNewCandidato) return null;
    const isEditing = !!selectedCandidato;
    const isContratado = formCandidato.estado === 'Contratado';
    return (
      <ModalOverlay onClose={() => { setSelectedCandidato(null); setShowNewCandidato(false); }} className="max-w-none w-screen h-screen max-h-none rounded-none shadow-none -m-4">
        <div className="px-8 py-6 border-b-2 border-gray-50 flex items-center justify-between shrink-0">
          <h3 className="text-lg font-black text-[#303a7f] uppercase tracking-tighter flex items-center gap-3">
            <UserPlus size={20} /> Candidato
          </h3>
          <button onClick={() => { setSelectedCandidato(null); setShowNewCandidato(false); }} className="p-2 bg-gray-50 text-gray-400 rounded-xl hover:bg-red-50 hover:text-red-500 transition-all"><X size={18} /></button>
        </div>
        <div className="flex-1 flex overflow-hidden">
          <div id="candidato-sidebar" className="flex shrink-0" style={{ width: sidebarWidth, minWidth: '20%' }}>
            <div className="flex-1 p-3 flex flex-col gap-1.5 [&_input]:text-[10px] [&_input]:py-2 [&_select]:text-[10px] [&_select]:py-2">
              <div>
                <label className="text-[7px] font-black text-gray-400 uppercase tracking-widest block mb-0.5 pl-1">Nombre</label>
                <input className={inputCls} placeholder="Nombre *" value={formCandidato.nombre} onChange={e => setFormCandidato(f => ({ ...f, nombre: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <div>
                  <label className="text-[7px] font-black text-gray-400 uppercase tracking-widest block mb-0.5 pl-1">Teléfono</label>
                  <input className={inputCls} placeholder="Teléfono" value={formCandidato.telefono} onChange={e => setFormCandidato(f => ({ ...f, telefono: e.target.value }))} />
                </div>
                <div>
                  <label className="text-[7px] font-black text-gray-400 uppercase tracking-widest block mb-0.5 pl-1">Email</label>
                  <input className={inputCls} placeholder="Email" type="email" value={formCandidato.email} onChange={e => setFormCandidato(f => ({ ...f, email: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="text-[7px] font-black text-gray-400 uppercase tracking-widest block mb-0.5 pl-1">Dirección</label>
                <input className={inputCls} placeholder="Dirección" value={formCandidato.direccion} onChange={e => setFormCandidato(f => ({ ...f, direccion: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <div>
                  <label className="text-[7px] font-black text-gray-400 uppercase tracking-widest block mb-0.5 pl-1">Fecha de Contacto</label>
                  <div className="relative">
                    <input className={`${inputCls} pr-10`} type="text" placeholder="MM/DD/AAAA" value={formCandidato.fecha_contacto} onChange={e => setFormCandidato(f => ({ ...f, fecha_contacto: formatDateInput(e.target.value) }))} />
                    <button type="button" onClick={() => document.getElementById('dc-fecha-contacto')?.showPicker()} className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-[#303a7f] hover:bg-gray-100 rounded-lg transition-all"><Calendar size={14} /></button>
                    <input id="dc-fecha-contacto" type="date" className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 pointer-events-none z-[200]" style={{ width: '1px', height: '1px' }} value={toISOFormat(formCandidato.fecha_contacto)} onChange={e => setFormCandidato(f => ({ ...f, fecha_contacto: toMMDDYYYY(e.target.value) }))} />
                  </div>
                </div>
                <div>
                  <label className="text-[7px] font-black text-gray-400 uppercase tracking-widest block mb-0.5 pl-1">Fuente</label>
                  <select className={selectCls} value={formCandidato.fuente} onChange={e => setFormCandidato(f => ({ ...f, fuente: e.target.value }))}>
                    <option value="">Seleccionar...</option>
                    {FUENTES.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <div>
                  <label className="text-[7px] font-black text-gray-400 uppercase tracking-widest block mb-0.5 pl-1">Próxima Llamada</label>
                  <div className="relative">
                    <input className={`${inputCls} pr-10`} type="text" placeholder="MM/DD/AAAA" value={formCandidato.proxima_llamada} onChange={e => setFormCandidato(f => ({ ...f, proxima_llamada: formatDateInput(e.target.value) }))} />
                    <button type="button" onClick={() => document.getElementById('dc-proxima-llamada')?.showPicker()} className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-[#303a7f] hover:bg-gray-100 rounded-lg transition-all"><Calendar size={14} /></button>
                    <input id="dc-proxima-llamada" type="date" className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 pointer-events-none z-[200]" style={{ width: '1px', height: '1px' }} value={toISOFormat(formCandidato.proxima_llamada)} onChange={e => setFormCandidato(f => ({ ...f, proxima_llamada: toMMDDYYYY(e.target.value) }))} />
                  </div>
                </div>
                <div>
                  <label className="text-[7px] font-black text-gray-400 uppercase tracking-widest block mb-0.5 pl-1">Estado</label>
                  <select className={`${selectCls} ${({ Nuevo: 'text-blue-600', Contactado: 'text-amber-600', Entrevistado: 'text-purple-600', Contratado: 'text-emerald-600', Rechazado: 'text-red-600', 'No Interesado': 'text-gray-400' })[formCandidato.estado] || ''}`} value={formCandidato.estado} onChange={e => setFormCandidato(f => ({ ...f, estado: e.target.value }))}>
                    {ESTADOS_CANDIDATO.map(e => <option key={e} value={e} style={{ color: ({ Nuevo: '#2563eb', Contactado: '#d97706', Entrevistado: '#9333ea', Contratado: '#059669', Rechazado: '#dc2626', 'No Interesado': '#9ca3af' })[e] }}>{e}</option>)}
                  </select>
                </div>
              </div>
              {isContratado && (!selectedCandidato || (selectedCandidato._creado_en_personal !== '1' && selectedCandidato._pendiente_en_personal !== '1')) && (
                <div className="p-1.5 bg-[#6bbdb7]/5 rounded-lg border border-[#6bbdb7]/20 flex items-start gap-1.5">
                  <UserPlus size={12} className="text-[#6bbdb7] shrink-0 mt-0.5" />
                  <p className="text-[8px] font-bold text-[#6bbdb7] leading-tight">Al guardar como "Contratado" quedará pendiente para registrar desde Gestión de Personal.</p>
                </div>
              )}
              <div className="flex gap-1.5 pt-2 border-t border-gray-100">
                {isEditing && (
                  <button onClick={registrarLlamada} className="flex items-center gap-1.5 px-3 py-2 bg-[#6bbdb7]/10 text-[#6bbdb7] rounded-xl border-2 border-[#6bbdb7]/20 hover:bg-[#6bbdb7]/20 transition-all active:scale-95 font-black text-[9px] uppercase tracking-widest"><Phone size={12} /> Llamada</button>
                )}
                <button onClick={saveCandidato} className="flex items-center gap-1.5 px-3 py-2 bg-[#303a7f] text-white rounded-xl hover:bg-[#252a5e] transition-all active:scale-95 font-black text-[9px] uppercase tracking-widest ml-auto"><Save size={12} /> Guardar</button>
              </div>
            </div>
          </div>
          <div
            className="w-[7px] cursor-col-resize shrink-0 hover:bg-[#303a7f]/10 active:bg-[#303a7f]/20 transition-colors flex flex-col items-center justify-center border-l border-gray-200"
            onMouseDown={handleSidebarMouseDown}
          >
            <div className="w-0.5 h-8 rounded-full bg-gray-300" />
          </div>
          <div className="flex-1 p-4 flex flex-col">
            <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-2 pl-1">Notas</label>
            <textarea className="flex-1 resize-none border-2 border-gray-100 rounded-2xl bg-white p-4 text-sm font-medium text-gray-700 placeholder:text-gray-300 focus:border-[#303a7f]/30 focus:outline-none transition-all" placeholder="Notas / Historial de llamadas..." value={formCandidato.notas} onChange={e => setFormCandidato(f => ({ ...f, notas: e.target.value }))} />
          </div>
        </div>
      </ModalOverlay>
    );
  };

  const handleBuscarProveedores = () => {
    setShowBuscarProveedores(true);
  };

  const buscarProveedores = async () => {
    if (!formBuscarProveedores.estado || !formBuscarProveedores.descripcion.trim()) {
      showNotif('Estado y Descripción del Proyecto son obligatorios', 'error');
      return;
    }
    setBuscando(true);
    setResultadosBusqueda([]);
    try {
      const res = await fetch('/api/buscar-proveedores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          estado: formBuscarProveedores.estado,
          ciudad: formBuscarProveedores.ciudad,
          descripcion: formBuscarProveedores.descripcion
        })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Error al buscar proveedores');
      setResultadosBusqueda(data.results || []);
    } catch (e) {
      console.error('Buscar proveedores error:', e);
      showNotif(e.message || 'Error al buscar proveedores', 'error');
    } finally {
      setBuscando(false);
    }
  };

  const importarProveedor = (proveedor) => {
    setFormProveedor({
      nombre: proveedor.nombre || '',
      contacto: '',
      telefono: proveedor.telefono || '',
      email: '',
      especialidad: proveedor.descripcion || '',
      estado: proveedor.estado || '',
      ciudad: proveedor.ciudad || '',
      ultima_llamada: '',
      proxima_llamada: '',
      notas: `Importado desde búsqueda.\nDirección: ${proveedor.direccion || ''}\n${proveedor.estado || ''}, ${proveedor.ciudad || ''}`,
      creado_por: currentUser?.nombre || ''
    });
    setShowBuscarProveedores(false);
    setShowNewProveedor(true);
  };

  const renderProveedorModal = () => {
    if (!selectedProveedor && !showNewProveedor) return null;
    const isEditing = !!selectedProveedor;
    return (
      <ModalOverlay onClose={() => { setSelectedProveedor(null); setShowNewProveedor(false); }} className="max-w-none w-screen h-screen max-h-none rounded-none shadow-none -m-4">
        <div className="px-8 py-6 border-b-2 border-gray-50 flex items-center justify-between shrink-0">
          <h3 className="text-lg font-black text-[#303a7f] uppercase tracking-tighter flex items-center gap-3">
            <Building2 size={20} /> {isEditing ? 'Proveedor' : 'Nuevo Proveedor'}
          </h3>
          <button onClick={() => { setSelectedProveedor(null); setShowNewProveedor(false); }} className="p-2 bg-gray-50 text-gray-400 rounded-xl hover:bg-red-50 hover:text-red-500 transition-all"><X size={18} /></button>
        </div>
        <div className="flex-1 flex overflow-hidden">
          <div id="proveedor-sidebar" className="flex shrink-0" style={{ width: sidebarWidth, minWidth: '20%' }}>
            <div className="flex-1 p-3 flex flex-col gap-1.5 [&_input]:text-[10px] [&_input]:py-2 [&_select]:text-[10px] [&_select]:py-2">
              <div>
                <label className="text-[7px] font-black text-gray-400 uppercase tracking-widest block mb-0.5 pl-1">Nombre / Empresa</label>
                <input className={inputCls} placeholder="Nombre *" value={formProveedor.nombre} onChange={e => setFormProveedor(f => ({ ...f, nombre: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <div>
                  <label className="text-[7px] font-black text-gray-400 uppercase tracking-widest block mb-0.5 pl-1">Teléfono</label>
                  <input className={inputCls} placeholder="Teléfono" value={formProveedor.telefono} onChange={e => setFormProveedor(f => ({ ...f, telefono: e.target.value }))} />
                </div>
                <div>
                  <label className="text-[7px] font-black text-gray-400 uppercase tracking-widest block mb-0.5 pl-1">Email</label>
                  <input className={inputCls} placeholder="Email" type="email" value={formProveedor.email} onChange={e => setFormProveedor(f => ({ ...f, email: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <div>
                  <label className="text-[7px] font-black text-gray-400 uppercase tracking-widest block mb-0.5 pl-1">Contacto</label>
                  <input className={inputCls} placeholder="Persona de Contacto" value={formProveedor.contacto} onChange={e => setFormProveedor(f => ({ ...f, contacto: e.target.value }))} />
                </div>
                <div>
                  <label className="text-[7px] font-black text-gray-400 uppercase tracking-widest block mb-0.5 pl-1">Especialidad</label>
                  <input className={inputCls} placeholder="Ej: Limpieza, Construcción" value={formProveedor.especialidad} onChange={e => setFormProveedor(f => ({ ...f, especialidad: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <div>
                  <label className="text-[7px] font-black text-gray-400 uppercase tracking-widest block mb-0.5 pl-1">Estado</label>
                  <select className={selectCls} value={formProveedor.estado} onChange={e => setFormProveedor(f => ({ ...f, estado: e.target.value, ciudad: '' }))}>
                    <option value="">Seleccionar...</option>
                    {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[7px] font-black text-gray-400 uppercase tracking-widest block mb-0.5 pl-1">Ciudad</label>
                  <select className={selectCls} value={formProveedor.ciudad} onChange={e => setFormProveedor(f => ({ ...f, ciudad: e.target.value }))} disabled={!formProveedor.estado}>
                    <option value="">Seleccionar...</option>
                    {formProveedor.estado && US_CITIES[formProveedor.estado]?.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[7px] font-black text-gray-400 uppercase tracking-widest block mb-0.5 pl-1">Próxima Llamada / Seguimiento</label>
                <div className="relative">
                  <input className={`${inputCls} pr-10`} type="text" placeholder="MM/DD/AAAA" value={formProveedor.proxima_llamada} onChange={e => setFormProveedor(f => ({ ...f, proxima_llamada: formatDateInput(e.target.value) }))} />
                  <button type="button" onClick={() => document.getElementById('dp-proxima-llamada')?.showPicker()} className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-[#303a7f] hover:bg-gray-100 rounded-lg transition-all"><Calendar size={14} /></button>
                  <input id="dp-proxima-llamada" type="date" className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 pointer-events-none z-[200]" style={{ width: '1px', height: '1px' }} value={toISOFormat(formProveedor.proxima_llamada)} onChange={e => setFormProveedor(f => ({ ...f, proxima_llamada: toMMDDYYYY(e.target.value) }))} />
                </div>
              </div>
              <div className="flex gap-1.5 pt-2 border-t border-gray-100">
                {isEditing && (
                  <button onClick={() => registrarLlamada('proveedor')} className="flex items-center gap-1.5 px-3 py-2 bg-[#6bbdb7]/10 text-[#6bbdb7] rounded-xl border-2 border-[#6bbdb7]/20 hover:bg-[#6bbdb7]/20 transition-all active:scale-95 font-black text-[9px] uppercase tracking-widest"><Phone size={12} /> Llamada</button>
                )}
                <button onClick={saveProveedor} className="flex items-center gap-1.5 px-3 py-2 bg-[#303a7f] text-white rounded-xl hover:bg-[#252a5e] transition-all active:scale-95 font-black text-[9px] uppercase tracking-widest ml-auto"><Save size={12} /> Guardar</button>
              </div>
            </div>
          </div>
          <div
            className="w-[7px] cursor-col-resize shrink-0 hover:bg-[#303a7f]/10 active:bg-[#303a7f]/20 transition-colors flex flex-col items-center justify-center border-l border-gray-200"
            onMouseDown={handleSidebarMouseDown}
          >
            <div className="w-0.5 h-8 rounded-full bg-gray-300" />
          </div>
          <div className="flex-1 p-4 flex flex-col">
            <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-2 pl-1">Notas</label>
            <textarea className="flex-1 resize-none border-2 border-gray-100 rounded-2xl bg-white p-4 text-sm font-medium text-gray-700 placeholder:text-gray-300 focus:border-[#303a7f]/30 focus:outline-none transition-all" placeholder="Notas del proveedor..." value={formProveedor.notas} onChange={e => setFormProveedor(f => ({ ...f, notas: e.target.value }))} />
          </div>
        </div>
      </ModalOverlay>
    );
  };

  const renderBuscarProveedoresModal = () => {
    if (!showBuscarProveedores) return null;
    return (
      <ModalOverlay onClose={() => { setShowBuscarProveedores(false); setResultadosBusqueda([]); }} className="max-w-none w-screen h-screen max-h-none rounded-none shadow-none -m-4">
        <div className="px-8 py-6 border-b-2 border-gray-50 flex items-center justify-between shrink-0">
          <h3 className="text-lg font-black text-[#303a7f] uppercase tracking-tighter flex items-center gap-3">
            <Globe size={20} /> Buscar Proveedores
          </h3>
          <button onClick={() => { setShowBuscarProveedores(false); setResultadosBusqueda([]); }} className="p-2 bg-gray-50 text-gray-400 rounded-xl hover:bg-red-50 hover:text-red-500 transition-all"><X size={18} /></button>
        </div>
        <div className="flex-1 flex overflow-hidden">
          <div id="buscar-proveedor-sidebar" className="flex shrink-0" style={{ width: sidebarWidth, minWidth: '20%' }}>
            <div className="flex-1 p-3 flex flex-col gap-1.5 [&_input]:text-[10px] [&_input]:py-2 [&_select]:text-[10px] [&_select]:py-2">
              <div>
                <label className="text-[7px] font-black text-gray-400 uppercase tracking-widest block mb-0.5 pl-1">Estado</label>
                <select className={selectCls} value={formBuscarProveedores.estado} onChange={e => setFormBuscarProveedores(f => ({ ...f, estado: e.target.value, ciudad: '' }))}>
                  <option value="">Seleccionar estado...</option>
                  {US_STATES.map(e => <option key={e} value={e}>{e}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[7px] font-black text-gray-400 uppercase tracking-widest block mb-0.5 pl-1">Ciudad</label>
                <select className={selectCls} value={formBuscarProveedores.ciudad} onChange={e => setFormBuscarProveedores(f => ({ ...f, ciudad: e.target.value }))} disabled={!formBuscarProveedores.estado}>
                  <option value="">{formBuscarProveedores.estado ? 'Seleccionar ciudad...' : 'Primero seleccione un estado'}</option>
                  {(US_CITIES[formBuscarProveedores.estado] || []).map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[7px] font-black text-gray-400 uppercase tracking-widest block mb-0.5 pl-1">Descripción del Proyecto</label>
                <textarea className={`${inputCls} resize-none`} rows={5} placeholder="Descripción del proyecto" value={formBuscarProveedores.descripcion} onChange={e => setFormBuscarProveedores(f => ({ ...f, descripcion: e.target.value }))} />
              </div>
              <div className="flex gap-1.5 pt-2 border-t border-gray-100">
                <button onClick={buscarProveedores} disabled={buscando} className="flex items-center gap-1.5 px-3 py-2 bg-[#303a7f] text-white rounded-xl hover:bg-[#252a5e] transition-all active:scale-95 font-black text-[9px] uppercase tracking-widest ml-auto disabled:opacity-50">
                  {buscando ? (
                    <><div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Buscando...</>
                  ) : (
                    <><Globe size={12} /> Buscar</>
                  )}
                </button>
              </div>
            </div>
          </div>
          <div
            className="w-[7px] cursor-col-resize shrink-0 hover:bg-[#303a7f]/10 active:bg-[#303a7f]/20 transition-colors flex flex-col items-center justify-center border-l border-gray-200"
            onMouseDown={handleSidebarMouseDown}
          >
            <div className="w-0.5 h-8 rounded-full bg-gray-300" />
          </div>
          <div className="flex-1 p-4 flex flex-col overflow-hidden">
            <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-2 pl-1 shrink-0">
              Resultados {resultadosBusqueda.length > 0 && `(${resultadosBusqueda.length})`}
            </label>
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3">
              {buscando ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <div className="w-8 h-8 border-4 border-[#303a7f]/20 border-t-[#303a7f] rounded-full animate-spin" />
                  <p className="text-[10px] font-bold text-gray-400">Buscando proveedores...</p>
                </div>
              ) : resultadosBusqueda.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <Globe size={32} className="text-gray-200" />
                  <p className="text-[10px] font-bold text-gray-300 text-center leading-relaxed">Ingrese los datos y presione Buscar<br />para encontrar proveedores.</p>
                </div>
              ) : (
                resultadosBusqueda.map((p, i) => (
                  <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4 hover:border-[#6bbdb7]/30 hover:shadow-md transition-all">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex-1 min-w-0">
                        <h4 className="text-[12px] font-black text-[#303a7f] truncate">{p.nombre}</h4>
                        <div className="flex items-center gap-2 mt-0.5">
                          {p.telefono && (
                            <span className="flex items-center gap-1 text-[10px] font-bold text-gray-500">
                              <Phone size={10} /> {p.telefono}
                            </span>
                          )}
                          {p.ciudad && (
                            <span className="text-[9px] font-bold text-gray-400">
                              {p.ciudad}, {p.estado}
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => importarProveedor(p)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-[#6bbdb7]/10 text-[#6bbdb7] rounded-xl border border-[#6bbdb7]/20 hover:bg-[#6bbdb7]/20 transition-all active:scale-95 font-black text-[8px] uppercase tracking-widest shrink-0"
                        title="Importar como nuevo proveedor"
                      >
                        <Plus size={10} /> Importar
                      </button>
                    </div>
                    {p.direccion && (
                      <p className="text-[9px] font-medium text-gray-500 mb-1">{p.direccion}</p>
                    )}
                    {p.descripcion && (
                      <p className="text-[9px] text-gray-400 italic leading-relaxed">{p.descripcion}</p>
                    )}
                    {p.website && (
                      <a href={p.website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 mt-1.5 text-[9px] font-bold text-[#303a7f] hover:text-[#6bbdb7] transition-colors">
                        <Globe size={9} /> {p.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                      </a>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </ModalOverlay>
    );
  };

  const renderProyectoModal = () => {
    if (!selectedProyecto && !showNewProyecto) return null;
    const isEditing = !!selectedProyecto;
    const proyectoCotizaciones = selectedProyecto ? getCotizacionesByProyecto(selectedProyecto.id) : [];
    const selectedProviderName = selectedProyecto?.proveedor_seleccionado_id ? getProveedorById(selectedProyecto.proveedor_seleccionado_id)?.nombre : null;
    return (
      <ModalOverlay onClose={() => { setSelectedProyecto(null); setShowNewProyecto(false); }}>
        <div className="px-8 py-6 border-b-2 border-gray-50 flex items-center justify-between shrink-0">
          <h3 className="text-lg font-black text-[#303a7f] uppercase tracking-tighter flex items-center gap-3">
            <Briefcase size={20} /> {isEditing ? 'Editar Proyecto' : 'Nuevo Proyecto'}
          </h3>
          <button onClick={() => { setSelectedProyecto(null); setShowNewProyecto(false); }} className="p-2 bg-gray-50 text-gray-400 rounded-xl hover:bg-red-50 hover:text-red-500 transition-all"><X size={18} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <div className="space-y-4">
            <input className={inputCls} placeholder="Nombre del proyecto *" value={formProyecto.nombre} onChange={e => setFormProyecto(f => ({ ...f, nombre: e.target.value }))} />
            <div className="grid grid-cols-2 gap-4">
              <select className={selectCls} value={formProyecto.tienda} onChange={e => setFormProyecto(f => ({ ...f, tienda: e.target.value }))}>
                <option value="">Seleccionar tienda...</option>
                {stores.map(s => <option key={s.id || s.nombre} value={s.nombre}>{s.nombre}</option>)}
              </select>
              <select className={selectCls} value={formProyecto.cliente} onChange={e => setFormProyecto(f => ({ ...f, cliente: e.target.value }))}>
                <option value="KBS">KBS</option>
                <option value="CSG">CSG</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5 pl-1">Fecha de Solicitud</label>
                <input className={inputCls} type="text" placeholder="MM/DD/AAAA" value={formProyecto.fecha_solicitud} onChange={e => setFormProyecto(f => ({ ...f, fecha_solicitud: formatDateInput(e.target.value) }))} />
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5 pl-1">Estado</label>
                <select className={selectCls} value={formProyecto.estado} onChange={e => setFormProyecto(f => ({ ...f, estado: e.target.value }))}>
                  {ESTADOS_PROYECTO.map(e => <option key={e} value={e}>{e}</option>)}
                </select>
              </div>
            </div>
            <textarea className={`${inputCls} resize-none`} rows={2} placeholder="Descripción del proyecto..." value={formProyecto.descripcion} onChange={e => setFormProyecto(f => ({ ...f, descripcion: e.target.value }))} />
            <textarea className={`${inputCls} resize-none`} rows={2} placeholder="Notas internas..." value={formProyecto.notas} onChange={e => setFormProyecto(f => ({ ...f, notas: e.target.value }))} />

            {isEditing && (
              <div className="mt-4 p-5 bg-white rounded-[1.5rem] border-2 border-gray-100">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-[11px] font-black text-[#303a7f] uppercase tracking-widest">Cotizaciones Recibidas</h4>
                  <button onClick={() => handleNewCotizacion(selectedProyecto.id)} className="flex items-center gap-1.5 px-3 py-1.5 bg-[#6bbdb7]/10 text-[#6bbdb7] rounded-xl border-2 border-[#6bbdb7]/20 hover:bg-[#6bbdb7]/20 transition-all font-black text-[9px] uppercase tracking-widest"><Plus size={12} /> Agregar Cotización</button>
                </div>
                {proyectoCotizaciones.length === 0 ? (
                  <p className="text-[10px] font-bold text-gray-300 italic text-center py-4">No hay cotizaciones aún</p>
                ) : (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b-2 border-gray-100">
                        <th className="pb-2 text-[9px] font-black text-gray-400 uppercase tracking-widest">Proveedor</th>
                        <th className="pb-2 text-[9px] font-black text-gray-400 uppercase tracking-widest">Monto</th>
                        <th className="pb-2 text-[9px] font-black text-gray-400 uppercase tracking-widest">Fecha</th>
                        <th className="pb-2 text-[9px] font-black text-gray-400 uppercase tracking-widest">Estado</th>
                        <th className="pb-2 text-[9px] font-black text-gray-400 uppercase tracking-widest">Archivo</th>
                        <th className="pb-2 text-[9px] font-black text-gray-400 uppercase tracking-widest">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {proyectoCotizaciones.map(ctz => {
                        const prov = getProveedorById(ctz.proveedor_id);
                        const isSelected = selectedProyecto.proveedor_seleccionado_id === ctz.proveedor_id;
                        return (
                          <tr key={ctz.id} className={`group hover:bg-gray-50/50 transition-colors ${isSelected ? 'bg-[#6bbdb7]/5' : ''}`}>
                            <td className="py-3 pr-2">
                              <span className="text-[11px] font-black text-[#303a7f]">{prov?.nombre || '—'}</span>
                              {prov?.contacto && <span className="text-[9px] text-gray-400 block">{prov.contacto}</span>}
                            </td>
                            <td className="py-3 pr-2"><span className="text-[11px] font-black text-[#303a7f]">{ctz.monto ? `$${parseFloat(ctz.monto).toFixed(2)}` : '—'}</span></td>
                            <td className="py-3 pr-2"><span className="text-[10px] font-bold text-gray-500">{ctz.fecha_cotizacion ? toMMDDYYYY(ctz.fecha_cotizacion) : '—'}</span></td>
                            <td className="py-3 pr-2"><Badge estado={ctz.estado} /></td>
                            <td className="py-3 pr-2">
                              {ctz.archivo ? (
                                <button onClick={() => openFileFromBase64(ctz.archivo)} className="inline-flex items-center gap-1 text-[#303a7f] hover:text-[#6bbdb7] transition-colors" title="Ver archivo">
                                  <Download size={12} />
                                </button>
                              ) : <span className="text-[9px] text-gray-300">—</span>}
                            </td>
                            <td className="py-3">
                              <div className="flex items-center gap-1">
                                {!selectedProyecto.proveedor_seleccionado_id && ctz.estado !== 'Rechazada' && (
                                  <button onClick={() => selectBestProvider(selectedProyecto, ctz.proveedor_id)} className="px-2.5 py-1 text-[8px] font-black bg-[#303a7f]/5 text-[#303a7f] rounded-lg hover:bg-[#303a7f]/10 transition-all uppercase tracking-widest">Seleccionar</button>
                                )}
                                {isSelected && <span className="text-[9px] font-black text-[#6bbdb7] uppercase tracking-widest flex items-center gap-1"><CheckCircle size={12} /> Seleccionado</span>}
                                {!selectedProyecto.proveedor_seleccionado_id && (
                                  <button onClick={(e) => handleEditCotizacion(ctz, e)} className="p-1.5 text-gray-400 hover:text-[#303a7f] hover:bg-gray-100 rounded-lg transition-all"><Edit3 size={11} /></button>
                                )}
                                {!selectedProyecto.proveedor_seleccionado_id && (
                                  <button onClick={(e) => { e.stopPropagation(); setDeleteConfirm({ show: true, message: `¿Eliminar cotización de "${getProveedorById(ctz.proveedor_id)?.nombre || '?'}"?`, onConfirm: () => deleteCotizacion(ctz) }); }} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"><Trash2 size={11} /></button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {selectedProviderName && (
              <div className="p-4 bg-green-50 rounded-2xl border border-green-100 flex items-center gap-3">
                <CheckCircle size={18} className="text-green-500 flex-shrink-0" />
                <div>
                  <p className="text-[11px] font-black text-green-700 uppercase tracking-tight">Proveedor Seleccionado</p>
                  <p className="text-[10px] font-bold text-green-600">{selectedProviderName}</p>
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button onClick={saveProyecto} className="flex items-center gap-2 px-5 py-3 bg-[#303a7f] text-white rounded-2xl hover:bg-[#252a5e] transition-all active:scale-95 font-black text-[10px] uppercase tracking-widest"><Save size={14} /> Guardar</button>
              {isEditing && <button onClick={() => setDeleteConfirm({ show: true, message: `¿Eliminar proyecto "${selectedProyecto?.nombre}"?`, onConfirm: () => deleteProyecto(selectedProyecto) })} className="flex items-center gap-2 px-5 py-3 bg-red-50 text-red-500 rounded-2xl border-2 border-red-100 hover:bg-red-100 transition-all active:scale-95 font-black text-[10px] uppercase tracking-widest ml-auto"><Trash2 size={14} /> Eliminar</button>}
            </div>
          </div>
        </div>
      </ModalOverlay>
    );
  };

  const renderCotizacionModal = () => {
    if (!showNewCotizacion) return null;
    const isEditing = !!selectedCotizacion;
    return (
      <ModalOverlay onClose={() => { setShowNewCotizacion(false); setSelectedCotizacion(null); }}>
        <div className="px-8 py-6 border-b-2 border-gray-50 flex items-center justify-between shrink-0">
          <h3 className="text-lg font-black text-[#303a7f] uppercase tracking-tighter flex items-center gap-3">
            <DollarSign size={20} /> {isEditing ? 'Editar Cotización' : 'Nueva Cotización'}
          </h3>
          <button onClick={() => { setShowNewCotizacion(false); setSelectedCotizacion(null); }} className="p-2 bg-gray-50 text-gray-400 rounded-xl hover:bg-red-50 hover:text-red-500 transition-all"><X size={18} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5 pl-1">Proveedor</label>
              <select className={selectCls} value={formCotizacion.proveedor_id} onChange={e => setFormCotizacion(f => ({ ...f, proveedor_id: e.target.value }))}>
                <option value="">Seleccionar proveedor...</option>
                {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5 pl-1">Monto ($)</label>
                <input className={inputCls} type="number" step="0.01" placeholder="0.00" value={formCotizacion.monto} onChange={e => setFormCotizacion(f => ({ ...f, monto: e.target.value }))} />
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5 pl-1">Fecha de Cotización</label>
                <input className={inputCls} type="text" placeholder="MM/DD/AAAA" value={formCotizacion.fecha_cotizacion} onChange={e => setFormCotizacion(f => ({ ...f, fecha_cotizacion: formatDateInput(e.target.value) }))} />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5 pl-1">Estado</label>
              <select className={selectCls} value={formCotizacion.estado} onChange={e => setFormCotizacion(f => ({ ...f, estado: e.target.value }))}>
                {ESTADOS_COTIZACION.map(e => <option key={e} value={e}>{e}</option>)}
              </select>
            </div>
            <textarea className={`${inputCls} resize-none`} rows={2} placeholder="Notas de la cotización..." value={formCotizacion.notas} onChange={e => setFormCotizacion(f => ({ ...f, notas: e.target.value }))} />
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5 pl-1">Archivo adjunto</label>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 px-4 py-2.5 bg-[#f9f9f9] border-2 border-gray-100 rounded-xl cursor-pointer hover:border-[#303a7f]/30 transition-all active:scale-95">
                  <Upload size={14} className="text-[#303a7f]" />
                  <span className="text-[10px] font-black text-[#303a7f] uppercase tracking-widest">Seleccionar archivo</span>
                  <input type="file" className="hidden" onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setFileUploading(true);
                    const reader = new FileReader();
                    reader.onload = () => {
                      setFormCotizacion(f => ({ ...f, archivo: reader.result, _archivo_nombre: file.name }));
                      setFileUploading(false);
                    };
                    reader.onerror = () => { setFileUploading(false); showNotif('Error al leer el archivo', 'error'); };
                    reader.readAsDataURL(file);
                  }} />
                </label>
                {formCotizacion._archivo_nombre && (
                  <span className="text-[9px] font-bold text-[#6bbdb7] flex items-center gap-1">
                    <CheckCircle size={11} /> {formCotizacion._archivo_nombre}
                  </span>
                )}
                {!formCotizacion._archivo_nombre && formCotizacion.archivo && (
                  <span className="text-[9px] font-bold text-[#6bbdb7] flex items-center gap-1">
                    <CheckCircle size={11} /> Archivo adjunto
                  </span>
                )}
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={saveCotizacion} disabled={fileUploading} className="flex items-center justify-center gap-2 flex-1 py-4 bg-[#303a7f] text-white rounded-2xl hover:bg-[#252a5e] transition-all active:scale-95 font-black text-[10px] uppercase tracking-widest disabled:opacity-50"><Save size={14} /> {isEditing ? 'Actualizar' : 'Guardar'} Cotización</button>
              {isEditing && (
                <button onClick={() => setDeleteConfirm({ show: true, message: `¿Eliminar cotización de "${getProveedorById(selectedCotizacion?.proveedor_id)?.nombre || '?'}"?`, onConfirm: () => { deleteCotizacion(selectedCotizacion); setShowNewCotizacion(false); setSelectedCotizacion(null); } })} className="flex items-center justify-center gap-2 px-5 py-3 bg-red-50 text-red-500 rounded-2xl border-2 border-red-100 hover:bg-red-100 transition-all active:scale-95 font-black text-[10px] uppercase tracking-widest"><Trash2 size={14} /> Eliminar</button>
              )}
            </div>
          </div>
        </div>
      </ModalOverlay>
    );
  };

  const renderRegistrarLlamadaModal = () => {
    if (!showRegistrarLlamada) return null;
    return (
      <ModalOverlay onClose={() => setShowRegistrarLlamada(false)}>
        <div className="px-8 py-6 border-b-2 border-gray-50 flex items-center justify-between shrink-0">
          <h3 className="text-lg font-black text-[#303a7f] uppercase tracking-tighter flex items-center gap-3">
            <Phone size={20} /> Registrar Llamada
          </h3>
          <button onClick={() => setShowRegistrarLlamada(false)} className="p-2 bg-gray-50 text-gray-400 rounded-xl hover:bg-red-50 hover:text-red-500 transition-all"><X size={18} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5 pl-1">Tipo de Interacción</label>
              <select className={selectCls} value={llamadaTipo} onChange={e => setLlamadaTipo(e.target.value)}>
                <option value="">Seleccionar...</option>
                <option value="No contestó">No contestó</option>
                <option value="Si conversó">Si conversó</option>
                <option value="Pidió llamar luego">Pidió llamar luego</option>
                <option value="No interesado">No interesado</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5 pl-1">Nota</label>
              <textarea className={`${inputCls} resize-none`} rows={4} placeholder="Escriba el resultado de la llamada..." value={llamadaNota} onChange={e => setLlamadaNota(e.target.value)} />
            </div>
            <button onClick={saveRegistroLlamada} className="w-full flex items-center justify-center gap-2 py-4 bg-[#303a7f] text-white rounded-2xl hover:bg-[#252a5e] transition-all active:scale-95 font-black text-[10px] uppercase tracking-widest"><Save size={14} /> Guardar</button>
          </div>
        </div>
      </ModalOverlay>
    );
  };

  // ─── DELETE CONFIRM MODAL ─────────────────────────────

  const renderDeleteConfirmModal = () => {
    if (!deleteConfirm.show) return null;
    return (
      <ModalOverlay onClose={() => setDeleteConfirm({ show: false, message: '', onConfirm: null })} className="max-w-md">
        <div className="p-10 text-center">
          <div className="w-16 h-16 mx-auto mb-6 bg-red-50 rounded-full flex items-center justify-center">
            <AlertCircle size={32} className="text-red-500" />
          </div>
          <p className="text-sm font-black text-[#303a7f] uppercase tracking-tight mb-6">{deleteConfirm.message}</p>
          <div className="flex gap-3">
            <button onClick={() => setDeleteConfirm({ show: false, message: '', onConfirm: null })} className="flex-1 py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 btn-close-danger">
              Cancelar
            </button>
            <button onClick={() => { deleteConfirm.onConfirm?.(); setDeleteConfirm({ show: false, message: '', onConfirm: null }); }} className="flex-1 py-3.5 bg-red-500 text-white rounded-2xl hover:bg-red-600 transition-all active:scale-95 font-black text-[10px] uppercase tracking-widest shadow-lg shadow-red-900/20 flex items-center justify-center gap-2">
              <Trash2 size={14} /> Eliminar
            </button>
          </div>
        </div>
      </ModalOverlay>
    );
  };

  // ─── MAIN RENDER ──────────────────────────────────────

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Notification */}
      {notification.show && (
        <div className={`fixed top-6 right-6 z-[200] px-6 py-4 rounded-[1.5rem] shadow-2xl animate-in slide-in-from-top-4 duration-300 flex items-center gap-3 ${notification.type === 'error' ? 'bg-red-50 border-2 border-red-100' : 'bg-green-50 border-2 border-green-100'}`}>
          {notification.type === 'error' ? <AlertCircle size={18} className="text-red-500" /> : <CheckCircle size={18} className="text-green-500" />}
          <span className={`text-[11px] font-black uppercase tracking-wider ${notification.type === 'error' ? 'text-red-600' : 'text-green-600'}`}>{notification.message}</span>
        </div>
      )}



      {/* Tabs + Search */}
      <div className="flex items-center gap-4 mb-8">
        <div className="flex-[1_1_0%] flex justify-start">
          <div className="flex gap-1 p-1 bg-white rounded-[1.5rem] shadow-sm border border-gray-100 w-fit">
            <button onClick={() => setActiveTab('candidatos')} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl transition-all font-black text-[10px] uppercase tracking-widest whitespace-nowrap ${activeTab === 'candidatos' ? 'bg-[#303a7f] text-white' : 'text-gray-400 hover:text-[#303a7f] hover:bg-gray-50'}`}>
              <Users size={14} /> Candidatos
            </button>
            <button onClick={() => setActiveTab('proveedores')} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl transition-all font-black text-[10px] uppercase tracking-widest whitespace-nowrap ${activeTab === 'proveedores' ? 'bg-[#303a7f] text-white' : 'text-gray-400 hover:text-[#303a7f] hover:bg-gray-50'}`}>
              <Building2 size={14} /> Proveedores y Proyectos
            </button>
          </div>
        </div>
        <div className="flex-[1_1_0%] flex justify-center">
          {activeTab === 'proveedores' && (
            <div className="flex gap-1 p-1 bg-white rounded-[1.5rem] shadow-sm border border-gray-100 w-fit">
              <button onClick={() => setProveedoresSubTab('proyectos')} className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all font-black text-[9px] uppercase tracking-widest ${proveedoresSubTab === 'proyectos' ? 'bg-[#303a7f] text-white shadow-lg' : 'text-gray-400 hover:text-[#303a7f] hover:bg-gray-50'}`}>
                <Briefcase size={13} /> Proyectos
              </button>
              <button onClick={() => setProveedoresSubTab('proveedores')} className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all font-black text-[9px] uppercase tracking-widest ${proveedoresSubTab === 'proveedores' ? 'bg-[#303a7f] text-white shadow-lg' : 'text-gray-400 hover:text-[#303a7f] hover:bg-gray-50'}`}>
                <Building2 size={13} /> Proveedores
              </button>
            </div>
          )}
        </div>
        <div className="flex-[1_1_0%] flex justify-end">
          {activeTab === 'candidatos' && (
          <div className="flex items-center gap-3">
            <div className="relative w-64">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-300" size={14} />
              <input type="text" placeholder="Buscar candidato..." value={searchCandidato} onChange={e => setSearchCandidato(e.target.value)} className="w-full bg-white border-2 border-gray-100 rounded-xl pl-9 pr-3.5 py-2.5 text-xs font-bold text-[#303a7f] outline-none focus:border-[#6bbdb7] transition-all placeholder:text-gray-300" />
            </div>
            <select className={`${selectCls} !w-auto !min-w-[130px] !py-2.5 !text-xs !border-0`} value={filterEstadoCandidato} onChange={e => setFilterEstadoCandidato(e.target.value)}>
              <option value="">Todos los estados</option>
              {ESTADOS_CANDIDATO.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
            <button onClick={handleNewCandidato} className="flex items-center gap-2 px-4 py-2.5 bg-[#303a7f] text-white rounded-xl hover:bg-[#252a5e] transition-all active:scale-95 font-black text-[9px] uppercase tracking-widest shadow-lg shadow-blue-900/20 whitespace-nowrap"><Plus size={14} /> Nuevo Candidato</button>
          </div>
        )}
        {activeTab === 'proveedores' && proveedoresSubTab === 'proyectos' && (
          <div className="flex items-center gap-3">
            <div className="relative w-64">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-300" size={14} />
              <input type="text" placeholder="Buscar proyecto..." value={searchProyecto} onChange={e => setSearchProyecto(e.target.value)} className="w-full bg-white border-2 border-gray-100 rounded-xl pl-9 pr-3.5 py-2.5 text-xs font-bold text-[#303a7f] outline-none focus:border-[#6bbdb7] transition-all placeholder:text-gray-300" />
            </div>
            <button onClick={handleNewProyecto} className="flex items-center gap-2 px-4 py-2.5 bg-[#303a7f] text-white rounded-xl hover:bg-[#252a5e] transition-all active:scale-95 font-black text-[9px] uppercase tracking-widest shadow-lg shadow-blue-900/20"><Plus size={14} /> Nuevo Proyecto</button>
          </div>
        )}
        {activeTab === 'proveedores' && proveedoresSubTab === 'proveedores' && (
          <div className="flex items-center gap-3">
            <select className="bg-white border-2 border-gray-100 rounded-xl px-3.5 py-2.5 text-xs font-bold text-[#303a7f] outline-none focus:border-[#6bbdb7] transition-all appearance-none cursor-pointer" value={filterProveedorEstado} onChange={e => { setFilterProveedorEstado(e.target.value); setFilterProveedorCiudad(''); }}>
              <option value="">Todos los Estados</option>
              {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select className="bg-white border-2 border-gray-100 rounded-xl px-3.5 py-2.5 text-xs font-bold text-[#303a7f] outline-none focus:border-[#6bbdb7] transition-all appearance-none cursor-pointer" value={filterProveedorCiudad} onChange={e => setFilterProveedorCiudad(e.target.value)} disabled={!filterProveedorEstado}>
              <option value="">Todas las Ciudades</option>
              {filterProveedorEstado && US_CITIES[filterProveedorEstado]?.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <button onClick={handleBuscarProveedores} className="flex items-center gap-2 px-4 py-2.5 bg-[#303a7f] text-white rounded-xl hover:bg-[#252a5e] transition-all active:scale-95 font-black text-[9px] uppercase tracking-widest shadow-lg shadow-blue-900/20"><Globe size={14} /> Explorar</button>
            <button onClick={handleNewProveedor} className="flex items-center gap-2 px-4 py-2.5 bg-[#303a7f] text-white rounded-xl hover:bg-[#252a5e] transition-all active:scale-95 font-black text-[9px] uppercase tracking-widest shadow-lg shadow-blue-900/20"><Plus size={14} /> Nuevo Proveedor</button>
          </div>
        )}
        </div>
      </div>

      {/* ─── CANDIDATOS TAB ──────────────────────────────── */}
      {activeTab === 'candidatos' && (
        <div>
          {/* Table */}
          <div className="bg-white rounded-[2rem] shadow-xl border border-gray-100 overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#303a7f]">
                  <th className="px-5 py-4 text-[9px] font-black text-white uppercase tracking-widest">Nombre</th>
                  <th className="px-5 py-4 text-[9px] font-black text-white uppercase tracking-widest">Teléfono</th>
                  <th className="px-5 py-4 text-[9px] font-black text-white uppercase tracking-widest">Estado</th>
                  <th className="px-5 py-4 text-[9px] font-black text-white uppercase tracking-widest hidden md:table-cell">Últ. Llamada</th>
                  <th className="px-5 py-4 text-[9px] font-black text-white uppercase tracking-widest hidden md:table-cell">Próx. Llamada</th>
                  <th className="px-5 py-4 text-[9px] font-black text-white uppercase tracking-widest hidden lg:table-cell">Fuente</th>
                  <th className="px-5 py-4 text-[9px] font-black text-white uppercase tracking-widest">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredCandidatos.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-16 text-center">
                      <Users size={40} className="text-gray-100 mx-auto mb-4" />
                      <p className="text-[11px] font-black text-gray-300 uppercase tracking-wider">No se encontraron candidatos</p>
                    </td>
                  </tr>
                ) : (
                  filteredCandidatos.map(c => (
                    <tr key={c.id} className="group hover:bg-gray-50/50 transition-colors cursor-pointer" onClick={() => handleEditCandidato(c)}>
                      <td className="px-5 py-4">
                        <span className="text-[12px] font-black text-[#303a7f] uppercase tracking-tight">{c.nombre}</span>
                        {c.email && <span className="text-[9px] text-gray-400 block">{c.email}</span>}
                      </td>
                      <td className="px-5 py-4"><span className="text-[11px] font-bold text-gray-500">{c.telefono || '—'}</span></td>
                      <td className="px-5 py-4"><Badge estado={c.estado} /></td>
                      <td className="px-5 py-4 hidden md:table-cell">
                        <span className="text-[11px] font-bold text-gray-500 flex items-center gap-1.5">
                          <Phone size={11} className="text-gray-300" />
                          {c.ultima_llamada ? toMMDDYYYY(c.ultima_llamada) : '—'}
                        </span>
                      </td>
                      <td className="px-5 py-4 hidden md:table-cell">
                        <span className="text-[11px] font-bold text-gray-500 flex items-center gap-1.5">
                          <Calendar size={11} className="text-gray-300" />
                          {c.proxima_llamada ? toMMDDYYYY(c.proxima_llamada) : '—'}
                        </span>
                      </td>
                      <td className="px-5 py-4 hidden lg:table-cell"><span className="text-[10px] font-bold text-gray-400">{c.fuente || '—'}</span></td>
                      <td className="px-5 py-4">
                        <button onClick={(e) => { e.stopPropagation(); handleEditCandidato(c); }} className="px-3 py-1.5 text-[8px] font-black bg-gray-50 text-gray-400 rounded-lg hover:bg-[#303a7f]/5 hover:text-[#303a7f] transition-all uppercase tracking-widest border border-gray-100">Editar</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            <div className="px-5 py-3 bg-gray-50/50 border-t border-gray-100">
              <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{filteredCandidatos.length} candidato(s)</span>
            </div>
          </div>
        </div>
      )}

      {/* ─── PROVEEDORES TAB ─────────────────────────────── */}
      {activeTab === 'proveedores' && (
        <div>
          {/* ── PROYECTOS ───────────────────────────── */}
          {proveedoresSubTab === 'proyectos' && (
            <div>
              <div className="space-y-4">
                {filteredProyectos.length === 0 ? (
                  <div className="bg-white rounded-[2rem] p-16 text-center border-2 border-dashed border-gray-100/80 shadow-xl">
                    <Briefcase size={48} className="text-gray-100 mx-auto mb-6" />
                    <p className="text-gray-400 font-black text-base uppercase tracking-[0.2em]">No hay proyectos</p>
                    <p className="text-[10px] font-bold text-gray-300 mt-2">Cree un nuevo proyecto para comenzar</p>
                  </div>
                ) : (
                  filteredProyectos.map(p => {
                    const pCotizaciones = getCotizacionesByProyecto(p.id);
                    const selProv = p.proveedor_seleccionado_id ? getProveedorById(p.proveedor_seleccionado_id) : null;
                    return (
                      <div key={p.id} className="bg-white rounded-[2rem] p-6 shadow-xl border border-gray-100 hover:shadow-2xl transition-shadow">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-1">
                              <h3 className="text-sm font-black text-[#303a7f] uppercase tracking-tight">{p.nombre}</h3>
                              <Badge estado={p.estado} />
                            </div>
                            <div className="flex items-center gap-4 text-[10px] font-bold text-gray-400 mt-1">
                              {p.tienda && <span>{p.tienda}</span>}
                              {p.cliente && <span className="px-2 py-0.5 bg-[#303a7f]/5 rounded-lg text-[#303a7f]">{p.cliente}</span>}
                              {p.fecha_solicitud && <span className="flex items-center gap-1"><Calendar size={10} /> {toMMDDYYYY(p.fecha_solicitud)}</span>}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => handleEditProyecto(p)} className="p-2 text-gray-400 hover:text-[#303a7f] hover:bg-[#303a7f]/5 rounded-xl transition-all"><Edit3 size={14} /></button>
                            <button onClick={() => setDeleteConfirm({ show: true, message: `¿Eliminar proyecto "${p.nombre}"?`, onConfirm: () => deleteProyecto(p) })} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"><Trash2 size={14} /></button>
                          </div>
                        </div>

                        {p.descripcion && <p className="text-[10px] text-gray-500 mb-4 leading-relaxed">{p.descripcion}</p>}

                        {selProv && (
                          <div className="mb-4 p-3 bg-green-50 rounded-2xl border border-green-100 flex items-center gap-3">
                            <CheckCircle size={16} className="text-green-500 flex-shrink-0" />
                            <span className="text-[10px] font-black text-green-700 uppercase tracking-tight">Proveedor seleccionado: {selProv.nombre}</span>
                          </div>
                        )}

                        <div className="border-t border-gray-100 pt-4 mt-4">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Cotizaciones ({pCotizaciones.length})</h4>
                            {!p.proveedor_seleccionado_id && (
                              <button onClick={() => handleNewCotizacion(p.id)} className="flex items-center gap-1 px-3 py-1.5 bg-[#6bbdb7]/5 text-[#6bbdb7] rounded-xl border border-[#6bbdb7]/20 hover:bg-[#6bbdb7]/10 transition-all font-black text-[8px] uppercase tracking-widest"><Plus size={11} /> Agregar Cotización</button>
                            )}
                          </div>
                          {pCotizaciones.length === 0 ? (
                            <p className="text-[10px] font-bold text-gray-300 italic text-center py-3">Sin cotizaciones registradas</p>
                          ) : (
                            <table className="w-full text-left border-collapse">
                              <thead>
                                <tr className="border-b border-gray-50">
                                  <th className="pb-2 text-[8px] font-black text-gray-400 uppercase tracking-widest">Proveedor</th>
                                  <th className="pb-2 text-[8px] font-black text-gray-400 uppercase tracking-widest">Monto</th>
                                  <th className="pb-2 text-[8px] font-black text-gray-400 uppercase tracking-widest hidden sm:table-cell">Fecha</th>
                                  <th className="pb-2 text-[8px] font-black text-gray-400 uppercase tracking-widest">Estado</th>
                                  <th className="pb-2 text-[8px] font-black text-gray-400 uppercase tracking-widest">Archivo</th>
                                  <th className="pb-2 text-[8px] font-black text-gray-400 uppercase tracking-widest">Acción</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-50">
                                {pCotizaciones.map(ctz => {
                                  const prov = getProveedorById(ctz.proveedor_id);
                                  const isSel = p.proveedor_seleccionado_id === ctz.proveedor_id;
                                  return (
                                    <tr key={ctz.id} className={isSel ? 'bg-[#6bbdb7]/5' : ''}>
                                      <td className="py-2.5 pr-2">
                                        <span className="text-[10px] font-black text-[#303a7f]">{prov?.nombre || '—'}</span>
                                      </td>
                                      <td className="py-2.5 pr-2"><span className="text-[10px] font-black text-[#303a7f]">{ctz.monto ? `$${parseFloat(ctz.monto).toFixed(2)}` : '—'}</span></td>
                                      <td className="py-2.5 pr-2 hidden sm:table-cell"><span className="text-[9px] font-bold text-gray-400">{ctz.fecha_cotizacion ? toMMDDYYYY(ctz.fecha_cotizacion) : '—'}</span></td>
                                      <td className="py-2.5 pr-2"><Badge estado={ctz.estado} /></td>
                                      <td className="py-2.5 pr-2">
                                        {ctz.archivo ? (
                                          <button onClick={() => openFileFromBase64(ctz.archivo)} className="inline-flex items-center gap-1 text-[#303a7f] hover:text-[#6bbdb7] transition-colors" title="Ver archivo">
                                            <Download size={11} />
                                          </button>
                                        ) : <span className="text-[8px] text-gray-300">—</span>}
                                      </td>
                                      <td className="py-2.5">
                                        <div className="flex items-center gap-1">
                                          {!p.proveedor_seleccionado_id && ctz.estado !== 'Rechazada' && (
                                            <button onClick={() => selectBestProvider(p, ctz.proveedor_id)} className="px-2 py-1 text-[7px] font-black bg-[#303a7f]/5 text-[#303a7f] rounded-lg hover:bg-[#303a7f]/10 transition-all uppercase tracking-widest border border-[#303a7f]/10">Seleccionar</button>
                                          )}
                                          {isSel && <CheckCircle size={14} className="text-[#6bbdb7]" />}
                                          {!p.proveedor_seleccionado_id && (
                                            <button onClick={(e) => handleEditCotizacion(ctz, e)} className="p-1 text-gray-400 hover:text-[#303a7f] hover:bg-gray-100 rounded-lg transition-all"><Edit3 size={10} /></button>
                                          )}
                                          {!p.proveedor_seleccionado_id && (
                                            <button onClick={(e) => { e.stopPropagation(); setDeleteConfirm({ show: true, message: `¿Eliminar cotización de "${getProveedorById(ctz.proveedor_id)?.nombre || '?'}"?`, onConfirm: () => deleteCotizacion(ctz) }); }} className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"><Trash2 size={10} /></button>
                                          )}
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* ── PROVEEDORES ──────────────────────────── */}
          {proveedoresSubTab === 'proveedores' && (
            <div>
              <div className="bg-white rounded-[2rem] shadow-xl border border-gray-100 overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#303a7f]">
                      <th className="px-5 py-4 text-[9px] font-black text-white uppercase tracking-widest">Nombre</th>
                      <th className="px-5 py-4 text-[9px] font-black text-white uppercase tracking-widest hidden md:table-cell">Contacto</th>
                      <th className="px-5 py-4 text-[9px] font-black text-white uppercase tracking-widest hidden md:table-cell">Teléfono</th>
                      <th className="px-5 py-4 text-[9px] font-black text-white uppercase tracking-widest hidden lg:table-cell">Email</th>
                      <th className="px-5 py-4 text-[9px] font-black text-white uppercase tracking-widest hidden lg:table-cell">Especialidad</th>
                      <th className="px-5 py-4 text-[9px] font-black text-white uppercase tracking-widest hidden lg:table-cell">Estado</th>
                      <th className="px-5 py-4 text-[9px] font-black text-white uppercase tracking-widest hidden lg:table-cell">Ciudad</th>
                      <th className="px-5 py-4 text-[9px] font-black text-white uppercase tracking-widest">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredProveedores.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-5 py-16 text-center">
                          <Building2 size={40} className="text-gray-100 mx-auto mb-4" />
                          <p className="text-[11px] font-black text-gray-300 uppercase tracking-wider">No se encontraron proveedores</p>
                        </td>
                      </tr>
                    ) : (
                      filteredProveedores.map(p => (
                        <tr key={p.id} className="group hover:bg-gray-50/50 transition-colors cursor-pointer" onClick={() => handleEditProveedor(p)}>
                          <td className="px-5 py-4">
                            <span className="text-[12px] font-black text-[#303a7f] uppercase tracking-tight">{p.nombre}</span>
                          </td>
                          <td className="px-5 py-4 hidden md:table-cell"><span className="text-[11px] font-bold text-gray-500">{p.contacto || '—'}</span></td>
                          <td className="px-5 py-4 hidden md:table-cell"><span className="text-[11px] font-bold text-gray-500">{p.telefono || '—'}</span></td>
                          <td className="px-5 py-4 hidden lg:table-cell"><span className="text-[10px] font-bold text-gray-400">{p.email || '—'}</span></td>
                          <td className="px-5 py-4 hidden lg:table-cell"><span className="text-[10px] font-bold text-gray-400">{p.especialidad || '—'}</span></td>
                          <td className="px-5 py-4 hidden lg:table-cell"><span className="text-[10px] font-bold text-gray-400">{p.estado || '—'}</span></td>
                          <td className="px-5 py-4 hidden lg:table-cell"><span className="text-[10px] font-bold text-gray-400">{p.ciudad || '—'}</span></td>
                          <td className="px-5 py-4">
                            <button onClick={(e) => { e.stopPropagation(); handleEditProveedor(p); }} className="px-3 py-1.5 text-[8px] font-black bg-gray-50 text-gray-400 rounded-lg hover:bg-[#303a7f]/5 hover:text-[#303a7f] transition-all uppercase tracking-widest border border-gray-100">Editar</button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
                <div className="px-5 py-3 bg-gray-50/50 border-t border-gray-100">
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{filteredProveedores.length} proveedor(es)</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {renderCandidatoModal()}
      {renderProveedorModal()}
      {renderBuscarProveedoresModal()}
      {renderProyectoModal()}
      {renderCotizacionModal()}
      {renderRegistrarLlamadaModal()}
      {renderDeleteConfirmModal()}
    </div>
  );
}
