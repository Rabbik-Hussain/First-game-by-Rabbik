// ==========================================
// LOCALSTORAGE CORE LOGIC (SAVE & LOAD)
// ==========================================

function saveGameState(gameId, currentLevel, score) {
    const gameData = {
        level: currentLevel,
        score: score,
        lastUpdated: new Date().getTime()
    };
    localStorage.setItem(`game_${gameId}_data`, JSON.stringify(gameData));
    localStorage.setItem('active_game_id', `game_${gameId}`);
}

function loadGameState(gameId) {
    const savedData = localStorage.getItem(`game_${gameId}_data`);
    if (savedData) {
        return JSON.parse(savedData);
    }
    return { level: 1, score: 0 };
}

// ==========================================
// GLOBAL STATE & UTILITIES
// ==========================================

let totalScore = 0;
let currentGameIndex = 0;

function toBanglaNum(num) {
    if (num === Infinity) return "অসীম (∞)";
    if (num === null || num === undefined) return "০";
    const digits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
    return num.toString().replace(/\d/g, d => digits[d]);
}

function playSound(type) {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        if (type === 'success') {
            osc.frequency.setValueAtTime(440, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.2);
        } else if (type === 'fail') {
            osc.frequency.setValueAtTime(300, ctx.currentTime);
            osc.frequency.linearRampToValueAtTime(150, ctx.currentTime + 0.25);
        } else {
            osc.frequency.setValueAtTime(600, ctx.currentTime);
        }
        gain.gain.fadeOut(0.2);
        osc.start(); osc.stop(ctx.currentTime + 0.2);
    } catch (e) {}
}

function updateGlobalScore(pts) { 
    totalScore += pts; 
    const scoreElem = document.getElementById('total-score');
    if (scoreElem) scoreElem.innerText = toBanglaNum(totalScore); 
}

function triggerConfetti() { 
    if (typeof confetti === 'function') confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } }); 
}

function switchGame(index) {
    playSound('click');
    currentGameIndex = index;
    document.querySelectorAll('.tab-btn').forEach((btn, i) => btn.classList.toggle('active', i === index));
    document.querySelectorAll('.game-card').forEach((card, i) => card.classList.toggle('active', i === index));
    
    const devTitle = document.getElementById('dev-title');
    if (devTitle) devTitle.className = `style-theme-${index}`;

    localStorage.setItem('active_game_id', `game_${index + 1}`);
}

// ==========================================
// GAME LOGICS
// ==========================================

// GAME 1: Progressive Guessing (Infinity)
let g1 = { level: 1, secret: 0, attemptsLeft: 5, min: 1, max: 10 };
function initGame1() {
    g1.min = 1; g1.max = g1.level * 10;
    g1.secret = Math.floor(Math.random() * (g1.max - g1.min + 1)) + g1.min;
    g1.attemptsLeft = Math.max(3, 6 - Math.floor(g1.level / 5));
    
    const elemLvl = document.getElementById('g1-level');
    const elemMin = document.getElementById('g1-min');
    const elemMax = document.getElementById('g1-max');
    const elemAtt = document.getElementById('g1-attempts');
    const elemBar = document.getElementById('g1-prox-bar');
    const elemHis = document.getElementById('g1-history');

    if (elemLvl) elemLvl.innerText = toBanglaNum(g1.level);
    if (elemMin) elemMin.innerText = toBanglaNum(g1.min);
    if (elemMax) elemMax.innerText = toBanglaNum(g1.max);
    if (elemAtt) elemAtt.innerText = toBanglaNum(g1.attemptsLeft);
    if (elemBar) elemBar.style.width = '0%';
    if (elemHis) elemHis.innerHTML = '';
}

