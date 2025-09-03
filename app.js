// Piko Přepadení - PWA Game - Final Fixed Version
let game = null;

// Simple game class with working navigation
class Game {
    constructor() {
        this.state = 'loading';
        this.score = 0;
        this.health = 100;
        this.distance = 0;
        this.player = { x: 195, y: 600, targetX: 195, isJumping: false, jumpHeight: 0, jumpSpeed: 0 };
        this.obstacles = [];
        this.collectibles = [];
        this.enemies = [];
        this.particles = [];
        this.canvas = null;
        this.ctx = null;
        this.gameLoop = null;
        this.lastTime = 0;
        this.speed = 2;
        this.powerUps = new Map();
        
        // Settings and data
        this.settings = { sound: true, vibration: true, difficulty: 'normal' };
        this.highScores = [];
        this.achievements = [
            { id: 'first_run', title: 'První útěk', description: 'Začni svůj první run', icon: '🏃', unlocked: false },
            { id: 'collector', title: 'Sběratel', description: 'Sebírej 50 "matroše"', icon: '💊', unlocked: false, progress: 0, target: 50 }
        ];
        
        this.quotes = {
            start: ['Jdeme na to, kámo!', 'Dneska to bude jízda!'],
            collect: ['Dobrý matroš!', 'Tohle zachrání večer!'],
            damage: ['Prásknul ses!', 'Tohle bolí víc než absťák!'],
            gameOver: ['Chytli tě, šlehaři!', 'Příště běž jinudy!']
        };
        
        this.init();
    }
    
    init() {
        console.log('Game initializing...');
        this.loadData();
        this.setupAudio();
        
        // Show start screen after loading
        setTimeout(() => {
            this.showScreen('start-screen');
            this.setupEvents();
        }, 2000);
    }
    
