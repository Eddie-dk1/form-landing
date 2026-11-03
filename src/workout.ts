export const DURATIONS = [10, 20, 30] as const;
export type Duration = (typeof DURATIONS)[number];
export type Place = "home" | "outside";

export interface WorkoutStage {
  title: string;
  hint: string;
  seconds: number;
}

export interface WorkoutPlan {
  duration: Duration;
  place: Place;
  totalSeconds: number;
  stages: WorkoutStage[];
}

const movements: Record<Place, Array<Omit<WorkoutStage, "seconds">>> = {
  home: [
    {
      title: "Приседания",
      hint: "Стопы устойчиво на полу. Выбирай удобную глубину, чередуй движение и короткие паузы.",
    },
    {
      title: "Отжимания от стены",
      hint: "Ладони на стене, корпус прямой. Медленно сгибай и выпрямляй руки.",
    },
    {
      title: "Шаг с подъёмом колен",
      hint: "Шагай на месте, поочерёдно поднимая колени. Без прыжков и спешки.",
    },
    {
      title: "Повороты корпуса",
      hint: "Мягко поворачивай корпус вправо и влево. Не стремись к максимальной амплитуде.",
    },
  ],
  outside: [
    {
      title: "Бодрая ходьба",
      hint: "Найди ровный участок и чуть прибавь шаг. Сохраняй комфортный ритм дыхания.",
    },
    {
      title: "Шаги в сторону",
      hint: "Два спокойных шага вправо, два влево. Чередуй направления без рывков.",
    },
    {
      title: "Подъёмы на носки",
      hint: "Стопы на ширине таза. Плавно поднимай и опускай пятки, делай паузы.",
    },
    {
      title: "Ходьба с подъёмом колен",
      hint: "Иди неспешно и поднимай колени чуть выше обычного. Смотри вперёд.",
    },
  ],
};

export function createPlan(duration: Duration, place: Place): WorkoutPlan {
  const edgeSeconds = ({ 10: 120, 20: 180, 30: 240 } as const)[duration];
  const movementSeconds = (duration * 60 - 2 * edgeSeconds) / 4;
  return {
    duration,
    place,
    totalSeconds: duration * 60,
    stages: [
      {
        title: "Разминка",
        hint: "Спокойный шаг, мягкие круги плечами. Постепенно включайся в движение.",
        seconds: edgeSeconds,
      },
      ...movements[place].map((movement) => ({
        ...movement,
        seconds: movementSeconds,
      })),
      {
        title: "Спокойный финиш",
        hint: "Сбавь темп, немного походи и восстанови привычное дыхание.",
        seconds: edgeSeconds,
      },
    ],
  };
}

export function getActiveStage(plan: WorkoutPlan, elapsedSeconds: number) {
  let elapsed = Math.max(0, Math.min(elapsedSeconds, plan.totalSeconds));
  for (let index = 0; index < plan.stages.length; index++) {
    const stage = plan.stages[index];
    if (elapsed < stage.seconds || index === plan.stages.length - 1) {
      return {
        index,
        stage,
        remainingSeconds: Math.max(0, Math.ceil(stage.seconds - elapsed)),
      };
    }
    elapsed -= stage.seconds;
  }
  throw new Error("В плане нет этапов");
}

export function formatTime(seconds: number): string {
  const value = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(value / 60)
    .toString()
    .padStart(2, "0")}:${(value % 60).toString().padStart(2, "0")}`;
}
