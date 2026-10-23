/*
 * ===============================================
 * VERIFICADOR DE CONSTANCIAS — MINSA / CITT
 * Consulta tu API propia (Express + Postgres en VPS).
 * Detecta el tipo según el parámetro de la URL del QR:
 *   ?citt=T-XXX-...   → busca en constancias_citt
 *   ?minsa=MINSA-...  → busca en constancias_minsa
 *   ?autog=...        → prueba ambas tablas
 * ===============================================
 */
document.addEventListener('DOMContentLoaded', function () {

    const API_BASE = 'https://descanso-api.sin-flower.com';

    const TIPOS = {
        documento: {
            ruta: 'documentos', nombre: 'Documento pendiente',
            titulo: 'Consulta del registro interno', h1: 'Consulta del registro interno',
            subtitulo: 'Documento pendiente de validación y firma profesional. El registro no acredita atención ni emisión institucional.'
        },
        citt: {
            ruta: 'citt',
            nombre: 'CITT',
            titulo: 'Verificación de CITT',
            h1: 'Verificación de Autenticidad CITT',
            subtitulo: 'Ingrese el código del Certificado de Incapacidad Temporal para el Trabajo para validar su autenticidad en el sistema.'
        },
        receta: {
            ruta: 'receta',
            nombre: 'Receta',
            titulo: 'Verificación del registro de receta',
            h1: 'Verificación del registro de receta',
            subtitulo: 'Consulta un borrador registrado en el sistema. No acredita firma, habilitación profesional ni emisión por MINSA.'
        },
        essalud: {
            ruta: 'essalud/citt-demo',
            nombre: 'Documento pendiente de firma',
            titulo: 'Consulta del registro interno',
            h1: 'Consulta del registro interno',
            subtitulo: 'Documento pendiente de validación y firma profesional. Este registro no acredita atención médica ni emisión por EsSalud.'
        },
        minsa: {
            ruta: 'minsa',
            nombre: 'MINSA',
            titulo: 'Verificación de Constancia MINSA',
            h1: 'Verificación de Constancia MINSA',
            subtitulo: 'Ingrese el código de Autogenerado (AUTOG.) de la constancia para validar su autenticidad.'
        }
    };

    // --- DOM ---
    const searchContainer   = document.getElementById('search-container');
    const resultsContainer  = document.getElementById('results-container');
    const verificationForm  = document.getElementById('verification-form');
    const autogInput        = document.getElementById('autog-input');
    const verifyButton      = document.getElementById('verify-button');
    const buttonText        = verifyButton.querySelector('.button-text');
    const buttonLoader      = verifyButton.querySelector('.button-loader');
    const formError         = document.getElementById('form-error');
    const pageH1            = document.getElementById('page-h1');
    const pageSubtitle      = document.getElementById('page-subtitle');

    let tipoActual = null;
    const footer = document.querySelector('.main-footer');
    const footerOriginal = footer?.textContent;
    const logo = document.getElementById('logo-img');

    // --- UI helpers ---
    function aplicarTipo(tipoKey) {
        const cfg = TIPOS[tipoKey];
        if (!cfg) return;
        tipoActual = tipoKey;
        document.title = cfg.titulo;
        if (pageH1)       pageH1.textContent       = cfg.h1;
        if (pageSubtitle) pageSubtitle.textContent  = cfg.subtitulo;
        buttonText.textContent = ['receta','essalud','documento'].includes(tipoKey) ? 'Verificar registro' : 'Verificar Autenticidad';
        if (logo) logo.style.display = ['essalud','documento'].includes(tipoKey) ? 'none' : '';
        if (footer) footer.textContent = ['essalud','documento'].includes(tipoKey) ? 'Registro interno de documentos pendientes de firma. Sin acreditación institucional.' : footerOriginal;
    }

    function setLoading(isLoading) {
        verifyButton.disabled = isLoading;
        buttonText.classList.toggle('hidden', isLoading);
        buttonLoader.classList.toggle('hidden', !isLoading);
    }

    function formatDate(dateStr) {
        if (!dateStr) return 'No disponible';
        const d = new Date(dateStr + 'T05:00:00Z');
        const day   = String(d.getUTCDate()).padStart(2, '0');
        const month = String(d.getUTCMonth() + 1).padStart(2, '0');
        const year  = d.getUTCFullYear();
        return `${day}/${month}/${year}`;
    }

    // --- Render resultados ---
    function displayResults(data, tipoKey) {
        if (['essalud','documento'].includes(tipoKey)) { displayEssalud(data); return; }
        if (tipoKey === 'receta') { displayReceta(data); return; }
        const cfg = TIPOS[tipoKey];
        const vigente = data.vigente;

        const estadoBadge = vigente
            ? `<span style="color:var(--color-exito);font-weight:700;">✓ Vigente</span>`
            : `<span style="color:var(--color-error);font-weight:700;">✗ Vencida</span> <span style="color:var(--color-texto-secundario);font-size:0.8rem;">(venció el ${formatDate(data.valido_hasta)})</span>`;

        resultsContainer.innerHTML = `
            <div class="result-card result-card--valid">
                <div class="result-card__header">
                    <i class="bi bi-patch-check-fill"></i>
                    <div>
                        <h3 class="result-card__title">Constancia ${cfg.nombre} Válida y Auténtica</h3>
                        <p class="result-card__subtitle">Verificada en el sistema. Estado: ${estadoBadge}</p>
                    </div>
                </div>
                <div class="result-card__details">
                    <div class="detail-item">
                        <span class="label">Paciente</span>
                        <span class="value">${data.paciente_nombre || 'N/A'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="label">DNI</span>
                        <span class="value">${data.paciente_dni || 'N/A'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="label">Código AUTOG.</span>
                        <span class="value" style="font-family:monospace;font-size:0.85rem;">${data.autog || 'N/A'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="label">Hospital</span>
                        <span class="value">${data.hospital || 'N/A'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="label">Diagnóstico</span>
                        <span class="value">${data.diagnostico || 'N/A'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="label">Inicio Descanso</span>
                        <span class="value">${formatDate(data.descanso_inicio)}</span>
                    </div>
                    <div class="detail-item">
                        <span class="label">Fin Descanso</span>
                        <span class="value">${formatDate(data.descanso_fin)}</span>
                    </div>
                    <div class="detail-item">
                        <span class="label">Total Días</span>
                        <span class="value">${data.descanso_dias ?? 'N/A'}</span>
                    </div>
                </div>
                <button class="new-search-button" id="newSearchBtn">Nueva Consulta</button>
            </div>
        `;

        searchContainer.classList.add('hidden');
        resultsContainer.classList.remove('hidden');
        document.getElementById('newSearchBtn').addEventListener('click', resetView);
    }

    function displayReceta(data) {
        // Los datos del registro se insertan como texto, nunca como HTML.
        resultsContainer.innerHTML = `
            <div class="result-card">
                <div class="result-card__header"><div>
                    <h3 class="result-card__title">Registro de receta encontrado</h3>
                    <p class="result-card__subtitle">BORRADOR - requiere validación y firma del profesional.</p>
                </div></div>
                <div class="result-card__details" id="receta-details"></div>
                <p class="result-card__message">Este registro no acredita firma, habilitación profesional ni emisión por MINSA. No se publican datos del paciente ni indicaciones clínicas.</p>
                <button class="new-search-button" id="newSearchBtn">Nueva consulta</button>
            </div>`;
        const details = document.getElementById('receta-details');
        const filas = [
            ['Código del registro', data.autog],
            ['Fecha de registro', new Date(data.created_at).toLocaleString('es-PE', { timeZone: 'America/Lima' })],
            ['Plazo declarado hasta', formatDate(data.valido_hasta)],
            ['Estado del plazo', data.dentro_del_plazo_declarado ? 'Dentro del plazo declarado' : 'Plazo declarado vencido'],
            ['Medicamentos registrados', data.medicamentos_total]
        ];
        filas.forEach(([label, value]) => {
            const item = document.createElement('div'); item.className = 'detail-item';
            const key = document.createElement('span'); key.className = 'label'; key.textContent = label;
            const content = document.createElement('span'); content.className = 'value';
            content.textContent = String(value ?? 'No disponible'); content.style.overflowWrap = 'anywhere';
            item.append(key, content); details.append(item);
        });
        searchContainer.classList.add('hidden'); resultsContainer.classList.remove('hidden');
        document.getElementById('newSearchBtn').addEventListener('click', resetView);
    }

    function displayEssalud(data) {
        resultsContainer.innerHTML = `<div class="result-card result-card--pending">
            <div class="result-card__header">
                <svg class="pending-icon" width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true"><circle cx="16" cy="16" r="13" stroke="currentColor" stroke-width="2.5"/><path d="M16 8v9l6 3" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
                <div><h3 class="result-card__title">Registro interno encontrado</h3>
                <p class="result-card__subtitle">Pendiente de validación y firma profesional.</p></div>
            </div>
            <div class="result-card__details" id="essalud-details"></div>
            <button class="new-search-button" id="newSearchBtn">Nueva consulta</button></div>`;
        const details = document.getElementById('essalud-details');
        const filas = [
            ['Código del registro', data.autog],
            ...(data.tipo ? [['Tipo de documento', data.tipo]] : []),
            ['Fecha de registro', new Date(data.created_at).toLocaleString('es-PE', { timeZone: 'America/Lima' })],
            ['Huella SHA-256 del PDF original', data.pdf_sha256]
        ];
        filas.forEach(([label,value])=>{
            const item=document.createElement('div');item.className='detail-item';
            const key=document.createElement('span');key.className='label';key.textContent=label;
            const content=document.createElement('span');content.className='value';
            if (label === 'Código del registro' || label === 'Huella SHA-256 del PDF original') content.classList.add('record-code');
            content.textContent=String(value??'No disponible');content.style.overflowWrap='anywhere';
            item.append(key,content);details.append(item);
        });
        searchContainer.classList.add('hidden');resultsContainer.classList.remove('hidden');
        document.getElementById('newSearchBtn').addEventListener('click',resetView);
    }

    function displayNotFound(autog) {
        if (['essalud','documento'].includes(tipoActual)) {
            resultsContainer.innerHTML = `<div class="result-card result-card--invalid">
                <h3 class="result-card__title">Registro interno no encontrado</h3>
                <p>Verifica el código. Las muestras antiguas de demostración no tienen registro.</p>
                <button class="new-search-button" id="newSearchBtn">Intentar de nuevo</button></div>`;
            searchContainer.classList.add('hidden');resultsContainer.classList.remove('hidden');
            document.getElementById('newSearchBtn').addEventListener('click',resetView);
            return;
        }
        if (tipoActual === 'receta') {
            resultsContainer.innerHTML = `<div class="result-card result-card--invalid">
                <h3 class="result-card__title">Registro de receta no encontrado</h3>
                <p>Verifica el código. Las muestras locales no tienen registro en producción.</p>
                <button class="new-search-button" id="newSearchBtn">Intentar de nuevo</button></div>`;
            searchContainer.classList.add('hidden'); resultsContainer.classList.remove('hidden');
            document.getElementById('newSearchBtn').addEventListener('click', resetView);
            return;
        }
        resultsContainer.innerHTML = `
            <div class="result-card result-card--invalid">
                <div class="result-card__header">
                    <i class="bi bi-x-circle-fill"></i>
                    <div>
                        <h3 class="result-card__title">Constancia no Encontrada</h3>
                        <p class="result-card__subtitle">El código ingresado no corresponde a ningún registro válido en el sistema.</p>
                    </div>
                </div>
                <div class="result-card__message">
                    No se encontraron resultados para: <strong>${autog}</strong>.<br>
                    Verifique que el código esté escrito correctamente.
                </div>
                <button class="new-search-button" id="newSearchBtn">Intentar de Nuevo</button>
            </div>
        `;
        searchContainer.classList.add('hidden');
        resultsContainer.classList.remove('hidden');
        document.getElementById('newSearchBtn').addEventListener('click', resetView);
    }

    function resetView() {
        resultsContainer.classList.add('hidden');
        searchContainer.classList.remove('hidden');
        verificationForm.reset();
        formError.textContent = '';
        window.history.pushState({}, document.title, window.location.pathname);
    }

    // --- Lectura de URL params (QR) ---
    function checkURLParams() {
        const params = new URLSearchParams(window.location.search);
        let autogCode = null;

        if (params.get('documento')) {
            autogCode=params.get('documento');aplicarTipo('documento');
        } else if (params.get('citt')) {
            autogCode = params.get('citt');
            aplicarTipo('citt');
        } else if (params.get('minsa')) {
            autogCode = params.get('minsa');
            aplicarTipo('minsa');
        } else if (params.get('receta')) {
            autogCode = params.get('receta');
            aplicarTipo('receta');
        } else if (params.get('essalud')) {
            autogCode = params.get('essalud');
            aplicarTipo('essalud');
        } else if (params.get('autog')) {
            autogCode = params.get('autog');
            // tipo desconocido: se probarán ambas tablas
        }

        if (autogCode) {
            autogInput.value = autogCode;
            verificationForm.requestSubmit();
        }
    }

    // --- Llamada a la API ---
    async function buscarEnAPI(tipoKey, autogValue) {
        const cfg = TIPOS[tipoKey];
        const resp = await fetch(`${API_BASE}/api/${cfg.ruta}/verificar/${encodeURIComponent(autogValue)}`);
        if (resp.status === 404) return null;
        if (!resp.ok) throw new Error(`Error del servidor (${resp.status})`);
        const payload = await resp.json();
        return ['receta','essalud','documento'].includes(tipoKey) ? (payload.status === true ? payload.data : null) : payload;
    }

    // --- Submit ---
    async function handleSearch(event) {
        event.preventDefault();
        const autogValue = autogInput.value.trim().toUpperCase();
        formError.textContent = '';

        if (!autogValue) {
            formError.textContent = 'Por favor, ingrese el código AUTOG.';
            return;
        }

        setLoading(true);

        try {
            if (autogValue.startsWith('DOC-')) aplicarTipo('documento');
            else if (autogValue.startsWith('ESSALUD-')) aplicarTipo('essalud');
            else if (autogValue.startsWith('RECETA-')) aplicarTipo('receta');
            if (tipoActual==='documento'&&!/^DOC-[A-F0-9]{32}$/.test(autogValue)) {
                formError.textContent='El código del registro no es válido.';return;
            }
            if (tipoActual === 'essalud') {
                if (!/^ESSALUD-[A-F0-9]{32}$/.test(autogValue)) {
                    formError.textContent = 'El código del registro no es válido.';
                    return;
                }
            }
            if (tipoActual === 'receta' || autogValue.startsWith('RECETA-')) {
                aplicarTipo('receta');
                if (!/^RECETA-[A-F0-9]{32}$/.test(autogValue)) {
                    formError.textContent = 'El código de receta no es válido.';
                    return;
                }
            }
            const ordenBusqueda = tipoActual ? [tipoActual] : ['citt', 'minsa'];
            let encontrado     = null;
            let tipoEncontrado = null;

            for (const tipoKey of ordenBusqueda) {
                const data = await buscarEnAPI(tipoKey, autogValue);
                if (data) {
                    encontrado     = data;
                    tipoEncontrado = tipoKey;
                    break;
                }
            }

            if (encontrado) {
                aplicarTipo(tipoEncontrado);
                displayResults(encontrado, tipoEncontrado);
            } else {
                displayNotFound(autogValue);
            }

        } catch (err) {
            console.error('Error en la búsqueda:', err);
            formError.textContent = 'Ocurrió un error al conectar con el servidor. Intente más tarde.';
        } finally {
            setLoading(false);
        }
    }

    verificationForm.addEventListener('submit', handleSearch);
    checkURLParams();
});
