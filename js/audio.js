export const audio = {
    menuMusic: null,
    ingameMusic: null,
    bossMusic: null,
    sfx: {},

    init() {
        this.menuMusic = new Audio('assets/audio/menu-theme.mp3');
        this.menuMusic.loop = true;
        this.menuMusic.volume = 0.45;

        this.ingameMusic = new Audio('assets/audio/ingame-theme.mp3');
        this.ingameMusic.loop = true;
        this.ingameMusic.volume = 0.38;

        this.bossMusic = new Audio('assets/audio/boss-theme.mp3');
        this.bossMusic.loop = true;
        this.bossMusic.volume = 0.42;

        this.sfx = {
            shoot: this.createSfx('assets/audio/sfx/shoot1.wav', 0.25),
            explosion: this.createSfx('assets/audio/sfx/explosion1.mp3', 0.45),
            powerup: this.createSfx('assets/audio/sfx/powerup.mp3', 0.5),
            hit: this.createSfx('assets/audio/sfx/hit.mp3', 0.35),
            bomb: this.createSfx('assets/audio/sfx/bomb.mp3', 0.6),
            bossWarning: this.createSfx('assets/audio/sfx/boss-warning.mp3', 0.55),
        };
    },

    createSfx(src, volume = 0.4) {
        const sound = new Audio(src);
        sound.volume = volume;
        sound.preload = 'auto';
        return sound;
    },

        playSfx(name) {
        const sound = this.sfx[name];
        if (!sound) return;

        const clone = sound.cloneNode();
        clone.volume = sound.volume;
        clone.play().catch(() => {});
    },


    playMenu() {
        if (!this.menuMusic) this.init();

        this.stopIngame();
        this.stopBoss();

        this.menuMusic.currentTime = 0;
        this.menuMusic.play().catch(() => {
            console.log('Menu-Audio wartet auf Benutzeraktion.');
        });
    },

    stopMenu() {
        if (!this.menuMusic) return;

        this.menuMusic.pause();
        this.menuMusic.currentTime = 0;
    },

    playIngame() {
        if (!this.ingameMusic) this.init();

        this.stopMenu();
        this.stopBoss();

        this.ingameMusic.currentTime = 0;
        this.ingameMusic.play().catch(() => {
            console.log('Ingame-Audio wartet auf Benutzeraktion.');
        });
    },

    stopIngame() {
        if (!this.ingameMusic) return;

        this.ingameMusic.pause();
        this.ingameMusic.currentTime = 0;
    },

    playBoss() {
        if (!this.bossMusic) this.init();

        this.stopMenu();
        this.stopIngame();

        this.bossMusic.currentTime = 0;
        this.bossMusic.play().catch(() => {
            console.log('Boss-Audio wartet auf Benutzeraktion.');
        });
    },

    stopBoss() {
        if (!this.bossMusic) return;

        this.bossMusic.pause();
        this.bossMusic.currentTime = 0;
    },

    stopAll() {
        this.stopMenu();
        this.stopIngame();
        this.stopBoss();
    },
};