    setupEvents() {
        console.log('Setting up events...');
        
        // Direct event binding with multiple methods
        const events = [
            ['play-btn', 'click', () => this.startGame()],
            ['settings-btn', 'click', () => this.showSettings()],
            ['achievements-btn', 'click', () => this.showAchievements()],
            ['leaderboard-btn', 'click', () => this.showLeaderboard()],
            ['pause-btn', 'click', () => this.pauseGame()],
            ['resume-btn', 'click', () => this.resumeGame()],
            ['restart-btn', 'click', () => this.restartGame()],
            ['quit-btn', 'click', () => this.quitGame()],
            ['play-again-btn', 'click', () => this.startGame()],
            ['menu-btn', 'click', () => this.showScreen('start-screen')],
            ['save-settings-btn', 'click', () => this.saveSettings()],
            ['close-settings-btn', 'click', () => this.showScreen('start-screen')],
            ['close-achievements-btn', 'click', () => this.showScreen('start-screen')],
            ['close-leaderboard-btn', 'click', () => this.showScreen('start-screen')],
            ['clear-scores-btn', 'click', () => this.clearScores()]
        ];
        
        events.forEach(([id, event, handler]) => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener(event, (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log(`${id} clicked`);
                    handler();
                });
                
                // Also add touch handler for mobile
                element.addEventListener('touchend', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log(`${id} touched`);
                    handler();
                });
                
                console.log(`Event bound to ${id}`);
            }
        });
        
        // Keyboard controls
        document.addEventListener('keydown', (e) => this.handleKey(e));
        
        // Touch controls for game
        this.setupTouchControls();
        
        console.log('All events setup complete');
    }
    
    setupTouchControls() {
        setTimeout(() => {
            const canvas = document.getElementById('game-canvas');
            if (canvas) {
                let touchStartX = 0, touchStartY = 0;
                
                canvas.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    touchStartX = e.touches[0].clientX;
                    touchStartY = e.touches[0].clientY;
                });
                
                canvas.addEventListener('touchend', (e) => {
                    e.preventDefault();
                    if (this.state !== 'playing') return;
                    
                    const deltaX = e.changedTouches[0].clientX - touchStartX;
                    const deltaY = e.changedTouches[0].clientY - touchStartY;
                    
                    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 30) {
                        deltaX > 0 ? this.movePlayer('right') : this.movePlayer('left');
                    } else if (deltaY < -30) {
                        this.jumpPlayer();
                    }
                });
            }
        }, 1000);
    }
    
    setupAudio() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.log('Audio not supported');
        }
    }
    
    showScreen(screenId) {
        console.log(`Showing screen: ${screenId}`);
        
        // Hide all screens
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.add('hidden');
        });
        
        // Show target screen
        const screen = document.getElementById(screenId);
        if (screen) {
            screen.classList.remove('hidden');
            this.state = screenId.replace('-screen', '');
            console.log(`Screen shown: ${screenId}`);
        }
    }
    
    startGame() {
        console.log('=== STARTING GAME ===');
        
        this.state = 'playing';
        this.score = 0;
        this.health = 100;
        this.distance = 0;
        this.speed = 2;
        this.powerUps.clear();
        
        // Reset player
        this.player = { x: 195, y: 600, targetX: 195, isJumping: false, jumpHeight: 0, jumpSpeed: 0 };
        
        // Clear game objects
        this.obstacles = [];
        this.collectibles = [];
        this.enemies = [];
        this.particles = [];
        
        // Setup canvas
        this.canvas = document.getElementById('game-canvas');
        if (!this.canvas) {
            console.error('Canvas not found!');
            return;
        }
        
        this.ctx = this.canvas.getContext('2d');
        this.canvas.width = 390;
        this.canvas.height = 844;
        
        // Show game screen
        this.showScreen('game-screen');
        
        // Update UI
        this.updateUI();
        
        // Start game loop
        this.lastTime = performance.now();
        this.gameLoop = requestAnimationFrame((time) => this.update(time));
        
        // Show start message
        this.showNotification(this.quotes.start[0]);
        this.playSound(880, 100);
        
        console.log('Game started successfully!');
    }
    
    update(currentTime) {
        if (this.state !== 'playing') return;
        
        const deltaTime = Math.min((currentTime - this.lastTime) / 16.67, 2);
        this.lastTime = currentTime;
        
        this.updatePlayer(deltaTime);
        this.updateObjects(deltaTime);
        this.spawnObjects();
        this.checkCollisions();
        this.updateGameLogic(deltaTime);
        this.render();
        
        this.gameLoop = requestAnimationFrame((time) => this.update(time));
    }
    
    updatePlayer(deltaTime) {
        // Smooth movement
        const dx = this.player.targetX - this.player.x;
        if (Math.abs(dx) > 1) {
            this.player.x += dx * 0.15;
        }
        this.player.x = Math.max(15, Math.min(375, this.player.x));
        
        // Jumping
        if (this.player.isJumping) {
            this.player.jumpSpeed += 0.8 * deltaTime;
            this.player.jumpHeight += this.player.jumpSpeed * deltaTime;
            
            if (this.player.jumpHeight >= 0) {
                this.player.jumpHeight = 0;
                this.player.jumpSpeed = 0;
                this.player.isJumping = false;
            }
        }
    }
    
    updateObjects(deltaTime) {
        // Update obstacles
        this.obstacles = this.obstacles.filter(obj => {
            obj.y += this.speed * deltaTime * 10;
            return obj.y < 844;
        });
        
        // Update collectibles
        this.collectibles = this.collectibles.filter(obj => {
            obj.y += this.speed * deltaTime * 10;
            obj.rotation += 0.1 * deltaTime;
            return obj.y < 844;
        });
        
        // Update enemies
        this.enemies = this.enemies.filter(obj => {
            obj.y += this.speed * deltaTime * 10;
            return obj.y < 844;
        });
        
        // Update particles
        this.particles = this.particles.filter(particle => {
            particle.x += particle.vx * deltaTime;
            particle.y += particle.vy * deltaTime;
            particle.life -= deltaTime;
            return particle.life > 0;
        });
        
        // Update power-ups
        for (const [type, data] of this.powerUps.entries()) {
            data.time -= deltaTime / 60;
            if (data.time <= 0) {
                this.powerUps.delete(type);
            }
        }
    }
    
    spawnObjects() {
        // Spawn obstacles
        if (Math.random() < 0.02) {
            this.obstacles.push({
                x: Math.random() * 300 + 45,
                y: -50,
                width: 60,
                height: 30,
                color: '#ff4444'
            });
        }
        
        // Spawn collectibles
        if (Math.random() < 0.03) {
            this.collectibles.push({
                x: Math.random() * 300 + 45,
                y: -30,
                width: 20,
                height: 20,
                type: 'drug',
                rotation: 0,
                color: '#00f6ff'
            });
        }
        
        // Spawn enemies
        if (Math.random() < 0.015) {
            this.enemies.push({
                x: Math.random() * 300 + 45,
                y: -40,
                width: 25,
                height: 35,
                color: '#0066cc'
            });
        }
    }
    
    checkCollisions() {
        const playerRect = {
            x: this.player.x - 15,
            y: this.player.y - this.player.jumpHeight - 20,
            width: 30,
            height: 40
        };
        
        // Check obstacles
        this.obstacles = this.obstacles.filter(obstacle => {
            if (this.isColliding(playerRect, obstacle)) {
                this.takeDamage(20);
                this.createParticles(obstacle.x, obstacle.y, obstacle.color);
                return false;
            }
            return true;
        });
        
        // Check collectibles
        this.collectibles = this.collectibles.filter(collectible => {
            if (this.isColliding(playerRect, collectible)) {
                this.collectItem();
                this.createParticles(collectible.x, collectible.y, collectible.color);
                return false;
            }
            return true;
        });
        
        // Check enemies
        this.enemies = this.enemies.filter(enemy => {
            if (this.isColliding(playerRect, enemy)) {
                this.takeDamage(30);
                this.createParticles(enemy.x, enemy.y, enemy.color);
                return false;
            }
            return true;
        });
    }
    
    isColliding(rect1, rect2) {
        return rect1.x < rect2.x + rect2.width &&
               rect1.x + rect1.width > rect2.x &&
               rect1.y < rect2.y + rect2.height &&
               rect1.y + rect1.height > rect2.y;
    }
    
    collectItem() {
        this.score += 100;
        this.showNotification(this.quotes.collect[Math.floor(Math.random() * this.quotes.collect.length)]);
        this.playSound(880, 150);
        this.vibrate(30);
    }
    
    takeDamage(damage) {
        this.health -= damage;
        this.health = Math.max(0, this.health);
        this.updateHealthBar();
        this.showNotification(this.quotes.damage[Math.floor(Math.random() * this.quotes.damage.length)]);
        this.playSound(220, 300);
        this.vibrate([100, 50, 100]);
        
        if (this.health <= 0) {
            this.gameOver();
        }
    }
    
    createParticles(x, y, color) {
        for (let i = 0; i < 6; i++) {
            this.particles.push({
                x: x,
                y: y,
                vx: (Math.random() - 0.5) * 8,
                vy: (Math.random() - 0.5) * 8,
                life: 20,
                color: color
            });
        }
    }
    
    updateGameLogic(deltaTime) {
        this.distance += this.speed * deltaTime;
        this.score += Math.floor(this.speed * deltaTime);
        this.speed = Math.min(2 + this.distance / 10000, 6);
        
        this.updateUI();
    }
    
    updateUI() {
        const scoreEl = document.getElementById('score');
        if (scoreEl) scoreEl.textContent = Math.floor(this.score);
        this.updateHealthBar();
    }
    
    updateHealthBar() {
        const healthFill = document.getElementById('health-fill');
        if (healthFill) {
            healthFill.style.width = `${this.health}%`;
            if (this.health > 60) {
                healthFill.style.background = 'linear-gradient(90deg, #44ff44, #88ff88)';
            } else if (this.health > 30) {
                healthFill.style.background = 'linear-gradient(90deg, #ffaa00, #ffcc44)';
            } else {
                healthFill.style.background = 'linear-gradient(90deg, #ff4444, #ff6666)';
            }
        }
    }
    
    render() {
        if (!this.ctx) return;
        
        // Clear with gradient
        const gradient = this.ctx.createLinearGradient(0, 0, 0, 844);
        gradient.addColorStop(0, '#0f1419');
        gradient.addColorStop(1, '#1a202c');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, 390, 844);
        
        // Draw background lines
        this.ctx.save();
        this.ctx.globalAlpha = 0.1;
        this.ctx.strokeStyle = '#00f6ff';
        this.ctx.lineWidth = 2;
        for (let i = 0; i < 5; i++) {
            const y = ((this.distance * 2) % 200) + i * 200 - 200;
            this.ctx.beginPath();
            this.ctx.moveTo(50, y);
            this.ctx.lineTo(340, y);
            this.ctx.stroke();
        }
        this.ctx.restore();
        
        // Draw particles
        this.particles.forEach(particle => {
            this.ctx.save();
            this.ctx.globalAlpha = particle.life / 20;
            this.ctx.fillStyle = particle.color;
            this.ctx.fillRect(particle.x - 2, particle.y - 2, 4, 4);
            this.ctx.restore();
        });
        
        // Draw obstacles
        this.obstacles.forEach(obstacle => {
            this.ctx.fillStyle = obstacle.color;
            this.ctx.shadowBlur = 10;
            this.ctx.shadowColor = obstacle.color;
            this.ctx.fillRect(obstacle.x - obstacle.width/2, obstacle.y - obstacle.height/2, obstacle.width, obstacle.height);
            this.ctx.shadowBlur = 0;
        });
        
        // Draw collectibles
        this.collectibles.forEach(collectible => {
            this.ctx.save();
            this.ctx.translate(collectible.x, collectible.y);
            this.ctx.rotate(collectible.rotation);
            this.ctx.fillStyle = collectible.color;
            this.ctx.shadowBlur = 15;
            this.ctx.shadowColor = collectible.color;
            this.ctx.fillRect(-10, -10, 20, 20);
            this.ctx.shadowBlur = 0;
            this.ctx.restore();
        });
        
        // Draw enemies
        this.enemies.forEach(enemy => {
            this.ctx.fillStyle = enemy.color;
            this.ctx.fillRect(enemy.x - enemy.width/2, enemy.y - enemy.height/2, enemy.width, enemy.height);
            // Badge
            this.ctx.fillStyle = '#ffffff';
            this.ctx.fillRect(enemy.x - 8, enemy.y - 5, 16, 10);
        });
        
        // Draw player
        const x = this.player.x;
        const y = this.player.y - this.player.jumpHeight;
        
        this.ctx.save();
        this.ctx.shadowBlur = 20;
        this.ctx.shadowColor = '#00f6ff';
        
        // Player body
        this.ctx.fillStyle = '#00f6ff';
        this.ctx.fillRect(x - 15, y - 20, 30, 40);
        
        // Player face
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillRect(x - 10, y - 15, 20, 15);
        
        // Eyes
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(x - 6, y - 12, 3, 3);
        this.ctx.fillRect(x + 3, y - 12, 3, 3);
        
        this.ctx.restore();
    }
    
    movePlayer(direction) {
        const moveDistance = 80;
        if (direction === 'left') {
            this.player.targetX = Math.max(30, this.player.targetX - moveDistance);
        } else if (direction === 'right') {
            this.player.targetX = Math.min(360, this.player.targetX + moveDistance);
        }
        this.playSound(440, 50);
    }
    
    jumpPlayer() {
        if (!this.player.isJumping) {
            this.player.isJumping = true;
            this.player.jumpSpeed = -15;
            this.playSound(880, 200);
            this.vibrate(30);
        }
    }
    
    handleKey(e) {
        if (this.state !== 'playing') return;
        
        switch (e.key) {
            case 'ArrowLeft':
            case 'a':
                e.preventDefault();
                this.movePlayer('left');
                break;
            case 'ArrowRight':
            case 'd':
                e.preventDefault();
                this.movePlayer('right');
                break;
            case 'ArrowUp':
            case 'w':
            case ' ':
                e.preventDefault();
                this.jumpPlayer();
                break;
            case 'Escape':
                e.preventDefault();
                this.pauseGame();
                break;
        }
    }
    
    pauseGame() {
        if (this.state === 'playing') {
            this.state = 'paused';
            this.showScreen('pause-screen');
            if (this.gameLoop) {
                cancelAnimationFrame(this.gameLoop);
            }
        }
    }
    
    resumeGame() {
        if (this.state === 'paused') {
            this.state = 'playing';
            this.showScreen('game-screen');
            this.lastTime = performance.now();
            this.gameLoop = requestAnimationFrame((time) => this.update(time));
        }
    }
    
    restartGame() {
        if (this.gameLoop) {
            cancelAnimationFrame(this.gameLoop);
        }
        this.startGame();
    }
    
    quitGame() {
        if (this.gameLoop) {
            cancelAnimationFrame(this.gameLoop);
        }
        this.showScreen('start-screen');
    }
    
    gameOver() {
        this.state = 'gameOver';
        
        if (this.gameLoop) {
            cancelAnimationFrame(this.gameLoop);
        }
        
        // Update final stats
        const finalScore = document.getElementById('final-score');
        const finalDistance = document.getElementById('final-distance');
        
        if (finalScore) finalScore.textContent = Math.floor(this.score);
        if (finalDistance) finalDistance.textContent = Math.floor(this.distance) + 'm';
        
        // Show game over quote
        const gameOverQuote = document.getElementById('game-over-quote');
        if (gameOverQuote) {
            gameOverQuote.textContent = `"${this.quotes.gameOver[Math.floor(Math.random() * this.quotes.gameOver.length)]}"`;
        }
        
        // Check high score
        this.checkHighScore();
        this.saveData();
        
        setTimeout(() => {
            this.showScreen('game-over-screen');
        }, 1000);
        
        this.playSound(150, 1000);
        this.vibrate([200, 100, 200]);
    }
    
    checkHighScore() {
        const newScore = {
            score: Math.floor(this.score),
            distance: Math.floor(this.distance),
            date: new Date().toLocaleDateString('cs-CZ')
        };
        
        this.highScores.push(newScore);
        this.highScores.sort((a, b) => b.score - a.score);
        this.highScores = this.highScores.slice(0, 10);
        
        if (this.highScores[0] === newScore) {
            const newRecord = document.getElementById('new-record');
            if (newRecord) newRecord.style.display = 'block';
        }
    }
    
    showSettings() {
        this.showScreen('settings-screen');
        this.applySettingsToUI();
    }
    
    showAchievements() {
        this.showScreen('achievements-screen');
        
        const list = document.getElementById('achievements-list');
        if (list) {
            list.innerHTML = '';
            
            this.achievements.forEach(achievement => {
                const item = document.createElement('div');
                item.className = `achievement-item ${achievement.unlocked ? 'unlocked' : ''}`;
                item.innerHTML = `
                    <div class="achievement-icon">${achievement.unlocked ? achievement.icon : '🔒'}</div>
                    <div class="achievement-info">
                        <div class="achievement-title">${achievement.title}</div>
                        <div class="achievement-description">${achievement.description}</div>
                    </div>
                `;
                list.appendChild(item);
            });
        }
    }
    
    showLeaderboard() {
        this.showScreen('leaderboard-screen');
        
        const list = document.getElementById('leaderboard-list');
        if (list) {
            list.innerHTML = '';
            
            if (this.highScores.length === 0) {
                list.innerHTML = '<p style="text-align: center; opacity: 0.6;">Zatím žádné skóre</p>';
                return;
            }
            
            this.highScores.forEach((score, index) => {
                const item = document.createElement('div');
                item.className = 'leaderboard-item';
                item.innerHTML = `
                    <span class="leaderboard-rank">#${index + 1}</span>
                    <div>
                        <div>Skóre: <span class="leaderboard-score">${score.score}</span></div>
                        <div style="font-size: 11px; opacity: 0.6;">${score.distance}m • ${score.date}</div>
                    </div>
                `;
                list.appendChild(item);
            });
        }
    }
    
    clearScores() {
        if (confirm('Opravdu chceš vymazat všechna skóre?')) {
            this.highScores = [];
            this.saveData();
            this.showLeaderboard();
        }
    }
    
    saveSettings() {
        const sound = document.getElementById('sound-toggle');
        const vibration = document.getElementById('vibration-toggle');
        const difficulty = document.getElementById('difficulty-select');
        
        this.settings = {
            sound: sound ? sound.checked : true,
            vibration: vibration ? vibration.checked : true,
            difficulty: difficulty ? difficulty.value : 'normal'
        };
        
        this.saveData();
        this.showScreen('start-screen');
        this.showNotification('Nastavení uloženo!');
    }
    
    applySettingsToUI() {
        const sound = document.getElementById('sound-toggle');
        const vibration = document.getElementById('vibration-toggle');
        const difficulty = document.getElementById('difficulty-select');
        
        if (sound) sound.checked = this.settings.sound;
        if (vibration) vibration.checked = this.settings.vibration;
        if (difficulty) difficulty.value = this.settings.difficulty;
    }
    
    showNotification(text) {
        const notification = document.getElementById('event-notification');
        const eventText = document.getElementById('event-text');
        
        if (notification && eventText) {
            eventText.textContent = text;
            notification.classList.remove('hidden');
            
            setTimeout(() => {
                notification.classList.add('hidden');
            }, 2000);
        }
    }
    
    playSound(frequency = 440, duration = 200) {
        if (!this.settings.sound || !this.audioContext) return;
        
        try {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
            oscillator.type = 'sine';
            
            gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration / 1000);
            
            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + duration / 1000);
        } catch (e) {
            console.log('Sound error:', e);
        }
    }
    
    vibrate(pattern = 50) {
        if (this.settings.vibration && 'vibrate' in navigator) {
            try {
                navigator.vibrate(pattern);
            } catch (e) {
                console.log('Vibration not supported');
            }
        }
    }
    
    loadData() {
        try {
            const saved = localStorage.getItem('piko-game-data');
            if (saved) {
                const data = JSON.parse(saved);
                if (data.settings) this.settings = { ...this.settings, ...data.settings };
                if (data.highScores) this.highScores = data.highScores;
                if (data.achievements) {
                    data.achievements.forEach(saved => {
                        const achievement = this.achievements.find(a => a.id === saved.id);
                        if (achievement) {
                            achievement.unlocked = saved.unlocked;
                            if (saved.progress !== undefined) {
                                achievement.progress = saved.progress;
                            }
                        }
                    });
                }
            }
        } catch (e) {
            console.log('Load error:', e);
        }
    }
    
    saveData() {
        try {
            const data = {
                settings: this.settings,
                highScores: this.highScores,
                achievements: this.achievements.map(a => ({
                    id: a.id,
                    unlocked: a.unlocked,
                    progress: a.progress
                }))
            };
            localStorage.setItem('piko-game-data', JSON.stringify(data));
        } catch (e) {
            console.log('Save error:', e);
        }
    }
}