function guessNumber() {
    const input = document.getElementById('g1-input');
    if (!input) return;
    const val = parseInt(input.value);
    if (isNaN(val)) return;
    
    g1.attemptsLeft--;
    const elemAtt = document.getElementById('g1-attempts');
    if (elemAtt) elemAtt.innerText = toBanglaNum(g1.attemptsLeft);
    
    const closeness = Math.max(0, 100 - (Math.abs(g1.secret - val) / (g1.max - g1.min)) * 100);
    const elemBar = document.getElementById('g1-prox-bar');
    if (elemBar) elemBar.style.width = closeness + '%';

    const elemMsg = document.getElementById('g1-msg');

    if (val === g1.secret) {
        playSound('success'); triggerConfetti(); updateGlobalScore(g1.level * 10);
        g1.level++; 
        saveGameState('1', g1.level, totalScore);
        initGame1();
        if (elemMsg) elemMsg.innerText = 'সঠিক উত্তর! পরের কঠিন লেভেলে উন্নীত হচ্ছেন...';
    } else if (g1.attemptsLeft <= 0) {
        playSound('fail'); g1.level = 1; initGame1();
        if (elemMsg) elemMsg.innerText = `গেম ওভার! সঠিক সংখ্যা ছিল ${toBanglaNum(g1.secret)}`;
    } else {
        playSound('fail');
        if (elemMsg) elemMsg.innerText = val < g1.secret ? 'বড় সংখ্যা ভাবুন!' : 'ছোট সংখ্যা ভাবুন!';
    }
    input.value = '';
}

// GAME 2: Memory Flash (Infinity)
let g2 = { stage: 1, num: '' };
function startMemoryRound() {
    const startBtn = document.getElementById('g2-start-btn');
    if (startBtn) startBtn.style.display = 'none';
    let digits = g2.stage + 2; g2.num = '';
    for (let i = 0; i < digits; i++) g2.num += Math.floor(Math.random() * 9) + 1;
    
    const disp = document.getElementById('g2-display');
    if (disp) disp.innerText = toBanglaNum(g2.num);
    
    setTimeout(() => {
        if (disp) disp.innerText = '?'.repeat(digits);
        const inputGroup = document.getElementById('g2-input-group');
        if (inputGroup) inputGroup.style.display = 'flex';
    }, Math.max(1000, 3000 - g2.stage * 150));
}

function checkMemory() {
    const input = document.getElementById('g2-input');
    const val = input ? input.value : '';
    const elemStage = document.getElementById('g2-stage');
    const elemMsg = document.getElementById('g2-msg');

    if (val === g2.num) {
        playSound('success'); triggerConfetti(); updateGlobalScore(15); g2.stage++;
        saveGameState('2', g2.stage, totalScore);
        if (elemStage) elemStage.innerText = toBanglaNum(g2.stage);
        if (elemMsg) elemMsg.innerText = 'চমৎকার স্মৃতিশক্তি!';
    } else {
        playSound('fail'); g2.stage = 1; 
        if (elemStage) elemStage.innerText = toBanglaNum(g2.stage);
        if (elemMsg) elemMsg.innerText = `ভুল! সঠিক সংখ্যাটি ছিল ${toBanglaNum(g2.num)}`;
    }
    if (input) input.value = '';
    const inputGroup = document.getElementById('g2-input-group');
    const startBtn = document.getElementById('g2-start-btn');
    if (inputGroup) inputGroup.style.display = 'none';
    if (startBtn) startBtn.style.display = 'block';
}

// GAME 3: Speed Math
let g3 = { timer: 30, interval: null, ans: 0, round: 1 };
function startSpeedMath() {
    g3.timer = 30; g3.round = 1; 
    const startBtn = document.getElementById('g3-start-btn');
    if (startBtn) startBtn.style.display = 'none';
    
    nextSpeedProblem();
    if (g3.interval) clearInterval(g3.interval);
    g3.interval = setInterval(() => {
        g3.timer--; 
        const timerElem = document.getElementById('g3-timer');
        if (timerElem) timerElem.innerText = toBanglaNum(g3.timer);
        if (g3.timer <= 0) { 
            clearInterval(g3.interval); 
            playSound('fail'); 
            if (startBtn) startBtn.style.display = 'block'; 
        }
    }, 1000);
}

