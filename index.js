// Width and height of the game window
const windowHeight = 768;
const windowWidth = 1024;

// Y value of origins of forks.
const originY = 64;

// This constant map defines the possible states of a fork
const forkStates = {
    IDLE: "idle",
    FOREWARD: "foreward",
    BACKWARD: "backward"
};

// A model class to store the properties of target
class TargetModel {
    constructor(name, value, weight) {
        this.name = name;
        this.value = value;
        this.weight = weight;
    }
}

// Constant values for target names
const CUBE = "cube";
const MUSHROOM = "mushroom";
const QUESTION_HIGH = "question_high";
const QUESTION_LOW = "question_low";
// This constant map defines the name of different targets
const targetConfigs = {
    NORMAL: new TargetModel(CUBE, 1, 2),
    HIGH_VALUE: new TargetModel(MUSHROOM, 2, 1),
    RANDOM_HIGH_VALUE: new TargetModel(QUESTION_HIGH, 3, 0.3),
    RANDOM_LOW_VALUE: new TargetModel(QUESTION_LOW, -3, 0.3)
};
const targetConfigMap = new Map();
targetConfigMap.set(CUBE, targetConfigs.NORMAL);
targetConfigMap.set(MUSHROOM, targetConfigs.HIGH_VALUE);
targetConfigMap.set(QUESTION_HIGH, targetConfigs.RANDOM_HIGH_VALUE);
targetConfigMap.set(QUESTION_LOW, targetConfigs.RANDOM_LOW_VALUE);

// An array to store the target names which are used to check to game end
const targetsToComplete = [CUBE, MUSHROOM]

