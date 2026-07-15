import React, { useState, useRef, useEffect } from "react";

// Parche para almacenamiento local (usado para guardar las imágenes de facturas temporalmente)
if (!window.storage) {
    window.storage = {
        get: async (key) => {
            const val = localStorage.getItem(key);
            return val ? { value: val } : null;
        },
        set: async (key, value) => {
            localStorage.setItem(key, value);
        },
        delete: async (key) => {
            localStorage.removeItem(key);
        }
    };
}

/* ============================================================
   E·BOX COURIER — App del cliente v4 (Conectada a .NET/SQL)
   Branding oficial: cubos isométricos rojo · azul · verde
   Empresa hermana de Grupo Asimex (agencia aduanal licenciada)
   ============================================================ */

const T = {
    bgOuter: "#101216",
    panel: "#F5F6F8",
    surface: "#FFFFFF",
    ink: "#17191E",
    muted: "#6B7280",
    line: "#E4E7EC",
    charcoal: "#17191E",
    rojo: "#E02428",
    rojoSoft: "#FCE9E9",
    azul: "#1B87C9",
    azulOsc: "#1565A3",
    azulClaro: "#4FB3E8",
    azulSoft: "#E7F3FB",
    verde: "#5FAE3A",
    verdeOsc: "#4E9B33",
    verdeSoft: "#EAF5E4",
    amberSoft: "#FFF4D6",
    amberInk: "#8A6200",
};

const FONTS = `
@import url('https://fonts.googleapis.com/css2?family=Sora:wght@600;700;800&family=Inter:wght@400;500;600;700&display=swap');
`;

const SESION_KEY = "ebox-courier-sesion-v1";

/* ============================================================
   LOGO E·BOX COURIER — recreación vectorial del logo oficial
   ============================================================ */
const Cubo = ({ x, y, s, top, izq, der }) => {
    const h = s * 0.58;
    return (
        <g transform={`translate(${x},${y})`}>
            <polygon points={`0,${-2 * h} ${s},${-h} 0,0 ${-s},${-h}`} fill={top} />
            <polygon points={`${-s},${-h} 0,0 0,${2 * h} ${-s},${h}`} fill={izq} />
            <polygon points={`${s},${-h} 0,0 0,${2 * h} ${s},${h}`} fill={der} />
            <g fill="#FFFFFF">
                <polygon points={`0,${0.15 * h} ${0.09 * s},${-0.75 * h} 0,${-1.3 * h} ${-0.09 * s},${-0.75 * h}`} />
                <polygon points={`0,${0.15 * h} ${-0.62 * s},${0.62 * h} ${-0.4 * s},${-0.05 * h}`} opacity="0.95" />
                <polygon points={`0,${0.15 * h} ${0.62 * s},${0.62 * h} ${0.4 * s},${-0.05 * h}`} opacity="0.95" />
            </g>
        </g>
    );
};

const CubosEbox = ({ size = 64 }) => (
    <svg width={size} height={size * 0.92} viewBox="0 0 120 110">
        <Cubo x={60} y={40} s={24} top="#EF4348" izq="#E02428" der="#B71B20" />
        <Cubo x={36} y={70} s={24} top="#3FA9E0" izq="#1B87C9" der="#12639C" />
        <Cubo x={84} y={70} s={24} top="#8CC63F" izq="#6FBE44" der="#4E9B33" />
    </svg>
);

const LogoEbox = ({ dark = false, size = 24, horizontal = true, tagline = false }) => (
    <div style={{ display: "flex", flexDirection: horizontal ? "row" : "column", alignItems: "center", gap: horizontal ? 10 : 6 }}>
        <CubosEbox size={horizontal ? size * 1.9 : size * 3.4} />
        <div style={{ textAlign: horizontal ? "left" : "center" }}>
            <div style={{ fontFamily: "Sora, sans-serif", fontWeight: 800, fontSize: size, color: dark ? "#FFFFFF" : T.ink, lineHeight: 1.05, letterSpacing: 0.5 }}>
                E·BOX <span style={{ fontWeight: 700 }}>COURIER</span>
            </div>
            {tagline && (
                <div style={{ fontFamily: "Inter, sans-serif", fontSize: Math.max(size * 0.38, 10), fontWeight: 600, letterSpacing: size * 0.06, color: dark ? "#9CA3AF" : T.muted, marginTop: 3 }}>
                    SOMOS TU MEJOR OPCIÓN
                </div>
            )}
        </div>
    </div>
);

const Tricolor = ({ height = 3 }) => (
    <div style={{ height, background: `linear-gradient(90deg, ${T.rojo} 0%, ${T.rojo} 33.3%, ${T.azul} 33.3%, ${T.azul} 66.6%, ${T.verde} 66.6%, ${T.verde} 100%)` }} />
);

/* ---------- Utilidades ---------- */
async function setStorageConReintentos(key, value, intentos = 3) {
    let ultimoError = null;
    for (let i = 0; i < intentos; i++) {
        try {
            await window.storage.set(key, value);
            return true;
        } catch (e) {
            ultimoError = e;
            if (i < intentos - 1) await new Promise((r) => setTimeout(r, 1500));
        }
    }
    throw ultimoError || new Error("No se pudo guardar en el almacenamiento local");
}

const CATEGORIAS = [
    { id: "ropa", nombre: "Ropa y calzado", dai: 15 },
    { id: "electronica", nombre: "Electrónica y computación", dai: 0 },
    { id: "celulares", nombre: "Celulares y accesorios", dai: 0 },
    { id: "suplementos", nombre: "Suplementos y vitaminas", dai: 10 },
    { id: "repuestos", nombre: "Repuestos automotrices / moto", dai: 5 },
    { id: "juguetes", nombre: "Juguetes", dai: 15 },
    { id: "hogar", nombre: "Hogar y cocina", dai: 15 },
    { id: "herramientas", nombre: "Herramientas", dai: 5 },
    { id: "otros", nombre: "Otros", dai: 10 },
];
const TARIFA_LB = 2.99;
const IVA = 13;
const LIMITE_COURIER = 300;

const ETAPAS = [
    { id: 1, nombre: "Pre-alertado", desc: "Recibimos tu pre-alerta y factura" },
    { id: 2, nombre: "Recibido en Miami", desc: "Tu paquete llegó a nuestra bodega" },
    { id: 3, nombre: "En vuelo a El Salvador", desc: "Consolidado y embarcado" },
    { id: 4, nombre: "En aduana (DGA)", desc: "Declaración presentada por nuestro agente aduanal" },
    { id: 5, nombre: "Liquidado — impuestos claros", desc: "DAI e IVA calculados y desglosados" },
    { id: 6, nombre: "En ruta de entrega", desc: "Tu paquete va en camino" },
    { id: 7, nombre: "Entregado", desc: "¡Disfrutalo!" },
];

/* ============================================================
   RASTREO PUERTA A PUERTA — Tramo USA (Conectado al Backend)
   ============================================================ */
async function consultarRastreoUSA(tracking) {
    // Petición al backend en .NET para evitar bloqueos CORS
    const response = await fetch("/api/chat/rastrear", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tracking }),
    });

    if (!response.ok) throw new Error("Error de API al rastrear");
    return await response.json();
}

const horaSV = () => new Date().toLocaleTimeString("es-SV", { hour: "2-digit", minute: "2-digit" });
const fechaSV = () => new Date().toLocaleDateString("es-SV");
const totalPaquete = (p) => p.costos ? p.costos.flete + p.costos.dai + p.costos.iva + p.costos.servicio : 0;
const MOTORISTAS = ["Carlos", "Wilfredo", "Karla"];

const EMISOR = {
    razon: "E·Box Courier, S.A. de C.V.",
    nit: "0614-000000-000-0",
    nrc: "000000-0",
    actividad: "Servicios de courier y encomiendas",
    direccion: "San Salvador, El Salvador",
    telefono: "0000-0000",
    correo: "facturacion@eboxcourier.com",
};

function numeroALetras(n) {
    const U = ["", "UNO", "DOS", "TRES", "CUATRO", "CINCO", "SEIS", "SIETE", "OCHO", "NUEVE", "DIEZ", "ONCE", "DOCE", "TRECE", "CATORCE", "QUINCE", "DIECISÉIS", "DIECISIETE", "DIECIOCHO", "DIECINUEVE", "VEINTE"];
    const D = ["", "", "VEINTI", "TREINTA", "CUARENTA", "CINCUENTA", "SESENTA", "SETENTA", "OCHENTA", "NOVENTA"];
    const C = ["", "CIENTO", "DOSCIENTOS", "TRESCIENTOS", "CUATROCIENTOS", "QUINIENTOS", "SEISCIENTOS", "SETECIENTOS", "OCHOCIENTOS", "NOVECIENTOS"];
    const tresc = (x) => {
        if (x === 0) return "";
        if (x === 100) return "CIEN";
        let s = "";
        const c = Math.floor(x / 100), r = x % 100;
        if (c) s += C[c] + " ";
        if (r <= 20) s += U[r];
        else {
            const d = Math.floor(r / 10), u = r % 10;
            if (d === 2) s += u ? "VEINTI" + U[u] : "VEINTE";
            else s += D[d] + (u ? " Y " + U[u] : "");
        }
        return s.trim();
    };
    n = Math.floor(n);
    if (n === 0) return "CERO";
    let s = "";
    const millones = Math.floor(n / 1e6);
    const miles = Math.floor((n % 1e6) / 1000);
    const resto = n % 1000;
    if (millones) s += (millones === 1 ? "UN MILLÓN" : tresc(millones) + " MILLONES") + " ";
    if (miles) s += (miles === 1 ? "MIL" : tresc(miles) + " MIL") + " ";
    if (resto) s += tresc(resto);
    return s.trim();
}

const totalEnLetras = (t) => {
    const d = Math.floor(t);
    const c = Math.round((t - d) * 100);
    const letras = numeroALetras(d).replace(/UNO$/, "UN").replace(/VEINTIUN$/, "VEINTIÚN");
    return `${letras} ${d === 1 ? "DÓLAR" : "DÓLARES"} CON ${String(c).padStart(2, "0")}/100 USD`;
};

/* ============================================================
   FACTURAS ADJUNTAS (Manejo local de archivos)
   ============================================================ */
let pdfjsPromise = null;
function cargarPdfJs() {
    if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
    if (pdfjsPromise) return pdfjsPromise;
    pdfjsPromise = new Promise((res, rej) => {
        const s = document.createElement("script");
        s.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
        s.onload = () => {
            window.pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
            res(window.pdfjsLib);
        };
        s.onerror = () => rej(new Error("No se pudo cargar el lector de PDF"));
        document.head.appendChild(s);
    });
    return pdfjsPromise;
}

function comprimirImagen(dataUrl, max = 1200, calidad = 0.72) {
    return new Promise((res, rej) => {
        const img = new Image();
        img.onload = () => {
            let w = img.width, h = img.height;
            if (w > max || h > max) {
                const k = Math.min(max / w, max / h);
                w = Math.round(w * k); h = Math.round(h * k);
            }
            const c = document.createElement("canvas");
            c.width = w; c.height = h;
            c.getContext("2d").drawImage(img, 0, 0, w, h);
            res(c.toDataURL("image/jpeg", calidad));
        };
        img.onerror = () => rej(new Error("La imagen no se pudo leer"));
        img.src = dataUrl;
    });
}

