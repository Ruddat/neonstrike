const shell = document.querySelector('.game-shell');
const fullscreenButton = document.getElementById('fullscreenBtn');

function getFullscreenElement() {
    return document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement ||
        document.msFullscreenElement ||
        null;
}

function requestElementFullscreen(element) {
    if (!element) return Promise.reject(new Error('No fullscreen target found'));

    if (element.requestFullscreen) return element.requestFullscreen();
    if (element.webkitRequestFullscreen) return element.webkitRequestFullscreen();
    if (element.webkitRequestFullScreen) return element.webkitRequestFullScreen();
    if (element.mozRequestFullScreen) return element.mozRequestFullScreen();
    if (element.msRequestFullscreen) return element.msRequestFullscreen();

    return Promise.reject(new Error('Fullscreen API not supported'));
}

function exitElementFullscreen() {
    if (document.exitFullscreen) return document.exitFullscreen();
    if (document.webkitExitFullscreen) return document.webkitExitFullscreen();
    if (document.webkitCancelFullScreen) return document.webkitCancelFullScreen();
    if (document.mozCancelFullScreen) return document.mozCancelFullScreen();
    if (document.msExitFullscreen) return document.msExitFullscreen();

    return Promise.resolve();
}

function syncFullscreenClass() {
    const active = Boolean(getFullscreenElement());
    document.body.classList.toggle('is-game-fullscreen', active);
    if (shell) shell.classList.toggle('is-fullscreen', active);
}

export function toggleGameFullscreen() {
    const active = getFullscreenElement();

    const action = active
        ? exitElementFullscreen()
        : requestElementFullscreen(shell);

    if (action && typeof action.catch === 'function') {
        action.catch((error) => {
            console.warn('Neon Strike fullscreen failed:', error);
        });
    }
}

if (fullscreenButton) {
    fullscreenButton.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        toggleGameFullscreen();
    });
}

window.addEventListener('keydown', (event) => {
    if (event.code !== 'KeyF') return;

    event.preventDefault();
    event.stopPropagation();
    toggleGameFullscreen();
}, true);

for (const eventName of ['fullscreenchange', 'webkitfullscreenchange', 'mozfullscreenchange', 'MSFullscreenChange']) {
    document.addEventListener(eventName, syncFullscreenClass);
}

syncFullscreenClass();
