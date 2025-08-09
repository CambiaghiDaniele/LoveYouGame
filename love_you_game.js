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
let cursors;
let letters;
let collected = 0;
let text;
let fadeTween;
let isJumping = false;
let jumpStartTime = 0;
const MAX_JUMP_TIME = 500; // in ms, tempo massimo in cui si può "caricare" il salto
const JUMP_SPEED = -250;   // velocità iniziale del salto
const JUMP_HOLD_SPEED = -250; // velocità continua durante il "caricamento" del salto

//per idle animation
let idleTimer = 0;
let isIdle = false;
let lastMovementTime = 0;
let lastIdleSpecialTime = 0;
const IDLE_DELAY = 5000; // 5 secondi


const LETTER_KEYS = ['A', 'U', 'G', 'U2', 'R', 'I'];

function preload() {
  this.load.image('sky', 'assets/background/background.png');
  this.load.once('complete', () => {
    const skyTexture = this.textures.get('sky');
    skyTexture.setFilter(Phaser.Textures.FilterMode.NEAREST);
  });
  this.load.image('clouds', 'assets/background/clouds.png');
  for (let i = 1; i <= 4; i++) {
    this.load.image(`block${i}`, `assets/blocks/block${i}.png`);
  }
  this.load.spritesheet('player', 'assets/character/MyLove.png', {
    frameWidth: 20,   // o la larghezza del frame
    frameHeight: 20   // o l’altezza del frame
  });
  // Spritesheet lettere (A, U, G, U2, R, I)
  this.load.spritesheet('A', 'assets/letters/A.png', { frameWidth: 16, frameHeight: 16 });
  this.load.spritesheet('U', 'assets/letters/U.png', { frameWidth: 16, frameHeight: 16 });
  this.load.spritesheet('G', 'assets/letters/G.png', { frameWidth: 16, frameHeight: 16 });
  this.load.spritesheet('U2', 'assets/letters/U.png', { frameWidth: 16, frameHeight: 16 });
  this.load.spritesheet('R', 'assets/letters/R.png', { frameWidth: 16, frameHeight: 16 });
  this.load.spritesheet('I', 'assets/letters/I.png', { frameWidth: 16, frameHeight: 16 });

  this.load.image('particle', 'assets/misc/particle.png')
  this.load.image('heartParticle', 'assets/misc/heartParticle.png')

  //audio
  this.load.audio('collect', 'assets/audio/collect.mp3');
}

