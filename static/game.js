// Game constants
const SCREEN_WIDTH = 1160;
const SCREEN_HEIGHT = 600;
const FIELD_WIDTH = 1000;
const FIELD_HEIGHT = 500;
const END_ZONE_WIDTH = 60;
const YARD_LENGTH = 10;
const PLAYER_SIZE = 14;
const BALL_SIZE = 5;
const GAME_SPEED = 60; // FPS

// Colors
const GREEN = "rgb(30, 120, 30)";
const WHITE = "rgb(255, 255, 255)";
const BLACK = "rgb(0, 0, 0)";
const YELLOW = "rgb(255, 255, 0)";
const RED = "rgb(255, 0, 0)";
const BLUE = "rgb(0, 0, 255)";
const BROWN = "rgb(139, 69, 19)";
const END_ZONE_RED = "rgb(180, 0, 0)";

// Game states
const GameState = {
    TITLE_SCREEN: 0,
    PLAY_SELECTION: 1,
    PLAYING: 2,
    PASS_SELECTION: 3,
    BALL_IN_AIR: 4,
    PLAY_OVER: 5
};

// Play types
const PlayType = {
    RUN: 1,
    SHORT_PASS: 2,
    LONG_PASS: 3,
    OPTION: 4
};

// Initialize canvas
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// Handle mobile controls
const isMobile = window.innerWidth <= 768;
const mobileControls = {
    up: false,
    down: false,
    left: false,
    right: false
};

if (isMobile) {
    document.getElementById("upBtn").addEventListener("touchstart", () => mobileControls.up = true);
    document.getElementById("upBtn").addEventListener("touchend", () => mobileControls.up = false);
    document.getElementById("downBtn").addEventListener("touchstart", () => mobileControls.down = true);
    document.getElementById("downBtn").addEventListener("touchend", () => mobileControls.down = false);
    document.getElementById("leftBtn").addEventListener("touchstart", () => mobileControls.left = true);
    document.getElementById("leftBtn").addEventListener("touchend", () => mobileControls.left = false);
    document.getElementById("rightBtn").addEventListener("touchstart", () => mobileControls.right = true);
    document.getElementById("rightBtn").addEventListener("touchend", () => mobileControls.right = false);
    
    document.getElementById("num1Btn").addEventListener("click", () => handleNumberKey(1));
    document.getElementById("num2Btn").addEventListener("click", () => handleNumberKey(2));
    document.getElementById("num3Btn").addEventListener("click", () => handleNumberKey(3));
    document.getElementById("num4Btn").addEventListener("click", () => handleNumberKey(4));
    document.getElementById("spaceBtn").addEventListener("click", () => handleSpaceKey());
    document.getElementById("escBtn").addEventListener("click", () => handleEscKey());
}

// Mouse click handling for desktop
canvas.addEventListener("click", (event) => {
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    // Handle clicks based on game state
    if (game.state === GameState.TITLE_SCREEN) {
        game.state = GameState.PLAY_SELECTION;
    } else if (game.state === GameState.PLAY_OVER) {
        game.state = GameState.PLAY_SELECTION;
    }
});

// Keyboard handling
const keys = {};
window.addEventListener("keydown", (e) => {
    keys[e.key] = true;
    
    // Handle specific key presses
    if (e.key === " ") {
        handleSpaceKey();
    } else if (e.key === "Escape") {
        handleEscKey();
    } else if (e.key === "1" || e.key === "2" || e.key === "3" || e.key === "4") {
        handleNumberKey(parseInt(e.key));
    }
});

window.addEventListener("keyup", (e) => {
    keys[e.key] = false;
});

function handleSpaceKey() {
    if (game.state === GameState.TITLE_SCREEN) {
        game.state = GameState.PLAY_SELECTION;
    } else if (game.state === GameState.PASS_SELECTION) {
        if (game.selectedReceiver) {
            // Throw the ball
            game.ball.throw(game.selectedReceiver.x, game.selectedReceiver.y);
            game.ball.carrier = null;
            game.state = GameState.BALL_IN_AIR;
        }
    } else if (game.state === GameState.PLAY_OVER) {
        game.state = GameState.PLAY_SELECTION;
    }
}

