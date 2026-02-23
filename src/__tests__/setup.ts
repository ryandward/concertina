import "@testing-library/jest-dom/vitest";

// jsdom doesn't support AnimationEvent, which React needs for onAnimationEnd.
// Polyfill it so animation lifecycle tests work.
if (typeof globalThis.AnimationEvent === "undefined") {
  (globalThis as any).AnimationEvent = class AnimationEvent extends Event {
    readonly animationName: string;
    readonly elapsedTime: number;
    readonly pseudoElement: string;
    constructor(type: string, init?: AnimationEventInit) {
      super(type, init);
      this.animationName = init?.animationName ?? "";
      this.elapsedTime = init?.elapsedTime ?? 0;
      this.pseudoElement = init?.pseudoElement ?? "";
    }
  };
}
