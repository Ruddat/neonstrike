export const keys = new Set();

export const mouse = {
    x: 120,
    y: 360,
    left: false,
    right: false,
    inside: false,
};

export let pausePressed = false;
export let fullscreenPressed = false;

export function initInput(canvas) {
    window.addEventListener('keydown', (event) => {
        keys.add(event.code);

        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) {
            event.preventDefault();
        }

        if (event.code === 'KeyP') {
            pausePressed = true;
        }

        if (event.code === 'KeyF') {
            fullscreenPressed = true;
        }
    });

    window.addEventListener('keyup', (event) => {
        keys.delete(event.code);
    });

    canvas.addEventListener('mousemove', (event) => {
        const rect = canvas.getBoundingClientRect();
        mouse.x = ((event.clientX - rect.left) / rect.width) * canvas.width;
        mouse.y = ((event.clientY - rect.top) / rect.height) * canvas.height;
        mouse.inside = true;
    });

    canvas.addEventListener('mousedown', (event) => {
        if (event.button === 0) mouse.left = true;
        if (event.button === 2) mouse.right = true;
    });

    canvas.addEventListener('mouseup', (event) => {
        if (event.button === 0) mouse.left = false;
        if (event.button === 2) mouse.right = false;
    });

    canvas.addEventListener('mouseleave', () => {
        mouse.inside = false;
        mouse.left = false;
        mouse.right = false;
    });

    canvas.addEventListener('contextmenu', (event) => {
        event.preventDefault();
    });
}
