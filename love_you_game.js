const messages = {
  'A': "A come 'Amore', quello che provo per te",
  'U': "U come 'Unica', come sei tu",
  'G': "G come 'Gioia', che porti ogni giorno",
  'U2': "U come 'Un sogno', che vivi con me",
  'R': "R come 'Risate', che non mancano mai",
  'I': "I come 'Insieme', sempre"
};

const config = {
  type: Phaser.AUTO,
  render: {
    pixelArt: true,
    antiAliasing: false,
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 1000 },
      debug: false
    }
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 800,
    height: 600
  },
  scene: {
    preload: preload,
    create: create,
    update: update
  }
};

const game = new Phaser.Game(config);

let player;
let sky;
let staticPlatform;
let movingPlatform;
let currentMovingPlatform = null;
let blockSize;
let cursors;
let letters;
let collected;
let text;
let fadeTween;
let isJumping = false;
let jumpStartTime = 0;
const MAX_JUMP_TIME = 500; // in ms, tempo massimo in cui si può "caricare" il salto
const JUMP_SPEED = -250;   // velocità iniziale del salto
const JUMP_HOLD_SPEED = -250; // velocità continua durante il "caricamento" del salto

let backgroundMusic;

//per idle animation
let idleTimer = 0;
let isIdle = false;
let isInIdleSpecial2 = false;
let lastBlinkTime = 0;
const BLINK_INTERVAL = 5000;
let lastMovementTime = 0;
let lastIdleSpecialTime = 0;
let lastIdleSpecialPlayTime = 0;
const IDLE_SPECIAL = 5000; // 5 secondi
const IDLE_SPECIAL_2 = 15000; // 15 secondi


const LETTER_KEYS = ['A', 'U', 'G', 'U2', 'R', 'I'];

function preload() {
  //load del livello
  this.load.json('level1', 'assets/levels/level2.json');

  //reset variabili
  collected = 0;

  //load delle immagini
  //load sfono
  this.load.image('sky', 'assets/background/background.png');
  this.load.image('clouds', 'assets/background/clouds.png');
  //load piattaforme
  for (let i = 1; i <= 4; i++) {
    this.load.image(`block${i}`, `assets/blocks/block${i}.png`);
  }
  for (let i = 1; i <= 4; i++) {
    this.load.image(`ground${i}`, `assets/blocks/ground${i}.png`);
  }
  this.load.image('movingPlatformLeft', 'assets/blocks/movingPlatformLeft.png')
  this.load.image('movingPlatformCenter', 'assets/blocks/movingPlatformCenter.png')
  this.load.image('movingPlatformRight', 'assets/blocks/movingPlatformRight.png')
  //load player
  this.load.spritesheet('player', 'assets/character/MyLove.png', {
    frameWidth: 20,   // o la larghezza del frame
    frameHeight: 20   // o l’altezza del frame
  });
  // load spritesheet lettere (A, U, G, U2, R, I)
  this.load.spritesheet('A', 'assets/letters/A.png', { frameWidth: 16, frameHeight: 16 });
  this.load.spritesheet('U', 'assets/letters/U.png', { frameWidth: 16, frameHeight: 16 });
  this.load.spritesheet('G', 'assets/letters/G.png', { frameWidth: 16, frameHeight: 16 });
  this.load.spritesheet('U2', 'assets/letters/U.png', { frameWidth: 16, frameHeight: 16 });
  this.load.spritesheet('R', 'assets/letters/R.png', { frameWidth: 16, frameHeight: 16 });
  this.load.spritesheet('I', 'assets/letters/I.png', { frameWidth: 16, frameHeight: 16 });

  this.load.image('particle', 'assets/misc/particle.png')
  this.load.image('heartParticle', 'assets/misc/heartParticle.png')
  //fiori
  this.load.spritesheet('flower_yellow', 'assets/misc/flower_yellow.png', { frameWidth: 16, frameHeight: 16 });
  this.load.spritesheet('flower_cyan', 'assets/misc/flower_cyan.png', { frameWidth: 16, frameHeight: 16 });
  this.load.spritesheet('flower_pink', 'assets/misc/flower_pink.png', { frameWidth: 16, frameHeight: 16 });
  //erba
  this.load.spritesheet('grass_1', 'assets/misc/grass_1.png', { frameWidth: 16, frameHeight: 16 });
  this.load.spritesheet('grass_2', 'assets/misc/grass_2.png', { frameWidth: 16, frameHeight: 16 });
  this.load.spritesheet('grass_3', 'assets/misc/grass_3.png', { frameWidth: 16, frameHeight: 16 });
  //uccuelli
  this.load.spritesheet('bird_red', 'assets/misc/bird_red.png', { frameWidth: 32, frameHeight: 32 });
  this.load.spritesheet('bird_blue', 'assets/misc/bird_blue.png', { frameWidth: 32, frameHeight: 32 });
  this.load.spritesheet('bird_green', 'assets/misc/bird_green.png', { frameWidth: 32, frameHeight: 32 });
  //audio
  this.load.audio('bgMusic', 'assets/audio/music.mp3');
  this.load.audio('collect', 'assets/audio/collect.mp3');
}