function nextSpeedProblem() {
    const max = 10 + g3.round * 5, n1 = Math.floor(Math.random() * max) + 1, n2 = Math.floor(Math.random() * max) + 1;
    const isPlus = Math.random() > 0.5; g3.ans = isPlus ? n1 + n2 : n1 - n2;
    
    const probElem = document.getElementById('g3-problem');
    if (probElem) probElem.innerText = `${toBanglaNum(n1)} ${isPlus ? '+' : '-'} ${toBanglaNum(n2)} = ?`;
    
    let opts = [g3.ans]; 
    while (opts.length < 4) { 
        let f = g3.ans + Math.floor(Math.random() * 10) - 5; 
        if (!opts.includes(f)) opts.push(f); 
    }
    opts.sort(() => Math.random() - 0.5);

    document.querySelectorAll('#g3-options .opt-btn').forEach((btn, i) => {
        btn.innerText = toBanglaNum(opts[i]);
        btn.className = 'opt-btn';
        btn.onclick = () => {
            if (opts[i] === g3.ans) {
                btn.classList.add('correct');
                playSound('success'); updateGlobalScore(5); g3.round++; g3.timer += 1;
                saveGameState('3', g3.round, totalScore);
                setTimeout(nextSpeedProblem, 300);
            } else {
                btn.classList.add('wrong');
                playSound('fail');
                setTimeout(() => btn.classList.remove('wrong'), 400);
            }
        };
    });
}

// GAME 4: Pattern Puzzle
let g4Lvl = 1;
function generatePatternGame() {
    const grid = document.getElementById('g4-grid'); 
    if (!grid) return;
    grid.innerHTML = '';
    
    const lvlElem = document.getElementById('g4-level');
    if (lvlElem) lvlElem.innerText = toBanglaNum(g4Lvl);
    
    const base = Math.floor(Math.random() * 20) + 1, step = Math.floor(Math.random() * 5) + 2, oddIdx = Math.floor(Math.random() * 4);
    
    for (let i = 0; i < 4; i++) {
        let num = (i === oddIdx) ? base + (i * step) + 3 : base + (i * step);
        const btn = document.createElement('button'); 
        btn.className = 'pattern-btn'; 
        btn.innerText = toBanglaNum(num);
        btn.onclick = () => {
            if (i === oddIdx) {
                btn.classList.add('correct');
                playSound('success'); triggerConfetti(); updateGlobalScore(10); g4Lvl++;
                saveGameState('4', g4Lvl, totalScore);
                setTimeout(generatePatternGame, 400);
            } else {
                btn.classList.add('wrong');
                playSound('fail');
                setTimeout(() => btn.classList.remove('wrong'), 400);
            }
        };
        grid.appendChild(btn);
    }
}

// GAME 5: Sudoku Master
let currentSudokuBoard = [], solutionSudokuBoard = [], selectedCellIndex = null;
const baseSudoku = [5,3,4,6,7,8,9,1,2, 6,7,2,1,9,5,3,4,8, 1,9,8,3,4,2,5,6,7, 8,5,9,7,6,1,4,2,3, 4,2,6,8,5,3,7,9,1, 7,1,3,9,2,4,8,5,6, 9,6,1,5,3,7,2,8,4, 2,8,7,4,1,9,6,3,5, 3,4,5,2,8,6,1,7,9];

function generateSudoku() {
    solutionSudokuBoard = [...baseSudoku]; currentSudokuBoard = [...solutionSudokuBoard];
    let removed = 0; 
    while(removed < 35) { 
        let idx = Math.floor(Math.random() * 81); 
        if(currentSudokuBoard[idx] !== 0) { 
            currentSudokuBoard[idx] = 0; 
            removed++; 
        } 
    }
    renderSudokuBoard();
}

