import { Directive, ElementRef, HostListener, Input } from '@angular/core';

/**
 * Applies a set of inline CSS declarations while the pointer is over the element,
 * restoring the previous inline values on leave. Lets us port the design's
 * per-element hover styles without a stylesheet class for every case.
 *
 * Usage: [appHover]="'background:#b8931f;transform:translateY(-1px);'"
 */
@Directive({
  selector: '[appHover]',
  standalone: true,
})
export class HoverDirective {
  @Input('appHover') hoverStyles = '';
  private previous: Record<string, string> = {};

  constructor(private el: ElementRef<HTMLElement>) {}

  private parse(input: string): Record<string, string> {
    const out: Record<string, string> = {};
    input.split(';').forEach((rule) => {
      const idx = rule.indexOf(':');
      if (idx > 0) {
        const key = rule.slice(0, idx).trim();
        const val = rule.slice(idx + 1).trim();
        if (key) out[key] = val;
      }
    });
    return out;
  }

  @HostListener('mouseenter')
  onEnter(): void {
    const styles = this.parse(this.hoverStyles);
    const s = this.el.nativeElement.style;
    for (const key of Object.keys(styles)) {
      this.previous[key] = s.getPropertyValue(key);
      s.setProperty(key, styles[key]);
    }
  }

  @HostListener('mouseleave')
  onLeave(): void {
    const s = this.el.nativeElement.style;
    for (const key of Object.keys(this.previous)) {
      s.setProperty(key, this.previous[key]);
    }
    this.previous = {};
  }
}
