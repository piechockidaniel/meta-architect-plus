/** Navigation never changes the decision session. Each axis has one meaning. */
export const carouselSections = ['summary', 'cost', 'risks'] as const;
export type CarouselSection = typeof carouselSections[number];
export class CarouselNavigation {
  variant = 0;
  section = 0;
  deciding = false;
  move(horizontal: number, vertical: number): void {
    this.variant = Math.max(0, Math.min(2, this.variant + horizontal));
    this.section = Math.max(0, Math.min(carouselSections.length - 1, this.section + vertical));
    this.deciding = false;
  }
}