function create() {

  // World bounds
  const WORLD_WIDTH = this.scale.width * 10;
  const WORLD_HEIGHT = this.scale.height;

  this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
  this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

  // Sfondo

  // Calcola il fattore di scala per portare l'immagine da 128px a 600px
  const backgroundHeight = 128;
  const backgroundScale = this.scale.height / backgroundHeight;

  // Calcola la larghezza dell'immagine scalata
  const scaledBgWidth = 512 * backgroundScale;

  const tilesNeeded = Math.ceil(WORLD_WIDTH / scaledBgWidth);

  //filtro anti sfocatura
  this.textures.get('sky').setFilter(Phaser.Textures.FilterMode.NEAREST);

  // Crea un tileSprite abbastanza largo da coprire tutto il mondo
  sky = this.add.tileSprite(0, 0, tilesNeeded * scaledBgWidth, this.scale.height, 'sky')
    .setOrigin(0, 0)
    .setScrollFactor(0.25) // parallasse, opzionale
    .setScale(backgroundScale); // SCALA per portare da 128px a 600px

  clouds = this.add.tileSprite(0, 0, tilesNeeded * scaledBgWidth, this.scale.height, 'clouds')
    .setOrigin(0 ,0)
    .setScrollFactor(0.25)
    .setScale(backgroundScale);

  // Piattaforme
  const platforms = this.physics.add.staticGroup();

  const blockWidth = 16;
  const desiredHeight = 32; // altezza visiva delle piattaforme sullo schermo
  const scaleValor = desiredHeight / blockWidth;
  const totalBlocks = Math.ceil(WORLD_WIDTH / (blockWidth * scaleValor));

  for (let i = 0; i < totalBlocks; i++) {
    const x = i * blockWidth * scaleValor + blockWidth * scaleValor / 2;
    const y = 580;

    const blockKey = `block${Phaser.Math.Between(1, 4)}`;
    const block = platforms.create(x, y, blockKey);

    block.setScale(scaleValor);
    block.refreshBody();
  }

  // Player
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
    key: 'jump',
    frames: [ { key: 'player', frame: 0 } ], // o il frame che preferisci
    frameRate: 1
  });

  this.textures.get('player').setFilter(Phaser.Textures.FilterMode.NEAREST);
  player = this.physics.add.sprite(100, 450, 'player');
  const scaleFactor = this.scale.height / 300; // o una base "logica" tua
  player.setScale(scaleFactor);
  player.setCollideWorldBounds(true);
  this.physics.add.collider(player, platforms);
  cursors = this.input.keyboard.createCursorKeys();

  // Camera
  this.cameras.main.startFollow(player, true, 1, 1);
  this.cameras.main.roundPixels = true;
  this.cameras.main.setFollowOffset(-200, 0);

  // Lettere

  LETTER_KEYS.forEach(letterKey => {
    this.textures.get(letterKey).setFilter(Phaser.Textures.FilterMode.NEAREST);

    this.anims.create({
      key: `anim-${letterKey}`,
      frames: this.anims.generateFrameNumbers(letterKey, { start: 0, end: 10 }), // cambia end se hai più frame
      frameRate: 10,
      yoyo: true,
      repeat: -1
    });
  });

  letters = this.physics.add.group();

  for (let i = 0; i < LETTER_KEYS.length; i++) {
    const key = LETTER_KEYS[i];
    const x = 1000 + i * 1000;
    const y = Phaser.Math.Between(100, 300);

    const letter = this.physics.add.sprite(x, y, key);
    letter.letterKey = key;
    letter.anims.play(`anim-${key}`);

    const desiredHeight = this.scale.height * 0.1;
    const scaleFactor = desiredHeight / letter.height;
    letter.setScale(scaleFactor);

    letters.add(letter);
  }

  this.physics.add.collider(letters, platforms);
  this.physics.add.overlap(player, letters, collectLetter, null, this);

  // Messaggio
  text = this.add.text(400, 500, '', {
    fontSize: `${Math.round(this.scale.height / 25)}px`,
    fill: '#ffffff',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    padding: { x: 20, y: 10 },
  }).setScrollFactor(0);
  text.setOrigin(0.5);
  text.setAlpha(0);
}

function collectLetter(player, letter) {
  letter.disableBody(true, true);
  const key = letter.letterKey;
  const msg = messages[key] || 'Lettera misteriosa 💌';
  collected++;

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

  text.setText(msg);
  text.setAlpha(1);
  if (fadeTween) fadeTween.stop();
  fadeTween = game.scene.scenes[0].tweens.add({
    targets: text,
    alpha: 0,
    duration: 3000,
    ease: 'Power1'
  });

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
      text.setText("Hai raccolto tutte le lettere: AUGURI amore mio! 🎉");
      text.setAlpha(1);
      
      // Fade della camera
      this.cameras.main.fadeOut(4000, 255, 255, 255);
      
      // Restart o nuova scena dopo un po’
      this.time.delayedCall(5000, () => {
        this.scene.restart();
      });
    });
  }
}

function update(time, delta) {
  clouds.tilePositionX += 0.02;

  if (!cursors) return;

  const onGround = player.body.touching.down;
  const moving = cursors.left.isDown || cursors.right.isDown || !onGround;

  // Se il player si muove o salta, resettiamo il timer
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

  // Gestione animazioni
  if (onGround) {
    if (player.body.velocity.x !== 0) {
      player.anims.play('walk', true);
    } else {
      // Idle "speciale" se il player è fermo da più di 5 secondi
      if (time - lastMovementTime > IDLE_DELAY) {
        isIdle = true;
        if (time - lastIdleSpecialTime > IDLE_DELAY) {
          lastIdleSpecialTime = time;
          player.anims.play('idle-special', true);
        }
      } else {
        player.anims.play('idle', true);
      }
    }
  }

  if (!onGround && player.body.velocity.y > 0) {
    player.anims.play('jump', true);
  }

  player.x = Math.round(player.x);
  player.y = Math.round(player.y);
}