function handleEscKey() {
    if (game.state === GameState.PASS_SELECTION) {
        // Cancel pass
        if (game.selectedReceiver) {
            game.selectedReceiver.selected = false;
            game.selectedReceiver = null;
        }
        game.state = GameState.PLAYING;
    }
}

function handleNumberKey(num) {
    if (game.state === GameState.PLAY_SELECTION) {
        if (num >= 1 && num <= 4) {
            game.playType = num;
            game.resetPlay();
        }
    } else if (game.state === GameState.PLAYING) {
        if (num >= 1 && num <= 3) {
            for (const receiver of game.receivers) {
                if (receiver.number === num) {
                    game.selectedReceiver = receiver;
                    receiver.selected = true;
                    game.state = GameState.PASS_SELECTION;
                    break;
                }
            }
        }
    }
}

class Player {
    constructor(x, y, color, isQb = false, isReceiver = false, isDefender = false, route = null) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.speed = 2;
        this.isQb = isQb;
        this.isReceiver = isReceiver;
        this.isDefender = isDefender;
        this.hasBall = isQb;
        this.route = route;
        this.routeStep = 0;
        this.width = PLAYER_SIZE;
        this.height = PLAYER_SIZE;
        this.targetX = x;
        this.targetY = y;
        this.number = 0;
        this.selected = false;
    }

    draw() {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x - this.width/2, this.y - this.height/2, this.width, this.height);

        // Draw player number if it's a receiver
        if (this.isReceiver) {
            ctx.font = "12px Arial";
            ctx.fillStyle = BLACK;
            ctx.fillText(this.number, this.x - 3, this.y + 4);
        }

        // Highlight selected receiver
        if (this.selected) {
            ctx.strokeStyle = YELLOW;
            ctx.strokeRect(this.x - this.width/2, this.y - this.height/2, this.width, this.height);
        }
    }

    move(dx, dy) {
        this.x += dx;
        this.y += dy;
    }

    followRoute() {
        if (this.route && this.routeStep < this.route.length) {
            const targetX = this.route[this.routeStep][0];
            const targetY = this.route[this.routeStep][1];

            const dx = targetX - this.x;
            const dy = targetY - this.y;
            const distance = Math.sqrt(dx*dx + dy*dy);

            if (distance < this.speed) {
                this.x = targetX;
                this.y = targetY;
                this.routeStep++;
            } else {
                this.x += (dx / distance) * this.speed;
                this.y += (dy / distance) * this.speed;
            }
        }
    }

    chaseBall(ballX, ballY) {
        if (this.isDefender) {
            const dx = ballX - this.x;
            const dy = ballY - this.y;
            const distance = Math.sqrt(dx*dx + dy*dy);

            if (distance > 0) {
                this.x += (dx / distance) * (this.speed * 0.7);
                this.y += (dy / distance) * (this.speed * 0.7);
            }
        }
    }
}

class Ball {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = BALL_SIZE;
        this.height = BALL_SIZE;
        this.inAir = false;
        this.targetX = 0;
        this.targetY = 0;
        this.speed = 5;
        this.airTime = 0;
        this.maxAirTime = 20;
        this.carrier = null;
    }

    draw() {
        ctx.fillStyle = BROWN;
        ctx.beginPath();
        ctx.ellipse(this.x, this.y, this.width, this.height, 0, 0, Math.PI * 2);
        ctx.fill();
    }

    throw(targetX, targetY) {
        this.inAir = true;
        this.targetX = targetX;
        this.targetY = targetY;
        this.airTime = 0;
    }

    updateInAir() {
        if (this.inAir) {
            this.airTime += 1;
            const progress = this.airTime / this.maxAirTime;

            if (progress >= 1) {
                this.x = this.targetX;
                this.y = this.targetY;
                this.inAir = false;
                return;
            }

            // Parabolic arc for the ball
            this.x = this.x + (this.targetX - this.x) * (progress);

            // Add a vertical arc to the ball's flight
            const startY = this.y;
            const directY = startY + (this.targetY - startY) * progress;
            const arcHeight = -25;
            const arcY = arcHeight * Math.sin(progress * Math.PI);
            this.y = directY + arcY;
        }
    }
}
class Game {
    constructor() {
        this.state = GameState.TITLE_SCREEN;
        this.playType = null;
        
        // Field positions
        this.fieldX = (SCREEN_WIDTH - FIELD_WIDTH - 2 * END_ZONE_WIDTH) / 2 + END_ZONE_WIDTH;
        this.fieldY = (SCREEN_HEIGHT - FIELD_HEIGHT) / 2;
        
        // Notification system
        this.notification = "";
        this.notificationTime = 0;
        this.notificationDuration = 60; // frames
        
        this.resetGame();
        
        // Start game loop
        this.lastTime = 0;
        requestAnimationFrame(this.gameLoop.bind(this));
    }
    