function renderSudokuBoard() {
    const board = document.getElementById('sudoku-board'); 
    if (!board) return;
    board.innerHTML = '';
    currentSudokuBoard.forEach((val, i) => {
        const cell = document.createElement('div'); cell.className = 's-cell';
        cell.dataset.index = i;
        if (val !== 0) { cell.innerText = toBanglaNum(val); cell.classList.add('fixed'); }
        cell.onclick = () => selectSudokuCell(i);
        board.appendChild(cell);
    });
}

function selectSudokuCell(index) {
    selectedCellIndex = index;
    const cells = document.querySelectorAll('.s-cell');
    cells.forEach(c => c.classList.remove('selected', 'highlight-peer', 'highlight-same'));

    const targetCell = cells[index];
    if (targetCell) targetCell.classList.add('selected');

    const row = Math.floor(index / 9);
    const col = index % 9;
    const boxRow = Math.floor(row / 3) * 3;
    const boxCol = Math.floor(col / 3) * 3;
    const selectedVal = currentSudokuBoard[index];

    cells.forEach((cell, i) => {
        const r = Math.floor(i / 9);
        const c = i % 9;
        const inRow = r === row;
        const inCol = c === col;
        const inBox = r >= boxRow && r < boxRow + 3 && c >= boxCol && c < boxCol + 3;

        if ((inRow || inCol || inBox) && i !== index) {
            cell.classList.add('highlight-peer');
        }

        if (selectedVal !== 0 && currentSudokuBoard[i] === selectedVal && i !== index) {
            cell.classList.add('highlight-same');
        }
    });
}

function inputSudokuNumber(num) {
    if (selectedCellIndex === null) return;
    const cells = document.querySelectorAll('.s-cell');
    const targetCell = cells[selectedCellIndex];

    if (!targetCell || targetCell.classList.contains('fixed')) return;

    if (num === 0) {
        currentSudokuBoard[selectedCellIndex] = 0;
        targetCell.innerText = '';
        targetCell.classList.remove('correct-val', 'wrong-val');
        playSound('click');
        selectSudokuCell(selectedCellIndex);
        return;
    }

    currentSudokuBoard[selectedCellIndex] = num;
    targetCell.innerText = toBanglaNum(num);

    if (num === solutionSudokuBoard[selectedCellIndex]) {
        targetCell.classList.remove('wrong-val');
        targetCell.classList.add('correct-val');
        playSound('success');
    } else {
        targetCell.classList.remove('correct-val');
        targetCell.classList.add('wrong-val');
        playSound('fail');
    }

    selectSudokuCell(selectedCellIndex);
}

function checkSudokuSolution() {
    let ok = currentSudokuBoard.every((val, i) => val === solutionSudokuBoard[i]);
    const msgElem = document.getElementById('sudoku-msg');
    if (ok) {
        playSound('success'); triggerConfetti(); updateGlobalScore(50);
        saveGameState('5', 1, totalScore);
        if (msgElem) msgElem.innerText = 'অসাধারণ! সুডোকু মেলানো সম্পন্ন হয়েছে!';
        setTimeout(generateSudoku, 1500);
    } else {
        playSound('fail');
        if (msgElem) msgElem.innerText = 'এখনও কিছু লাল ঘর ভুল আছে, দয়া করে সংশোধন করুন!';
    }
}

// ==========================================
// BONUS GAME: Magic Square (Strict Rule Implementation)
// ==========================================
let g6Size = 3;

function generateMagicSquare() {
    const board = document.getElementById('magic-board'); 
    if (!board) return;
    board.innerHTML = '';
    board.style.gridTemplateColumns = `repeat(${g6Size}, 1fr)`;
    
    const sizeElem = document.getElementById('g6-size-text');
    if (sizeElem) sizeElem.innerText = `${toBanglaNum(g6Size)}×${toBanglaNum(g6Size)}`;
    
    let targetSum = (g6Size * (g6Size * g6Size + 1)) / 2;
    const sumElem = document.getElementById('g6-magic-sum');
    if (sumElem) sumElem.innerText = toBanglaNum(targetSum);

    for (let i = 0; i < g6Size * g6Size; i++) {
        const input = document.createElement('input');
        input.type = 'number'; 
        input.className = 'm-cell';
        board.appendChild(input);
    }
}

