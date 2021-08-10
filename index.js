const windowHeight = 600;
const windowWidth = 800;
const originY = 50;

var config = {
    type: Phaser.AUTO,
    width: windowWidth,
    height: windowHeight,
    backgroundColor: '#010101',
    physics: {
        default: 'arcade',
        arcade: {
            gravity: 0
        }
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};

// Global variables of the game
var fork1;
var forkSprite1;
var score1;
var fork2;
var forkSprite2;
var score2;
var targetGroup;
var finishMessage;
var targetCaptured = new Map();
var game = new Phaser.Game(config);

function preload() {
    this.load.image('fork', 'assets/fork2.png');
    this.load.image('red-fork', 'assets/red-fork.png');
    this.load.image('cube', 'assets/gold-miner-cube.png')
}

function create() {

    // Initialize the forks
    forkSprite1 = this.physics.add.image(200, originY, 'fork');
    fork1 = new ForkModel(forkSprite1);
    forkSprite2 = this.physics.add.image(600, originY, 'red-fork');
    fork2 = new ForkModel(forkSprite2);

    this.input.keyboard.on('keydown-Q', function (event) {
        triggerShooting(fork1);
    });
    this.input.keyboard.on('keydown-P', function (event) {
        triggerShooting(fork2);
    });

    // Initialize targets
    targetGroup = this.physics.add.staticGroup({
        key: 'cube',
        frameQuantity: 11,
        immovable: true
    });

    var children = targetGroup.getChildren();
    for (var i = 0; i < children.length; i++)
    {
        var x = Phaser.Math.Between(100, 700);
        var y = Phaser.Math.Between(250, 550);
        children[i].setPosition(x, y);
    }
    targetGroup.refresh();

    // Configure collision detection between forks and targets
    this.physics.add.overlap(forkSprite1, targetGroup, function (forkSprite, targetSprite) {
        if (fork1.forkState == forkStates.BACKWARD) {
            return;
        }
        var prevFork = targetCaptured.get(targetSprite);
        if (prevFork != null) {
            if (prevFork == fork1) {
                return;
            } else {
                prevFork.setTarget(null);
            }
        }
        targetCaptured.set(targetSprite, fork1);
        fork1.setTarget(targetSprite);
        fork1.setBackward();
    });

    this.physics.add.overlap(forkSprite2, targetGroup, function (forkSprite, targetSprite) {
        if (fork2.forkState == forkStates.BACKWARD) {
            return;
        }
        var prevFork = targetCaptured.get(targetSprite);
        if (prevFork != null) {
            if (prevFork == fork2) {
                return
            } else {
                prevFork.setTarget(null);
            }
        }
        targetCaptured.set(targetSprite, fork2);
        fork2.setTarget(targetSprite);
        fork2.setBackward();
    });

    // Initialize scores of each fork and finish message
    score1 = this.add.text(10, 10, '0', { font: '32px Courier', fill: '#2d6b2d' });
    score2 = this.add.text(windowWidth - 60, 10, '0', { font: '32px Courier', fill: '#2d6b2d' });
    finishMessage = this.add.text(100, 300, '', { font: '32px Courier', fill: '#ffffff' });
}

function update() {
    console.log(this.physics.world.fps);
    fork1.update();
    fork2.update();
    // Update scores
    score1.setText(fork1.score);
    score2.setText(fork2.score);

    // Check for game end
    if (targetGroup.countActive() == 0) {
        var message;
        if (fork1.score == fork2.score) {
            message = "You guys are equally strong."
        } else {
            const winner = fork1.score > fork2.score ? "Player Green" : "Player Red";
            message = "Congratulation " + winner + ", you win!!!";
        }
        finishMessage.setText(message);
    }
}

const forkStates = {
    IDLE: "idle",
    FOREWARD: "foreward",
    BACKWARD: "backward"
}

function triggerShooting(fork) {
    if (fork.forkState == forkStates.IDLE) {
        fork.forkState = forkStates.FOREWARD;
    }
}

class ForkModel {

    constructor(forkSprite) {
        this.forkSprite = forkSprite;
        this.rotateClockWise = true;
        this.forkState = forkStates.IDLE;
        this.targetSprite = null;
        this.score = 0;
        this.lastUpdateTime = Date.now();
    }

    setBackward() {
        this.forkState = forkStates.BACKWARD;
    }

    setTarget(targetSprite) {
        this.targetSprite = targetSprite;
    }

    update() {
        switch (this.forkState) {
            case forkStates.IDLE:
                this.rotate(); 
                break;
            case forkStates.FOREWARD:
                this.foreward(); 
                break;
            case forkStates.BACKWARD:
                this.backward(); 
                break;
        }
    }

    foreward() {
        const timeDiff = this.getTimeDiffAndUpdate();
        const vel = 300
        this.moveForkByDistance(vel * timeDiff);
        this.checkForewardHitWindowBound();
    }

    backward() {
        const timeDiff = this.getTimeDiffAndUpdate();
        const vel = -150;
        this.moveForkByDistance(vel * timeDiff);
        this.checkBackwardReturnToOrigin();
        if (this.targetSprite != null) {
            const botCenter = this.forkSprite.getBottomCenter();
            this.targetSprite.setPosition(botCenter.x, botCenter.y);
            targetGroup.refresh();
        }
    }

    checkForewardHitWindowBound() {
        const x = this.forkSprite.x;
        const y = this.forkSprite.y;
        if (x < 0 || x > windowWidth || 
            y < 0 || y > windowHeight) {
            this.forkState = forkStates.BACKWARD;
        }
    }

    checkBackwardReturnToOrigin() {
        const y = this.forkSprite.y;
        if (y < originY) {
            if (this.targetSprite != null) {
                this.score += 1;
                this.targetSprite.destroy();
                this.targetSprite = null; // reset target to null after finish
            }
            this.forkState = forkStates.IDLE;
        }
    }

    rotate() {
        const timeDiff = this.getTimeDiffAndUpdate();
        // Update rotation of the fork based on angular velocity and time diff.
        if (this.rotateClockWise) {
            this.forkSprite.rotation += 2.0 * timeDiff;
        } else {
            this.forkSprite.rotation -= 2.0 * timeDiff;
        } 
        // Update direction of the sprite
        this.updateRotateDirection();
    }

    updateRotateDirection() {
        if (this.forkSprite.rotation > 1.3) {
            this.rotateClockWise = false;
        }
        if (this.forkSprite.rotation < -1.3) {
            this.rotateClockWise = true;
        }
    }

    // Move the fork by given distance in its current direction.
    moveForkByDistance(distance) {
        const theta = this.forkSprite.rotation;
        const dx = -Math.sin(theta) * distance;
        const dy = Math.cos(theta) * distance;
        this.forkSprite.x += dx;
        this.forkSprite.y += dy;
    }

    // Get the time elapsed since last update in seconds.
    // Update the tracked last update timestamp.
    getTimeDiffAndUpdate() {
        const timeDiff = Date.now() - this.lastUpdateTime;
        this.lastUpdateTime = Date.now();
        return timeDiff / 1000;
    }

}