    resetGame() {
        // Game state
        this.score = 0;
        this.opponentScore = 0;
        this.quarter = 1;
        this.time = 15 * 60; // 15 minutes in seconds
        this.down = 1;
        this.distance = 10;
        this.yardLine = 20;
        this.firstDownLine = this.yardLine + this.distance;
        
        // Reset notification
        this.notification = "";
        this.notificationTime = 0;
        
        // Initialize players and ball
        this.players = [];
        this.receivers = [];
        this.defenders = [];
        this.ball = new Ball(this.fieldX + (50 * YARD_LENGTH), this.fieldY + (FIELD_HEIGHT / 2));
        
        // Reset for new play if not at title screen
        if (this.state !== GameState.TITLE_SCREEN) {
            this.resetPlay();
        }
    }
    
    resetPlay() {
        // Players
        this.players = [];
        
        // Create QB
        const qbX = this.fieldX + (this.yardLine * YARD_LENGTH);
        const qbY = this.fieldY + (FIELD_HEIGHT / 2);
        this.qb = new Player(qbX, qbY, BLUE, true);
        this.players.push(this.qb);
        
        // Create receivers based on play type
        this.receivers = [];
        if (this.playType === PlayType.RUN) {
            this.createRunPlay();
        } else if (this.playType === PlayType.SHORT_PASS) {
            this.createShortPassPlay();
        } else if (this.playType === PlayType.LONG_PASS) {
            this.createLongPassPlay();
        } else if (this.playType === PlayType.OPTION) {
            this.createOptionPlay();
        } else {
            // Default to short pass if no play selected
            this.createShortPassPlay();
        }
        
        // Create defenders
        this.defenders = [];
        for (let i = 0; i < 5; i++) {
            const defX = qbX + Math.random() * 50 + 25;
            const defY = this.fieldY + Math.random() * (FIELD_HEIGHT - 100) + 50;
            const defender = new Player(defX, defY, RED, false, false, true);
            this.defenders.push(defender);
            this.players.push(defender);
        }
        
        // Create ball
        this.ball = new Ball(qbX, qbY);
        this.ball.carrier = this.qb;
        
        // Game state
        this.state = GameState.PLAYING;
        this.playOver = false;
        this.playResult = "";
        this.selectedReceiver = null;
    }
    
    createRunPlay() {
        const qbX = this.qb.x;
        const qbY = this.qb.y;
        
        // Create running back
        const rbRoute = [
            [qbX - 15, qbY + 10],  // Move back for handoff
            [qbX + 50, qbY + 10],  // Run forward
            [qbX + 100, qbY]       // Cut upfield
        ];
        const rb = new Player(qbX, qbY + 15, BLUE, false, true, false, rbRoute);
        rb.number = 1;
        this.receivers.push(rb);
        this.players.push(rb);
        
        // Add blockers
        const blocker1 = new Player(qbX + 10, qbY - 15, BLUE);
        const blocker2 = new Player(qbX + 10, qbY + 15, BLUE);
        this.players.push(blocker1);
        this.players.push(blocker2);
    }
    
    createShortPassPlay() {
        const qbX = this.qb.x;
        const qbY = this.qb.y;
        
        // Create 3 receivers with short routes
        const routes = [
            [[qbX + 40, qbY - 40], [qbX + 60, qbY - 50]],  // Slant route
            [[qbX + 50, qbY], [qbX + 75, qbY + 10]],       // Out route
            [[qbX + 25, qbY + 40], [qbX + 60, qbY + 30]]   // Curl route
        ];
        
        const positions = [
            [qbX, qbY - 30],  // Wide receiver left
            [qbX + 10, qbY],  // Tight end
            [qbX, qbY + 30]   // Wide receiver right
        ];
        
        for (let i = 0; i < 3; i++) {
            const receiver = new Player(positions[i][0], positions[i][1], BLUE, false, true, false, routes[i]);
            receiver.number = i + 1;
            this.receivers.push(receiver);
            this.players.push(receiver);
        }
    }
    
