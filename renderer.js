const NUM_STRIPS = 8; // 5 physical, 3 virtual for Potato
const NUM_BUSSES = 8; // 5 physical, 3 virtual for Potato

const statusDiv = document.getElementById('connection-status');
const stripsContainer = document.getElementById('input-strips');
const bussesContainer = document.getElementById('output-busses');

// --- State Tracking ---
let activeFader = null; // Holds the param name of the fader being actively dragged
let isUpdating = false;

// --- Utility Function ---
function throttle(func, limit) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    }
}


// --- UI Generation ---
function createStrip(index) {
    const isPhysical = index < 5;
    let routingButtons = '';
    for (let i = 1; i <= 5; i++) { // A1-A5
        routingButtons += `<button class="btn routing-btn w-full py-1" data-param="Strip[${index}].A${i}" data-btn-type="toggle">A${i}</button>`;
    }
    for (let i = 1; i <= 3; i++) { // B1-B3
        routingButtons += `<button class="btn routing-btn w-full py-1" data-param="Strip[${index}].B${i}" data-btn-type="toggle">B${i}</button>`;
    }

    const stripHtml = `
        <div class="card p-2 flex flex-col items-center space-y-2" data-strip-index="${index}">
            <div id="strip-label-${index}" class="card-label font-bold text-center h-10 text-slate-300 flex items-center justify-center">${isPhysical ? `Hardware In ${index + 1}` : `Virtual In ${index - 4}`}</div>
            <div class="fader-track">
                <input type="range" orient="vertical" min="-60" max="12" step="0.1" value="0" class="fader" data-param="Strip[${index}].Gain">
            </div>
            <div id="strip-gain-label-${index}" class="db-label font-mono text-slate-400">-0.0 dB</div>
            <div class="w-full space-y-1">
                <button class="btn w-full py-1" data-param="Strip[${index}].Mute" data-btn-type="toggle">Mute</button>
                <button class="btn w-full py-1" data-param="Strip[${index}].Solo" data-btn-type="toggle">Solo</button>
            </div>
            <div class="w-full grid grid-cols-4 gap-1 pt-2 border-t border-slate-800">
                ${routingButtons}
            </div>
        </div>`;
    return stripHtml;
}

function createBus(index) {
    const isPhysical = index < 5;
    const busHtml = `
        <div class="card p-2 flex flex-col items-center space-y-2" data-bus-index="${index}">
            <div id="bus-label-${index}" class="card-label font-bold text-center h-10 text-slate-300 flex items-center justify-center">${isPhysical ? `Hardware Out A${index + 1}` : `Virtual Out B${index - 4}`}</div>
             <div class="fader-track">
                <input type="range" orient="vertical" min="-60" max="12" step="0.1" value="0" class="fader" data-param="Bus[${index}].Gain">
            </div>
            <div id="bus-gain-label-${index}" class="db-label font-mono text-slate-400">-0.0 dB</div>
            <div class="w-full space-y-1">
                <button class="btn w-full py-1" data-param="Bus[${index}].Mute" data-btn-type="toggle">Mute</button>
                <button class="btn w-full py-1" data-param="Bus[${index}].EQ.on" data-btn-type="toggle">EQ</button>
            </div>
        </div>`;
    return busHtml;
}

function buildUI() {
    for (let i = 0; i < NUM_STRIPS; i++) {
        stripsContainer.innerHTML += createStrip(i);
    }
    for (let i = 0; i < NUM_BUSSES; i++) {
        bussesContainer.innerHTML += createBus(i);
    }
}

// --- State Management & Updates ---
async function updateAllParameters() {
    if (isUpdating) return;
    isUpdating = true;

    const promises = [];
    // Strips
    for (let i = 0; i < NUM_STRIPS; i++) {
        promises.push(window.api.getParamFloat(`Strip[${i}].Gain`).then(val => updateFader(`Strip[${i}].Gain`, val)));
        promises.push(window.api.getParamFloat(`Strip[${i}].Mute`).then(val => updateButton(`Strip[${i}].Mute`, val)));
        promises.push(window.api.getParamFloat(`Strip[${i}].Solo`).then(val => updateButton(`Strip[${i}].Solo`, val)));
        promises.push(window.api.getParamString(`Strip[${i}].Label`).then(val => updateLabel(`strip-label-${i}`, val, `Input ${i+1}`)));
        for(let j = 1; j <= 5; j++) promises.push(window.api.getParamFloat(`Strip[${i}].A${j}`).then(val => updateButton(`Strip[${i}].A${j}`, val)));
        for(let j = 1; j <= 3; j++) promises.push(window.api.getParamFloat(`Strip[${i}].B${j}`).then(val => updateButton(`Strip[${i}].B${j}`, val)));
    }
    // Busses
    for (let i = 0; i < NUM_BUSSES; i++) {
        promises.push(window.api.getParamFloat(`Bus[${i}].Gain`).then(val => updateFader(`Bus[${i}].Gain`, val)));
        promises.push(window.api.getParamFloat(`Bus[${i}].Mute`).then(val => updateButton(`Bus[${i}].Mute`, val)));
        promises.push(window.api.getParamFloat(`Bus[${i}].EQ.on`).then(val => updateButton(`Bus[${i}].EQ.on`, val)));
        promises.push(window.api.getParamString(`Bus[${i}].Label`).then(val => updateLabel(`bus-label-${i}`, val, `Bus ${i+1}`)));
    }

    await Promise.all(promises);
    isUpdating = false;
}