function create() {
  resetState.call(this);  // <-- reset variabili globali
  
  //musica
  if (backgroundMusic) {
    backgroundMusic.destroy(); // 🔁 Stop and reset
  }

  backgroundMusic = this.sound.add('bgMusic', {
    volume: 0.5,
    loop: true
  });
  backgroundMusic.play();

  // World bounds
  const WORLD_WIDTH = this.scale.width * 15;
  const WORLD_HEIGHT = this.scale.height; // puoi aumentare se vuoi più "vuoto" sotto

  // setBounds(x, y, width, height, checkLeft, checkRight, checkUp, checkDown)
  this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT, true, true, true, false);

  // la camera rimane limitata all'altezza visibile (non segue il player verso il basso)
  this.cameras.main.setBounds(0, 0, WORLD_WIDTH, this.scale.height);

  // Sfondo

  // Calcola il fattore di scala per portare l'immagine da 128px a 600px
  const backgroundHeight = 128;
  const backgroundScale = this.scale.height / backgroundHeight;

  // Calcola la larghezza dell'immagine scalata
  const scaledBgWidth = 512 * backgroundScale;

  const tilesNeeded = Math.ceil(WORLD_WIDTH / scaledBgWidth);

  // Crea un tileSprite abbastanza largo da coprire tutto il mondo
  sky = this.add.tileSprite(0, 0, tilesNeeded * scaledBgWidth, this.scale.height, 'sky')
    .setOrigin(0, 0)
    .setScrollFactor(0.25) // parallasse, opzionale
    .setScale(backgroundScale); // SCALA per portare da 128px a 600px

  clouds = this.add.tileSprite(0, 0, tilesNeeded * scaledBgWidth, this.scale.height, 'clouds')
    .setOrigin(0 ,0)
    .setScrollFactor(0.25)
    .setScale(backgroundScale);

  // carica livello
  const levelData = this.cache.json.get('level1');
  blockSize = levelData.blockSize || 32;

  // Piattaforme
  staticPlatform = this.physics.add.staticGroup();
  movingPlatform = this.physics.add.staticGroup();

  // Array per gestire più piattaforme mobili
  movingPlatform.leaders = [];

  levelData.platforms.forEach(p => {
    if (p.targetX !== undefined || p.targetY !== undefined) {
      // piattaforma mobile
      const blocks = [];

      // 1 blocco left
      const leftBlock = movingPlatform.create(p.x, p.y, 'movingPlatformLeft').setOrigin(0, 0);
      leftBlock.setScale(2);
      leftBlock.prevX = leftBlock.x;
      leftBlock.prevY = leftBlock.y;
      blocks.push(leftBlock);

      // blocchi center
      for (let i = 1; i < p.width - 1; i++) {
        const centerBlock = movingPlatform.create(p.x + i * blockSize, p.y, 'movingPlatformCenter').setOrigin(0, 0);
        centerBlock.setScale(2);
        centerBlock.prevX = centerBlock.x;
        centerBlock.prevY = centerBlock.y;
        blocks.push(centerBlock);
      }

      // 1 blocco right
      const rightBlock = movingPlatform.create(p.x + (p.width - 1) * blockSize, p.y, 'movingPlatformRight').setOrigin(0, 0);
      rightBlock.setScale(2);
      rightBlock.prevX = rightBlock.x;
      rightBlock.prevY = rightBlock.y;
      blocks.push(rightBlock);

      // Leader
      const leader = blocks[0];
      leader.startX = p.x;
      leader.startY = p.y;
      leader.targetX = p.targetX !== undefined ? p.targetX : p.x;
      leader.targetY = p.targetY !== undefined ? p.targetY : p.y;
      leader.speed = p.speed !== undefined ? p.speed : 50;
      leader.directionX = (leader.targetX !== leader.startX) ? 1 : 0;
      leader.directionY = (leader.targetY > leader.startY) ? 1 : -1;
      leader.widthBlocks = p.width;
      leader.blocks = blocks;

      movingPlatform.leaders.push(leader);
    } else {
      // piattaforma statica
      for (let i = 0; i < p.width; i++) {
        let textureKey;
        if (p.y === 568) {
          textureKey = `ground${Math.floor(Math.random() * 4) + 1}`;
        } else {
          textureKey = `block${Math.floor(Math.random() * 4) + 1}`;
        }
        const block = staticPlatform.create(p.x + i * blockSize, p.y, textureKey).setOrigin(0, 0);
        block.setScale(2);
        block.refreshBody();

        //fiori
        this.anims.create({
          key: 'flower-yellow-anim',
          frames: this.anims.generateFrameNumbers('flower_yellow', { start: 0, end: 4 }),
          frameRate: 6,
          repeat: -1,
          yoyo: true
        });
        this.anims.create({
          key: 'flower-cyan-anim',
          frames: this.anims.generateFrameNumbers('flower_cyan', { start: 0, end: 4 }),
          frameRate: 6,
          repeat: -1,
          yoyo: true
        });
        this.anims.create({
          key: 'flower-pink-anim',
          frames: this.anims.generateFrameNumbers('flower_pink', { start: 0, end: 4 }),
          frameRate: 6,
          repeat: -1,
          yoyo: true
        });

        //erba
        this.anims.create({
          key: 'grass-1-anim',
          frames: this.anims.generateFrameNumbers('grass_1', { start: 0, end: 3 }),
          frameRate: 5,
          repeat: -1,
          yoyo: true
        });
        this.anims.create({
          key: 'grass-2-anim',
          frames: this.anims.generateFrameNumbers('grass_2', { start: 0, end: 3 }),
          frameRate: 5,
          repeat: -1,
          yoyo: true
        });
        this.anims.create({
          key: 'grass-3-anim',
          frames: this.anims.generateFrameNumbers('grass_3', { start: 0, end: 3 }),
          frameRate: 5,
          repeat: -1,
          yoyo: true
        });

        // AGGIUNGI FIORE RANDOM SOLO SUI GROUND
        if (p.y === 568) {
          const rand = Math.random();

          if (rand < 0.1) {
            // 10% di probabilità per i fiori
            const flowerTypes = ['flower_yellow', 'flower_cyan', 'flower_pink'];
            const flowerAnims = ['flower-yellow-anim', 'flower-cyan-anim', 'flower-pink-anim'];
            const index = Math.floor(Math.random() * flowerTypes.length);

            const flower = this.add.sprite(block.x + blockSize / 2, block.y, flowerTypes[index]);
            flower.setOrigin(0.5, 1);
            flower.setScale(2);
            flower.anims.play(flowerAnims[index]);
            flower.setDepth(1);

          } else if (rand < 0.35) {
            // 35% meno 10% = 25% per l'erba
            const grassTypes = ['grass_1', 'grass_2', 'grass_3'];
            const grassAnims = ['grass-1-anim', 'grass-2-anim', 'grass-3-anim'];
            const index = Math.floor(Math.random() * grassTypes.length);

            const grass = this.add.sprite(block.x + blockSize / 2, block.y, grassTypes[index]);
            grass.setOrigin(0.5, 1);
            grass.setScale(2);
            grass.anims.play(grassAnims[index]);
            grass.setDepth(1);
          }
        }
      }
    }
  });

  // Lettere

  // Crea animazioni per le lettere
  LETTER_KEYS.forEach(letterKey => {
    this.textures.get(letterKey).setFilter(Phaser.Textures.FilterMode.NEAREST);

    this.anims.create({
      key: `anim-${letterKey}`,
      frames: this.anims.generateFrameNumbers(letterKey, { start: 0, end: 10 }), // 11 frame
      frameRate: 10,
      yoyo: true,
      repeat: -1
    });
  });
  //crea le lettere
  letters = this.physics.add.group();
  levelData.letters.forEach(lp => {
    const letter = this.physics.add.sprite(lp.x, lp.y, lp.key);
    letter.letterKey = lp.key;
    letter.anims.play(`anim-${lp.key}`);
    letter.setScale((this.scale.height * 0.1) / letter.height);
    letters.add(letter);
  });

  // Player
  this.playerIsDead = false;

  //animazioni player
  this.anims.create({
    key: 'walk',
    frames: this.anims.generateFrameNumbers('player', { start: 0, end: 7 }),
    frameRate: 10,
    repeat: -1
  });

  this.anims.create({
    key: 'idle',
    frames: [ { key: 'player', frame: 0 } ],
    frameRate: 1,
    repeat: -1
  });

  this.anims.create({
    key: 'idle-special',
    frames: this.anims.generateFrameNumbers('player', { frames: [8, 9, 10, 11, 10, 9, 10, 11, 10, 9, 10, 11, 10, 9, 8, 0] }),
    frameRate: 10,
    repeat: 0,
    yoyo: false
  });

  this.anims.create({
    key: 'idle-special-2',
    frames: this.anims.generateFrameNumbers('player', { frames: [0, 12, 13, 14] }),
    frameRate: 10,
    repeat: 0,
    yoyo: false
  });

  this.anims.create({
    key: 'idle-special-2-blink',
    frames: this.anims.generateFrameNumbers('player', { frames: [14, 15, 14, 15, 14] }),
    frameRate: 8,
    repeat: 0,
    yoyo: false
  });

  this.anims.create({
    key: 'jump',
    frames: [ { key: 'player', frame: 0 } ], // o il frame che preferisci
    frameRate: 1
  });

  player = this.physics.add.sprite(100, 450, 'player');
  const scaleFactor = this.scale.height / 300; // o una base "logica" tua
  player.setScale(scaleFactor);
  player.setCollideWorldBounds(true);
  this.physics.add.collider(player, staticPlatform);
  cursors = this.input.keyboard.createCursorKeys();
  window.cursors = cursors; // rendi cursors globale per i controlli touch

  // Camera
  this.cameras.main.startFollow(player, true, 1, 1);
  this.cameras.main.roundPixels = true;
  this.cameras.main.setFollowOffset(-200, 0);

  //uccelli

  const birdColors = ['red', 'blue', 'green'];
  birdColors.forEach(color => {
    this.anims.create({
      key: `fly-${color}`,
      frames: this.anims.generateFrameNumbers(`bird_${color}`, { start: 0, end: 3 }),
      frameRate: 10,
      repeat: -1
    });
  });

  this.time.addEvent({
    delay: Phaser.Math.Between(15000, 30000), // ogni 15–30 secondi
    loop: true,
    callback: () => spawnBirdFlock.call(this, this.player)
  });

  // Messaggio
  text = this.add.text(400, 500, '', {
    fontSize: `${Math.round(this.scale.height / 25)}px`,
    fill: '#ffffff',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    padding: { x: 20, y: 10 },
  }).setScrollFactor(0);
  text.setOrigin(0.5);
  text.setAlpha(0);

  
  this.physics.add.collider(player, staticPlatform);
  this.physics.add.collider(letters, staticPlatform);
  this.physics.add.collider(letters, movingPlatform);
  this.physics.add.overlap(player, letters, collectLetter, null, this);
  this.physics.add.collider(player, movingPlatform, onMovingPlatformCollision, null, this);
}

