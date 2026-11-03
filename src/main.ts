import "./style.css";
import "./viewport.css";
import {
  createPlan,
  formatTime,
  getActiveStage,
  type Duration,
  type Place,
} from "./workout.ts";
import { SessionTimer } from "./timer.ts";

function element<T extends HTMLElement>(selector: string): T {
  const result = document.querySelector<T>(selector);
  if (!result) throw new Error(`Не найден элемент ${selector}`);
  return result;
}

const form = element<HTMLFormElement>("#workout-form");
const list = element<HTMLOListElement>("#exercise-list");
const digits = element<HTMLOutputElement>("#timer-digits");
const timerElement = element("#session-timer");
const toggle = element<HTMLButtonElement>("#timer-toggle");
const stageLabel = element("#timer-stage");
const stageRemaining = element("#stage-remaining");
const announcement = element("#session-announcement");
const progress = document.querySelector<SVGCircleElement>("#timer-progress")!;
let plan = createPlan(10, "home");
const timer = new SessionTimer(plan.totalSeconds);
let interval: ReturnType<typeof setInterval> | undefined;
let previousStatus = timer.status;
let previousStage = -1;

function announce(message: string) {
  announcement.textContent = message;
}

function stopUpdates() {
  if (interval !== undefined) clearInterval(interval);
  interval = undefined;
}

function renderPlan() {
  element("#plan-title").textContent =
    `Твои ${plan.duration} минут ${plan.place === "home" ? "дома" : "на улице"}`;
  list.replaceChildren(
    ...plan.stages.map((stage, index) => {
      const item = document.createElement("li");
      const details = document.createElement("details");
      details.setAttribute("name", "workout-movement");
      const summary = document.createElement("summary");
      const number = document.createElement("span");
      number.className = "exercise-number";
      number.textContent = (index + 1).toString().padStart(2, "0");
      const name = document.createElement("span");
      name.className = "exercise-name";
      name.textContent = stage.title;
      const time = document.createElement("span");
      time.className = "exercise-time";
      time.textContent = formatTime(stage.seconds);
      const icon = document.createElement("span");
      icon.className = "exercise-expand";
      icon.textContent = "+";
      icon.setAttribute("aria-hidden", "true");
      const hint = document.createElement("p");
      hint.textContent = stage.hint;
      summary.append(number, name, time, icon);
      details.append(summary, hint);
      item.append(details);
      return item;
    }),
  );
}

function updateTimer() {
  const snapshot = timer.snapshot(performance.now());
  const active = getActiveStage(plan, snapshot.elapsedSeconds);
  digits.value = formatTime(snapshot.remainingSeconds);
  progress.style.strokeDashoffset = String(snapshot.progress * 100);
  timerElement.dataset.status = snapshot.status;
  const label =
    snapshot.status === "running"
      ? "Пауза"
      : snapshot.status === "paused"
        ? "Продолжить"
        : snapshot.status === "completed"
          ? "Повторить тренировку"
          : "Начать тренировку";
  toggle.firstElementChild!.textContent = label;
  toggle.lastElementChild!.textContent =
    snapshot.status === "running" ? "Ⅱ" : "↗";
  element("#timer-topline").textContent =
    snapshot.status === "completed"
      ? "Хороший момент для себя"
      : snapshot.status === "paused"
        ? "Выдохни. Продолжим, когда захочешь."
        : "Твой ритм. Твоё время.";
  stageLabel.textContent =
    snapshot.status === "idle"
      ? "Готов, когда ты готов"
      : snapshot.status === "completed"
        ? "Твои минуты — в движении."
        : active.stage.title;
  stageRemaining.textContent =
    snapshot.status === "idle"
      ? "Без регистрации. Без оборудования."
      : snapshot.status === "completed"
        ? "Можно отдохнуть или начать ещё раз."
        : `${snapshot.status === "paused" ? "На паузе" : `Этап ${active.index + 1} из ${plan.stages.length}`} / ${formatTime(active.remainingSeconds)}`;
  list.querySelectorAll("li").forEach((item, index) => {
    const current =
      snapshot.status !== "idle" &&
      snapshot.status !== "completed" &&
      index === active.index;
    item.classList.toggle("is-active", current);
    if (current) item.setAttribute("aria-current", "step");
    else item.removeAttribute("aria-current");
  });
  if (snapshot.status === "completed" && previousStatus !== "completed") {
    announce("Тренировка завершена. Можно отдохнуть или начать ещё раз.");
    stopUpdates();
  } else if (snapshot.status === "running" && previousStage !== active.index) {
    announce(`Следующий этап: ${active.stage.title}. ${active.stage.hint}`);
  }
  previousStage = active.index;
  previousStatus = snapshot.status;
}