function checkMagicSquare() {
    const inputs = document.querySelectorAll('.m-cell');
    const msgElem = document.getElementById('g6-msg');
    
    if (inputs.length !== g6Size * g6Size) return;

    let grid = [];
    let vals = [];
    let index = 0;
    
    for (let r = 0; r < g6Size; r++) {
        let row = [];
        for (let c = 0; c < g6Size; c++) {
            let val = parseInt(inputs[index].value);
            if (isNaN(val)) {
                playSound('fail');
                if (msgElem) msgElem.innerText = 'সবগুলো ঘর সঠিক সংখ্যা দিয়ে পূরণ করুন!';
                return;
            }
            row.push(val);
            vals.push(val);
            index++;
        }
        grid.push(row);
    }

    let totalCells = g6Size * g6Size;
    let uniqueVals = new Set(vals);
    if (uniqueVals.size !== totalCells) {
        playSound('fail');
        if (msgElem) msgElem.innerText = `সবগুলো সংখ্যা আলাদা হতে হবে এবং ১ থেকে ${toBanglaNum(totalCells)} পর্যন্ত সংখ্যা ব্যবহার করতে হবে!`;
        return;
    }

    for (let v of vals) {
        if (v < 1 || v > totalCells) {
            playSound('fail');
            if (msgElem) msgElem.innerText = `প্রতিটি সংখ্যা ১ থেকে ${toBanglaNum(totalCells)}-এর মধ্যে হতে হবে!`;
            return;
        }
    }

    let targetSum = (g6Size * (g6Size * g6Size + 1)) / 2;
    let diag1Sum = 0;
    let diag2Sum = 0;

    for (let i = 0; i < g6Size; i++) {
        let rowSum = 0;
        let colSum = 0;
        for (let j = 0; j < g6Size; j++) {
            rowSum += grid[i][j];
            colSum += grid[j][i];
        }
        if (rowSum !== targetSum || colSum !== targetSum) {
            playSound('fail');
            if (msgElem) msgElem.innerText = `ভুল হয়েছে! প্রতিটি সারি ও কলামের যোগফল ${toBanglaNum(targetSum)} হতে হবে।`;
            return;
        }
    }

    for (let i = 0; i < g6Size; i++) {
        diag1Sum += grid[i][i];
        diag2Sum += grid[i][g6Size - 1 - i];
    }

    if (diag1Sum !== targetSum || diag2Sum !== targetSum) {
        playSound('fail');
        if (msgElem) msgElem.innerText = `ভুল হয়েছে! কর্ণ দুটির (Diagonals) যোগফলও ${toBanglaNum(targetSum)} হতে হবে।`;
        return;
    }

    playSound('success'); 
    triggerConfetti(); 
    updateGlobalScore(30);
    
    if (g6Size < 5) g6Size++; 
    else g6Size = 3;
    
    saveGameState('6', g6Size, totalScore);
    generateMagicSquare();
    
    if (msgElem) msgElem.innerText = 'অসাধারণ! ম্যাজিক স্কয়ার সফলভাবে মিলে গেছে!';
}

