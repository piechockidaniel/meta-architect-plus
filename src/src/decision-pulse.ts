/** Selection acknowledgement: two gentle 0.5 Hz cycles, then a steady nexus. */
export class DecisionPulse {
  elapsed = 4;
  trigger(reducedMotion: boolean): void { this.elapsed = reducedMotion ? 4 : 0; }
  cancel(): void { this.elapsed = 4; }
  advance(delta: number): number {
    this.elapsed = Math.min(4, this.elapsed + Math.max(0, delta));
    return this.elapsed >= 4 ? 1 : 0.85 + 0.15 * Math.cos(Math.PI * this.elapsed);
  }
  get active(): boolean { return this.elapsed < 4; }
}