function selectPlan(duration: Duration, place: Place) {
  const wasActive = timer.status === "running" || timer.status === "paused";
  stopUpdates();
  plan = createPlan(duration, place);
  timer.reset(plan.totalSeconds);
  previousStage = -1;
  form.querySelector<HTMLInputElement>(
    `input[name="duration"][value="${duration}"]`,
  )!.checked = true;
  form.querySelector<HTMLInputElement>(
    `input[name="place"][value="${place}"]`,
  )!.checked = true;
  document
    .querySelectorAll<HTMLButtonElement>("[data-duration]")
    .forEach((button) =>
      button.setAttribute(
        "aria-pressed",
        String(Number(button.dataset.duration) === duration),
      ),
    );
  element("#hero-cta-text").textContent = `Найти свои ${duration} минут`;
  renderPlan();
  updateTimer();
  announce(
    `План на ${duration} минут ${place === "home" ? "дома" : "на улице"}.${wasActive ? " Таймер сброшен для нового занятия." : ""}`,
  );
}

form.addEventListener("change", () => {
  const data = new FormData(form);
  selectPlan(
    Number(data.get("duration")) as Duration,
    data.get("place") as Place,
  );
});

document
  .querySelectorAll<HTMLButtonElement>("[data-duration]")
  .forEach((button) => {
    button.addEventListener("click", () =>
      selectPlan(Number(button.dataset.duration) as Duration, plan.place),
    );
  });

toggle.addEventListener("click", () => {
  if (timer.status === "running") {
    timer.pause(performance.now());
    stopUpdates();
    announce("Тренировка на паузе.");
  } else {
    timer.start(performance.now());
    stopUpdates();
    interval = setInterval(updateTimer, 200);
    announce("Тренировка началась. Двигайся в комфортном темпе.");
    previousStage = -1;
  }
  updateTimer();
});

element<HTMLButtonElement>("#timer-reset").addEventListener("click", () => {
  stopUpdates();
  timer.reset();
  previousStage = -1;
  updateTimer();
  announce("Таймер сброшен. Можно начать заново.");
});

document.addEventListener("visibilitychange", () => {
  if (!document.hidden) updateTimer();
});

renderPlan();
updateTimer();

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const revealElements = document.querySelectorAll<HTMLElement>(".reveal");
if (!reducedMotion.matches && "IntersectionObserver" in window) {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.08 },
  );
  revealElements.forEach((item) => {
    const siblings = [...item.closest("section")!.querySelectorAll(".reveal")];
    item.style.setProperty(
      "--reveal-delay",
      `${Math.min(siblings.indexOf(item), 3) * 55}ms`,
    );
    item.classList.add("will-reveal");
    observer.observe(item);
  });
  reducedMotion.addEventListener("change", () => {
    if (reducedMotion.matches) {
      observer.disconnect();
      revealElements.forEach((item) => item.classList.add("is-visible"));
    }
  });
}

const finePointer = window.matchMedia("(pointer: fine)");
const hero = element(".hero");
let pointerFrame = 0;
let targetX = 0;
let targetY = 0;
let currentX = 0;
let currentY = 0;
let lastFrameAt = 0;

function moveArtwork(now: number) {
  const elapsed = lastFrameAt ? Math.min(now - lastFrameAt, 50) : 16;
  lastFrameAt = now;
  const smoothing = 1 - Math.exp(-elapsed / 115);
  currentX += (targetX - currentX) * smoothing;
  currentY += (targetY - currentY) * smoothing;
  hero.style.setProperty("--drift-x", `${currentX.toFixed(3)}px`);
  hero.style.setProperty("--drift-y", `${currentY.toFixed(3)}px`);
  if (Math.abs(targetX - currentX) + Math.abs(targetY - currentY) > 0.02) {
    pointerFrame = requestAnimationFrame(moveArtwork);
  } else {
    pointerFrame = 0;
    lastFrameAt = 0;
  }
}

function animateArtwork() {
  if (!pointerFrame) pointerFrame = requestAnimationFrame(moveArtwork);
}

function resetArtwork() {
  cancelAnimationFrame(pointerFrame);
  pointerFrame = 0;
  lastFrameAt = 0;
  targetX = targetY = currentX = currentY = 0;
  hero.style.setProperty("--drift-x", "0px");
  hero.style.setProperty("--drift-y", "0px");
}

hero.addEventListener("pointermove", (event: PointerEvent) => {
  if (reducedMotion.matches || !finePointer.matches) return;
  const rect = hero.getBoundingClientRect();
  targetX = ((event.clientX - rect.left) / rect.width - 0.5) * 12;
  targetY = ((event.clientY - rect.top) / rect.height - 0.5) * 8;
  animateArtwork();
});
hero.addEventListener("pointerleave", () => {
  targetX = targetY = 0;
  if (!reducedMotion.matches) animateArtwork();
});
reducedMotion.addEventListener("change", () => {
  if (reducedMotion.matches) resetArtwork();
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden) resetArtwork();
});