async function ajustarPesoPaginas(paginas) {
    const total = paginas.reduce((a, s) => a + s.length, 0);
    if (total <= 3500000) return paginas;
    const recomprimidas = [];
    for (const pag of paginas) recomprimidas.push(await comprimirImagen(pag, 1100, 0.6));
    return recomprimidas;
}

async function procesarArchivoFactura(file) {
    const nombre = file.name;
    if (/\.pdf$/i.test(nombre) || file.type === "application/pdf") {
        const pdfjs = await cargarPdfJs();
        const buf = await file.arrayBuffer();
        const doc = await pdfjs.getDocument({ data: buf }).promise;
        const maxPag = Math.min(doc.numPages, 3);
        const paginas = [];
        for (let i = 1; i <= maxPag; i++) {
            const page = await doc.getPage(i);
            const viewport = page.getViewport({ scale: 1.15 });
            const canvas = document.createElement("canvas");
            canvas.width = viewport.width; canvas.height = viewport.height;
            await page.render({ canvasContext: canvas.getContext("2d"), viewport }).promise;
            paginas.push(canvas.toDataURL("image/jpeg", 0.72));
        }
        if (!paginas.length) throw new Error("PDF vacío o ilegible");
        return { nombre, paginas: await ajustarPesoPaginas(paginas) };
    }
    if (file.type.startsWith("image/") || /\.(jpe?g|png|webp|gif)$/i.test(nombre)) {
        const dataUrl = await new Promise((res, rej) => {
            const r = new FileReader();
            r.onload = () => res(r.result);
            r.onerror = () => rej(new Error("No se pudo leer " + nombre));
            r.readAsDataURL(file);
        });
        const paginas = await ajustarPesoPaginas([await comprimirImagen(dataUrl)]);
        return { nombre, paginas };
    }
    throw new Error("Formato no soportado — usá imagen (JPG/PNG) o PDF");
}

const facturaKey = (pkgId) => `factura:${pkgId}`;
const facturaPagKey = (pkgId, n) => `factura:${pkgId}:p${n}`;

async function guardarFacturaStorage(pkgId, datos) {
    const { paginas, ...meta } = datos;
    if (paginas.length === 1) {
        await setStorageConReintentos(facturaKey(pkgId), JSON.stringify({ ...meta, paginas }));
        return;
    }
    for (let i = 0; i < paginas.length; i++) {
        await setStorageConReintentos(facturaPagKey(pkgId, i + 1), JSON.stringify({ img: paginas[i] }));
        await new Promise((r) => setTimeout(r, 250));
    }
    await setStorageConReintentos(facturaKey(pkgId), JSON.stringify({ ...meta, multi: true, totalPaginas: paginas.length }));
}

async function cargarFacturaStorage(pkgId) {
    try {
        const r = await window.storage.get(facturaKey(pkgId));
        if (!r) return null;
        const indice = JSON.parse(r.value);
        if (!indice.multi) return indice;
        const paginas = [];
        for (let i = 1; i <= indice.totalPaginas; i++) {
            try {
                const rp = await window.storage.get(facturaPagKey(pkgId, i));
                if (rp) paginas.push(JSON.parse(rp.value).img);
            } catch (e) { }
        }
        return { ...indice, paginas };
    } catch (e) {
        return null;
    }
}

