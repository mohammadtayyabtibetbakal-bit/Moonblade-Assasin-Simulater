(() => {
  "use strict";

  const canvas = document.getElementById("game-canvas");
  const ctx = canvas.getContext("2d");
  const overlay = document.getElementById("screen-overlay");
  const title = document.getElementById("overlay-title");
  const copy = document.getElementById("overlay-copy");
  const overlayEyebrow = document.getElementById("overlay-eyebrow");
  const tutorialControls = document.querySelector(".tutorial-controls");
  const tipLine = document.getElementById("tip-line");
  const startButton = document.getElementById("start-button");
  const startLabel = document.getElementById("start-label");
  const statusLabel = document.getElementById("mission-status");
  const alertCard = document.getElementById("alert-card");
  const toast = document.getElementById("toast");
  const keys = new Set();
  const width = canvas.width;
  const height = canvas.height;

  const chapters = [
    { name: "NIGHTFALL DISTRICT", palette: ["#172127", "#253036", "#29343a", "#364046"] },
    { name: "ASHEN CITADEL", palette: ["#211b1b", "#322626", "#3b302e", "#493a37"] },
    { name: "HOLLOW GARDENS", palette: ["#14201d", "#20312a", "#293a30", "#35483a"] },
    { name: "GLASS COAST", palette: ["#151d2b", "#222f3c", "#2c3946", "#3a4855"] },
    { name: "THE DROWNED CITY", palette: ["#201a28", "#30263b", "#382f44", "#463951"] },
    { name: "IRON CHAPEL", palette: ["#232019", "#353024", "#3e382c", "#4a4233"] },
    { name: "WHITE MAZE", palette: ["#19252b", "#293941", "#33434a", "#405259"] },
    { name: "FALLEN OBSERVATORY", palette: ["#171d2d", "#252e44", "#30394c", "#3c465b"] },
    { name: "CROWN OF NIGHT", palette: ["#281819", "#3b2224", "#452b2d", "#513537"] },
    { name: "ECLIPSE SANCTUM", palette: ["#171421", "#282238", "#342c44", "#403852"] }
  ];
  const storyBeats = [
    "I was found in the ruins of a moon observatory on the night the sky went dark. My heart was a cold silver shard; my shadow moved before I did. The Veiled Star gave me a name: Noct.",
    "The contracts called my targets monsters. Every one carried the same eclipse mark. I followed the silver ink back through the Citadel and learned my orders had been lies.",
    "The shard inside me was not a relic. It was a seed. The Order had shaped a living weapon around it, then sent me to erase every witness—including the people who made me.",
    "In the Observatory, I found the first experiment's journal. Archon Vael had taken the other half of the moon shard. He made me to be his shadow, then feared what I might become.",
    "At the Sanctum, the truth was waiting: Vael would fuse both shards and turn the night into an eternal eclipse. I was never his weapon. I was the one thing he could not control."
  ];
  const powerups = [
    { id: "veilThread", level: 5, name: "Veil Thread", detail: "Veil lasts longer." },
    { id: "moonsteel", level: 10, name: "Moonsteel", detail: "Moonblade strikes reach farther." },
    { id: "duskPulse", level: 15, name: "Dusk Pulse", detail: "Press R to stagger nearby foes." },
    { id: "ghoststep", level: 25, name: "Ghoststep", detail: "Shadow Dash recharges faster." },
    { id: "heartOfDusk", level: 30, name: "Heart of Dusk", detail: "Gain an extra heart." },
    { id: "quietMind", level: 40, name: "Quiet Mind", detail: "Warden sight is reduced." },
    { id: "echoStone", level: 55, name: "Echo Stone", detail: "Moonstones recharge faster." },
    { id: "wraithPace", level: 70, name: "Wraith Pace", detail: "Move faster through every district." },
    { id: "twinCrescent", level: 80, name: "Twin Crescent", detail: "Moonblade strikes reach farther." },
    { id: "eclipseHeart", level: 90, name: "Eclipse Heart", detail: "Gain a heart and empower Dusk Pulse." }
  ];
  let cover = [];
  const starPoints = Array.from({ length: 85 }, (_, i) => ({
    x: (i * 197 + 31) % width,
    y: (i * 113 + 17) % height,
    size: (i % 3) * .32 + .35,
    alpha: .09 + (i % 5) * .025
  }));
  const groundMarks = Array.from({ length: 170 }, (_, i) => ({
    x: (i * 157 + 23) % width,
    y: (i * 89 + 51) % height,
    length: 3 + (i % 4) * 2
  }));

  let state = "tutorial";
  let currentLevel = loadProgress();
  let highestUnlockedLevel = currentLevel;
  let player;
  let guards;
  let boss = null;
  let initialGuardCount = 0;
  let alertLevel = 0;
  let strikeTime = 0;
  let dashTime = 0;
  let dashCooldown = 0;
  let dashVector = { x: 0, y: 0 };
  let cloakTime = 0;
  let cloakCooldown = 0;
  let decoyCooldown = 0;
  let pulseCooldown = 0;
  let decoy;
  let aim = { x: 0, y: 0 };
  let toastTimer = 0;
  let lastFrame = 0;
  let frameHandle = 0;
  const saveKey = "moonblade-highest-level";

  function loadProgress() {
    try {
      const saved = Number(window.localStorage.getItem("moonblade-highest-level"));
      return Number.isInteger(saved) && saved >= 1 && saved <= 100 ? saved : 1;
    } catch (error) {
      console.error("Could not load Moonblade campaign progress.", error);
      return 1;
    }
  }

  function saveProgress(level) {
    try {
      window.localStorage.setItem(saveKey, String(level));
    } catch (error) {
      console.error("Could not save Moonblade campaign progress.", error);
    }
  }

  function hasPowerup(id) {
    const powerup = powerups.find(item => item.id === id);
    return Boolean(powerup && currentLevel >= powerup.level);
  }

  function currentChapter() {
    return chapters[Math.min(chapters.length - 1, Math.floor((currentLevel - 1) / 10))];
  }

  function createCover(level) {
    let seed = (level * 2654435761) >>> 0;
    const random = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    const buildings = [];
    for (let column = 0; column < 4; column++) {
      const x = 225 + column * 176 + (random() - .5) * 28;
      buildings.push({
        x,
        y: 72 + random() * 18,
        w: 94 + random() * 34,
        h: 78 + random() * 29
      });
      buildings.push({
        x: x + (random() - .5) * 22,
        y: 450 + random() * 16,
        w: 91 + random() * 35,
        h: 72 + random() * 28
      });
    }
    return buildings;
  }

  function createGuards() {
    const count = Math.min(10, 4 + Math.floor((currentLevel - 1) / 12));
    return Array.from({ length: count }, (_, index) => {
      const x = 220 + index * (590 / Math.max(1, count - 1));
      const y = index % 2 === 0 ? 272 : 397;
      const points = [
        { x: x - 38, y },
        { x: x + 38, y },
        { x: x + 38, y: y + (y < 330 ? 16 : -16) },
        { x: x - 38, y: y + (y < 330 ? 16 : -16) }
      ];
      return {
        x,
        y,
        points,
        pointIndex: 1,
        angle: 0,
        state: "patrol",
        alertTimer: 0,
        investigate: null,
        cooldown: index * .15,
        stunTimer: 0
      };
    });
  }

  function resetGame() {
    cover = createCover(currentLevel);
    const maxHealth = 3 + (hasPowerup("heartOfDusk") ? 1 : 0) + (hasPowerup("eclipseHeart") ? 1 : 0);
    player = {
      x: 110,
      y: 323,
      angle: 0,
      speed: 157 + (hasPowerup("wraithPace") ? 15 : 0),
      health: maxHealth,
      maxHealth,
      invulnerable: 0
    };
    boss = currentLevel === 100
      ? { x: 826, y: 323, angle: Math.PI, health: 7, maxHealth: 7, state: "approach", timer: 0, cooldown: 1.2, hitFlash: 0 }
      : null;
    guards = boss ? [] : createGuards();
    initialGuardCount = guards.length;
    alertLevel = 0;
    strikeTime = 0;
    dashTime = 0;
    dashCooldown = 0;
    dashVector = { x: 0, y: 0 };
    cloakTime = 0;
    cloakCooldown = 0;
    decoyCooldown = 0;
    pulseCooldown = 0;
    decoy = null;
    aim = { x: 830, y: 323 };
    updateHud();
  }

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add("visible");
    toastTimer = 2.2;
  }

  function showOverlay(mode) {
    overlay.style.display = "grid";
    tutorialControls.style.display = mode === "tutorial" ? "grid" : "none";
    tipLine.style.display = mode === "tutorial" ? "block" : "none";
    if (mode === "tutorial") {
      overlayEyebrow.innerHTML = '<span class="eyebrow-line"></span> A HISTORY WRITTEN IN SHADOW <span class="eyebrow-line"></span>';
      title.innerHTML = "A shadow's<br><em>oath.</em>";
      copy.textContent = currentLevel === 1
        ? "Found beneath an eclipsed moon with a shard for a heart, Noct was raised as the Veiled Star's weapon. One hundred contracts—and the truth about their creation—lie ahead."
        : `Your trail resumes in ${currentChapter().name}. Level ${String(currentLevel).padStart(3, "0")} of 100 awaits.`;
      startLabel.textContent = currentLevel === 1 ? "BEGIN THE STORY" : `CONTINUE AT LEVEL ${currentLevel}`;
    } else if (mode === "paused") {
      overlayEyebrow.innerHTML = '<span class="eyebrow-line"></span> THE HUNT CAN WAIT <span class="eyebrow-line"></span>';
      title.innerHTML = "The night<br><em>waits.</em>";
      copy.textContent = "Take a breath, assassin. The wardens are frozen until you return.";
      startLabel.textContent = "RETURN TO THE NIGHT";
    } else if (mode === "won") {
      const nextLevel = currentLevel + 1;
      const chapterIndex = Math.floor((nextLevel - 1) / 20);
      const newPowerups = powerups.filter(item => item.level === nextLevel);
      overlayEyebrow.innerHTML = `<span class="eyebrow-line"></span> LEVEL ${String(currentLevel).padStart(3, "0")} COMPLETE <span class="eyebrow-line"></span>`;
      title.innerHTML = "One step<br><em>closer.</em>";
      copy.textContent = nextLevel <= 100 && (nextLevel - 1) % 20 === 0
        ? storyBeats[chapterIndex]
        : `The next contract waits in ${chapters[Math.min(chapters.length - 1, Math.floor((nextLevel - 1) / 10))].name}. ${newPowerups.length ? `Relic unlocked: ${newPowerups.map(item => `${item.name} — ${item.detail}`).join(" ")}` : "The trail grows colder. Keep moving."}`;
      startLabel.textContent = `CONTINUE TO LEVEL ${String(nextLevel).padStart(3, "0")}`;
    } else if (mode === "campaignComplete") {
      overlayEyebrow.innerHTML = '<span class="eyebrow-line"></span> 100 LEVELS COMPLETE <span class="eyebrow-line"></span>';
      title.innerHTML = "No one's<br><em>shadow.</em>";
      copy.textContent = "Vael's Dawncleaver falls silent. Noct casts a shadow of their own at last—not a weapon, not an experiment, but a life freely chosen. The moon shard dims, and the night finally belongs to them.";
      startLabel.textContent = "BEGIN A NEW JOURNEY";
    } else if (mode === "lost") {
      overlayEyebrow.innerHTML = `<span class="eyebrow-line"></span> LEVEL ${String(currentLevel).padStart(3, "0")} FAILED <span class="eyebrow-line"></span>`;
      title.innerHTML = "The veil<br><em>is broken.</em>";
      copy.textContent = boss
        ? "The Dawncleaver has driven you back. Vael still guards the truth. Recover, assassin, and face him again."
        : "A warden caught your trail. Learn their routes, make use of your relics, and try the contract again.";
      startLabel.textContent = `RETRY LEVEL ${String(currentLevel).padStart(3, "0")}`;
    }
  }

  function beginGame() {
    if (state === "tutorial" || state === "won" || state === "lost" || state === "campaignComplete") resetGame();
    overlay.style.display = "none";
    state = "playing";
    statusLabel.textContent = boss ? "FINAL CONFRONTATION" : "INFILTRATION";
    if (!frameHandle) {
      lastFrame = performance.now();
      frameHandle = requestAnimationFrame(loop);
    }
  }

  function togglePause() {
    if (state === "playing") {
      state = "paused";
      showOverlay("paused");
    } else if (state === "paused") {
      beginGame();
    }
  }

  function distance(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  function circleHitsRect(x, y, radius, rect) {
    const nearestX = Math.max(rect.x, Math.min(x, rect.x + rect.w));
    const nearestY = Math.max(rect.y, Math.min(y, rect.y + rect.h));
    return Math.hypot(x - nearestX, y - nearestY) < radius;
  }

  function blocked(a, b) {
    for (const rect of cover) {
      for (let step = 1; step < 10; step++) {
        const t = step / 10;
        const x = a.x + (b.x - a.x) * t;
        const y = a.y + (b.y - a.y) * t;
        if (x > rect.x && x < rect.x + rect.w && y > rect.y && y < rect.y + rect.h) return true;
      }
    }
    return false;
  }

  function moveCircle(actor, dx, dy, radius) {
    const nextX = Math.max(radius, Math.min(width - radius, actor.x + dx));
    if (!cover.some(rect => circleHitsRect(nextX, actor.y, radius, rect))) actor.x = nextX;
    const nextY = Math.max(radius, Math.min(height - radius, actor.y + dy));
    if (!cover.some(rect => circleHitsRect(actor.x, nextY, radius, rect))) actor.y = nextY;
  }

  function strike() {
    if (state !== "playing" || strikeTime > 0) return;
    strikeTime = .32;
    const strikeRange = 61 + (hasPowerup("moonsteel") ? 14 : 0) + (hasPowerup("twinCrescent") ? 15 : 0);
    if (boss) {
      const gap = distance(player, boss);
      const toward = Math.atan2(boss.y - player.y, boss.x - player.x);
      if (gap < strikeRange + 13 && Math.cos(toward - player.angle) > -.18) {
        boss.health = Math.max(0, boss.health - 1);
        boss.hitFlash = .2;
        boss.state = "staggered";
        boss.timer = .28;
        showToast(boss.health === 0 ? "THE DAWNCLEAVER FALLS" : "THE MOONBLADE BITES INTO VAEL");
        updateHud();
        if (boss.health === 0) endGame(true);
      } else {
        showToast("CLOSE THE DISTANCE — WATCH FOR THE GOLDEN ARC");
      }
      return;
    }
    let target = null;
    let nearest = Infinity;
    for (const guard of guards) {
      const gap = distance(player, guard);
      const toward = Math.atan2(guard.y - player.y, guard.x - player.x);
      const alignment = Math.cos(toward - player.angle);
      if (gap < strikeRange && alignment > -.18 && gap < nearest) {
        target = guard;
        nearest = gap;
      }
    }
    if (target) {
      guards.splice(guards.indexOf(target), 1);
      showToast("THE MOONBLADE FINDS ITS MARK");
      updateHud();
      if (guards.length === 0) {
        statusLabel.textContent = "EXTRACTION";
        showToast("ALL WARDENS DOWN — REACH THE GATE");
      }
    } else {
      showToast("NO WARDEN WITHIN REACH");
    }
  }

  function useDecoy() {
    if (state !== "playing" || decoyCooldown > 0) return;
    decoy = { x: aim.x, y: aim.y, timer: 5.2 };
    decoyCooldown = hasPowerup("echoStone") ? 6 : 8;
    showToast("MOONSTONE AWAY — WATCH THEM TURN");
    for (const guard of guards) {
      if (distance(guard, decoy) < 450) {
        guard.investigate = { x: decoy.x, y: decoy.y };
        guard.state = "investigate";
        guard.alertTimer = 0;
      }
    }
  }

  function useVeil() {
    if (state !== "playing" || cloakCooldown > 0) return;
    cloakTime = hasPowerup("veilThread") ? 3.1 : 2.3;
    cloakCooldown = hasPowerup("quietMind") ? 8 : 10;
    alertLevel = Math.max(0, alertLevel - .48);
    for (const guard of guards) {
      if (guard.state === "chase") {
        guard.state = "investigate";
        guard.investigate = { x: player.x, y: player.y };
      }
    }
    showToast("VEIL OF MOONLIGHT — YOU ARE UNSEEN");
    document.getElementById("veil-glow").classList.add("active");
  }

  function usePulse() {
    if (state !== "playing") return;
    if (!hasPowerup("duskPulse")) {
      showToast("DUSK PULSE UNLOCKS AT LEVEL 15");
      return;
    }
    if (pulseCooldown > 0) return;
    const radius = hasPowerup("eclipseHeart") ? 188 : 132;
    let staggered = 0;
    for (const guard of guards) {
      if (distance(player, guard) <= radius) {
        guard.state = "stunned";
        guard.investigate = null;
        guard.stunTimer = 2.2;
        staggered++;
      }
    }
    if (boss && distance(player, boss) <= radius) {
      boss.state = "staggered";
      boss.timer = 1.35;
      staggered++;
    }
    if (staggered === 0) {
      showToast("NO FOE WITHIN DUSK PULSE RANGE");
      return;
    }
    pulseCooldown = 14;
    showToast("DUSK PULSE — THE NIGHT HOLDS ITS BREATH");
    updateHud();
  }

  function tryDash() {
    if (state !== "playing" || dashCooldown > 0) return;
    let dx = (keys.has("d") ? 1 : 0) - (keys.has("a") ? 1 : 0);
    let dy = (keys.has("s") ? 1 : 0) - (keys.has("w") ? 1 : 0);
    if (!dx && !dy) {
      dx = Math.cos(player.angle);
      dy = Math.sin(player.angle);
    }
    const length = Math.hypot(dx, dy) || 1;
    dashVector = { x: dx / length, y: dy / length };
    dashTime = .19;
    dashCooldown = hasPowerup("ghoststep") ? .72 : 1.15;
  }

  function damagePlayer(message) {
    if (player.invulnerable > 0) return;
    player.health = Math.max(0, player.health - 1);
    player.invulnerable = 1.15;
    showToast(message);
    updateHud();
    if (player.health === 0) endGame(false);
  }

  function endGame(won) {
    if (won && currentLevel === 100) {
      state = "campaignComplete";
      highestUnlockedLevel = 100;
      saveProgress(highestUnlockedLevel);
      statusLabel.textContent = "THE CYCLE IS BROKEN";
      showOverlay("campaignComplete");
      return;
    }
    state = won ? "won" : "lost";
    if (won) {
      highestUnlockedLevel = Math.max(highestUnlockedLevel, currentLevel + 1);
      saveProgress(highestUnlockedLevel);
    }
    statusLabel.textContent = won ? "CONTRACT COMPLETE" : "COMPROMISED";
    showOverlay(won ? "won" : "lost");
  }

  function updateBoss(dt) {
    if (!boss) return;
    boss.hitFlash = Math.max(0, boss.hitFlash - dt);
    const gap = distance(player, boss);
    const towardPlayer = Math.atan2(player.y - boss.y, player.x - boss.x);

    if (boss.state === "staggered") {
      boss.timer -= dt;
      if (boss.timer <= 0) {
        boss.state = "approach";
        boss.cooldown = Math.max(boss.cooldown, .7);
      }
      return;
    }

    if (boss.state === "windup") {
      boss.timer -= dt;
      if (boss.timer <= 0) {
        const aligned = Math.cos(towardPlayer - boss.angle) > Math.cos(.82);
        if (gap < 110 && aligned) damagePlayer("THE DAWNCLEAVER STRIKES — DASH THROUGH ITS ARC");
        boss.state = "swing";
        boss.timer = .38;
      }
      return;
    }

    if (boss.state === "swing") {
      boss.timer -= dt;
      if (boss.timer <= 0) {
        boss.state = "approach";
        boss.cooldown = 1.15;
      }
      return;
    }

    boss.angle = towardPlayer;
    if (gap > 70) {
      moveCircle(boss, Math.cos(boss.angle) * 47 * dt, Math.sin(boss.angle) * 47 * dt, 18);
    }
    boss.cooldown -= dt;
    if (boss.cooldown <= 0 && gap < 170) {
      boss.state = "windup";
      boss.timer = .82;
    }
  }

  function update(dt) {
    strikeTime = Math.max(0, strikeTime - dt);
    dashTime = Math.max(0, dashTime - dt);
    dashCooldown = Math.max(0, dashCooldown - dt);
    cloakTime = Math.max(0, cloakTime - dt);
    cloakCooldown = Math.max(0, cloakCooldown - dt);
    decoyCooldown = Math.max(0, decoyCooldown - dt);
    pulseCooldown = Math.max(0, pulseCooldown - dt);
    player.invulnerable = Math.max(0, player.invulnerable - dt);
    if (decoy) {
      decoy.timer -= dt;
      if (decoy.timer <= 0) decoy = null;
    }
    if (toastTimer > 0 && (toastTimer -= dt) <= 0) toast.classList.remove("visible");

    let moveX = (keys.has("d") ? 1 : 0) - (keys.has("a") ? 1 : 0);
    let moveY = (keys.has("s") ? 1 : 0) - (keys.has("w") ? 1 : 0);
    const length = Math.hypot(moveX, moveY);
    if (length > 0) {
      moveX /= length;
      moveY /= length;
    } else if (aim) {
      player.angle = Math.atan2(aim.y - player.y, aim.x - player.x);
    }

    const dashSpeed = dashTime > 0 ? 400 : 0;
    moveCircle(
      player,
      (moveX * player.speed + dashVector.x * dashSpeed) * dt,
      (moveY * player.speed + dashVector.y * dashSpeed) * dt,
      12
    );

    if (boss) {
      updateBoss(dt);
      updateHud();
      return;
    }

    let seen = false;
    let closestChaser = Infinity;
    let closestGuard = null;
    const sightRange = (192 + Math.min(42, (currentLevel - 1) * .45)) * (hasPowerup("quietMind") ? .82 : 1);
    const patrolSpeed = 41 + Math.min(20, (currentLevel - 1) * .22);
    for (const guard of guards) {
      let destination;
      let speed = patrolSpeed;
      if (guard.stunTimer > 0) {
        guard.stunTimer = Math.max(0, guard.stunTimer - dt);
        guard.state = "stunned";
        continue;
      }
      if (guard.state === "stunned") {
        guard.state = "patrol";
        guard.cooldown = .8;
      }
      if (guard.state === "chase" && cloakTime > 0) {
        guard.state = "investigate";
        guard.investigate = { x: player.x, y: player.y };
        guard.alertTimer = 0;
      }
      if (guard.state === "chase") {
        guard.alertTimer -= dt;
        if (guard.alertTimer <= 0) {
          guard.state = "investigate";
          guard.investigate = { x: player.x, y: player.y };
        }
      }

      const gapToPlayer = distance(player, guard);
      const facing = Math.cos(Math.atan2(player.y - guard.y, player.x - guard.x) - guard.angle) > Math.cos(.46);
      const canSee = gapToPlayer < sightRange && facing && !blocked(guard, player);
      if (canSee && cloakTime <= 0) {
        guard.state = "chase";
        guard.alertTimer = 3.8;
        guard.investigate = { x: player.x, y: player.y };
        seen = true;
      }

      if (decoy && distance(guard, decoy) < 470 && guard.state !== "chase") {
        guard.state = "investigate";
        guard.investigate = { x: decoy.x, y: decoy.y };
      }

      if (guard.state === "chase") {
        destination = player;
        speed = 73 + Math.min(19, (currentLevel - 1) * .2);
      } else if (guard.state === "investigate" && guard.investigate) {
        destination = guard.investigate;
        speed = 51;
        if (distance(guard, destination) < 12) {
          guard.investigate = null;
          guard.state = "patrol";
          guard.cooldown = .7;
        }
      } else {
        guard.cooldown -= dt;
        if (guard.cooldown <= 0) {
          const point = guard.points[guard.pointIndex];
          if (distance(guard, point) < 9) {
            guard.pointIndex = (guard.pointIndex + 1) % guard.points.length;
          }
          destination = guard.points[guard.pointIndex];
        }
      }

      if (destination) {
        const angle = Math.atan2(destination.y - guard.y, destination.x - guard.x);
        guard.angle = angle;
        const dx = Math.cos(angle) * speed * dt;
        const dy = Math.sin(angle) * speed * dt;
        const nextX = guard.x + dx;
        const nextY = guard.y + dy;
        if (!cover.some(rect => circleHitsRect(nextX, nextY, 10, rect))) {
          guard.x = nextX;
          guard.y = nextY;
        } else if (guard.state === "patrol") {
          guard.pointIndex = (guard.pointIndex + 1) % guard.points.length;
          guard.cooldown = .1;
        } else {
          guard.state = "patrol";
          guard.investigate = null;
          guard.cooldown = 1;
        }
      }
      if (guard.state === "chase") {
        const distanceAfterMove = distance(player, guard);
        if (distanceAfterMove < closestChaser) {
          closestChaser = distanceAfterMove;
          closestGuard = guard;
        }
      }
    }

    alertLevel = seen ? Math.min(1, alertLevel + dt * .72) : Math.max(0, alertLevel - dt * .23);
    if (closestChaser < 20 && player.invulnerable <= 0) {
      damagePlayer("WOUNDED — BREAK LINE OF SIGHT");
      if (closestGuard) {
        const escapeAngle = Math.atan2(player.y - closestGuard.y, player.x - closestGuard.x);
        moveCircle(player, Math.cos(escapeAngle) * 27, Math.sin(escapeAngle) * 27, 12);
      }
      if (state !== "playing") return;
    }
    if (guards.length === 0 && Math.hypot(player.x - 925, player.y - 324) < 35) {
      endGame(true);
      return;
    }
    updateHud();
  }

  function updateHud() {
    const chapter = currentChapter();
    const remaining = boss ? boss.health : guards.length;
    const total = boss ? boss.maxHealth : initialGuardCount;
    document.getElementById("level-number").textContent = String(currentLevel).padStart(3, "0");
    document.getElementById("chapter-name").textContent = chapter.name;
    document.getElementById("district-label").textContent = chapter.name;
    document.getElementById("objective-label").textContent = boss ? "ARCHON VAEL · VITALITY" : "WARDENS REMAINING";
    document.getElementById("guard-count").textContent = String(remaining).padStart(2, "0");
    document.getElementById("guard-total").textContent = `/ ${String(total).padStart(2, "0")}`;
    document.getElementById("objective-progress").style.width = `${total > 0 ? (total - remaining) / total * 100 : 0}%`;
    document.getElementById("boss-card").hidden = !boss;
    document.getElementById("boss-health").style.width = `${boss ? boss.health / boss.maxHealth * 100 : 100}%`;
    document.getElementById("health-hearts").innerHTML = Array.from({ length: player.maxHealth }, (_, index) =>
      `<span class="${index < player.health ? "filled" : "empty"}">♥</span>`
    ).join("");
    const alertFill = Math.round(alertLevel * 100);
    document.getElementById("alert-meter").style.width = `${alertFill}%`;
    const alertLabel = document.getElementById("alert-label");
    alertLabel.textContent = alertLevel > .68 ? "DETECTED" : alertLevel > .28 ? "SUSPICIOUS" : "UNSEEN";
    alertCard.hidden = Boolean(boss);
    alertCard.classList.toggle("is-alerted", alertLevel > .28);
    const unlockedRelics = powerups.filter(item => item.level <= currentLevel);
    const relicCount = document.getElementById("powerup-list");
    relicCount.textContent = String(3 + unlockedRelics.length).padStart(2, "0");
    relicCount.title = ["Moonstone", "Veil", "Shadow Dash"]
      .concat(unlockedRelics.map(item => `Lv ${item.level}: ${item.name}`))
      .join(" · ");
    document.getElementById("decoy-status").classList.toggle("cooldown", decoyCooldown > 0);
    document.getElementById("cloak-status").classList.toggle("cooldown", cloakCooldown > 0);
    document.getElementById("dash-status").classList.toggle("cooldown", dashCooldown > 0);
    document.getElementById("cloak-status").classList.toggle("active", cloakTime > 0);
    const pulseStatus = document.getElementById("pulse-status");
    pulseStatus.classList.toggle("locked", !hasPowerup("duskPulse"));
    pulseStatus.classList.toggle("unlocked", hasPowerup("duskPulse"));
    pulseStatus.classList.toggle("cooldown", pulseCooldown > 0);
    document.querySelector("#decoy-status .ability-ready").textContent = decoyCooldown > 0 ? `${decoyCooldown.toFixed(1)}s` : "READY";
    document.querySelector("#cloak-status .ability-ready").textContent = cloakTime > 0 ? "ACTIVE" : cloakCooldown > 0 ? `${cloakCooldown.toFixed(1)}s` : "READY";
    document.querySelector("#dash-status .ability-ready").textContent = dashCooldown > 0 ? `${dashCooldown.toFixed(1)}s` : "READY";
    document.querySelector("#pulse-status .ability-ready").textContent = !hasPowerup("duskPulse")
      ? "LV 15"
      : pulseCooldown > 0 ? `${pulseCooldown.toFixed(1)}s` : "READY";
    document.getElementById("veil-glow").classList.toggle("active", cloakTime > 0);
  }

  function drawBackground() {
    const palette = currentChapter().palette;
    ctx.fillStyle = palette[0];
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = palette[1];
    ctx.fillRect(18, 19, width - 36, height - 38);
    ctx.strokeStyle = "rgba(172,187,190,.055)";
    ctx.lineWidth = 1;
    for (let x = 35; x < width; x += 41) {
      ctx.beginPath(); ctx.moveTo(x, 20); ctx.lineTo(x, height - 20); ctx.stroke();
    }
    for (let y = 33; y < height; y += 38) {
      ctx.beginPath(); ctx.moveTo(20, y); ctx.lineTo(width - 20, y); ctx.stroke();
    }
    ctx.strokeStyle = "rgba(193,199,199,.12)";
    ctx.lineWidth = 2;
    ctx.strokeRect(20, 20, width - 40, height - 40);
    for (const mark of groundMarks) {
      ctx.strokeStyle = "rgba(190,193,172,.07)";
      ctx.beginPath();
      ctx.moveTo(mark.x, mark.y);
      ctx.lineTo(mark.x + mark.length, mark.y + 1);
      ctx.stroke();
    }
    for (const star of starPoints) {
      ctx.fillStyle = `rgba(218,224,233,${star.alpha})`;
      ctx.beginPath(); ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2); ctx.fill();
    }
    const moon = ctx.createRadialGradient(840, 156, 4, 840, 156, 250);
    moon.addColorStop(0, "rgba(144,155,183,.13)");
    moon.addColorStop(1, "rgba(144,155,183,0)");
    ctx.fillStyle = moon;
    ctx.fillRect(575, 20, 410, 410);

    ctx.fillStyle = palette[1];
    ctx.beginPath();
    ctx.moveTo(43, 320); ctx.lineTo(950, 320); ctx.lineTo(950, 361); ctx.lineTo(43, 361);
    ctx.fill();
    ctx.strokeStyle = "rgba(196,199,181,.1)";
    ctx.setLineDash([9, 12]);
    ctx.beginPath(); ctx.moveTo(48, 340); ctx.lineTo(947, 340); ctx.stroke();
    ctx.setLineDash([]);

    if (currentLevel !== 100) drawGate();
    drawShrubs();
    for (const rect of cover) drawBuilding(rect);
  }

  function drawGate() {
    const x = 921;
    ctx.fillStyle = "rgba(5,9,13,.44)";
    ctx.fillRect(x - 9, 290, 40, 100);
    ctx.strokeStyle = "#887d6d";
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(x, 301); ctx.lineTo(x + 19, 315); ctx.lineTo(x + 19, 347); ctx.lineTo(x, 361); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + 4, 319); ctx.lineTo(x + 15, 319); ctx.moveTo(x + 4, 328); ctx.lineTo(x + 15, 328); ctx.moveTo(x + 4, 337); ctx.lineTo(x + 15, 337); ctx.stroke();
    ctx.fillStyle = "#c8b47d";
    ctx.beginPath(); ctx.arc(x + 8, 340, 3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "rgba(216,194,139,.45)";
    ctx.font = "8px 'DM Mono', monospace";
    ctx.fillText("EXTRACTION", x - 12, 380);
  }

  function drawShrubs() {
    for (const [x, y, scale] of [[85, 223, 1], [391, 505, .8], [629, 110, .8], [905, 529, .9], [117, 526, .7], [603, 559, .65]]) {
      ctx.fillStyle = "rgba(8,15,16,.47)";
      ctx.beginPath(); ctx.ellipse(x, y + 7, 18 * scale, 9 * scale, 0, 0, Math.PI * 2); ctx.fill();
      for (let i = 0; i < 4; i++) {
        ctx.fillStyle = i % 2 ? "#25372f" : "#2b3c33";
        ctx.beginPath(); ctx.arc(x + (i - 1.5) * 8 * scale, y + (i % 2) * 4 * scale, 8 * scale, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = "rgba(156,178,153,.3)";
      ctx.beginPath(); ctx.arc(x - 5 * scale, y - 2 * scale, 2 * scale, 0, Math.PI * 2); ctx.fill();
    }
  }

  function drawBuilding(rect) {
    const palette = currentChapter().palette;
    ctx.fillStyle = "rgba(4,8,11,.45)";
    ctx.fillRect(rect.x + 7, rect.y + 10, rect.w, rect.h);
    ctx.fillStyle = palette[2];
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    ctx.fillStyle = palette[3];
    ctx.fillRect(rect.x + 5, rect.y + 5, rect.w - 10, rect.h - 10);
    ctx.strokeStyle = "rgba(174,184,182,.18)";
    ctx.lineWidth = 1;
    ctx.strokeRect(rect.x + 5, rect.y + 5, rect.w - 10, rect.h - 10);
    ctx.strokeStyle = "rgba(15,21,24,.47)";
    ctx.strokeRect(rect.x + 12, rect.y + 12, rect.w - 24, rect.h - 24);
    ctx.fillStyle = "rgba(177,181,160,.12)";
    ctx.fillRect(rect.x + rect.w * .34, rect.y + rect.h * .34, rect.w * .3, rect.h * .28);
    ctx.fillStyle = "rgba(210,186,133,.28)";
    ctx.fillRect(rect.x + rect.w * .47, rect.y + 3, 7, 3);
    ctx.fillRect(rect.x + rect.w * .47, rect.y + rect.h - 6, 7, 3);
  }

  function drawVision(guard) {
    if (guard.state === "chase") return;
    const length = 176;
    const spread = .46;
    ctx.beginPath();
    ctx.moveTo(guard.x, guard.y);
    ctx.arc(guard.x, guard.y, length, guard.angle - spread, guard.angle + spread);
    ctx.closePath();
    ctx.fillStyle = "rgba(191,155,103,.043)";
    ctx.fill();
    ctx.strokeStyle = "rgba(201,172,121,.07)";
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  function drawGuard(guard) {
    drawVision(guard);
    ctx.save();
    ctx.translate(guard.x, guard.y);
    ctx.rotate(guard.angle);
    ctx.fillStyle = "rgba(0,0,0,.4)";
    ctx.beginPath(); ctx.ellipse(1, 5, 11, 6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = guard.state === "stunned" ? "#9ba9d5" : guard.state === "chase" ? "#a76162" : "#68716b";
    ctx.beginPath(); ctx.ellipse(0, 0, 8, 10, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#a3a18a";
    ctx.beginPath(); ctx.arc(3, -6, 4.1, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#cbbd91";
    ctx.fillRect(6, -1, 11, 2);
    ctx.strokeStyle = "rgba(220,194,130,.75)";
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(13, -2); ctx.lineTo(13, 3); ctx.stroke();
    ctx.restore();
    if (guard.state === "chase") {
      ctx.fillStyle = "#e9998c";
      ctx.font = "14px sans-serif";
      ctx.fillText("!", guard.x - 3, guard.y - 18);
    } else if (guard.state === "investigate") {
      ctx.fillStyle = "#d9c58f";
      ctx.font = "11px sans-serif";
      ctx.fillText("?", guard.x - 3, guard.y - 16);
    } else if (guard.state === "stunned") {
      ctx.fillStyle = "#b9c9ff";
      ctx.font = "11px sans-serif";
      ctx.fillText("✦", guard.x - 4, guard.y - 15);
    }
  }

  function drawBoss() {
    if (!boss) return;
    if (boss.state === "windup") {
      ctx.fillStyle = "rgba(230,173,104,.14)";
      ctx.beginPath();
      ctx.moveTo(boss.x, boss.y);
      ctx.arc(boss.x, boss.y, 112, boss.angle - .82, boss.angle + .82);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "rgba(238,192,128,.62)";
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    ctx.save();
    ctx.translate(boss.x, boss.y);
    ctx.rotate(boss.angle);
    ctx.fillStyle = "rgba(0,0,0,.45)";
    ctx.beginPath(); ctx.ellipse(0, 12, 27, 14, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = boss.hitFlash > 0 ? "#fff0cd" : "#672f36";
    ctx.beginPath(); ctx.ellipse(-3, 0, 22, 27, -.12, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#d3b18a";
    ctx.beginPath(); ctx.arc(10, -13, 8, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#3c2029";
    ctx.beginPath(); ctx.moveTo(3, -18); ctx.lineTo(7, -34); ctx.lineTo(12, -22); ctx.lineTo(20, -32); ctx.lineTo(18, -12); ctx.fill();

    const swing = boss.state === "swing";
    ctx.strokeStyle = swing ? "#ffe0a6" : "#dcb97f";
    ctx.lineWidth = 7;
    ctx.shadowColor = "#e7ae68";
    ctx.shadowBlur = boss.state === "windup" || swing ? 17 : 6;
    ctx.beginPath();
    ctx.moveTo(13, 0);
    ctx.lineTo(swing ? 65 : 52, swing ? 21 : 0);
    ctx.stroke();
    ctx.fillStyle = "#f0d7a1";
    ctx.beginPath();
    ctx.moveTo(swing ? 63 : 50, swing ? 15 : -5);
    ctx.lineTo(swing ? 89 : 80, swing ? 21 : 0);
    ctx.lineTo(swing ? 62 : 50, swing ? 28 : 5);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "#e4c487";
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(11, -7); ctx.lineTo(18, 8); ctx.stroke();
    ctx.restore();

    ctx.fillStyle = "#eccb9c";
    ctx.font = "9px 'DM Mono', monospace";
    ctx.textAlign = "center";
    ctx.fillText("ARCHON VAEL", boss.x, boss.y - 43);
    ctx.textAlign = "start";
  }

  function drawPlayer(time) {
    if (!player) return;
    const bob = Math.sin(time / 160) * .8;
    ctx.save();
    if (player.invulnerable > 0 && Math.floor(player.invulnerable * 12) % 2 === 0) ctx.globalAlpha = .45;
    ctx.translate(player.x, player.y + bob);
    ctx.rotate(player.angle);
    ctx.fillStyle = "rgba(0,0,0,.48)";
    ctx.beginPath(); ctx.ellipse(0, 7, 15, 8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = cloakTime > 0 ? "rgba(153,160,231,.45)" : "#a8a6c2";
    ctx.beginPath(); ctx.ellipse(-1, 0, 10, 12, -.18, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#d7d1ca";
    ctx.beginPath(); ctx.arc(5, -6, 4.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#262b3a";
    ctx.beginPath(); ctx.moveTo(-6, -8); ctx.lineTo(7, -13); ctx.lineTo(7, -9); ctx.lineTo(-1, -3); ctx.fill();
    ctx.strokeStyle = "rgba(201,215,255,.92)";
    ctx.lineWidth = 2.3;
    ctx.shadowColor = "#b9c9ff";
    ctx.shadowBlur = strikeTime > 0 ? 18 : 8;
    ctx.beginPath(); ctx.moveTo(7, 0); ctx.quadraticCurveTo(22, -9, 19, 8); ctx.quadraticCurveTo(17, 15, 11, 9); ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "#b5aa91";
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(6, -1); ctx.lineTo(12, 3); ctx.stroke();
    if (strikeTime > 0) {
      ctx.strokeStyle = `rgba(201,215,255,${strikeTime * 2.1})`;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, 0, 37, -.85, .85); ctx.stroke();
    }
    ctx.restore();
    if (dashTime > 0) {
      ctx.strokeStyle = "rgba(190,202,255,.28)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(player.x - Math.cos(player.angle) * 22, player.y - Math.sin(player.angle) * 22);
      ctx.lineTo(player.x - Math.cos(player.angle) * 40, player.y - Math.sin(player.angle) * 40);
      ctx.stroke();
    }
  }

  function drawDecoy(time) {
    if (!decoy) return;
    const pulse = 9 + Math.sin(time / 115) * 3;
    ctx.strokeStyle = "rgba(208,192,145,.7)";
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(decoy.x, decoy.y, pulse, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = "rgba(208,192,145,.17)";
    ctx.beginPath(); ctx.arc(decoy.x, decoy.y, pulse + 7, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#e4d7b4";
    ctx.beginPath(); ctx.arc(decoy.x, decoy.y, 3, 0, Math.PI * 2); ctx.fill();
  }

  function render(time) {
    drawBackground();
    for (const guard of guards || []) drawGuard(guard);
    drawBoss();
    drawDecoy(time);
    drawPlayer(time);
    if (state !== "tutorial") {
      const vignette = ctx.createRadialGradient(width / 2, height / 2, 200, width / 2, height / 2, 600);
      vignette.addColorStop(0, "rgba(2,5,9,0)");
      vignette.addColorStop(1, "rgba(2,5,9,.29)");
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, width, height);
    }
  }

  function loop(time) {
    frameHandle = 0;
    const dt = Math.min((time - lastFrame) / 1000, .04);
    lastFrame = time;
    if (state === "playing") update(dt);
    render(time);
    if (state === "playing") frameHandle = requestAnimationFrame(loop);
  }

  function pointerPosition(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) * width / rect.width,
      y: (event.clientY - rect.top) * height / rect.height
    };
  }

  canvas.addEventListener("pointermove", event => {
    aim = pointerPosition(event);
    if (player) player.angle = Math.atan2(aim.y - player.y, aim.x - player.x);
  });
  canvas.addEventListener("pointerdown", event => {
    if (event.button !== 0 || state !== "playing") return;
    aim = pointerPosition(event);
    player.angle = Math.atan2(aim.y - player.y, aim.x - player.x);
    strike();
  });
  window.addEventListener("keydown", event => {
    const key = event.key.toLowerCase();
    if ([" ", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(key)) event.preventDefault();
    if (event.repeat) return;
    keys.add(key);
    if (key === "escape") togglePause();
    if (key === " ") strike();
    if (key === "q") useDecoy();
    if (key === "e") useVeil();
    if (key === "shift") tryDash();
    if (key === "r") usePulse();
  });
  window.addEventListener("keyup", event => keys.delete(event.key.toLowerCase()));
  window.addEventListener("blur", () => keys.clear());
  document.getElementById("pause-button").addEventListener("click", togglePause);
  startButton.addEventListener("click", () => {
    if (state === "won") currentLevel = Math.min(100, currentLevel + 1);
    if (state === "campaignComplete") {
      currentLevel = 1;
      highestUnlockedLevel = 1;
      saveProgress(highestUnlockedLevel);
    }
    beginGame();
  });

  resetGame();
  showOverlay("tutorial");
  render(0);
})();