// Global functions for inline event handlers (backup)
window.startGame = () => {
    console.log('Global startGame called');
    if (game) game.startGame();
};

window.showSettings = () => {
    console.log('Global showSettings called');
    if (game) game.showSettings();
};

window.showAchievements = () => {
    console.log('Global showAchievements called');
    if (game) game.showAchievements();
};

window.showLeaderboard = () => {
    console.log('Global showLeaderboard called');
    if (game) game.showLeaderboard();
};

// Initialize when DOM is ready
function initGame() {
    console.log('*** INITIALIZING PIKO GAME ***');
    if (!game) {
        game = new Game();
        window.game = game;
    }
}

// Multiple initialization attempts
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGame);
} else {
    initGame();
}

// Fallback initialization
setTimeout(initGame, 100);
setTimeout(initGame, 500);
setTimeout(initGame, 1000);

// Prevent double tap zoom and context menu
document.addEventListener('touchend', function(e) {
    const now = Date.now();
    if (now - (window.lastTouchEnd || 0) <= 300) {
        e.preventDefault();
    }
    window.lastTouchEnd = now;
}, false);

document.addEventListener('contextmenu', e => e.preventDefault());

// Handle orientation changes
window.addEventListener('orientationchange', () => {
    setTimeout(() => {
        const canvas = document.getElementById('game-canvas');
        if (canvas) {
            canvas.width = 390;
            canvas.height = 844;
        }
    }, 100);
});

console.log('*** PIKO GAME LOADED ***');