    createLongPassPlay() {
        const qbX = this.qb.x;
        const qbY = this.qb.y;
        
        // Create 3 receivers with long routes
        const routes = [
            [[qbX + 50, qbY - 50], [qbX + 100, qbY - 60]],  // Deep left
            [[qbX + 75, qbY], [qbX + 125, qbY]],            // Deep middle
            [[qbX + 50, qbY + 50], [qbX + 100, qbY + 60]]   // Deep right
        ];
        
        const positions = [
            [qbX, qbY - 30],  // Wide receiver left
            [qbX + 10, qbY],  // Tight end
            [qbX, qbY + 30]   // Wide receiver right
        ];
        
        for (let i = 0; i < 3; i++) {
            const receiver = new Player(positions[i][0], positions[i][1], BLUE, false, true, false, routes[i]);
            receiver.number = i + 1;
            this.receivers.push(receiver);
            this.players.push(receiver);
        }
    }
    
    createOptionPlay() {
        const qbX = this.qb.x;
        const qbY = this.qb.y;
        
        // Create running back for option
        const rbRoute = [
            [qbX + 15, qbY + 15],   // Move to option position
            [qbX + 75, qbY + 15]    // Run forward if pitched
        ];
        const rb = new Player(qbX, qbY + 15, BLUE, false, true, false, rbRoute);
        rb.number = 1;
        this.receivers.push(rb);
        this.players.push(rb);
        
        // Add receivers for passing option
        const wrRoute = [[qbX + 50, qbY - 40], [qbX + 90, qbY - 50]];
        const wr = new Player(qbX, qbY - 25, BLUE, false, true, false, wrRoute);
        wr.number = 2;
        this.receivers.push(wr);
        this.players.push(wr);
        
        const teRoute = [[qbX + 40, qbY], [qbX + 75, qbY - 10]];
        const te = new Player(qbX + 10, qbY, BLUE, false, true, false, teRoute);
        te.number = 3;
        this.receivers.push(te);
        this.players.push(te);
    }
    