function onMovingPlatformCollision(player, platform) {
  // Verifica che il player sia sopra la piattaforma e non stia saltando
  if (
    player.body.blocked.down || player.body.touching.down
  ) {
    // Calcola lo spostamento della piattaforma rispetto al frame precedente
    const dx = platform.x - platform.prevX || 0;
    const dy = platform.y - platform.prevY || 0;

    // Muovi il player insieme alla piattaforma
    player.x += dx;
    player.y += dy;
  }

  // Aggiorna la posizione precedente della piattaforma
  platform.prevX = platform.x;
  platform.prevY = platform.y;
}

function collectLetter(player, letter) {
  letter.disableBody(true, true);
  const key = letter.letterKey;
  const msg = messages[key] || 'Lettera misteriosa 💌';
  collected++;

  // Effetto particelle
  const particles = this.add.particles('particle');
  const emitter = particles.createEmitter({
    x: letter.x,
    y: letter.y,
    speed: { min: -100, max: 100 },
    angle: { min: 0, max: 360 },
    lifespan: 500,
    quantity: 10,
    scale: { start: 1, end: 0 },
    on: false
  });
  emitter.explode(10, letter.x, letter.y);

  this.sound.play('collect');

  // Creazione balloon
  const balloonPadding = 10;
  const balloon = this.add.graphics();
  balloon.fillStyle(0x000000, 0.7); // sfondo nero trasparente
  balloon.lineStyle(2, 0xffffff, 1); // bordo bianco

  // Crea il testo
  const popupText = this.add.text(0, 0, msg, {
    fontSize: `${Math.round(this.scale.height / 35)}px`,
    fill: '#ffccff',
    fontStyle: 'bold',
    align: 'center',
    wordWrap: { width: 200 }
  });

  // Calcola dimensioni balloon
  const textBounds = popupText.getBounds();
  const width = textBounds.width + balloonPadding * 2;
  const height = textBounds.height + balloonPadding * 2;
  const x = letter.x - width / 2;
  const y = letter.y - height - 40; // sopra la lettera

  // Disegna nuvoletta
  balloon.fillRoundedRect(x, y, width, height, 12);
  balloon.strokeRoundedRect(x, y, width, height, 12);

  // Piccola freccetta verso la lettera
  balloon.fillTriangle(
    letter.x - 6, y + height,
    letter.x + 6, y + height,
    letter.x, y + height + 10
  );

  // Posiziona testo dentro balloon
  popupText.setPosition(letter.x, y + height / 2).setOrigin(0.5);

  // Raggruppa balloon + testo per animazione
  const container = this.add.container(0, 0, [balloon, popupText]);
  container.setAlpha(0);

  // Animazione: comparsa, salita, dissolvenza
  this.tweens.add({
    targets: container,
    alpha: 1,
    y: -20,
    duration: 600,
    ease: 'Back.Out',
    onComplete: () => {
      this.tweens.add({
        targets: container,
        alpha: 0,
        duration: 1200,
        delay: 1500,
        onComplete: () => {
          balloon.destroy();
          popupText.destroy();
          container.destroy();
        }
      });
    }
  });

  // Tutte le lettere raccolte
  if (collected === LETTER_KEYS.length) {
    const hearts = this.add.particles('heartParticle');
    hearts.createEmitter({
      x: { min: player.x - 1000, max: player.x + 1000 },
      y: player.y,
      speedY: { min: -100, max: -300 },
      scale: { start: 1.5, end: 0 },
      alpha: { start: 1, end: 0 },
      blendMode: 'ADD',
      lifespan: 1000,
      frequency: 100,
    });

    game.scene.scenes[0].time.delayedCall(3500, () => {
      // Disattiva input e movimento
      player.setVelocity(0, 0);
      player.body.enable = false;

      // Sfondo finale semi-trasparente
      const endBg = this.add.rectangle(0, 0, this.scale.width, this.scale.height, 0x000000, 0.85)
        .setOrigin(0)
        .setScrollFactor(0);

      // Testo finale
      const finalMessage = this.add.text(this.scale.width / 2, this.scale.height / 2 - 50,
        "Hai raccolto tutte le lettere:\nAUGURI amore mio ❤️", {
          fontSize: `${Math.round(this.scale.height / 18)}px`,
          fill: '#ff99cc',
          fontStyle: 'bold',
          align: 'center'
        }
      ).setOrigin(0.5).setScrollFactor(0).setAlpha(0);

      // Cuore animato sotto il messaggio
      const heart = this.add.image(this.scale.width / 2, this.scale.height / 2 + 80, 'heartParticle')
        .setScale(3).setScrollFactor(0)
        .setAlpha(0);

      // Fade-in
      this.tweens.add({
        targets: [finalMessage, heart],
        alpha: 1,
        duration: 1500,
        ease: 'Sine.easeInOut'
      });

      // Pulsazione cuore
      this.tweens.add({
        targets: heart,
        scale: { from: 3, to: 3.3 },
        duration: 600,
        yoyo: true,
        repeat: -1
      });
    });
    this.time.delayedCall(15000, () => this.scene.restart());
  }
}