const throttledUpdateAllParameters = throttle(updateAllParameters, 100);

function updateFader(param, value) {
    const fader = document.querySelector(`[data-param="${param}"]`);
    if (fader && fader.dataset.param === activeFader) {
        return;
    }

    if (fader && parseFloat(fader.value).toFixed(1) !== parseFloat(value).toFixed(1)) {
        fader.value = value;
    }
    const labelId = param.startsWith('Strip') ? `strip-gain-label-${param.match(/\d+/)[0]}` : `bus-gain-label-${param.match(/\d+/)[0]}`;
    const label = document.getElementById(labelId);
    if (label) {
        label.textContent = `${parseFloat(value).toFixed(1)} dB`;
    }
}

function updateButton(param, value) {
    const button = document.querySelector(`[data-param="${param}"]`);
    if (button) {
        button.setAttribute('data-state', value === 1 ? 'on' : 'off');
    }
}

function updateLabel(elementId, value, defaultValue) {
    const label = document.getElementById(elementId);
    if(label) {
        label.textContent = (value && value.trim() !== "") ? value : defaultValue;
    }
}

// --- Event Listeners & Initialization ---
document.addEventListener('DOMContentLoaded', async () => {
    buildUI();

    document.getElementById('minimize-btn').addEventListener('click', () => window.api.minimize());
    document.getElementById('close-btn').addEventListener('click', () => window.api.close());
    
    console.log('Attempting to connect to VoiceMeeter API...');
    const result = await window.api.login();
    console.log('Login result:', result);

    if (result && result.success) {
        statusDiv.textContent = 'Connected';
        statusDiv.classList.remove('bg-red-500');
        statusDiv.classList.add('bg-green-500');
        await updateAllParameters();
    } else {
        const errorMsg = result ? result.error : 'An unknown error occurred.';
        statusDiv.textContent = `Connection Failed: ${errorMsg}`;
    }

    // Listen for mouse down on a fader to set it as active
    document.body.addEventListener('mousedown', (e) => {
        if (e.target.classList.contains('fader')) {
            activeFader = e.target.dataset.param;
        }
    });

    // Listen for mouse up anywhere to release the active fader
    window.addEventListener('mouseup', () => {
        activeFader = null;
    });

    document.body.addEventListener('input', (e) => {
        if (e.target.classList.contains('fader')) {
            const param = e.target.dataset.param;
            const value = parseFloat(e.target.value);
            // We still send the update to VoiceMeeter in real-time
            window.api.setParam(param, value);
            // And update our own label locally for immediate feedback
            const labelId = param.startsWith('Strip') ? `strip-gain-label-${param.match(/\d+/)[0]}` : `bus-gain-label-${param.match(/\d+/)[0]}`;
            const label = document.getElementById(labelId);
            if (label) {
                label.textContent = `${value.toFixed(1)} dB`;
            }
        }
    });

    document.body.addEventListener('click', (e) => {
        if (e.target.dataset.btnType === 'toggle') {
            const param = e.target.dataset.param;
            const currentState = e.target.getAttribute('data-state');
            const newValue = currentState === 'on' ? 0 : 1;
            window.api.setParam(param, newValue);
            updateButton(param, newValue);
        }
    });

    window.api.onStateChange(() => {
        throttledUpdateAllParameters();
    });
    
    window.api.onRestarting(() => {
        statusDiv.textContent = 'Restarting...';
        statusDiv.classList.remove('bg-green-500');
        statusDiv.classList.add('bg-yellow-500');
        setTimeout(() => {
            statusDiv.textContent = 'Connected';
            statusDiv.classList.remove('bg-yellow-500');
            statusDiv.classList.add('bg-green-500');
            updateAllParameters();
        }, 2000);
    });
});