    update() {
        // Update notification timer
        if (this.notification) {
            this.notificationTime--;
            if (this.notificationTime <= 0) {
                this.notification = "";
            }
        }
        
        if (this.state === GameState.PLAYING) {
            // Move active player with arrow keys
            const activePlayer = this.ball.carrier === this.qb ? this.qb : this.ball.carrier;
            
            if (activePlayer) {
                let dx = 0, dy = 0;
                
                // Check keyboard or mobile controls
                if (keys.ArrowLeft || keys.a || mobileControls.left) dx = -activePlayer.speed;
                if (keys.ArrowRight || keys.d || mobileControls.right) dx = activePlayer.speed;
                if (keys.ArrowUp || keys.w || mobileControls.up) dy = -activePlayer.speed;
                if (keys.ArrowDown || keys.s || mobileControls.down) dy = activePlayer.speed;
                
                activePlayer.move(dx, dy);
                
                // Keep player in bounds (including end zones)
                activePlayer.x = Math.max(this.fieldX - END_ZONE_WIDTH, 
                                         Math.min(activePlayer.x, this.fieldX + FIELD_WIDTH + END_ZONE_WIDTH));
                activePlayer.y = Math.max(this.fieldY, 
                                         Math.min(activePlayer.y, this.fieldY + FIELD_HEIGHT));
                
                // Update ball position with carrier
                this.ball.x = activePlayer.x;
                this.ball.y = activePlayer.y;
            }
            
            // Move receivers along routes
            for (const receiver of this.receivers) {
                receiver.followRoute();
            }
            
            // Move defenders to chase the ball
            const ballCarrier = this.ball.carrier;
            let targetX = this.ball.x;
            let targetY = this.ball.y;
            
            if (ballCarrier) {
                targetX = ballCarrier.x;
                targetY = ballCarrier.y;
            }
            
            for (const defender of this.defenders) {
                defender.chaseBall(targetX, targetY);
            }
            
            // Check for tackles
            if (ballCarrier) {
                for (const defender of this.defenders) {
                    const dx = defender.x - ballCarrier.x;
                    const dy = defender.y - ballCarrier.y;
                    const distance = Math.sqrt(dx*dx + dy*dy);
                    
                    if (distance < PLAYER_SIZE) {
                        this.endPlay("Tackled!");
                        break;
                    }
                }
            }
            
            // Check if ball carrier crossed first down line
            if (ballCarrier && ballCarrier.x >= this.fieldX + (this.firstDownLine * YARD_LENGTH)) {
                const newYards = Math.floor((ballCarrier.x - (this.fieldX + this.yardLine * YARD_LENGTH)) / YARD_LENGTH);
                this.yardLine += newYards;
                this.down = 1;
                this.distance = 10;
                this.firstDownLine = Math.min(this.yardLine + this.distance, 100);
                // Show first down notification without ending play
                this.showNotification("First down!");
            }
            
            // Check for touchdown
            if (ballCarrier && ballCarrier.x >= this.fieldX + (100 * YARD_LENGTH)) {
                this.score += 7;  // Assume extra point is good
                this.endPlay("Touchdown!");
                
                // Simulate opponent possession
                this.simulateOpponentPossession();
                
                // Reset for next possession
                this.yardLine = 20;
                this.down = 1;
                this.distance = 10;
                this.firstDownLine = this.yardLine + this.distance;
            }
            
        } else if (this.state === GameState.BALL_IN_AIR) {
            // Update ball position
            this.ball.updateInAir();
            
            // Move receivers along routes
            for (const receiver of this.receivers) {
                receiver.followRoute();
            }
            
            // Move defenders
            for (const defender of this.defenders) {
                defender.chaseBall(this.ball.x, this.ball.y);
            }
            
            // Check if ball reached target
            if (!this.ball.inAir) {
                // Check if receiver caught the ball
                let caught = false;
                for (const receiver of this.receivers) {
                    const dx = receiver.x - this.ball.x;
                    const dy = receiver.y - this.ball.y;
                    const distance = Math.sqrt(dx*dx + dy*dy);
                    
                    if (distance < PLAYER_SIZE * 1.5) {
                        this.ball.carrier = receiver;
                        caught = true;
                        
                        // Show notification about completed pass
                        this.showNotification(`Pass complete to #${receiver.number}!`);
                        
                        // Deselect receiver
                        if (this.selectedReceiver) {
                            this.selectedReceiver.selected = false;
                            this.selectedReceiver = null;
                        }
                        
                        this.state = GameState.PLAYING;
                        break;
                    }
                }
                
                // Check if defender intercepted
                if (!caught) {
                    for (const defender of this.defenders) {
                        const dx = defender.x - this.ball.x;
                        const dy = defender.y - this.ball.y;
                        const distance = Math.sqrt(dx*dx + dy*dy);
                        
                        if (distance < PLAYER_SIZE * 1.5) {
                            this.endPlay("Intercepted!");
                            return;
                        }
                    }
                }
                
                // Incomplete pass
                if (!caught) {
                    this.endPlay("Incomplete pass!");
                }
            }
        }
    }
    
