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
let lastMovementTime = 0;
let lastIdleSpecialTime = 0;
const IDLE_DELAY = 5000; // 5 secondi


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

  //audio
  this.load.audio('bgMusic', 'assets/audio/music.mp3');
  this.load.audio('collect', 'assets/audio/collect.mp3');
}

function create() {
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
  const WORLD_WIDTH = this.scale.width * 10;
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
          // Scegli una texture random tra ground1, ground2, ground3, ground4
          textureKey = `ground${Math.floor(Math.random() * 4) + 1}`;
        } else {
          // Scegli una texture random tra block1, block2, block3, block4
          textureKey = `block${Math.floor(Math.random() * 4) + 1}`;
        }
        const block = staticPlatform.create(p.x + i * blockSize, p.y, textureKey).setOrigin(0, 0);
        block.setScale(2);
        block.refreshBody();
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

  //movimento nuvole
  clouds.tilePositionX += 0.02;

  //movimento player
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

  //morte player
  if (player.y > this.physics.world.bounds.height + 100) {
    playerDied.call(this);
  }

  // movimento piattaforme mobili avanti e indietro
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

        // Se va oltre uno dei due estremi, inverti la direzione e clamp
        if (leader.directionY === 1 && leader.y >= leader.targetY) {
          leader.y = leader.targetY;
          leader.directionY = -1;
        } else if (leader.directionY === -1 && leader.y <= leader.startY) {
          leader.y = leader.startY;
          leader.directionY = 1;
        }
      }

      // Aggiorna la posizione degli altri blocchi rispetto al leader
      for (let i = 0; i < leader.blocks.length; i++) {
        const block = leader.blocks[i];
        block.x = leader.x + i * blockSize;
        block.y = leader.y;
        block.refreshBody();
        block.prevX = block.x;
        block.prevY = block.y;
      }
      leader.refreshBody(); // <--- aggiorna anche il leader
    });
  }

  currentMovingPlatform = null;
  if (movingPlatform.leaders) {
    movingPlatform.leaders.forEach(leader => {
      leader.blocks.forEach(block => {
        // Verifica se il player è sopra il blocco usando i bounding box Arcade
        const playerBottom = player.body.y + player.body.height;
        const blockTop = block.body.y;
        const blockLeft = block.body.x;
        const blockRight = block.body.x + block.body.width;

        // Il player è sopra la piattaforma e non sta saltando
        if (
          Math.abs(playerBottom - blockTop) <= 2 && // tolleranza di 2px
          player.body.x + player.body.width > blockLeft &&
          player.body.x < blockRight &&
          player.body.velocity.y >= 0 &&
          player.body.blocked.down // il player è appoggiato
        ) {
          currentMovingPlatform = block;
        }
      });
    });
  }

  if (currentMovingPlatform) {
    const dx = currentMovingPlatform.x - (currentMovingPlatform.prevX || currentMovingPlatform.x);
    // Muovi il player solo se è appoggiato
    if (player.body.blocked.down) {
      player.x += dx;
    }
  }
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