function update(time, delta) {
  // movimento nuvole
  clouds.tilePositionX += 0.02;

  if (!cursors) return;

  const onGround = player.body.blocked.down; // più preciso di .touching.down
  const moving = cursors.left.isDown || cursors.right.isDown || !onGround;

  // Reset idle timer se c’è movimento
  if (moving) {
    lastMovementTime = time;
    isIdle = false;
  }

  // Movimento orizzontale
  if (cursors.left.isDown) {
    player.setVelocityX(-240);
    player.flipX = true;
  } else if (cursors.right.isDown) {
    player.setVelocityX(240);
    player.flipX = false;
  } else {
    player.setVelocityX(0);
  }

  // Salto variabile
  if (cursors.up.isDown && onGround && !isJumping) {
    player.setVelocityY(JUMP_SPEED);
    isJumping = true;
    jumpStartTime = time;
  }

  if (cursors.up.isDown && isJumping) {
    const jumpDuration = time - jumpStartTime;
    if (jumpDuration < MAX_JUMP_TIME) {
      player.setVelocityY(JUMP_HOLD_SPEED);
    }
  }

  if (cursors.up.isUp || player.body.velocity.y > 0) {
    isJumping = false;
  }

  // Animazioni
  if (onGround) {
    if (player.body.velocity.x !== 0) {
      // Camminata
      player.anims.play('walk', true);

      // Reset stato idle
      isIdle = false;
      isInIdleSpecial2 = false;
      lastMovementTime = time;
      lastIdleSpecialTime = 0;
      lastBlinkTime = 0;
    } else {
      // È fermo
      const idleDuration = time - lastMovementTime;

      if (idleDuration > IDLE_SPECIAL_2) {
        // IDLE-SPECIAL-2 attivo
        if (!isInIdleSpecial2) {
          player.anims.play('idle-special-2', true);
          isInIdleSpecial2 = true;
          lastBlinkTime = time;
        } else {
          // Ogni tot secondi, esegue blink
          if (time - lastBlinkTime > BLINK_INTERVAL) {
            player.anims.play('idle-special-2-blink', true);
            lastBlinkTime = time;
          }
        }
      } else if (idleDuration > IDLE_SPECIAL) {
        // Ogni IDLE_SPECIAL ms, riproduci idle-special
        if (time - lastIdleSpecialPlayTime > IDLE_SPECIAL) {
          player.anims.play('idle-special', true);
          lastIdleSpecialPlayTime = time;
          isIdle = true;
          isInIdleSpecial2 = false;
        }
      } else {
        // Idle normale
        player.anims.play('idle', true);
        isIdle = false;
        isInIdleSpecial2 = false;
        lastIdleSpecialPlayTime = 0;
      }
    }
  } else {
    // In salto
    player.anims.play('jump', true);

    // Reset stato idle
    isIdle = false;
    isInIdleSpecial2 = false;
    lastIdleSpecialTime = 0;
    lastBlinkTime = 0;
  }

  // Se idle-special finisce → torna a idle
  player.off('animationcomplete-idle-special'); // previene doppioni
  player.on('animationcomplete-idle-special', () => {
    if (isIdle) {
      player.anims.play('idle', true);
    }
  });

  // Snap a pixel interi
  player.x = Math.round(player.x);
  player.y = Math.round(player.y);

  // Morte cadendo fuori dal mondo
  if (player.y > this.physics.world.bounds.height + 100) {
    playerDied.call(this);
  }

  // Movimento piattaforme mobili
  if (movingPlatform.leaders) {
    movingPlatform.leaders.forEach(leader => {
      // Movimento orizzontale
      if (leader.startX !== leader.targetX) {
        leader.x += leader.speed * leader.directionX * delta / 1000;
        if ((leader.directionX === 1 && leader.x >= leader.targetX) ||
            (leader.directionX === -1 && leader.x <= leader.startX)) {
          leader.directionX *= -1;
        }
      }

      // Movimento verticale
      if (leader.startY !== leader.targetY) {
        leader.y += leader.speed * leader.directionY * delta / 1000;
        if (leader.directionY === 1 && leader.y >= leader.targetY) {
          leader.y = leader.targetY;
          leader.directionY = -1;
        } else if (leader.directionY === -1 && leader.y <= leader.startY) {
          leader.y = leader.startY;
          leader.directionY = 1;
        }
      }

      // Aggiorna i blocchi
      leader.blocks.forEach((block, i) => {
        block.x = leader.x + i * blockSize;
        block.y = leader.y;
        block.refreshBody();
        block.prevX = block.x;
        block.prevY = block.y;
      });
      leader.refreshBody();
    });
  }

  // Controlla se il player è su una piattaforma mobile
  currentMovingPlatform = null;
  if (movingPlatform.leaders) {
    movingPlatform.leaders.forEach(leader => {
      leader.blocks.forEach(block => {
        const playerBottom = player.body.y + player.body.height;
        const blockTop = block.body.y;
        const blockLeft = block.body.x;
        const blockRight = block.body.x + block.body.width;

        if (
          Math.abs(playerBottom - blockTop) <= 2 &&
          player.body.x + player.body.width > blockLeft &&
          player.body.x < blockRight &&
          player.body.velocity.y >= 0 &&
          onGround
        ) {
          currentMovingPlatform = block;
        }
      });
    });
  }

  // Muovi il player con la piattaforma mobile
  if (currentMovingPlatform) {
    const dx = currentMovingPlatform.x - (currentMovingPlatform.prevX || currentMovingPlatform.x);
    if (onGround) {
      player.x += dx;
    }
  }
}