    simulateOpponentPossession(startingYardLine = 20) {
        // Update game clock for opponent's possession
        const timeUsed = Math.floor(Math.random() * 120) + 60;  // 1-3 minutes
        this.time -= timeUsed;
        
        // Check if time ran out during opponent possession
        if (this.time <= 0) {
            if (this.quarter < 4) {
                this.quarter++;
                this.time = 15 * 60;
                this.playResult += " Quarter ended during opponent possession.";
            } else {
                this.playResult = "Game Over!";
                return;
            }
        }
        
        // Calculate scoring probability based on field position
        const baseScoringChance = 0.3;  // 30% chance from own 20
        const fieldPositionBonus = startingYardLine / 100;  // 0 to 1 based on field position
        const scoringChance = baseScoringChance + (fieldPositionBonus * 0.4);  // Max 70% from opponent's 20
        
        // Determine drive outcome
        if (Math.random() < scoringChance) {
            // Opponent scored a touchdown
            this.opponentScore += 7;  // Assume extra point is good
            this.playResult += " Opponent drove down the field and scored a touchdown!";
        } else {
            // Opponent didn't score - determine how the drive ended
            const driveOutcomes = [
                "Opponent punted after going three-and-out!",
                "Opponent drove to midfield but had to punt!",
                "Opponent missed a long field goal attempt!",
                "Opponent turned over on downs in your territory!",
                "Your defense forced a fumble!"
            ];
            
            // Weight outcomes based on field position
            let outcomeWeights;
            if (startingYardLine < 40) {  // Bad field position
                outcomeWeights = [0.5, 0.3, 0.1, 0.05, 0.05];
            } else if (startingYardLine < 70) {  // Midfield area
                outcomeWeights = [0.2, 0.4, 0.2, 0.1, 0.1];
            } else {  // Good field position
                outcomeWeights = [0.1, 0.2, 0.3, 0.2, 0.2];
            }
            
            // Select outcome based on weights
            let outcomeIndex = 0;
            const r = Math.random();
            let cumulativeWeight = 0;
            
            for (let i = 0; i < outcomeWeights.length; i++) {
                cumulativeWeight += outcomeWeights[i];
                if (r <= cumulativeWeight) {
                    outcomeIndex = i;
                    break;
                }
            }
            
            this.playResult += ` ${driveOutcomes[outcomeIndex]}`;
        }
    }
    
    endPlay(result) {
        this.playResult = result;
        this.state = GameState.PLAY_OVER;
        
        if (result === "Tackled!") {
            // Calculate yards gained
            const newYards = Math.floor((this.ball.x - (this.fieldX + this.yardLine * YARD_LENGTH)) / YARD_LENGTH);
            this.yardLine += newYards;
            this.down++;
            this.distance -= newYards;
            
            if (this.down > 4) {
                this.playResult = "Turnover on downs!";
                // Calculate field position for opponent based on current yard line
                const opponentYardLine = 100 - this.yardLine;
                // Simulate opponent possession after turnover on downs
                this.simulateOpponentPossession(opponentYardLine);
                // Reset for next possession
                this.yardLine = 20;
                this.down = 1;
                this.distance = 10;
            }
            
            this.firstDownLine = Math.min(this.yardLine + this.distance, 100);
            
        } else if (result === "Incomplete pass!") {
            this.down++;
            
            if (this.down > 4) {
                this.playResult = "Turnover on downs!";
                // Calculate field position for opponent based on current yard line
                const opponentYardLine = 100 - this.yardLine;
                // Simulate opponent possession after turnover on downs
                this.simulateOpponentPossession(opponentYardLine);
                // Reset for next possession
                this.yardLine = 20;
                this.down = 1;
                this.distance = 10;
            }
            
            this.firstDownLine = Math.min(this.yardLine + this.distance, 100);
            
        } else if (result === "Intercepted!") {
            // Simulate opponent possession after interception
            // Assume interception happens around midfield
            this.simulateOpponentPossession(50);
            // Reset for next possession
            this.yardLine = 20;
            this.down = 1;
            this.distance = 10;
            this.firstDownLine = this.yardLine + this.distance;
        }
        
        // Update game clock
        this.time -= Math.floor(Math.random() * 15) + 25;
        if (this.time <= 0) {
            if (this.quarter < 4) {
                this.quarter++;
                this.time = 15 * 60;
            } else {
                this.playResult = "Game Over!";
            }
        }
    }
    
    showNotification(message) {
        this.notification = message;
        this.notificationTime = this.notificationDuration;
    }
    
    drawNotification() {
        // Create semi-transparent background for notification
        ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
        ctx.fillRect(0, 100, SCREEN_WIDTH, 40);
        
        // Draw notification text
        ctx.font = "24px Arial";
        ctx.fillStyle = YELLOW;
        ctx.textAlign = "center";
        ctx.fillText(this.notification, SCREEN_WIDTH / 2, 125);
        ctx.textAlign = "left";
    }
    