// Phaser game configuration
var config = {
    type: Phaser.AUTO,
    width: windowWidth,
    height: windowHeight,
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
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
var targetGroups = new Array();
var finishMessage;
var targetCaptured = new Map();
var game = new Phaser.Game(config);

function preload() {
    this.load.image('fork', 'assets/fork2.png');
    this.load.image('red-fork', 'assets/red-fork.png');
    this.load.image(targetConfigs.NORMAL.name, 'assets/brick.jpeg');
    this.load.image(targetConfigs.HIGH_VALUE.name, 'assets/gold-miner-mushroom.png');
    this.load.image(targetConfigs.RANDOM_HIGH_VALUE.name, 'assets/question_sm.png');
    this.load.image(targetConfigs.RANDOM_LOW_VALUE.name, 'assets/question_sm.png');
}

// A helper function to create target group by configs
function initializeTargetByConfig(context, targetConfig, quantity, yMin, yMax, xMin, xMax) {
    var targetGroup = context.physics.add.staticGroup({
        key: targetConfig.name,
        frameQuantity: quantity,
        immovable: true
    });
    targetGroup.name = targetConfig.name;
    // Randomly initialize the position of each target in the group.
    var children = targetGroup.getChildren();
    for (var i = 0; i < children.length; i++)
    {
        var x = Phaser.Math.Between(xMin, xMax);
        var y = Phaser.Math.Between(yMin, yMax);
        children[i].setPosition(x, y);
        children[i].type = targetConfig.name;
    }
    targetGroup.refresh();
    return targetGroup;
}

function create() {

    // Initialize the forks
    forkSprite1 = this.physics.add.image(384, originY, 'fork');
    fork1 = new ForkModel(forkSprite1);
    forkSprite2 = this.physics.add.image(640, originY, 'red-fork');
    fork2 = new ForkModel(forkSprite2);

    // Local function used to trigger fork shooting when keyboard is pressed down.
    function triggerShooting(fork) {
        if (fork.forkState == forkStates.IDLE) {
            fork.forkState = forkStates.FOREWARD;
        }
    }

    this.input.keyboard.on('keydown-Q', function (event) {
        triggerShooting(fork1);
    });
    this.input.keyboard.on('keydown-P', function (event) {
        triggerShooting(fork2);
    });

    // Initialize targets
    // TODO: make the number of targets configurable
    normalTargetGroup = initializeTargetByConfig(this, targetConfigs.NORMAL, 7, 200, 350, 256, 768);
    highValueTargetGroup = initializeTargetByConfig(this, targetConfigs.HIGH_VALUE, 6, 400, 650, 256, 768);
    randomHighTargetGroup = initializeTargetByConfig(this, targetConfigs.RANDOM_HIGH_VALUE, 1, 700, 701, 128, 896);
    randomLowTargetGroup = initializeTargetByConfig(this, targetConfigs.RANDOM_LOW_VALUE, 1, 700, 701, 128, 896);
    targetGroups.push(normalTargetGroup);
    targetGroups.push(highValueTargetGroup);
    targetGroups.push(randomHighTargetGroup);
    targetGroups.push(randomLowTargetGroup);

    // Define a function to handle target ownership in the overlap callback
    // A map is used to track target ownership, when a overlap event is triggered,
    // It's possible that the target will change ownership.
    function updateForkIfOverlap(currentFork, targetSprite) {
        var prevFork = targetCaptured.get(targetSprite);
        if (prevFork != null) {
            if (prevFork == currentFork) {
                return;
            } else {
                prevFork.setTarget(null);
            }
        }
        targetCaptured.set(targetSprite, currentFork);
        currentFork.setTarget(targetSprite);
        currentFork.setBackward();
    }

    // Configure collision detection between forks and targets
    this.physics.add.overlap(forkSprite1, targetGroups, function (forkSprite, targetSprite) {
        if (fork1.forkState == forkStates.BACKWARD) {
            return;
        }
        updateForkIfOverlap(fork1, targetSprite);
    });
    this.physics.add.overlap(forkSprite2, targetGroups, function (forkSprite, targetSprite) {
        if (fork2.forkState == forkStates.BACKWARD) {
            return;
        }
        updateForkIfOverlap(fork2, targetSprite);
    });

    // Initialize scores of each fork and finish message
    score1 = this.add.text(10, 10, '0', { font: '32px Courier', fill: '#2d6b2d' });
    score2 = this.add.text(windowWidth - 60, 10, '0', { font: '32px Courier', fill: '#6b2d2d' });
    finishMessage = this.add.text(100, 300, '', { font: '32px Courier', fill: '#ffffff' });
}

// A helper function to check whether the game is ended 
// by checking if there's any remaining targets.
function isGameEnded() {
    var remainPoints = 0;
    var group;
    for (var i = 0; i < targetGroups.length; i++) {
        group = targetGroups[i];
        if (targetsToComplete.includes(group.name)) {
            // if (targetGroups[i].countActive() != 0) {
            //     return false;
            // }
            remainPoints += group.countActive() * targetConfigMap.get(group.name).value
        }
    }
    pointDifference = Math.abs(fork1.score - fork2.score);
    if (pointDifference > remainPoints) {
        return true;
    } else {
        return false;
    }
}

function update() {
    // Update states of forks
    fork1.update();
    fork2.update();

    // Update scores
    score1.setText(fork1.score);
    score2.setText(fork2.score);

    // Check for game end
    if (isGameEnded()) {
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
        const vel = this.computeBackwardVelocity();
        this.moveForkByDistance(vel * timeDiff);
        this.checkBackwardReturnToOrigin();
        if (this.targetSprite != null) {
            const botCenter = this.forkSprite.getBottomCenter();
            this.targetSprite.setPosition(botCenter.x, botCenter.y);
            this.refreshTargetGroups();
        }
    }

    // Determine velocity of backward motion based on a static speed 
    // and optionally weight of the target.
    computeBackwardVelocity() {
        var velocity = -150;
        if (this.targetSprite != null) {
            const targetConfig = targetConfigMap.get(this.targetSprite.type);
            velocity = velocity / targetConfig.weight;
        }
        return velocity;
    }

    // A helper function to refresh position of targets
    // TODO: optimize this method to only update single target sprite.
    refreshTargetGroups() {
        for (var i = 0; i < targetGroups.length; i++) {
            targetGroups[i].refresh();
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
                // Increase score based on target config
                const targetConfig = targetConfigMap.get(this.targetSprite.type);
                this.score += targetConfig.value; 
                // reset target to null after finish
                this.targetSprite.destroy();
                this.targetSprite = null; 
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