// GAME 6: Missing Operator (Fixed Division Operator Logic)
let g7Lvl = 1, g7Ans = '+';
function generateOperatorGame() {
    const ops = ['+', '-', '×', '÷']; 
    g7Ans = ops[Math.floor(Math.random() * ops.length)];
    let n1 = Math.floor(Math.random() * 10) + 1, n2 = Math.floor(Math.random() * 10) + 1, res = 0;
    
    if (g7Ans === '+') res = n1 + n2; 
    else if (g7Ans === '-') res = n1 - n2; 
    else if (g7Ans === '×') res = n1 * n2;
    else if (g7Ans === '÷') {
        res = n1;
        n1 = n1 * n2;
    }
    
    const lvlElem = document.getElementById('g7-level');
    if (lvlElem) lvlElem.innerText = toBanglaNum(g7Lvl);

    const eqnElem = document.getElementById('g7-eqn');
    if (eqnElem) eqnElem.innerText = `${toBanglaNum(n1)} ? ${toBanglaNum(n2)} = ${toBanglaNum(res)}`;
}

function checkOperator(op) {
    const btns = document.querySelectorAll('#game-6 .opt-btn');
    btns.forEach(btn => {
        if (btn.innerText.trim() === op) {
            if (op === g7Ans) {
                btn.classList.add('correct');
                playSound('success'); triggerConfetti(); updateGlobalScore(10); g7Lvl++;
                saveGameState('7', g7Lvl, totalScore);
                setTimeout(() => {
                    btn.classList.remove('correct');
                    generateOperatorGame();
                }, 400);
            } else {
                btn.classList.add('wrong');
                playSound('fail');
                setTimeout(() => btn.classList.remove('wrong'), 400);
            }
        }
    });
}

// GAME 7: Number Matrix Finder
let g8Lvl = 1, g8Target = 0;
function generateMatrixGame() {
    const grid = document.getElementById('g8-grid'); 
    if (!grid) return;
    grid.innerHTML = '';
    
    const lvlElem = document.getElementById('g8-level');
    if (lvlElem) lvlElem.innerText = toBanglaNum(g8Lvl);

    let nums = []; 
    for (let i = 0; i < 8; i++) nums.push(Math.floor(Math.random() * 50) + 1);
    const evens = nums.filter(n => n % 2 === 0);
    if (evens.length === 0) nums[0] = 2;
    g8Target = Math.max(...nums.filter(n => n % 2 === 0));
    
    nums.forEach(n => {
        const btn = document.createElement('button'); btn.className = 'matrix-btn'; btn.innerText = toBanglaNum(n);
        btn.onclick = () => {
            if (n === g8Target) { 
                playSound('success'); triggerConfetti(); updateGlobalScore(10); g8Lvl++; 
                saveGameState('8', g8Lvl, totalScore);
                generateMatrixGame(); 
            } else playSound('fail');
        };
        grid.appendChild(btn);
    });
}

// GAME 8: Sequence Builder
let g9Lvl = 1, g9Seq = [], g9Step = 0;
function startSequenceGame() {
    const grid = document.getElementById('g9-grid'); 
    if (!grid) return;
    grid.innerHTML = ''; g9Seq = []; g9Step = 0;
    
    let count = Math.min(12, 3 + g9Lvl);
    const lvlElem = document.getElementById('g9-level');
    if (lvlElem) lvlElem.innerText = toBanglaNum(g9Lvl);
    
    while (g9Seq.length < count) { 
        let r = Math.floor(Math.random() * (20 + g9Lvl * 10)) + 1; 
        if (!g9Seq.includes(r)) g9Seq.push(r); 
    }
    let sorted = [...g9Seq].sort((a,b) => a - b);
    
    const startBtn = document.getElementById('g9-start-btn');
    const msgElem = document.getElementById('g9-msg');
    if (startBtn) startBtn.innerText = 'পুনরায় শুরু করুন';
    if (msgElem) msgElem.innerText = 'ছোট থেকে বড় ক্রমানুসারে মেলান!';

    g9Seq.forEach(n => {
        const btn = document.createElement('button'); btn.className = 'seq-btn'; btn.innerText = toBanglaNum(n);
        btn.onclick = () => {
            if (n === sorted[g9Step]) {
                playSound('success'); btn.style.background = '#10b981'; btn.style.color = '#fff'; g9Step++;
                if (g9Step === count) {
                    triggerConfetti(); updateGlobalScore(15); g9Lvl++;
                    saveGameState('9', g9Lvl, totalScore);
                    if (msgElem) msgElem.innerText = 'লেভেল সম্পূর্ণ! পরের কঠিন লেভেলে যাচ্ছেন...';
                    setTimeout(startSequenceGame, 1200);
                }
            } else {
                playSound('fail'); btn.style.background = '#ef4444';
                if (msgElem) msgElem.innerText = 'ভুল নির্বাচন! আবার চেষ্টা করুন।';
            }
        };
        grid.appendChild(btn);
    });
}