    draw() {
        ctx.fillStyle = BLACK;
        ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
        
        if (this.state === GameState.TITLE_SCREEN) {
            this.drawTitleScreen();
        } else {
            // Draw field
            ctx.fillStyle = GREEN;
            ctx.fillRect(this.fieldX, this.fieldY, FIELD_WIDTH, FIELD_HEIGHT);
            
            // Draw end zones (red)
            ctx.fillStyle = END_ZONE_RED;
            ctx.fillRect(this.fieldX - END_ZONE_WIDTH, this.fieldY, END_ZONE_WIDTH, FIELD_HEIGHT);
            ctx.fillRect(this.fieldX + FIELD_WIDTH, this.fieldY, END_ZONE_WIDTH, FIELD_HEIGHT);
            
            // Draw yard lines
            ctx.strokeStyle = WHITE;
            ctx.lineWidth = 1;
            for (let i = 0; i <= 100; i += 10) {
                const x = this.fieldX + (i * YARD_LENGTH);
                ctx.beginPath();
                ctx.moveTo(x, this.fieldY);
                ctx.lineTo(x, this.fieldY + FIELD_HEIGHT);
                ctx.stroke();
                
                if (i > 0 && i < 100 && i % 20 === 0) {  // Only show every 20 yards to reduce clutter
                    ctx.font = "16px Arial";
                    ctx.fillStyle = WHITE;
                    ctx.fillText(i.toString(), x - 5, this.fieldY + 20);
                    ctx.fillText(i.toString(), x - 5, this.fieldY + FIELD_HEIGHT - 10);
                }
            }
            
            // Draw first down line
            const firstDownX = this.fieldX + (this.firstDownLine * YARD_LENGTH);
            ctx.strokeStyle = YELLOW;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(firstDownX, this.fieldY);
            ctx.lineTo(firstDownX, this.fieldY + FIELD_HEIGHT);
            ctx.stroke();
            
            // Draw players
            for (const player of this.players) {
                player.draw();
            }
            
            // Draw ball
            this.ball.draw();
            
            // Draw scoreboard
            this.drawScoreboard();
            
            // Draw notification if active
            if (this.notification) {
                this.drawNotification();
            }
            
            // Draw play selection menu
            if (this.state === GameState.PLAY_SELECTION) {
                this.drawPlaySelection();
            }
            
            // Draw play result
            if (this.state === GameState.PLAY_OVER) {
                ctx.font = "24px Arial";
                ctx.fillStyle = WHITE;
                ctx.textAlign = "center";
                ctx.fillText(this.playResult, SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2);
                
                ctx.font = "18px Arial";
                ctx.fillText("Press SPACE to continue", SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2 + 40);
                ctx.textAlign = "left";
            }
            
            // Draw pass instructions
            if (this.state === GameState.PASS_SELECTION) {
                ctx.font = "18px Arial";
                ctx.fillStyle = WHITE;
                ctx.textAlign = "center";
                ctx.fillText("Press SPACE to throw or ESC to cancel", SCREEN_WIDTH / 2, SCREEN_HEIGHT - 30);
                ctx.textAlign = "left";
            }
        }
    }
    
