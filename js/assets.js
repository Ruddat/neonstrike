export const assets = {
    images: {},

    loadImage(key, src) {
        return new Promise((resolve, reject) => {
            const image = new Image();

            image.onload = () => {
                this.images[key] = image;
                resolve(image);
            };

            image.onerror = () => {
                reject(new Error('Bild konnte nicht geladen werden: ' + src));
            };

            image.src = src;
        });
    },

async loadAll() {
    await Promise.all([
        this.loadImage('player', 'assets/sprites/player/player_ship.png'),
        this.loadImage('laserYellow', 'assets/sprites/bullets/laser_yellow.png'),
        this.loadImage('enemyDrone', 'assets/sprites/enemies/enemy_drone.png'),
        this.loadImage('enemyHeavy', 'assets/sprites/enemies/enemy_heavy.png'),

        this.loadImage('boss01', 'assets/sprites/boss/boss_01.png'),
        this.loadImage('boss02', 'assets/sprites/boss/boss_02.png'),
        this.loadImage('boss03', 'assets/sprites/boss/boss_03.png'),
        this.loadImage('boss04', 'assets/sprites/boss/boss_04.png'),

this.loadImage('explosion01', 'assets/sprites/fx/explosion_01.png'),
this.loadImage('explosion02', 'assets/sprites/fx/explosion_02.png'),
this.loadImage('explosion03', 'assets/sprites/fx/explosion_03.png'),
this.loadImage('explosion04', 'assets/sprites/fx/explosion_04.png'),
this.loadImage('explosion05', 'assets/sprites/fx/explosion_05.png'),
this.loadImage('explosion06', 'assets/sprites/fx/explosion_06.png'),


        // Background images (scrolling)
        this.loadImage('bgCity01', 'assets/backgrounds/bg_city_01.jpg'),
        this.loadImage('bgCity02', 'assets/backgrounds/bg_city_02.jpg'),

    ]);
},

    get(key) {
        return this.images[key] || null;
    },
};