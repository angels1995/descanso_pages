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
        citt: {
            ruta: 'citt',
            nombre: 'CITT',
            titulo: 'Verificación de CITT',
            h1: 'Verificación de Autenticidad CITT',
            subtitulo: 'Ingrese el código del Certificado de Incapacidad Temporal para el Trabajo para validar su autenticidad en el sistema.'
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

    // --- UI helpers ---
    function aplicarTipo(tipoKey) {
        const cfg = TIPOS[tipoKey];
        if (!cfg) return;
        tipoActual = tipoKey;
        document.title = cfg.titulo;
        if (pageH1)       pageH1.textContent       = cfg.h1;
        if (pageSubtitle) pageSubtitle.textContent  = cfg.subtitulo;
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

    function displayNotFound(autog) {
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

        if (params.get('citt')) {
            autogCode = params.get('citt');
            aplicarTipo('citt');
        } else if (params.get('minsa')) {
            autogCode = params.get('minsa');
            aplicarTipo('minsa');
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
        return resp.json();
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