    drawScoreboard() {
        // Draw scoreboard background
        ctx.fillStyle = BLACK;
        ctx.fillRect(0, 0, SCREEN_WIDTH, 50);
        
        // Draw scores
        ctx.font = "24px Arial";
        ctx.fillStyle = WHITE;
        ctx.fillText(`YOU: ${this.score}  OPP: ${this.opponentScore}`, 20, 30);
        
        // Draw down and distance
        const downText = `${this.down}${this.getDownSuffix(this.down)} & ${this.distance}`;
        ctx.textAlign = "center";
        ctx.fillText(downText, SCREEN_WIDTH / 2, 30);
        ctx.textAlign = "left";
        
        // Draw time
        const minutes = Math.floor(this.time / 60);
        const seconds = this.time % 60;
        const timeText = `Q${this.quarter} ${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
        ctx.textAlign = "right";
        ctx.fillText(timeText, SCREEN_WIDTH - 20, 30);
        ctx.textAlign = "left";
        
        // Draw yard line indicator
        ctx.font = "16px Arial";
        ctx.textAlign = "center";
        ctx.fillText(`Ball on: ${this.yardLine} yard line`, SCREEN_WIDTH / 2, 50);
        
        // Show active player indicator
        if (this.state === GameState.PLAYING && this.ball.carrier) {
            const playerText = this.ball.carrier === this.qb ? 
                "Controlling: QB" : 
                `Controlling: Receiver #${this.ball.carrier.number}`;
            ctx.fillStyle = YELLOW;
            ctx.textAlign = "right";
            ctx.fillText(playerText, SCREEN_WIDTH - 20, 50);
        }
        ctx.textAlign = "left";
    }
    
    getDownSuffix(down) {
        if (down === 1) return "st";
        if (down === 2) return "nd";
        if (down === 3) return "rd";
        return "th";
    }
    
    drawTitleScreen() {
        // Draw background - football field
        ctx.fillStyle = GREEN;
        ctx.fillRect(this.fieldX, this.fieldY, FIELD_WIDTH, FIELD_HEIGHT);
        
        // Draw end zones
        ctx.fillStyle = END_ZONE_RED;
        ctx.fillRect(this.fieldX - END_ZONE_WIDTH, this.fieldY, END_ZONE_WIDTH, FIELD_HEIGHT);
        ctx.fillRect(this.fieldX + FIELD_WIDTH, this.fieldY, END_ZONE_WIDTH, FIELD_HEIGHT);
        
        // Draw yard lines (simplified)
        ctx.strokeStyle = WHITE;
        ctx.lineWidth = 1;
        for (let i = 0; i <= 100; i += 10) {
            const x = this.fieldX + (i * YARD_LENGTH);
            ctx.beginPath();
            ctx.moveTo(x, this.fieldY);
            ctx.lineTo(x, this.fieldY + FIELD_HEIGHT);
            ctx.stroke();
        }
        
        // Draw title
        ctx.font = "72px Arial";
        ctx.fillStyle = BLACK;
        ctx.textAlign = "center";
        ctx.fillText("RETRO FOOTBALL", SCREEN_WIDTH / 2 + 3, 103);
        ctx.fillStyle = WHITE;
        ctx.fillText("RETRO FOOTBALL", SCREEN_WIDTH / 2, 100);
        
        // Draw football graphic
        ctx.fillStyle = BROWN;
        ctx.beginPath();
        ctx.ellipse(SCREEN_WIDTH / 2, 225, 40, 25, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw laces
        ctx.strokeStyle = WHITE;
        ctx.lineWidth = 2;
        for (let i = 0; i < 4; i++) {
            ctx.beginPath();
            ctx.moveTo(SCREEN_WIDTH / 2 - 10, 210 + i * 8);
            ctx.lineTo(SCREEN_WIDTH / 2 + 10, 210 + i * 8);
            ctx.stroke();
        }
        
        // Draw start prompt - make it blink
        const currentTime = new Date().getTime();
        if (currentTime % 1000 < 700) {  // Visible for 700ms, invisible for 300ms
            ctx.font = "24px Arial";
            ctx.fillStyle = YELLOW;
            ctx.fillText("Press SPACE to start", SCREEN_WIDTH / 2, 300);
        }
        
        // Draw credits
        ctx.font = "16px Arial";
        ctx.fillStyle = WHITE;
        ctx.fillText("© 2025 Retro Games", SCREEN_WIDTH / 2, SCREEN_HEIGHT - 40);
        
        // Draw controls info
        ctx.fillText("Use arrow keys to move, number keys to select plays/receivers", SCREEN_WIDTH / 2, SCREEN_HEIGHT - 70);
        
        ctx.textAlign = "left";
    }
    
    drawPlaySelection() {
        // Draw semi-transparent overlay
        ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
        ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
        
        // Draw play selection menu
        ctx.font = "30px Arial";
        ctx.fillStyle = WHITE;
        ctx.textAlign = "center";
        ctx.fillText("Select Play", SCREEN_WIDTH / 2, 150);
        
        const plays = [
            "1. Run",
            "2. Short Pass",
            "3. Long Pass",
            "4. Option"
        ];
        
        ctx.font = "24px Arial";
        for (let i = 0; i < plays.length; i++) {
            ctx.fillText(plays[i], SCREEN_WIDTH / 2, 200 + i * 40);
        }
        
        ctx.textAlign = "left";
    }
    
    gameLoop(timestamp) {
        // Calculate delta time
        const deltaTime = timestamp - this.lastTime;
        this.lastTime = timestamp;
        
        // Update game state
        this.update();
        
        // Draw everything
        this.draw();
        
        // Request next frame
        requestAnimationFrame(this.gameLoop.bind(this));
    }
}

// Create and start the game
const game = new Game();