// GAME 9: Quick Math Reflex
let g10Ans = true, g10Score = 0;
function generateReflex() {
    let n1 = Math.floor(Math.random() * 15) + 1, n2 = Math.floor(Math.random() * 15) + 1;
    g10Ans = Math.random() > 0.5;
    let res = g10Ans ? n1 + n2 : n1 + n2 + Math.floor(Math.random() * 4) + 1;
    
    const eqnElem = document.getElementById('g10-eqn');
    if (eqnElem) eqnElem.innerText = `${toBanglaNum(n1)} + ${toBanglaNum(n2)} = ${toBanglaNum(res)}`;
}

function checkReflex(val) {
    const trueBtn = document.querySelector('.true-btn');
    const falseBtn = document.querySelector('.false-btn');
    const targetBtn = val ? trueBtn : falseBtn;

    if (val === g10Ans) {
        if (targetBtn) targetBtn.classList.add('correct');
        playSound('success'); updateGlobalScore(5); g10Score++; 
        
        const scoreElem = document.getElementById('g10-score');
        if (scoreElem) scoreElem.innerText = toBanglaNum(g10Score);
        
        saveGameState('10', g10Score, totalScore);
        setTimeout(() => {
            if (targetBtn) targetBtn.classList.remove('correct');
            generateReflex();
        }, 300);
    } else {
        if (targetBtn) targetBtn.classList.add('wrong');
        playSound('fail');
        setTimeout(() => { if (targetBtn) targetBtn.classList.remove('wrong'); }, 400);
    }
}

// GAME 10: Wooden Sliding Number Puzzle
let g11GridSize = 2, woodenTiles = [];
function initWoodenPuzzle() {
    const sizeElem = document.getElementById('g11-grid-size');
    if (sizeElem) sizeElem.innerText = `${toBanglaNum(g11GridSize)}×${toBanglaNum(g11GridSize)}`;
    
    const board = document.getElementById('wooden-board'); 
    if (!board) return;
    board.innerHTML = '';
    board.style.gridTemplateColumns = `repeat(${g11GridSize}, 1fr)`;

    let total = g11GridSize * g11GridSize; woodenTiles = [];
    for (let i = 1; i < total; i++) woodenTiles.push(i);
    woodenTiles.push(0);

    do { woodenTiles.sort(() => Math.random() - 0.5); } while (!isSolvable(woodenTiles, g11GridSize));

    renderWoodenBoard();
}

function renderWoodenBoard() {
    const board = document.getElementById('wooden-board'); 
    if (!board) return;
    board.innerHTML = '';
    woodenTiles.forEach((num, index) => {
        const tile = document.createElement('div');
        tile.className = 'w-tile' + (num === 0 ? ' empty' : '');
        if (num !== 0) tile.innerText = toBanglaNum(num);
        tile.onclick = () => moveWoodenTile(index);
        board.appendChild(tile);
    });
}

function moveWoodenTile(index) {
    const emptyIndex = woodenTiles.indexOf(0);
    const row = Math.floor(index / g11GridSize), col = index % g11GridSize;
    const emptyRow = Math.floor(emptyIndex / g11GridSize), emptyCol = emptyIndex % g11GridSize;

    if ((Math.abs(row - emptyRow) === 1 && col === emptyCol) || (Math.abs(col - emptyCol) === 1 && row === emptyRow)) {
        playSound('click');
        [woodenTiles[index], woodenTiles[emptyIndex]] = [woodenTiles[emptyIndex], woodenTiles[index]];
        renderWoodenBoard(); checkWoodenWin();
    }
}