function resetState() {
  collected = 0;

  // salto
  isJumping = false;
  jumpStartTime = 0;

  // idle
  idleTimer = 0;
  isIdle = false;
  lastMovementTime = 0;
  lastIdleSpecialTime = 0;

  // piattaforme mobili
  currentMovingPlatform = null;

  // morte player
  if (this) this.playerIsDead = false;
}

//funzione per quando il player muore
function playerDied() {
  // Evitiamo di richiamarlo più volte
  if (this.playerIsDead) return;
  this.playerIsDead = true;

  if (backgroundMusic && backgroundMusic.isPlaying) {
    backgroundMusic.stop();
  }

  player.setTint(0xff0000); // rosso per indicare KO
  player.setVelocity(0, 0);
  player.anims.stop();

  text.setText("Oh no, sei caduta! 💔\nMa ti rialzerai sempre, amore mio ❤️");
  text.setAlpha(1);

  // Fade lento della camera
  this.cameras.main.fadeOut(2500, 0, 0, 0);

  // Dopo il fade, riavvia il livello
  this.time.delayedCall(2500, () => {
    this.scene.restart();
  });
}

function spawnBirdFlock() { 
  const birdColors = ['red', 'blue', 'green'];
  const numBirds = Phaser.Math.Between(3, 12);
  const flyFromLeft = Math.random() < 0.5;

  const camera = this.cameras.main;

  const camX = camera.scrollX;
  const camY = camera.scrollY;
  const screenWidth = this.scale.width;

  const startX = flyFromLeft ? camX - 100 : camX + screenWidth + 100;
  const endX = flyFromLeft ? camX + screenWidth + 2000 : camX - 2000;

  for (let i = 0; i < numBirds; i++) {
    const color = Phaser.Utils.Array.GetRandom(birdColors);
    const y = Phaser.Math.Between(20, this.scale.height / 2);
    const delay = i * 150 + Phaser.Math.Between(0, 200);
    const speed = Phaser.Math.Between(100, 200);

    const bird = this.add.sprite(startX, y, `bird_${color}`)
      .setScale(getRandomBiased(0.5, 1.5))
      .play(`fly-${color}`);

    if (flyFromLeft) {
      bird.flipX = true;
    }

    const moveDuration = (Math.abs(endX - startX) / speed) * 1000;

    this.tweens.add({
      targets: bird,
      x: endX,
      duration: moveDuration,
      delay: delay,
    });

    // Fa partire lo scale tween 1500ms prima della fine del primo tween
    this.time.delayedCall(delay + moveDuration - 1500, () => {
      this.tweens.add({
        targets: bird,
        scale: 0,
        duration: 1500,
        onComplete: () => {
          bird.destroy();
        }
      });
    });
  }
}

function getRandomBiased(min, max, biasStrength = 2) {
  const t = Math.random(); // uniforme tra 0 e 1
  const skewed = Math.pow(1 - t, biasStrength); // più alto => più bias verso min
  return min + (max - min) * skewed;
}
