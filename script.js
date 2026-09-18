/* 1. WEB AUDIO SYNTHESIZER */

    class TactileAudioEngine {
      constructor() {
        this.ctx = null;
        this.enabled = true;
      }
      init() {
        if (!this.ctx) {
          const AudioCtx = window.AudioContext || window.webkitAudioContext;
          this.ctx = new AudioCtx();
        }
      }
      playClick(isOperator = false, isEqual = false) {
        if (!this.enabled) return;
        this.init();
        if (this.ctx.state === 'suspended') this.ctx.resume();

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        if (isEqual) {
          osc.type = 'sine';
          osc.frequency.setValueAtTime(440, now);
          osc.frequency.exponentialRampToValueAtTime(880, now + 0.12);

          gain.gain.setValueAtTime(0.1, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(now);
          osc.stop(now + 0.2);
        } else {
          osc.type = isOperator ? 'triangle' : 'square';
          osc.frequency.setValueAtTime(isOperator ? 320 : 200, now);
          osc.frequency.exponentialRampToValueAtTime(30, now + 0.035);

          gain.gain.setValueAtTime(0.06, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);

          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(now);
          osc.stop(now + 0.035);
        }
      }
    }
    const sound = new TactileAudioEngine();

    /* 2. GENTLE & SMOOTH 3D TILT (LERP INTERPOLATION) */

    const stage = document.getElementById('calculatorStage');
    let targetRotX = 0;
    let targetRotY = 0;
    let currentRotX = 0;
    let currentRotY = 0;

    // Reduced tilt range (max ~4.5 degrees) for sleek subtle depth
    window.addEventListener('mousemove', (e) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 2;
      const y = (e.clientY / window.innerHeight - 0.5) * 2;

      targetRotX = -y * 4.5;
      targetRotY = x * 4.5;
    });

    window.addEventListener('mouseleave', () => {
      targetRotX = 0;
      targetRotY = 0;
    });

    function smoothAnimateTilt() {
      // 0.08 damping factor gives a silky, buttery float
      currentRotX += (targetRotX - currentRotX) * 0.08;
      currentRotY += (targetRotY - currentRotY) * 0.08;

      stage.style.transform = `rotateX(${currentRotX.toFixed(3)}deg) rotateY(${currentRotY.toFixed(3)}deg)`;
      requestAnimationFrame(smoothAnimateTilt);
    }
    smoothAnimateTilt();

    /* 3. BULLETPROOF CALCULATION ENGINE*/

    const opSymbols = { add: '+', subtract: '−', multiply: '×', divide: '÷', pow: '^' };

    class CalculatorEngine {
      constructor() {
        this.currentValue = '0';
        this.previousValue = null;
        this.activeOperator = null;
        this.expressionTape = '';
        this.isResultState = false;
        this.history = [];
      }

      inputDigit(digit) {
        if (this.currentValue === '0' || this.isResultState) {
          this.currentValue = digit;
          this.isResultState = false;
        } else {
          if (this.currentValue.length < 14) {
            this.currentValue += digit;
          }
        }
        this.updateLiveExpression();
      }

      inputDecimal() {
        if (this.isResultState) {
          this.currentValue = '0.';
          this.isResultState = false;
          this.updateLiveExpression();
          return;
        }
        if (!this.currentValue.includes('.')) {
          this.currentValue += '.';
          this.updateLiveExpression();
        }
      }

      setOperator(op) {
        if (this.activeOperator && !this.isResultState) {
          this.calculate();
        }
        this.previousValue = this.currentValue;
        this.activeOperator = op;
        this.isResultState = true;
        this.expressionTape = `${this.previousValue} ${opSymbols[op]}`;
      }

      updateLiveExpression() {
        if (this.activeOperator && this.previousValue !== null) {
          this.expressionTape = `${this.previousValue} ${opSymbols[this.activeOperator]} ${this.currentValue}`;
        } else {
          this.expressionTape = '';
        }
      }

      calculate() {
        if (!this.activeOperator || this.previousValue === null) return;

        const prev = parseFloat(this.previousValue);
        const curr = parseFloat(this.currentValue);
        let res = 0;

        switch (this.activeOperator) {
          case 'add': res = prev + curr; break;
          case 'subtract': res = prev - curr; break;
          case 'multiply': res = prev * curr; break;
          case 'divide':
            if (curr === 0) {
              this.currentValue = 'Error';
              this.expressionTape = 'Cannot divide by 0';
              this.resetAfterError();
              return;
            }
            res = prev / curr;
            break;
          case 'pow': res = Math.pow(prev, curr); break;
        }

        res = this.formatResult(res);

        // Record history
        const fullExpr = `${this.previousValue} ${opSymbols[this.activeOperator]} ${this.currentValue} =`;
        this.history.unshift({ expression: fullExpr, result: res.toString() });

        // Update display states
        this.expressionTape = fullExpr;
        this.currentValue = res.toString();
        this.previousValue = null;
        this.activeOperator = null;
        this.isResultState = true;
      }

      formatResult(num) {
        if (isNaN(num) || !isFinite(num)) return 'Error';
        // Remove floating-point precision quirks like 0.1 + 0.2 = 0.30000000000000004
        return parseFloat(num.toPrecision(12));
      }

      applyScientific(action) {
        const val = parseFloat(this.currentValue);
        let res = 0;

        switch (action) {
          case 'sin': res = Math.sin(val * Math.PI / 180); break;
          case 'cos': res = Math.cos(val * Math.PI / 180); break;
          case 'tan': res = Math.tan(val * Math.PI / 180); break;
          case 'log': res = Math.log10(val); break;
          case 'ln': res = Math.log(val); break;
          case 'sqrt': res = Math.sqrt(val); break;
          case 'pi': res = Math.PI; break;
          case 'e': res = Math.E; break;
          case 'fact':
            if (val < 0 || val > 170) res = Infinity;
            else {
              let f = 1;
              for (let i = 2; i <= Math.floor(val); i++) f *= i;
              res = f;
            }
            break;
        }

        res = this.formatResult(res);
        const expr = `${action}(${this.currentValue}) =`;
        this.history.unshift({ expression: expr, result: res.toString() });

        this.expressionTape = expr;
        this.currentValue = res.toString();
        this.isResultState = true;
      }

      negate() {
        this.currentValue = (parseFloat(this.currentValue) * -1).toString();
        this.updateLiveExpression();
      }

      percent() {
        this.currentValue = (parseFloat(this.currentValue) / 100).toString();
        this.updateLiveExpression();
      }

      deleteLast() {
        if (this.isResultState) {
          this.currentValue = '0';
          this.isResultState = false;
        } else if (this.currentValue.length > 1) {
          this.currentValue = this.currentValue.slice(0, -1);
        } else {
          this.currentValue = '0';
        }
        this.updateLiveExpression();
      }

      clearAll() {
        this.currentValue = '0';
        this.previousValue = null;
        this.activeOperator = null;
        this.expressionTape = '';
        this.isResultState = false;
      }

      resetAfterError() {
        this.previousValue = null;
        this.activeOperator = null;
        this.isResultState = true;
      }
    }

    /* 4. UI BINDING & INTERACTIVITY */

    const calc = new CalculatorEngine();
    const mainDisplay = document.getElementById('mainDisplay');
    const expressionView = document.getElementById('expressionView');
    const activeOpBadge = document.getElementById('activeOpBadge');
    const historyList = document.getElementById('historyList');
    const historyDrawer = document.getElementById('historyDrawer');
    const toast = document.getElementById('toast');
    const chassis = document.getElementById('calculatorChassis');

    function updateUI(didCalculate = false) {
      mainDisplay.textContent = calc.currentValue;
      expressionView.textContent = calc.expressionTape;
      
      if (calc.activeOperator && !calc.isResultState) {
        activeOpBadge.textContent = opSymbols[calc.activeOperator] || '';
      } else {
        activeOpBadge.textContent = '';
      }

      // Quick visual feedback pop on calculation
      if (didCalculate) {
        mainDisplay.classList.add('pop');
        setTimeout(() => mainDisplay.classList.remove('pop'), 120);
      }

      renderHistory();
    }

    function renderHistory() {
      if (calc.history.length === 0) {
        historyList.innerHTML = '<div style="text-align:center; color:#555b6d; font-size:12px; margin-top:20px;">No computations logged.</div>';
        return;
      }
      historyList.innerHTML = calc.history.map((item) => `
        <div class="history-item" onclick="restoreHistoryValue('${item.result}')">
          <div class="hist-exp">${item.expression}</div>
          <div class="hist-ans">= ${item.result}</div>
        </div>
      `).join('');
    }

    window.restoreHistoryValue = (val) => {
      calc.currentValue = val;
      calc.isResultState = true;
      calc.expressionTape = `Restored: ${val}`;
      updateUI();
      historyDrawer.classList.remove('open');
      sound.playClick();
    };

    function showToast(msg) {
      toast.textContent = msg;
      toast.classList.add('show');
      setTimeout(() => toast.classList.remove('show'), 1600);
    }

    // Copy to clipboard
    document.getElementById('displayClick').addEventListener('click', async () => {
      try {
        if (!navigator.clipboard || !navigator.clipboard.writeText) {
          throw new Error('Clipboard API unavailable');
        }
        await navigator.clipboard.writeText(calc.currentValue);
        showToast(`Copied ${calc.currentValue}`);
        sound.playClick(true);
      } catch (error) {
        showToast('Copy unavailable');
      }
    });

    // Key Buttons Event Delegation
    document.querySelectorAll('.key-3d').forEach(btn => {
      btn.addEventListener('click', () => {
        const val = btn.getAttribute('data-val');
        const action = btn.getAttribute('data-action');
        let calculated = false;

        if (val !== null) {
          sound.playClick(false);
          calc.inputDigit(val);
        } else if (action) {
          switch (action) {
            case 'clear':
              sound.playClick(false);
              calc.clearAll();
              break;
            case 'delete':
              sound.playClick(false);
              calc.deleteLast();
              break;
            case 'decimal':
              sound.playClick(false);
              calc.inputDecimal();
              break;
            case 'negate':
              sound.playClick(false);
              calc.negate();
              break;
            case 'percent':
              sound.playClick(false);
              calc.percent();
              break;
            case 'add':
            case 'subtract':
            case 'multiply':
            case 'divide':
            case 'pow':
              sound.playClick(true);
              calc.setOperator(action);
              break;
            case 'calculate':
              sound.playClick(false, true);
              calc.calculate();
              calculated = true;
              break;
            case 'pow':
              sound.playClick(true);
              calc.setOperator('pow');
              break;
            default:
              sound.playClick(true);
              calc.applyScientific(action);
              calculated = true;
              break;
          }
        }
        updateUI(calculated);
      });
    });

    /* Keyboard Binding */
    
    const keyMap = {
      '0': '0', '1': '1', '2': '2', '3': '3', '4': '4',
      '5': '5', '6': '6', '7': '7', '8': '8', '9': '9',
      '.': 'decimal',
      '+': 'add',
      '-': 'subtract',
      '*': 'multiply',
      '/': 'divide',
      '%': 'percent',
      'Enter': 'calculate',
      '=': 'calculate',
      'Backspace': 'delete',
      'Escape': 'clear'
    };

    window.addEventListener('keydown', (e) => {
      const match = keyMap[e.key];
      if (!match) {
        if (e.key.toLowerCase() === 's') toggleScientific();
        return;
      }
      e.preventDefault();

      let targetBtn = !isNaN(match) 
        ? document.querySelector(`.key-3d[data-val="${match}"]`)
        : document.querySelector(`.key-3d[data-action="${match}"]`);

      if (targetBtn) {
        targetBtn.classList.add('key-pressed');
        targetBtn.click();
        setTimeout(() => targetBtn.classList.remove('key-pressed'), 100);
      }
    });

    /* Toolbar Actions */

    const sciToggle = document.getElementById('sciToggle');
    const soundToggle = document.getElementById('soundToggle');
    const historyToggle = document.getElementById('historyToggle');
    const closeHistoryBtn = document.getElementById('closeHistoryBtn');

    function toggleScientific() {
      chassis.classList.toggle('scientific-expanded');
      sciToggle.classList.toggle('active');
      sound.playClick(true);
    }

    sciToggle.addEventListener('click', toggleScientific);

    soundToggle.addEventListener('click', () => {
      sound.enabled = !sound.enabled;
      soundToggle.classList.toggle('active', sound.enabled);
      if (sound.enabled) sound.playClick();
    });

    historyToggle.addEventListener('click', () => {
      historyDrawer.classList.toggle('open');
      sound.playClick(true);
    });

    closeHistoryBtn.addEventListener('click', () => {
      historyDrawer.classList.remove('open');
      sound.playClick();
    });
