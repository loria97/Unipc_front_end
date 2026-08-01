import { Component, Input } from '@angular/core';
import { NgIf } from '@angular/common';

@Component({
  selector: 'unipc-ui-logo',
  standalone: true,
  imports: [NgIf],
  templateUrl: './ui-logo.component.html',
})
export class UiLogoComponent {
  @Input() variant: 'full' | 'white' | 'mark' = 'full';
  @Input() size: 'sm' | 'md' | 'lg' = 'md';
  @Input() linkToHome: boolean | string = true;
  @Input() alt = 'UNIPC — Università Presila Crotonese';

  private heights: Record<string, string> = { sm: '40px', md: '56px', lg: '72px' };

  get link(): boolean {
    return this.linkToHome !== false && this.linkToHome !== 'false';
  }
  get h(): string {
    return this.heights[this.size] || '56px';
  }
  get src(): string {
    return this.variant === 'mark' ? 'assets/brand/unipc-mark.svg' : 'assets/brand/unipc.svg';
  }
  get filter(): string {
    return this.variant === 'white' ? 'brightness(0) invert(1)' : 'none';
  }
}