function FacturaModal({ pkg, onClose }) {
    const [datos, setDatos] = useState(null);
    const [estado, setEstado] = useState("cargando");
    useEffect(() => {
        (async () => {
            const d = await cargarFacturaStorage(pkg.id);
            if (d && d.paginas && d.paginas.length) { setDatos(d); setEstado("ok"); }
            else setEstado("vacio");
        })();
    }, [pkg.id]);
    return (
        <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(16,18,22,.72)", zIndex: 90, display: "flex", justifyContent: "center", alignItems: "flex-start", overflowY: "auto", padding: "24px 12px" }}>
            <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 420, background: "#fff", borderRadius: 14, overflow: "hidden", boxShadow: "0 16px 48px rgba(16,18,22,.35)" }}>
                <div style={{ padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid " + T.line }}>
                    <div style={{ fontFamily: "Sora, sans-serif", fontWeight: 800, fontSize: 14, color: T.ink }}>📄 Factura · {pkg.id}</div>
                    <button onClick={onClose} style={{ border: "none", background: "none", fontSize: 20, cursor: "pointer", color: T.muted }}>✕</button>
                </div>
                <div style={{ padding: 14 }}>
                    {estado === "cargando" && <div style={{ textAlign: "center", color: T.muted, fontSize: 13, padding: 20 }}>Cargando factura…</div>}
                    {estado === "vacio" && <div style={{ textAlign: "center", color: T.muted, fontSize: 13, padding: 20 }}>No se encontró el archivo de la factura.</div>}
                    {estado === "ok" && (
                        <>
                            <div style={{ fontSize: 11.5, color: T.muted, marginBottom: 8 }}>{datos.nombre} · {datos.fecha} · {datos.paginas.length} página(s)</div>
                            {datos.paginas.map((src, i) => (
                                <img key={i} src={src} alt={`Factura página ${i + 1}`} style={{ width: "100%", borderRadius: 10, border: "1px solid " + T.line, marginBottom: 8, display: "block" }} />
                            ))}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

const Chip = ({ children, color, soft }) => (
    <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: 999, fontSize: 11.5, fontWeight: 700, color, background: soft, whiteSpace: "nowrap" }}>
        {children}
    </span>
);

const etapaChip = (etapa) => {
    if (etapa >= 7) return { t: "Entregado", c: T.verdeOsc, s: T.verdeSoft };
    if (etapa >= 6) return { t: "En ruta", c: T.verdeOsc, s: T.verdeSoft };
    if (etapa >= 5) return { t: "Liquidado — listo para pago", c: T.azulOsc, s: T.azulSoft };
    if (etapa >= 4) return { t: "En aduana", c: T.amberInk, s: T.amberSoft };
    if (etapa >= 3) return { t: "En vuelo ✈", c: T.azulOsc, s: T.azulSoft };
    if (etapa >= 2) return { t: "En Miami", c: T.muted, s: T.line };
    return { t: "Pre-alertado", c: T.muted, s: T.line };
};

const fmt = (n) => `$${Number(n || 0).toFixed(2)}`;

/* ============================================================
   CONSOLA DE ADMINISTRACIÓN — E·BOX OS Operaciones
   ============================================================ */
function AdminConsole({ db, setDb, cerrarSesion }) {
    const [vista, setVista] = useState("control");
    const [q, setQ] = useState("");
    const [filtroEtapa, setFiltroEtapa] = useState(0);
    const [abierto, setAbierto] = useState(null);
    const [liq, setLiq] = useState({});
    const [motoDraft, setMotoDraft] = useState({});
    const [rxTracking, setRxTracking] = useState("");
    const [rxPeso, setRxPeso] = useState("");
    const [rxResultado, setRxResultado] = useState(null);
    const [toast, setToast] = useState("");
    const [rastreandoA, setRastreandoA] = useState(null);
    const [subFact, setSubFact] = useState("cobros");
    const [proformaId, setProformaId] = useState(null);
    const [cliAbierto, setCliAbierto] = useState(null);
    const [verFacturaA, setVerFacturaA] = useState(null);
    const [cliCambiarRol, setCliCambiarRol] = useState(null);


    const avisar = (t) => { setToast(t); setTimeout(() => setToast(""), 2500); };

    // Cargar usuarios y paquetes cuando se monta AdminConsole
    useEffect(() => {
        (async () => {
            try {
                // Cargar todos los usuarios
                const resUsuarios = await fetch('/api/usuarios');
                if (resUsuarios.ok) {
                    const usuarios = await resUsuarios.json();
                    console.log("Usuarios recibidos:", usuarios);
                    setDb((prevDb) => ({ ...prevDb, usuarios }));
                }

                // Cargar todos los paquetes
                const resPaquetes = await fetch('/api/paquetes');
                if (resPaquetes.ok) {
                    const paquetes = await resPaquetes.json();
                    setDb((prevDb) => ({ ...prevDb, paquetes }));
                }
            } catch (e) {
                console.error("Error al cargar datos de admin:", e);
                avisar("Error al cargar datos");
            }
        })();
    }, []);

    // Función genérica para enviar actualizaciones al backend
    const actualizarPaquete = async (pkgId, cambios) => {
        try {
            const res = await fetch(`/api/paquetes/${pkgId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(cambios)
            });
            if (res.ok) {
                const pActualizado = await res.json();
                const nuevos = db.paquetes.map((p) => (p.id === pkgId ? pActualizado : p));
                setDb({ ...db, paquetes: nuevos });
            }
        } catch (e) {
            avisar("Error al sincronizar con el servidor");
        }
    };

    const abrirProforma = async (p) => {
        if (!p.proforma) {
            const numero = "PRO-" + Math.floor(Math.random() * 10000);
            await actualizarPaquete(p.id, { proforma: { numero, fecha: fechaSV() } });
        }
        setProformaId(p.id);
    };

    const rastrearUSAAdmin = async (p) => {
        if (rastreandoA) return;
        setRastreandoA(p.id);
        try {
            const r = await consultarRastreoUSA(p.tracking);
            await actualizarPaquete(p.id, { tramoUSA: { ...r, actualizado: horaSV() } });
            avisar(r.encontrado ? `Rastreo actualizado: ${r.estado}` : "El carrier aún no publica info de ese tracking");
        } catch (e) {
            avisar("No se pudo consultar el rastreo — reintentá");
        }
        setRastreandoA(null);
    };

    const clientes = db.usuarios ? db.usuarios.filter((u) => u.rol !== "admin") : [];
    const clientePor = (id) => db.usuarios ? db.usuarios.find((u) => u.id === id) : null;

    const registrarPago = async (p, metodo) => {
        const numero = "FAC-" + Math.floor(Math.random() * 10000);
        const fechas = [...p.fechas];
        if (!fechas[5]) fechas[5] = "hoy";
        await actualizarPaquete(p.id, {
            pagado: true,
            entrega: p.entrega || "agencia",
            etapa: Math.max(p.etapa, 6),
            fechas,
            factura: { numero, fecha: fechaSV(), metodo },
        });
        avisar(`${numero} emitida · ${metodo} · ${fmt(totalPaquete(p))}`);
    };

    const asignarMotorista = async (p, nombre) => {
        if (!nombre) return;
        await actualizarPaquete(p.id, { motorista: nombre });
        avisar(`${p.id} asignado a ${nombre}`);
    };

    const marcarEntregado = async (p) => {
        const fechas = [...p.fechas];
        for (let i = 0; i < 7; i++) if (!fechas[i]) fechas[i] = "hoy";
        await actualizarPaquete(p.id, { etapa: 7, fechas, entregadoFecha: fechaSV() });
        avisar(`${p.id} entregado ✓`);
    };

    const cambiarRolUsuario = async (usuarioId, nuevoRol) => {
        try {
            const res = await fetch(`/api/usuarios/${usuarioId}/rol`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ rol: nuevoRol })
            });
            if (res.ok) {
                const usuarioActualizado = await res.json();
                const nuevosUsuarios = db.usuarios.map((u) => (u.id === usuarioId ? usuarioActualizado : u));
                setDb({ ...db, usuarios: nuevosUsuarios });
                avisar(`✓ ${usuarioActualizado.nombre} es ahora ${nuevoRol === "admin" ? "administrador" : "cliente"}`);
                setCliCambiarRol(null);
            } else {
                avisar("Error al cambiar el rol");
            }
        } catch (e) {
            avisar("Error al sincronizar con el servidor");
        }
    };

    const setEtapa = async (p, nueva) => {
        const fechas = [...p.fechas];
        for (let i = 0; i < nueva; i++) if (!fechas[i]) fechas[i] = "hoy";
        for (let i = nueva; i < fechas.length; i++) if (i >= nueva) fechas[i] = i < p.etapa ? fechas[i] : null;
        await actualizarPaquete(p.id, { etapa: nueva, fechas });
        avisar(`${p.id} → ${ETAPAS[nueva - 1].nombre}`);
    };

    const borradorLiq = (p) => {
        if (liq[p.id]) return liq[p.id];
        const peso = p.pesoLb || "";
        const flete = peso ? (peso * TARIFA_LB).toFixed(2) : "";
        const cat = CATEGORIAS.find((c) => c.id === p.categoria) || CATEGORIAS[CATEGORIAS.length - 1];
        const daiSug = peso ? (p.valor <= LIMITE_COURIER ? "0.00" : (((p.valor + peso * TARIFA_LB) * cat.dai) / 100).toFixed(2)) : "";
        return { peso, dai: daiSug, servicio: "4.50", _flete: flete };
    };

    const setLiqCampo = (pkgId, base, campo, valor) => {
        const b = { ...base, [campo]: valor };
        if (campo === "peso") b._flete = valor ? (parseFloat(valor) * TARIFA_LB).toFixed(2) : "";
        setLiq({ ...liq, [pkgId]: b });
    };

    const guardarLiquidacion = async (p) => {
        const b = borradorLiq(p);
        const peso = parseFloat(b.peso);
        if (!peso) { avisar("Ingresá el peso real"); return; }
        const flete = peso * TARIFA_LB;
        const dai = parseFloat(b.dai) || 0;
        const servicio = parseFloat(b.servicio) || 0;
        const iva = ((p.valor + flete + dai) * IVA) / 100;
        const fechas = [...p.fechas];
        for (let i = 0; i < 5; i++) if (!fechas[i]) fechas[i] = "hoy";
        await actualizarPaquete(p.id, {
            pesoLb: peso,
            costos: { flete: +flete.toFixed(2), dai: +dai.toFixed(2), iva: +iva.toFixed(2), servicio: +servicio.toFixed(2) },
            etapa: Math.max(p.etapa, 5),
            fechas,
        });
        const copia = { ...liq }; delete copia[p.id]; setLiq(copia);
        avisar(`${p.id} liquidado — el cliente ya ve su desglose`);
    };

    const buscarTracking = () => {
        const t = rxTracking.trim().toLowerCase();
        if (!t) return;
        const p = db.paquetes.find((x) => (x.tracking || "").toLowerCase() === t);
        setRxResultado(p || "no");
        setRxPeso(p && p.pesoLb ? String(p.pesoLb) : "");
    };

    const recibirEnMiami = async () => {
        if (!rxResultado || rxResultado === "no") return;
        const p = rxResultado;
        const fechas = [...p.fechas];
        if (!fechas[0]) fechas[0] = "hoy";
        fechas[1] = "hoy";
        await actualizarPaquete(p.id, {
            etapa: Math.max(p.etapa, 2),
            pesoLb: parseFloat(rxPeso) || p.pesoLb,
            fechas,
        });
        avisar(`${p.id} recibido en bodega Miami ✓`);
        setRxResultado(null); setRxTracking(""); setRxPeso("");
    };

    const ql = q.toLowerCase();
    const lista = (db.paquetes || []).filter((p) => {
        const cli = clientePor(p.userId);
        const matchQ = !ql || [p.id, p.tracking, p.descripcion, p.tienda, cli?.nombre, cli?.codigo].join(" ").toLowerCase().includes(ql);
        const matchE = !filtroEtapa || p.etapa === filtroEtapa;
        return matchQ && matchE;
    });

    const kpi = {
        total: (db.paquetes || []).length,
        miami: (db.paquetes || []).filter((p) => p.etapa === 2).length,
        aduana: (db.paquetes || []).filter((p) => p.etapa === 4).length,
        porPagar: (db.paquetes || []).filter((p) => p.etapa === 5 && !p.pagado).length,
    };

    const card = { background: "#fff", borderRadius: 14, padding: 16, border: "1px solid " + T.line, boxShadow: "0 1px 3px rgba(16,18,22,.05)" };
    const input = { width: "100%", padding: "11px 12px", border: "1px solid #D8DCE3", borderRadius: 10, fontFamily: "Inter, sans-serif", fontSize: 13.5, color: T.ink, background: "#fff", boxSizing: "border-box" };
    const label = { display: "block", fontSize: 10.5, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase", color: T.muted, marginBottom: 4 };
    const btnMini = (activo, color = T.azul) => ({
        padding: "6px 10px", borderRadius: 8, fontSize: 11.5, fontWeight: 700, cursor: "pointer",
        fontFamily: "Inter, sans-serif", border: "1.5px solid " + (activo ? color : T.line),
        background: activo ? color : "#fff", color: activo ? "#fff" : T.ink,
    });

    return (
        <>
            <div style={{ background: T.charcoal, color: "#fff" }}>
                <div style={{ padding: "14px 18px 11px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <CubosEbox size={30} />
                        <div>
                            <div style={{ fontFamily: "Sora, sans-serif", fontWeight: 800, fontSize: 15, letterSpacing: 0.4 }}>E·BOX OS</div>
                            <div style={{ fontSize: 10.5, color: "#9CA3AF", letterSpacing: 0.6 }}>CONSOLA DE OPERACIONES</div>
                        </div>
                    </div>
                    <button onClick={cerrarSesion} style={{ border: "1px solid #2A2E36", background: "none", color: "#9CA3AF", borderRadius: 9, padding: "5px 10px", fontSize: 11.5, fontWeight: 700, cursor: "pointer" }}>Salir</button>
                </div>
                <Tricolor />
            </div>

            {toast && <div style={{ position: "absolute", top: 70, left: 16, right: 16, zIndex: 40, background: T.verdeSoft, color: T.verdeOsc, border: "1px solid " + T.verde, borderRadius: 11, padding: "10px 14px", fontSize: 13, fontWeight: 700, textAlign: "center" }}>{toast}</div>}

            <div style={{ flex: 1, overflowY: "auto", padding: 14, paddingBottom: 84 }}>
                {vista === "control" && (
                    <div style={{ display: "grid", gap: 12 }}>
                        <div>
                            <div style={{ fontFamily: "Sora, sans-serif", fontWeight: 800, fontSize: 16, color: T.ink, marginBottom: 10 }}>📊 Dashboard de Operaciones</div>

                            <div style={{ display: "grid", gridTemplateColumns: window.innerWidth < 600 ? "1fr 1fr" : "repeat(4, 1fr)", gap: 10 }}>
                                <div style={{ ...card, padding: "14px 12px", textAlign: "center" }}>
                                    <div style={{ fontFamily: "Sora, sans-serif", fontWeight: 800, fontSize: 24, color: T.ink }}>{db.paquetes?.length || 0}</div>
                                    <div style={{ fontSize: 10.5, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: 0.3, marginTop: 6 }}>📦 Paquetes totales</div>
                                </div>

                                <div style={{ ...card, padding: "14px 12px", textAlign: "center" }}>
                                    <div style={{ fontFamily: "Sora, sans-serif", fontWeight: 800, fontSize: 24, color: T.azulOsc }}>{db.paquetes?.filter(p => p.etapa === 2).length || 0}</div>
                                    <div style={{ fontSize: 10.5, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: 0.3, marginTop: 6 }}>🇺🇸 En Miami</div>
                                </div>

                                <div style={{ ...card, padding: "14px 12px", textAlign: "center" }}>
                                    <div style={{ fontFamily: "Sora, sans-serif", fontWeight: 800, fontSize: 24, color: T.amberInk }}>{db.paquetes?.filter(p => p.etapa === 4).length || 0}</div>
                                    <div style={{ fontSize: 10.5, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: 0.3, marginTop: 6 }}>📋 En aduana</div>
                                </div>

                                <div style={{ ...card, padding: "14px 12px", textAlign: "center" }}>
                                    <div style={{ fontFamily: "Sora, sans-serif", fontWeight: 800, fontSize: 24, color: T.verdeOsc }}>{clientes.length}</div>
                                    <div style={{ fontSize: 10.5, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: 0.3, marginTop: 6 }}>👥 Clientes activos</div>
                                </div>
                            </div>
                        </div>

                        <div style={{ ...card, padding: 14 }}>
                            <div style={{ fontWeight: 700, fontSize: 13, color: T.ink, marginBottom: 10 }}>📈 Resumen por etapa</div>
                            <div style={{ display: "grid", gap: 8 }}>
                                {ETAPAS.map((e) => {
                                    const count = (db.paquetes || []).filter(p => p.etapa === e.id).length;
                                    const pct = ((db.paquetes?.length || 0) > 0 ? ((count / (db.paquetes?.length || 1)) * 100).toFixed(0) : 0);
                                    return (
                                        <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                            <div style={{ flex: 0.3, fontSize: 11, fontWeight: 700, color: T.muted }}>{e.id}. {e.nombre.split(" —")[0].slice(0, 12)}</div>
                                            <div style={{ flex: 1, height: 8, background: T.line, borderRadius: 4, overflow: "hidden" }}>
                                                <div style={{ height: "100%", background: T.azul, width: `${pct}%` }} />
                                            </div>
                                            <div style={{ flex: 0.2, textAlign: "right", fontSize: 11, fontWeight: 700, color: T.ink }}>{count}</div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div style={{ ...card, padding: 14 }}>
                            <div style={{ fontWeight: 700, fontSize: 13, color: T.ink, marginBottom: 10 }}>⚡ Acciones rápidas</div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                                <button onClick={() => setVista("paquetes")} style={{ ...btnMini(false, T.azul), width: "100%", padding: 10 }}>📦 Gestionar paquetes</button>
                                <button onClick={() => setVista("clientes")} style={{ ...btnMini(false, T.azul), width: "100%", padding: 10 }}>👥 Ver clientes</button>
                                <button onClick={() => setVista("recibir")} style={{ ...btnMini(false, T.azul), width: "100%", padding: 10 }}>📥 Recibir en Miami</button>
                                <button onClick={() => setVista("facturacion")} style={{ ...btnMini(false, T.azul), width: "100%", padding: 10 }}>💵 Cobros</button>
                            </div>
                        </div>
                    </div>
                )}

                {vista === "paquetes" && (
                    <div style={{ display: "grid", gap: 10 }}>
                        <div style={{ display: "grid", gridTemplateColumns: window.innerWidth < 600 ? "1fr 1fr" : "repeat(4, 1fr)", gap: 8 }}>
                            {[["Total", kpi.total, T.ink], ["En Miami", kpi.miami, T.azulOsc], ["En aduana", kpi.aduana, T.amberInk], ["Por pagar", kpi.porPagar, T.verdeOsc]].map(([t, v, c]) => (
                                <div key={t} style={{ ...card, padding: "10px 8px", textAlign: "center" }}>
                                    <div style={{ fontFamily: "Sora, sans-serif", fontWeight: 800, fontSize: 20, color: c }}>{v}</div>
                                    <div style={{ fontSize: 10, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: 0.3 }}>{t}</div>
                                </div>
                            ))}
                        </div>
                        <input style={input} placeholder="Buscar por tracking, PKG, cliente, EBX…" value={q} onChange={(e) => setQ(e.target.value)} />
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                            <button style={btnMini(filtroEtapa === 0)} onClick={() => setFiltroEtapa(0)}>Todas</button>
                            {ETAPAS.map((e) => (
                                <button key={e.id} style={btnMini(filtroEtapa === e.id)} onClick={() => setFiltroEtapa(filtroEtapa === e.id ? 0 : e.id)}>{e.id}. {e.nombre.split(" ")[0].replace("—", "")}</button>
                            ))}
                        </div>
                        {lista.length === 0 && <div style={{ ...card, textAlign: "center", color: T.muted, fontSize: 13 }}>Sin paquetes que coincidan.</div>}
                        {lista.map((p) => {
                            const cli = clientePor(p.userId);
                            const ch = etapaChip(p.etapa);
                            const abiertoEste = abierto === p.id;
                            const b = borradorLiq(p);
                            const ivaPreview = b.peso ? (((p.valor + parseFloat(b.peso) * TARIFA_LB + (parseFloat(b.dai) || 0)) * IVA) / 100).toFixed(2) : "—";
                            return (
                                <div key={p.id} style={{ ...card, padding: 0, overflow: "hidden" }}>
                                    <div onClick={() => setAbierto(abiertoEste ? null : p.id)} style={{ padding: "13px 15px", cursor: "pointer" }}>
                                        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "flex-start" }}>
                                            <div>
                                                <div style={{ fontWeight: 700, fontSize: 13.5, color: T.ink }}>{p.descripcion}</div>
                                                <div style={{ fontSize: 11.5, color: T.muted, marginTop: 2 }}>{cli ? `${cli.nombre} · ${cli.codigo}` : "Cliente desconocido"} · {p.id}</div>
                                                <div style={{ fontSize: 11, color: T.muted }}>Tracking USA: {p.tracking}{p.pesoLb ? ` · ${p.pesoLb} lb` : " · peso pendiente"}</div>
                                            </div>
                                            <Chip color={ch.c} soft={ch.s}>{ch.t}</Chip>
                                        </div>
                                    </div>
                                    {abiertoEste && (
                                        <div style={{ borderTop: "1px solid " + T.line, padding: "13px 15px", background: "#FAFBFC" }}>
                                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                                                <div style={label}>🇺🇸 Tramo USA</div>
                                                <button onClick={() => rastrearUSAAdmin(p)} disabled={rastreandoA === p.id} style={{ ...btnMini(false, T.azul), opacity: rastreandoA === p.id ? 0.6 : 1 }}>{rastreandoA === p.id ? "Consultando…" : "🔄 Rastrear"}</button>
                                            </div>
                                            {p.tramoUSA && p.tramoUSA.encontrado && (
                                                <div style={{ marginBottom: 12, fontSize: 12, color: T.ink }}>
                                                    <Chip color={p.tramoUSA.entregado_destino ? T.verdeOsc : T.azulOsc} soft={p.tramoUSA.entregado_destino ? T.verdeSoft : T.azulSoft}>
                                                        {p.tramoUSA.carrier ? p.tramoUSA.carrier + " · " : ""}{p.tramoUSA.estado}
                                                    </Chip>
                                                    {(p.tramoUSA.eventos || []).slice(0, 2).map((ev, i) => (
                                                        <div key={i} style={{ fontSize: 11.5, color: T.muted, marginTop: 4 }}>{ev.fecha} · {ev.descripcion}{ev.lugar ? ` · ${ev.lugar}` : ""}</div>
                                                    ))}
                                                </div>
                                            )}
                                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                                                <div style={label}>📄 Factura</div>
                                                {p.facturaMeta ? <button onClick={() => setVerFacturaA(p)} style={btnMini(false, T.verde)}>Ver factura ✓</button> : <Chip color={T.rojo} soft={T.rojoSoft}>⚠ Sin factura</Chip>}
                                            </div>
                                            <div style={label}>Actualizar etapa</div>
                                            <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 12 }}>
                                                {ETAPAS.map((e) => (
                                                    <button key={e.id} style={btnMini(p.etapa === e.id, e.id >= 6 ? T.verde : T.azul)} onClick={() => setEtapa(p, e.id)}>{e.id}. {e.nombre.split(" (")[0].split(" —")[0]}</button>
                                                ))}
                                            </div>
                                            <div style={label}>Liquidación aduanal</div>
                                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                                                <div><span style={{ ...label, fontSize: 9.5 }}>Peso (lb)</span><input style={input} type="number" value={b.peso} onChange={(e) => setLiqCampo(p.id, b, "peso", e.target.value)} /></div>
                                                <div><span style={{ ...label, fontSize: 9.5 }}>DAI ($)</span><input style={input} type="number" value={b.dai} onChange={(e) => setLiqCampo(p.id, b, "dai", e.target.value)} /></div>
                                                <div><span style={{ ...label, fontSize: 9.5 }}>Servicio ($)</span><input style={input} type="number" value={b.servicio} onChange={(e) => setLiqCampo(p.id, b, "servicio", e.target.value)} /></div>
                                            </div>
                                            <button onClick={() => guardarLiquidacion(p)} style={{ marginTop: 10, width: "100%", padding: "11px", border: "none", borderRadius: 10, background: `linear-gradient(135deg, ${T.verde}, ${T.verdeOsc})`, color: "#fff", fontFamily: "Sora, sans-serif", fontWeight: 700, fontSize: 13.5, cursor: "pointer" }}>Guardar liquidación</button>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}

                {vista === "recibir" && (
                    <div style={{ display: "grid", gap: 10 }}>
                        <div style={{ ...card, padding: "14px 15px" }}>
                            <div style={{ fontFamily: "Sora, sans-serif", fontWeight: 800, fontSize: 15, color: T.ink }}>📥 Recibir paquetes en Miami</div>
                            <div style={{ fontSize: 12, color: T.muted, marginTop: 4 }}>Busca el tracking del paquete para registrar su llegada</div>
                        </div>

                        <div style={{ ...card, padding: "14px 15px" }}>
                            <div style={label}>Tracking USA</div>
                            <input style={input} placeholder="Ingresa el tracking del paquete…" value={rxTracking} onChange={(e) => setRxTracking(e.target.value)} />
                            <button onClick={buscarTracking} style={{ ...btnMini(false, T.azul), width: "100%", padding: 10, marginTop: 10 }}>🔍 Buscar tracking</button>
                        </div>

                        {rxResultado && rxResultado !== "no" ? (
                            <div style={{ ...card, padding: "14px 15px", background: T.verdeSoft, borderColor: T.verde, borderWidth: 2 }}>
                                <div style={{ fontWeight: 700, color: T.verdeOsc, marginBottom: 10 }}>✓ Paquete encontrado</div>
                                <div style={{ fontSize: 12, color: T.ink }}>
                                    <div><strong>Descripción:</strong> {rxResultado.descripcion}</div>
                                    <div><strong>Cliente:</strong> {clientePor(rxResultado.userId)?.nombre}</div>
                                    <div><strong>Tracking:</strong> {rxResultado.tracking}</div>
                                </div>

                                <div style={{ marginTop: 10 }}>
                                    <div style={label}>Peso en Miami (lb)</div>
                                    <input style={input} type="number" placeholder="Ingresa el peso real…" value={rxPeso} onChange={(e) => setRxPeso(e.target.value)} />
                                </div>

                                <button onClick={recibirEnMiami} style={{ ...btnMini(false, T.verde), width: "100%", padding: 10, marginTop: 10, background: T.verde, color: "#fff" }}>✓ Registrar recepción en Miami</button>
                            </div>
                        ) : rxResultado === "no" ? (
                            <div style={{ ...card, padding: "14px 15px", background: T.rojoSoft, borderColor: T.rojo, borderWidth: 2 }}>
                                <div style={{ fontWeight: 700, color: T.rojo }}>❌ Tracking no encontrado</div>
                                <div style={{ fontSize: 12, color: T.ink, marginTop: 6 }}>Verifica el tracking e intenta nuevamente.</div>
                            </div>
                        ) : null}
                    </div>
                )}

                {vista === "despacho" && (
                    <div style={{ display: "grid", gap: 10 }}>
                        <div style={{ ...card, padding: "14px 15px" }}>
                            <div style={{ fontFamily: "Sora, sans-serif", fontWeight: 800, fontSize: 15, color: T.ink }}>🚚 Despacho de paquetes</div>
                            <div style={{ fontSize: 12, color: T.muted, marginTop: 4 }}>Asigna motorista y actualiza el estado de entrega</div>
                        </div>

                        {(db.paquetes || []).filter(p => p.etapa >= 5 && p.etapa < 7).length === 0 ? (
                            <div style={{ ...card, textAlign: "center", color: T.muted, fontSize: 13, padding: 16 }}>
                                Sin paquetes listos para despacho.
                            </div>
                        ) : (
                            (db.paquetes || []).filter(p => p.etapa >= 5 && p.etapa < 7).map((p) => (
                                <div key={p.id} style={{ ...card, padding: "13px 15px" }}>
                                    <div style={{ fontWeight: 700, fontSize: 13, color: T.ink }}>{p.descripcion}</div>
                                    <div style={{ fontSize: 11, color: T.muted, marginTop: 4 }}>
                                        {clientePor(p.userId)?.nombre} · {p.id}
                                    </div>

                                    <div style={{ marginTop: 10 }}>
                                        <div style={label}>Asignar motorista</div>
                                        <select style={input} defaultValue="" onChange={(e) => asignarMotorista(p, e.target.value)}>
                                            <option value="">— Selecciona motorista —</option>
                                            {MOTORISTAS.map(m => (
                                                <option key={m} value={m}>{m}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {p.motorista && (
                                        <div style={{ marginTop: 10, padding: 8, background: T.azulSoft, borderRadius: 8 }}>
                                            <div style={{ fontSize: 11, fontWeight: 700, color: T.azulOsc }}>✓ Asignado a: {p.motorista}</div>
                                        </div>
                                    )}

                                    <button onClick={() => marcarEntregado(p)} style={{ ...btnMini(false, T.verde), width: "100%", padding: 10, marginTop: 10, background: T.verde, color: "#fff" }}>✓ Marcar como entregado</button>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {vista === "facturacion" && (
                    <div style={{ display: "grid", gap: 10 }}>
                        <div style={{ ...card, padding: "14px 15px" }}>
                            <div style={{ fontFamily: "Sora, sans-serif", fontWeight: 800, fontSize: 15, color: T.ink }}>💵 Gestión de cobros</div>
                            <div style={{ fontSize: 12, color: T.muted, marginTop: 4 }}>Registra pagos y emite facturas</div>
                        </div>

                        {(db.paquetes || []).filter(p => p.etapa === 5 && !p.pagado).length === 0 ? (
                            <div style={{ ...card, textAlign: "center", color: T.muted, fontSize: 13, padding: 16 }}>
                                Todos los paquetes están pagados.
                            </div>
                        ) : (
                            (db.paquetes || []).filter(p => p.etapa === 5 && !p.pagado).map((p) => (
                                <div key={p.id} style={{ ...card, padding: 0, overflow: "hidden" }}>
                                    <div style={{ padding: "13px 15px", cursor: "pointer" }}>
                                        <div style={{ fontWeight: 700, fontSize: 13.5, color: T.ink }}>{p.descripcion}</div>
                                        <div style={{ fontSize: 11.5, color: T.muted, marginTop: 2 }}>
                                            {clientePor(p.userId)?.nombre} · {p.id}
                                        </div>
                                        <div style={{ fontSize: 12, fontWeight: 700, color: T.azul, marginTop: 8 }}>
                                            Total: {fmt(totalPaquete(p))}
                                        </div>
                                    </div>
                                    <div style={{ borderTop: "1px solid " + T.line, padding: "13px 15px", background: "#FAFBFC" }}>
                                        <div style={label}>Método de pago</div>
                                        <select style={input} onChange={(e) => registrarPago(p, e.target.value)} defaultValue="">
                                            <option value="">— Selecciona método —</option>
                                            <option value="Efectivo">💵 Efectivo</option>
                                            <option value="Transferencia">🏦 Transferencia bancaria</option>
                                            <option value="Tarjeta">💳 Tarjeta de débito/crédito</option>
                                            <option value="Cheque">📄 Cheque</option>
                                        </select>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {vista === "clientes" && (
                    <div style={{ display: "grid", gap: 10 }}>
                        <div style={{ ...card, padding: "14px 15px" }}>
                            <div style={{ fontFamily: "Sora, sans-serif", fontWeight: 800, fontSize: 15, color: T.ink }}>👥 Clientes registrados</div>
                            <div style={{ fontSize: 12, color: T.muted, marginTop: 4 }}>Total: <strong>{clientes.length}</strong></div>
                        </div>

                        {clientes.length === 0 ? (
                            <div style={{ ...card, textAlign: "center", color: T.muted, fontSize: 13, padding: 16 }}>
                                Sin clientes registrados.
                            </div>
                        ) : (
                            clientes.map((u) => (
                                <div key={u.id} style={{ ...card, padding: 0, overflow: "hidden" }}>
                                    <div style={{ padding: "13px 15px" }}>
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontWeight: 700, fontSize: 13.5, color: T.ink }}>{u.nombre}</div>
                                                <div style={{ fontSize: 11.5, color: T.muted, marginTop: 2 }}>{u.codigo}</div>
                                                <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>📧 {u.email}</div>
                                                <div style={{ fontSize: 11, color: T.muted, marginTop: 1 }}>📞 {u.telefono}</div>
                                            </div>
                                            <div style={{ textAlign: "right" }}>
                                                <Chip color={u.rol === "admin" ? T.rojo : T.azul} soft={u.rol === "admin" ? T.rojoSoft : T.azulSoft}>
                                                    {u.rol === "admin" ? "🔑 Admin" : "👤 Cliente"}
                                                </Chip>
                                                <div style={{ fontSize: 10, color: T.muted, marginTop: 6, textTransform: "uppercase", fontWeight: 700, letterSpacing: 0.3 }}>Plan: {u.lplan}</div>
                                                <div style={{ fontSize: 10, color: T.muted, marginTop: 2 }}>Desde: {u.fechaAlta ? new Date(u.fechaAlta).toLocaleDateString("es-SV") : "—"}</div>
                                                <button onClick={() => setCliCambiarRol(u)} style={{ marginTop: 8, padding: "4px 8px", borderRadius: 6, fontSize: 10, fontWeight: 700, border: "1px solid " + T.azul, background: "#fff", color: T.azul, cursor: "pointer" }}>🔄 Cambiar rol</button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>

            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "#fff", borderTop: "1px solid " + T.line, display: "flex", justifyContent: "space-around", padding: "8px 4px 12px", boxShadow: "0 -4px 16px rgba(16,18,22,.05)" }}>
                {[["control", "📊", "Control"], ["paquetes", "📦", "Paquetes"], ["recibir", "📥", "Recibir"], ["despacho", "🚚", "Despacho"], ["facturacion", "💵", "Cobros"], ["clientes", "👥", "Clientes"]].map(([k, icon, t]) => (
                    <button key={k} onClick={() => setVista(k)} style={{ border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 2, color: vista === k ? T.azulOsc : T.muted, fontWeight: vista === k ? 800 : 500, fontSize: 9.5, fontFamily: "Inter, sans-serif", padding: "4px 6px", borderRadius: 11, background: vista === k ? T.azulSoft : "transparent" }}>
                        <span style={{ fontSize: 18 }}>{icon}</span>{t}
                    </button>
                ))}
            </div>

            {cliCambiarRol && (
                <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
                    <div style={{ background: "#fff", borderRadius: 16, padding: 24, maxWidth: 320, boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
                        <div style={{ fontFamily: "Sora, sans-serif", fontWeight: 800, fontSize: 16, color: T.ink, marginBottom: 8 }}>🔄 Cambiar rol</div>
                        <div style={{ fontSize: 13, color: T.muted, marginBottom: 16 }}>¿A qué rol deseas cambiar a <strong>{cliCambiarRol.nombre}</strong>?</div>

                        <div style={{ display: "grid", gap: 10, marginBottom: 12 }}>
                            <button 
                                onClick={() => cambiarRolUsuario(cliCambiarRol.id, cliCambiarRol.rol === "admin" ? "cliente" : "admin")}
                                style={{ 
                                    padding: "12px 14px", 
                                    borderRadius: 10, 
                                    border: "none", 
                                    background: cliCambiarRol.rol === "admin" ? T.azul : T.rojo, 
                                    color: "#fff", 
                                    fontWeight: 700, 
                                    fontSize: 13, 
                                    cursor: "pointer",
                                    fontFamily: "Inter, sans-serif"
                                }}
                            >
                                {cliCambiarRol.rol === "admin" ? "👤 Cambiar a Cliente" : "🔑 Cambiar a Administrador"}
                            </button>
                        </div>

                        <button 
                            onClick={() => setCliCambiarRol(null)}
                            style={{ 
                                width: "100%",
                                padding: "10px 14px", 
                                borderRadius: 10, 
                                border: "1px solid " + T.line, 
                                background: "#fff", 
                                color: T.ink, 
                                fontWeight: 700, 
                                fontSize: 13, 
                                cursor: "pointer",
                                fontFamily: "Inter, sans-serif"
                            }}
                        >
                            ✕ Cancelar
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}

/* ============================================================
   APP PRINCIPAL (CLIENTE)
   ============================================================ */
export default function EboxCourierApp() {
    const [pantalla, setPantalla] = useState("cargando");
    const [db, setDb] = useState({ paquetes: [], usuarios: [], promos: [] });
    const [usuario, setUsuario] = useState(null);
    const [aviso, setAviso] = useState("");
    const [lg, setLg] = useState({ email: "", pass: "" });
    const [rg, setRg] = useState({ nombre: "", email: "", telefono: "", pass: "", pass2: "" });
    const [procesando, setProcesando] = useState(false);

    const [tab, setTab] = useState("inicio");
    const [detalle, setDetalle] = useState(null);
    const [copiado, setCopiado] = useState(false);
    const [cotPeso, setCotPeso] = useState("");
    const [cotValor, setCotValor] = useState("");
    const [cotCat, setCotCat] = useState("ropa");
    const [pa, setPa] = useState({ tracking: "", tienda: "", descripcion: "", valor: "", categoria: "ropa" });
    const [paOk, setPaOk] = useState(false);
    const [chat, setChat] = useState([]);
    const [msg, setMsg] = useState("");
    const [pensando, setPensando] = useState(false);
    const [rastreando, setRastreando] = useState(null);
    const [errRastreo, setErrRastreo] = useState("");
    const [paFactura, setPaFactura] = useState(null);
    const [subiendoFactura, setSubiendoFactura] = useState(null);
    const [errFactura, setErrFactura] = useState("");
    const [verFactura, setVerFactura] = useState(null);
    const [facturaTarget, setFacturaTarget] = useState("prealerta");
    const facturaRef = useRef(null);
    const chatEndRef = useRef(null);

    // 1. EFECTO INICIAL: Cargar sesión desde el Backend
    useEffect(() => {
        (async () => {
            try {
                const s = localStorage.getItem(SESION_KEY);
                if (s) {
                    const userId = JSON.parse(s);
                    // Petición al backend
                    const res = await fetch(`/api/usuarios/${userId}`);
                    if (res.ok) {
                        const u = await res.json();
                        setUsuario(u);
                        iniciarChat(u);

                        // Si es admin, no cargar paquetes (irá a AdminConsole)
                        if (u.rol !== "admin") {
                            // Cargar paquetes solo si es cliente
                            const resPkgs = await fetch(`/api/paquetes/usuario/${userId}`);
                            if (resPkgs.ok) {
                                const pkgs = await resPkgs.json();
                                setDb({ paquetes: pkgs });
                            }
                            setPantalla("app");
                        }

                        return;
                    }
                }
            } catch (e) { console.error("Sin sesión válida o servidor no disponible"); }
            setPantalla("login");
        })();
    }, []);

    const iniciarChat = (u) => {
        setChat([{
            rol: "bot",
            texto: `¡Hola ${u.nombre.split(" ")[0]}! Soy el asistente de E·Box Courier 📦 Respaldado por nuestra empresa hermana Grupo Asimex, agencia aduanal licenciada. Preguntame lo que quieras.`,
        }]);
    };

    const elegirFactura = (target) => {
        setFacturaTarget(target);
        setErrFactura("");
        if (facturaRef.current) facturaRef.current.click();
    };

    const onFacturaFile = async (e) => {
        const file = (e.target.files || [])[0];
        if (facturaRef.current) facturaRef.current.value = "";
        if (!file) return;
        const target = facturaTarget;
        setSubiendoFactura(target);
        setErrFactura("");
        try {
            const datos = await procesarArchivoFactura(file);
            if (target === "prealerta") {
                setPaFactura(datos);
            } else {
                await guardarFacturaStorage(target, { ...datos, fecha: fechaSV() });

                // Actualizar paquete en el backend
                const cambios = { facturaMetaJson: JSON.stringify({ nombre: datos.nombre, paginas: datos.paginas.length, fecha: fechaSV() }) };
                const res = await fetch(`/api/paquetes/${target}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(cambios)
                });

                if (res.ok) {
                    const pActualizado = await res.json();
                    const nuevos = db.paquetes.map((x) => x.id === target ? pActualizado : x);
                    setDb({ ...db, paquetes: nuevos });
                }
            }
        } catch (err) {
            setErrFactura("No se pudo procesar o guardar la factura.");
        }
        setSubiendoFactura(null);
    };

    const rastrearUSA = async (p) => {
        if (rastreando) return;
        setRastreando(p.id);
        setErrRastreo("");
        try {
            const r = await consultarRastreoUSA(p.tracking);
            // Actualizar backend
            const cambios = { tramoUSAJson: JSON.stringify({ ...r, actualizado: horaSV() }) };
            const res = await fetch(`/api/paquetes/${p.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(cambios)
            });
            if (res.ok) {
                const pActualizado = await res.json();
                const nuevos = db.paquetes.map((x) => x.id === p.id ? pActualizado : x);
                setDb({ ...db, paquetes: nuevos });
            }
        } catch (e) {
            setErrRastreo("No se pudo consultar el rastreo ahora.");
        }
        setRastreando(null);
    };

    useEffect(() => {
        if (chatEndRef.current) chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }, [chat, pensando]);

    // 2. LOGIN AL BACKEND
    // 2. INICIO DE SESIÓN
    const login = async (e) => {
        if (e && e.preventDefault) e.preventDefault();
        setProcesando(true);
        setAviso('');

        try {
            // lg.email y lg.pass son los estados que definiste arriba en tu App
            if (!lg.email || !lg.pass) {
                throw new Error("Por favor, ingresa tu correo y contraseña.");
            }

            const response = await fetch('/api/usuarios/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                // IMPORTANTE: Los nombres deben coincidir con la clase LoginRequest del backend
                body: JSON.stringify({ Email: lg.email, Pass: lg.pass })
            });

            const data = await response.json();

            if (!response.ok) {
                // Si el servidor falla, el mensaje viene en 'data' o en un error
                throw new Error(data.message || "Credenciales incorrectas.");
            }

            // Éxito
            localStorage.setItem(SESION_KEY, JSON.stringify(data.id));
            setUsuario(data);
            setPantalla("app");

        } catch (e) {
            setAviso(e.message);
        } finally {
            setProcesando(false);
        }
    };
    // 3. REGISTRO AL BACKEND
    const registrar = async () => {
        if (procesando) return;
        setAviso("");
        if (!rg.nombre.trim() || !rg.email.trim() || !rg.pass) { setAviso("Completá nombre, correo y contraseña."); return; }
        if (rg.pass !== rg.pass2) { setAviso("Las contraseñas no coinciden."); return; }

        setProcesando(true);
        try {
            const res = await fetch('/api/usuarios/registro', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    nombre: rg.nombre.trim(),
                    email: rg.email.trim(),
                    telefono: rg.telefono.trim(),
                    pass: rg.pass // Backend hará el Hash
                })
            });

            if (!res.ok) throw new Error("Error en el registro. Verificá que el correo no exista.");

            const nuevoU = await res.json();
            setUsuario(nuevoU);
            localStorage.setItem(SESION_KEY, JSON.stringify(nuevoU.id));
            iniciarChat(nuevoU);
            setDb({ paquetes: [] });

            setRg({ nombre: "", email: "", telefono: "", pass: "", pass2: "" });
            setTab("inicio");
            setPantalla("app");
        } catch (e) {
            setAviso(e.message);
        }
        setProcesando(false);
    };

    const cerrarSesion = async () => {
        try { localStorage.removeItem(SESION_KEY); } catch (e) { }
        setUsuario(null);
        setPantalla("login");
        setDetalle(null);
    };

    const misPaquetes = db.paquetes || [];

    const copiarDireccion = () => {
        const texto = `${usuario.nombre} ${usuario.codigo}\n7855 NW 29th St, Suite ${usuario.codigo}\nDoral, FL 33122\nUSA\nTel: +1 (305) 555-0187`;
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(texto).catch(() => { });
        setCopiado(true);
        setTimeout(() => setCopiado(false), 2000);
    };

    const cotizar = () => {
        const peso = parseFloat(cotPeso) || 0;
        const valor = parseFloat(cotValor) || 0;
        const cat = CATEGORIAS.find((c) => c.id === cotCat);
        const flete = Math.max(peso, 1) * TARIFA_LB;
        const cif = valor + flete;
        const regimenCourier = valor <= LIMITE_COURIER;
        const dai = regimenCourier ? 0 : (cif * cat.dai) / 100;
        const iva = ((cif + dai) * IVA) / 100;
        return { flete, dai, iva, cat, total: flete + dai + iva, peso, valor, regimenCourier };
    };
    const cot = cotPeso && cotValor ? cotizar() : null;

    // 4. PRE-ALERTA AL BACKEND
    const enviarPreAlerta = async () => {
        // 1. Validaciones iniciales silenciosas y con mensaje
        if (!pa.tracking || !pa.descripcion) return;
        if (!paFactura) {
            setErrFactura("La factura es requisito para la declaración de mercancía.");
            return;
        }

        // Limpiamos errores previos si todo está bien
        setErrFactura("");

        // 2. Construcción del objeto a enviar
        const nuevo = {
            id: "PKG-" + Math.floor(88600 + Math.random() * 9000),
            userId: usuario.id,
            descripcion: pa.descripcion,
            tienda: pa.tienda || "Tienda online",
            tracking: pa.tracking,
            valor: parseFloat(pa.valor) || 0,
            categoria: pa.categoria,
            etapa: 1,
            facturaMetaJson: JSON.stringify({
                nombre: paFactura.nombre,
                paginas: paFactura.paginas.length,
                fecha: fechaSV()
            })
        };

        try {
            // 3. Guardado local de la imagen/PDF (cuidado con el límite de 5MB)
            await guardarFacturaStorage(nuevo.id, { ...paFactura, fecha: fechaSV() });

            // 4. Petición al servidor (usando ruta relativa, evita problemas de CORS y puertos)
            const res = await fetch('/api/paquetes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(nuevo)
            });

            // 5. Manejo del éxito de la petición
            if (res.ok) {
                const paqueteGuardado = await res.json();

                // Actualizamos la tabla/lista en pantalla
                setDb({ ...db, paquetes: [paqueteGuardado, ...db.paquetes] });

                // Limpiamos el formulario
                setPa({ tracking: "", tienda: "", descripcion: "", valor: "", categoria: "ropa" });
                setPaFactura(null);

                // Mostramos mensaje de éxito por 3 segundos
                setPaOk(true);
                setTimeout(() => setPaOk(false), 3000);
            } else {
                // Opcional: Si el servidor responde con un error 400 o 500
                setErrFactura("El servidor rechazó la solicitud. Verifica los datos.");
            }

        } catch (e) {
            // 6. Manejo de caída de red o límite de almacenamiento
            console.error("Error en pre-alerta:", e);
            setErrFactura("Hubo un error comunicándose con el servidor.");
        }
    };

    const enviarMensaje = async () => {
        const pregunta = msg.trim();
        if (!pregunta || pensando) return;
        setChat((c) => [...c, { rol: "user", texto: pregunta }]);
        setMsg("");
        setPensando(true);
        try {
            const contexto = misPaquetes
                .map((p) => `- ${p.id}: ${p.descripcion} (${p.tienda}), etapa: ${ETAPAS[p.etapa - 1].nombre}, valor $${p.valor}${p.pesoLb ? `, ${p.pesoLb} lb` : ""}${p.pagado ? ", pagado" : ""}`)
                .join("\n") || "(sin paquetes todavía)";
            const historial = chat.slice(-6).map((m) => `${m.rol === "user" ? "Cliente" : "Asistente"}: ${m.texto}`).join("\n");
            const prompt = `Eres el asistente virtual de E·Box Courier, casillero de Miami a El Salvador. Explicas impuestos con claridad. Cliente: ${usuario.nombre}. Paquetes: ${contexto}. Conversación reciente: ${historial}. Nueva pregunta: "${pregunta}"`;

            const response = await fetch("/api/chat/preguntar", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ Mensaje: prompt, ClienteId: usuario.id }),
            });

            if (!response.ok) throw new Error("Error en servidor");
            const data = await response.json();
            const texto = (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("");
            setChat((c) => [...c, { rol: "bot", texto: texto || "No pude generar respuesta, intentá de nuevo." }]);
        } catch (e) {
            setChat((c) => [...c, { rol: "bot", texto: "Tuve un problema de conexión. Intentá de nuevo." }]);
        }
        setPensando(false);
    };

    /* ---------- Estilos ---------- */
    const card = {
        background: T.surface, borderRadius: 16, padding: 18,
        border: "1px solid " + T.line, boxShadow: "0 1px 3px rgba(16,18,22,.05)",
    };
    const input = {
        width: "100%", padding: "12px 13px", border: "1px solid #D8DCE3", borderRadius: 11,
        fontFamily: "Inter, sans-serif", fontSize: 14, color: T.ink, background: "#fff", boxSizing: "border-box",
    };
    const label = { display: "block", fontSize: 11, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase", color: T.muted, marginBottom: 5 };

    const btnAzul = {
        width: "100%", padding: "13px", border: "none", borderRadius: 12,
        background: `linear-gradient(135deg, ${T.azul}, ${T.azulOsc})`, color: "#fff",
        fontFamily: "Sora, sans-serif", fontWeight: 700, fontSize: 15, cursor: "pointer",
        boxShadow: "0 4px 14px rgba(27,135,201,.35)", letterSpacing: 0.2,
    };
    const btnVerde = {
        ...btnAzul,
        background: `linear-gradient(135deg, ${T.verde}, ${T.verdeOsc})`,
        boxShadow: "0 4px 14px rgba(95,174,58,.35)",
    };
    const btnBlanco = {
        ...btnAzul,
        background: "#fff", color: T.ink, border: "1.5px solid #D8DCE3", boxShadow: "0 1px 3px rgba(16,18,22,.06)",
    };

    const marco = (children) => (
        <div style={{
            minHeight: "100vh",
            width: "100%",
            background: T.bgOuter,
            margin: 0,
            padding: 0,
            display: "flex",
            justifyContent: "center",
            fontFamily: "Inter, sans-serif"
        }}>
            <style>{FONTS}</style>
            <style>{`
            html, body { margin: 0 !important; padding: 0 !important; width: 100%; height: 100%; }
            .nav-contenedor { display: flex; justify-content: space-around; padding: 8px 4px 12px; }
            @media (max-width: 480px) {
                .nav-contenedor { padding: 4px 2px 6px; }
                .nav-texto { display: none; }
            }
            `}</style>

            <div style={{
                width: "100%",
                maxWidth: "100%",
                "@media (min-width: 600px)": { maxWidth: "430px" },
                minHeight: "100vh",
                background: T.panel,
                margin: 0,
                padding: 0,
                display: "flex",
                flexDirection: "column",
                position: "relative"
            }}>
                {children}
            </div>
        </div>
    );

    /* ============================================================ */
    if (pantalla === "cargando") {
        return marco(
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
                <LogoEbox size={24} horizontal={false} tagline />
                <div style={{ fontSize: 13, color: T.muted }}>Cargando…</div>
            </div>
        );
    }

    if (pantalla === "login") {
        return marco(
            <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: 24, background: "#fff" }}>
                <div style={{ display: "flex", justifyContent: "center", marginBottom: 22 }}>
                    <LogoEbox size={26} horizontal={false} tagline />
                </div>
                <div style={{ ...card, padding: 22, boxShadow: "0 8px 30px rgba(16,18,22,.08)" }}>
                    <div style={{ fontFamily: "Sora, sans-serif", fontWeight: 800, fontSize: 19, marginBottom: 16, color: T.ink }}>Iniciar sesión</div>
                    <span style={label}>Correo electrónico</span>
                    <input style={input} type="email" placeholder="tucorreo@ejemplo.com" value={lg.email} onChange={(e) => setLg({ ...lg, email: e.target.value })} />
                    <div style={{ marginTop: 12 }}>
                        <span style={label}>Contraseña</span>
                        <input style={input} type="password" placeholder="••••••••" value={lg.pass}
                            onChange={(e) => setLg({ ...lg, pass: e.target.value })}
                            onKeyDown={(e) => e.key === "Enter" && login()} />
                    </div>
                    {aviso && <div style={{ marginTop: 10, fontSize: 13, color: T.rojo, fontWeight: 600 }}>{aviso}</div>}
                    <button style={{ ...btnAzul, marginTop: 16, opacity: procesando ? 0.6 : 1 }} onClick={login} disabled={procesando}>
                        {procesando ? "Verificando…" : "Entrar"}
                    </button>
                    <div style={{ textAlign: "center", marginTop: 14, fontSize: 13.5, color: T.muted }}>
                        ¿No tenés casillero?{" "}
                        <button onClick={() => { setAviso(""); setPantalla("registro"); }} style={{ border: "none", background: "none", color: T.azul, fontWeight: 700, cursor: "pointer", fontSize: 13.5 }}>
                            Crea tu casillero gratis →
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (pantalla === "registro") {
        return marco(
            <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: 24, background: "#fff" }}>
                <div style={{ display: "flex", justifyContent: "center", marginBottom: 18 }}>
                    <LogoEbox size={20} />
                </div>
                <div style={{ ...card, padding: 22, boxShadow: "0 8px 30px rgba(16,18,22,.08)" }}>
                    <div style={{ fontFamily: "Sora, sans-serif", fontWeight: 800, fontSize: 19, marginBottom: 4, color: T.ink }}>Abrí tu casillero gratis</div>
                    <div style={{ fontSize: 13, color: T.muted, marginBottom: 16 }}>
                        Al registrarte recibís tu código EBX y tu dirección en Miami.
                    </div>
                    <span style={label}>Nombre completo *</span>
                    <input style={input} value={rg.nombre} onChange={(e) => setRg({ ...rg, nombre: e.target.value })} />
                    <div style={{ marginTop: 12 }}>
                        <span style={label}>Correo electrónico *</span>
                        <input style={input} type="email" value={rg.email} onChange={(e) => setRg({ ...rg, email: e.target.value })} />
                    </div>
                    <div style={{ marginTop: 12 }}>
                        <span style={label}>Teléfono / WhatsApp</span>
                        <input style={input} placeholder="0000-0000" value={rg.telefono} onChange={(e) => setRg({ ...rg, telefono: e.target.value })} />
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 12 }}>
                        <div>
                            <span style={label}>Contraseña *</span>
                            <input style={input} type="password" value={rg.pass} onChange={(e) => setRg({ ...rg, pass: e.target.value })} />
                        </div>
                        <div>
                            <span style={label}>Confirmar *</span>
                            <input style={input} type="password" value={rg.pass2} onChange={(e) => setRg({ ...rg, pass2: e.target.value })} />
                        </div>
                    </div>
                    {aviso && <div style={{ marginTop: 10, fontSize: 13, color: T.rojo, fontWeight: 600 }}>{aviso}</div>}
                    <button style={{ ...btnAzul, marginTop: 16, opacity: procesando ? 0.6 : 1 }} onClick={registrar} disabled={procesando}>
                        {procesando ? "Creando casillero…" : "Crear mi casillero"}
                    </button>
                    <div style={{ textAlign: "center", marginTop: 14, fontSize: 13.5, color: T.muted }}>
                        ¿Ya tenés cuenta?{" "}
                        <button onClick={() => { setAviso(""); setPantalla("login"); }} style={{ border: "none", background: "none", color: T.azul, fontWeight: 700, cursor: "pointer", fontSize: 13.5 }}>
                            Iniciar sesión
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (usuario && usuario.rol === "admin") {
        return marco(<AdminConsole db={db} setDb={setDb} cerrarSesion={cerrarSesion} />);
    }

    return marco(
        <>
            <div style={{ background: "#fff" }}>
                <div style={{ padding: "14px 18px 11px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <LogoEbox size={16} />
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <Chip color="#fff" soft={T.charcoal}>{usuario.plan}</Chip>
                        <button onClick={cerrarSesion} title="Cerrar sesión" style={{ border: "1px solid " + T.line, background: "#fff", color: T.muted, borderRadius: 9, padding: "5px 10px", fontSize: 11.5, fontWeight: 700, cursor: "pointer" }}>Salir</button>
                    </div>
                </div>
                <div style={{ padding: "0 18px 10px", fontSize: 12, color: T.muted }}>
                    Hola, {usuario.nombre.split(" ")[0]} · Casillero {usuario.codigo}
                </div>
                <Tricolor />
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: 16, paddingBottom: 90 }}>
                {tab === "inicio" && !detalle && (
                    <div style={{ display: "grid", gap: 14 }}>
                        <div style={{ ...card, background: T.charcoal, color: "#fff", border: "none", boxShadow: "0 8px 24px rgba(16,18,22,.28)" }}>
                            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.2, color: T.azulClaro, marginBottom: 8 }}>TU DIRECCIÓN EN MIAMI</div>
                            <div style={{ fontSize: 14.5, lineHeight: 1.6 }}>
                                <strong>{usuario.nombre} {usuario.codigo}</strong><br />
                                7855 NW 29th St, Suite {usuario.codigo}<br />
                                Doral, FL 33122, USA<br />
                                +1 (305) 555-0187
                            </div>
                            <button onClick={copiarDireccion} style={{ ...(copiado ? btnVerde : btnAzul), marginTop: 14 }}>
                                {copiado ? "✓ Dirección copiada" : "⧉ Copiar dirección completa"}
                            </button>
                        </div>
                        <div style={{ ...card, borderLeft: "4px solid " + T.verde }}>
                            <div style={{ fontFamily: "Sora, sans-serif", fontWeight: 700, fontSize: 14.5, marginBottom: 4, color: T.ink }}>🛃 Aduana sin sorpresas</div>
                            <div style={{ fontSize: 13, color: T.muted, lineHeight: 1.55 }}>
                                Somos el único casillero respaldado por su <strong style={{ color: T.ink }}>empresa hermana Grupo Asimex</strong>. Ves tus impuestos desglosados (DAI + IVA) antes de pagar.
                            </div>
                        </div>
                        <div>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
                                <div style={{ fontFamily: "Sora, sans-serif", fontWeight: 700, fontSize: 16, color: T.ink }}>Tus paquetes</div>
                                <button onClick={() => setTab("paquetes")} style={{ border: "none", background: "none", color: T.azul, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>Ver todos →</button>
                            </div>
                            {misPaquetes.length === 0 && (
                                <div style={{ ...card, textAlign: "center", color: T.muted, fontSize: 13.5 }}>Aún no tenés paquetes.</div>
                            )}
                            {misPaquetes.slice(0, 2).map((p) => {
                                const ch = etapaChip(p.etapa);
                                return (
                                    <div key={p.id} onClick={() => { setDetalle(p.id); setTab("paquetes"); }} style={{ ...card, marginBottom: 10, cursor: "pointer" }}>
                                        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "flex-start" }}>
                                            <div>
                                                <div style={{ fontWeight: 700, fontSize: 14, color: T.ink }}>{p.descripcion}</div>
                                                <div style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>{p.tienda} · {p.id}</div>
                                            </div>
                                            <Chip color={ch.c} soft={ch.s}>{ch.t}</Chip>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {tab === "paquetes" && !detalle && (
                    <div style={{ display: "grid", gap: 10 }}>
                        <div style={{ fontFamily: "Sora, sans-serif", fontWeight: 700, fontSize: 18, color: T.ink }}>Mis paquetes</div>
                        {misPaquetes.length === 0 && (
                            <div style={{ ...card, textAlign: "center", color: T.muted, fontSize: 13.5 }}>Sin paquetes todavía.</div>
                        )}
                        {misPaquetes.map((p) => {
                            const ch = etapaChip(p.etapa);
                            return (
                                <div key={p.id} onClick={() => setDetalle(p.id)} style={{ ...card, cursor: "pointer" }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "flex-start" }}>
                                        <div>
                                            <div style={{ fontWeight: 700, fontSize: 14.5, color: T.ink }}>{p.descripcion}</div>
                                            <div style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>{p.tienda} · {p.id}{p.pesoLb ? ` · ${p.pesoLb} lb` : ""}</div>
                                        </div>
                                        <Chip color={ch.c} soft={ch.s}>{ch.t}</Chip>
                                    </div>
                                    <div style={{ display: "flex", gap: 3, marginTop: 12 }}>
                                        {ETAPAS.map((e) => (
                                            <div key={e.id} style={{ flex: 1, height: 5, borderRadius: 3, background: e.id <= p.etapa ? T.azul : T.line }} />
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {tab === "paquetes" && detalle && (() => {
                    const p = misPaquetes.find((x) => x.id === detalle);
                    if (!p) return null;
                    const totalImp = p.costos ? p.costos.flete + p.costos.dai + p.costos.iva + p.costos.servicio : null;
                    return (
                        <div style={{ display: "grid", gap: 12 }}>
                            <button onClick={() => setDetalle(null)} style={{ border: "none", background: "none", color: T.azul, fontWeight: 700, fontSize: 14, cursor: "pointer", textAlign: "left", padding: 0 }}>
                                ← Volver a paquetes
                            </button>
                            <div style={card}>
                                <div style={{ fontFamily: "Sora, sans-serif", fontWeight: 700, fontSize: 17, color: T.ink }}>{p.descripcion}</div>
                                <div style={{ fontSize: 12.5, color: T.muted, marginTop: 3 }}>{p.tienda} · Tracking USA: {p.tracking}</div>
                            </div>
                            <div style={{ ...card, borderLeft: "4px solid " + T.azul }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                                    <div style={label}>🇺🇸 Tramo USA</div>
                                </div>
                                <button onClick={() => rastrearUSA(p)} disabled={rastreando === p.id} style={{ ...btnBlanco, marginTop: 10, padding: "10px", fontSize: 13.5, opacity: rastreando === p.id ? 0.6 : 1 }}>
                                    {rastreando === p.id ? "🔎 Consultando carrier…" : "🔄 Actualizar rastreo USA"}
                                </button>
                            </div>
                            <div style={{ ...card, borderLeft: "4px solid " + (p.facturaMetaJson ? T.verde : T.rojo) }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                                    <div style={label}>📄 Factura de compra</div>
                                    {p.facturaMetaJson ? <Chip color={T.verdeOsc} soft={T.verdeSoft}>✓ Adjunta</Chip> : <Chip color={T.rojo} soft={T.rojoSoft}>Falta</Chip>}
                                </div>
                                {p.facturaMetaJson ? (
                                    <button onClick={() => setVerFactura(p)} style={{ ...btnBlanco, marginTop: 8, padding: "9px", fontSize: 12.5 }}>Ver factura</button>
                                ) : (
                                    <button onClick={() => elegirFactura(p.id)} disabled={subiendoFactura === p.id} style={{ ...btnAzul, marginTop: 8, padding: "10px", fontSize: 13, opacity: subiendoFactura === p.id ? 0.6 : 1 }}>
                                        {subiendoFactura === p.id ? "Procesando archivo…" : "📎 Adjuntar factura ahora"}
                                    </button>
                                )}
                            </div>
                            <div style={card}>
                                <div style={label}>Seguimiento</div>
                                {ETAPAS.map((e, i) => {
                                    const done = e.id <= p.etapa;
                                    const actual = e.id === p.etapa;
                                    return (
                                        <div key={e.id} style={{ display: "flex", gap: 12 }}>
                                            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                                                <div style={{ width: 22, height: 22, borderRadius: "50%", flexShrink: 0, background: done ? T.azul : "#fff", border: "2px solid " + (done ? T.azul : T.line), display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: "#fff", boxShadow: actual ? "0 0 0 4px rgba(27,135,201,.22)" : "none" }}>{done ? "✓" : ""}</div>
                                                {i < ETAPAS.length - 1 && <div style={{ width: 2, flex: 1, minHeight: 22, background: e.id < p.etapa ? T.azul : T.line }} />}
                                            </div>
                                            <div style={{ paddingBottom: 14 }}>
                                                <div style={{ fontWeight: actual ? 800 : 600, fontSize: 13.5, color: done ? T.ink : T.muted }}>{e.nombre}</div>
                                                <div style={{ fontSize: 12, color: T.muted }}>{e.desc}</div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            <div style={{ ...card, borderLeft: "4px solid " + T.verde }}>
                                <div style={label}>Desglose de costos</div>
                                {p.costos ? (
                                    <div style={{ fontSize: 14 }}>
                                        <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0 2px", fontFamily: "Sora, sans-serif", fontWeight: 800, fontSize: 16 }}>
                                            <span>Total a pagar</span><span>{fmt(totalImp)}</span>
                                        </div>
                                        {p.pagado ? (
                                            <div style={{ marginTop: 12, padding: 12, borderRadius: 11, background: T.verdeSoft, color: T.verdeOsc, fontWeight: 700, fontSize: 13.5, textAlign: "center" }}>
                                                ✓ Pagado
                                            </div>
                                        ) : (
                                            <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
                                                <button style={btnVerde} onClick={() => pagarYAgendar(p.id, "domicilio")}>Pagar {fmt(totalImp)}</button>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div style={{ fontSize: 13, color: T.muted, lineHeight: 1.55 }}>Disponible al liquidar en aduana.</div>
                                )}
                            </div>
                        </div>
                    );
                })()}

                {tab === "cotizador" && (
                    <div style={{ display: "grid", gap: 12 }}>
                        <div style={{ fontFamily: "Sora, sans-serif", fontWeight: 700, fontSize: 18, color: T.ink }}>Cotizador con impuestos</div>
                        <div style={{ fontSize: 13, color: T.muted, marginTop: -6 }}>
                            Tarifa <strong style={{ color: T.ink }}>${TARIFA_LB}/lb</strong> · Ley de courier: facturas hasta <strong style={{ color: T.ink }}>${LIMITE_COURIER}</strong> solo pagan IVA 13% (exentas de DAI).
                        </div>
                        <div style={card}>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                                <div><span style={label}>Peso (lb)</span><input style={input} type="number" min="0" placeholder="Ej: 3.5" value={cotPeso} onChange={(e) => setCotPeso(e.target.value)} /></div>
                                <div><span style={label}>Valor (USD)</span><input style={input} type="number" min="0" placeholder="Ej: 120" value={cotValor} onChange={(e) => setCotValor(e.target.value)} /></div>
                            </div>
                            <div style={{ marginTop: 10 }}>
                                <span style={label}>Categoría</span>
                                <select style={input} value={cotCat} onChange={(e) => setCotCat(e.target.value)}>
                                    {CATEGORIAS.map((c) => <option key={c.id} value={c.id}>{c.nombre} — DAI {c.dai}%</option>)}
                                </select>
                            </div>
                        </div>
                        {cot && (
                            <div style={{ ...card, background: T.charcoal, color: "#fff", border: "none", boxShadow: "0 8px 24px rgba(16,18,22,.28)" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, paddingTop: 10, borderTop: "1px solid #2A2E36", fontFamily: "Sora, sans-serif", fontWeight: 800, fontSize: 18 }}>
                                    <span>Total estimado</span><span style={{ color: T.verde }}>{fmt(cot.total)}</span>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {tab === "prealerta" && (
                    <div style={{ display: "grid", gap: 12 }}>
                        <div style={{ fontFamily: "Sora, sans-serif", fontWeight: 700, fontSize: 18, color: T.ink }}>Pre-alertar paquete</div>
                        <div style={card}>
                            <span style={label}>Tracking (USA) *</span>
                            <input style={input} placeholder="Ej: TBA309145522710" value={pa.tracking} onChange={(e) => setPa({ ...pa, tracking: e.target.value })} />
                            <div style={{ marginTop: 10 }}>
                                <span style={label}>¿Qué contiene? *</span>
                                <input style={input} placeholder="Ej: Tenis" value={pa.descripcion} onChange={(e) => setPa({ ...pa, descripcion: e.target.value })} />
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10 }}>
                                <div><span style={label}>Tienda</span><input style={input} placeholder="Amazon" value={pa.tienda} onChange={(e) => setPa({ ...pa, tienda: e.target.value })} /></div>
                                <div><span style={label}>Valor (USD)</span><input style={input} type="number" placeholder="Ej: 89.99" value={pa.valor} onChange={(e) => setPa({ ...pa, valor: e.target.value })} /></div>
                            </div>
                            <div style={{ marginTop: 10 }}>
                                <span style={label}>Categoría</span>
                                <select style={input} value={pa.categoria} onChange={(e) => setPa({ ...pa, categoria: e.target.value })}>
                                    {CATEGORIAS.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                                </select>
                            </div>
                            <div style={{ marginTop: 10 }}>
                                <span style={label}>Factura o comprobante *</span>
                                {paFactura ? (
                                    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: 10, borderRadius: 11, background: T.verdeSoft }}>
                                        <div style={{ flex: 1, fontSize: 12, color: T.verdeOsc, fontWeight: 700, overflow: "hidden" }}>✓ {paFactura.nombre}</div>
                                        <button onClick={() => setPaFactura(null)} style={{ border: "none", background: "none", color: T.muted, fontSize: 16, cursor: "pointer" }}>✕</button>
                                    </div>
                                ) : (
                                    <button onClick={() => elegirFactura("prealerta")} disabled={subiendoFactura === "prealerta"} style={{ ...btnBlanco, padding: "11px", fontSize: 13, opacity: subiendoFactura === "prealerta" ? 0.6 : 1 }}>
                                        {subiendoFactura === "prealerta" ? "Procesando archivo…" : "📎 Adjuntar factura"}
                                    </button>
                                )}
                            </div>
                            <button style={{ ...btnAzul, marginTop: 12, opacity: pa.tracking && pa.descripcion && paFactura ? 1 : 0.5 }} onClick={enviarPreAlerta}>
                                {paOk ? "✓ Pre-alerta enviada" : "Enviar pre-alerta"}
                            </button>
                        </div>
                    </div>
                )}

                {tab === "asistente" && (
                    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
                        <div style={{ fontFamily: "Sora, sans-serif", fontWeight: 700, fontSize: 18, color: T.ink, marginBottom: 4 }}>
                            Asistente E·Box <span style={{ fontSize: 11, color: T.azul, fontWeight: 700 }}>· IA</span>
                        </div>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
                            {["¿Cuánto pago por unos tenis de $100?", "¿Dónde están mis paquetes?"].map((s) => (
                                <button key={s} onClick={() => setMsg(s)} style={{ border: "1px solid " + T.line, background: "#fff", borderRadius: 999, padding: "6px 12px", fontSize: 12, color: T.ink, cursor: "pointer" }}>{s}</button>
                            ))}
                        </div>
                        <div style={{ display: "grid", gap: 8 }}>
                            {chat.map((m, i) => (
                                <div key={i} style={{ display: "flex", justifyContent: m.rol === "user" ? "flex-end" : "flex-start" }}>
                                    <div style={{ maxWidth: "100%", padding: "10px 13px", borderRadius: 15, fontSize: 13.5, lineHeight: 1.5, background: m.rol === "user" ? `linear-gradient(135deg, ${T.azul}, ${T.azulOsc})` : "#fff", color: m.rol === "user" ? "#fff" : T.ink, border: m.rol === "user" ? "none" : "1px solid " + T.line, borderBottomRightRadius: m.rol === "user" ? 4 : 15, borderBottomLeftRadius: m.rol === "user" ? 15 : 4 }}>
                                        {m.texto}
                                    </div>
                                </div>
                            ))}
                            {pensando && <div style={{ fontSize: 12.5, color: T.muted, padding: "4px 2px" }}>Escribiendo…</div>}
                            <div ref={chatEndRef} />
                        </div>
                        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                            <input style={{ ...input, flex: 1 }} placeholder="Escribí tu pregunta…" value={msg} onChange={(e) => setMsg(e.target.value)} onKeyDown={(e) => e.key === "Enter" && enviarMensaje()} />
                            <button onClick={enviarMensaje} disabled={pensando} style={{ padding: "0 18px", borderRadius: 11, border: "none", background: `linear-gradient(135deg, ${T.azul}, ${T.azulOsc})`, color: "#fff", fontWeight: 800, fontSize: 16, cursor: "pointer" }}>➤</button>
                        </div>
                    </div>
                )}
            </div>

            <input ref={facturaRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,image/*,application/pdf" style={{ display: "none" }} onChange={onFacturaFile} />
            {verFactura && <FacturaModal pkg={verFactura} onClose={() => setVerFactura(null)} />}

            <div className="nav-contenedor" style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "#fff", borderTop: "1px solid " + T.line, boxShadow: "0 -4px 16px rgba(16,18,22,.05)" }}>
                {[["inicio", "🏠", "Inicio"], ["paquetes", "📦", "Paquetes"], ["cotizador", "🧮", "Cotizar"], ["prealerta", "✈️", "Pre-alerta"], ["asistente", "💬", "Asistente"]].map(([k, icon, t]) => (
                    <button key={k} onClick={() => { setTab(k); setDetalle(null); }} style={{ border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 2, color: tab === k ? T.azulOsc : T.muted, fontWeight: tab === k ? 800 : 500, fontSize: 10.5, fontFamily: "Inter, sans-serif", padding: "4px 8px", borderRadius: 11, background: tab === k ? T.azulSoft : "transparent" }}>
                        <span style={{ fontSize: 19 }}>{icon}</span><span className="nav-texto">{t}</span>
                    </button>
                ))}
            </div>
        </>
    );
}