function checkWoodenWin() {
    let win = true;
    for (let i = 0; i < woodenTiles.length - 1; i++) {
        if (woodenTiles[i] !== i + 1) { win = false; break; }
    }
    const msgElem = document.getElementById('g11-msg');
    if (win) {
        playSound('success'); triggerConfetti(); updateGlobalScore(40);
        if (g11GridSize < 10) g11GridSize++;
        saveGameState('11', g11GridSize, totalScore);
        if (msgElem) msgElem.innerText = 'অভিনন্দন! আপনি সঠিক সিকুয়েন্সে সাজিয়েছেন!';
        setTimeout(initWoodenPuzzle, 1500);
    }
}

function isSolvable(arr, size) {
    let inv = 0;
    for (let i = 0; i < arr.length; i++) {
        for (let j = i + 1; j < arr.length; j++) {
            if (arr[i] && arr[j] && arr[i] > arr[j]) inv++;
        }
    }
    if (size % 2 !== 0) return inv % 2 === 0;
    let emptyRowFromBottom = size - Math.floor(arr.indexOf(0) / size);
    return emptyRowFromBottom % 2 === 0 ? inv % 2 !== 0 : inv % 2 === 0;
}

// ==========================================
// INITIALIZATIONS & AUTO LOAD LOGIC
// ==========================================

window.addEventListener('DOMContentLoaded', () => {
    const stateG1 = loadGameState('1');
    if (stateG1.level) g1.level = stateG1.level;

    const stateG2 = loadGameState('2');
    if (stateG2.level) {
        g2.stage = stateG2.level;
        const g2StageElem = document.getElementById('g2-stage');
        if (g2StageElem) g2StageElem.innerText = toBanglaNum(g2.stage);
    }

    const stateG3 = loadGameState('3');
    if (stateG3.level) g3.round = stateG3.level;

    const stateG4 = loadGameState('4');
    if (stateG4.level) g4Lvl = stateG4.level;

    const stateG6 = loadGameState('6');
    if (stateG6.level) g6Size = stateG6.level;

    const stateG7 = loadGameState('7');
    if (stateG7.level) g7Lvl = stateG7.level;

    const stateG8 = loadGameState('8');
    if (stateG8.level) g8Lvl = stateG8.level;

    const stateG9 = loadGameState('9');
    if (stateG9.level) g9Lvl = stateG9.level;

    const stateG10 = loadGameState('10');
    if (stateG10.level) {
        g10Score = stateG10.level;
        const scoreElem = document.getElementById('g10-score');
        if (scoreElem) scoreElem.innerText = toBanglaNum(g10Score);
    }

    const stateG11 = loadGameState('11');
    if (stateG11.level) g11GridSize = stateG11.level;

    totalScore = Math.max(
        stateG1.score || 0, stateG2.score || 0, stateG3.score || 0,
        stateG4.score || 0, stateG6.score || 0, stateG7.score || 0,
        stateG8.score || 0, stateG9.score || 0, stateG10.score || 0, stateG11.score || 0
    );
    updateGlobalScore(0);

    const lastActiveGame = localStorage.getItem('active_game_id') || 'game_1';
    const gameIndex = parseInt(lastActiveGame.replace('game_', '')) - 1;
    switchGame(isNaN(gameIndex) || gameIndex < 0 ? 0 : gameIndex);

    initGame1(); 
    generatePatternGame(); 
    generateSudoku(); 
    generateMagicSquare(); 
    generateOperatorGame(); 
    generateMatrixGame(); 
    generateReflex(); 
    initWoodenPuzzle();
});
